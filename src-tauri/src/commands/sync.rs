use tauri::{State, Manager};
use crate::db::DbState;
use crate::supabase::{SupabaseState, SyncTrigger};
use crate::supabase::{api, migration};
use crate::supabase::sync::build_push_payload;
use serde::{Serialize, Deserialize};
use serde_json::json;
use rusqlite::params;
use std::sync::mpsc;

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncStatus {
    pub enabled: bool,
    pub pending_push: i64,
    pub last_push_at: Option<String>,
    pub last_pull_at: Option<String>,
}

#[tauri::command]
pub fn get_sync_status(
    db: State<'_, DbState>,
    supabase: State<'_, SupabaseState>,
) -> Result<SyncStatus, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let client = supabase.0.lock().map_err(|e| e.to_string())?;

    if !client.is_authenticated() {
        return Ok(SyncStatus {
            enabled: false,
            pending_push: 0,
            last_push_at: None,
            last_pull_at: None,
        });
    }

    // Count pending push records across all syncable tables
    let tables = [
        "projects", "tags", "bounces", "ableton_sets", "sessions",
        "markers", "tasks", "project_notes", "project_references",
        "spotify_references", "assets", "mood_board",
    ];

    let mut pending: i64 = 0;
    for table in &tables {
        let count: i64 = conn
            .query_row(
                &format!("SELECT COUNT(*) FROM {} WHERE sync_status IN ('pending_push', 'pending_delete')", table),
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);
        pending += count;
    }

    let last_push_at: Option<String> = conn
        .query_row("SELECT value FROM sync_meta WHERE key = 'last_push_at'", [], |row| row.get(0))
        .ok();

    let last_pull_at: Option<String> = conn
        .query_row("SELECT value FROM sync_meta WHERE key = 'last_pull_at'", [], |row| row.get(0))
        .ok();

    Ok(SyncStatus {
        enabled: true,
        pending_push: pending,
        last_push_at,
        last_pull_at,
    })
}

/// Sync order: parents first, then children (respects FK dependencies).
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

#[tauri::command]
pub fn trigger_sync(
    app: tauri::AppHandle,
    db: State<'_, DbState>,
    supabase: State<'_, SupabaseState>,
    _sync_trigger: State<'_, SyncTrigger>,
) -> Result<String, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let client = supabase.0.lock().map_err(|e| e.to_string())?;

    if !client.is_authenticated() {
        return Err("Not authenticated".to_string());
    }

    let user_id = client.user_id.clone().ok_or("No user ID")?;

    // Step 1: Run initial migration if not yet done
    if !migration::is_migration_complete(&conn) {
        log::info!("Running initial migration...");
        run_inline_migration(&conn, &client, &user_id)?;
        migration::set_migration_complete(&conn);
        log::info!("Initial migration complete");

        return Ok("Initial migration complete".to_string());
    }

    // Step 2: Push dirty records
    let mut pushed = 0;
    for table in SYNC_ORDER {
        let count = push_table_inline(&conn, &client, table, &user_id)?;
        pushed += count;
    }

    // Push project_tags
    let pt_count = push_project_tags_inline(&conn, &client)?;
    pushed += pt_count;

    // Step 3: Handle deletes
    for table in SYNC_ORDER.iter().rev() {
        delete_pending_inline(&conn, &client, table)?;
    }

    // Update last_push_at
    if pushed > 0 {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO sync_meta (key, value) VALUES ('last_push_at', ?1) \
             ON CONFLICT(key) DO UPDATE SET value = ?1",
            params![now],
        ).ok();
    }

    // Spawn MP3 uploads in background thread (doesn't block UI)
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data_dir.join("library.db");
    let sb_url = client.url.clone();
    let sb_key = client.anon_key.clone();
    let sb_token = client.access_token.clone();
    let user_id_bg = user_id.clone();

    drop(conn);
    drop(client);

    std::thread::spawn(move || {
        let bg_conn = match rusqlite::Connection::open(&db_path) {
            Ok(c) => c,
            Err(e) => { log::error!("MP3 bg thread: failed to open DB: {}", e); return; }
        };
        bg_conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;").ok();

        let bg_client = crate::supabase::SupabaseClient {
            url: sb_url,
            anon_key: sb_key,
            access_token: sb_token,
            refresh_token: None,
            user_id: Some(user_id_bg.clone()),
            email: None,
        };

        if let Err(e) = upload_bounce_mp3s_inline(&bg_conn, &bg_client, &user_id_bg) {
            log::warn!("Bounce MP3 upload error: {}", e);
        }
        if let Err(e) = upload_cover_images_inline(&bg_conn, &bg_client, &user_id_bg) {
            log::warn!("Cover image upload error: {}", e);
        }
        log::info!("Background upload thread finished");
    });

    // Reset bg sync thread timer so it doesn't duplicate work
    let sender = _sync_trigger.0.lock().map_err(|e| e.to_string())?;
    if let Some(ref tx) = *sender {
        tx.send(()).ok(); // Non-blocking, ignore if channel full
    }

    Ok(format!("Synced {} records, MP3 upload started in background", pushed))
}

