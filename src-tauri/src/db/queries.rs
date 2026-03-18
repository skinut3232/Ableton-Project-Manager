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

use rusqlite::{params, Connection, OptionalExtension};
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
    let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
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
    let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    conn.execute(
        "UPDATE project_tags SET sync_status = 'pending_push', sync_updated_at = ?1 \
         WHERE project_id = ?2 AND tag_id = ?3",
        params![now, project_id, tag_id],
    ).ok();
}

/// Mark a record for deletion from the remote. The sync engine will DELETE
/// from Supabase, then remove the local row.
pub fn mark_pending_delete(conn: &Connection, table: &str, id: i64) {
    let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
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
         p.cover_url, p.has_missing_deps, p.als_parsed_at \
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

    // Genre filter
    if let Some(ref genres) = filters.genres {
        if !genres.is_empty() {
            let placeholders: Vec<String> = genres.iter().map(|_| {
                let p = format!("?{}", param_idx);
                param_idx += 1;
                p
            }).collect();
            conditions.push(format!("p.genre_label IN ({})", placeholders.join(",")));
            for g in genres {
                param_values.push(Box::new(g.clone()));
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
            param_values.push(Box::new(escaped));
        }
    }

    // Collection filter
    if let Some(collection_id) = filters.collection_id {
        // Determine collection type
        let ctype: Option<String> = conn.query_row(
            "SELECT collection_type FROM collections WHERE id = ?1",
            params![collection_id],
            |row| row.get(0),
        ).optional().map_err(|e| e.to_string())?.flatten();

        match ctype.as_deref() {
            Some("manual") => {
                conditions.push(format!(
                    "p.id IN (SELECT project_id FROM collection_projects WHERE collection_id = ?{})",
                    param_idx
                ));
                param_idx += 1;
                param_values.push(Box::new(collection_id));
            }
            Some("smart") => {
                // Evaluate smart rules and filter by resulting IDs
                let smart_ids = evaluate_smart_collection(conn, collection_id)?;
                if smart_ids.is_empty() {
                    // No matches — return empty
                    conditions.push("1 = 0".to_string());
                } else {
                    let placeholders: Vec<String> = smart_ids.iter().map(|_| {
                        let p = format!("?{}", param_idx);
                        param_idx += 1;
                        p
                    }).collect();
                    conditions.push(format!("p.id IN ({})", placeholders.join(",")));
                    for id in &smart_ids {
                        param_values.push(Box::new(*id));
                    }
                }
            }
            _ => {} // Unknown collection type — ignore
        }
    }
    let _ = param_idx; // suppress unused warning

    if !conditions.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&conditions.join(" AND "));
    }

    // Sort — manual collections override with sort_order
    let is_manual_collection = filters.collection_id.and_then(|cid| {
        conn.query_row("SELECT collection_type FROM collections WHERE id = ?1", params![cid], |row| row.get::<_, String>(0)).ok()
    }).as_deref() == Some("manual");

    let dir = match filters.sort_dir.as_deref() {
        Some("asc") => "ASC",
        Some("desc") => "DESC",
        _ => "DESC",
    };
    let sort_clause = if is_manual_collection {
        // Join with collection_projects for ordering
        format!("(SELECT cp.sort_order FROM collection_projects cp WHERE cp.project_id = p.id AND cp.collection_id = {}) ASC",
            filters.collection_id.unwrap())
    } else { match filters.sort_by.as_deref() {
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
    } };
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
                has_missing_deps: row.get::<_, i64>(25).unwrap_or(0) != 0,
                als_parsed_at: row.get(26)?,
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
         cover_url, has_missing_deps, als_parsed_at \
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
                has_missing_deps: row.get::<_, i64>(25).unwrap_or(0) != 0,
                als_parsed_at: row.get(26)?,
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

/// Returns all distinct non-empty genre labels across projects, sorted alphabetically.
pub fn get_all_genres(conn: &Connection) -> Result<Vec<String>, String> {
    let mut stmt = conn.prepare(
        "SELECT DISTINCT genre_label FROM projects WHERE genre_label != '' ORDER BY genre_label"
    ).map_err(|e| e.to_string())?;
    let genres = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(genres)
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
    let plugins_text = get_plugins_text_for_fts(conn, project_id);

    // Get current project data
    let project = get_project_by_id(conn, project_id)?;
    let notes_text = get_notes_text_for_fts(conn, project_id)?;

    // Delete old FTS entry (standalone table: use standard DELETE)
    conn.execute(
        "DELETE FROM projects_fts WHERE rowid = ?1",
        params![project_id],
    ).ok(); // Ignore if row doesn't exist

    // Reinsert with concatenated project_notes content + plugin names
    conn.execute(
        "INSERT INTO projects_fts(rowid, name, genre_label, notes, tags_text, plugins_text) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![project_id, project.name, project.genre_label, notes_text, tags_text, plugins_text],
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
        let plugins_text = get_plugins_text_for_fts(conn, *id);

        conn.execute(
            "INSERT INTO projects_fts(rowid, name, genre_label, notes, tags_text, plugins_text) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, name, genre_label, notes_text, tags_text, plugins_text],
        ).ok();
    }

    Ok(())
}

// ============================================================================
// ALS PARSING QUERIES
// ============================================================================

