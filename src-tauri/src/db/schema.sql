-- Schema Version Tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO schema_version (version) VALUES (3);

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
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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

-- FTS5 Virtual Table
CREATE VIRTUAL TABLE IF NOT EXISTS projects_fts USING fts5(
    name,
    genre_label,
    notes,
    tags_text,
    content='projects',
    content_rowid='id'
);

-- FTS5 Triggers
CREATE TRIGGER IF NOT EXISTS projects_ai AFTER INSERT ON projects BEGIN
    INSERT INTO projects_fts(rowid, name, genre_label, notes, tags_text)
    VALUES (new.id, new.name, new.genre_label, new.notes, '');
END;

CREATE TRIGGER IF NOT EXISTS projects_ad AFTER DELETE ON projects BEGIN
    INSERT INTO projects_fts(projects_fts, rowid, name, genre_label, notes, tags_text)
    VALUES ('delete', old.id, old.name, old.genre_label, old.notes, '');
END;

CREATE TRIGGER IF NOT EXISTS projects_au AFTER UPDATE ON projects BEGIN
    INSERT INTO projects_fts(projects_fts, rowid, name, genre_label, notes, tags_text)
    VALUES ('delete', old.id, old.name, old.genre_label, old.notes, '');
    INSERT INTO projects_fts(rowid, name, genre_label, notes, tags_text)
    VALUES (new.id, new.name, new.genre_label, new.notes, '');
END;
