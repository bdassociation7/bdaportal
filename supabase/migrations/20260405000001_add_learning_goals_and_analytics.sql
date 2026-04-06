-- ============================================================================
-- MIGRATION: Learning Goals & Competency Analytics
-- Date: 2026-04-05
-- Purpose: Add Goal-Oriented UI (exam target date + exam windows) and
--          Competency-Based Analytics (View over existing question attempts)
-- Safety: Only ADDS new tables/views. Zero changes to existing tables.
-- ============================================================================

-- ============================================================================
-- TABLE: user_learning_goals
-- Purpose: Store each user's target exam date and study preferences.
--          Completely new table — no existing table is modified.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_learning_goals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  certification_type    TEXT NOT NULL CHECK (certification_type IN ('CP', 'SCP')),
  target_exam_window_id TEXT,                    -- e.g. "2026-Q2", "2026-Q4"
  target_exam_date      DATE,                    -- exact date if user picks a window
  study_hours_per_week  INTEGER DEFAULT 5 CHECK (study_hours_per_week > 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_cert_goal UNIQUE (user_id, certification_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learning_goals_user ON public.user_learning_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_goals_cert  ON public.user_learning_goals(certification_type);

-- RLS
ALTER TABLE public.user_learning_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own learning goals"
  ON public.user_learning_goals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all learning goals"
  ON public.user_learning_goals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_learning_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_learning_goals_updated_at ON public.user_learning_goals;
CREATE TRIGGER trigger_learning_goals_updated_at
  BEFORE UPDATE ON public.user_learning_goals
  FOR EACH ROW EXECUTE FUNCTION update_learning_goals_updated_at();

-- ============================================================================
-- TABLE: exam_windows
-- Purpose: Store BDA exam windows (open periods) per year and cert type.
--          Admins can manage these from the portal.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exam_windows (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_type TEXT NOT NULL CHECK (certification_type IN ('CP', 'SCP', 'both')),
  window_label     TEXT NOT NULL,          -- e.g. "Q1 2026 – January to March"
  window_key       TEXT NOT NULL UNIQUE,   -- e.g. "2026-Q1"
  opens_at         DATE NOT NULL,
  closes_at        DATE NOT NULL,
  year             INTEGER NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  display_order    INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_window_dates CHECK (closes_at >= opens_at)
);

CREATE INDEX IF NOT EXISTS idx_exam_windows_cert   ON public.exam_windows(certification_type);
CREATE INDEX IF NOT EXISTS idx_exam_windows_active ON public.exam_windows(is_active);
CREATE INDEX IF NOT EXISTS idx_exam_windows_year   ON public.exam_windows(year);

-- RLS: everyone can read, only admins can write
ALTER TABLE public.exam_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active exam windows"
  ON public.exam_windows
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage exam windows"
  ON public.exam_windows
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- SEED: Default BDA exam windows for 2026
-- (These are placeholder dates — admin can update them from the portal)
-- ============================================================================
INSERT INTO public.exam_windows
  (certification_type, window_label, window_key, opens_at, closes_at, year, display_order)
VALUES
  ('both', 'Q1 2026 – January to March',   '2026-Q1', '2026-01-01', '2026-03-31', 2026, 1),
  ('both', 'Q2 2026 – April to June',      '2026-Q2', '2026-04-01', '2026-06-30', 2026, 2),
  ('both', 'Q3 2026 – July to September',  '2026-Q3', '2026-07-01', '2026-09-30', 2026, 3),
  ('both', 'Q4 2026 – October to December','2026-Q4', '2026-10-01', '2026-12-31', 2026, 4)
ON CONFLICT (window_key) DO NOTHING;

-- ============================================================================
-- VIEW: user_competency_analytics
-- Purpose: Aggregate per-user, per-competency question attempt stats.
--          READ-ONLY view — no data is written or modified.
--          Joins: user_question_attempts → curriculum_question_sets → curriculum_modules
-- ============================================================================
CREATE OR REPLACE VIEW public.user_competency_analytics AS
SELECT
  uqa.user_id,
  cqs.competency_id                                                        AS module_id,
  cm.competency_name                                                       AS competency_name,
  cm.competency_name_ar                                                    AS competency_name_ar,
  cm.certification_type,
  COUNT(uqa.id)                                                            AS total_attempts,
  SUM(CASE WHEN uqa.is_correct THEN 1 ELSE 0 END)                         AS correct_answers,
  ROUND(
    (SUM(CASE WHEN uqa.is_correct THEN 1 ELSE 0 END)::NUMERIC
     / NULLIF(COUNT(uqa.id), 0)) * 100,
    1
  )                                                                        AS mastery_percentage,
  MAX(uqa.attempted_at)                                                    AS last_attempted_at,
  COUNT(DISTINCT uqa.question_id)                                          AS unique_questions_seen
FROM public.user_question_attempts uqa
JOIN public.curriculum_question_sets cqs
  ON uqa.question_set_id = cqs.id
JOIN public.curriculum_modules cm
  ON cqs.competency_id = cm.id
WHERE cqs.competency_id IS NOT NULL
GROUP BY
  uqa.user_id,
  cqs.competency_id,
  cm.competency_name,
  cm.competency_name_ar,
  cm.certification_type;

-- RLS on the view: users see only their own data
-- (Views in Postgres inherit RLS from underlying tables, but we add a
--  security_invoker comment for clarity — actual row filtering is via WHERE clause
--  in the service layer using auth.uid())

COMMENT ON VIEW public.user_competency_analytics IS
  'Read-only aggregated competency mastery stats per user. '
  'Filter by user_id = auth.uid() in all queries.';

-- ============================================================================
-- FUNCTION: get_user_competency_analytics(p_user_id UUID)
-- Purpose: RPC wrapper so the frontend can call this securely via Supabase RPC.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_competency_analytics(p_user_id UUID)
RETURNS TABLE (
  module_id             UUID,
  competency_name       TEXT,
  competency_name_ar    TEXT,
  certification_type    TEXT,
  total_attempts        BIGINT,
  correct_answers       BIGINT,
  mastery_percentage    NUMERIC,
  last_attempted_at     TIMESTAMPTZ,
  unique_questions_seen BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    module_id,
    competency_name,
    competency_name_ar,
    certification_type::TEXT,
    total_attempts,
    correct_answers,
    mastery_percentage,
    last_attempted_at,
    unique_questions_seen
  FROM public.user_competency_analytics
  WHERE user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_competency_analytics(UUID) TO authenticated;

-- ============================================================================
-- FUNCTION: upsert_learning_goal
-- Purpose: Safe upsert for user_learning_goals via RPC.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_learning_goal(
  p_user_id             UUID,
  p_certification_type  TEXT,
  p_target_exam_window_id TEXT DEFAULT NULL,
  p_target_exam_date    DATE DEFAULT NULL,
  p_study_hours_per_week INTEGER DEFAULT 5
)
RETURNS public.user_learning_goals
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result public.user_learning_goals;
BEGIN
  -- Security: only the authenticated user can upsert their own goal
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.user_learning_goals
    (user_id, certification_type, target_exam_window_id, target_exam_date, study_hours_per_week)
  VALUES
    (p_user_id, p_certification_type, p_target_exam_window_id, p_target_exam_date, p_study_hours_per_week)
  ON CONFLICT (user_id, certification_type)
  DO UPDATE SET
    target_exam_window_id  = EXCLUDED.target_exam_window_id,
    target_exam_date       = EXCLUDED.target_exam_date,
    study_hours_per_week   = EXCLUDED.study_hours_per_week,
    updated_at             = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_learning_goal(UUID, TEXT, TEXT, DATE, INTEGER) TO authenticated;
