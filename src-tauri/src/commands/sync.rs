use tauri::State;
use crate::db::DbState;
use crate::supabase::{SupabaseState, SyncTrigger};
use crate::supabase::{api, migration};
use crate::supabase::sync::build_push_payload;
use serde::{Serialize, Deserialize};
use serde_json::json;
use rusqlite::params;

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

    Ok(format!("Synced {} records", pushed))
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
             cover_style_preset, cover_updated_at FROM projects"
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
