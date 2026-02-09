use tauri::State;
use crate::db::DbState;
use crate::db::models::Marker;
use crate::db::queries;

#[tauri::command]
pub fn get_markers(state: State<DbState>, project_id: i64) -> Result<Vec<Marker>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_markers_for_project(&conn, project_id)
}

#[tauri::command]
pub fn create_marker(
    state: State<DbState>,
    project_id: i64,
    bounce_id: Option<i64>,
    timestamp_seconds: f64,
    marker_type: String,
    text: String,
) -> Result<Marker, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::create_marker(&conn, project_id, bounce_id, timestamp_seconds, &marker_type, &text)
}

#[tauri::command]
pub fn update_marker(
    state: State<DbState>,
    id: i64,
    timestamp_seconds: Option<f64>,
    marker_type: Option<String>,
    text: Option<String>,
) -> Result<Marker, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::update_marker(&conn, id, timestamp_seconds, marker_type, text)
}

#[tauri::command]
pub fn delete_marker(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::delete_marker(&conn, id)
}
