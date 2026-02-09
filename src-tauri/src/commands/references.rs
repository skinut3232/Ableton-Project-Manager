use tauri::State;
use crate::db::DbState;
use crate::db::models::ProjectReference;
use crate::db::queries;

#[tauri::command]
pub fn get_references(state: State<DbState>, project_id: i64) -> Result<Vec<ProjectReference>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_references_for_project(&conn, project_id)
}

#[tauri::command]
pub fn create_reference(
    state: State<DbState>,
    project_id: i64,
    url: String,
    title: Option<String>,
    notes: String,
) -> Result<ProjectReference, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::create_reference(&conn, project_id, &url, title, &notes)
}

#[tauri::command]
pub fn update_reference(
    state: State<DbState>,
    id: i64,
    url: Option<String>,
    title: Option<String>,
    notes: Option<String>,
) -> Result<ProjectReference, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::update_reference(&conn, id, url, title, notes)
}

#[tauri::command]
pub fn delete_reference(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::delete_reference(&conn, id)
}