/// Pull remote changes into local SQLite (reuses pub pull_table from sync.rs).
fn pull_changes_inline(
    conn: &rusqlite::Connection,
    client: &crate::supabase::SupabaseClient,
    user_id: &str,
) -> Result<(), String> {
    let last_pull: Option<String> = conn.query_row(
        "SELECT value FROM sync_meta WHERE key = 'last_pull_at'", [], |row| row.get(0),
    ).ok();

    let mut pulled = 0;
    for table in SYNC_ORDER {
        let count = crate::supabase::sync::pull_table(conn, client, table, user_id, last_pull.as_deref())?;
        pulled += count;
    }

    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO sync_meta (key, value) VALUES ('last_pull_at', ?1) \
         ON CONFLICT(key) DO UPDATE SET value = ?1",
        params![now],
    ).ok();

    if pulled > 0 {
        log::info!("BG pull: {} records", pulled);
    }
    Ok(())
}

/// Spawn the background sync thread.
/// Opens its own SQLite connection (WAL mode), reads fresh Supabase tokens
/// from managed state each cycle, runs push → pull → uploads on a 30s timer
/// with 2s debounce. Shuts down on channel disconnect (sign-out).
pub fn spawn_bg_sync_thread(app: tauri::AppHandle) -> mpsc::Sender<()> {
    let (tx, rx) = mpsc::channel::<()>();

    std::thread::spawn(move || {
        // Open own DB connection
        let db_path = match app.path().app_data_dir() {
            Ok(dir) => dir.join("library.db"),
            Err(e) => { log::error!("BG sync: no app_data_dir: {}", e); return; }
        };
        let conn = match rusqlite::Connection::open(&db_path) {
            Ok(c) => c,
            Err(e) => { log::error!("BG sync: DB open failed: {}", e); return; }
        };
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;").ok();

        log::info!("Background sync thread started");

        loop {
            // Wait for trigger or 30s timeout
            match rx.recv_timeout(std::time::Duration::from_secs(30)) {
                Ok(()) => {
                    // Debounce: wait 2s, drain extras
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    while rx.try_recv().is_ok() {}
                }
                Err(mpsc::RecvTimeoutError::Timeout) => { /* periodic */ }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    log::info!("Background sync thread shutting down");
                    break;
                }
            }

            // Read fresh credentials from managed state
            let (sb_url, sb_key, sb_token, sb_refresh, user_id) = {
                let state = app.state::<crate::supabase::SupabaseState>();
                let client = state.0.lock().unwrap();
                if !client.is_authenticated() { continue; }
                (
                    client.url.clone(),
                    client.anon_key.clone(),
                    client.access_token.clone(),
                    client.refresh_token.clone(),
                    client.user_id.clone().unwrap(),
                )
            };

            let client = crate::supabase::SupabaseClient {
                url: sb_url, anon_key: sb_key,
                access_token: sb_token, refresh_token: sb_refresh,
                user_id: Some(user_id.clone()), email: None,
            };

            // Push
            for table in SYNC_ORDER {
                if let Err(e) = push_table_inline(&conn, &client, table, &user_id) {
                    log::warn!("BG push {}: {}", table, e);
                }
            }
            push_project_tags_inline(&conn, &client).ok();
            for table in SYNC_ORDER.iter().rev() {
                delete_pending_inline(&conn, &client, table).ok();
            }

            // Pull
            if let Err(e) = pull_changes_inline(&conn, &client, &user_id) {
                log::warn!("BG pull error: {}", e);
            }

            // Uploads (non-fatal)
            upload_bounce_mp3s_inline(&conn, &client, &user_id).ok();
            upload_cover_images_inline(&conn, &client, &user_id).ok();
        }
    });

    tx
}

