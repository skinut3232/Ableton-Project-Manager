use tauri::State;
use crate::db::DbState;
use crate::db::models::Setting;
use crate::db::queries;

#[tauri::command]
pub fn get_settings(state: State<DbState>) -> Result<Vec<Setting>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_all_settings(&conn)
}

#[tauri::command]
pub fn update_settings(state: State<DbState>, settings: Vec<Setting>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    for setting in settings {
        queries::set_setting(&conn, &setting.key, &setting.value)?;
    }
    Ok(())
}
