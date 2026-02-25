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
