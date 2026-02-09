use std::path::{Path, PathBuf};
use std::fs;
use rusqlite::{params, Connection};
use crate::db::models::ScanSummary;
use crate::cover_gen;

pub fn scan_library(conn: &Connection, root_folder: &str, bounce_folder_name: &str, app_data_dir: &Path) -> Result<ScanSummary, String> {
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

        match process_project(conn, &path_str, &project_name, genre_label, bounce_folder_name, app_data_dir) {
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

pub(crate) fn has_als_files(dir: &Path) -> bool {
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

pub(crate) fn process_project(
    conn: &Connection,
    project_path: &str,
    project_name: &str,
    genre_label: &str,
    bounce_folder_name: &str,
    _app_data_dir: &Path,
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
            // Update only technical fields - don't overwrite user-editable fields (name, genre_label, etc.)
            conn.execute(
                "UPDATE projects SET missing = 0, last_worked_on = COALESCE(?1, last_worked_on), \
                 updated_at = datetime('now') WHERE project_path = ?2",
                params![last_worked_on, project_path],
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

            // Populate FTS index for the new project (no auto-trigger in standalone FTS)
            let new_id: i64 = conn.query_row(
                "SELECT id FROM projects WHERE project_path = ?1",
                params![project_path],
                |row| row.get(0),
            ).map_err(|e| e.to_string())?;
            crate::db::queries::rebuild_fts_tags(conn, new_id)?;

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

/// Generate covers for all projects that need one (cover_type='none' and not locked).
/// Called separately from the scan to avoid holding the DB lock during image generation.
pub fn generate_missing_covers(conn: &Connection, app_data_dir: &Path) {
    use crate::db::queries;

    // Collect project IDs needing covers
    let mut stmt = match conn.prepare(
        "SELECT id, cover_type, cover_locked, cover_seed, artwork_path FROM projects WHERE archived = 0"
    ) {
        Ok(s) => s,
        Err(_) => return,
    };

    struct CoverJob {
        project_id: i64,
        seed: String,
    }

    let rows: Vec<(i64, String, bool, Option<String>, Option<String>)> = match stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, bool>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
            ))
        }) {
            Ok(mapped) => mapped.filter_map(|r| r.ok()).collect(),
            Err(_) => return,
        };

    let jobs: Vec<CoverJob> = rows
        .into_iter()
        .filter_map(|(id, cover_type, locked, seed, artwork_path)| {
            if locked {
                return None;
            }
            if cover_type == "uploaded" || cover_type == "moodboard" {
                return None;
            }
            if cover_type == "generated" {
                // Only regenerate if file is missing
                if let Some(ref ap) = artwork_path {
                    if !std::path::Path::new(ap).exists() {
                        let s = seed.unwrap_or_else(|| format!("proj_{}", id));
                        return Some(CoverJob { project_id: id, seed: s });
                    }
                }
                return None;
            }
            // cover_type = 'none' → needs generation
            Some(CoverJob {
                project_id: id,
                seed: format!("proj_{}", id),
            })
        })
        .collect();

    drop(stmt);

    if jobs.is_empty() {
        return;
    }

    log::info!("Generating covers for {} projects...", jobs.len());
    let mut generated = 0;
    for job in &jobs {
        let cover_dir = app_data_dir.join("covers").join("generated").join(job.project_id.to_string());
        match cover_gen::generate_cover(&job.seed, &cover_dir) {
            Ok(thumb) => {
                let thumb_str = thumb.to_string_lossy().to_string();
                queries::set_cover(conn, job.project_id, "generated", Some(&thumb_str), Some(&job.seed), Some("default"), None).ok();
                generated += 1;
            }
            Err(e) => {
                log::warn!("Failed to generate cover for project {}: {}", job.project_id, e);
            }
        }
    }
    log::info!("Generated {} covers", generated);
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
use crate::db::models::DiscoveredProject;

/// Refresh metadata for all non-archived projects already in the DB.
/// Does NOT discover new projects.
pub fn refresh_library(conn: &Connection, bounce_folder_name: &str, app_data_dir: &Path) -> Result<ScanSummary, String> {
    let mut summary = ScanSummary {
        found: 0,
        new: 0,
        updated: 0,
        missing: 0,
        errors: Vec::new(),
    };

    // Get all non-archived projects from DB
    let mut stmt = conn.prepare(
        "SELECT id, project_path, name, genre_label FROM projects WHERE archived = 0"
    ).map_err(|e| e.to_string())?;

    let rows: Vec<(i64, String, String, String)> = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
    }).map_err(|e| e.to_string())?
      .filter_map(|r| r.ok())
      .collect();

    for (_id, project_path, project_name, genre_label) in &rows {
        summary.found += 1;
        let path = Path::new(project_path);

        if !path.exists() || !path.is_dir() {
            // Mark as missing
            conn.execute(
                "UPDATE projects SET missing = 1, updated_at = datetime('now') WHERE project_path = ?1",
                params![project_path],
            ).ok();
            summary.missing += 1;
            continue;
        }

        // Unflag missing if it was previously missing
        conn.execute(
            "UPDATE projects SET missing = 0 WHERE project_path = ?1 AND missing = 1",
            params![project_path],
        ).ok();

        match process_project(conn, project_path, project_name, &genre_label, bounce_folder_name, app_data_dir) {
            Ok(_) => {
                summary.updated += 1;
            }
            Err(e) => {
                summary.errors.push(format!("{}: {}", project_name, e));
            }
        }
    }

    log::info!(
        "Refresh complete: {} checked, {} updated, {} missing, {} errors",
        summary.found, summary.updated, summary.missing, summary.errors.len()
    );

    Ok(summary)
}

