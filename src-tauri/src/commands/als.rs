use tauri::State;
use crate::db::DbState;
use crate::db::models::{PluginInfo, SampleWithStatus};
use crate::db::queries;

#[tauri::command]
pub fn get_project_plugins(state: State<DbState>, project_id: i64) -> Result<Vec<PluginInfo>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_project_plugins(&conn, project_id)
}

#[tauri::command]
pub fn get_project_samples(state: State<DbState>, project_id: i64) -> Result<Vec<SampleWithStatus>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_project_samples(&conn, project_id)
}