/// Run the initial migration: upload all local data to Supabase.
fn run_inline_migration(
    conn: &rusqlite::Connection,
    client: &crate::supabase::SupabaseClient,
    user_id: &str,
) -> Result<(), String> {
    let mut total = 0;
    let mut errors = Vec::new();

    // 1. Migrate tags
    {
        let mut stmt = conn.prepare("SELECT id, name FROM tags").map_err(|e| e.to_string())?;
        let tags: Vec<(i64, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        drop(stmt);

        for (local_id, name) in &tags {
            let payload = json!({ "user_id": user_id, "name": name });
            match api::insert(client, "tags", &payload) {
                Ok(result) => {
                    if let Some(remote_id) = result.get("id").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE tags SET remote_id = ?1, sync_status = 'synced' WHERE id = ?2",
                            params![remote_id, local_id],
                        ).ok();
                    }
                    total += 1;
                }
                Err(e) => errors.push(format!("Tag '{}': {}", name, e)),
            }
        }
        log::info!("Migrated {} tags ({} errors)", total, errors.len());
    }

    // 2. Migrate projects
    {
        let mut stmt = conn.prepare(
            "SELECT id, name, project_path, genre_label, musical_key, status, rating, bpm, \
             in_rotation, notes, artwork_path, current_set_path, archived, missing, progress, \
             last_worked_on, created_at, updated_at, cover_type, cover_locked, cover_seed, \
             cover_style_preset, cover_updated_at, cover_url FROM projects"
        ).map_err(|e| e.to_string())?;

        let rows: Vec<(i64, serde_json::Value)> = stmt
            .query_map([], |row| {
                let local_id: i64 = row.get(0)?;
                Ok((local_id, json!({
                    "user_id": user_id,
                    "name": row.get::<_, String>(1)?,
                    "project_path": row.get::<_, String>(2)?,
                    "genre_label": row.get::<_, String>(3)?,
                    "musical_key": row.get::<_, String>(4)?,
                    "status": row.get::<_, String>(5)?,
                    "rating": row.get::<_, Option<i64>>(6)?,
                    "bpm": row.get::<_, Option<f64>>(7)?,
                    "in_rotation": row.get::<_, i64>(8)? != 0,
                    "notes": row.get::<_, String>(9)?,
                    "artwork_path": row.get::<_, Option<String>>(10)?,
                    "current_set_path": row.get::<_, Option<String>>(11)?,
                    "archived": row.get::<_, i64>(12)? != 0,
                    "missing": row.get::<_, i64>(13)? != 0,
                    "progress": row.get::<_, Option<i64>>(14)?,
                    "last_worked_on": row.get::<_, Option<String>>(15)?,
                    "created_at": row.get::<_, String>(16)?,
                    "updated_at": row.get::<_, String>(17)?,
                    "cover_type": row.get::<_, String>(18)?,
                    "cover_locked": row.get::<_, i64>(19)? != 0,
                    "cover_seed": row.get::<_, Option<String>>(20)?,
                    "cover_style_preset": row.get::<_, String>(21)?,
                    "cover_updated_at": row.get::<_, Option<String>>(22)?,
                    "cover_url": row.get::<_, Option<String>>(23)?,
                })))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        drop(stmt);

        let mut count = 0;
        for (local_id, payload) in &rows {
            match api::insert(client, "projects", payload) {
                Ok(result) => {
                    if let Some(remote_id) = result.get("id").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE projects SET remote_id = ?1, sync_status = 'synced' WHERE id = ?2",
                            params![remote_id, local_id],
                        ).ok();
                    }
                    count += 1;
                }
                Err(e) => {
                    let name = payload.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                    errors.push(format!("Project '{}': {}", name, e));
                }
            }
        }
        total += count;
        log::info!("Migrated {} projects ({} errors)", count, errors.len());
    }

    // 3. Migrate project_tags
    {
        let mut stmt = conn.prepare("SELECT project_id, tag_id FROM project_tags")
            .map_err(|e| e.to_string())?;
        let entries: Vec<(i64, i64)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        drop(stmt);

        for (project_id, tag_id) in &entries {
            let remote_pid: Option<i64> = conn.query_row(
                "SELECT remote_id FROM projects WHERE id = ?1", params![project_id], |row| row.get(0),
            ).ok().flatten();
            let remote_tid: Option<i64> = conn.query_row(
                "SELECT remote_id FROM tags WHERE id = ?1", params![tag_id], |row| row.get(0),
            ).ok().flatten();

            if let (Some(rpid), Some(rtid)) = (remote_pid, remote_tid) {
                let payload = json!({ "project_id": rpid, "tag_id": rtid });
                match api::upsert(client, "project_tags", &payload) {
                    Ok(_) => {
                        conn.execute(
                            "UPDATE project_tags SET sync_status = 'synced' WHERE project_id = ?1 AND tag_id = ?2",
                            params![project_id, tag_id],
                        ).ok();
                        total += 1;
                    }
                    Err(e) => errors.push(format!("project_tag ({}, {}): {}", project_id, tag_id, e)),
                }
            }
        }
    }

    // 4. Migrate child tables
    let child_tables = [
        "bounces", "ableton_sets", "sessions", "markers", "tasks",
        "project_notes", "project_references", "spotify_references",
        "assets", "mood_board",
    ];

    for table in &child_tables {
        let mut stmt = conn.prepare(&format!("SELECT id FROM {}", table))
            .map_err(|e| e.to_string())?;
        let ids: Vec<i64> = stmt.query_map([], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        drop(stmt);

        for local_id in &ids {
            match build_push_payload(conn, table, *local_id, user_id) {
                Ok(payload) => {
                    match api::insert(client, table, &payload) {
                        Ok(result) => {
                            if let Some(remote_id) = result.get("id").and_then(|v| v.as_i64()) {
                                conn.execute(
                                    &format!("UPDATE {} SET remote_id = ?1, sync_status = 'synced' WHERE id = ?2", table),
                                    params![remote_id, local_id],
                                ).ok();
                            }
                            total += 1;
                        }
                        Err(e) => errors.push(format!("{}.{}: {}", table, local_id, e)),
                    }
                }
                Err(e) => errors.push(format!("{}.{}: {}", table, local_id, e)),
            }
        }
        log::info!("Migrated {} {} records", ids.len(), table);
    }

    // Mark all as synced
    let all_tables = [
        "projects", "tags", "bounces", "ableton_sets", "sessions",
        "markers", "tasks", "project_notes", "project_references",
        "spotify_references", "assets", "mood_board",
    ];
    for table in &all_tables {
        conn.execute(
            &format!("UPDATE {} SET sync_status = 'synced' WHERE sync_status != 'synced'", table),
            [],
        ).ok();
    }
    conn.execute(
        "UPDATE project_tags SET sync_status = 'synced' WHERE sync_status != 'synced'",
        [],
    ).ok();

    if !errors.is_empty() {
        log::warn!("Migration had {} errors: {:?}", errors.len(), &errors[..errors.len().min(5)]);
    }
    log::info!("Initial migration complete: {} records total", total);

    Ok(())
}