/// Set BPM only if currently empty (NULL or 0) — preserves manual user edits.
pub fn set_bpm_if_empty(conn: &Connection, project_id: i64, bpm: f64) -> Result<(), String> {
    conn.execute(
        "UPDATE projects SET bpm = ?1, updated_at = datetime('now') WHERE id = ?2 AND (bpm IS NULL OR bpm = 0)",
        params![bpm, project_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// Set musical_key only if currently empty — preserves manual user edits.
pub fn set_key_if_empty(conn: &Connection, project_id: i64, key: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE projects SET musical_key = ?1, updated_at = datetime('now') WHERE id = ?2 AND (musical_key IS NULL OR musical_key = '')",
        params![key, project_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// Replace all plugins for a project (delete + reinsert).
pub fn replace_project_plugins(conn: &Connection, project_id: i64, plugins: &[PluginInfo]) -> Result<(), String> {
    conn.execute("DELETE FROM project_plugins WHERE project_id = ?1", params![project_id])
        .map_err(|e| e.to_string())?;
    for plugin in plugins {
        conn.execute(
            "INSERT INTO project_plugins (project_id, name, plugin_type) VALUES (?1, ?2, ?3)",
            params![project_id, plugin.name, plugin.plugin_type],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Replace all samples for a project (delete + reinsert).
pub fn replace_project_samples(conn: &Connection, project_id: i64, samples: &[SampleWithStatus]) -> Result<(), String> {
    conn.execute("DELETE FROM project_samples WHERE project_id = ?1", params![project_id])
        .map_err(|e| e.to_string())?;
    for sample in samples {
        conn.execute(
            "INSERT INTO project_samples (project_id, path, filename, is_missing) VALUES (?1, ?2, ?3, ?4)",
            params![project_id, sample.path, sample.filename, sample.is_missing as i64],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Set the has_missing_deps flag on a project.
pub fn set_has_missing_deps(conn: &Connection, project_id: i64, has_missing: bool) -> Result<(), String> {
    conn.execute(
        "UPDATE projects SET has_missing_deps = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![has_missing as i64, project_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// Record when the .als file was last parsed (Unix seconds of file mtime).
pub fn set_als_parsed_at(conn: &Connection, project_id: i64, mtime: i64) -> Result<(), String> {
    conn.execute(
        "UPDATE projects SET als_parsed_at = ?1 WHERE id = ?2",
        params![mtime, project_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// Get the als_parsed_at value for a project.
pub fn get_als_parsed_at(conn: &Connection, project_id: i64) -> Result<Option<i64>, String> {
    conn.query_row(
        "SELECT als_parsed_at FROM projects WHERE id = ?1",
        params![project_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())
}

/// Get all plugins for a project.
pub fn get_project_plugins(conn: &Connection, project_id: i64) -> Result<Vec<PluginInfo>, String> {
    let mut stmt = conn.prepare(
        "SELECT name, plugin_type FROM project_plugins WHERE project_id = ?1 ORDER BY name"
    ).map_err(|e| e.to_string())?;
    let plugins = stmt.query_map(params![project_id], |row| {
        Ok(PluginInfo {
            name: row.get(0)?,
            plugin_type: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?
      .filter_map(|r| r.ok())
      .collect();
    Ok(plugins)
}

/// Get all samples for a project.
pub fn get_project_samples(conn: &Connection, project_id: i64) -> Result<Vec<SampleWithStatus>, String> {
    let mut stmt = conn.prepare(
        "SELECT path, filename, is_missing FROM project_samples WHERE project_id = ?1 ORDER BY filename"
    ).map_err(|e| e.to_string())?;
    let samples = stmt.query_map(params![project_id], |row| {
        Ok(SampleWithStatus {
            path: row.get(0)?,
            filename: row.get(1)?,
            is_missing: row.get::<_, i64>(2)? != 0,
        })
    }).map_err(|e| e.to_string())?
      .filter_map(|r| r.ok())
      .collect();
    Ok(samples)
}

/// Get plugins text for FTS indexing.
fn get_plugins_text_for_fts(conn: &Connection, project_id: i64) -> String {
    let mut stmt = match conn.prepare("SELECT name FROM project_plugins WHERE project_id = ?1") {
        Ok(s) => s,
        Err(_) => return String::new(),
    };
    let names: Vec<String> = match stmt.query_map(params![project_id], |row| row.get(0)) {
        Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
        Err(_) => return String::new(),
    };
    names.join(" ")
}

pub fn get_sets_for_project(conn: &Connection, project_id: i64) -> Result<Vec<AbletonSet>, String> {
    let mut stmt = conn
        .prepare("SELECT id, project_id, set_path, modified_time, file_size FROM ableton_sets WHERE project_id = ?1 ORDER BY modified_time DESC")
        .map_err(|e| e.to_string())?;
    let sets = stmt
        .query_map(params![project_id], |row| {
            Ok(AbletonSet {
                id: row.get(0)?,
                project_id: row.get(1)?,
                set_path: row.get(2)?,
                modified_time: row.get(3)?,
                file_size: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(sets)
}

pub fn get_bounces_for_project(conn: &Connection, project_id: i64) -> Result<Vec<Bounce>, String> {
    let mut stmt = conn
        .prepare("SELECT id, project_id, bounce_path, modified_time, duration_seconds, notes FROM bounces WHERE project_id = ?1 ORDER BY modified_time DESC")
        .map_err(|e| e.to_string())?;
    let bounces = stmt
        .query_map(params![project_id], |row| {
            Ok(Bounce {
                id: row.get(0)?,
                project_id: row.get(1)?,
                bounce_path: row.get(2)?,
                modified_time: row.get(3)?,
                duration_seconds: row.get(4)?,
                notes: row.get::<_, String>(5).unwrap_or_default(),
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

// ============================================================================
// BOUNCE NOTES
// ============================================================================

pub fn update_bounce_notes(conn: &Connection, id: i64, notes: &str) -> Result<Bounce, String> {
    conn.execute(
        "UPDATE bounces SET notes = ?1 WHERE id = ?2",
        params![notes, id],
    ).map_err(|e| e.to_string())?;
    mark_dirty(conn, "bounces", id);

    conn.query_row(
        "SELECT id, project_id, bounce_path, modified_time, duration_seconds, notes FROM bounces WHERE id = ?1",
        params![id],
        |row| {
            Ok(Bounce {
                id: row.get(0)?,
                project_id: row.get(1)?,
                bounce_path: row.get(2)?,
                modified_time: row.get(3)?,
                duration_seconds: row.get(4)?,
                notes: row.get::<_, String>(5).unwrap_or_default(),
            })
        },
    ).map_err(|e| format!("Bounce not found: {}", e))
}

// ============================================================================
// VERSION TIMELINE
// ============================================================================

pub fn get_version_timeline(conn: &Connection, project_id: i64) -> Result<Vec<VersionTimelineEntry>, String> {
    let mut stmt = conn.prepare(
        "SELECT s.id, s.project_id, s.set_path, s.modified_time, s.file_size, \
         vn.note, vn.id \
         FROM ableton_sets s \
         LEFT JOIN version_notes vn ON vn.set_id = s.id \
         WHERE s.project_id = ?1 \
         ORDER BY s.modified_time DESC"
    ).map_err(|e| e.to_string())?;

    let entries = stmt.query_map(params![project_id], |row| {
        Ok(VersionTimelineEntry {
            set: AbletonSet {
                id: row.get(0)?,
                project_id: row.get(1)?,
                set_path: row.get(2)?,
                modified_time: row.get(3)?,
                file_size: row.get(4)?,
            },
            note: row.get(5)?,
            note_id: row.get(6)?,
        })
    })
    .map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(entries)
}

pub fn upsert_version_note(conn: &Connection, set_id: i64, project_id: i64, note: &str) -> Result<VersionNote, String> {
    conn.execute(
        "INSERT INTO version_notes (set_id, project_id, note) VALUES (?1, ?2, ?3) \
         ON CONFLICT(set_id) DO UPDATE SET note = ?3, updated_at = datetime('now')",
        params![set_id, project_id, note],
    ).map_err(|e| e.to_string())?;

    let vn = conn.query_row(
        "SELECT id, set_id, project_id, note, created_at, updated_at FROM version_notes WHERE set_id = ?1",
        params![set_id],
        |row| {
            Ok(VersionNote {
                id: row.get(0)?,
                set_id: row.get(1)?,
                project_id: row.get(2)?,
                note: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    ).map_err(|e| format!("Version note not found: {}", e))?;

    mark_dirty(conn, "version_notes", vn.id);
    Ok(vn)
}

pub fn delete_version_note(conn: &Connection, set_id: i64) -> Result<(), String> {
    // Get id for sync tracking before delete
    if let Ok(id) = conn.query_row(
        "SELECT id FROM version_notes WHERE set_id = ?1", params![set_id], |row| row.get::<_, i64>(0)
    ) {
        mark_pending_delete(conn, "version_notes", id);
    }
    conn.execute("DELETE FROM version_notes WHERE set_id = ?1", params![set_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// PROJECT QUICK-CREATE
// ============================================================================

pub fn create_project(conn: &Connection, name: &str, project_path: &str) -> Result<Project, String> {
    conn.execute(
        "INSERT INTO projects (name, project_path) VALUES (?1, ?2)",
        params![name, project_path],
    ).map_err(|e| e.to_string())?;

    let id: i64 = conn.query_row(
        "SELECT id FROM projects WHERE project_path = ?1",
        params![project_path],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    rebuild_fts_tags(conn, id)?;
    mark_dirty(conn, "projects", id);
    get_project_by_id(conn, id)
}

// ============================================================================
// COLLECTIONS
// ============================================================================

pub fn get_all_collections(conn: &Connection) -> Result<Vec<Collection>, String> {
    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.collection_type, c.icon, c.sort_order, c.created_at, c.updated_at, \
         CASE c.collection_type \
           WHEN 'manual' THEN (SELECT COUNT(*) FROM collection_projects cp WHERE cp.collection_id = c.id) \
           ELSE 0 \
         END as project_count \
         FROM collections c ORDER BY c.sort_order ASC, c.name ASC"
    ).map_err(|e| e.to_string())?;

    let collections = stmt.query_map([], |row| {
        Ok(Collection {
            id: row.get(0)?,
            name: row.get(1)?,
            collection_type: row.get(2)?,
            icon: row.get(3)?,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
            project_count: row.get(7)?,
        })
    })
    .map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(collections)
}

pub fn create_collection(conn: &Connection, name: &str, collection_type: &str, icon: &str) -> Result<Collection, String> {
    let max_order: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), 0) FROM collections", [], |row| row.get(0)
    ).unwrap_or(0);

    conn.execute(
        "INSERT INTO collections (name, collection_type, icon, sort_order) VALUES (?1, ?2, ?3, ?4)",
        params![name, collection_type, icon, max_order + 1],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    mark_dirty(conn, "collections", id);

    conn.query_row(
        "SELECT id, name, collection_type, icon, sort_order, created_at, updated_at FROM collections WHERE id = ?1",
        params![id],
        |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                collection_type: row.get(2)?,
                icon: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                project_count: 0,
            })
        },
    ).map_err(|e| e.to_string())
}

pub fn update_collection(conn: &Connection, id: i64, name: Option<&str>, icon: Option<&str>) -> Result<Collection, String> {
    if let Some(n) = name {
        conn.execute(
            "UPDATE collections SET name = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![n, id],
        ).map_err(|e| e.to_string())?;
    }
    if let Some(i) = icon {
        conn.execute(
            "UPDATE collections SET icon = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![i, id],
        ).map_err(|e| e.to_string())?;
    }
    mark_dirty(conn, "collections", id);

    conn.query_row(
        "SELECT c.id, c.name, c.collection_type, c.icon, c.sort_order, c.created_at, c.updated_at, \
         CASE c.collection_type \
           WHEN 'manual' THEN (SELECT COUNT(*) FROM collection_projects cp WHERE cp.collection_id = c.id) \
           ELSE 0 \
         END \
         FROM collections c WHERE c.id = ?1",
        params![id],
        |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                collection_type: row.get(2)?,
                icon: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                project_count: row.get(7)?,
            })
        },
    ).map_err(|e| format!("Collection not found: {}", e))
}

pub fn delete_collection(conn: &Connection, id: i64) -> Result<(), String> {
    mark_pending_delete(conn, "collections", id);
    conn.execute("DELETE FROM collections WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn reorder_collections(conn: &Connection, ids: &[i64]) -> Result<(), String> {
    for (i, id) in ids.iter().enumerate() {
        conn.execute(
            "UPDATE collections SET sort_order = ?1 WHERE id = ?2",
            params![i as i64, id],
        ).map_err(|e| e.to_string())?;
        mark_dirty(conn, "collections", *id);
    }
    Ok(())
}

pub fn get_smart_collection_rules(conn: &Connection, collection_id: i64) -> Result<Vec<SmartCollectionRule>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, collection_id, field, operator, value, sort_order \
         FROM smart_collection_rules WHERE collection_id = ?1 ORDER BY sort_order ASC"
    ).map_err(|e| e.to_string())?;

    let rules = stmt.query_map(params![collection_id], |row| {
        Ok(SmartCollectionRule {
            id: row.get(0)?,
            collection_id: row.get(1)?,
            field: row.get(2)?,
            operator: row.get(3)?,
            value: row.get(4)?,
            sort_order: row.get(5)?,
        })
    })
    .map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(rules)
}

pub fn set_smart_collection_rules(conn: &Connection, collection_id: i64, rules: &[SmartCollectionRuleInput]) -> Result<Vec<SmartCollectionRule>, String> {
    // Delete existing rules
    conn.execute("DELETE FROM smart_collection_rules WHERE collection_id = ?1", params![collection_id])
        .map_err(|e| e.to_string())?;

    // Insert new rules
    for (i, rule) in rules.iter().enumerate() {
        conn.execute(
            "INSERT INTO smart_collection_rules (collection_id, field, operator, value, sort_order) \
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![collection_id, rule.field, rule.operator, rule.value, i as i64],
        ).map_err(|e| e.to_string())?;
    }

    mark_dirty(conn, "collections", collection_id);
    get_smart_collection_rules(conn, collection_id)
}

pub fn add_project_to_collection(conn: &Connection, collection_id: i64, project_id: i64) -> Result<(), String> {
    let max_order: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), 0) FROM collection_projects WHERE collection_id = ?1",
        params![collection_id], |row| row.get(0)
    ).unwrap_or(0);

    conn.execute(
        "INSERT OR IGNORE INTO collection_projects (collection_id, project_id, sort_order) VALUES (?1, ?2, ?3)",
        params![collection_id, project_id, max_order + 1],
    ).map_err(|e| e.to_string())?;

    mark_dirty(conn, "collections", collection_id);
    Ok(())
}

pub fn remove_project_from_collection(conn: &Connection, collection_id: i64, project_id: i64) -> Result<(), String> {
    conn.execute(
        "DELETE FROM collection_projects WHERE collection_id = ?1 AND project_id = ?2",
        params![collection_id, project_id],
    ).map_err(|e| e.to_string())?;

    mark_dirty(conn, "collections", collection_id);
    Ok(())
}

pub fn reorder_collection_projects(conn: &Connection, collection_id: i64, project_ids: &[i64]) -> Result<(), String> {
    for (i, pid) in project_ids.iter().enumerate() {
        conn.execute(
            "UPDATE collection_projects SET sort_order = ?1 WHERE collection_id = ?2 AND project_id = ?3",
            params![i as i64, collection_id, pid],
        ).map_err(|e| e.to_string())?;
    }
    mark_dirty(conn, "collections", collection_id);
    Ok(())
}

pub fn get_collection_project_ids(conn: &Connection, collection_id: i64) -> Result<Vec<i64>, String> {
    let mut stmt = conn.prepare(
        "SELECT project_id FROM collection_projects WHERE collection_id = ?1 ORDER BY sort_order ASC"
    ).map_err(|e| e.to_string())?;

    let ids = stmt.query_map(params![collection_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ids)
}

/// Evaluate a smart collection's rules and return matching project IDs.
pub fn evaluate_smart_collection(conn: &Connection, collection_id: i64) -> Result<Vec<i64>, String> {
    let rules = get_smart_collection_rules(conn, collection_id)?;
    if rules.is_empty() {
        return Ok(Vec::new());
    }

    let mut conditions: Vec<String> = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut param_idx = 1;

    for rule in &rules {
        match (rule.field.as_str(), rule.operator.as_str()) {
            // Numeric fields: bpm, rating, progress
            ("bpm", op @ ("gt" | "lt" | "eq" | "gte" | "lte")) => {
                let cmp = match op { "gt" => ">", "lt" => "<", "eq" => "=", "gte" => ">=", "lte" => "<=", _ => "=" };
                conditions.push(format!("p.bpm {} ?{}", cmp, param_idx));
                param_idx += 1;
                let val: f64 = rule.value.parse().unwrap_or(0.0);
                param_values.push(Box::new(val));
            }
            ("bpm", "between") => {
                // value is JSON like [120, 140]
                if let Ok(vals) = serde_json::from_str::<Vec<f64>>(&rule.value) {
                    if vals.len() == 2 {
                        conditions.push(format!("p.bpm >= ?{} AND p.bpm <= ?{}", param_idx, param_idx + 1));
                        param_idx += 2;
                        param_values.push(Box::new(vals[0]));
                        param_values.push(Box::new(vals[1]));
                    }
                }
            }
            ("rating", op @ ("gt" | "lt" | "eq" | "gte" | "lte")) => {
                let cmp = match op { "gt" => ">", "lt" => "<", "eq" => "=", "gte" => ">=", "lte" => "<=", _ => "=" };
                conditions.push(format!("p.rating {} ?{}", cmp, param_idx));
                param_idx += 1;
                let val: i64 = rule.value.parse().unwrap_or(0);
                param_values.push(Box::new(val));
            }
            ("progress", op @ ("gt" | "lt" | "eq" | "gte" | "lte")) => {
                let cmp = match op { "gt" => ">", "lt" => "<", "eq" => "=", "gte" => ">=", "lte" => "<=", _ => "=" };
                conditions.push(format!("p.progress {} ?{}", cmp, param_idx));
                param_idx += 1;
                let val: i64 = rule.value.parse().unwrap_or(0);
                param_values.push(Box::new(val));
            }

            // String fields: key, genre, status
            ("key" | "genre" | "status", "is") => {
                let col = match rule.field.as_str() {
                    "key" => "p.musical_key", "genre" => "p.genre_label", _ => "p.status"
                };
                conditions.push(format!("{} = ?{}", col, param_idx));
                param_idx += 1;
                param_values.push(Box::new(rule.value.clone()));
            }
            ("key" | "genre" | "status", "is_not") => {
                let col = match rule.field.as_str() {
                    "key" => "p.musical_key", "genre" => "p.genre_label", _ => "p.status"
                };
                conditions.push(format!("{} != ?{}", col, param_idx));
                param_idx += 1;
                param_values.push(Box::new(rule.value.clone()));
            }

            // Tag filter
            ("tag", "has") => {
                conditions.push(format!(
                    "p.id IN (SELECT pt.project_id FROM project_tags pt JOIN tags t ON pt.tag_id = t.id WHERE t.name = ?{})",
                    param_idx
                ));
                param_idx += 1;
                param_values.push(Box::new(rule.value.clone()));
            }
            ("tag", "has_not") => {
                conditions.push(format!(
                    "p.id NOT IN (SELECT pt.project_id FROM project_tags pt JOIN tags t ON pt.tag_id = t.id WHERE t.name = ?{})",
                    param_idx
                ));
                param_idx += 1;
                param_values.push(Box::new(rule.value.clone()));
            }

            // Plugin filter
            ("plugin", "contains") => {
                conditions.push(format!(
                    "p.id IN (SELECT pp.project_id FROM project_plugins pp WHERE pp.name LIKE ?{})",
                    param_idx
                ));
                param_idx += 1;
                param_values.push(Box::new(format!("%{}%", rule.value)));
            }

            // Boolean fields
            ("in_rotation", "is") => {
                let val: i64 = if rule.value == "true" { 1 } else { 0 };
                conditions.push(format!("p.in_rotation = ?{}", param_idx));
                param_idx += 1;
                param_values.push(Box::new(val));
            }
            ("has_missing_deps", "is") => {
                let val: i64 = if rule.value == "true" { 1 } else { 0 };
                conditions.push(format!("p.has_missing_deps = ?{}", param_idx));
                param_idx += 1;
                param_values.push(Box::new(val));
            }

            // Date fields
            ("last_worked_on", "within_days") => {
                let days: i64 = rule.value.parse().unwrap_or(30);
                conditions.push(format!("p.last_worked_on >= datetime('now', '-{} days')", days));
            }
            ("last_worked_on", "older_than_days") => {
                let days: i64 = rule.value.parse().unwrap_or(30);
                conditions.push(format!("p.last_worked_on < datetime('now', '-{} days')", days));
            }

            _ => {
                log::warn!("Unknown smart rule: field={}, operator={}", rule.field, rule.operator);
            }
        }
    }

    let _ = param_idx; // suppress unused warning

    if conditions.is_empty() {
        return Ok(Vec::new());
    }

    let sql = format!(
        "SELECT p.id FROM projects p WHERE p.archived = 0 AND p.missing = 0 AND {}",
        conditions.join(" AND ")
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let ids = stmt.query_map(params_refs.as_slice(), |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ids)
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

pub fn bulk_add_tag(conn: &Connection, project_ids: &[i64], tag_id: i64) -> Result<(), String> {
    for pid in project_ids {
        add_tag_to_project(conn, *pid, tag_id)?;
    }
    Ok(())
}

pub fn bulk_remove_tag(conn: &Connection, project_ids: &[i64], tag_id: i64) -> Result<(), String> {
    for pid in project_ids {
        remove_tag_from_project(conn, *pid, tag_id)?;
    }
    Ok(())
}

pub fn bulk_archive(conn: &Connection, project_ids: &[i64], archived: bool) -> Result<(), String> {
    for pid in project_ids {
        conn.execute(
            "UPDATE projects SET archived = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![archived as i64, pid],
        ).map_err(|e| e.to_string())?;
        mark_dirty(conn, "projects", *pid);
    }
    Ok(())
}

pub fn bulk_set_genre(conn: &Connection, project_ids: &[i64], genre_label: &str) -> Result<(), String> {
    for pid in project_ids {
        conn.execute(
            "UPDATE projects SET genre_label = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![genre_label, pid],
        ).map_err(|e| e.to_string())?;
        rebuild_fts_tags(conn, *pid)?;
        mark_dirty(conn, "projects", *pid);
    }
    Ok(())
}

pub fn bulk_add_to_collection(conn: &Connection, project_ids: &[i64], collection_id: i64) -> Result<(), String> {
    for pid in project_ids {
        add_project_to_collection(conn, collection_id, *pid)?;
    }
    Ok(())
}

// ============================================================================
// LIBRARY HEALTH
// ============================================================================

pub fn get_library_health(conn: &Connection, stale_threshold_days: i64) -> Result<LibraryHealth, String> {
    let total_projects: i64 = conn.query_row(
        "SELECT COUNT(*) FROM projects WHERE archived = 0 AND missing = 0", [], |row| row.get(0)
    ).unwrap_or(0);

    let total_als_files: i64 = conn.query_row(
        "SELECT COUNT(*) FROM ableton_sets s JOIN projects p ON s.project_id = p.id WHERE p.archived = 0 AND p.missing = 0",
        [], |row| row.get(0)
    ).unwrap_or(0);

    let total_bounces: i64 = conn.query_row(
        "SELECT COUNT(*) FROM bounces b JOIN projects p ON b.project_id = p.id WHERE p.archived = 0 AND p.missing = 0",
        [], |row| row.get(0)
    ).unwrap_or(0);

    let total_disk_size_bytes: i64 = conn.query_row(
        "SELECT COALESCE(SUM(s.file_size), 0) FROM ableton_sets s JOIN projects p ON s.project_id = p.id WHERE p.archived = 0 AND p.missing = 0 AND s.file_size IS NOT NULL",
        [], |row| row.get(0)
    ).unwrap_or(0);

    let missing_deps_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM projects WHERE archived = 0 AND missing = 0 AND has_missing_deps = 1",
        [], |row| row.get(0)
    ).unwrap_or(0);

    let stale_projects_count: i64 = conn.query_row(
        &format!(
            "SELECT COUNT(*) FROM projects WHERE archived = 0 AND missing = 0 AND last_worked_on < datetime('now', '-{} days')",
            stale_threshold_days
        ),
        [], |row| row.get(0)
    ).unwrap_or(0);

    // Status breakdown
    let mut stmt = conn.prepare(
        "SELECT status, COUNT(*) FROM projects WHERE archived = 0 AND missing = 0 GROUP BY status ORDER BY COUNT(*) DESC"
    ).map_err(|e| e.to_string())?;
    let status_breakdown = stmt.query_map([], |row| {
        Ok(StatusCount { status: row.get(0)?, count: row.get(1)? })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    // Genre breakdown
    let mut stmt2 = conn.prepare(
        "SELECT genre_label, COUNT(*) FROM projects WHERE archived = 0 AND missing = 0 AND genre_label != '' GROUP BY genre_label ORDER BY COUNT(*) DESC"
    ).map_err(|e| e.to_string())?;
    let genre_breakdown = stmt2.query_map([], |row| {
        Ok(GenreCount { genre: row.get(0)?, count: row.get(1)? })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(LibraryHealth {
        total_projects,
        total_als_files,
        total_bounces,
        total_disk_size_bytes,
        missing_deps_count,
        stale_projects_count,
        stale_threshold_days,
        status_breakdown,
        genre_breakdown,
    })
}

// ============================================================================
// TESTS — v1.1.0 features
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    /// Create an in-memory database with full schema + migrations applied.
    fn test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        crate::db::migrations::run_migrations(&conn).unwrap();
        conn
    }

    /// Insert a test project and return its ID.
    fn insert_project(conn: &Connection, name: &str, path: &str) -> i64 {
        create_project(conn, name, path).unwrap().id
    }

    /// Insert a test project with specific fields set.
    fn insert_project_with(conn: &Connection, name: &str, path: &str, bpm: Option<f64>, genre: &str, status: &str, rating: Option<i64>) -> i64 {
        let id = insert_project(conn, name, path);
        if let Some(b) = bpm {
            conn.execute("UPDATE projects SET bpm = ?1 WHERE id = ?2", params![b, id]).unwrap();
        }
        if !genre.is_empty() {
            conn.execute("UPDATE projects SET genre_label = ?1 WHERE id = ?2", params![genre, id]).unwrap();
        }
        conn.execute("UPDATE projects SET status = ?1 WHERE id = ?2", params![status, id]).unwrap();
        if let Some(r) = rating {
            conn.execute("UPDATE projects SET rating = ?1 WHERE id = ?2", params![r, id]).unwrap();
        }
        rebuild_fts_tags(conn, id).unwrap();
        id
    }

    /// Insert a bounce for a project and return its ID.
    fn insert_bounce(conn: &Connection, project_id: i64, path: &str) -> i64 {
        conn.execute(
            "INSERT INTO bounces (project_id, bounce_path, modified_time) VALUES (?1, ?2, datetime('now'))",
            params![project_id, path],
        ).unwrap();
        conn.last_insert_rowid()
    }

    /// Insert an .als set for a project and return its ID.
    fn insert_set(conn: &Connection, project_id: i64, path: &str, file_size: Option<i64>) -> i64 {
        conn.execute(
            "INSERT INTO ableton_sets (project_id, set_path, modified_time, file_size) VALUES (?1, ?2, datetime('now'), ?3)",
            params![project_id, path, file_size],
        ).unwrap();
        conn.last_insert_rowid()
    }

    // ========================================================================
    // Migration
    // ========================================================================

    #[test]
    fn test_migration_creates_v13_tables() {
        let conn = test_db();
        let version: i64 = conn.query_row("SELECT MAX(version) FROM schema_version", [], |r| r.get(0)).unwrap();
        assert_eq!(version, 13);

        // Verify all 4 new tables exist
        for table in &["collections", "smart_collection_rules", "collection_projects", "version_notes"] {
            let exists: bool = conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
                params![table], |r| r.get::<_, i64>(0),
            ).map(|c| c > 0).unwrap();
            assert!(exists, "Table {} should exist", table);
        }

        // Verify bounces.notes column exists
        let has_notes: bool = conn.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('bounces') WHERE name='notes'",
            [], |r| r.get::<_, i64>(0),
        ).map(|c| c > 0).unwrap();
        assert!(has_notes, "bounces.notes column should exist");

        // Verify ableton_sets.file_size column exists
        let has_file_size: bool = conn.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('ableton_sets') WHERE name='file_size'",
            [], |r| r.get::<_, i64>(0),
        ).map(|c| c > 0).unwrap();
        assert!(has_file_size, "ableton_sets.file_size column should exist");
    }

    #[test]
    fn test_migration_is_idempotent() {
        let conn = test_db();
        // Running migrations again should not fail
        crate::db::migrations::run_migrations(&conn).unwrap();
        let version: i64 = conn.query_row("SELECT MAX(version) FROM schema_version", [], |r| r.get(0)).unwrap();
        assert_eq!(version, 13);
    }

    // ========================================================================
    // Bounce Notes
    // ========================================================================

    #[test]
    fn test_bounce_notes_default_empty() {
        let conn = test_db();
        let pid = insert_project(&conn, "Test", "/test/proj");
        let bid = insert_bounce(&conn, pid, "/test/proj/bounce.wav");
        let bounces = get_bounces_for_project(&conn, pid).unwrap();
        assert_eq!(bounces.len(), 1);
        assert_eq!(bounces[0].notes, "");
        assert_eq!(bounces[0].id, bid);
    }

    #[test]
    fn test_update_bounce_notes() {
        let conn = test_db();
        let pid = insert_project(&conn, "Test", "/test/proj");
        let bid = insert_bounce(&conn, pid, "/test/proj/bounce.wav");
        let updated = update_bounce_notes(&conn, bid, "Great take!").unwrap();
        assert_eq!(updated.notes, "Great take!");
        assert_eq!(updated.id, bid);
    }

    #[test]
    fn test_update_bounce_notes_to_empty() {
        let conn = test_db();
        let pid = insert_project(&conn, "Test", "/test/proj");
        let bid = insert_bounce(&conn, pid, "/test/proj/bounce.wav");
        update_bounce_notes(&conn, bid, "Some note").unwrap();
        let cleared = update_bounce_notes(&conn, bid, "").unwrap();
        assert_eq!(cleared.notes, "");
    }

    #[test]
    fn test_update_bounce_notes_nonexistent() {
        let conn = test_db();
        let result = update_bounce_notes(&conn, 99999, "text");
        assert!(result.is_err());
    }

    #[test]
    fn test_bounce_notes_persist_across_reads() {
        let conn = test_db();
        let pid = insert_project(&conn, "Test", "/test/proj");
        let bid = insert_bounce(&conn, pid, "/test/proj/bounce.wav");
        update_bounce_notes(&conn, bid, "Persisted note").unwrap();
        // Read again from DB
        let bounces = get_bounces_for_project(&conn, pid).unwrap();
        assert_eq!(bounces[0].notes, "Persisted note");
    }

    // ========================================================================
    // Version Timeline
    // ========================================================================

    #[test]
    fn test_version_timeline_empty_project() {
        let conn = test_db();
        let pid = insert_project(&conn, "Test", "/test/proj");
        let entries = get_version_timeline(&conn, pid).unwrap();
        assert!(entries.is_empty());
    }

    #[test]
    fn test_version_timeline_with_sets() {
        let conn = test_db();
        let pid = insert_project(&conn, "Test", "/test/proj");
        insert_set(&conn, pid, "/test/proj/v1.als", Some(1024));
        insert_set(&conn, pid, "/test/proj/v2.als", Some(2048));
        let entries = get_version_timeline(&conn, pid).unwrap();
        assert_eq!(entries.len(), 2);
        // Should have no notes by default
        assert!(entries[0].note.is_none());
        assert!(entries[0].note_id.is_none());
        // file_size should be populated
        assert!(entries.iter().any(|e| e.set.file_size == Some(1024)));
        assert!(entries.iter().any(|e| e.set.file_size == Some(2048)));
    }

    #[test]
    fn test_version_timeline_null_file_size() {
        let conn = test_db();
        let pid = insert_project(&conn, "Test", "/test/proj");
        insert_set(&conn, pid, "/test/proj/old.als", None);
        let entries = get_version_timeline(&conn, pid).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].set.file_size, None);
    }

    #[test]
    fn test_upsert_version_note_create() {
        let conn = test_db();
        let pid = insert_project(&conn, "Test", "/test/proj");
        let sid = insert_set(&conn, pid, "/test/proj/v1.als", None);
        let note = upsert_version_note(&conn, sid, pid, "First draft").unwrap();
        assert_eq!(note.note, "First draft");
        assert_eq!(note.set_id, sid);
        assert_eq!(note.project_id, pid);
    }

    #[test]
    fn test_upsert_version_note_update() {
        let conn = test_db();
        let pid = insert_project(&conn, "Test", "/test/proj");
        let sid = insert_set(&conn, pid, "/test/proj/v1.als", None);
        upsert_version_note(&conn, sid, pid, "Original").unwrap();
        let updated = upsert_version_note(&conn, sid, pid, "Updated note").unwrap();
        assert_eq!(updated.note, "Updated note");
        // Should still be only one version_note for this set
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM version_notes WHERE set_id = ?1", params![sid], |r| r.get(0)
        ).unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_version_timeline_shows_notes() {
        let conn = test_db();
        let pid = insert_project(&conn, "Test", "/test/proj");
        let s1 = insert_set(&conn, pid, "/test/proj/v1.als", None);
        let _s2 = insert_set(&conn, pid, "/test/proj/v2.als", None);
        upsert_version_note(&conn, s1, pid, "Annotated").unwrap();
        let entries = get_version_timeline(&conn, pid).unwrap();
        let annotated = entries.iter().find(|e| e.set.id == s1).unwrap();
        assert_eq!(annotated.note.as_deref(), Some("Annotated"));
        assert!(annotated.note_id.is_some());
        let unannotated = entries.iter().find(|e| e.set.id != s1).unwrap();
        assert!(unannotated.note.is_none());
    }

    #[test]
    fn test_delete_version_note() {
        let conn = test_db();
        let pid = insert_project(&conn, "Test", "/test/proj");
        let sid = insert_set(&conn, pid, "/test/proj/v1.als", None);
        upsert_version_note(&conn, sid, pid, "To be deleted").unwrap();
        delete_version_note(&conn, sid).unwrap();
        let entries = get_version_timeline(&conn, pid).unwrap();
        assert!(entries[0].note.is_none());
    }

    #[test]
    fn test_delete_version_note_nonexistent() {
        let conn = test_db();
        // Deleting a note that doesn't exist should succeed (no-op)
        let result = delete_version_note(&conn, 99999);
        assert!(result.is_ok());
    }

    // ========================================================================
    // Project Quick-Create
    // ========================================================================

    #[test]
    fn test_create_project() {
        let conn = test_db();
        let p = create_project(&conn, "My Track", "/music/My Track").unwrap();
        assert_eq!(p.name, "My Track");
        assert_eq!(p.project_path, "/music/My Track");
        assert_eq!(p.status, "Sketch"); // default
        assert!(!p.archived);
    }

    #[test]
    fn test_create_project_duplicate_path() {
        let conn = test_db();
        create_project(&conn, "Track A", "/music/track").unwrap();
        let result = create_project(&conn, "Track B", "/music/track");
        assert!(result.is_err(), "Duplicate project_path should fail (UNIQUE constraint)");
    }

    #[test]
    fn test_create_project_appears_in_get_projects() {
        let conn = test_db();
        create_project(&conn, "Searchable", "/music/searchable").unwrap();
        let filters = ProjectFilters {
            statuses: None, tag_ids: None, genres: None, in_rotation: None,
            min_rating: None, updated_since_days: None, search_query: None,
            show_archived: None, sort_by: None, sort_dir: None, collection_id: None,
        };
        let projects = get_projects(&conn, &filters).unwrap();
        assert!(projects.iter().any(|p| p.name == "Searchable"));
    }

    #[test]
    fn test_create_project_fts_indexed() {
        let conn = test_db();
        create_project(&conn, "UniqueFtsName", "/music/fts").unwrap();
        let filters = ProjectFilters {
            statuses: None, tag_ids: None, genres: None, in_rotation: None,
            min_rating: None, updated_since_days: None,
            search_query: Some("UniqueFtsName".to_string()),
            show_archived: None, sort_by: None, sort_dir: None, collection_id: None,
        };
        let projects = get_projects(&conn, &filters).unwrap();
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].name, "UniqueFtsName");
    }

    // ========================================================================
    // Collections — CRUD
    // ========================================================================

    #[test]
    fn test_create_manual_collection() {
        let conn = test_db();
        let col = create_collection(&conn, "Favorites", "manual", "").unwrap();
        assert_eq!(col.name, "Favorites");
        assert_eq!(col.collection_type, "manual");
        assert_eq!(col.project_count, 0);
    }

    #[test]
    fn test_create_smart_collection() {
        let conn = test_db();
        let col = create_collection(&conn, "Fast Tracks", "smart", "").unwrap();
        assert_eq!(col.collection_type, "smart");
    }

    #[test]
    fn test_get_all_collections_ordered() {
        let conn = test_db();
        create_collection(&conn, "Zebra", "manual", "").unwrap();
        create_collection(&conn, "Alpha", "manual", "").unwrap();
        let cols = get_all_collections(&conn).unwrap();
        assert_eq!(cols.len(), 2);
        // Ordered by sort_order (creation order), not alphabetical
        assert_eq!(cols[0].name, "Zebra");
        assert_eq!(cols[1].name, "Alpha");
    }

    #[test]
    fn test_update_collection() {
        let conn = test_db();
        let col = create_collection(&conn, "Old Name", "manual", "").unwrap();
        let updated = update_collection(&conn, col.id, Some("New Name"), Some("star")).unwrap();
        assert_eq!(updated.name, "New Name");
        assert_eq!(updated.icon, "star");
    }

    #[test]
    fn test_update_collection_partial() {
        let conn = test_db();
        let col = create_collection(&conn, "Name", "manual", "icon").unwrap();
        let updated = update_collection(&conn, col.id, None, Some("new_icon")).unwrap();
        assert_eq!(updated.name, "Name"); // unchanged
        assert_eq!(updated.icon, "new_icon");
    }

    #[test]
    fn test_delete_collection() {
        let conn = test_db();
        let col = create_collection(&conn, "Temp", "manual", "").unwrap();
        delete_collection(&conn, col.id).unwrap();
        let cols = get_all_collections(&conn).unwrap();
        assert!(cols.is_empty());
    }

    #[test]
    fn test_delete_collection_cascades_membership() {
        let conn = test_db();
        let pid = insert_project(&conn, "Track", "/track");
        let col = create_collection(&conn, "Col", "manual", "").unwrap();
        add_project_to_collection(&conn, col.id, pid).unwrap();
        delete_collection(&conn, col.id).unwrap();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM collection_projects", [], |r| r.get(0)
        ).unwrap();
        assert_eq!(count, 0, "Cascade should delete membership rows");
    }

    #[test]
    fn test_delete_collection_cascades_rules() {
        let conn = test_db();
        let col = create_collection(&conn, "Smart", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "bpm".into(), operator: "gt".into(), value: "120".into() },
        ]).unwrap();
        delete_collection(&conn, col.id).unwrap();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM smart_collection_rules", [], |r| r.get(0)
        ).unwrap();
        assert_eq!(count, 0, "Cascade should delete rule rows");
    }

    #[test]
    fn test_reorder_collections() {
        let conn = test_db();
        let c1 = create_collection(&conn, "First", "manual", "").unwrap();
        let c2 = create_collection(&conn, "Second", "manual", "").unwrap();
        let c3 = create_collection(&conn, "Third", "manual", "").unwrap();
        // Reverse order
        reorder_collections(&conn, &[c3.id, c1.id, c2.id]).unwrap();
        let cols = get_all_collections(&conn).unwrap();
        assert_eq!(cols[0].name, "Third");
        assert_eq!(cols[1].name, "First");
        assert_eq!(cols[2].name, "Second");
    }

    // ========================================================================
    // Collections — Manual membership
    // ========================================================================

    #[test]
    fn test_add_project_to_collection() {
        let conn = test_db();
        let pid = insert_project(&conn, "Track", "/track");
        let col = create_collection(&conn, "Faves", "manual", "").unwrap();
        add_project_to_collection(&conn, col.id, pid).unwrap();
        let ids = get_collection_project_ids(&conn, col.id).unwrap();
        assert_eq!(ids, vec![pid]);
    }

    #[test]
    fn test_add_project_to_collection_updates_count() {
        let conn = test_db();
        let p1 = insert_project(&conn, "A", "/a");
        let p2 = insert_project(&conn, "B", "/b");
        let col = create_collection(&conn, "Mix", "manual", "").unwrap();
        add_project_to_collection(&conn, col.id, p1).unwrap();
        add_project_to_collection(&conn, col.id, p2).unwrap();
        let cols = get_all_collections(&conn).unwrap();
        assert_eq!(cols[0].project_count, 2);
    }

    #[test]
    fn test_add_duplicate_project_to_collection_is_noop() {
        let conn = test_db();
        let pid = insert_project(&conn, "Track", "/track");
        let col = create_collection(&conn, "Col", "manual", "").unwrap();
        add_project_to_collection(&conn, col.id, pid).unwrap();
        add_project_to_collection(&conn, col.id, pid).unwrap(); // INSERT OR IGNORE
        let ids = get_collection_project_ids(&conn, col.id).unwrap();
        assert_eq!(ids.len(), 1);
    }

    #[test]
    fn test_remove_project_from_collection() {
        let conn = test_db();
        let pid = insert_project(&conn, "Track", "/track");
        let col = create_collection(&conn, "Col", "manual", "").unwrap();
        add_project_to_collection(&conn, col.id, pid).unwrap();
        remove_project_from_collection(&conn, col.id, pid).unwrap();
        let ids = get_collection_project_ids(&conn, col.id).unwrap();
        assert!(ids.is_empty());
    }

    #[test]
    fn test_remove_nonexistent_from_collection() {
        let conn = test_db();
        let col = create_collection(&conn, "Col", "manual", "").unwrap();
        // Should not error when removing a project that's not in the collection
        let result = remove_project_from_collection(&conn, col.id, 99999);
        assert!(result.is_ok());
    }

    #[test]
    fn test_reorder_collection_projects() {
        let conn = test_db();
        let p1 = insert_project(&conn, "A", "/a");
        let p2 = insert_project(&conn, "B", "/b");
        let p3 = insert_project(&conn, "C", "/c");
        let col = create_collection(&conn, "Col", "manual", "").unwrap();
        add_project_to_collection(&conn, col.id, p1).unwrap();
        add_project_to_collection(&conn, col.id, p2).unwrap();
        add_project_to_collection(&conn, col.id, p3).unwrap();
        // Reverse order
        reorder_collection_projects(&conn, col.id, &[p3, p1, p2]).unwrap();
        let ids = get_collection_project_ids(&conn, col.id).unwrap();
        assert_eq!(ids, vec![p3, p1, p2]);
    }

    // ========================================================================
    // Smart Collection Rules
    // ========================================================================

    #[test]
    fn test_set_and_get_smart_rules() {
        let conn = test_db();
        let col = create_collection(&conn, "Smart", "smart", "").unwrap();
        let rules = set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "bpm".into(), operator: "gt".into(), value: "120".into() },
            SmartCollectionRuleInput { field: "status".into(), operator: "is".into(), value: "Mix".into() },
        ]).unwrap();
        assert_eq!(rules.len(), 2);
        assert_eq!(rules[0].field, "bpm");
        assert_eq!(rules[0].sort_order, 0);
        assert_eq!(rules[1].field, "status");
        assert_eq!(rules[1].sort_order, 1);
    }

    #[test]
    fn test_set_smart_rules_replaces_existing() {
        let conn = test_db();
        let col = create_collection(&conn, "Smart", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "bpm".into(), operator: "gt".into(), value: "120".into() },
        ]).unwrap();
        // Replace with different rules
        let rules = set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "rating".into(), operator: "gte".into(), value: "4".into() },
        ]).unwrap();
        assert_eq!(rules.len(), 1);
        assert_eq!(rules[0].field, "rating");
    }

    #[test]
    fn test_set_smart_rules_empty_clears() {
        let conn = test_db();
        let col = create_collection(&conn, "Smart", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "bpm".into(), operator: "gt".into(), value: "120".into() },
        ]).unwrap();
        let rules = set_smart_collection_rules(&conn, col.id, &[]).unwrap();
        assert!(rules.is_empty());
    }

    // ========================================================================
    // Smart Collection Evaluation
    // ========================================================================

    #[test]
    fn test_evaluate_smart_bpm_gt() {
        let conn = test_db();
        let p1 = insert_project_with(&conn, "Fast", "/fast", Some(140.0), "", "Sketch", None);
        let _p2 = insert_project_with(&conn, "Slow", "/slow", Some(80.0), "", "Sketch", None);
        let col = create_collection(&conn, "Fast", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "bpm".into(), operator: "gt".into(), value: "120".into() },
        ]).unwrap();
        let ids = evaluate_smart_collection(&conn, col.id).unwrap();
        assert_eq!(ids, vec![p1]);
    }

    #[test]
    fn test_evaluate_smart_bpm_between() {
        let conn = test_db();
        let _p1 = insert_project_with(&conn, "Low", "/low", Some(80.0), "", "Sketch", None);
        let p2 = insert_project_with(&conn, "Mid", "/mid", Some(128.0), "", "Sketch", None);
        let _p3 = insert_project_with(&conn, "High", "/high", Some(175.0), "", "Sketch", None);
        let col = create_collection(&conn, "Mid Range", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "bpm".into(), operator: "between".into(), value: "[120,140]".into() },
        ]).unwrap();
        let ids = evaluate_smart_collection(&conn, col.id).unwrap();
        assert_eq!(ids, vec![p2]);
    }

    #[test]
    fn test_evaluate_smart_status_is() {
        let conn = test_db();
        let p1 = insert_project_with(&conn, "Mixing", "/mix", None, "", "Mix", None);
        let _p2 = insert_project_with(&conn, "Writing", "/write", None, "", "Write", None);
        let col = create_collection(&conn, "In Mix", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "status".into(), operator: "is".into(), value: "Mix".into() },
        ]).unwrap();
        let ids = evaluate_smart_collection(&conn, col.id).unwrap();
        assert_eq!(ids, vec![p1]);
    }

    #[test]
    fn test_evaluate_smart_status_is_not() {
        let conn = test_db();
        let _p1 = insert_project_with(&conn, "Done1", "/done1", None, "", "Done", None);
        let p2 = insert_project_with(&conn, "Mixing", "/mix", None, "", "Mix", None);
        let col = create_collection(&conn, "Not Done", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "status".into(), operator: "is_not".into(), value: "Done".into() },
        ]).unwrap();
        let ids = evaluate_smart_collection(&conn, col.id).unwrap();
        assert_eq!(ids, vec![p2]);
    }

    #[test]
    fn test_evaluate_smart_genre_is() {
        let conn = test_db();
        let p1 = insert_project_with(&conn, "Tech", "/tech", None, "Techno", "Sketch", None);
        let _p2 = insert_project_with(&conn, "House", "/house", None, "House", "Sketch", None);
        let col = create_collection(&conn, "Techno", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "genre".into(), operator: "is".into(), value: "Techno".into() },
        ]).unwrap();
        let ids = evaluate_smart_collection(&conn, col.id).unwrap();
        assert_eq!(ids, vec![p1]);
    }

    #[test]
    fn test_evaluate_smart_tag_has() {
        let conn = test_db();
        let p1 = insert_project(&conn, "Tagged", "/tagged");
        let _p2 = insert_project(&conn, "Untagged", "/untagged");
        let tag = create_tag(&conn, "favorite").unwrap();
        add_tag_to_project(&conn, p1, tag.id).unwrap();
        let col = create_collection(&conn, "Faves", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "tag".into(), operator: "has".into(), value: "favorite".into() },
        ]).unwrap();
        let ids = evaluate_smart_collection(&conn, col.id).unwrap();
        assert_eq!(ids, vec![p1]);
    }

    #[test]
    fn test_evaluate_smart_tag_has_not() {
        let conn = test_db();
        let _p1 = insert_project(&conn, "Tagged", "/tagged");
        let p2 = insert_project(&conn, "Untagged", "/untagged");
        let tag = create_tag(&conn, "wip").unwrap();
        add_tag_to_project(&conn, _p1, tag.id).unwrap();
        let col = create_collection(&conn, "Not WIP", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "tag".into(), operator: "has_not".into(), value: "wip".into() },
        ]).unwrap();
        let ids = evaluate_smart_collection(&conn, col.id).unwrap();
        assert_eq!(ids, vec![p2]);
    }

    #[test]
    fn test_evaluate_smart_in_rotation() {
        let conn = test_db();
        let p1 = insert_project(&conn, "Active", "/active");
        conn.execute("UPDATE projects SET in_rotation = 1 WHERE id = ?1", params![p1]).unwrap();
        let _p2 = insert_project(&conn, "Inactive", "/inactive");
        let col = create_collection(&conn, "Rotation", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "in_rotation".into(), operator: "is".into(), value: "true".into() },
        ]).unwrap();
        let ids = evaluate_smart_collection(&conn, col.id).unwrap();
        assert_eq!(ids, vec![p1]);
    }

    #[test]
    fn test_evaluate_smart_rating_gte() {
        let conn = test_db();
        let p1 = insert_project_with(&conn, "Good", "/good", None, "", "Sketch", Some(4));
        let p2 = insert_project_with(&conn, "Great", "/great", None, "", "Sketch", Some(5));
        let _p3 = insert_project_with(&conn, "Meh", "/meh", None, "", "Sketch", Some(2));
        let col = create_collection(&conn, "Top Rated", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "rating".into(), operator: "gte".into(), value: "4".into() },
        ]).unwrap();
        let mut ids = evaluate_smart_collection(&conn, col.id).unwrap();
        ids.sort();
        assert_eq!(ids, vec![p1, p2]);
    }

    #[test]
    fn test_evaluate_smart_combined_and_logic() {
        let conn = test_db();
        let _p1 = insert_project_with(&conn, "Fast Techno", "/ft", Some(140.0), "Techno", "Sketch", None);
        let _p2 = insert_project_with(&conn, "Fast House", "/fh", Some(130.0), "House", "Sketch", None);
        let p3 = insert_project_with(&conn, "Slow Techno", "/st", Some(100.0), "Techno", "Sketch", None);
        let _ = p3; // p3 doesn't match (BPM too low)
        let col = create_collection(&conn, "Fast + Techno", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "bpm".into(), operator: "gt".into(), value: "120".into() },
            SmartCollectionRuleInput { field: "genre".into(), operator: "is".into(), value: "Techno".into() },
        ]).unwrap();
        let ids = evaluate_smart_collection(&conn, col.id).unwrap();
        assert_eq!(ids, vec![_p1], "Only Fast Techno matches both rules");
    }

    #[test]
    fn test_evaluate_smart_no_rules_returns_empty() {
        let conn = test_db();
        insert_project(&conn, "Track", "/track");
        let col = create_collection(&conn, "Empty Rules", "smart", "").unwrap();
        let ids = evaluate_smart_collection(&conn, col.id).unwrap();
        assert!(ids.is_empty());
    }

    #[test]
    fn test_evaluate_smart_excludes_archived() {
        let conn = test_db();
        let p1 = insert_project_with(&conn, "Active", "/active", Some(140.0), "", "Sketch", None);
        let p2 = insert_project_with(&conn, "Archived", "/archived", Some(140.0), "", "Sketch", None);
        conn.execute("UPDATE projects SET archived = 1 WHERE id = ?1", params![p2]).unwrap();
        let col = create_collection(&conn, "Fast", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "bpm".into(), operator: "gt".into(), value: "120".into() },
        ]).unwrap();
        let ids = evaluate_smart_collection(&conn, col.id).unwrap();
        assert_eq!(ids, vec![p1], "Archived projects should be excluded");
    }

    #[test]
    fn test_evaluate_smart_unknown_field_ignored() {
        let conn = test_db();
        insert_project(&conn, "Track", "/track");
        let col = create_collection(&conn, "Bad", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "nonexistent".into(), operator: "eq".into(), value: "x".into() },
        ]).unwrap();
        // Should return empty (unknown rule → no conditions → empty)
        let ids = evaluate_smart_collection(&conn, col.id).unwrap();
        assert!(ids.is_empty());
    }

    // ========================================================================
    // get_projects with collection_id filter
    // ========================================================================

    #[test]
    fn test_get_projects_by_manual_collection() {
        let conn = test_db();
        let p1 = insert_project(&conn, "In Col", "/incol");
        let _p2 = insert_project(&conn, "Not In Col", "/notincol");
        let col = create_collection(&conn, "Subset", "manual", "").unwrap();
        add_project_to_collection(&conn, col.id, p1).unwrap();
        let filters = ProjectFilters {
            statuses: None, tag_ids: None, genres: None, in_rotation: None,
            min_rating: None, updated_since_days: None, search_query: None,
            show_archived: None, sort_by: None, sort_dir: None,
            collection_id: Some(col.id),
        };
        let projects = get_projects(&conn, &filters).unwrap();
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].name, "In Col");
    }

    #[test]
    fn test_get_projects_by_smart_collection() {
        let conn = test_db();
        let p1 = insert_project_with(&conn, "Fast", "/fast", Some(140.0), "", "Sketch", None);
        let _p2 = insert_project_with(&conn, "Slow", "/slow", Some(80.0), "", "Sketch", None);
        let col = create_collection(&conn, "BPM > 120", "smart", "").unwrap();
        set_smart_collection_rules(&conn, col.id, &[
            SmartCollectionRuleInput { field: "bpm".into(), operator: "gt".into(), value: "120".into() },
        ]).unwrap();
        let filters = ProjectFilters {
            statuses: None, tag_ids: None, genres: None, in_rotation: None,
            min_rating: None, updated_since_days: None, search_query: None,
            show_archived: None, sort_by: None, sort_dir: None,
            collection_id: Some(col.id),
        };
        let projects = get_projects(&conn, &filters).unwrap();
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].id, p1);
    }

    #[test]
    fn test_get_projects_empty_manual_collection() {
        let conn = test_db();
        insert_project(&conn, "Track", "/track");
        let col = create_collection(&conn, "Empty", "manual", "").unwrap();
        let filters = ProjectFilters {
            statuses: None, tag_ids: None, genres: None, in_rotation: None,
            min_rating: None, updated_since_days: None, search_query: None,
            show_archived: None, sort_by: None, sort_dir: None,
            collection_id: Some(col.id),
        };
        let projects = get_projects(&conn, &filters).unwrap();
        assert!(projects.is_empty());
    }

    // ========================================================================
    // Bulk Operations
    // ========================================================================

    #[test]
    fn test_bulk_add_tag() {
        let conn = test_db();
        let p1 = insert_project(&conn, "A", "/a");
        let p2 = insert_project(&conn, "B", "/b");
        let p3 = insert_project(&conn, "C", "/c");
        let tag = create_tag(&conn, "batch_tag").unwrap();
        bulk_add_tag(&conn, &[p1, p2, p3], tag.id).unwrap();
        for pid in [p1, p2, p3] {
            let tags = get_tags_for_project(&conn, pid).unwrap();
            assert!(tags.iter().any(|t| t.name == "batch_tag"), "Project {} should have tag", pid);
        }
    }

    #[test]
    fn test_bulk_remove_tag() {
        let conn = test_db();
        let p1 = insert_project(&conn, "A", "/a");
        let p2 = insert_project(&conn, "B", "/b");
        let tag = create_tag(&conn, "to_remove").unwrap();
        bulk_add_tag(&conn, &[p1, p2], tag.id).unwrap();
        bulk_remove_tag(&conn, &[p1, p2], tag.id).unwrap();
        for pid in [p1, p2] {
            let tags = get_tags_for_project(&conn, pid).unwrap();
            assert!(tags.is_empty());
        }
    }

    #[test]
    fn test_bulk_archive() {
        let conn = test_db();
        let p1 = insert_project(&conn, "A", "/a");
        let p2 = insert_project(&conn, "B", "/b");
        bulk_archive(&conn, &[p1, p2], true).unwrap();
        let a = get_project_by_id(&conn, p1).unwrap();
        let b = get_project_by_id(&conn, p2).unwrap();
        assert!(a.archived);
        assert!(b.archived);
    }

    #[test]
    fn test_bulk_unarchive() {
        let conn = test_db();
        let p1 = insert_project(&conn, "A", "/a");
        bulk_archive(&conn, &[p1], true).unwrap();
        bulk_archive(&conn, &[p1], false).unwrap();
        let p = get_project_by_id(&conn, p1).unwrap();
        assert!(!p.archived);
    }

    #[test]
    fn test_bulk_set_genre() {
        let conn = test_db();
        let p1 = insert_project(&conn, "A", "/a");
        let p2 = insert_project(&conn, "B", "/b");
        bulk_set_genre(&conn, &[p1, p2], "Techno").unwrap();
        assert_eq!(get_project_by_id(&conn, p1).unwrap().genre_label, "Techno");
        assert_eq!(get_project_by_id(&conn, p2).unwrap().genre_label, "Techno");
    }

    #[test]
    fn test_bulk_add_to_collection() {
        let conn = test_db();
        let p1 = insert_project(&conn, "A", "/a");
        let p2 = insert_project(&conn, "B", "/b");
        let col = create_collection(&conn, "Col", "manual", "").unwrap();
        bulk_add_to_collection(&conn, &[p1, p2], col.id).unwrap();
        let ids = get_collection_project_ids(&conn, col.id).unwrap();
        assert_eq!(ids.len(), 2);
    }

    #[test]
    fn test_bulk_operations_with_empty_list() {
        let conn = test_db();
        let tag = create_tag(&conn, "x").unwrap();
        let col = create_collection(&conn, "C", "manual", "").unwrap();
        // All should succeed as no-ops
        assert!(bulk_add_tag(&conn, &[], tag.id).is_ok());
        assert!(bulk_remove_tag(&conn, &[], tag.id).is_ok());
        assert!(bulk_archive(&conn, &[], true).is_ok());
        assert!(bulk_set_genre(&conn, &[], "X").is_ok());
        assert!(bulk_add_to_collection(&conn, &[], col.id).is_ok());
    }

    // ========================================================================
    // Library Health
    // ========================================================================

    #[test]
    fn test_library_health_empty() {
        let conn = test_db();
        let health = get_library_health(&conn, 30).unwrap();
        assert_eq!(health.total_projects, 0);
        assert_eq!(health.total_als_files, 0);
        assert_eq!(health.total_bounces, 0);
        assert_eq!(health.total_disk_size_bytes, 0);
        assert_eq!(health.missing_deps_count, 0);
        assert_eq!(health.stale_projects_count, 0);
        assert!(health.status_breakdown.is_empty());
        assert!(health.genre_breakdown.is_empty());
    }

    #[test]
    fn test_library_health_counts() {
        let conn = test_db();
        let p1 = insert_project_with(&conn, "Track 1", "/t1", Some(128.0), "Techno", "Mix", None);
        let p2 = insert_project_with(&conn, "Track 2", "/t2", Some(140.0), "Techno", "Sketch", None);
        let _p3 = insert_project_with(&conn, "Track 3", "/t3", None, "House", "Sketch", None);
        insert_set(&conn, p1, "/t1/v1.als", Some(5000));
        insert_set(&conn, p1, "/t1/v2.als", Some(8000));
        insert_set(&conn, p2, "/t2/v1.als", Some(3000));
        insert_bounce(&conn, p1, "/t1/bounce1.wav");
        insert_bounce(&conn, p1, "/t1/bounce2.wav");

        let health = get_library_health(&conn, 30).unwrap();
        assert_eq!(health.total_projects, 3);
        assert_eq!(health.total_als_files, 3);
        assert_eq!(health.total_bounces, 2);
        assert_eq!(health.total_disk_size_bytes, 16000);
    }

    #[test]
    fn test_library_health_excludes_archived() {
        let conn = test_db();
        let p1 = insert_project(&conn, "Active", "/active");
        let p2 = insert_project(&conn, "Archived", "/archived");
        conn.execute("UPDATE projects SET archived = 1 WHERE id = ?1", params![p2]).unwrap();
        let _ = p1;

        let health = get_library_health(&conn, 30).unwrap();
        assert_eq!(health.total_projects, 1);
    }

    #[test]
    fn test_library_health_status_breakdown() {
        let conn = test_db();
        insert_project_with(&conn, "A", "/a", None, "", "Mix", None);
        insert_project_with(&conn, "B", "/b", None, "", "Mix", None);
        insert_project_with(&conn, "C", "/c", None, "", "Sketch", None);
        let health = get_library_health(&conn, 30).unwrap();
        let mix_count = health.status_breakdown.iter().find(|s| s.status == "Mix").map(|s| s.count);
        let sketch_count = health.status_breakdown.iter().find(|s| s.status == "Sketch").map(|s| s.count);
        assert_eq!(mix_count, Some(2));
        assert_eq!(sketch_count, Some(1));
    }

    #[test]
    fn test_library_health_genre_breakdown() {
        let conn = test_db();
        insert_project_with(&conn, "A", "/a", None, "Techno", "Sketch", None);
        insert_project_with(&conn, "B", "/b", None, "Techno", "Sketch", None);
        insert_project_with(&conn, "C", "/c", None, "House", "Sketch", None);
        insert_project_with(&conn, "D", "/d", None, "", "Sketch", None); // no genre — excluded
        let health = get_library_health(&conn, 30).unwrap();
        assert_eq!(health.genre_breakdown.len(), 2);
        let techno = health.genre_breakdown.iter().find(|g| g.genre == "Techno").unwrap();
        assert_eq!(techno.count, 2);
    }

    #[test]
    fn test_library_health_missing_deps() {
        let conn = test_db();
        let p1 = insert_project(&conn, "Broken", "/broken");
        conn.execute("UPDATE projects SET has_missing_deps = 1 WHERE id = ?1", params![p1]).unwrap();
        insert_project(&conn, "Fine", "/fine");
        let health = get_library_health(&conn, 30).unwrap();
        assert_eq!(health.missing_deps_count, 1);
    }

    #[test]
    fn test_library_health_stale_threshold() {
        let conn = test_db();
        let p1 = insert_project(&conn, "Recent", "/recent");
        conn.execute(
            "UPDATE projects SET last_worked_on = datetime('now') WHERE id = ?1", params![p1]
        ).unwrap();
        let p2 = insert_project(&conn, "Old", "/old");
        conn.execute(
            "UPDATE projects SET last_worked_on = datetime('now', '-60 days') WHERE id = ?1", params![p2]
        ).unwrap();

        let health_30 = get_library_health(&conn, 30).unwrap();
        assert_eq!(health_30.stale_projects_count, 1);

        let health_90 = get_library_health(&conn, 90).unwrap();
        assert_eq!(health_90.stale_projects_count, 0);
    }

    #[test]
    fn test_library_health_null_file_size_not_counted() {
        let conn = test_db();
        let pid = insert_project(&conn, "Track", "/track");
        insert_set(&conn, pid, "/track/v1.als", None);  // NULL file_size
        insert_set(&conn, pid, "/track/v2.als", Some(1000));
        let health = get_library_health(&conn, 30).unwrap();
        assert_eq!(health.total_disk_size_bytes, 1000, "NULL file_size should not be counted");
        assert_eq!(health.total_als_files, 2);
    }
}
