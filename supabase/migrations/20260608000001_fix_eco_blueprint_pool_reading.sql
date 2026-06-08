-- Migration: Fix ECO Blueprint Pool Reading
-- Problem: The ECO Blueprint Manager cannot read quiz_questions competency pool sizes
--          because the RLS policy requires admin JWT token but the query returns 0 rows.
-- Solution: Create a SECURITY DEFINER function that admins can call to get pool sizes.
-- ─────────────────────────────────────────────────────────────────────────────

-- Function: get_eco_pool_sizes
-- Returns competency pool sizes for a given quiz (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.get_eco_pool_sizes(p_quiz_id UUID)
RETURNS TABLE (
  competency_section TEXT,
  competency_name    TEXT,
  question_count     BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    competency_section,
    competency_name,
    COUNT(*) AS question_count
  FROM public.quiz_questions
  WHERE quiz_id = p_quiz_id
    AND competency_name IS NOT NULL
  GROUP BY competency_section, competency_name
  ORDER BY competency_section, competency_name;
$$;

-- Only admins and super_admins can call this function
REVOKE EXECUTE ON FUNCTION public.get_eco_pool_sizes(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_eco_pool_sizes(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_eco_pool_sizes IS
  'Returns competency pool sizes for ECO Blueprint Manager. '
  'Uses SECURITY DEFINER to bypass RLS safely for admin pool inspection.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Also ensure the eco_blueprint_config RLS allows admin read
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Drop existing policy if exists to recreate cleanly
  DROP POLICY IF EXISTS "Admins manage eco blueprint" ON public.eco_blueprint_config;
  DROP POLICY IF EXISTS "Admins read eco blueprint" ON public.eco_blueprint_config;
  DROP POLICY IF EXISTS "Admins can manage eco_blueprint_config" ON public.eco_blueprint_config;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Admins manage eco blueprint"
ON public.eco_blueprint_config FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);
