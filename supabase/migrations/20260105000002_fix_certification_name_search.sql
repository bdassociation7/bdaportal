-- Migration: Fix Certification Name Search
-- Date: 2026-01-05
-- Description: Creates an RPC function to properly search certifications by holder name
--              Fixes the issue where name-based search returns no results

-- ============================================================================
-- 1. Create RPC function for searching certifications by name
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_certifications_by_name(
    p_search_name TEXT
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
        u.first_name ILIKE '%' || p_search_name || '%'
        OR u.last_name ILIKE '%' || p_search_name || '%'
        OR (u.first_name || ' ' || u.last_name) ILIKE '%' || p_search_name || '%'
    ORDER BY uc.issued_date DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_certifications_by_name(TEXT) TO authenticated;

COMMENT ON FUNCTION public.search_certifications_by_name(TEXT) IS
    'Search certifications by holder name (first name, last name, or full name). Returns all matching certifications.';

-- ============================================================================
-- 2. Success Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Certification name search function created successfully';
    RAISE NOTICE '📝 Function: search_certifications_by_name(p_search_name TEXT)';
END $$;
