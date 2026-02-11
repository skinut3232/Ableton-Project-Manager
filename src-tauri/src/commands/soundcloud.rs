use tauri::State;
use crate::db::DbState;
use crate::soundcloud::{SoundCloudState, SoundCloudAuthStatus, SoundCloudUploadResult};

#[tauri::command]
pub fn sc_get_auth_status(
    sc_state: State<'_, SoundCloudState>,
    state: State<'_, DbState>,
) -> Result<SoundCloudAuthStatus, String> {
    crate::soundcloud::get_auth_status(&sc_state, &state)
}

#[tauri::command]
pub fn sc_start_login(
    sc_state: State<'_, SoundCloudState>,
) -> Result<String, String> {
    crate::soundcloud::start_auth_flow(&sc_state)
}

#[tauri::command]
pub fn sc_wait_for_callback(
    sc_state: State<'_, SoundCloudState>,
    state: State<'_, DbState>,
) -> Result<SoundCloudAuthStatus, String> {
    crate::soundcloud::wait_for_callback_and_exchange(&sc_state, &state)
}

#[tauri::command]
pub fn sc_upload_bounce(
    sc_state: State<'_, SoundCloudState>,
    state: State<'_, DbState>,
    bounce_path: String,
    title: String,
    genre: String,
    tags: String,
    bpm: Option<f64>,
    description: Option<String>,
    sharing: Option<String>,
) -> Result<SoundCloudUploadResult, String> {
    let sharing_value = sharing.unwrap_or_else(|| {
        let conn = state.0.lock().ok();
        conn.and_then(|c| crate::db::queries::get_setting(&c, "soundcloud_public_upload").ok().flatten())
            .map(|v| if v == "true" { "public".to_string() } else { "private".to_string() })
            .unwrap_or_else(|| "private".to_string())
    });
    crate::soundcloud::upload_track(
        &sc_state,
        &state,
        &bounce_path,
        &title,
        &genre,
        &tags,
        bpm,
        &description.unwrap_or_default(),
        &sharing_value,
    )
}

#[tauri::command]
pub fn sc_logout(
    sc_state: State<'_, SoundCloudState>,
    state: State<'_, DbState>,
) -> Result<(), String> {
    crate::soundcloud::logout(&sc_state, &state)
}