/// Walk root folder 1-2 levels deep and return projects NOT already in DB.
pub fn discover_untracked_projects(conn: &Connection, root_folder: &str) -> Result<Vec<DiscoveredProject>, String> {
    let root = Path::new(root_folder);
    if !root.exists() || !root.is_dir() {
        return Err(format!("Root folder does not exist: {}", root_folder));
    }

    let mut discovered: Vec<DiscoveredProject> = Vec::new();

    match fs::read_dir(root) {
        Ok(entries) => {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_dir() {
                    continue;
                }

                let dir_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                if dir_name.starts_with('.') {
                    continue;
                }

                if has_als_files(&path) {
                    let path_str = path.to_string_lossy().to_string();
                    if !project_exists_in_db(conn, &path_str)? {
                        discovered.push(DiscoveredProject {
                            path: path_str,
                            name: dir_name,
                            genre_label: String::new(),
                        });
                    }
                } else {
                    // Check one level deeper (genre subfolder)
                    if let Ok(sub_entries) = fs::read_dir(&path) {
                        for sub_entry in sub_entries.flatten() {
                            let sub_path = sub_entry.path();
                            if sub_path.is_dir() && has_als_files(&sub_path) {
                                let sub_path_str = sub_path.to_string_lossy().to_string();
                                if !project_exists_in_db(conn, &sub_path_str)? {
                                    let sub_name = sub_path.file_name()
                                        .unwrap_or_default()
                                        .to_string_lossy()
                                        .to_string();
                                    discovered.push(DiscoveredProject {
                                        path: sub_path_str,
                                        name: sub_name,
                                        genre_label: dir_name.clone(),
                                    });
                                }
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

    Ok(discovered)
}

/// Add a single project folder (any folder, .als not required).
pub fn add_single_project(conn: &Connection, folder_path: &str, bounce_folder_name: &str, app_data_dir: &Path) -> Result<ScanSummary, String> {
    let path = Path::new(folder_path);
    if !path.exists() || !path.is_dir() {
        return Err(format!("Folder does not exist: {}", folder_path));
    }

    let project_name = path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    // Try to infer genre_label from parent directory name if it's not the root
    let genre_label = String::new();

    let mut summary = ScanSummary {
        found: 1,
        new: 0,
        updated: 0,
        missing: 0,
        errors: Vec::new(),
    };

    match process_project(conn, folder_path, &project_name, &genre_label, bounce_folder_name, app_data_dir) {
        Ok(is_new) => {
            if is_new { summary.new = 1; } else { summary.updated = 1; }
        }
        Err(e) => {
            summary.errors.push(format!("{}: {}", project_name, e));
        }
    }

    Ok(summary)
}

/// Import multiple discovered projects.
pub fn import_projects(conn: &Connection, projects: &[DiscoveredProject], bounce_folder_name: &str, app_data_dir: &Path) -> Result<ScanSummary, String> {
    let mut summary = ScanSummary {
        found: projects.len(),
        new: 0,
        updated: 0,
        missing: 0,
        errors: Vec::new(),
    };

    for project in projects {
        let path = Path::new(&project.path);
        if !path.exists() || !path.is_dir() {
            summary.errors.push(format!("{}: folder does not exist", project.name));
            continue;
        }

        match process_project(conn, &project.path, &project.name, &project.genre_label, bounce_folder_name, app_data_dir) {
            Ok(is_new) => {
                if is_new { summary.new += 1; } else { summary.updated += 1; }
            }
            Err(e) => {
                summary.errors.push(format!("{}: {}", project.name, e));
            }
        }
    }

    log::info!(
        "Import complete: {} processed, {} new, {} updated, {} errors",
        summary.found, summary.new, summary.updated, summary.errors.len()
    );

    Ok(summary)
}

fn project_exists_in_db(conn: &Connection, path: &str) -> Result<bool, String> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM projects WHERE project_path = ?1",
        params![path],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    Ok(count > 0)
}
