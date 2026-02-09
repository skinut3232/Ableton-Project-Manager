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
    }

    Ok(())
}
