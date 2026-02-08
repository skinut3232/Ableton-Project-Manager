use tauri::State;
use crate::db::DbState;
use crate::db::models::Tag;
use crate::db::queries;

#[tauri::command]
pub fn get_all_tags(state: State<DbState>) -> Result<Vec<Tag>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_all_tags(&conn)
}

#[tauri::command]
pub fn create_tag(state: State<DbState>, name: String) -> Result<Tag, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::create_tag(&conn, &name)
}

#[tauri::command]
pub fn add_tag_to_project(state: State<DbState>, project_id: i64, tag_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::add_tag_to_project(&conn, project_id, tag_id)
}

#[tauri::command]
pub fn remove_tag_from_project(state: State<DbState>, project_id: i64, tag_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::remove_tag_from_project(&conn, project_id, tag_id)
}
