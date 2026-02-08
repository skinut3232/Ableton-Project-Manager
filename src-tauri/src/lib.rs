mod db;
mod scanner;
mod commands;
mod artwork;

use db::DbState;
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

            // Show window after setup (prevents position flash with window-state plugin)
            if let Some(window) = app.get_webview_window("main") {
                window.show().ok();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::scanner::scan_library,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
