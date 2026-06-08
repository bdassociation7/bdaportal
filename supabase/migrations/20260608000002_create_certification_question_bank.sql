-- ============================================================
-- Migration: Create Certification Question Bank
-- Separates official certification exam questions from
-- learning system quizzes into a dedicated table.
-- ============================================================

-- 1. Create the new certification_question_bank table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.certification_question_bank (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_type    TEXT NOT NULL CHECK (certification_type IN ('CP', 'SCP')),
  exam_language         TEXT NOT NULL CHECK (exam_language IN ('en', 'ar')),
  question_text         TEXT NOT NULL,
  question_text_ar      TEXT,
  question_type         TEXT NOT NULL DEFAULT 'multiple_choice',
  difficulty            TEXT NOT NULL DEFAULT 'medium',
  points                INTEGER NOT NULL DEFAULT 1,
  competency_section    TEXT,
  competency_name       TEXT,
  sub_competency_name   TEXT,
  bock_domain           TEXT,
  tags                  TEXT[],
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create certification_question_bank_answers table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.certification_question_bank_answers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID NOT NULL REFERENCES public.certification_question_bank(id) ON DELETE CASCADE,
  answer_text   TEXT NOT NULL,
  answer_text_ar TEXT,
  is_correct    BOOLEAN NOT NULL DEFAULT FALSE,
  explanation   TEXT,
  explanation_ar TEXT,
  order_index   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cqb_cert_type_lang
  ON public.certification_question_bank(certification_type, exam_language);

CREATE INDEX IF NOT EXISTS idx_cqb_competency
  ON public.certification_question_bank(competency_name);

CREATE INDEX IF NOT EXISTS idx_cqb_active
  ON public.certification_question_bank(is_active);

CREATE INDEX IF NOT EXISTS idx_cqba_question_id
  ON public.certification_question_bank_answers(question_id);

-- 4. Migrate existing questions from quiz_questions to certification_question_bank
-- ============================================================
-- We use a CTE to map quiz_id → (certification_type, exam_language)
WITH quiz_map AS (
  SELECT id, certification_type, exam_language
  FROM public.quizzes
  WHERE certification_type IS NOT NULL
    AND exam_language IS NOT NULL
),
inserted AS (
  INSERT INTO public.certification_question_bank (
    id,
    certification_type,
    exam_language,
    question_text,
    question_text_ar,
    question_type,
    difficulty,
    points,
    competency_section,
    competency_name,
    sub_competency_name,
    bock_domain,
    tags,
    is_active,
    created_at,
    updated_at
  )
  SELECT
    qq.id,
    qm.certification_type,
    qm.exam_language,
    qq.question_text,
    qq.question_text_ar,
    qq.question_type::TEXT,
    qq.difficulty::TEXT,
    qq.points,
    qq.competency_section,
    qq.competency_name,
    qq.sub_competency_name,
    qq.bock_domain,
    qq.tags,
    TRUE,
    qq.created_at,
    qq.updated_at
  FROM public.quiz_questions qq
  JOIN quiz_map qm ON qm.id = qq.quiz_id
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
SELECT COUNT(*) as migrated_questions FROM inserted;

-- 5. Migrate answers for the migrated questions
-- ============================================================
INSERT INTO public.certification_question_bank_answers (
  id,
  question_id,
  answer_text,
  answer_text_ar,
  is_correct,
  explanation,
  explanation_ar,
  order_index,
  created_at
)
SELECT
  qa.id,
  qa.question_id,
  qa.answer_text,
  qa.answer_text_ar,
  qa.is_correct,
  qa.explanation,
  qa.explanation_ar,
  qa.order_index,
  qa.created_at
FROM public.quiz_answers qa
JOIN public.certification_question_bank cqb ON cqb.id = qa.question_id
ON CONFLICT (id) DO NOTHING;

-- 6. Enable RLS
-- ============================================================
ALTER TABLE public.certification_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_question_bank_answers ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- ============================================================
-- Admins and super_admins can do everything
CREATE POLICY "Admins can manage certification question bank"
  ON public.certification_question_bank
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage certification question bank answers"
  ON public.certification_question_bank_answers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

-- 8. Update get_eco_pool_sizes function to read from new table
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_eco_pool_sizes(p_quiz_id UUID)
RETURNS TABLE (
  competency_name       TEXT,
  competency_section    TEXT,
  pool_size_en          BIGINT,
  pool_size_ar          BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_certification_type TEXT;
BEGIN
  -- Get certification_type from the quiz
  SELECT certification_type INTO v_certification_type
  FROM public.quizzes
  WHERE id = p_quiz_id;

  IF v_certification_type IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    cqb_en.competency_name,
    cqb_en.competency_section,
    COUNT(DISTINCT cqb_en.id)::BIGINT AS pool_size_en,
    COUNT(DISTINCT cqb_ar.id)::BIGINT AS pool_size_ar
  FROM public.certification_question_bank cqb_en
  FULL OUTER JOIN public.certification_question_bank cqb_ar
    ON cqb_ar.competency_name = cqb_en.competency_name
    AND cqb_ar.certification_type = v_certification_type
    AND cqb_ar.exam_language = 'ar'
    AND cqb_ar.is_active = TRUE
  WHERE cqb_en.certification_type = v_certification_type
    AND cqb_en.exam_language = 'en'
    AND cqb_en.is_active = TRUE
  GROUP BY cqb_en.competency_name, cqb_en.competency_section;
END;
$$;

-- 9. Updated trigger for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_certification_question_bank_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cqb_updated_at
  BEFORE UPDATE ON public.certification_question_bank
  FOR EACH ROW EXECUTE FUNCTION public.update_certification_question_bank_updated_at();
