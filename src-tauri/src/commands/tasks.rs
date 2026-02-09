use tauri::State;
use crate::db::DbState;
use crate::db::models::ProjectTask;
use crate::db::queries;

#[tauri::command]
pub fn get_tasks(state: State<DbState>, project_id: i64) -> Result<Vec<ProjectTask>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_tasks_for_project(&conn, project_id)
}

#[tauri::command]
pub fn create_task(
    state: State<DbState>,
    project_id: i64,
    title: String,
    category: String,
    linked_marker_id: Option<i64>,
    linked_timestamp_seconds: Option<f64>,
) -> Result<ProjectTask, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::create_task(&conn, project_id, &title, &category, linked_marker_id, linked_timestamp_seconds)
}

#[tauri::command]
pub fn update_task(
    state: State<DbState>,
    id: i64,
    title: Option<String>,
    done: Option<bool>,
    category: Option<String>,
    linked_marker_id: Option<i64>,
    linked_timestamp_seconds: Option<f64>,
) -> Result<ProjectTask, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::update_task(&conn, id, title, done, category, linked_marker_id, linked_timestamp_seconds)
}

#[tauri::command]
pub fn delete_task(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::delete_task(&conn, id)
}
