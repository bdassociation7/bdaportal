-- Migration: Add PDP Program Enrollment Count
-- Date: 2026-01-09
-- Description: Adds enrollment counting functionality for PDP programs
--              Counts distinct users who have submitted PDCs using each program's ID

-- ============================================================================
-- 1. Create view with enrollment counts
-- ============================================================================

CREATE OR REPLACE VIEW public.pdp_programs_with_enrollments AS
SELECT
    pp.*,
    COALESCE(enrollment_stats.enrollment_count, 0) AS enrollment_count,
    COALESCE(enrollment_stats.total_pdcs, 0) AS total_pdcs,
    COALESCE(enrollment_stats.approved_pdcs, 0) AS approved_pdcs
FROM public.pdp_programs pp
LEFT JOIN (
    SELECT
        program_id,
        COUNT(DISTINCT user_id) AS enrollment_count,
        COUNT(*) AS total_pdcs,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved_pdcs
    FROM public.pdc_entries
    WHERE program_id IS NOT NULL
    GROUP BY program_id
) enrollment_stats ON pp.program_id = enrollment_stats.program_id;

COMMENT ON VIEW public.pdp_programs_with_enrollments IS
    'PDP programs with enrollment statistics. Includes count of distinct users who submitted PDCs, total PDCs submitted, and approved PDCs count.';

-- ============================================================================
-- 2. Grant access to view
-- ============================================================================

-- Grant SELECT to authenticated users (they can already see pdp_programs based on RLS)
GRANT SELECT ON public.pdp_programs_with_enrollments TO authenticated;

-- ============================================================================
-- 3. Create RPC function for PDP partners to get their programs with stats
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_pdp_programs_with_stats()
RETURNS SETOF public.pdp_programs_with_enrollments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Return programs for the current user (PDP partner)
    RETURN QUERY
    SELECT *
    FROM public.pdp_programs_with_enrollments
    WHERE provider_id = auth.uid()
    ORDER BY created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_my_pdp_programs_with_stats() IS
    'Get all programs for the current PDP partner with enrollment statistics';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_pdp_programs_with_stats() TO authenticated;

-- ============================================================================
-- 4. Create function to get single program with stats
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_pdp_program_with_stats(p_program_id UUID)
RETURNS SETOF public.pdp_programs_with_enrollments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Return the specific program with stats
    RETURN QUERY
    SELECT *
    FROM public.pdp_programs_with_enrollments
    WHERE id = p_program_id
    AND (
        provider_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    )
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_pdp_program_with_stats(UUID) IS
    'Get a specific program with enrollment statistics (for program owner or admin)';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_pdp_program_with_stats(UUID) TO authenticated;

-- ============================================================================
-- 5. Verification
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ PDP program enrollment counting implemented successfully';
    RAISE NOTICE '📊 View created: pdp_programs_with_enrollments';
    RAISE NOTICE '📝 Functions created:';
    RAISE NOTICE '   - get_my_pdp_programs_with_stats()';
    RAISE NOTICE '   - get_pdp_program_with_stats(UUID)';
    RAISE NOTICE '🔢 Enrollment count now tracks distinct users per program';
    RAISE NOTICE '📈 Additional stats: total PDCs submitted, approved PDCs';
END $$;
