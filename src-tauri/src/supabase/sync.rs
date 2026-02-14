// Sync engine: push dirty local records to Supabase, pull remote changes.

use rusqlite::{params, Connection};
use serde_json::{json, Value};
use crate::supabase::SupabaseClient;
use crate::supabase::api;

/// Tables in sync order (respects foreign key dependencies).
/// Parents first, children after.
const SYNC_ORDER: &[&str] = &[
    "tags",
    "projects",
    "bounces",
    "ableton_sets",
    "sessions",
    "markers",
    "tasks",
    "project_notes",
    "project_references",
    "spotify_references",
    "assets",
    "mood_board",
];

// ============================================================================
// PUSH — payload builders (used by commands/sync.rs inline functions)
// ============================================================================

/// Build a JSON payload for pushing a record to Supabase.
/// Maps local column names/types to what Supabase expects.
/// Public so migration.rs can reuse it.
pub fn build_push_payload(
    conn: &Connection,
    table: &str,
    local_id: i64,
    user_id: &str,
) -> Result<Value, String> {
    match table {
        "projects" => build_project_payload(conn, local_id, user_id),
        "tags" => build_tag_payload(conn, local_id, user_id),
        "bounces" => build_child_payload(conn, "bounces", local_id,
            &["bounce_path", "modified_time", "duration_seconds", "mp3_url"]),
        "ableton_sets" => build_child_payload(conn, "ableton_sets", local_id,
            &["set_path", "modified_time"]),
        "sessions" => build_child_payload(conn, "sessions", local_id,
            &["started_at", "ended_at", "duration_seconds", "note"]),
        "markers" => build_markers_payload(conn, local_id),
        "tasks" => build_tasks_payload(conn, local_id),
        "project_notes" => build_child_payload(conn, "project_notes", local_id,
            &["content", "created_at", "updated_at"]),
        "project_references" => build_child_payload(conn, "project_references", local_id,
            &["url", "title", "notes", "created_at", "updated_at"]),
        "spotify_references" => build_spotify_payload(conn, local_id),
        "assets" => build_child_payload(conn, "assets", local_id,
            &["original_filename", "stored_path", "asset_type", "tags", "created_at", "updated_at"]),
        "mood_board" => build_mood_board_payload(conn, local_id),
        _ => Err(format!("Unknown table: {}", table)),
    }
}

fn build_project_payload(conn: &Connection, local_id: i64, user_id: &str) -> Result<Value, String> {
    let row = conn.query_row(
        "SELECT name, project_path, genre_label, musical_key, status, rating, bpm, \
         in_rotation, notes, artwork_path, current_set_path, archived, missing, progress, \
         last_worked_on, created_at, updated_at, cover_type, cover_locked, cover_seed, \
         cover_style_preset, cover_updated_at, cover_url FROM projects WHERE id = ?1",
        params![local_id],
        |row| {
            Ok(json!({
                "user_id": user_id,
                "name": row.get::<_, String>(0)?,
                "project_path": row.get::<_, String>(1)?,
                "genre_label": row.get::<_, String>(2)?,
                "musical_key": row.get::<_, String>(3)?,
                "status": row.get::<_, String>(4)?,
                "rating": row.get::<_, Option<i64>>(5)?,
                "bpm": row.get::<_, Option<f64>>(6)?,
                "in_rotation": row.get::<_, i64>(7)? != 0,
                "notes": row.get::<_, String>(8)?,
                "artwork_path": row.get::<_, Option<String>>(9)?,
                "current_set_path": row.get::<_, Option<String>>(10)?,
                "archived": row.get::<_, i64>(11)? != 0,
                "missing": row.get::<_, i64>(12)? != 0,
                "progress": row.get::<_, Option<i64>>(13)?,
                "last_worked_on": row.get::<_, Option<String>>(14)?,
                "created_at": row.get::<_, String>(15)?,
                "updated_at": row.get::<_, String>(16)?,
                "cover_type": row.get::<_, String>(17)?,
                "cover_locked": row.get::<_, i64>(18)? != 0,
                "cover_seed": row.get::<_, Option<String>>(19)?,
                "cover_style_preset": row.get::<_, String>(20)?,
                "cover_updated_at": row.get::<_, Option<String>>(21)?,
                "cover_url": row.get::<_, Option<String>>(22)?,
            }))
        },
    ).map_err(|e| format!("Failed to read project {}: {}", local_id, e))?;
    Ok(row)
}

