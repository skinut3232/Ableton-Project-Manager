-- ============================================================================
-- Supabase Schema for Ableton Project Library (Mobile Sync)
-- Translates SQLite schema v8 to Postgres with user_id scoping
-- ============================================================================

-- settings (user preferences that sync — not local paths)
CREATE TABLE IF NOT EXISTS settings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    UNIQUE(user_id, key)
);

-- projects (core entity)
CREATE TABLE IF NOT EXISTS projects (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    project_path TEXT NOT NULL DEFAULT '',
    genre_label TEXT NOT NULL DEFAULT '',
    musical_key TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Sketch',
    rating INT,
    bpm DOUBLE PRECISION,
    in_rotation BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT NOT NULL DEFAULT '',
    artwork_path TEXT,
    current_set_path TEXT,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    missing BOOLEAN NOT NULL DEFAULT FALSE,
    progress INT,
    last_worked_on TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Cover fields
    cover_type TEXT NOT NULL DEFAULT 'none',
    cover_locked BOOLEAN NOT NULL DEFAULT FALSE,
    cover_seed TEXT,
    cover_style_preset TEXT NOT NULL DEFAULT 'default',
    cover_asset_id BIGINT,
    cover_updated_at TIMESTAMPTZ,
    -- Cloud-specific
    cover_url TEXT,
    -- Full-text search
    fts TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(genre_label, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(notes, '')), 'C')
    ) STORED
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_fts ON projects USING GIN(fts);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_last_worked ON projects(user_id, last_worked_on DESC NULLS LAST);

-- ableton_sets
CREATE TABLE IF NOT EXISTS ableton_sets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    set_path TEXT NOT NULL,
    modified_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ableton_sets_project_id ON ableton_sets(project_id);

-- bounces
CREATE TABLE IF NOT EXISTS bounces (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    bounce_path TEXT NOT NULL,
    modified_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_seconds DOUBLE PRECISION,
    is_latest BOOLEAN NOT NULL DEFAULT FALSE,
    mp3_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bounces_project_id ON bounces(project_id);

-- tags
CREATE TABLE IF NOT EXISTS tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- project_tags (junction)
CREATE TABLE IF NOT EXISTS project_tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON project_tags(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tags_tag_id ON project_tags(tag_id);

-- sessions
CREATE TABLE IF NOT EXISTS sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INT,
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);

-- markers
CREATE TABLE IF NOT EXISTS markers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    bounce_id BIGINT REFERENCES bounces(id) ON DELETE SET NULL,
    timestamp_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'note',
    text TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_markers_project_id ON markers(project_id);
CREATE INDEX IF NOT EXISTS idx_markers_bounce_id ON markers(bounce_id);

-- tasks
CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    done BOOLEAN NOT NULL DEFAULT FALSE,
    category TEXT NOT NULL DEFAULT 'Arrangement',
    linked_marker_id BIGINT REFERENCES markers(id) ON DELETE SET NULL,
    linked_timestamp_seconds DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- project_references
CREATE TABLE IF NOT EXISTS project_references (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_references_project_id ON project_references(project_id);

-- spotify_references
CREATE TABLE IF NOT EXISTS spotify_references (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    spotify_id TEXT NOT NULL,
    spotify_type TEXT NOT NULL DEFAULT 'track',
    name TEXT NOT NULL,
    artist_name TEXT NOT NULL DEFAULT '',
    album_name TEXT NOT NULL DEFAULT '',
    album_art_url TEXT NOT NULL DEFAULT '',
    duration_ms INT,
    spotify_url TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, spotify_id)
);

CREATE INDEX IF NOT EXISTS idx_spotify_references_project_id ON spotify_references(project_id);

-- assets
CREATE TABLE IF NOT EXISTS assets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    asset_type TEXT NOT NULL DEFAULT 'generic',
    tags TEXT NOT NULL DEFAULT '',
    storage_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);

-- Now add FK for projects.cover_asset_id (deferred to avoid circular creation order)
ALTER TABLE projects
    ADD CONSTRAINT fk_projects_cover_asset
    FOREIGN KEY (cover_asset_id) REFERENCES assets(id) ON DELETE SET NULL;

-- mood_board
CREATE TABLE IF NOT EXISTS mood_board (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_mood_board_project_id ON mood_board(project_id);

-- project_notes
CREATE TABLE IF NOT EXISTS project_notes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_notes_project_id ON project_notes(project_id);

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to tables that have updated_at
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_markers_updated_at BEFORE UPDATE ON markers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_project_references_updated_at BEFORE UPDATE ON project_references
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_spotify_references_updated_at BEFORE UPDATE ON spotify_references
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_project_notes_updated_at BEFORE UPDATE ON project_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
