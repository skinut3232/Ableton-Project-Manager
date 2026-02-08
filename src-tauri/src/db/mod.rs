pub mod migrations;
pub mod models;
pub mod queries;

use rusqlite::Connection;
use std::sync::Mutex;

pub struct DbState(pub Mutex<Connection>);

pub fn init_db(app_data_dir: &std::path::Path) -> Result<Connection, String> {
    std::fs::create_dir_all(app_data_dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;
    let db_path = app_data_dir.join("library.db");
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| format!("Failed to set pragmas: {}", e))?;

    migrations::run_migrations(&conn)?;

    Ok(conn)
}
