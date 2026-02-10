use rusqlite::Connection;

const SCHEMA_SQL: &str = include_str!("schema.sql");

pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    // Check if schema_version table exists
    let has_schema: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='schema_version'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map(|count| count > 0)
        .map_err(|e| format!("Failed to check schema: {}", e))?;

    if !has_schema {
        conn.execute_batch(SCHEMA_SQL)
            .map_err(|e| format!("Failed to run initial migration: {}", e))?;
        log::info!("Database schema created successfully");
    } else {
        let version: i64 = conn
            .query_row("SELECT MAX(version) FROM schema_version", [], |row| row.get(0))
            .map_err(|e| format!("Failed to get schema version: {}", e))?;
        log::info!("Database at schema version {}", version);

        // Migration v1 → v2: add musical_key column
        if version < 2 {
            conn.execute_batch(
                "ALTER TABLE projects ADD COLUMN musical_key TEXT NOT NULL DEFAULT '';
                 INSERT INTO schema_version (version) VALUES (2);"
            ).map_err(|e| format!("Migration v2 failed: {}", e))?;
            log::info!("Migrated database to schema version 2");
        }

        // Migration v2 → v3: add progress column
        if version < 3 {
            conn.execute_batch(
                "ALTER TABLE projects ADD COLUMN progress INTEGER DEFAULT NULL;
                 INSERT INTO schema_version (version) VALUES (3);"
            ).map_err(|e| format!("Migration v3 failed: {}", e))?;
            log::info!("Migrated database to schema version 3");
        }

        // Migration v3 → v4: add markers, tasks, project_references, assets tables
        // Also check table existence as a safety net (handles case where version
        // was bumped to 4 by schema.sql but tables weren't created)
        let has_tasks: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='tasks'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .map(|count| count > 0)
            .unwrap_or(false);

        if version < 4 || !has_tasks {
            conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS markers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    bounce_id INTEGER REFERENCES bounces(id) ON DELETE SET NULL,
                    timestamp_seconds REAL NOT NULL DEFAULT 0,
                    type TEXT NOT NULL DEFAULT 'note',
                    text TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_markers_project_id ON markers(project_id);
                CREATE INDEX IF NOT EXISTS idx_markers_bounce_id ON markers(bounce_id);

                CREATE TABLE IF NOT EXISTS tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    title TEXT NOT NULL DEFAULT '',
                    done INTEGER NOT NULL DEFAULT 0,
                    category TEXT NOT NULL DEFAULT 'Arrangement',
                    linked_marker_id INTEGER REFERENCES markers(id) ON DELETE SET NULL,
                    linked_timestamp_seconds REAL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

                CREATE TABLE IF NOT EXISTS project_references (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    url TEXT NOT NULL,
                    title TEXT,
                    notes TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_project_references_project_id ON project_references(project_id);

                CREATE TABLE IF NOT EXISTS assets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    original_filename TEXT NOT NULL,
                    stored_path TEXT NOT NULL,
                    asset_type TEXT NOT NULL DEFAULT 'generic',
                    tags TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);

                INSERT OR IGNORE INTO schema_version (version) VALUES (4);"
            ).map_err(|e| format!("Migration v4 failed: {}", e))?;
            log::info!("Migrated database to schema version 4");
        }

        // Migration v4 → v5: add cover columns to projects + mood_board table
        // Also check column existence as a safety net (handles partial migration
        // where version was bumped but ALTER TABLEs didn't apply)
        let has_cover_type: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('projects') WHERE name='cover_type'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .map(|count| count > 0)
            .unwrap_or(false);

        if version < 5 || !has_cover_type {
            // Run each ALTER TABLE individually so partial failures don't block the rest
            let alter_stmts = [
                "ALTER TABLE projects ADD COLUMN cover_type TEXT NOT NULL DEFAULT 'none'",
                "ALTER TABLE projects ADD COLUMN cover_locked INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE projects ADD COLUMN cover_seed TEXT",
                "ALTER TABLE projects ADD COLUMN cover_style_preset TEXT NOT NULL DEFAULT 'default'",
                "ALTER TABLE projects ADD COLUMN cover_asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL",
                "ALTER TABLE projects ADD COLUMN cover_updated_at TEXT",
            ];
            for stmt in &alter_stmts {
                conn.execute(stmt, []).ok(); // Ignore "duplicate column" errors
            }

            conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS mood_board (
                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                     project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                     asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
                     sort_order INTEGER NOT NULL DEFAULT 0,
                     created_at TEXT NOT NULL DEFAULT (datetime('now')),
                     UNIQUE(project_id, asset_id)
                 );
                 CREATE INDEX IF NOT EXISTS idx_mood_board_project_id ON mood_board(project_id);

                 -- Backfill existing artwork as 'uploaded'
                 UPDATE projects SET cover_type = 'uploaded' WHERE artwork_path IS NOT NULL AND artwork_path != '';

                 INSERT OR IGNORE INTO schema_version (version) VALUES (5);"
            ).map_err(|e| format!("Migration v5 failed: {}", e))?;
            log::info!("Migrated database to schema version 5 (cover columns + mood_board)");
        }

        // Migration v5 → v6: standalone FTS table (strip HTML from notes before indexing)
        if version < 6 {
            // Drop the content-sync triggers (they insert raw HTML into FTS)
            conn.execute_batch(
                "DROP TRIGGER IF EXISTS projects_ai;
                 DROP TRIGGER IF EXISTS projects_ad;
                 DROP TRIGGER IF EXISTS projects_au;
                 DROP TABLE IF EXISTS projects_fts;
                 CREATE VIRTUAL TABLE projects_fts USING fts5(name, genre_label, notes, tags_text);
                 INSERT INTO schema_version (version) VALUES (6);"
            ).map_err(|e| format!("Migration v6 failed: {}", e))?;

            // Rebuild entire FTS index with HTML-stripped notes
            crate::db::queries::rebuild_all_fts(conn)?;

            log::info!("Migrated database to schema version 6 (standalone FTS, HTML stripping)");
        }

        // Migration v6 → v7: add project_notes table + migrate existing notes
        if version < 7 {
            conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS project_notes (
                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                     project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                     content TEXT NOT NULL DEFAULT '',
                     created_at TEXT NOT NULL DEFAULT (datetime('now')),
                     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                 );
                 CREATE INDEX IF NOT EXISTS idx_project_notes_project_id ON project_notes(project_id);"
            ).map_err(|e| format!("Migration v7 failed (create table): {}", e))?;

            // Migrate existing projects.notes → project_notes (strip HTML, skip empty)
            let mut stmt = conn.prepare(
                "SELECT id, notes FROM projects WHERE notes IS NOT NULL AND notes != ''"
            ).map_err(|e| format!("Migration v7 failed (read notes): {}", e))?;

            let rows: Vec<(i64, String)> = stmt
                .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
                .map_err(|e| format!("Migration v7 failed (query notes): {}", e))?
                .filter_map(|r| r.ok())
                .collect();
            drop(stmt);

            for (project_id, html_notes) in &rows {
                let plain = crate::db::queries::strip_html_tags(html_notes).trim().to_string();
                if !plain.is_empty() {
                    conn.execute(
                        "INSERT INTO project_notes (project_id, content) VALUES (?1, ?2)",
                        rusqlite::params![project_id, plain],
                    ).ok();
                }
            }

            conn.execute_batch(
                "INSERT INTO schema_version (version) VALUES (7);"
            ).map_err(|e| format!("Migration v7 failed (version bump): {}", e))?;

            // Rebuild FTS to use project_notes instead of projects.notes
            crate::db::queries::rebuild_all_fts(conn)?;

            log::info!("Migrated database to schema version 7 (project_notes table)");
        }
    }

    Ok(())
}
