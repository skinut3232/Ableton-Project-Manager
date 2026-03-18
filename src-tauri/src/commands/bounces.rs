use tauri::State;
use crate::db::DbState;
use crate::db::models::Bounce;
use crate::db::queries;

#[tauri::command]
pub fn get_bounces_for_project(state: State<DbState>, project_id: i64) -> Result<Vec<Bounce>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_bounces_for_project(&conn, project_id)
}

#[tauri::command]
pub fn update_bounce_notes(state: State<DbState>, id: i64, notes: String) -> Result<Bounce, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::update_bounce_notes(&conn, id, &notes)
}
