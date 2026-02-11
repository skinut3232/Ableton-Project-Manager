use tauri::State;
use crate::db::DbState;
use crate::db::models::{SpotifyReference, SpotifySearchResult};
use crate::spotify::{SpotifyState, SpotifyAuthStatus};

#[tauri::command]
pub fn spotify_search(
    spotify_state: State<'_, SpotifyState>,
    query: String,
    limit: Option<u32>,
) -> Result<Vec<SpotifySearchResult>, String> {
    let limit = limit.unwrap_or(10).min(50);
    crate::spotify::search(&spotify_state, &query, limit)
}

#[tauri::command]
pub fn get_spotify_references(
    state: State<'_, DbState>,
    project_id: i64,
) -> Result<Vec<SpotifyReference>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    crate::db::queries::get_spotify_references_for_project(&conn, project_id)
}

#[tauri::command]
pub fn add_spotify_reference(
    state: State<'_, DbState>,
    project_id: i64,
    spotify_id: String,
    spotify_type: String,
    name: String,
    artist_name: String,
    album_name: String,
    album_art_url: String,
    duration_ms: Option<i64>,
    spotify_url: String,
) -> Result<SpotifyReference, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    crate::db::queries::create_spotify_reference(
        &conn,
        project_id,
        &spotify_id,
        &spotify_type,
        &name,
        &artist_name,
        &album_name,
        &album_art_url,
        duration_ms,
        &spotify_url,
    )
}

#[tauri::command]
pub fn update_spotify_reference_notes(
    state: State<'_, DbState>,
    id: i64,
    notes: String,
) -> Result<SpotifyReference, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    crate::db::queries::update_spotify_reference_notes(&conn, id, &notes)
}

#[tauri::command]
pub fn delete_spotify_reference(
    state: State<'_, DbState>,
    id: i64,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    crate::db::queries::delete_spotify_reference(&conn, id)
}

#[tauri::command]
pub fn spotify_get_auth_status(
    spotify_state: State<'_, SpotifyState>,
    state: State<'_, DbState>,
) -> Result<SpotifyAuthStatus, String> {
    crate::spotify::get_auth_status(&spotify_state, &state)
}

#[tauri::command]
pub fn spotify_start_login(
    spotify_state: State<'_, SpotifyState>,
) -> Result<String, String> {
    crate::spotify::start_auth_flow(&spotify_state)
}

#[tauri::command]
pub fn spotify_wait_for_callback(
    spotify_state: State<'_, SpotifyState>,
    state: State<'_, DbState>,
) -> Result<SpotifyAuthStatus, String> {
    crate::spotify::wait_for_callback_and_exchange(&spotify_state, &state)
}

#[tauri::command]
pub fn spotify_get_access_token(
    spotify_state: State<'_, SpotifyState>,
    state: State<'_, DbState>,
) -> Result<String, String> {
    crate::spotify::ensure_user_token(&spotify_state, &state)
}

#[tauri::command]
pub fn spotify_logout(
    spotify_state: State<'_, SpotifyState>,
    state: State<'_, DbState>,
) -> Result<(), String> {
    crate::spotify::logout(&spotify_state, &state)
}
