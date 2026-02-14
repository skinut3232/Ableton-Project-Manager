// ============================================================================
// FTS SYNC PATTERN
// ============================================================================
// The projects_fts search index must stay in sync with these fields:
//   - projects.name
//   - projects.genre_label
//   - project_notes (all notes for a project)
//   - project_tags (all tags for a project)
//
// Any function that modifies these fields MUST call rebuild_fts_tags()
// afterward. To enforce this:
//
//   1. Raw write functions are PRIVATE (fn ..._inner)
//   2. Public wrappers call the inner function + rebuild_fts_tags()
//   3. Command handlers can ONLY call the public wrappers
//
// If you add a new function that writes to a searchable field:
//   1. Write it as a private fn ..._inner
//   2. Create a public wrapper that calls it + rebuild_fts_tags()
//   3. Never make the inner function pub
// ============================================================================

use rusqlite::{params, Connection};
use crate::db::models::*;

// ============================================================================
// SYNC TRACKING
// ============================================================================
// mark_dirty() sets sync_status = 'pending_push' on a record after a local write.
// The sync engine picks up these records and pushes them to Supabase.
// This is additive — existing behavior is completely unchanged.
// ============================================================================

/// Mark a record as needing sync after a local write.
/// Safe to call even if sync columns don't exist yet (returns Ok).
pub fn mark_dirty(conn: &Connection, table: &str, id: i64) {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        &format!(
            "UPDATE {} SET sync_status = 'pending_push', sync_updated_at = ?1 WHERE id = ?2",
            table
        ),
        params![now, id],
    ).ok(); // Silently ignore if sync columns don't exist
}

/// Mark a project_tags junction entry as needing sync.
pub fn mark_project_tags_dirty(conn: &Connection, project_id: i64, tag_id: i64) {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE project_tags SET sync_status = 'pending_push', sync_updated_at = ?1 \
         WHERE project_id = ?2 AND tag_id = ?3",
        params![now, project_id, tag_id],
    ).ok();
}

/// Mark a record for deletion from the remote. The sync engine will DELETE
/// from Supabase, then remove the local row.
pub fn mark_pending_delete(conn: &Connection, table: &str, id: i64) {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        &format!(
            "UPDATE {} SET sync_status = 'pending_delete', sync_updated_at = ?1 WHERE id = ?2",
            table
        ),
        params![now, id],
    ).ok();
}

