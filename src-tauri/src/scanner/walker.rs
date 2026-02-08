use std::path::{Path, PathBuf};
use std::fs;
use rusqlite::{params, Connection};
use crate::db::models::ScanSummary;

pub fn scan_library(conn: &Connection, root_folder: &str, bounce_folder_name: &str) -> Result<ScanSummary, String> {
    let root = Path::new(root_folder);
    if !root.exists() || !root.is_dir() {
        return Err(format!("Root folder does not exist: {}", root_folder));
    }

    let mut summary = ScanSummary {
        found: 0,
        new: 0,
        updated: 0,
        missing: 0,
        errors: Vec::new(),
    };

    // Collect all project directories (dirs containing .als files)
    let mut project_dirs: Vec<(PathBuf, String)> = Vec::new(); // (path, genre_label)

    match fs::read_dir(root) {
        Ok(entries) => {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_dir() {
                    continue;
                }

                let dir_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();

                // Skip hidden directories
                if dir_name.starts_with('.') {
                    continue;
                }

                // Check if this dir itself is a project (contains .als files)
                if has_als_files(&path) {
                    project_dirs.push((path, String::new())); // No genre label for root-level projects
                } else {
                    // It might be a genre folder - check one level deeper
                    if let Ok(sub_entries) = fs::read_dir(&path) {
                        for sub_entry in sub_entries.flatten() {
                            let sub_path = sub_entry.path();
                            if sub_path.is_dir() && has_als_files(&sub_path) {
                                project_dirs.push((sub_path, dir_name.clone()));
                            }
                        }
                    }
                }
            }
        }
        Err(e) => {
            return Err(format!("Failed to read root folder: {}", e));
        }
    }

    // Track found project paths
    let mut found_paths: Vec<String> = Vec::new();

    for (project_path, genre_label) in &project_dirs {
        summary.found += 1;
        let path_str = project_path.to_string_lossy().to_string();
        found_paths.push(path_str.clone());

        let project_name = project_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        match process_project(conn, &path_str, &project_name, genre_label, bounce_folder_name) {
            Ok(is_new) => {
                if is_new {
                    summary.new += 1;
                } else {
                    summary.updated += 1;
                }
            }
            Err(e) => {
                summary.errors.push(format!("{}: {}", project_name, e));
            }
        }
    }

    // Flag missing projects (paths that no longer exist)
    match flag_missing_projects(conn, &found_paths) {
        Ok(count) => summary.missing = count,
        Err(e) => summary.errors.push(format!("Failed to flag missing projects: {}", e)),
    }

    log::info!(
        "Scan complete: {} found, {} new, {} updated, {} missing, {} errors",
        summary.found, summary.new, summary.updated, summary.missing, summary.errors.len()
    );

    Ok(summary)
}

fn has_als_files(dir: &Path) -> bool {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext.to_string_lossy().to_lowercase() == "als" {
                        return true;
                    }
                }
            }
        }
    }
    false
}

fn process_project(
    conn: &Connection,
    project_path: &str,
    project_name: &str,
    genre_label: &str,
    bounce_folder_name: &str,
) -> Result<bool, String> {
    let path = Path::new(project_path);

    // Find .als files (non-recursive, skip Backup folder)
    let mut als_files: Vec<(String, String)> = Vec::new(); // (path, modified_time)
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let file_path = entry.path();
            if file_path.is_file() {
                if let Some(ext) = file_path.extension() {
                    if ext.to_string_lossy().to_lowercase() == "als" {
                        let modified = get_modified_time(&file_path);
                        als_files.push((file_path.to_string_lossy().to_string(), modified));
                    }
                }
            }
        }
    }

    // Determine current set (newest .als by modified time)
    als_files.sort_by(|a, b| b.1.cmp(&a.1));
    let newest_set = als_files.first().map(|(p, _)| p.clone());
    let last_worked_on = als_files.first().map(|(_, t)| t.clone());

    // Upsert project: INSERT OR IGNORE then UPDATE technical fields only
    let is_new = {
        let existing: Option<i64> = conn.query_row(
            "SELECT id FROM projects WHERE project_path = ?1",
            params![project_path],
            |row| row.get(0),
        ).optional().map_err(|e| e.to_string())?;

        if let Some(_id) = existing {
            // Update only technical fields - don't overwrite user fields
            // Only update current_set_path if user hasn't manually set one
            conn.execute(
                "UPDATE projects SET name = ?1, missing = 0, last_worked_on = COALESCE(?2, last_worked_on), \
                 updated_at = datetime('now') WHERE project_path = ?3 AND (current_set_path IS NULL OR current_set_path = '')",
                params![project_name, last_worked_on, project_path],
            ).map_err(|e| e.to_string())?;

            // Always update name and missing status
            conn.execute(
                "UPDATE projects SET name = ?1, missing = 0, last_worked_on = COALESCE(?2, last_worked_on), \
                 updated_at = datetime('now') WHERE project_path = ?3",
                params![project_name, last_worked_on, project_path],
            ).map_err(|e| e.to_string())?;

            // Update current_set_path only if not manually overridden
            if let Some(ref set_path) = newest_set {
                conn.execute(
                    "UPDATE projects SET current_set_path = ?1 WHERE project_path = ?2 \
                     AND (current_set_path IS NULL OR current_set_path NOT IN \
                     (SELECT set_path FROM ableton_sets WHERE project_id = (SELECT id FROM projects WHERE project_path = ?2)))",
                    params![set_path, project_path],
                ).ok(); // Ignore errors on this optional update
            }

            false
        } else {
            conn.execute(
                "INSERT INTO projects (name, project_path, genre_label, current_set_path, last_worked_on) \
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![project_name, project_path, genre_label, newest_set, last_worked_on],
            ).map_err(|e| e.to_string())?;
            true
        }
    };

    // Get project ID
    let project_id: i64 = conn.query_row(
        "SELECT id FROM projects WHERE project_path = ?1",
        params![project_path],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    // Upsert .als files
    for (set_path, modified_time) in &als_files {
        conn.execute(
            "INSERT INTO ableton_sets (project_id, set_path, modified_time) VALUES (?1, ?2, ?3) \
             ON CONFLICT(set_path) DO UPDATE SET modified_time = ?3",
            params![project_id, set_path, modified_time],
        ).map_err(|e| e.to_string())?;
    }

    // Remove sets that no longer exist on disk
    let existing_set_paths: Vec<String> = als_files.iter().map(|(p, _)| p.clone()).collect();
    if !existing_set_paths.is_empty() {
        let placeholders: Vec<String> = (0..existing_set_paths.len()).map(|i| format!("?{}", i + 2)).collect();
        let sql = format!(
            "DELETE FROM ableton_sets WHERE project_id = ?1 AND set_path NOT IN ({})",
            placeholders.join(",")
        );
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        param_values.push(Box::new(project_id));
        for p in &existing_set_paths {
            param_values.push(Box::new(p.clone()));
        }
        let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        stmt.execute(params_refs.as_slice()).map_err(|e| e.to_string())?;
    }

    // Scan bounces subfolder
    let bounces_dir = path.join(bounce_folder_name);
    if bounces_dir.exists() && bounces_dir.is_dir() {
        scan_bounces(conn, project_id, &bounces_dir)?;
    }

    Ok(is_new)
}