fn build_tag_payload(conn: &Connection, local_id: i64, user_id: &str) -> Result<Value, String> {
    let row = conn.query_row(
        "SELECT name FROM tags WHERE id = ?1",
        params![local_id],
        |row| {
            Ok(json!({
                "user_id": user_id,
                "name": row.get::<_, String>(0)?,
            }))
        },
    ).map_err(|e| format!("Failed to read tag {}: {}", local_id, e))?;
    Ok(row)
}

/// Generic builder for child tables that have a project_id foreign key.
fn build_child_payload(
    conn: &Connection,
    table: &str,
    local_id: i64,
    columns: &[&str],
) -> Result<Value, String> {
    // Get project_id and its remote_id
    let (project_id,): (i64,) = conn.query_row(
        &format!("SELECT project_id FROM {} WHERE id = ?1", table),
        params![local_id],
        |row| Ok((row.get(0)?,)),
    ).map_err(|e| e.to_string())?;

    let remote_project_id: Option<i64> = conn.query_row(
        "SELECT remote_id FROM projects WHERE id = ?1",
        params![project_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let remote_project_id = remote_project_id
        .ok_or_else(|| format!("Project {} has no remote_id — must sync project first", project_id))?;

    // Build column list for query
    let col_list = columns.join(", ");
    let query = format!("SELECT {} FROM {} WHERE id = ?1", col_list, table);

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let mut payload = serde_json::Map::new();
    payload.insert("project_id".to_string(), json!(remote_project_id));

    stmt.query_row(params![local_id], |row| {
        for (i, col) in columns.iter().enumerate() {
            // Try to get as different types
            if let Ok(v) = row.get::<_, Option<f64>>(i) {
                payload.insert(col.to_string(), json!(v));
            } else if let Ok(v) = row.get::<_, Option<i64>>(i) {
                payload.insert(col.to_string(), json!(v));
            } else if let Ok(v) = row.get::<_, Option<String>>(i) {
                payload.insert(col.to_string(), json!(v));
            }
        }
        Ok(())
    }).map_err(|e| e.to_string())?;

    Ok(Value::Object(payload))
}

fn build_markers_payload(conn: &Connection, local_id: i64) -> Result<Value, String> {
    let row = conn.query_row(
        "SELECT project_id, bounce_id, timestamp_seconds, type, text, created_at, updated_at \
         FROM markers WHERE id = ?1",
        params![local_id],
        |row| {
            let project_id: i64 = row.get(0)?;
            let bounce_id: Option<i64> = row.get(1)?;
            Ok((project_id, bounce_id, json!({
                "timestamp_seconds": row.get::<_, f64>(2)?,
                "type": row.get::<_, String>(3)?,
                "text": row.get::<_, String>(4)?,
                "created_at": row.get::<_, String>(5)?,
                "updated_at": row.get::<_, String>(6)?,
            })))
        },
    ).map_err(|e| e.to_string())?;

    let (project_id, bounce_id, mut payload) = row;

    // Resolve remote project_id
    let remote_project_id = get_remote_id(conn, "projects", project_id)?
        .ok_or_else(|| format!("Project {} has no remote_id", project_id))?;
    payload["project_id"] = json!(remote_project_id);

    // Resolve remote bounce_id if present
    if let Some(bid) = bounce_id {
        if let Some(remote_bid) = get_remote_id(conn, "bounces", bid)? {
            payload["bounce_id"] = json!(remote_bid);
        }
    }

    Ok(payload)
}

fn build_tasks_payload(conn: &Connection, local_id: i64) -> Result<Value, String> {
    let row = conn.query_row(
        "SELECT project_id, title, done, category, linked_marker_id, \
         linked_timestamp_seconds, created_at, updated_at FROM tasks WHERE id = ?1",
        params![local_id],
        |row| {
            let project_id: i64 = row.get(0)?;
            let linked_marker_id: Option<i64> = row.get(4)?;
            Ok((project_id, linked_marker_id, json!({
                "title": row.get::<_, String>(1)?,
                "done": row.get::<_, i64>(2)? != 0,
                "category": row.get::<_, String>(3)?,
                "linked_timestamp_seconds": row.get::<_, Option<f64>>(5)?,
                "created_at": row.get::<_, String>(6)?,
                "updated_at": row.get::<_, String>(7)?,
            })))
        },
    ).map_err(|e| e.to_string())?;

    let (project_id, linked_marker_id, mut payload) = row;

    let remote_project_id = get_remote_id(conn, "projects", project_id)?
        .ok_or_else(|| format!("Project {} has no remote_id", project_id))?;
    payload["project_id"] = json!(remote_project_id);

    if let Some(mid) = linked_marker_id {
        if let Some(remote_mid) = get_remote_id(conn, "markers", mid)? {
            payload["linked_marker_id"] = json!(remote_mid);
        }
    }

    Ok(payload)
}

fn build_spotify_payload(conn: &Connection, local_id: i64) -> Result<Value, String> {
    let row = conn.query_row(
        "SELECT project_id, spotify_id, spotify_type, name, artist_name, album_name, \
         album_art_url, duration_ms, spotify_url, notes, created_at, updated_at \
         FROM spotify_references WHERE id = ?1",
        params![local_id],
        |row| {
            let project_id: i64 = row.get(0)?;
            Ok((project_id, json!({
                "spotify_id": row.get::<_, String>(1)?,
                "spotify_type": row.get::<_, String>(2)?,
                "name": row.get::<_, String>(3)?,
                "artist_name": row.get::<_, String>(4)?,
                "album_name": row.get::<_, String>(5)?,
                "album_art_url": row.get::<_, String>(6)?,
                "duration_ms": row.get::<_, Option<i64>>(7)?,
                "spotify_url": row.get::<_, String>(8)?,
                "notes": row.get::<_, String>(9)?,
                "created_at": row.get::<_, String>(10)?,
                "updated_at": row.get::<_, String>(11)?,
            })))
        },
    ).map_err(|e| e.to_string())?;

    let (project_id, mut payload) = row;

    let remote_project_id = get_remote_id(conn, "projects", project_id)?
        .ok_or_else(|| format!("Project {} has no remote_id", project_id))?;
    payload["project_id"] = json!(remote_project_id);

    Ok(payload)
}

fn build_mood_board_payload(conn: &Connection, local_id: i64) -> Result<Value, String> {
    let row = conn.query_row(
        "SELECT project_id, asset_id, sort_order, created_at FROM mood_board WHERE id = ?1",
        params![local_id],
        |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
            ))
        },
    ).map_err(|e| e.to_string())?;

    let (project_id, asset_id, sort_order, created_at) = row;

    let remote_project_id = get_remote_id(conn, "projects", project_id)?
        .ok_or_else(|| format!("Project {} has no remote_id", project_id))?;
    let remote_asset_id = get_remote_id(conn, "assets", asset_id)?
        .ok_or_else(|| format!("Asset {} has no remote_id", asset_id))?;

    Ok(json!({
        "project_id": remote_project_id,
        "asset_id": remote_asset_id,
        "sort_order": sort_order,
        "created_at": created_at,
    }))
}

