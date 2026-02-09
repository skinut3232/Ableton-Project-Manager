use tauri::{AppHandle, Manager, State};
use crate::db::DbState;
use crate::db::models::Asset;
use crate::db::queries;
use std::path::Path;

fn detect_asset_type(filename: &str) -> &'static str {
    let ext = Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    match ext.as_str() {
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" | "svg" => "image",
        "wav" | "mp3" | "flac" | "ogg" | "aiff" | "aif" | "m4a" => "audio",
        _ => "generic",
    }
}

#[tauri::command]
pub fn get_assets(state: State<DbState>, project_id: i64) -> Result<Vec<Asset>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_assets_for_project(&conn, project_id)
}

#[tauri::command]
pub fn upload_asset(
    app: AppHandle,
    state: State<DbState>,
    project_id: i64,
    source_path: String,
) -> Result<Asset, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let assets_dir = app_data_dir.join("assets").join(project_id.to_string());
    std::fs::create_dir_all(&assets_dir)
        .map_err(|e| format!("Failed to create assets dir: {}", e))?;

    let source = Path::new(&source_path);
    let original_filename = source
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    // Timestamp-prefix to avoid collisions
    let timestamp = chrono::Utc::now().format("%Y%m%d%H%M%S").to_string();
    let dest_filename = format!("{}_{}", timestamp, original_filename);
    let dest_path = assets_dir.join(&dest_filename);

    std::fs::copy(&source_path, &dest_path)
        .map_err(|e| format!("Failed to copy asset: {}", e))?;

    let stored_path_str = dest_path.to_string_lossy().to_string();
    let asset_type = detect_asset_type(&original_filename);

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::create_asset(&conn, project_id, &original_filename, &stored_path_str, asset_type)
}

#[tauri::command]
pub fn update_asset(
    state: State<DbState>,
    id: i64,
    tags: Option<String>,
) -> Result<Asset, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::update_asset(&conn, id, tags)
}

#[tauri::command]
pub fn delete_asset(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let stored_path = queries::delete_asset(&conn, id)?;
    // Delete the file from disk
    if let Some(path) = stored_path {
        let _ = std::fs::remove_file(&path);
    }
    Ok(())
}