fn scan_bounces(conn: &Connection, project_id: i64, bounces_dir: &Path) -> Result<(), String> {
    let mut bounce_paths: Vec<String> = Vec::new();

    if let Ok(entries) = fs::read_dir(bounces_dir) {
        for entry in entries.flatten() {
            let file_path = entry.path();
            if file_path.is_file() {
                if let Some(ext) = file_path.extension() {
                    if ext.to_string_lossy().to_lowercase() == "wav" {
                        let path_str = file_path.to_string_lossy().to_string();
                        let modified = get_modified_time(&file_path);
                        let duration = super::wav_parser::parse_wav_duration(&file_path).ok();

                        conn.execute(
                            "INSERT INTO bounces (project_id, bounce_path, modified_time, duration_seconds) \
                             VALUES (?1, ?2, ?3, ?4) \
                             ON CONFLICT(bounce_path) DO UPDATE SET modified_time = ?3, duration_seconds = ?4",
                            params![project_id, path_str, modified, duration],
                        ).map_err(|e| e.to_string())?;

                        bounce_paths.push(path_str);
                    }
                }
            }
        }
    }

    // Remove bounces that no longer exist
    if !bounce_paths.is_empty() {
        let placeholders: Vec<String> = (0..bounce_paths.len()).map(|i| format!("?{}", i + 2)).collect();
        let sql = format!(
            "DELETE FROM bounces WHERE project_id = ?1 AND bounce_path NOT IN ({})",
            placeholders.join(",")
        );
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        param_values.push(Box::new(project_id));
        for p in &bounce_paths {
            param_values.push(Box::new(p.clone()));
        }
        let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        stmt.execute(params_refs.as_slice()).map_err(|e| e.to_string())?;
    } else {
        // No bounces found - remove all existing
        conn.execute("DELETE FROM bounces WHERE project_id = ?1", params![project_id])
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn flag_missing_projects(conn: &Connection, found_paths: &[String]) -> Result<usize, String> {
    if found_paths.is_empty() {
        // If no projects found at all, mark all as missing
        let count = conn.execute("UPDATE projects SET missing = 1 WHERE missing = 0", [])
            .map_err(|e| e.to_string())?;
        return Ok(count);
    }

    let placeholders: Vec<String> = (0..found_paths.len()).map(|i| format!("?{}", i + 1)).collect();
    let sql = format!(
        "UPDATE projects SET missing = 1 WHERE project_path NOT IN ({}) AND missing = 0",
        placeholders.join(",")
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let params: Vec<&dyn rusqlite::types::ToSql> = found_paths.iter().map(|p| p as &dyn rusqlite::types::ToSql).collect();
    let count = stmt.execute(params.as_slice()).map_err(|e| e.to_string())?;

    // Also unflag previously missing projects that are found again
    let sql2 = format!(
        "UPDATE projects SET missing = 0 WHERE project_path IN ({}) AND missing = 1",
        placeholders.join(",")
    );
    let mut stmt2 = conn.prepare(&sql2).map_err(|e| e.to_string())?;
    stmt2.execute(params.as_slice()).map_err(|e| e.to_string())?;

    Ok(count)
}

fn get_modified_time(path: &Path) -> String {
    fs::metadata(path)
        .and_then(|m| m.modified())
        .map(|t| {
            let datetime: chrono::DateTime<chrono::Utc> = t.into();
            datetime.format("%Y-%m-%d %H:%M:%S").to_string()
        })
        .unwrap_or_else(|_| chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string())
}

use rusqlite::OptionalExtension;
