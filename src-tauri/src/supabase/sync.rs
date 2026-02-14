// Sync engine: push dirty local records to Supabase, pull remote changes.

use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

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

/// Spawn the background sync thread.
/// Returns a sender that can be used to trigger immediate sync cycles.
pub fn spawn_sync_thread(
    db: Arc<Mutex<Connection>>,
    supabase: Arc<Mutex<SupabaseClient>>,
) -> mpsc::Sender<()> {
    let (tx, rx) = mpsc::channel::<()>();

    thread::spawn(move || {
        log::info!("Sync thread started");
        loop {
            // Wait for a trigger or timeout after 30s
            match rx.recv_timeout(Duration::from_secs(30)) {
                Ok(()) => {
                    // Debounce: wait 2s for more changes before syncing
                    thread::sleep(Duration::from_secs(2));
                    // Drain any additional triggers that arrived during debounce
                    while rx.try_recv().is_ok() {}
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    // Periodic sync cycle
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    log::info!("Sync thread shutting down (channel disconnected)");
                    break;
                }
            }

            // Check if still authenticated
            {
                let client = supabase.lock().unwrap();
                if !client.is_authenticated() {
                    continue;
                }
            }

            // Run push cycle
            if let Err(e) = push_cycle(&db, &supabase) {
                log::error!("Push sync error: {}", e);
            }

            // Run pull cycle
            if let Err(e) = pull_cycle(&db, &supabase) {
                log::error!("Pull sync error: {}", e);
            }
        }
    });

    tx
}

// ============================================================================
// PUSH CYCLE
// ============================================================================

/// Push dirty local records to Supabase.
fn push_cycle(
    db: &Arc<Mutex<Connection>>,
    supabase: &Arc<Mutex<SupabaseClient>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    // Get user_id from the authenticated client
    let user_id = {
        let client = supabase.lock().map_err(|e| e.to_string())?;
        client.user_id.clone().ok_or("Not authenticated")?
    };

    let mut pushed = 0;

    // Push pending records in dependency order
    for table in SYNC_ORDER {
        let count = push_table(&conn, supabase, table, &user_id)?;
        pushed += count;
    }

    // Push project_tags junction table
    let tag_count = push_project_tags(&conn, supabase, &user_id)?;
    pushed += tag_count;

    // Handle pending deletes (reverse order — children first)
    for table in SYNC_ORDER.iter().rev() {
        delete_pending(&conn, supabase, table)?;
    }

    if pushed > 0 {
        // Update last_push_at
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO sync_meta (key, value) VALUES ('last_push_at', ?1) \
             ON CONFLICT(key) DO UPDATE SET value = ?1",
            params![now],
        ).ok();
        log::info!("Push cycle complete: {} records pushed", pushed);
    }

    // Upload MP3s for latest bounces (non-fatal — log warnings on failure)
    if let Err(e) = upload_bounce_mp3s(&conn, supabase, &user_id) {
        log::warn!("Bounce MP3 upload error: {}", e);
    }

    Ok(())
}

/// Push all pending records from a single table.
fn push_table(
    conn: &Connection,
    supabase: &Arc<Mutex<SupabaseClient>>,
    table: &str,
    user_id: &str,
) -> Result<usize, String> {
    // Get all records with sync_status = 'pending_push'
    let mut stmt = conn.prepare(
        &format!("SELECT id FROM {} WHERE sync_status = 'pending_push'", table)
    ).map_err(|e| e.to_string())?;
    let ids: Vec<i64> = stmt.query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    drop(stmt);

    if ids.is_empty() {
        return Ok(0);
    }

    let mut count = 0;
    for local_id in &ids {
        match push_record(conn, supabase, table, *local_id, user_id) {
            Ok(()) => count += 1,
            Err(e) => {
                log::warn!("Failed to push {}.{}: {}", table, local_id, e);
                // Don't fail the whole cycle — skip this record and retry next time
            }
        }
    }

    Ok(count)
}

