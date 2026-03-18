use tauri::State;
use crate::db::DbState;
use crate::db::models::{Collection, SmartCollectionRule, SmartCollectionRuleInput};
use crate::db::queries;

#[tauri::command]
pub fn get_collections(state: State<DbState>) -> Result<Vec<Collection>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_all_collections(&conn)
}

#[tauri::command]
pub fn create_collection(state: State<DbState>, name: String, collection_type: String, icon: String) -> Result<Collection, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::create_collection(&conn, &name, &collection_type, &icon)
}

#[tauri::command]
pub fn update_collection(state: State<DbState>, id: i64, name: Option<String>, icon: Option<String>) -> Result<Collection, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::update_collection(&conn, id, name.as_deref(), icon.as_deref())
}

#[tauri::command]
pub fn delete_collection(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::delete_collection(&conn, id)
}

#[tauri::command]
pub fn reorder_collections(state: State<DbState>, ids: Vec<i64>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::reorder_collections(&conn, &ids)
}

#[tauri::command]
pub fn get_smart_collection_rules(state: State<DbState>, collection_id: i64) -> Result<Vec<SmartCollectionRule>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_smart_collection_rules(&conn, collection_id)
}

#[tauri::command]
pub fn set_smart_collection_rules(state: State<DbState>, collection_id: i64, rules: Vec<SmartCollectionRuleInput>) -> Result<Vec<SmartCollectionRule>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::set_smart_collection_rules(&conn, collection_id, &rules)
}

#[tauri::command]
pub fn add_project_to_collection(state: State<DbState>, collection_id: i64, project_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::add_project_to_collection(&conn, collection_id, project_id)
}

#[tauri::command]
pub fn remove_project_from_collection(state: State<DbState>, collection_id: i64, project_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::remove_project_from_collection(&conn, collection_id, project_id)
}

#[tauri::command]
pub fn reorder_collection_projects(state: State<DbState>, collection_id: i64, project_ids: Vec<i64>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::reorder_collection_projects(&conn, collection_id, &project_ids)
}
