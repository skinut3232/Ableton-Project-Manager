// Phase 6: One-time migration of local SQLite data to Supabase.
// Runs when a user first enables sync after signing in.

use std::sync::{Arc, Mutex};
use rusqlite::{params, Connection};
use serde_json::json;
use crate::supabase::SupabaseClient;
use crate::supabase::api;

/// Check if initial migration has been completed.
pub fn is_migration_complete(conn: &Connection) -> bool {
    conn.query_row(
        "SELECT value FROM sync_meta WHERE key = 'migration_complete'",
        [],
        |row| row.get::<_, String>(0),
    )
    .map(|v| v == "true")
    .unwrap_or(false)
}

/// Mark migration as complete.
pub fn set_migration_complete(conn: &Connection) {
    conn.execute(
        "INSERT INTO sync_meta (key, value) VALUES ('migration_complete', 'true') \
         ON CONFLICT(key) DO UPDATE SET value = 'true'",
        [],
    ).ok();
}

/// Run the initial data migration: upload all local data to Supabase.
/// Returns (total_records, errors).
pub fn run_initial_migration(
    db: &Arc<Mutex<Connection>>,
    supabase: &Arc<Mutex<SupabaseClient>>,
) -> Result<(usize, Vec<String>), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    if is_migration_complete(&conn) {
        return Ok((0, vec![]));
    }

    let user_id = {
        let client = supabase.lock().map_err(|e| e.to_string())?;
        client.user_id.clone().ok_or("Not authenticated")?
    };

    let mut total = 0;
    let mut errors = Vec::new();

    // 1. Migrate tags
    let tag_count = migrate_tags(&conn, supabase, &user_id, &mut errors)?;
    total += tag_count;
    log::info!("Migrated {} tags", tag_count);

    // 2. Migrate projects
    let project_count = migrate_projects(&conn, supabase, &user_id, &mut errors)?;
    total += project_count;
    log::info!("Migrated {} projects", project_count);

    // 3. Migrate project_tags junction
    let pt_count = migrate_project_tags(&conn, supabase, &mut errors)?;
    total += pt_count;

    // 4. Migrate child tables
    let child_tables = [
        "bounces", "ableton_sets", "sessions", "markers", "tasks",
        "project_notes", "project_references", "spotify_references",
        "assets", "mood_board",
    ];

    for table in &child_tables {
        let count = migrate_child_table(&conn, supabase, table, &user_id, &mut errors)?;
        total += count;
        if count > 0 {
            log::info!("Migrated {} {} records", count, table);
        }
    }

    // Mark all records as synced
    mark_all_synced(&conn)?;

    // Mark migration complete
    set_migration_complete(&conn);

    log::info!("Initial migration complete: {} records, {} errors", total, errors.len());
    Ok((total, errors))
}

fn migrate_tags(
    conn: &Connection,
    supabase: &Arc<Mutex<SupabaseClient>>,
    user_id: &str,
    errors: &mut Vec<String>,
) -> Result<usize, String> {
    let mut stmt = conn.prepare("SELECT id, name FROM tags")
        .map_err(|e| e.to_string())?;
    let tags: Vec<(i64, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    drop(stmt);

    let mut count = 0;
    for (local_id, name) in &tags {
        let payload = json!({
            "user_id": user_id,
            "name": name,
        });

        let client = supabase.lock().map_err(|e| e.to_string())?;
        match api::insert(&client, "tags", &payload) {
            Ok(result) => {
                drop(client);
                if let Some(remote_id) = result.get("id").and_then(|v| v.as_i64()) {
                    conn.execute(
                        "UPDATE tags SET remote_id = ?1, sync_status = 'synced' WHERE id = ?2",
                        params![remote_id, local_id],
                    ).ok();
                }
                count += 1;
            }
            Err(e) => {
                drop(client);
                errors.push(format!("Tag '{}': {}", name, e));
            }
        }
    }

    Ok(count)
}

fn migrate_projects(
    conn: &Connection,
    supabase: &Arc<Mutex<SupabaseClient>>,
    user_id: &str,
    errors: &mut Vec<String>,
) -> Result<usize, String> {
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
        let client = supabase.lock().map_err(|e| e.to_string())?;
        match api::insert(&client, "projects", payload) {
            Ok(result) => {
                drop(client);
                if let Some(remote_id) = result.get("id").and_then(|v| v.as_i64()) {
                    conn.execute(
                        "UPDATE projects SET remote_id = ?1, sync_status = 'synced' WHERE id = ?2",
                        params![remote_id, local_id],
                    ).ok();
                }
                count += 1;
            }
            Err(e) => {
                drop(client);
                let name = payload.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                errors.push(format!("Project '{}': {}", name, e));
            }
        }
    }

    Ok(count)
}

fn migrate_project_tags(
    conn: &Connection,
    supabase: &Arc<Mutex<SupabaseClient>>,
    errors: &mut Vec<String>,
) -> Result<usize, String> {
    let mut stmt = conn.prepare("SELECT project_id, tag_id FROM project_tags")
        .map_err(|e| e.to_string())?;
    let entries: Vec<(i64, i64)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
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
            let client = supabase.lock().map_err(|e| e.to_string())?;
            match api::upsert(&client, "project_tags", &payload) {
                Ok(_) => {
                    drop(client);
                    conn.execute(
                        "UPDATE project_tags SET sync_status = 'synced' WHERE project_id = ?1 AND tag_id = ?2",
                        params![project_id, tag_id],
                    ).ok();
                    count += 1;
                }
                Err(e) => {
                    drop(client);
                    errors.push(format!("project_tag ({}, {}): {}", project_id, tag_id, e));
                }
            }
        }
    }

    Ok(count)
}

fn migrate_child_table(
    conn: &Connection,
    supabase: &Arc<Mutex<SupabaseClient>>,
    table: &str,
    user_id: &str,
    errors: &mut Vec<String>,
) -> Result<usize, String> {
    // Get all IDs from the table
    let mut stmt = conn.prepare(&format!("SELECT id FROM {}", table))
        .map_err(|e| e.to_string())?;
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
        // Reuse the push payload builder from sync.rs
        let payload = crate::supabase::sync::build_push_payload(conn, table, *local_id, user_id);
        let payload = match payload {
            Ok(p) => p,
            Err(e) => {
                errors.push(format!("{}.{}: {}", table, local_id, e));
                continue;
            }
        };

        let client = supabase.lock().map_err(|e| e.to_string())?;
        match api::insert(&client, table, &payload) {
            Ok(result) => {
                drop(client);
                if let Some(remote_id) = result.get("id").and_then(|v| v.as_i64()) {
                    conn.execute(
                        &format!("UPDATE {} SET remote_id = ?1, sync_status = 'synced' WHERE id = ?2", table),
                        params![remote_id, local_id],
                    ).ok();
                }
                count += 1;
            }
            Err(e) => {
                drop(client);
                errors.push(format!("{}.{}: {}", table, local_id, e));
            }
        }
    }

    Ok(count)
}

fn mark_all_synced(conn: &Connection) -> Result<(), String> {
    let tables = [
        "projects", "tags", "bounces", "ableton_sets", "sessions",
        "markers", "tasks", "project_notes", "project_references",
        "spotify_references", "assets", "mood_board",
    ];

    for table in &tables {
        conn.execute(
            &format!("UPDATE {} SET sync_status = 'synced' WHERE sync_status != 'synced'", table),
            [],
        ).ok();
    }

    conn.execute(
        "UPDATE project_tags SET sync_status = 'synced' WHERE sync_status != 'synced'",
        [],
    ).ok();

    Ok(())
}
