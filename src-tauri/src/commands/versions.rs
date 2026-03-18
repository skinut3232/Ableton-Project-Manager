use tauri::State;
use crate::db::DbState;
use crate::db::models::{VersionTimelineEntry, VersionNote};
use crate::db::queries;

#[tauri::command]
pub fn get_version_timeline(state: State<DbState>, project_id: i64) -> Result<Vec<VersionTimelineEntry>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_version_timeline(&conn, project_id)
}

#[tauri::command]
pub fn upsert_version_note(state: State<DbState>, set_id: i64, project_id: i64, note: String) -> Result<VersionNote, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::upsert_version_note(&conn, set_id, project_id, &note)
}

#[tauri::command]
pub fn delete_version_note(state: State<DbState>, set_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::delete_version_note(&conn, set_id)
}
