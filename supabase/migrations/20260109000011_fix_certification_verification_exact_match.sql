-- Migration: Fix Certificate Verification to Use Exact Match
-- Date: 2026-01-09
-- Description: Changes search_certifications_unified to require exact Credential ID match
--              Partial searches should not return results for certificate verification

-- Drop existing function
DROP FUNCTION IF EXISTS public.search_certifications_unified(TEXT);

-- Recreate the function with EXACT matching for credential ID
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
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_renewed_at TIMESTAMPTZ,
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
        uc.created_at,
        uc.updated_at,
        uc.last_renewed_at,
        TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS user_name,
        u.email AS user_email
    FROM public.user_certifications uc
    INNER JOIN public.users u ON uc.user_id = u.id
    WHERE
        -- EXACT match for credential ID only (case-insensitive)
        LOWER(uc.credential_id) = LOWER(TRIM(p_search_query))
    ORDER BY
        uc.issued_date DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_certifications_unified(TEXT) TO authenticated;

-- Also grant to anon for public verification
GRANT EXECUTE ON FUNCTION public.search_certifications_unified(TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION public.search_certifications_unified(TEXT) IS
    'Certificate verification search with EXACT credential ID matching only. No partial matches allowed. For security and accuracy, only full credential IDs return results.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Certificate verification search fixed';
    RAISE NOTICE '🔒 Changed to EXACT match only for Credential ID';
    RAISE NOTICE '✓ Partial searches (CP, 2026, 0001) will return no results';
    RAISE NOTICE '✓ Only full Credential ID (CP-2026-0001) returns the certificate';
END $$;
