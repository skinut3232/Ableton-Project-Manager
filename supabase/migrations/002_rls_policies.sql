-- ============================================================================
-- Row-Level Security Policies
-- Every table is scoped to the authenticated user.
-- ============================================================================

-- Helper: child tables (bounces, sets, markers, etc.) don't have user_id
-- so we check ownership via a JOIN to projects.

-- ── settings ──
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY settings_select ON settings FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY settings_insert ON settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY settings_update ON settings FOR UPDATE
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY settings_delete ON settings FOR DELETE
    USING (auth.uid() = user_id);

-- ── projects ──
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_select ON projects FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY projects_insert ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY projects_update ON projects FOR UPDATE
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY projects_delete ON projects FOR DELETE
    USING (auth.uid() = user_id);

-- ── tags ──
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tags_select ON tags FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY tags_insert ON tags FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY tags_update ON tags FOR UPDATE
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY tags_delete ON tags FOR DELETE
    USING (auth.uid() = user_id);

-- ── project_tags (child of projects + tags) ──
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_tags_select ON project_tags FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = project_tags.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY project_tags_insert ON project_tags FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = project_tags.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY project_tags_delete ON project_tags FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = project_tags.project_id AND projects.user_id = auth.uid()
    ));

-- ── ableton_sets (child of projects) ──
ALTER TABLE ableton_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY ableton_sets_select ON ableton_sets FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = ableton_sets.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY ableton_sets_insert ON ableton_sets FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = ableton_sets.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY ableton_sets_update ON ableton_sets FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = ableton_sets.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY ableton_sets_delete ON ableton_sets FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = ableton_sets.project_id AND projects.user_id = auth.uid()
    ));

-- ── bounces (child of projects) ──
ALTER TABLE bounces ENABLE ROW LEVEL SECURITY;

CREATE POLICY bounces_select ON bounces FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = bounces.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY bounces_insert ON bounces FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = bounces.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY bounces_update ON bounces FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = bounces.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY bounces_delete ON bounces FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = bounces.project_id AND projects.user_id = auth.uid()
    ));

-- ── sessions (child of projects) ──
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_select ON sessions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = sessions.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY sessions_insert ON sessions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = sessions.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY sessions_update ON sessions FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = sessions.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY sessions_delete ON sessions FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = sessions.project_id AND projects.user_id = auth.uid()
    ));

-- ── markers (child of projects) ──
ALTER TABLE markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY markers_select ON markers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = markers.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY markers_insert ON markers FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = markers.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY markers_update ON markers FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = markers.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY markers_delete ON markers FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = markers.project_id AND projects.user_id = auth.uid()
    ));

-- ── tasks (child of projects) ──
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select ON tasks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY tasks_insert ON tasks FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY tasks_update ON tasks FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY tasks_delete ON tasks FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid()
    ));

-- ── project_references (child of projects) ──
ALTER TABLE project_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_references_select ON project_references FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = project_references.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY project_references_insert ON project_references FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = project_references.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY project_references_update ON project_references FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = project_references.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY project_references_delete ON project_references FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = project_references.project_id AND projects.user_id = auth.uid()
    ));

-- ── spotify_references (child of projects) ──
ALTER TABLE spotify_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY spotify_references_select ON spotify_references FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = spotify_references.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY spotify_references_insert ON spotify_references FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = spotify_references.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY spotify_references_update ON spotify_references FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = spotify_references.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY spotify_references_delete ON spotify_references FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = spotify_references.project_id AND projects.user_id = auth.uid()
    ));

-- ── assets (child of projects) ──
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY assets_select ON assets FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = assets.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY assets_insert ON assets FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = assets.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY assets_update ON assets FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = assets.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY assets_delete ON assets FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = assets.project_id AND projects.user_id = auth.uid()
    ));

-- ── mood_board (child of projects) ──
ALTER TABLE mood_board ENABLE ROW LEVEL SECURITY;

CREATE POLICY mood_board_select ON mood_board FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = mood_board.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY mood_board_insert ON mood_board FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = mood_board.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY mood_board_update ON mood_board FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = mood_board.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY mood_board_delete ON mood_board FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = mood_board.project_id AND projects.user_id = auth.uid()
    ));

-- ── project_notes (child of projects) ──
ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_notes_select ON project_notes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = project_notes.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY project_notes_insert ON project_notes FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = project_notes.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY project_notes_update ON project_notes FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = project_notes.project_id AND projects.user_id = auth.uid()
    ));
CREATE POLICY project_notes_delete ON project_notes FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM projects WHERE projects.id = project_notes.project_id AND projects.user_id = auth.uid()
    ));
