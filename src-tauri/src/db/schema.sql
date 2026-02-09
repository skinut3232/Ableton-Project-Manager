-- Schema Version Tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO schema_version (version) VALUES (6);

-- Settings (key-value pairs)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('bounce_folder_name', 'Bounces');
INSERT OR IGNORE INTO settings (key, value) VALUES ('scan_on_launch', 'true');

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    project_path TEXT NOT NULL UNIQUE,
    genre_label TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Sketch',
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    bpm REAL,
    musical_key TEXT NOT NULL DEFAULT '',
    in_rotation INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    artwork_path TEXT,
    current_set_path TEXT,
    archived INTEGER NOT NULL DEFAULT 0,
    missing INTEGER NOT NULL DEFAULT 0,
    progress INTEGER DEFAULT NULL,
    last_worked_on TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    cover_type TEXT NOT NULL DEFAULT 'none',
    cover_locked INTEGER NOT NULL DEFAULT 0,
    cover_seed TEXT,
    cover_style_preset TEXT NOT NULL DEFAULT 'default',
    cover_asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
    cover_updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived);
CREATE INDEX IF NOT EXISTS idx_projects_genre_label ON projects(genre_label);
CREATE INDEX IF NOT EXISTS idx_projects_last_worked_on ON projects(last_worked_on);

-- Ableton Sets
CREATE TABLE IF NOT EXISTS ableton_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    set_path TEXT NOT NULL UNIQUE,
    modified_time TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ableton_sets_project_id ON ableton_sets(project_id);

-- Bounces
CREATE TABLE IF NOT EXISTS bounces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    bounce_path TEXT NOT NULL UNIQUE,
    modified_time TEXT NOT NULL,
    duration_seconds REAL
);

CREATE INDEX IF NOT EXISTS idx_bounces_project_id ON bounces(project_id);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- Project Tags (many-to-many)
CREATE TABLE IF NOT EXISTS project_tags (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_project_tags_tag_id ON project_tags(tag_id);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    duration_seconds INTEGER,
    note TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);

-- Markers (timestamped annotations on bounces)
CREATE TABLE IF NOT EXISTS markers (
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

-- Tasks (per-project, category-grouped, optionally linked to markers)
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

-- References (URL links with notes)
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

-- Assets (uploaded files copied to app data)
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

-- Mood Board (pinned images from assets)
CREATE TABLE IF NOT EXISTS mood_board (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(project_id, asset_id)
);
CREATE INDEX IF NOT EXISTS idx_mood_board_project_id ON mood_board(project_id);

-- FTS5 Virtual Table (standalone — Rust manages inserts/deletes with HTML stripping)
CREATE VIRTUAL TABLE IF NOT EXISTS projects_fts USING fts5(
    name,
    genre_label,
    notes,
    tags_text
);
