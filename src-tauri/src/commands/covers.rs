use tauri::{AppHandle, Manager, State};
use crate::db::DbState;
use crate::db::models::{Project, MoodBoardPin};
use crate::db::queries;
use crate::artwork::process_artwork;
use crate::cover_gen;

#[tauri::command]
pub fn generate_cover(
    app: AppHandle,
    state: State<DbState>,
    project_id: i64,
    seed: Option<String>,
    style_preset: Option<String>,
) -> Result<Project, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let actual_seed = seed.unwrap_or_else(|| format!("proj_{}", project_id));
    let cover_dir = app_data_dir.join("covers").join("generated").join(project_id.to_string());

    let preset_ref = style_preset.as_deref();
    let thumb_path = cover_gen::generate_cover(&actual_seed, &cover_dir, preset_ref)?;
    let thumb_str = thumb_path.to_string_lossy().to_string();

    let stored_preset = preset_ref.unwrap_or("default");
    queries::set_cover(
        &conn,
        project_id,
        "generated",
        Some(&thumb_str),
        Some(&actual_seed),
        Some(stored_preset),
        None,
    )?;

    queries::get_project_by_id(&conn, project_id)
}

#[tauri::command]
pub fn set_cover_from_upload(
    app: AppHandle,
    state: State<DbState>,
    project_id: i64,
    source_path: String,
) -> Result<Project, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let artwork_dir = app_data_dir.join("artwork").join(project_id.to_string());
    std::fs::create_dir_all(&artwork_dir)
        .map_err(|e| format!("Failed to create artwork dir: {}", e))?;

    let thumbnail_path = process_artwork(&source_path, &artwork_dir)?;
    let thumb_str = thumbnail_path.to_string_lossy().to_string();

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::set_cover(&conn, project_id, "uploaded", Some(&thumb_str), None, None, None)?;

    queries::get_project_by_id(&conn, project_id)
}

#[tauri::command]
pub fn set_cover_from_moodboard(
    app: AppHandle,
    state: State<DbState>,
    project_id: i64,
    asset_id: i64,
) -> Result<Project, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Get the asset's stored_path
    let asset_path: String = conn
        .query_row(
            "SELECT stored_path FROM assets WHERE id = ?1 AND project_id = ?2",
            rusqlite::params![asset_id, project_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Asset not found: {}", e))?;

    // Process through artwork pipeline (creates thumbnail)
    let artwork_dir = app_data_dir.join("artwork").join(project_id.to_string());
    std::fs::create_dir_all(&artwork_dir)
        .map_err(|e| format!("Failed to create artwork dir: {}", e))?;

    let thumbnail_path = process_artwork(&asset_path, &artwork_dir)?;
    let thumb_str = thumbnail_path.to_string_lossy().to_string();

    queries::set_cover(
        &conn,
        project_id,
        "moodboard",
        Some(&thumb_str),
        None,
        None,
        Some(asset_id),
    )?;

    queries::get_project_by_id(&conn, project_id)
}

#[tauri::command]
pub fn toggle_cover_lock(
    state: State<DbState>,
    project_id: i64,
) -> Result<Project, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let project = queries::get_project_by_id(&conn, project_id)?;
    queries::set_cover_locked(&conn, project_id, !project.cover_locked)?;
    queries::get_project_by_id(&conn, project_id)
}

#[tauri::command]
pub fn remove_cover(
    state: State<DbState>,
    project_id: i64,
) -> Result<Project, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::set_cover(&conn, project_id, "none", None, None, None, None)?;
    queries::get_project_by_id(&conn, project_id)
}

#[tauri::command]
pub fn get_mood_board(
    state: State<DbState>,
    project_id: i64,
) -> Result<Vec<MoodBoardPin>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_mood_board_pins(&conn, project_id)
}

#[tauri::command]
pub fn pin_to_mood_board(
    state: State<DbState>,
    project_id: i64,
    asset_id: i64,
) -> Result<MoodBoardPin, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::add_mood_board_pin(&conn, project_id, asset_id)
}

#[tauri::command]
pub fn unpin_from_mood_board(
    state: State<DbState>,
    pin_id: i64,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::remove_mood_board_pin(&conn, pin_id)
}

#[tauri::command]
pub fn reorder_mood_board(
    state: State<DbState>,
    project_id: i64,
    pin_ids: Vec<i64>,
) -> Result<Vec<MoodBoardPin>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::reorder_mood_board_pins(&conn, project_id, &pin_ids)?;
    queries::get_mood_board_pins(&conn, project_id)
}
