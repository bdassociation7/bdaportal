-- Migration: Fix search_certifications_unified RPC function
-- Date: 2026-01-09
-- Description: Drops and recreates the search_certifications_unified function to fix 400 error

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.search_certifications_unified(TEXT);

-- Recreate the function with proper definition
CREATE OR REPLACE FUNCTION public.search_certifications_unified(
    p_search_query TEXT
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    certification_type TEXT,
    credential_id TEXT,
    issued_date DATE,
    expiry_date DATE,
    status TEXT,
    certificate_url TEXT,
    quiz_attempt_id UUID,
    renewal_count INTEGER,
    revocation_reason TEXT,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    user_name TEXT,
    user_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        uc.id,
        uc.user_id,
        uc.certification_type::TEXT,
        uc.credential_id,
        uc.issued_date,
        uc.expiry_date,
        uc.status::TEXT,
        uc.certificate_url,
        uc.quiz_attempt_id,
        uc.renewal_count,
        uc.revocation_reason,
        uc.notes,
        uc.metadata,
        uc.created_at,
        uc.updated_at,
        TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS user_name,
        u.email AS user_email
    FROM public.user_certifications uc
    INNER JOIN public.users u ON uc.user_id = u.id
    WHERE
        -- Search by credential ID (exact or partial match)
        uc.credential_id ILIKE '%' || p_search_query || '%'
        -- OR search by name (first, last, or full name)
        OR u.first_name ILIKE '%' || p_search_query || '%'
        OR u.last_name ILIKE '%' || p_search_query || '%'
        OR (u.first_name || ' ' || u.last_name) ILIKE '%' || p_search_query || '%'
    ORDER BY
        -- Prioritize exact credential ID matches
        CASE WHEN LOWER(uc.credential_id) = LOWER(p_search_query) THEN 0 ELSE 1 END,
        -- Then by issued date (newest first)
        uc.issued_date DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_certifications_unified(TEXT) TO authenticated;

-- Also grant to anon for public verification
GRANT EXECUTE ON FUNCTION public.search_certifications_unified(TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION public.search_certifications_unified(TEXT) IS
    'Unified search for certifications by credential ID or holder name. Searches across both fields and returns all matches. Prioritizes exact credential ID matches.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ search_certifications_unified function recreated successfully';
    RAISE NOTICE '🔍 Function accepts: TEXT parameter';
    RAISE NOTICE '📝 Returns: Certification records with user info';
END $$;
