use tauri::{AppHandle, Manager, State};
use crate::db::DbState;
use crate::db::models::{ScanSummary, DiscoveredProject};
use crate::db::queries;
use crate::scanner::walker;

#[tauri::command]
pub fn refresh_library(app: AppHandle, state: State<DbState>) -> Result<ScanSummary, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let bounce_folder_name = queries::get_setting(&conn, "bounce_folder_name")?
        .unwrap_or_else(|| "Bounces".to_string());

    let summary = walker::refresh_library(&conn, &bounce_folder_name, &app_data_dir)?;

    // Generate covers for projects that need them (fast — ~50ms per cover at 300x300)
    walker::generate_missing_covers(&conn, &app_data_dir);

    Ok(summary)
}

#[tauri::command]
pub fn discover_untracked_projects(state: State<DbState>) -> Result<Vec<DiscoveredProject>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let root_folder = queries::get_setting(&conn, "root_folder")?
        .ok_or("Root folder not configured. Please set it in Settings.")?;

    walker::discover_untracked_projects(&conn, &root_folder)
}

#[tauri::command]
pub fn add_project(app: AppHandle, state: State<DbState>, folder_path: String) -> Result<ScanSummary, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let bounce_folder_name = queries::get_setting(&conn, "bounce_folder_name")?
        .unwrap_or_else(|| "Bounces".to_string());

    let summary = walker::add_single_project(&conn, &folder_path, &bounce_folder_name, &app_data_dir)?;

    // Generate cover for the new project
    walker::generate_missing_covers(&conn, &app_data_dir);

    Ok(summary)
}

#[tauri::command]
pub fn import_projects(app: AppHandle, state: State<DbState>, projects: Vec<DiscoveredProject>) -> Result<ScanSummary, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let bounce_folder_name = queries::get_setting(&conn, "bounce_folder_name")?
        .unwrap_or_else(|| "Bounces".to_string());

    let summary = walker::import_projects(&conn, &projects, &bounce_folder_name, &app_data_dir)?;

    // Generate covers for imported projects
    walker::generate_missing_covers(&conn, &app_data_dir);

    Ok(summary)
}