/// Push pending records for a single table.
fn push_table_inline(
    conn: &rusqlite::Connection,
    client: &crate::supabase::SupabaseClient,
    table: &str,
    user_id: &str,
) -> Result<usize, String> {
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
        let payload = match build_push_payload(conn, table, *local_id, user_id) {
            Ok(p) => p,
            Err(e) => {
                log::warn!("Failed to build payload for {}.{}: {}", table, local_id, e);
                continue;
            }
        };

        // Check for existing remote_id
        let remote_id: Option<i64> = conn.query_row(
            &format!("SELECT remote_id FROM {} WHERE id = ?1", table),
            params![local_id],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        let result = if let Some(rid) = remote_id {
            api::update(client, table, rid, &payload)?
        } else {
            api::insert(client, table, &payload)?
        };

        if let Some(new_remote_id) = result.get("id").and_then(|v| v.as_i64()) {
            conn.execute(
                &format!("UPDATE {} SET remote_id = ?1, sync_status = 'synced' WHERE id = ?2", table),
                params![new_remote_id, local_id],
            ).ok();
        } else {
            conn.execute(
                &format!("UPDATE {} SET sync_status = 'synced' WHERE id = ?1", table),
                params![local_id],
            ).ok();
        }
        count += 1;
    }

    Ok(count)
}

