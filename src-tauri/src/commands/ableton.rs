use std::process::Command;
use tauri::State;
use crate::db::DbState;
use crate::db::queries;

#[tauri::command]
pub fn open_in_ableton(state: State<DbState>, set_path: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let ableton_path = queries::get_setting(&conn, "ableton_exe_path")?
        .ok_or("Ableton exe path not configured. Please set it in Settings.")?;

    // On macOS, Ableton is a .app bundle — use `open -a` to launch it
    #[cfg(target_os = "macos")]
    Command::new("open")
        .args(["-a", &ableton_path, &set_path])
        .spawn()
        .map_err(|e| format!("Failed to launch Ableton: {}", e))?;

    // On Windows, run the .exe directly
    #[cfg(target_os = "windows")]
    Command::new(&ableton_path)
        .arg(&set_path)
        .spawn()
        .map_err(|e| format!("Failed to launch Ableton: {}", e))?;

    log::info!("Launched Ableton with set: {}", set_path);
    Ok(())
}

#[tauri::command]
pub fn open_bounces_folder(path: String) -> Result<(), String> {
    // Use platform-native file manager
    #[cfg(target_os = "windows")]
    Command::new("explorer.exe")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;

    #[cfg(target_os = "macos")]
    Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;

    Ok(())
}
