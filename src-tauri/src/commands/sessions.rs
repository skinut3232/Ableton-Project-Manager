use tauri::State;
use crate::db::DbState;
use crate::db::models::Session;
use crate::db::queries;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct IncompleteSession {
    pub session: Session,
    pub project_name: String,
}

#[tauri::command]
pub fn start_session(state: State<DbState>, project_id: i64) -> Result<Session, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::start_session(&conn, project_id)
}

#[tauri::command]
pub fn stop_session(state: State<DbState>, session_id: i64, note: String) -> Result<Session, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::stop_session(&conn, session_id, &note)
}

#[tauri::command]
pub fn get_sessions(state: State<DbState>, project_id: i64) -> Result<Vec<Session>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_sessions_for_project(&conn, project_id)
}

#[tauri::command]
pub fn get_incomplete_sessions(state: State<DbState>) -> Result<Vec<IncompleteSession>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let results = queries::get_incomplete_sessions(&conn)?;
    Ok(results.into_iter().map(|(session, project_name)| IncompleteSession {
        session,
        project_name,
    }).collect())
}

#[tauri::command]
pub fn resolve_session(state: State<DbState>, session_id: i64, save: bool, note: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::resolve_session(&conn, session_id, save, &note)
}
