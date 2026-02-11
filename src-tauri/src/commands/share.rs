use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;

use crate::mp3;

/// Convert a WAV bounce to MP3 and copy the file to the clipboard for sharing.
#[tauri::command]
pub fn share_bounce(app_handle: tauri::AppHandle, bounce_path: String) -> Result<String, String> {
    let wav_path = Path::new(&bounce_path);
    if !wav_path.exists() {
        return Err(format!("WAV file not found: {}", bounce_path));
    }

    // Determine mp3 cache directory
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let cache_dir = app_data_dir.join("mp3_cache");

    // Build output filename: same stem as WAV but with .mp3
    let stem = wav_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("bounce");
    let mp3_filename = format!("{}.mp3", stem);
    let mp3_path = cache_dir.join(&mp3_filename);

    // Check if cached MP3 is still valid (WAV hasn't been modified since)
    if !is_cache_valid(&wav_path, &mp3_path) {
        mp3::convert_wav_to_mp3(wav_path, &mp3_path)?;
    }

    // Copy the MP3 file to clipboard using PowerShell
    copy_file_to_clipboard(&mp3_path)?;

    Ok(mp3_filename)
}

/// Check if a cached MP3 file exists and is newer than the source WAV.
fn is_cache_valid(wav_path: &Path, mp3_path: &PathBuf) -> bool {
    if !mp3_path.exists() {
        return false;
    }

    let wav_modified = match std::fs::metadata(wav_path).and_then(|m| m.modified()) {
        Ok(t) => t,
        Err(_) => return false,
    };

    let mp3_modified = match std::fs::metadata(mp3_path).and_then(|m| m.modified()) {
        Ok(t) => t,
        Err(_) => return false,
    };

    mp3_modified > wav_modified
}

/// Copy a file to the Windows clipboard as a file drop list using PowerShell.
fn copy_file_to_clipboard(file_path: &Path) -> Result<(), String> {
    let path_str = file_path
        .to_str()
        .ok_or("Invalid file path encoding")?;

    // PowerShell script to copy file to clipboard as a file drop
    let ps_script = format!(
        "Add-Type -AssemblyName System.Windows.Forms; \
         $f = [System.Collections.Specialized.StringCollection]::new(); \
         $f.Add('{}'); \
         [System.Windows.Forms.Clipboard]::SetFileDropList($f)",
        path_str.replace('\'', "''")
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &ps_script])
        .output()
        .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Clipboard copy failed: {}", stderr));
    }

    Ok(())
}
