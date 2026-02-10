use tauri::State;
use crate::db::DbState;
use crate::db::models::ProjectNote;
use crate::db::queries;

#[tauri::command]
pub fn get_notes(state: State<DbState>, project_id: i64) -> Result<Vec<ProjectNote>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_notes_for_project(&conn, project_id)
}

#[tauri::command]
pub fn create_note(state: State<DbState>, project_id: i64, content: String) -> Result<ProjectNote, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::create_note(&conn, project_id, &content)
}

#[tauri::command]
pub fn update_note(state: State<DbState>, id: i64, content: String) -> Result<ProjectNote, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::update_note(&conn, id, &content)
}

#[tauri::command]
pub fn delete_note(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::delete_note(&conn, id)?;
    Ok(())
}
