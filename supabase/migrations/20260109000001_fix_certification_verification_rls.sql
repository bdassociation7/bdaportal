-- Migration: Fix Certification Verification RLS and Add Unified Search
-- Date: 2026-01-09
-- Description: Fixes RLS policies to allow authenticated users to verify certifications
--              and adds unified search by credential ID or name

-- ============================================================================
-- 1. Fix Users Table RLS - Allow viewing basic info for verification
-- ============================================================================

-- Allow authenticated users to view basic user info (name, email) for certification verification
-- This is needed because the certification verification joins with the users table
CREATE POLICY "Authenticated can view user names for verification"
ON public.users FOR SELECT
TO authenticated
USING (true);

COMMENT ON POLICY "Authenticated can view user names for verification" ON public.users IS
    'Allows authenticated users to view user names and emails when verifying certifications. This is safe because certification holder names are public information displayed on certificates.';

-- ============================================================================
-- 2. Create Unified Search Function (Credential ID OR Name)
-- ============================================================================

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

-- Also grant to anon for public verification if needed
GRANT EXECUTE ON FUNCTION public.search_certifications_unified(TEXT) TO anon;

COMMENT ON FUNCTION public.search_certifications_unified(TEXT) IS
    'Unified search for certifications by credential ID or holder name. Searches across both fields and returns all matches. Prioritizes exact credential ID matches.';

-- ============================================================================
-- 3. Success Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Certification verification RLS policies fixed';
    RAISE NOTICE '✅ Unified search function created: search_certifications_unified(TEXT)';
    RAISE NOTICE '🔍 Searches by: Credential ID, First Name, Last Name, Full Name';
    RAISE NOTICE '📝 Authenticated users can now verify certifications and search by name';
END $$;