/// Push a single record to Supabase.
fn push_record(
    conn: &Connection,
    supabase: &Arc<Mutex<SupabaseClient>>,
    table: &str,
    local_id: i64,
    user_id: &str,
) -> Result<(), String> {
    // Build the JSON payload from the local record
    let payload = build_push_payload(conn, table, local_id, user_id)?;

    // Check if this record already has a remote_id
    let remote_id: Option<i64> = conn.query_row(
        &format!("SELECT remote_id FROM {} WHERE id = ?1", table),
        params![local_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let client = supabase.lock().map_err(|e| e.to_string())?;

    let result = if let Some(rid) = remote_id {
        // Update existing remote record
        api::update(&client, table, rid, &payload)?
    } else {
        // Insert new remote record
        api::insert(&client, table, &payload)?
    };

    drop(client);

    // Store the remote_id from the response
    if let Some(new_remote_id) = result.get("id").and_then(|v| v.as_i64()) {
        conn.execute(
            &format!("UPDATE {} SET remote_id = ?1, sync_status = 'synced' WHERE id = ?2", table),
            params![new_remote_id, local_id],
        ).map_err(|e| e.to_string())?;
    } else {
        // Mark as synced even if we can't parse the remote ID
        conn.execute(
            &format!("UPDATE {} SET sync_status = 'synced' WHERE id = ?1", table),
            params![local_id],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

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

/// Push project_tags junction entries.
fn push_project_tags(
    conn: &Connection,
    supabase: &Arc<Mutex<SupabaseClient>>,
    _user_id: &str,
) -> Result<usize, String> {
    let mut stmt = conn.prepare(
        "SELECT project_id, tag_id FROM project_tags WHERE sync_status = 'pending_push'"
    ).map_err(|e| e.to_string())?;
    let entries: Vec<(i64, i64)> = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    drop(stmt);

    if entries.is_empty() {
        return Ok(0);
    }

    let mut count = 0;
    for (project_id, tag_id) in &entries {
        let remote_project_id = get_remote_id(conn, "projects", *project_id)?;
        let remote_tag_id = get_remote_id(conn, "tags", *tag_id)?;

        if let (Some(rpid), Some(rtid)) = (remote_project_id, remote_tag_id) {
            let payload = json!({
                "project_id": rpid,
                "tag_id": rtid,
            });

            let client = supabase.lock().map_err(|e| e.to_string())?;
            match api::upsert(&client, "project_tags", &payload) {
                Ok(_) => {
                    drop(client);
                    let now = chrono::Utc::now().to_rfc3339();
                    conn.execute(
                        "UPDATE project_tags SET sync_status = 'synced', sync_updated_at = ?1 \
                         WHERE project_id = ?2 AND tag_id = ?3",
                        params![now, project_id, tag_id],
                    ).ok();
                    count += 1;
                }
                Err(e) => {
                    drop(client);
                    log::warn!("Failed to push project_tag ({}, {}): {}", project_id, tag_id, e);
                }
            }
        }
    }

    Ok(count)
}

/// Delete records marked as pending_delete from Supabase, then remove locally.
fn delete_pending(
    conn: &Connection,
    supabase: &Arc<Mutex<SupabaseClient>>,
    table: &str,
) -> Result<(), String> {
    let mut stmt = conn.prepare(
        &format!("SELECT id, remote_id FROM {} WHERE sync_status = 'pending_delete'", table)
    ).map_err(|e| e.to_string())?;
    let records: Vec<(i64, Option<i64>)> = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    drop(stmt);

    for (local_id, remote_id) in records {
        if let Some(rid) = remote_id {
            let client = supabase.lock().map_err(|e| e.to_string())?;
            match api::delete(&client, table, rid) {
                Ok(()) => {
                    drop(client);
                    // Remove local record now that remote is deleted
                    conn.execute(
                        &format!("DELETE FROM {} WHERE id = ?1", table),
                        params![local_id],
                    ).ok();
                }
                Err(e) => {
                    drop(client);
                    log::warn!("Failed to delete {}.{} from remote: {}", table, rid, e);
                }
            }
        } else {
            // No remote_id means it was never synced — just clean up locally
            conn.execute(
                &format!("DELETE FROM {} WHERE id = ?1", table),
                params![local_id],
            ).ok();
        }
    }

    Ok(())
}

// ============================================================================
// BOUNCE MP3 UPLOAD
// ============================================================================

/// For each project with a remote_id, find the latest bounce (by modified_time)
/// that has no mp3_url yet, convert WAV → MP3, upload to Supabase Storage,
/// and store the public URL locally + remotely.
fn upload_bounce_mp3s(
    conn: &Connection,
    supabase: &Arc<Mutex<SupabaseClient>>,
    user_id: &str,
) -> Result<(), String> {
    // Find bounces that need MP3 conversion:
    // - project has a remote_id (already synced)
    // - bounce has no mp3_url yet
    // - bounce is the latest per project (highest modified_time)
    // - WAV file still exists on disk
    let mut stmt = conn.prepare(
        "SELECT b.id, b.bounce_path, b.remote_id, p.remote_id AS project_remote_id
         FROM bounces b
         JOIN projects p ON b.project_id = p.id
         WHERE p.remote_id IS NOT NULL
           AND b.mp3_url IS NULL
           AND b.remote_id IS NOT NULL
           AND b.modified_time = (
               SELECT MAX(b2.modified_time) FROM bounces b2 WHERE b2.project_id = b.project_id
           )"
    ).map_err(|e| e.to_string())?;

    let bounces: Vec<(i64, String, i64, i64)> = stmt.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?,      // local bounce id
            row.get::<_, String>(1)?,    // bounce_path (WAV)
            row.get::<_, i64>(2)?,       // bounce remote_id
            row.get::<_, i64>(3)?,       // project remote_id
        ))
    })
    .map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    drop(stmt);

    if bounces.is_empty() {
        return Ok(());
    }

    log::info!("Found {} bounces needing MP3 upload", bounces.len());

    // Get app data dir for temp files
    let temp_dir = std::env::temp_dir().join("ableton-project-library-mp3");
    std::fs::create_dir_all(&temp_dir).ok();

    for (local_id, wav_path, bounce_remote_id, project_remote_id) in &bounces {
        let wav = std::path::Path::new(wav_path);
        if !wav.exists() {
            log::debug!("Skipping bounce {} — WAV not found: {}", local_id, wav_path);
            continue;
        }

        // Derive MP3 filename from WAV filename
        let stem = wav.file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("bounce");
        let mp3_filename = format!("{}.mp3", stem);
        let temp_mp3 = temp_dir.join(&mp3_filename);

        // Convert WAV → MP3
        log::info!("Converting bounce {} to MP3: {}", local_id, wav_path);
        if let Err(e) = crate::mp3::convert_wav_to_mp3(wav, &temp_mp3) {
            log::warn!("MP3 conversion failed for bounce {}: {}", local_id, e);
            continue;
        }

        // Read MP3 bytes
        let mp3_data = match std::fs::read(&temp_mp3) {
            Ok(data) => data,
            Err(e) => {
                log::warn!("Failed to read temp MP3 for bounce {}: {}", local_id, e);
                std::fs::remove_file(&temp_mp3).ok();
                continue;
            }
        };

        // Upload to Supabase Storage: bounces/{user_id}/{project_remote_id}/{filename}.mp3
        let storage_path = format!("{}/{}/{}", user_id, project_remote_id, mp3_filename);

        let public_url = {
            let client = supabase.lock().map_err(|e| e.to_string())?;
            match crate::supabase::upload::upload_file(
                &client, "bounces", &storage_path, mp3_data, "audio/mpeg",
            ) {
                Ok(url) => url,
                Err(e) => {
                    log::warn!("Upload failed for bounce {}: {}", local_id, e);
                    std::fs::remove_file(&temp_mp3).ok();
                    continue;
                }
            }
        };

        // Update local SQLite
        conn.execute(
            "UPDATE bounces SET mp3_url = ?1 WHERE id = ?2",
            params![public_url, local_id],
        ).ok();

        // Update remote Supabase record
        {
            let client = supabase.lock().map_err(|e| e.to_string())?;
            if let Err(e) = crate::supabase::api::update(
                &client, "bounces", *bounce_remote_id, &json!({"mp3_url": public_url}),
            ) {
                log::warn!("Failed to patch remote bounce {} with mp3_url: {}", bounce_remote_id, e);
            }
        }

        // Clean up temp file
        std::fs::remove_file(&temp_mp3).ok();

        log::info!("Uploaded MP3 for bounce {} → {}", local_id, public_url);
    }

    Ok(())
}

// ============================================================================
// PULL CYCLE
// ============================================================================

/// Pull remote changes into local SQLite.
fn pull_cycle(
    db: &Arc<Mutex<Connection>>,
    supabase: &Arc<Mutex<SupabaseClient>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    // Get last_pull_at timestamp
    let last_pull: Option<String> = conn.query_row(
        "SELECT value FROM sync_meta WHERE key = 'last_pull_at'",
        [],
        |row| row.get(0),
    ).ok();

    let user_id = {
        let client = supabase.lock().map_err(|e| e.to_string())?;
        client.user_id.clone().ok_or("Not authenticated")?
    };

    let mut pulled = 0;

    // Pull each table
    for table in SYNC_ORDER {
        let count = pull_table(&conn, supabase, table, &user_id, last_pull.as_deref())?;
        pulled += count;
    }

    // Update last_pull_at
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO sync_meta (key, value) VALUES ('last_pull_at', ?1) \
         ON CONFLICT(key) DO UPDATE SET value = ?1",
        params![now],
    ).ok();

    if pulled > 0 {
        log::info!("Pull cycle complete: {} records pulled", pulled);
    }

    Ok(())
}

/// Pull updated records for a single table.
fn pull_table(
    conn: &Connection,
    supabase: &Arc<Mutex<SupabaseClient>>,
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

    let client = supabase.lock().map_err(|e| e.to_string())?;
    let records = api::get(&client, table, &query_params)?;
    drop(client);

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
fn update_local_from_remote(
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
fn insert_local_from_remote(
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