/// Push pending project_tags.
fn push_project_tags_inline(
    conn: &rusqlite::Connection,
    client: &crate::supabase::SupabaseClient,
) -> Result<usize, String> {
    let mut stmt = conn.prepare(
        "SELECT project_id, tag_id FROM project_tags WHERE sync_status = 'pending_push'"
    ).map_err(|e| e.to_string())?;
    let entries: Vec<(i64, i64)> = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    drop(stmt);

    let mut count = 0;
    for (project_id, tag_id) in &entries {
        let remote_pid: Option<i64> = conn.query_row(
            "SELECT remote_id FROM projects WHERE id = ?1", params![project_id], |row| row.get(0),
        ).ok().flatten();
        let remote_tid: Option<i64> = conn.query_row(
            "SELECT remote_id FROM tags WHERE id = ?1", params![tag_id], |row| row.get(0),
        ).ok().flatten();

        if let (Some(rpid), Some(rtid)) = (remote_pid, remote_tid) {
            let payload = json!({ "project_id": rpid, "tag_id": rtid });
            match api::upsert(client, "project_tags", &payload) {
                Ok(_) => {
                    conn.execute(
                        "UPDATE project_tags SET sync_status = 'synced' WHERE project_id = ?1 AND tag_id = ?2",
                        params![project_id, tag_id],
                    ).ok();
                    count += 1;
                }
                Err(e) => log::warn!("Failed to push project_tag ({}, {}): {}", project_id, tag_id, e),
            }
        }
    }

    Ok(count)
}

/// Convert latest WAV bounce per project to MP3, upload to Supabase Storage,
/// and store the public URL in local SQLite + remote Supabase.
fn upload_bounce_mp3s_inline(
    conn: &rusqlite::Connection,
    client: &crate::supabase::SupabaseClient,
    user_id: &str,
) -> Result<(), String> {
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
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, i64>(3)?,
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

    let temp_dir = std::env::temp_dir().join("ableton-project-library-mp3");
    std::fs::create_dir_all(&temp_dir).ok();

    for (local_id, wav_path, bounce_remote_id, project_remote_id) in &bounces {
        let wav = std::path::Path::new(wav_path.as_str());
        if !wav.exists() {
            log::debug!("Skipping bounce {} — WAV not found: {}", local_id, wav_path);
            continue;
        }

        let stem = wav.file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("bounce");
        let mp3_filename = format!("{}.mp3", stem);
        let temp_mp3 = temp_dir.join(&mp3_filename);

        log::info!("Converting bounce {} to MP3: {}", local_id, wav_path);
        if let Err(e) = crate::mp3::convert_wav_to_mp3(wav, &temp_mp3) {
            log::warn!("MP3 conversion failed for bounce {}: {}", local_id, e);
            continue;
        }

        let mp3_data = match std::fs::read(&temp_mp3) {
            Ok(data) => data,
            Err(e) => {
                log::warn!("Failed to read temp MP3 for bounce {}: {}", local_id, e);
                std::fs::remove_file(&temp_mp3).ok();
                continue;
            }
        };

        let storage_path = format!("{}/{}/{}", user_id, project_remote_id, mp3_filename);
        let public_url = match crate::supabase::upload::upload_file(
            client, "bounces", &storage_path, mp3_data, "audio/mpeg",
        ) {
            Ok(url) => url,
            Err(e) => {
                log::warn!("Upload failed for bounce {}: {}", local_id, e);
                std::fs::remove_file(&temp_mp3).ok();
                continue;
            }
        };

        conn.execute(
            "UPDATE bounces SET mp3_url = ?1 WHERE id = ?2",
            params![public_url, local_id],
        ).ok();

        if let Err(e) = api::update(client, "bounces", *bounce_remote_id, &json!({"mp3_url": &public_url})) {
            log::warn!("Failed to patch remote bounce {} with mp3_url: {}", bounce_remote_id, e);
        }

        std::fs::remove_file(&temp_mp3).ok();
        log::info!("Uploaded MP3 for bounce {} → {}", local_id, public_url);
    }

    Ok(())
}

