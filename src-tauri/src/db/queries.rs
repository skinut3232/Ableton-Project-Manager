use rusqlite::{params, Connection};
use crate::db::models::*;

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
    Ok(())
}

pub fn get_projects(conn: &Connection, filters: &ProjectFilters) -> Result<Vec<Project>, String> {
    let mut sql = String::from(
        "SELECT p.id, p.name, p.project_path, p.genre_label, p.status, p.rating, p.bpm, \
         p.in_rotation, p.notes, p.artwork_path, p.current_set_path, p.archived, p.missing, \
         p.last_worked_on, p.created_at, p.updated_at FROM projects p"
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
        Some("genre_label") => format!("p.genre_label {} NULLS LAST, p.name ASC", dir),
        Some("created_at") => format!("p.created_at {} NULLS LAST", dir),
        Some("updated_at") => format!("p.updated_at {} NULLS LAST", dir),
        Some("in_rotation") => format!("p.in_rotation {}, p.name ASC", dir),
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
                status: row.get(4)?,
                rating: row.get(5)?,
                bpm: row.get(6)?,
                in_rotation: row.get::<_, i64>(7)? != 0,
                notes: row.get(8)?,
                artwork_path: row.get(9)?,
                current_set_path: row.get(10)?,
                archived: row.get::<_, i64>(11)? != 0,
                missing: row.get::<_, i64>(12)? != 0,
                last_worked_on: row.get(13)?,
                created_at: row.get(14)?,
                updated_at: row.get(15)?,
                tags: Vec::new(),
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
        "SELECT id, name, project_path, genre_label, status, rating, bpm, \
         in_rotation, notes, artwork_path, current_set_path, archived, missing, \
         last_worked_on, created_at, updated_at FROM projects WHERE id = ?1",
        params![id],
        |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                project_path: row.get(2)?,
                genre_label: row.get(3)?,
                status: row.get(4)?,
                rating: row.get(5)?,
                bpm: row.get(6)?,
                in_rotation: row.get::<_, i64>(7)? != 0,
                notes: row.get(8)?,
                artwork_path: row.get(9)?,
                current_set_path: row.get(10)?,
                archived: row.get::<_, i64>(11)? != 0,
                missing: row.get::<_, i64>(12)? != 0,
                last_worked_on: row.get(13)?,
                created_at: row.get(14)?,
                updated_at: row.get(15)?,
                tags: Vec::new(),
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

pub fn update_project(conn: &Connection, id: i64, status: Option<String>, rating: Option<i64>, bpm: Option<f64>, in_rotation: Option<bool>, notes: Option<String>, genre_label: Option<String>, archived: Option<bool>) -> Result<Project, String> {
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
    if let Some(a) = archived {
        conn.execute("UPDATE projects SET archived = ?1, updated_at = datetime('now') WHERE id = ?2", params![a as i64, id])
            .map_err(|e| e.to_string())?;
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
    Ok(tag)
}

pub fn add_tag_to_project(conn: &Connection, project_id: i64, tag_id: i64) -> Result<(), String> {
    conn.execute(
        "INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?1, ?2)",
        params![project_id, tag_id],
    ).map_err(|e| e.to_string())?;
    rebuild_fts_tags(conn, project_id)?;
    Ok(())
}

pub fn remove_tag_from_project(conn: &Connection, project_id: i64, tag_id: i64) -> Result<(), String> {
    conn.execute(
        "DELETE FROM project_tags WHERE project_id = ?1 AND tag_id = ?2",
        params![project_id, tag_id],
    ).map_err(|e| e.to_string())?;
    rebuild_fts_tags(conn, project_id)?;
    Ok(())
}

pub fn rebuild_fts_tags(conn: &Connection, project_id: i64) -> Result<(), String> {
    let tags = get_tags_for_project(conn, project_id)?;
    let tags_text = tags.iter().map(|t| t.name.as_str()).collect::<Vec<_>>().join(" ");

    // Get current project data
    let project = get_project_by_id(conn, project_id)?;

    // Delete old FTS entry
    conn.execute(
        "INSERT INTO projects_fts(projects_fts, rowid, name, genre_label, notes, tags_text) VALUES ('delete', ?1, ?2, ?3, ?4, ?5)",
        params![project_id, project.name, project.genre_label, project.notes, ""],
    ).map_err(|e| format!("FTS delete failed: {}", e))?;

    // Reinsert with updated tags
    conn.execute(
        "INSERT INTO projects_fts(rowid, name, genre_label, notes, tags_text) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![project_id, project.name, project.genre_label, project.notes, tags_text],
    ).map_err(|e| format!("FTS insert failed: {}", e))?;

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
    Ok(())
}

pub fn set_artwork_path(conn: &Connection, project_id: i64, artwork_path: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE projects SET artwork_path = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![artwork_path, project_id],
    ).map_err(|e| e.to_string())?;
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
