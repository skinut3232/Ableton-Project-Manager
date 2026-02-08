use tauri::State;
use crate::db::DbState;
use crate::db::models::AbletonSet;
use crate::db::queries;

#[tauri::command]
pub fn get_sets_for_project(state: State<DbState>, project_id: i64) -> Result<Vec<AbletonSet>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_sets_for_project(&conn, project_id)
}

#[tauri::command]
pub fn set_current_set(state: State<DbState>, project_id: i64, set_path: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::set_current_set(&conn, project_id, &set_path)
}
