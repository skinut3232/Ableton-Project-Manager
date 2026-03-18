use tauri::State;
use crate::db::DbState;
use crate::db::queries;

#[tauri::command]
pub fn bulk_add_tag(state: State<DbState>, project_ids: Vec<i64>, tag_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::bulk_add_tag(&conn, &project_ids, tag_id)
}

#[tauri::command]
pub fn bulk_remove_tag(state: State<DbState>, project_ids: Vec<i64>, tag_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::bulk_remove_tag(&conn, &project_ids, tag_id)
}

#[tauri::command]
pub fn bulk_archive(state: State<DbState>, project_ids: Vec<i64>, archived: bool) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::bulk_archive(&conn, &project_ids, archived)
}

#[tauri::command]
pub fn bulk_set_genre(state: State<DbState>, project_ids: Vec<i64>, genre_label: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::bulk_set_genre(&conn, &project_ids, &genre_label)
}

#[tauri::command]
pub fn bulk_add_to_collection(state: State<DbState>, project_ids: Vec<i64>, collection_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::bulk_add_to_collection(&conn, &project_ids, collection_id)
}
