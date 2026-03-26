use tauri::{AppHandle, Manager, State};
use tauri::Emitter;
use crate::db::DbState;
use crate::db::models::{ScanSummary, DiscoveredProject};
use crate::db::queries;
use crate::scanner::walker;
use crate::scanner::walker::ScanProgress;

/// Kicks off a full library scan on a background thread so the UI stays
/// responsive and can render progress events in real time. The command
/// returns immediately; the "scan-progress" event with stage "complete"
/// signals the frontend when the scan is finished.
#[tauri::command]
pub fn scan_library(app: AppHandle) -> Result<(), String> {
    // Spawn the heavy scan work on a background thread so the main thread
    // remains free to deliver events and keep the WebView responsive.
    std::thread::spawn(move || {
        let state = app.state::<DbState>();
        let conn = match state.0.lock() {
            Ok(c) => c,
            Err(e) => {
                log::error!("Failed to lock DB for scan: {e}");
                return;
            }
        };

        let app_data_dir = match app.path().app_data_dir() {
            Ok(d) => d,
            Err(e) => {
                log::error!("Failed to get app data dir: {e}");
                return;
            }
        };

        let root_folder = match queries::get_setting(&conn, "root_folder") {
            Ok(Some(f)) => f,
            Ok(None) => {
                log::error!("Root folder not configured");
                return;
            }
            Err(e) => {
                log::error!("Failed to get root_folder setting: {e}");
                return;
            }
        };

        let bounce_folder_name = queries::get_setting(&conn, "bounce_folder_name")
            .ok()
            .flatten()
            .unwrap_or_else(|| "Bounces".to_string());

        match walker::scan_library(&conn, &root_folder, &bounce_folder_name, &app_data_dir, &app) {
            Ok(summary) => {
                log::info!("Scan complete: {} found, {} new, {} updated, {} missing, {} errors",
                    summary.found, summary.new, summary.updated, summary.missing, summary.errors.len());
            }
            Err(e) => {
                log::error!("Scan failed: {e}");
            }
        }

        // Generate covers for new projects
        walker::generate_missing_covers(&conn, &app_data_dir, &app);

        // Signal the frontend that scanning is done
        app.emit("scan-progress", ScanProgress {
            current: 0, total: 0,
            project_name: String::new(),
            stage: "complete".to_string(),
        }).ok();
    });

    Ok(())
}

#[tauri::command]
pub fn refresh_library(app: AppHandle, state: State<DbState>) -> Result<ScanSummary, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let bounce_folder_name = queries::get_setting(&conn, "bounce_folder_name")?
        .unwrap_or_else(|| "Bounces".to_string());

    let summary = walker::refresh_library(&conn, &bounce_folder_name, &app_data_dir, &app)?;

    // Generate covers for projects that need them (fast — ~50ms per cover at 300x300)
    walker::generate_missing_covers(&conn, &app_data_dir, &app);

    app.emit("scan-progress", ScanProgress {
        current: 0, total: 0,
        project_name: String::new(),
        stage: "complete".to_string(),
    }).ok();

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

    let summary = walker::add_single_project(&conn, &folder_path, &bounce_folder_name, &app_data_dir, &app)?;

    // Generate cover for the new project
    walker::generate_missing_covers(&conn, &app_data_dir, &app);

    app.emit("scan-progress", ScanProgress {
        current: 0, total: 0,
        project_name: String::new(),
        stage: "complete".to_string(),
    }).ok();

    Ok(summary)
}

#[tauri::command]
pub fn import_projects(app: AppHandle, state: State<DbState>, projects: Vec<DiscoveredProject>) -> Result<ScanSummary, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let bounce_folder_name = queries::get_setting(&conn, "bounce_folder_name")?
        .unwrap_or_else(|| "Bounces".to_string());

    let summary = walker::import_projects(&conn, &projects, &bounce_folder_name, &app_data_dir, &app)?;

    // Generate covers for imported projects
    walker::generate_missing_covers(&conn, &app_data_dir, &app);

    app.emit("scan-progress", ScanProgress {
        current: 0, total: 0,
        project_name: String::new(),
        stage: "complete".to_string(),
    }).ok();

    Ok(summary)
}
