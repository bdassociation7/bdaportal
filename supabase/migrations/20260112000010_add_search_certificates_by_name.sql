-- Add function to search certificates by holder name
-- This enables verification by name in addition to credential ID

CREATE OR REPLACE FUNCTION search_certificates_by_name(p_search_name TEXT)
RETURNS TABLE (
    credential_id TEXT,
    holder_name TEXT,
    certification_type TEXT,
    issued_date DATE,
    expiry_date DATE,
    status TEXT,
    is_valid BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        uc.credential_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as holder_name,
        uc.certification_type::TEXT,
        uc.issued_date,
        uc.expiry_date,
        uc.status::TEXT,
        (uc.status = 'active' AND uc.expiry_date >= CURRENT_DATE) as is_valid
    FROM user_certifications uc
    JOIN users u ON u.id = uc.user_id
    WHERE (
        -- Case-insensitive search on full name
        LOWER(u.first_name || ' ' || u.last_name) LIKE LOWER('%' || p_search_name || '%')
        OR LOWER(u.first_name) LIKE LOWER('%' || p_search_name || '%')
        OR LOWER(u.last_name) LIKE LOWER('%' || p_search_name || '%')
    )
    ORDER BY
        -- Active certificates first
        (uc.status = 'active' AND uc.expiry_date >= CURRENT_DATE) DESC,
        -- Then by issue date (newest first)
        uc.issued_date DESC
    LIMIT 50; -- Limit results to prevent performance issues
END;
$$;

-- Grant execute permission to anonymous users (public verification)
GRANT EXECUTE ON FUNCTION search_certificates_by_name TO anon;
GRANT EXECUTE ON FUNCTION search_certificates_by_name TO authenticated;

COMMENT ON FUNCTION search_certificates_by_name IS
    'Search certificates by holder name. Returns up to 50 matching certificates ordered by validity and issue date.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Certificate name search function created';
    RAISE NOTICE '🔍 Public users can now search certificates by holder name';
    RAISE NOTICE '📋 Returns credential ID, holder name, type, dates, and validity status';
END $$;