pub fn get_all_settings(conn: &Connection) -> Result<Vec<Setting>, String> {
    let mut stmt = conn.prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;
    let settings = stmt
        .query_map([], |row| {
            Ok(Setting {
                key: row.get(0)?,
                value: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(settings)
}

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    conn.query_row("SELECT value FROM settings WHERE key = ?1", params![key], |row| {
        row.get(0)
    })
    .optional()
    .map_err(|e| e.to_string())
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    // Settings don't have an id column — sync handled separately
    Ok(())
}

pub fn delete_setting(conn: &Connection, key: &str) -> Result<(), String> {
    conn.execute("DELETE FROM settings WHERE key = ?1", params![key])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_projects(conn: &Connection, filters: &ProjectFilters) -> Result<Vec<Project>, String> {
    let mut sql = String::from(
        "SELECT p.id, p.name, p.project_path, p.genre_label, p.musical_key, p.status, p.rating, p.bpm, \
         p.in_rotation, p.notes, p.artwork_path, p.current_set_path, p.archived, p.missing, p.progress, \
         p.last_worked_on, p.created_at, p.updated_at, \
         p.cover_type, p.cover_locked, p.cover_seed, p.cover_style_preset, p.cover_asset_id, p.cover_updated_at, \
         p.cover_url \
         FROM projects p"
    );
    let mut conditions: Vec<String> = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut param_idx = 1;

    // Show archived filter (default: hide archived)
    if filters.show_archived != Some(true) {
        conditions.push("p.archived = 0".to_string());
    }

    // Hide missing by default
    conditions.push("p.missing = 0".to_string());

    // Status filter
    if let Some(ref statuses) = filters.statuses {
        if !statuses.is_empty() {
            let placeholders: Vec<String> = statuses.iter().map(|_| {
                let p = format!("?{}", param_idx);
                param_idx += 1;
                p
            }).collect();
            conditions.push(format!("p.status IN ({})", placeholders.join(",")));
            for s in statuses {
                param_values.push(Box::new(s.clone()));
            }
        }
    }

    // In rotation filter
    if let Some(in_rotation) = filters.in_rotation {
        conditions.push(format!("p.in_rotation = ?{}", param_idx));
        param_idx += 1;
        param_values.push(Box::new(in_rotation as i64));
    }

    // Min rating filter
    if let Some(min_rating) = filters.min_rating {
        conditions.push(format!("p.rating >= ?{}", param_idx));
        param_idx += 1;
        param_values.push(Box::new(min_rating));
    }

    // Updated since days filter
    if let Some(days) = filters.updated_since_days {
        conditions.push(format!("p.last_worked_on >= datetime('now', '-{} days')", days));
    }

    // Tag filter
    if let Some(ref tag_ids) = filters.tag_ids {
        if !tag_ids.is_empty() {
            let placeholders: Vec<String> = tag_ids.iter().map(|_| {
                let p = format!("?{}", param_idx);
                param_idx += 1;
                p
            }).collect();
            conditions.push(format!(
                "p.id IN (SELECT project_id FROM project_tags WHERE tag_id IN ({}))",
                placeholders.join(",")
            ));
            for id in tag_ids {
                param_values.push(Box::new(*id));
            }
        }
    }

    // FTS5 search
    if let Some(ref query) = filters.search_query {
        if !query.trim().is_empty() {
            let escaped = query.trim().split_whitespace()
                .map(|term| format!("\"{}\"*", term.replace('"', "")))
                .collect::<Vec<_>>()
                .join(" ");
            conditions.push(format!(
                "p.id IN (SELECT rowid FROM projects_fts WHERE projects_fts MATCH ?{})", param_idx
            ));
            param_idx += 1;
            let _ = param_idx; // suppress unused warning
            param_values.push(Box::new(escaped));
        }
    }

    if !conditions.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&conditions.join(" AND "));
    }

    // Sort
    let dir = match filters.sort_dir.as_deref() {
        Some("asc") => "ASC",
        Some("desc") => "DESC",
        _ => "DESC",
    };
    let sort_clause = match filters.sort_by.as_deref() {
        Some("name") => format!("p.name {}", dir),
        Some("rating") => format!("p.rating {} NULLS LAST, p.name ASC", dir),
        Some("status") => format!(
            "CASE p.status WHEN 'Sketch' THEN 1 WHEN 'Write' THEN 2 WHEN 'Arrange' THEN 3 WHEN 'Mix' THEN 4 WHEN 'Master' THEN 5 WHEN 'Done' THEN 6 ELSE 7 END {}",
            dir
        ),
        Some("bpm") => format!("p.bpm {} NULLS LAST, p.name ASC", dir),
        Some("musical_key") => format!("p.musical_key {} NULLS LAST, p.name ASC", dir),
        Some("genre_label") => format!("p.genre_label {} NULLS LAST, p.name ASC", dir),
        Some("created_at") => format!("p.created_at {} NULLS LAST", dir),
        Some("updated_at") => format!("p.updated_at {} NULLS LAST", dir),
        Some("in_rotation") => format!("p.in_rotation {}, p.name ASC", dir),
        Some("progress") => format!("p.progress {} NULLS LAST, p.name ASC", dir),
        _ => format!("p.last_worked_on {} NULLS LAST", dir),
    };
    sql.push_str(&format!(" ORDER BY {}", sort_clause));

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let projects = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                project_path: row.get(2)?,
                genre_label: row.get(3)?,
                musical_key: row.get(4)?,
                status: row.get(5)?,
                rating: row.get(6)?,
                bpm: row.get(7)?,
                in_rotation: row.get::<_, i64>(8)? != 0,
                notes: row.get(9)?,
                artwork_path: row.get(10)?,
                current_set_path: row.get(11)?,
                archived: row.get::<_, i64>(12)? != 0,
                missing: row.get::<_, i64>(13)? != 0,
                progress: row.get(14)?,
                last_worked_on: row.get(15)?,
                created_at: row.get(16)?,
                updated_at: row.get(17)?,
                tags: Vec::new(),
                cover_type: row.get(18)?,
                cover_locked: row.get::<_, i64>(19)? != 0,
                cover_seed: row.get(20)?,
                cover_style_preset: row.get(21)?,
                cover_asset_id: row.get(22)?,
                cover_updated_at: row.get(23)?,
                cover_url: row.get(24)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<Project>>();

    // Load tags for each project
    let mut result = projects;
    for project in &mut result {
        project.tags = get_tags_for_project(conn, project.id)?;
    }

    Ok(result)
}

pub fn get_project_by_id(conn: &Connection, id: i64) -> Result<Project, String> {
    let mut project = conn.query_row(
        "SELECT id, name, project_path, genre_label, musical_key, status, rating, bpm, \
         in_rotation, notes, artwork_path, current_set_path, archived, missing, progress, \
         last_worked_on, created_at, updated_at, \
         cover_type, cover_locked, cover_seed, cover_style_preset, cover_asset_id, cover_updated_at, \
         cover_url \
         FROM projects WHERE id = ?1",
        params![id],
        |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                project_path: row.get(2)?,
                genre_label: row.get(3)?,
                musical_key: row.get(4)?,
                status: row.get(5)?,
                rating: row.get(6)?,
                bpm: row.get(7)?,
                in_rotation: row.get::<_, i64>(8)? != 0,
                notes: row.get(9)?,
                artwork_path: row.get(10)?,
                current_set_path: row.get(11)?,
                archived: row.get::<_, i64>(12)? != 0,
                missing: row.get::<_, i64>(13)? != 0,
                progress: row.get(14)?,
                last_worked_on: row.get(15)?,
                created_at: row.get(16)?,
                updated_at: row.get(17)?,
                tags: Vec::new(),
                cover_type: row.get(18)?,
                cover_locked: row.get::<_, i64>(19)? != 0,
                cover_seed: row.get(20)?,
                cover_style_preset: row.get(21)?,
                cover_asset_id: row.get(22)?,
                cover_updated_at: row.get(23)?,
                cover_url: row.get(24)?,
            })
        },
    ).map_err(|e| format!("Project not found: {}", e))?;

    project.tags = get_tags_for_project(conn, project.id)?;
    Ok(project)
}

pub fn get_project_detail(conn: &Connection, id: i64) -> Result<ProjectDetail, String> {
    let project = get_project_by_id(conn, id)?;
    let sets = get_sets_for_project(conn, id)?;
    let bounces = get_bounces_for_project(conn, id)?;
    let sessions = get_sessions_for_project(conn, id)?;

    Ok(ProjectDetail {
        project,
        sets,
        bounces,
        sessions,
    })
}

