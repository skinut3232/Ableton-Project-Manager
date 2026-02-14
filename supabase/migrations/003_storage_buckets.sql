-- ============================================================================
-- Supabase Storage Buckets & Policies
-- ============================================================================
-- NOTE: Storage buckets are typically created via the Supabase dashboard or
-- the supabase-js client. These SQL statements use Supabase's storage schema
-- and should be run via the SQL editor in the dashboard.
-- ============================================================================

-- Create buckets (if not already created via dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('bounces', 'bounces', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', false)
ON CONFLICT (id) DO NOTHING;

-- ── covers bucket policies ──
-- Path convention: {user_id}/{project_id}/cover.png
-- Public read (covers are displayed in the app), authenticated write

CREATE POLICY covers_select ON storage.objects FOR SELECT
    USING (bucket_id = 'covers');

CREATE POLICY covers_insert ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'covers'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY covers_update ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'covers'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY covers_delete ON storage.objects FOR DELETE
    USING (
        bucket_id = 'covers'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ── bounces bucket policies ──
-- Path convention: {user_id}/{project_id}/{filename}.mp3
-- Public read (for mobile streaming), authenticated write

CREATE POLICY bounces_select ON storage.objects FOR SELECT
    USING (bucket_id = 'bounces');

CREATE POLICY bounces_insert ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'bounces'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY bounces_update ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'bounces'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY bounces_delete ON storage.objects FOR DELETE
    USING (
        bucket_id = 'bounces'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ── assets bucket policies ──
-- Path convention: {user_id}/{project_id}/{filename}
-- Private (only the owner can read/write)

CREATE POLICY assets_storage_select ON storage.objects FOR SELECT
    USING (
        bucket_id = 'assets'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY assets_storage_insert ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'assets'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY assets_storage_update ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'assets'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY assets_storage_delete ON storage.objects FOR DELETE
    USING (
        bucket_id = 'assets'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