// ============================================================================
// PULL — used by commands/sync.rs for both inline and background sync
// ============================================================================

/// Pull updated records for a single table.
pub fn pull_table(
    conn: &Connection,
    client: &SupabaseClient,
    table: &str,
    user_id: &str,
    last_pull_at: Option<&str>,
) -> Result<usize, String> {
    // Build query — get records updated since last pull
    let mut query_params = format!("select=*&order=id.asc");

    // For tables with user_id, filter by it
    if table == "projects" || table == "tags" {
        query_params.push_str(&format!("&user_id=eq.{}", user_id));
    }

    if let Some(ts) = last_pull_at {
        query_params.push_str(&format!("&updated_at=gt.{}", ts));
    }

    let records = api::get(client, table, &query_params)?;

    if records.is_empty() {
        return Ok(0);
    }

    let mut count = 0;
    for record in &records {
        let remote_id = record.get("id").and_then(|v| v.as_i64());
        if remote_id.is_none() {
            continue;
        }
        let remote_id = remote_id.unwrap();

        // Check if we have this record locally (by remote_id)
        let local_id: Option<i64> = conn.query_row(
            &format!("SELECT id FROM {} WHERE remote_id = ?1", table),
            params![remote_id],
            |row| row.get(0),
        ).ok();

        if let Some(lid) = local_id {
            // Check if local is newer (conflict resolution: last-write-wins)
            let local_updated: Option<String> = conn.query_row(
                &format!("SELECT sync_updated_at FROM {} WHERE id = ?1", table),
                params![lid],
                |row| row.get(0),
            ).ok().flatten();

            let remote_updated = record.get("updated_at")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            // If local has pending changes that are newer, skip remote update
            let local_status: String = conn.query_row(
                &format!("SELECT sync_status FROM {} WHERE id = ?1", table),
                params![lid],
                |row| row.get(0),
            ).unwrap_or_else(|_| "synced".to_string());

            if local_status == "pending_push" {
                if let (Some(ref local_ts), Some(ref remote_ts)) = (&local_updated, &remote_updated) {
                    if local_ts > remote_ts {
                        // Local is newer — skip remote change
                        continue;
                    }
                }
            }

            // Remote is newer or local is synced — update local
            update_local_from_remote(conn, table, lid, record)?;
            count += 1;
        } else {
            // Record doesn't exist locally — insert it
            insert_local_from_remote(conn, table, record)?;
            count += 1;
        }
    }

    Ok(count)
}