/// Upload cover images (PNG thumbnails) for projects that have artwork but no cover_url yet.
fn upload_cover_images_inline(
    conn: &rusqlite::Connection,
    client: &crate::supabase::SupabaseClient,
    user_id: &str,
) -> Result<(), String> {
    let mut stmt = conn.prepare(
        "SELECT id, artwork_path, remote_id FROM projects \
         WHERE remote_id IS NOT NULL \
           AND cover_url IS NULL \
           AND cover_type != 'none' \
           AND artwork_path IS NOT NULL \
           AND artwork_path != ''"
    ).map_err(|e| e.to_string())?;

    let projects: Vec<(i64, String, i64)> = stmt.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i64>(2)?,
        ))
    })
    .map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    drop(stmt);

    if projects.is_empty() {
        return Ok(());
    }

    log::info!("Found {} projects needing cover upload", projects.len());

    for (local_id, artwork_path, remote_id) in &projects {
        let path = std::path::Path::new(artwork_path.as_str());
        if !path.exists() {
            log::debug!("Skipping project {} — artwork not found: {}", local_id, artwork_path);
            continue;
        }

        let image_data = match std::fs::read(path) {
            Ok(data) => data,
            Err(e) => {
                log::warn!("Failed to read artwork for project {}: {}", local_id, e);
                continue;
            }
        };

        // Determine content type from extension
        let ext = path.extension()
            .and_then(|e| e.to_str())
            .unwrap_or("png")
            .to_lowercase();
        let content_type = match ext.as_str() {
            "jpg" | "jpeg" => "image/jpeg",
            "webp" => "image/webp",
            _ => "image/png",
        };

        let storage_path = format!("{}/{}/thumbnail.{}", user_id, remote_id, ext);

        let public_url = match crate::supabase::upload::upload_file(
            client, "covers", &storage_path, image_data, content_type,
        ) {
            Ok(url) => url,
            Err(e) => {
                log::warn!("Cover upload failed for project {}: {}", local_id, e);
                continue;
            }
        };

        // Update local SQLite
        conn.execute(
            "UPDATE projects SET cover_url = ?1 WHERE id = ?2",
            params![public_url, local_id],
        ).ok();

        // Update remote Supabase record
        if let Err(e) = api::update(client, "projects", *remote_id, &json!({"cover_url": &public_url})) {
            log::warn!("Failed to patch remote project {} with cover_url: {}", remote_id, e);
        }

        log::info!("Uploaded cover for project {} → {}", local_id, public_url);
    }

    Ok(())
}

/// Delete records marked pending_delete from Supabase.
fn delete_pending_inline(
    conn: &rusqlite::Connection,
    client: &crate::supabase::SupabaseClient,
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
            match api::delete(client, table, rid) {
                Ok(()) => {
                    conn.execute(
                        &format!("DELETE FROM {} WHERE id = ?1", table),
                        params![local_id],
                    ).ok();
                }
                Err(e) => log::warn!("Failed to delete {}.{} from remote: {}", table, rid, e),
            }
        } else {
            conn.execute(
                &format!("DELETE FROM {} WHERE id = ?1", table),
                params![local_id],
            ).ok();
        }
    }

    Ok(())
}
