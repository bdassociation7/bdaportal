-- =============================================================================
-- Migration: Country Analytics RPC
-- Date: 2026-03-09
-- Creates get_country_analytics() SECURITY DEFINER function that returns
-- per-country aggregates for the admin analytics dashboard.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_country_analytics(
    p_from          DATE DEFAULT NULL,
    p_to            DATE DEFAULT NULL,
    p_service       TEXT DEFAULT NULL,  -- 'membership' | 'certification' | 'mock_exam' | 'voucher'
    p_cert_type     TEXT DEFAULT NULL   -- 'CP' | 'SCP'
)
RETURNS TABLE (
    country_code        TEXT,
    total_users         BIGINT,
    active_members      BIGINT,
    basic_members       BIGINT,
    professional_members BIGINT,
    total_certifications BIGINT,
    cp_certifications   BIGINT,
    scp_certifications  BIGINT,
    unused_vouchers     BIGINT,
    used_vouchers       BIGINT,
    mock_attempts       BIGINT,
    cert_attempts       BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Restrict to admins
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    RETURN QUERY
    WITH
    -- Users per country (ignore NULL/empty country)
    user_counts AS (
        SELECT
            country_code,
            COUNT(*) AS total_users
        FROM public.users
        WHERE country_code IS NOT NULL
          AND country_code <> ''
          AND role = 'individual'
        GROUP BY country_code
    ),
    -- Active memberships per country
    membership_counts AS (
        SELECT
            u.country_code,
            COUNT(*) FILTER (WHERE um.status = 'active')                   AS active_members,
            COUNT(*) FILTER (WHERE um.status = 'active' AND um.membership_type::TEXT = 'basic') AS basic_members,
            COUNT(*) FILTER (WHERE um.status = 'active' AND um.membership_type::TEXT = 'professional') AS professional_members
        FROM public.user_memberships um
        JOIN public.users u ON u.id = um.user_id
        WHERE u.country_code IS NOT NULL AND u.country_code <> ''
          AND (p_from IS NULL OR um.start_date >= p_from)
          AND (p_to   IS NULL OR um.start_date <= p_to)
          AND (p_service IS NULL OR p_service = 'membership')
        GROUP BY u.country_code
    ),
    -- Certifications per country
    cert_counts AS (
        SELECT
            u.country_code,
            COUNT(*)                                                         AS total_certifications,
            COUNT(*) FILTER (WHERE uc.certification_type = 'CP')            AS cp_certifications,
            COUNT(*) FILTER (WHERE uc.certification_type = 'SCP')           AS scp_certifications
        FROM public.user_certifications uc
        JOIN public.users u ON u.id = uc.user_id
        WHERE u.country_code IS NOT NULL AND u.country_code <> ''
          AND (p_from IS NULL OR uc.issued_date::DATE >= p_from)
          AND (p_to   IS NULL OR uc.issued_date::DATE <= p_to)
          AND (p_cert_type IS NULL OR uc.certification_type::TEXT = p_cert_type)
          AND (p_service IS NULL OR p_service = 'certification')
        GROUP BY u.country_code
    ),
    -- Vouchers per country
    voucher_counts AS (
        SELECT
            u.country_code,
            COUNT(*) FILTER (WHERE ev.status = 'unused')  AS unused_vouchers,
            COUNT(*) FILTER (WHERE ev.status = 'used')    AS used_vouchers
        FROM public.exam_vouchers ev
        JOIN public.users u ON u.id = ev.user_id
        WHERE u.country_code IS NOT NULL AND u.country_code <> ''
          AND (p_from IS NULL OR ev.created_at::DATE >= p_from)
          AND (p_to   IS NULL OR ev.created_at::DATE <= p_to)
          AND (p_cert_type IS NULL OR LOWER(ev.certification_type::TEXT) = LOWER(p_cert_type))
          AND (p_service IS NULL OR p_service = 'voucher')
        GROUP BY u.country_code
    ),
    -- Quiz attempts per country
    attempt_counts AS (
        SELECT
            u.country_code,
            COUNT(*) FILTER (WHERE qa.exam_type = 'mock')          AS mock_attempts,
            COUNT(*) FILTER (WHERE qa.exam_type = 'certification') AS cert_attempts
        FROM public.quiz_attempts qa
        JOIN public.users u ON u.id = qa.user_id
        WHERE u.country_code IS NOT NULL AND u.country_code <> ''
          AND (p_from IS NULL OR qa.started_at::DATE >= p_from)
          AND (p_to   IS NULL OR qa.started_at::DATE <= p_to)
          AND (p_service IS NULL OR p_service = 'mock_exam' OR p_service = 'certification')
        GROUP BY u.country_code
    ),
    -- Union all country codes that appear anywhere
    all_countries AS (
        SELECT country_code FROM user_counts
        UNION
        SELECT country_code FROM membership_counts
        UNION
        SELECT country_code FROM cert_counts
        UNION
        SELECT country_code FROM voucher_counts
        UNION
        SELECT country_code FROM attempt_counts
    )
    SELECT
        ac.country_code,
        COALESCE(uc.total_users,            0) AS total_users,
        COALESCE(mc.active_members,         0) AS active_members,
        COALESCE(mc.basic_members,          0) AS basic_members,
        COALESCE(mc.professional_members,   0) AS professional_members,
        COALESCE(cc.total_certifications,   0) AS total_certifications,
        COALESCE(cc.cp_certifications,      0) AS cp_certifications,
        COALESCE(cc.scp_certifications,     0) AS scp_certifications,
        COALESCE(vc.unused_vouchers,        0) AS unused_vouchers,
        COALESCE(vc.used_vouchers,          0) AS used_vouchers,
        COALESCE(atc.mock_attempts,         0) AS mock_attempts,
        COALESCE(atc.cert_attempts,         0) AS cert_attempts
    FROM all_countries ac
    LEFT JOIN user_counts       uc  ON uc.country_code  = ac.country_code
    LEFT JOIN membership_counts mc  ON mc.country_code  = ac.country_code
    LEFT JOIN cert_counts       cc  ON cc.country_code  = ac.country_code
    LEFT JOIN voucher_counts    vc  ON vc.country_code  = ac.country_code
    LEFT JOIN attempt_counts    atc ON atc.country_code = ac.country_code
    ORDER BY total_users DESC, ac.country_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_country_analytics(DATE, DATE, TEXT, TEXT) TO authenticated;

SELECT '✅ get_country_analytics() RPC applied' AS status;
