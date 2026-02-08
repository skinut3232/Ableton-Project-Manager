use tauri::State;
use crate::db::DbState;
use crate::db::models::ScanSummary;
use crate::db::queries;
use crate::scanner::walker;

#[tauri::command]
pub fn scan_library(state: State<DbState>) -> Result<ScanSummary, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let root_folder = queries::get_setting(&conn, "root_folder")?
        .ok_or("Root folder not configured. Please set it in Settings.")?;

    let bounce_folder_name = queries::get_setting(&conn, "bounce_folder_name")?
        .unwrap_or_else(|| "Bounces".to_string());

    walker::scan_library(&conn, &root_folder, &bounce_folder_name)
}
