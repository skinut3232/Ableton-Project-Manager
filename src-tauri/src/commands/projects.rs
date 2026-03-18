use tauri::State;
use crate::db::DbState;
use crate::db::models::*;
use crate::db::queries;

#[tauri::command]
pub fn get_projects(state: State<DbState>, filters: ProjectFilters) -> Result<Vec<Project>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_projects(&conn, &filters)
}

#[tauri::command]
pub fn get_project_detail(state: State<DbState>, id: i64) -> Result<ProjectDetail, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_project_detail(&conn, id)
}

#[tauri::command]
pub fn update_project(
    state: State<DbState>,
    id: i64,
    name: Option<String>,
    status: Option<String>,
    rating: Option<i64>,
    bpm: Option<f64>,
    in_rotation: Option<bool>,
    notes: Option<String>,
    genre_label: Option<String>,
    musical_key: Option<String>,
    archived: Option<bool>,
    progress: Option<i64>,
) -> Result<Project, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::update_project(&conn, id, name, status, rating, bpm, in_rotation, notes, genre_label, musical_key, archived, progress)
}

#[tauri::command]
pub fn get_all_genres(state: State<DbState>) -> Result<Vec<String>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_all_genres(&conn)
}

#[tauri::command]
pub fn quick_create_project(state: State<DbState>, name: String, parent_folder: String) -> Result<Project, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Project name cannot be empty".to_string());
    }

    let project_path = std::path::Path::new(&parent_folder).join(trimmed);
    let project_path_str = project_path.to_string_lossy().to_string();

    // Create directory
    std::fs::create_dir_all(&project_path)
        .map_err(|e| format!("Failed to create project folder: {}", e))?;

    // Create Bounces subfolder (use default name "Bounces")
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let bounce_folder_name = queries::get_setting(&conn, "bounce_folder_name")?
        .unwrap_or_else(|| "Bounces".to_string());
    let bounces_dir = project_path.join(&bounce_folder_name);
    std::fs::create_dir_all(&bounces_dir)
        .map_err(|e| format!("Failed to create bounces folder: {}", e))?;

    // Insert into DB
    queries::create_project(&conn, trimmed, &project_path_str)
}