/// Update an existing local record with data from Supabase.
pub fn update_local_from_remote(
    conn: &Connection,
    table: &str,
    local_id: i64,
    record: &Value,
) -> Result<(), String> {
    // For each table, update the relevant columns from the remote record.
    // This is a simplified approach — update all non-id columns.
    match table {
        "projects" => {
            conn.execute(
                "UPDATE projects SET name = ?1, genre_label = ?2, musical_key = ?3, status = ?4, \
                 rating = ?5, bpm = ?6, in_rotation = ?7, notes = ?8, progress = ?9, \
                 cover_type = ?10, cover_locked = ?11, cover_seed = ?12, cover_style_preset = ?13, \
                 cover_url = ?14, sync_status = 'synced' WHERE id = ?15",
                params![
                    record.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                    record.get("genre_label").and_then(|v| v.as_str()).unwrap_or(""),
                    record.get("musical_key").and_then(|v| v.as_str()).unwrap_or(""),
                    record.get("status").and_then(|v| v.as_str()).unwrap_or("Sketch"),
                    record.get("rating").and_then(|v| v.as_i64()),
                    record.get("bpm").and_then(|v| v.as_f64()),
                    record.get("in_rotation").and_then(|v| v.as_bool()).unwrap_or(false) as i64,
                    record.get("notes").and_then(|v| v.as_str()).unwrap_or(""),
                    record.get("progress").and_then(|v| v.as_i64()),
                    record.get("cover_type").and_then(|v| v.as_str()).unwrap_or("none"),
                    record.get("cover_locked").and_then(|v| v.as_bool()).unwrap_or(false) as i64,
                    record.get("cover_seed").and_then(|v| v.as_str()),
                    record.get("cover_style_preset").and_then(|v| v.as_str()).unwrap_or("default"),
                    record.get("cover_url").and_then(|v| v.as_str()),
                    local_id,
                ],
            ).map_err(|e| e.to_string())?;
        }
        "tasks" => {
            conn.execute(
                "UPDATE tasks SET title = ?1, done = ?2, category = ?3, \
                 sync_status = 'synced' WHERE id = ?4",
                params![
                    record.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                    record.get("done").and_then(|v| v.as_bool()).unwrap_or(false) as i64,
                    record.get("category").and_then(|v| v.as_str()).unwrap_or("Arrangement"),
                    local_id,
                ],
            ).map_err(|e| e.to_string())?;
        }
        "project_notes" => {
            conn.execute(
                "UPDATE project_notes SET content = ?1, sync_status = 'synced' WHERE id = ?2",
                params![
                    record.get("content").and_then(|v| v.as_str()).unwrap_or(""),
                    local_id,
                ],
            ).map_err(|e| e.to_string())?;
        }
        "markers" => {
            conn.execute(
                "UPDATE markers SET timestamp_seconds = ?1, type = ?2, text = ?3, \
                 sync_status = 'synced' WHERE id = ?4",
                params![
                    record.get("timestamp_seconds").and_then(|v| v.as_f64()).unwrap_or(0.0),
                    record.get("type").and_then(|v| v.as_str()).unwrap_or("note"),
                    record.get("text").and_then(|v| v.as_str()).unwrap_or(""),
                    local_id,
                ],
            ).map_err(|e| e.to_string())?;
        }
        "project_references" => {
            conn.execute(
                "UPDATE project_references SET url = ?1, title = ?2, notes = ?3, \
                 sync_status = 'synced' WHERE id = ?4",
                params![
                    record.get("url").and_then(|v| v.as_str()).unwrap_or(""),
                    record.get("title").and_then(|v| v.as_str()),
                    record.get("notes").and_then(|v| v.as_str()).unwrap_or(""),
                    local_id,
                ],
            ).map_err(|e| e.to_string())?;
        }
        "spotify_references" => {
            conn.execute(
                "UPDATE spotify_references SET notes = ?1, sync_status = 'synced' WHERE id = ?2",
                params![
                    record.get("notes").and_then(|v| v.as_str()).unwrap_or(""),
                    local_id,
                ],
            ).map_err(|e| e.to_string())?;
        }
        _ => {
            // For other tables, just mark as synced
            conn.execute(
                &format!("UPDATE {} SET sync_status = 'synced' WHERE id = ?1", table),
                params![local_id],
            ).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

/// Insert a new local record from Supabase data.
pub fn insert_local_from_remote(
    conn: &Connection,
    table: &str,
    record: &Value,
) -> Result<(), String> {
    let remote_id = record.get("id").and_then(|v| v.as_i64())
        .ok_or("Remote record has no id")?;

    match table {
        "projects" => {
            conn.execute(
                "INSERT INTO projects (name, project_path, genre_label, musical_key, status, \
                 rating, bpm, in_rotation, notes, progress, cover_type, cover_locked, \
                 cover_seed, cover_style_preset, cover_url, remote_id, sync_status) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, 'synced')",
                params![
                    record.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                    record.get("project_path").and_then(|v| v.as_str()).unwrap_or(""),
                    record.get("genre_label").and_then(|v| v.as_str()).unwrap_or(""),
                    record.get("musical_key").and_then(|v| v.as_str()).unwrap_or(""),
                    record.get("status").and_then(|v| v.as_str()).unwrap_or("Sketch"),
                    record.get("rating").and_then(|v| v.as_i64()),
                    record.get("bpm").and_then(|v| v.as_f64()),
                    record.get("in_rotation").and_then(|v| v.as_bool()).unwrap_or(false) as i64,
                    record.get("notes").and_then(|v| v.as_str()).unwrap_or(""),
                    record.get("progress").and_then(|v| v.as_i64()),
                    record.get("cover_type").and_then(|v| v.as_str()).unwrap_or("none"),
                    record.get("cover_locked").and_then(|v| v.as_bool()).unwrap_or(false) as i64,
                    record.get("cover_seed").and_then(|v| v.as_str()),
                    record.get("cover_style_preset").and_then(|v| v.as_str()).unwrap_or("default"),
                    record.get("cover_url").and_then(|v| v.as_str()),
                    remote_id,
                ],
            ).map_err(|e| e.to_string())?;
        }
        "tags" => {
            conn.execute(
                "INSERT OR IGNORE INTO tags (name, remote_id, sync_status) VALUES (?1, ?2, 'synced')",
                params![
                    record.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                    remote_id,
                ],
            ).map_err(|e| e.to_string())?;
        }
        "tasks" => {
            // Resolve remote project_id to local
            let remote_pid = record.get("project_id").and_then(|v| v.as_i64());
            if let Some(rpid) = remote_pid {
                let local_pid: Option<i64> = conn.query_row(
                    "SELECT id FROM projects WHERE remote_id = ?1",
                    params![rpid],
                    |row| row.get(0),
                ).ok();
                if let Some(pid) = local_pid {
                    conn.execute(
                        "INSERT INTO tasks (project_id, title, done, category, remote_id, sync_status) \
                         VALUES (?1, ?2, ?3, ?4, ?5, 'synced')",
                        params![
                            pid,
                            record.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                            record.get("done").and_then(|v| v.as_bool()).unwrap_or(false) as i64,
                            record.get("category").and_then(|v| v.as_str()).unwrap_or("Arrangement"),
                            remote_id,
                        ],
                    ).map_err(|e| e.to_string())?;
                }
            }
        }
        "project_notes" => {
            let remote_pid = record.get("project_id").and_then(|v| v.as_i64());
            if let Some(rpid) = remote_pid {
                let local_pid: Option<i64> = conn.query_row(
                    "SELECT id FROM projects WHERE remote_id = ?1",
                    params![rpid],
                    |row| row.get(0),
                ).ok();
                if let Some(pid) = local_pid {
                    conn.execute(
                        "INSERT INTO project_notes (project_id, content, remote_id, sync_status) \
                         VALUES (?1, ?2, ?3, 'synced')",
                        params![
                            pid,
                            record.get("content").and_then(|v| v.as_str()).unwrap_or(""),
                            remote_id,
                        ],
                    ).map_err(|e| e.to_string())?;
                }
            }
        }
        "markers" => {
            let remote_pid = record.get("project_id").and_then(|v| v.as_i64());
            if let Some(rpid) = remote_pid {
                let local_pid: Option<i64> = conn.query_row(
                    "SELECT id FROM projects WHERE remote_id = ?1",
                    params![rpid],
                    |row| row.get(0),
                ).ok();
                if let Some(pid) = local_pid {
                    conn.execute(
                        "INSERT INTO markers (project_id, timestamp_seconds, type, text, remote_id, sync_status) \
                         VALUES (?1, ?2, ?3, ?4, ?5, 'synced')",
                        params![
                            pid,
                            record.get("timestamp_seconds").and_then(|v| v.as_f64()).unwrap_or(0.0),
                            record.get("type").and_then(|v| v.as_str()).unwrap_or("note"),
                            record.get("text").and_then(|v| v.as_str()).unwrap_or(""),
                            remote_id,
                        ],
                    ).map_err(|e| e.to_string())?;
                }
            }
        }
        "project_references" => {
            let remote_pid = record.get("project_id").and_then(|v| v.as_i64());
            if let Some(rpid) = remote_pid {
                let local_pid: Option<i64> = conn.query_row(
                    "SELECT id FROM projects WHERE remote_id = ?1",
                    params![rpid],
                    |row| row.get(0),
                ).ok();
                if let Some(pid) = local_pid {
                    conn.execute(
                        "INSERT INTO project_references (project_id, url, title, notes, remote_id, sync_status) \
                         VALUES (?1, ?2, ?3, ?4, ?5, 'synced')",
                        params![
                            pid,
                            record.get("url").and_then(|v| v.as_str()).unwrap_or(""),
                            record.get("title").and_then(|v| v.as_str()),
                            record.get("notes").and_then(|v| v.as_str()).unwrap_or(""),
                            remote_id,
                        ],
                    ).map_err(|e| e.to_string())?;
                }
            }
        }
        _ => {
            // For other child tables, skip pull-insert for now
            // (bounces, ableton_sets, sessions, spotify_references, assets, mood_board
            //  are primarily desktop-generated and less likely to be created on mobile in v1)
            log::debug!("Skipping pull-insert for table {} (remote_id={})", table, remote_id);
        }
    }

    Ok(())
}

// ============================================================================
// HELPERS
// ============================================================================

/// Look up the remote_id for a local record.
fn get_remote_id(conn: &Connection, table: &str, local_id: i64) -> Result<Option<i64>, String> {
    conn.query_row(
        &format!("SELECT remote_id FROM {} WHERE id = ?1", table),
        params![local_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())
}