fn update_project_inner(conn: &Connection, id: i64, name: &Option<String>, status: &Option<String>, rating: Option<i64>, bpm: Option<f64>, in_rotation: Option<bool>, notes: &Option<String>, genre_label: &Option<String>, musical_key: &Option<String>, archived: Option<bool>, progress: Option<i64>) -> Result<(), String> {
    if let Some(ref n) = name {
        let trimmed = n.trim();
        if !trimmed.is_empty() {
            conn.execute("UPDATE projects SET name = ?1, updated_at = datetime('now') WHERE id = ?2", params![trimmed, id])
                .map_err(|e| e.to_string())?;
        }
    }
    if let Some(ref s) = status {
        conn.execute("UPDATE projects SET status = ?1, updated_at = datetime('now') WHERE id = ?2", params![s, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(r) = rating {
        conn.execute("UPDATE projects SET rating = ?1, updated_at = datetime('now') WHERE id = ?2", params![r, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(b) = bpm {
        conn.execute("UPDATE projects SET bpm = ?1, updated_at = datetime('now') WHERE id = ?2", params![b, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ir) = in_rotation {
        conn.execute("UPDATE projects SET in_rotation = ?1, updated_at = datetime('now') WHERE id = ?2", params![ir as i64, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref n) = notes {
        conn.execute("UPDATE projects SET notes = ?1, updated_at = datetime('now') WHERE id = ?2", params![n, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref g) = genre_label {
        conn.execute("UPDATE projects SET genre_label = ?1, updated_at = datetime('now') WHERE id = ?2", params![g, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref k) = musical_key {
        conn.execute("UPDATE projects SET musical_key = ?1, updated_at = datetime('now') WHERE id = ?2", params![k, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(a) = archived {
        conn.execute("UPDATE projects SET archived = ?1, updated_at = datetime('now') WHERE id = ?2", params![a as i64, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(p) = progress {
        conn.execute("UPDATE projects SET progress = ?1, updated_at = datetime('now') WHERE id = ?2", params![p, id])
            .map_err(|e| e.to_string())?;
    }
    mark_dirty(conn, "projects", id);
    Ok(())
}

pub fn update_project(conn: &Connection, id: i64, name: Option<String>, status: Option<String>, rating: Option<i64>, bpm: Option<f64>, in_rotation: Option<bool>, notes: Option<String>, genre_label: Option<String>, musical_key: Option<String>, archived: Option<bool>, progress: Option<i64>) -> Result<Project, String> {
    let needs_fts = name.is_some() || notes.is_some() || genre_label.is_some();
    update_project_inner(conn, id, &name, &status, rating, bpm, in_rotation, &notes, &genre_label, &musical_key, archived, progress)?;
    if needs_fts {
        rebuild_fts_tags(conn, id)?;
    }
    get_project_by_id(conn, id)
}

pub fn get_tags_for_project(conn: &Connection, project_id: i64) -> Result<Vec<Tag>, String> {
    let mut stmt = conn
        .prepare("SELECT t.id, t.name FROM tags t JOIN project_tags pt ON t.id = pt.tag_id WHERE pt.project_id = ?1 ORDER BY t.name")
        .map_err(|e| e.to_string())?;
    let tags = stmt
        .query_map(params![project_id], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(tags)
}

pub fn get_all_tags(conn: &Connection) -> Result<Vec<Tag>, String> {
    let mut stmt = conn.prepare("SELECT id, name FROM tags ORDER BY name")
        .map_err(|e| e.to_string())?;
    let tags = stmt
        .query_map([], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(tags)
}

pub fn create_tag(conn: &Connection, name: &str) -> Result<Tag, String> {
    let normalized = name.trim().to_lowercase();
    if normalized.is_empty() {
        return Err("Tag name cannot be empty".to_string());
    }
    conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?1)", params![normalized])
        .map_err(|e| e.to_string())?;
    let tag = conn.query_row("SELECT id, name FROM tags WHERE name = ?1", params![normalized], |row| {
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?;
    mark_dirty(conn, "tags", tag.id);
    Ok(tag)
}

fn add_tag_to_project_inner(conn: &Connection, project_id: i64, tag_id: i64) -> Result<(), String> {
    conn.execute(
        "INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?1, ?2)",
        params![project_id, tag_id],
    ).map_err(|e| e.to_string())?;
    mark_project_tags_dirty(conn, project_id, tag_id);
    mark_dirty(conn, "projects", project_id);
    Ok(())
}

pub fn add_tag_to_project(conn: &Connection, project_id: i64, tag_id: i64) -> Result<(), String> {
    add_tag_to_project_inner(conn, project_id, tag_id)?;
    rebuild_fts_tags(conn, project_id)?;
    Ok(())
}

fn remove_tag_from_project_inner(conn: &Connection, project_id: i64, tag_id: i64) -> Result<(), String> {
    // Note: can't mark_pending_delete on junction since row will be deleted.
    // Sync engine handles tag removal by diffing the full tag list for a project.
    conn.execute(
        "DELETE FROM project_tags WHERE project_id = ?1 AND tag_id = ?2",
        params![project_id, tag_id],
    ).map_err(|e| e.to_string())?;
    mark_dirty(conn, "projects", project_id);
    Ok(())
}

pub fn remove_tag_from_project(conn: &Connection, project_id: i64, tag_id: i64) -> Result<(), String> {
    remove_tag_from_project_inner(conn, project_id, tag_id)?;
    rebuild_fts_tags(conn, project_id)?;
    Ok(())
}

/// Strip HTML tags from a string, inserting spaces between tags to prevent word merging.
pub fn strip_html_tags(html: &str) -> String {
    let mut result = String::with_capacity(html.len());
    let mut inside_tag = false;
    for ch in html.chars() {
        if ch == '<' {
            inside_tag = true;
        } else if ch == '>' {
            inside_tag = false;
            result.push(' ');
        } else if !inside_tag {
            result.push(ch);
        }
    }
    result
}

/// Concatenate all project_notes for a given project into a single string for FTS indexing.
pub fn get_notes_text_for_fts(conn: &Connection, project_id: i64) -> Result<String, String> {
    let mut stmt = conn
        .prepare("SELECT content FROM project_notes WHERE project_id = ?1 ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;
    let notes: Vec<String> = stmt
        .query_map(params![project_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(notes.join(" "))
}

pub fn rebuild_fts_tags(conn: &Connection, project_id: i64) -> Result<(), String> {
    let tags = get_tags_for_project(conn, project_id)?;
    let tags_text = tags.iter().map(|t| t.name.as_str()).collect::<Vec<_>>().join(" ");

    // Get current project data
    let project = get_project_by_id(conn, project_id)?;
    let notes_text = get_notes_text_for_fts(conn, project_id)?;

    // Delete old FTS entry (standalone table: use standard DELETE)
    conn.execute(
        "DELETE FROM projects_fts WHERE rowid = ?1",
        params![project_id],
    ).ok(); // Ignore if row doesn't exist

    // Reinsert with concatenated project_notes content
    conn.execute(
        "INSERT INTO projects_fts(rowid, name, genre_label, notes, tags_text) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![project_id, project.name, project.genre_label, notes_text, tags_text],
    ).map_err(|e| format!("FTS insert failed: {}", e))?;

    Ok(())
}

/// Rebuild the entire FTS index for all projects. Called during migration.
pub fn rebuild_all_fts(conn: &Connection) -> Result<(), String> {
    conn.execute("DELETE FROM projects_fts", [])
        .map_err(|e| format!("FTS clear failed: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT id, name, genre_label FROM projects"
    ).map_err(|e| e.to_string())?;

    let rows: Vec<(i64, String, String)> = stmt
        .query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Need to drop stmt before calling other functions (which borrow conn)
    drop(stmt);

    for (id, name, genre_label) in &rows {
        let notes_text = get_notes_text_for_fts(conn, *id).unwrap_or_default();
        let tags = get_tags_for_project(conn, *id).unwrap_or_default();
        let tags_text = tags.iter().map(|t| t.name.as_str()).collect::<Vec<_>>().join(" ");

        conn.execute(
            "INSERT INTO projects_fts(rowid, name, genre_label, notes, tags_text) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, name, genre_label, notes_text, tags_text],
        ).ok();
    }

    Ok(())
}

pub fn get_sets_for_project(conn: &Connection, project_id: i64) -> Result<Vec<AbletonSet>, String> {
    let mut stmt = conn
        .prepare("SELECT id, project_id, set_path, modified_time FROM ableton_sets WHERE project_id = ?1 ORDER BY modified_time DESC")
        .map_err(|e| e.to_string())?;
    let sets = stmt
        .query_map(params![project_id], |row| {
            Ok(AbletonSet {
                id: row.get(0)?,
                project_id: row.get(1)?,
                set_path: row.get(2)?,
                modified_time: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(sets)
}

pub fn get_bounces_for_project(conn: &Connection, project_id: i64) -> Result<Vec<Bounce>, String> {
    let mut stmt = conn
        .prepare("SELECT id, project_id, bounce_path, modified_time, duration_seconds FROM bounces WHERE project_id = ?1 ORDER BY modified_time DESC")
        .map_err(|e| e.to_string())?;
    let bounces = stmt
        .query_map(params![project_id], |row| {
            Ok(Bounce {
                id: row.get(0)?,
                project_id: row.get(1)?,
                bounce_path: row.get(2)?,
                modified_time: row.get(3)?,
                duration_seconds: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(bounces)
}

pub fn set_current_set(conn: &Connection, project_id: i64, set_path: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE projects SET current_set_path = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![set_path, project_id],
    ).map_err(|e| e.to_string())?;
    mark_dirty(conn, "projects", project_id);
    Ok(())
}

pub fn set_artwork_path(conn: &Connection, project_id: i64, artwork_path: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE projects SET artwork_path = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![artwork_path, project_id],
    ).map_err(|e| e.to_string())?;
    mark_dirty(conn, "projects", project_id);
    Ok(())
}

// Session queries
pub fn start_session(conn: &Connection, project_id: i64) -> Result<Session, String> {
    // Check for existing active sessions
    let active: Option<i64> = conn.query_row(
        "SELECT id FROM sessions WHERE ended_at IS NULL LIMIT 1",
        [],
        |row| row.get(0),
    ).optional().map_err(|e| e.to_string())?;

    if active.is_some() {
        return Err("Another session is already active. Stop it first.".to_string());
    }

    conn.execute(
        "INSERT INTO sessions (project_id, started_at) VALUES (?1, datetime('now'))",
        params![project_id],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    mark_dirty(conn, "sessions", id);
    conn.query_row(
        "SELECT id, project_id, started_at, ended_at, duration_seconds, note FROM sessions WHERE id = ?1",
        params![id],
        |row| {
            Ok(Session {
                id: row.get(0)?,
                project_id: row.get(1)?,
                started_at: row.get(2)?,
                ended_at: row.get(3)?,
                duration_seconds: row.get(4)?,
                note: row.get(5)?,
            })
        },
    ).map_err(|e| e.to_string())
}

pub fn stop_session(conn: &Connection, session_id: i64, note: &str) -> Result<Session, String> {
    conn.execute(
        "UPDATE sessions SET ended_at = datetime('now'), \
         duration_seconds = CAST((julianday(datetime('now')) - julianday(started_at)) * 86400 AS INTEGER), \
         note = ?1 WHERE id = ?2",
        params![note, session_id],
    ).map_err(|e| e.to_string())?;

    // Update project last_worked_on
    let project_id: i64 = conn.query_row(
        "SELECT project_id FROM sessions WHERE id = ?1",
        params![session_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE projects SET last_worked_on = datetime('now'), updated_at = datetime('now') WHERE id = ?1",
        params![project_id],
    ).map_err(|e| e.to_string())?;

    mark_dirty(conn, "sessions", session_id);
    mark_dirty(conn, "projects", project_id);

    conn.query_row(
        "SELECT id, project_id, started_at, ended_at, duration_seconds, note FROM sessions WHERE id = ?1",
        params![session_id],
        |row| {
            Ok(Session {
                id: row.get(0)?,
                project_id: row.get(1)?,
                started_at: row.get(2)?,
                ended_at: row.get(3)?,
                duration_seconds: row.get(4)?,
                note: row.get(5)?,
            })
        },
    ).map_err(|e| e.to_string())
}

pub fn get_sessions_for_project(conn: &Connection, project_id: i64) -> Result<Vec<Session>, String> {
    let mut stmt = conn
        .prepare("SELECT id, project_id, started_at, ended_at, duration_seconds, note FROM sessions WHERE project_id = ?1 ORDER BY started_at DESC")
        .map_err(|e| e.to_string())?;
    let sessions = stmt
        .query_map(params![project_id], |row| {
            Ok(Session {
                id: row.get(0)?,
                project_id: row.get(1)?,
                started_at: row.get(2)?,
                ended_at: row.get(3)?,
                duration_seconds: row.get(4)?,
                note: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(sessions)
}

pub fn get_incomplete_sessions(conn: &Connection) -> Result<Vec<(Session, String)>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT s.id, s.project_id, s.started_at, s.ended_at, s.duration_seconds, s.note, p.name \
             FROM sessions s JOIN projects p ON s.project_id = p.id WHERE s.ended_at IS NULL"
        )
        .map_err(|e| e.to_string())?;
    let results = stmt
        .query_map([], |row| {
            Ok((
                Session {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    started_at: row.get(2)?,
                    ended_at: row.get(3)?,
                    duration_seconds: row.get(4)?,
                    note: row.get(5)?,
                },
                row.get::<_, String>(6)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(results)
}

pub fn resolve_session(conn: &Connection, session_id: i64, save: bool, note: &str) -> Result<(), String> {
    if save {
        stop_session(conn, session_id, note)?;
    } else {
        conn.execute("DELETE FROM sessions WHERE id = ?1", params![session_id])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Needed by rusqlite for optional queries
use rusqlite::OptionalExtension;

// ── Spotify Reference queries ──

pub fn get_spotify_references_for_project(conn: &Connection, project_id: i64) -> Result<Vec<SpotifyReference>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, spotify_id, spotify_type, name, artist_name, album_name, \
             album_art_url, duration_ms, spotify_url, notes, created_at, updated_at \
             FROM spotify_references WHERE project_id = ?1 ORDER BY created_at DESC"
        )
        .map_err(|e| e.to_string())?;
    let refs = stmt
        .query_map(params![project_id], |row| {
            Ok(SpotifyReference {
                id: row.get(0)?,
                project_id: row.get(1)?,
                spotify_id: row.get(2)?,
                spotify_type: row.get(3)?,
                name: row.get(4)?,
                artist_name: row.get(5)?,
                album_name: row.get(6)?,
                album_art_url: row.get(7)?,
                duration_ms: row.get(8)?,
                spotify_url: row.get(9)?,
                notes: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(refs)
}

pub fn create_spotify_reference(
    conn: &Connection,
    project_id: i64,
    spotify_id: &str,
    spotify_type: &str,
    name: &str,
    artist_name: &str,
    album_name: &str,
    album_art_url: &str,
    duration_ms: Option<i64>,
    spotify_url: &str,
) -> Result<SpotifyReference, String> {
    conn.execute(
        "INSERT OR IGNORE INTO spotify_references \
         (project_id, spotify_id, spotify_type, name, artist_name, album_name, album_art_url, duration_ms, spotify_url) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![project_id, spotify_id, spotify_type, name, artist_name, album_name, album_art_url, duration_ms, spotify_url],
    )
    .map_err(|e| e.to_string())?;

    let ref_row = conn.query_row(
        "SELECT id, project_id, spotify_id, spotify_type, name, artist_name, album_name, \
         album_art_url, duration_ms, spotify_url, notes, created_at, updated_at \
         FROM spotify_references WHERE project_id = ?1 AND spotify_id = ?2",
        params![project_id, spotify_id],
        |row| {
            Ok(SpotifyReference {
                id: row.get(0)?,
                project_id: row.get(1)?,
                spotify_id: row.get(2)?,
                spotify_type: row.get(3)?,
                name: row.get(4)?,
                artist_name: row.get(5)?,
                album_name: row.get(6)?,
                album_art_url: row.get(7)?,
                duration_ms: row.get(8)?,
                spotify_url: row.get(9)?,
                notes: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        },
    )
    .map_err(|e| e.to_string())?;
    mark_dirty(conn, "spotify_references", ref_row.id);
    Ok(ref_row)
}

pub fn update_spotify_reference_notes(conn: &Connection, id: i64, notes: &str) -> Result<SpotifyReference, String> {
    conn.execute(
        "UPDATE spotify_references SET notes = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![notes, id],
    )
    .map_err(|e| e.to_string())?;
    mark_dirty(conn, "spotify_references", id);

    conn.query_row(
        "SELECT id, project_id, spotify_id, spotify_type, name, artist_name, album_name, \
         album_art_url, duration_ms, spotify_url, notes, created_at, updated_at \
         FROM spotify_references WHERE id = ?1",
        params![id],
        |row| {
            Ok(SpotifyReference {
                id: row.get(0)?,
                project_id: row.get(1)?,
                spotify_id: row.get(2)?,
                spotify_type: row.get(3)?,
                name: row.get(4)?,
                artist_name: row.get(5)?,
                album_name: row.get(6)?,
                album_art_url: row.get(7)?,
                duration_ms: row.get(8)?,
                spotify_url: row.get(9)?,
                notes: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn delete_spotify_reference(conn: &Connection, id: i64) -> Result<(), String> {
    mark_pending_delete(conn, "spotify_references", id);
    conn.execute("DELETE FROM spotify_references WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Marker queries ──

pub fn get_markers_for_project(conn: &Connection, project_id: i64) -> Result<Vec<Marker>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, bounce_id, timestamp_seconds, type, text, created_at, updated_at \
             FROM markers WHERE project_id = ?1 ORDER BY timestamp_seconds ASC"
        )
        .map_err(|e| e.to_string())?;
    let markers = stmt
        .query_map(params![project_id], |row| {
            Ok(Marker {
                id: row.get(0)?,
                project_id: row.get(1)?,
                bounce_id: row.get(2)?,
                timestamp_seconds: row.get(3)?,
                marker_type: row.get(4)?,
                text: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(markers)
}

pub fn create_marker(
    conn: &Connection,
    project_id: i64,
    bounce_id: Option<i64>,
    timestamp_seconds: f64,
    marker_type: &str,
    text: &str,
) -> Result<Marker, String> {
    conn.execute(
        "INSERT INTO markers (project_id, bounce_id, timestamp_seconds, type, text) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![project_id, bounce_id, timestamp_seconds, marker_type, text],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    mark_dirty(conn, "markers", id);
    conn.query_row(
        "SELECT id, project_id, bounce_id, timestamp_seconds, type, text, created_at, updated_at FROM markers WHERE id = ?1",
        params![id],
        |row| {
            Ok(Marker {
                id: row.get(0)?,
                project_id: row.get(1)?,
                bounce_id: row.get(2)?,
                timestamp_seconds: row.get(3)?,
                marker_type: row.get(4)?,
                text: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn update_marker(
    conn: &Connection,
    id: i64,
    timestamp_seconds: Option<f64>,
    marker_type: Option<String>,
    text: Option<String>,
) -> Result<Marker, String> {
    if let Some(ts) = timestamp_seconds {
        conn.execute(
            "UPDATE markers SET timestamp_seconds = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![ts, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref mt) = marker_type {
        conn.execute(
            "UPDATE markers SET type = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![mt, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref t) = text {
        conn.execute(
            "UPDATE markers SET text = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![t, id],
        )
        .map_err(|e| e.to_string())?;
    }
    mark_dirty(conn, "markers", id);
    conn.query_row(
        "SELECT id, project_id, bounce_id, timestamp_seconds, type, text, created_at, updated_at FROM markers WHERE id = ?1",
        params![id],
        |row| {
            Ok(Marker {
                id: row.get(0)?,
                project_id: row.get(1)?,
                bounce_id: row.get(2)?,
                timestamp_seconds: row.get(3)?,
                marker_type: row.get(4)?,
                text: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn delete_marker(conn: &Connection, id: i64) -> Result<(), String> {
    mark_pending_delete(conn, "markers", id);
    conn.execute("DELETE FROM markers WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Task queries ──

pub fn get_tasks_for_project(conn: &Connection, project_id: i64) -> Result<Vec<ProjectTask>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, title, done, category, linked_marker_id, linked_timestamp_seconds, \
             created_at, updated_at FROM tasks WHERE project_id = ?1 \
             ORDER BY done ASC, category ASC, created_at DESC"
        )
        .map_err(|e| e.to_string())?;
    let tasks = stmt
        .query_map(params![project_id], |row| {
            Ok(ProjectTask {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                done: row.get::<_, i64>(3)? != 0,
                category: row.get(4)?,
                linked_marker_id: row.get(5)?,
                linked_timestamp_seconds: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(tasks)
}

pub fn create_task(
    conn: &Connection,
    project_id: i64,
    title: &str,
    category: &str,
    linked_marker_id: Option<i64>,
    linked_timestamp_seconds: Option<f64>,
) -> Result<ProjectTask, String> {
    conn.execute(
        "INSERT INTO tasks (project_id, title, category, linked_marker_id, linked_timestamp_seconds) \
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![project_id, title, category, linked_marker_id, linked_timestamp_seconds],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    mark_dirty(conn, "tasks", id);
    conn.query_row(
        "SELECT id, project_id, title, done, category, linked_marker_id, linked_timestamp_seconds, \
         created_at, updated_at FROM tasks WHERE id = ?1",
        params![id],
        |row| {
            Ok(ProjectTask {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                done: row.get::<_, i64>(3)? != 0,
                category: row.get(4)?,
                linked_marker_id: row.get(5)?,
                linked_timestamp_seconds: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn update_task(
    conn: &Connection,
    id: i64,
    title: Option<String>,
    done: Option<bool>,
    category: Option<String>,
    linked_marker_id: Option<i64>,
    linked_timestamp_seconds: Option<f64>,
) -> Result<ProjectTask, String> {
    if let Some(ref t) = title {
        conn.execute(
            "UPDATE tasks SET title = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![t, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(d) = done {
        conn.execute(
            "UPDATE tasks SET done = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![d as i64, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref c) = category {
        conn.execute(
            "UPDATE tasks SET category = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![c, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(mid) = linked_marker_id {
        conn.execute(
            "UPDATE tasks SET linked_marker_id = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![mid, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ts) = linked_timestamp_seconds {
        conn.execute(
            "UPDATE tasks SET linked_timestamp_seconds = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![ts, id],
        )
        .map_err(|e| e.to_string())?;
    }
    mark_dirty(conn, "tasks", id);
    conn.query_row(
        "SELECT id, project_id, title, done, category, linked_marker_id, linked_timestamp_seconds, \
         created_at, updated_at FROM tasks WHERE id = ?1",
        params![id],
        |row| {
            Ok(ProjectTask {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                done: row.get::<_, i64>(3)? != 0,
                category: row.get(4)?,
                linked_marker_id: row.get(5)?,
                linked_timestamp_seconds: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn delete_task(conn: &Connection, id: i64) -> Result<(), String> {
    mark_pending_delete(conn, "tasks", id);
    conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Reference queries ──

pub fn get_references_for_project(conn: &Connection, project_id: i64) -> Result<Vec<ProjectReference>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, url, title, notes, created_at, updated_at \
             FROM project_references WHERE project_id = ?1 ORDER BY created_at DESC"
        )
        .map_err(|e| e.to_string())?;
    let refs = stmt
        .query_map(params![project_id], |row| {
            Ok(ProjectReference {
                id: row.get(0)?,
                project_id: row.get(1)?,
                url: row.get(2)?,
                title: row.get(3)?,
                notes: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(refs)
}

pub fn create_reference(
    conn: &Connection,
    project_id: i64,
    url: &str,
    title: Option<String>,
    notes: &str,
) -> Result<ProjectReference, String> {
    conn.execute(
        "INSERT INTO project_references (project_id, url, title, notes) VALUES (?1, ?2, ?3, ?4)",
        params![project_id, url, title, notes],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    mark_dirty(conn, "project_references", id);
    conn.query_row(
        "SELECT id, project_id, url, title, notes, created_at, updated_at FROM project_references WHERE id = ?1",
        params![id],
        |row| {
            Ok(ProjectReference {
                id: row.get(0)?,
                project_id: row.get(1)?,
                url: row.get(2)?,
                title: row.get(3)?,
                notes: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn update_reference(
    conn: &Connection,
    id: i64,
    url: Option<String>,
    title: Option<String>,
    notes: Option<String>,
) -> Result<ProjectReference, String> {
    if let Some(ref u) = url {
        conn.execute(
            "UPDATE project_references SET url = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![u, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref t) = title {
        conn.execute(
            "UPDATE project_references SET title = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![t, id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref n) = notes {
        conn.execute(
            "UPDATE project_references SET notes = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![n, id],
        )
        .map_err(|e| e.to_string())?;
    }
    mark_dirty(conn, "project_references", id);
    conn.query_row(
        "SELECT id, project_id, url, title, notes, created_at, updated_at FROM project_references WHERE id = ?1",
        params![id],
        |row| {
            Ok(ProjectReference {
                id: row.get(0)?,
                project_id: row.get(1)?,
                url: row.get(2)?,
                title: row.get(3)?,
                notes: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn delete_reference(conn: &Connection, id: i64) -> Result<(), String> {
    mark_pending_delete(conn, "project_references", id);
    conn.execute("DELETE FROM project_references WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Asset queries ──

pub fn get_assets_for_project(conn: &Connection, project_id: i64) -> Result<Vec<Asset>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, original_filename, stored_path, asset_type, tags, created_at, updated_at \
             FROM assets WHERE project_id = ?1 ORDER BY created_at DESC"
        )
        .map_err(|e| e.to_string())?;
    let assets = stmt
        .query_map(params![project_id], |row| {
            Ok(Asset {
                id: row.get(0)?,
                project_id: row.get(1)?,
                original_filename: row.get(2)?,
                stored_path: row.get(3)?,
                asset_type: row.get(4)?,
                tags: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(assets)
}

pub fn create_asset(
    conn: &Connection,
    project_id: i64,
    original_filename: &str,
    stored_path: &str,
    asset_type: &str,
) -> Result<Asset, String> {
    conn.execute(
        "INSERT INTO assets (project_id, original_filename, stored_path, asset_type) VALUES (?1, ?2, ?3, ?4)",
        params![project_id, original_filename, stored_path, asset_type],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    mark_dirty(conn, "assets", id);
    conn.query_row(
        "SELECT id, project_id, original_filename, stored_path, asset_type, tags, created_at, updated_at FROM assets WHERE id = ?1",
        params![id],
        |row| {
            Ok(Asset {
                id: row.get(0)?,
                project_id: row.get(1)?,
                original_filename: row.get(2)?,
                stored_path: row.get(3)?,
                asset_type: row.get(4)?,
                tags: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn update_asset(
    conn: &Connection,
    id: i64,
    tags: Option<String>,
) -> Result<Asset, String> {
    if let Some(ref t) = tags {
        conn.execute(
            "UPDATE assets SET tags = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![t, id],
        )
        .map_err(|e| e.to_string())?;
    }
    mark_dirty(conn, "assets", id);
    conn.query_row(
        "SELECT id, project_id, original_filename, stored_path, asset_type, tags, created_at, updated_at FROM assets WHERE id = ?1",
        params![id],
        |row| {
            Ok(Asset {
                id: row.get(0)?,
                project_id: row.get(1)?,
                original_filename: row.get(2)?,
                stored_path: row.get(3)?,
                asset_type: row.get(4)?,
                tags: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn delete_asset(conn: &Connection, id: i64) -> Result<Option<String>, String> {
    // Return stored_path so the caller can delete the file
    let stored_path: Option<String> = conn
        .query_row("SELECT stored_path FROM assets WHERE id = ?1", params![id], |row| row.get(0))
        .optional()
        .map_err(|e| e.to_string())?;
    mark_pending_delete(conn, "assets", id);
    conn.execute("DELETE FROM assets WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(stored_path)
}

// ── Cover queries ──

pub fn set_cover(
    conn: &Connection,
    project_id: i64,
    cover_type: &str,
    artwork_path: Option<&str>,
    cover_seed: Option<&str>,
    cover_style_preset: Option<&str>,
    cover_asset_id: Option<i64>,
) -> Result<(), String> {
    conn.execute(
        "UPDATE projects SET cover_type = ?1, artwork_path = ?2, cover_seed = ?3, \
         cover_style_preset = COALESCE(?4, cover_style_preset), cover_asset_id = ?5, \
         cover_updated_at = datetime('now'), cover_url = NULL, updated_at = datetime('now') WHERE id = ?6",
        params![cover_type, artwork_path, cover_seed, cover_style_preset, cover_asset_id, project_id],
    )
    .map_err(|e| e.to_string())?;
    mark_dirty(conn, "projects", project_id);
    Ok(())
}

pub fn set_cover_locked(conn: &Connection, project_id: i64, locked: bool) -> Result<(), String> {
    conn.execute(
        "UPDATE projects SET cover_locked = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![locked as i64, project_id],
    )
    .map_err(|e| e.to_string())?;
    mark_dirty(conn, "projects", project_id);
    Ok(())
}

// ── Mood Board queries ──

pub fn get_mood_board_pins(conn: &Connection, project_id: i64) -> Result<Vec<MoodBoardPin>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT mb.id, mb.project_id, mb.asset_id, mb.sort_order, mb.created_at, \
             a.stored_path, a.original_filename \
             FROM mood_board mb JOIN assets a ON mb.asset_id = a.id \
             WHERE mb.project_id = ?1 ORDER BY mb.sort_order ASC, mb.created_at ASC"
        )
        .map_err(|e| e.to_string())?;
    let pins = stmt
        .query_map(params![project_id], |row| {
            Ok(MoodBoardPin {
                id: row.get(0)?,
                project_id: row.get(1)?,
                asset_id: row.get(2)?,
                sort_order: row.get(3)?,
                created_at: row.get(4)?,
                stored_path: row.get(5)?,
                original_filename: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(pins)
}

pub fn add_mood_board_pin(conn: &Connection, project_id: i64, asset_id: i64) -> Result<MoodBoardPin, String> {
    // Get the next sort_order
    let max_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM mood_board WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR IGNORE INTO mood_board (project_id, asset_id, sort_order) VALUES (?1, ?2, ?3)",
        params![project_id, asset_id, max_order + 1],
    )
    .map_err(|e| e.to_string())?;

    // Return the pin (may already exist due to OR IGNORE)
    let pin = conn.query_row(
        "SELECT mb.id, mb.project_id, mb.asset_id, mb.sort_order, mb.created_at, \
         a.stored_path, a.original_filename \
         FROM mood_board mb JOIN assets a ON mb.asset_id = a.id \
         WHERE mb.project_id = ?1 AND mb.asset_id = ?2",
        params![project_id, asset_id],
        |row| {
            Ok(MoodBoardPin {
                id: row.get(0)?,
                project_id: row.get(1)?,
                asset_id: row.get(2)?,
                sort_order: row.get(3)?,
                created_at: row.get(4)?,
                stored_path: row.get(5)?,
                original_filename: row.get(6)?,
            })
        },
    )
    .map_err(|e| e.to_string())?;
    mark_dirty(conn, "mood_board", pin.id);
    Ok(pin)
}

pub fn remove_mood_board_pin(conn: &Connection, pin_id: i64) -> Result<(), String> {
    mark_pending_delete(conn, "mood_board", pin_id);
    conn.execute("DELETE FROM mood_board WHERE id = ?1", params![pin_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn reorder_mood_board_pins(conn: &Connection, project_id: i64, pin_ids: &[i64]) -> Result<(), String> {
    for (i, pin_id) in pin_ids.iter().enumerate() {
        conn.execute(
            "UPDATE mood_board SET sort_order = ?1 WHERE id = ?2 AND project_id = ?3",
            params![i as i64, pin_id, project_id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── Project Note queries ──

pub fn get_notes_for_project(conn: &Connection, project_id: i64) -> Result<Vec<ProjectNote>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, content, created_at, updated_at \
             FROM project_notes WHERE project_id = ?1 ORDER BY created_at ASC"
        )
        .map_err(|e| e.to_string())?;
    let notes = stmt
        .query_map(params![project_id], |row| {
            Ok(ProjectNote {
                id: row.get(0)?,
                project_id: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(notes)
}

fn create_note_inner(conn: &Connection, project_id: i64, content: &str) -> Result<ProjectNote, String> {
    conn.execute(
        "INSERT INTO project_notes (project_id, content) VALUES (?1, ?2)",
        params![project_id, content],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    mark_dirty(conn, "project_notes", id);

    conn.query_row(
        "SELECT id, project_id, content, created_at, updated_at FROM project_notes WHERE id = ?1",
        params![id],
        |row| {
            Ok(ProjectNote {
                id: row.get(0)?,
                project_id: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn create_note(conn: &Connection, project_id: i64, content: &str) -> Result<ProjectNote, String> {
    let note = create_note_inner(conn, project_id, content)?;
    rebuild_fts_tags(conn, project_id)?;
    Ok(note)
}

fn update_note_inner(conn: &Connection, id: i64, content: &str) -> Result<ProjectNote, String> {
    conn.execute(
        "UPDATE project_notes SET content = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![content, id],
    )
    .map_err(|e| e.to_string())?;
    mark_dirty(conn, "project_notes", id);

    conn.query_row(
        "SELECT id, project_id, content, created_at, updated_at FROM project_notes WHERE id = ?1",
        params![id],
        |row| {
            Ok(ProjectNote {
                id: row.get(0)?,
                project_id: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

pub fn update_note(conn: &Connection, id: i64, content: &str) -> Result<ProjectNote, String> {
    let note = update_note_inner(conn, id, content)?;
    rebuild_fts_tags(conn, note.project_id)?;
    Ok(note)
}

fn delete_note_inner(conn: &Connection, id: i64) -> Result<i64, String> {
    // Get project_id before deleting
    let project_id: i64 = conn
        .query_row("SELECT project_id FROM project_notes WHERE id = ?1", params![id], |row| row.get(0))
        .map_err(|e| format!("Note not found: {}", e))?;

    mark_pending_delete(conn, "project_notes", id);
    conn.execute("DELETE FROM project_notes WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(project_id)
}

pub fn delete_note(conn: &Connection, id: i64) -> Result<i64, String> {
    let project_id = delete_note_inner(conn, id)?;
    rebuild_fts_tags(conn, project_id)?;
    Ok(project_id)
}
