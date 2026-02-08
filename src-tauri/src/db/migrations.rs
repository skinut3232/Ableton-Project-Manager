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
    }

    Ok(())
}
