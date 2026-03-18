use tauri::State;
use crate::db::DbState;
use crate::db::models::LibraryHealth;
use crate::db::queries;

#[tauri::command]
pub fn get_library_health(state: State<DbState>, stale_threshold_days: Option<i64>) -> Result<LibraryHealth, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_library_health(&conn, stale_threshold_days.unwrap_or(30))
}
