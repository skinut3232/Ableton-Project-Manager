use std::path::{Path, PathBuf};
use std::fs;
use rusqlite::{params, Connection};
use tauri::AppHandle;
use tauri::Emitter;
use crate::db::models::ScanSummary;
use crate::cover_gen;

#[derive(Clone, serde::Serialize)]
pub struct ScanProgress {
    pub current: usize,
    pub total: usize,
    pub project_name: String,
    pub stage: String, // "scanning" | "generating_covers" | "complete"
}

pub fn scan_library(conn: &Connection, root_folder: &str, bounce_folder_name: &str, app_data_dir: &Path, app: &AppHandle) -> Result<ScanSummary, String> {
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

    // Recursively discover all project directories (dirs containing .als files)
    let mut project_dirs: Vec<(PathBuf, String)> = Vec::new();
    discover_project_dirs(root, root, 0, &mut project_dirs);

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

        app.emit("scan-progress", ScanProgress {
            current: summary.found,
            total: project_dirs.len(),
            project_name: project_name.clone(),
            stage: "scanning".to_string(),
        }).ok();

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

/// Maximum recursion depth for project discovery (prevents runaway traversal).
const MAX_SCAN_DEPTH: usize = 10;

/// Recursively walk `dir` looking for directories that contain .als files.
/// Once a directory is identified as a project (has .als files), we do NOT
/// recurse into it — this avoids treating Backup/ subfolders as separate projects.
fn discover_project_dirs(root: &Path, dir: &Path, depth: usize, results: &mut Vec<(PathBuf, String)>) {
    if depth > MAX_SCAN_DEPTH {
        return;
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        // Skip hidden directories
        let dir_name = path.file_name().unwrap_or_default().to_string_lossy();
        if dir_name.starts_with('.') {
            continue;
        }

        if has_als_files(&path) {
            // This is a project — record it and don't recurse deeper
            let genre_label = derive_genre_label(root, &path);
            results.push((path, genre_label));
        } else {
            // Not a project — recurse deeper
            discover_project_dirs(root, &path, depth + 1, results);
        }
    }
}

/// Derive the genre label from the first directory component after root.
/// e.g. root/Techno/Deep/Track A → "Techno"
///      root/Track A             → ""
fn derive_genre_label(root: &Path, project_path: &Path) -> String {
    if let Ok(relative) = project_path.strip_prefix(root) {
        let mut components = relative.components();
        if let Some(first) = components.next() {
            // If there's a second component, then `first` is a genre folder
            if components.next().is_some() {
                return first.as_os_str().to_string_lossy().to_string();
            }
        }
    }
    // Project is directly in root — no genre label
    String::new()
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

    // Upsert .als files (with file_size)
    for (set_path, modified_time) in &als_files {
        let file_size: Option<i64> = fs::metadata(set_path).ok().map(|m| m.len() as i64);
        conn.execute(
            "INSERT INTO ableton_sets (project_id, set_path, modified_time, file_size) VALUES (?1, ?2, ?3, ?4) \
             ON CONFLICT(set_path) DO UPDATE SET modified_time = ?3, file_size = ?4",
            params![project_id, set_path, modified_time, file_size],
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

    // Parse .als file for metadata (BPM, key, plugins, samples)
    if let Some(ref als_path) = newest_set {
        parse_als_metadata(conn, project_id, als_path);
    }

    Ok(is_new)
}

/// Generate covers for all projects that need one (cover_type='none' and not locked).
/// Called separately from the scan to avoid holding the DB lock during image generation.
pub fn generate_missing_covers(conn: &Connection, app_data_dir: &Path, app: &AppHandle) {
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
        app.emit("scan-progress", ScanProgress {
            current: generated + 1,
            total: jobs.len(),
            project_name: format!("Cover {}", job.project_id),
            stage: "generating_covers".to_string(),
        }).ok();

        let cover_dir = app_data_dir.join("covers").join("generated").join(job.project_id.to_string());
        match cover_gen::generate_cover(&job.seed, &cover_dir, None) {
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
pub fn refresh_library(conn: &Connection, bounce_folder_name: &str, app_data_dir: &Path, app: &AppHandle) -> Result<ScanSummary, String> {
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

        app.emit("scan-progress", ScanProgress {
            current: summary.found,
            total: rows.len(),
            project_name: project_name.clone(),
            stage: "scanning".to_string(),
        }).ok();

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

/// Recursively walk root folder and return projects NOT already in DB.
pub fn discover_untracked_projects(conn: &Connection, root_folder: &str) -> Result<Vec<DiscoveredProject>, String> {
    let root = Path::new(root_folder);
    if !root.exists() || !root.is_dir() {
        return Err(format!("Root folder does not exist: {}", root_folder));
    }

    let mut project_dirs: Vec<(PathBuf, String)> = Vec::new();
    discover_project_dirs(root, root, 0, &mut project_dirs);

    let mut discovered: Vec<DiscoveredProject> = Vec::new();
    for (path, genre_label) in project_dirs {
        let path_str = path.to_string_lossy().to_string();
        if !project_exists_in_db(conn, &path_str)? {
            let name = path.file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            discovered.push(DiscoveredProject {
                path: path_str,
                name,
                genre_label,
            });
        }
    }

    Ok(discovered)
}

/// Add a single project folder (any folder, .als not required).
pub fn add_single_project(conn: &Connection, folder_path: &str, bounce_folder_name: &str, app_data_dir: &Path, _app: &AppHandle) -> Result<ScanSummary, String> {
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
pub fn import_projects(conn: &Connection, projects: &[DiscoveredProject], bounce_folder_name: &str, app_data_dir: &Path, _app: &AppHandle) -> Result<ScanSummary, String> {
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

/// Parse the newest .als file for a project, extracting BPM, key, plugins, and samples.
/// Skips parsing if the file hasn't changed since last parse (based on mtime).
fn parse_als_metadata(conn: &Connection, project_id: i64, als_path: &str) {
    use crate::als_parser;
    use crate::db::queries;
    use crate::db::models::SampleWithStatus;
    use std::time::UNIX_EPOCH;

    let als_file = Path::new(als_path);
    if !als_file.exists() {
        return;
    }

    // Get file mtime as Unix seconds
    let current_mtime = match fs::metadata(als_file)
        .and_then(|m| m.modified())
        .map(|t| t.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() as i64)
    {
        Ok(t) => t,
        Err(_) => return,
    };

    // Check if already parsed at this mtime
    if let Ok(Some(parsed_at)) = queries::get_als_parsed_at(conn, project_id) {
        if parsed_at == current_mtime {
            return; // File unchanged, skip
        }
    }

    log::info!("Parsing .als metadata for project {}: {}", project_id, als_path);

    match als_parser::parse_als(als_file) {
        Err(e) => {
            log::warn!("Failed to parse .als for project {}: {}", project_id, e);
            // Record mtime anyway so we don't retry on every scan
            queries::set_als_parsed_at(conn, project_id, current_mtime).ok();
        }
        Ok(metadata) => {
            // Set BPM if not already set by user
            if let Some(bpm) = metadata.bpm {
                queries::set_bpm_if_empty(conn, project_id, bpm).ok();
            }

            // Set key if not already set by user
            if let (Some(tonic), Some(scale)) = (&metadata.key_tonic, &metadata.key_scale) {
                let key_str = format!("{} {}", tonic, scale);
                queries::set_key_if_empty(conn, project_id, &key_str).ok();
            }

            // Store plugins
            queries::replace_project_plugins(conn, project_id, &metadata.plugins).ok();

            // Check sample existence and store
            let samples_with_status: Vec<SampleWithStatus> = metadata.samples.iter().map(|s| {
                let is_missing = !Path::new(&s.path).exists();
                SampleWithStatus {
                    path: s.path.clone(),
                    filename: s.filename.clone(),
                    is_missing,
                }
            }).collect();

            let any_missing = samples_with_status.iter().any(|s| s.is_missing);
            queries::replace_project_samples(conn, project_id, &samples_with_status).ok();
            queries::set_has_missing_deps(conn, project_id, any_missing).ok();

            // Record parse time
            queries::set_als_parsed_at(conn, project_id, current_mtime).ok();

            // Rebuild FTS to include plugin names in search index
            queries::rebuild_fts_tags(conn, project_id).ok();

            log::info!(
                "Parsed .als for project {}: {} plugins, {} samples ({} missing)",
                project_id,
                metadata.plugins.len(),
                samples_with_status.len(),
                samples_with_status.iter().filter(|s| s.is_missing).count()
            );
        }
    }
}

fn project_exists_in_db(conn: &Connection, path: &str) -> Result<bool, String> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM projects WHERE project_path = ?1",
        params![path],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    Ok(count > 0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    /// Create an empty .als file inside a directory.
    fn touch_als(dir: &Path, name: &str) {
        fs::write(dir.join(name), b"").unwrap();
    }

    /// Helper: run discover_project_dirs and return sorted results for deterministic comparison.
    fn discover_sorted(root: &Path) -> Vec<(PathBuf, String)> {
        let mut results = Vec::new();
        discover_project_dirs(root, root, 0, &mut results);
        results.sort_by(|a, b| a.0.cmp(&b.0));
        results
    }

    #[test]
    fn test_project_directly_in_root() {
        // root/TrackA/song.als → genre ""
        let tmp = TempDir::new().unwrap();
        let project = tmp.path().join("TrackA");
        fs::create_dir(&project).unwrap();
        touch_als(&project, "song.als");

        let results = discover_sorted(tmp.path());
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, project);
        assert_eq!(results[0].1, "");
    }

    #[test]
    fn test_two_level_genre_structure() {
        // root/Techno/TrackA/song.als → genre "Techno"
        let tmp = TempDir::new().unwrap();
        let genre = tmp.path().join("Techno");
        let project = genre.join("TrackA");
        fs::create_dir_all(&project).unwrap();
        touch_als(&project, "song.als");

        let results = discover_sorted(tmp.path());
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, project);
        assert_eq!(results[0].1, "Techno");
    }

    #[test]
    fn test_deeply_nested_project() {
        // root/2026/DUMMY EP/TrackA/song.als → genre "2026"
        let tmp = TempDir::new().unwrap();
        let project = tmp.path().join("2026").join("DUMMY EP").join("TrackA");
        fs::create_dir_all(&project).unwrap();
        touch_als(&project, "song.als");

        let results = discover_sorted(tmp.path());
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, project);
        assert_eq!(results[0].1, "2026");
    }

    #[test]
    fn test_does_not_recurse_into_project_dirs() {
        // root/TrackA/song.als (project)
        // root/TrackA/Backup/song_backup.als (should NOT be found as separate project)
        let tmp = TempDir::new().unwrap();
        let project = tmp.path().join("TrackA");
        let backup = project.join("Backup");
        fs::create_dir_all(&backup).unwrap();
        touch_als(&project, "song.als");
        touch_als(&backup, "song_backup.als");

        let results = discover_sorted(tmp.path());
        assert_eq!(results.len(), 1, "Backup/ should not be treated as a separate project");
        assert_eq!(results[0].0, project);
    }

    #[test]
    fn test_skips_hidden_directories() {
        // root/.hidden/song.als → should be skipped
        // root/Visible/song.als → should be found
        let tmp = TempDir::new().unwrap();
        let hidden = tmp.path().join(".hidden");
        let visible = tmp.path().join("Visible");
        fs::create_dir_all(&hidden).unwrap();
        fs::create_dir_all(&visible).unwrap();
        touch_als(&hidden, "song.als");
        touch_als(&visible, "song.als");

        let results = discover_sorted(tmp.path());
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, visible);
    }

    #[test]
    fn test_multiple_projects_at_different_depths() {
        // root/TrackA/song.als                    → genre ""
        // root/Techno/TrackB/song.als             → genre "Techno"
        // root/2026/EP/TrackC/song.als            → genre "2026"
        let tmp = TempDir::new().unwrap();

        let p1 = tmp.path().join("TrackA");
        fs::create_dir_all(&p1).unwrap();
        touch_als(&p1, "song.als");

        let p2 = tmp.path().join("Techno").join("TrackB");
        fs::create_dir_all(&p2).unwrap();
        touch_als(&p2, "song.als");

        let p3 = tmp.path().join("2026").join("EP").join("TrackC");
        fs::create_dir_all(&p3).unwrap();
        touch_als(&p3, "song.als");

        let results = discover_sorted(tmp.path());
        assert_eq!(results.len(), 3);

        // Find each project by path and check genre
        let find = |name: &str| results.iter().find(|(p, _)| p.file_name().unwrap().to_string_lossy() == name).unwrap();
        assert_eq!(find("TrackA").1, "");
        assert_eq!(find("TrackB").1, "Techno");
        assert_eq!(find("TrackC").1, "2026");
    }

    #[test]
    fn test_empty_root_returns_nothing() {
        let tmp = TempDir::new().unwrap();
        let results = discover_sorted(tmp.path());
        assert!(results.is_empty());
    }

    #[test]
    fn test_als_files_in_root_not_treated_as_project() {
        // root/song.als — root itself has .als files but root isn't scanned as a project dir
        // (discover_project_dirs only looks at children of dir)
        let tmp = TempDir::new().unwrap();
        touch_als(tmp.path(), "song.als");

        let results = discover_sorted(tmp.path());
        assert!(results.is_empty(), "Root dir itself should not be returned as a project");
    }

    #[test]
    fn test_depth_cap_respected() {
        // Create a path 12 levels deep — should not be found (exceeds MAX_SCAN_DEPTH of 10)
        let tmp = TempDir::new().unwrap();
        let mut deep = tmp.path().to_path_buf();
        for i in 0..12 {
            deep = deep.join(format!("level{}", i));
        }
        deep = deep.join("Project");
        fs::create_dir_all(&deep).unwrap();
        touch_als(&deep, "song.als");

        let results = discover_sorted(tmp.path());
        assert!(results.is_empty(), "Projects deeper than MAX_SCAN_DEPTH should not be found");
    }

    #[test]
    fn test_derive_genre_label_direct_child() {
        let root = Path::new("/music");
        let project = Path::new("/music/TrackA");
        assert_eq!(derive_genre_label(root, project), "");
    }

    #[test]
    fn test_derive_genre_label_two_levels() {
        let root = Path::new("/music");
        let project = Path::new("/music/Techno/TrackA");
        assert_eq!(derive_genre_label(root, project), "Techno");
    }

    #[test]
    fn test_derive_genre_label_three_levels() {
        let root = Path::new("/music");
        let project = Path::new("/music/2026/EP/TrackA");
        assert_eq!(derive_genre_label(root, project), "2026");
    }
}
