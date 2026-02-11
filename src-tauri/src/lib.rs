mod db;
mod scanner;
mod commands;
mod artwork;
mod cover_gen;
mod spotify;
mod soundcloud;
mod mp3;

use db::DbState;
use spotify::{SpotifyState, SpotifyInner};
use soundcloud::{SoundCloudState, SoundCloudInner};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .max_file_size(5_000_000) // 5MB
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .build(),
        )
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            let conn = db::init_db(&app_data_dir).expect("Failed to initialize database");
            app.manage(DbState(Mutex::new(conn)));
            app.manage(SpotifyState(Mutex::new(SpotifyInner {
                client_token: None,
                user_auth: None,
                pkce_pending: None,
            })));
            app.manage(SoundCloudState(Mutex::new(SoundCloudInner {
                user_auth: None,
                pkce_pending: None,
            })));

            // Show window after setup (prevents position flash with window-state plugin)
            if let Some(window) = app.get_webview_window("main") {
                window.show().ok();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::scanner::refresh_library,
            commands::scanner::discover_untracked_projects,
            commands::scanner::add_project,
            commands::scanner::import_projects,
            commands::projects::get_projects,
            commands::projects::get_project_detail,
            commands::projects::update_project,
            commands::tags::get_all_tags,
            commands::tags::create_tag,
            commands::tags::add_tag_to_project,
            commands::tags::remove_tag_from_project,
            commands::artwork::upload_artwork,
            commands::ableton::open_in_ableton,
            commands::ableton::open_bounces_folder,
            commands::bounces::get_bounces_for_project,
            commands::sets::get_sets_for_project,
            commands::sets::set_current_set,
            commands::sessions::start_session,
            commands::sessions::stop_session,
            commands::sessions::get_sessions,
            commands::sessions::get_incomplete_sessions,
            commands::sessions::resolve_session,
            commands::markers::get_markers,
            commands::markers::create_marker,
            commands::markers::update_marker,
            commands::markers::delete_marker,
            commands::tasks::get_tasks,
            commands::tasks::create_task,
            commands::tasks::update_task,
            commands::tasks::delete_task,
            commands::references::get_references,
            commands::references::create_reference,
            commands::references::update_reference,
            commands::references::delete_reference,
            commands::assets::get_assets,
            commands::assets::upload_asset,
            commands::assets::update_asset,
            commands::assets::delete_asset,
            commands::covers::generate_cover,
            commands::covers::set_cover_from_upload,
            commands::covers::set_cover_from_moodboard,
            commands::covers::toggle_cover_lock,
            commands::covers::remove_cover,
            commands::covers::get_mood_board,
            commands::covers::pin_to_mood_board,
            commands::covers::unpin_from_mood_board,
            commands::covers::reorder_mood_board,
            commands::notes::get_notes,
            commands::notes::create_note,
            commands::notes::update_note,
            commands::notes::delete_note,
            commands::spotify::spotify_search,
            commands::spotify::get_spotify_references,
            commands::spotify::add_spotify_reference,
            commands::spotify::update_spotify_reference_notes,
            commands::spotify::delete_spotify_reference,
            commands::spotify::spotify_get_auth_status,
            commands::spotify::spotify_start_login,
            commands::spotify::spotify_wait_for_callback,
            commands::spotify::spotify_get_access_token,
            commands::spotify::spotify_logout,
            commands::share::share_bounce,
            commands::soundcloud::sc_get_auth_status,
            commands::soundcloud::sc_start_login,
            commands::soundcloud::sc_wait_for_callback,
            commands::soundcloud::sc_upload_bounce,
            commands::soundcloud::sc_logout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
