-- ============================================================================
-- Full-text search function
-- Searches across projects.fts (name, genre, notes), project_notes, and tags
-- ============================================================================

CREATE OR REPLACE FUNCTION search_user_projects(search_query text)
RETURNS SETOF projects AS $$
    SELECT DISTINCT p.*
    FROM projects p
    LEFT JOIN project_notes pn ON pn.project_id = p.id
    LEFT JOIN project_tags pt ON pt.project_id = p.id
    LEFT JOIN tags t ON t.id = pt.tag_id
    WHERE p.user_id = auth.uid()
      AND (
          p.fts @@ plainto_tsquery('english', search_query)
          OR pn.content ILIKE '%' || search_query || '%'
          OR t.name ILIKE '%' || search_query || '%'
      )
    ORDER BY p.last_worked_on DESC NULLS LAST;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION search_user_projects(text) TO authenticated;
