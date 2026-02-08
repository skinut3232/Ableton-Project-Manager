use tauri::{AppHandle, Manager, State};
use crate::db::DbState;
use crate::db::queries;
use crate::artwork::process_artwork;

#[tauri::command]
pub fn upload_artwork(
    app: AppHandle,
    state: State<DbState>,
    project_id: i64,
    source_path: String,
) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let artwork_dir = app_data_dir.join("artwork").join(project_id.to_string());
    std::fs::create_dir_all(&artwork_dir).map_err(|e| format!("Failed to create artwork dir: {}", e))?;

    let thumbnail_path = process_artwork(&source_path, &artwork_dir)?;
    let thumbnail_str = thumbnail_path.to_string_lossy().to_string();

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::set_artwork_path(&conn, project_id, &thumbnail_str)?;

    Ok(thumbnail_str)
}
