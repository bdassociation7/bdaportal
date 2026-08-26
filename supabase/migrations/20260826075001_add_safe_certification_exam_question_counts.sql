-- Candidates must see the size of an official exam without receiving direct read access
-- to the question bank. Return the exact count that the start function can draw.

CREATE OR REPLACE FUNCTION public.get_certification_exam_question_counts(
  p_quiz_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  quiz_id UUID,
  question_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH target_exams AS (
    SELECT q.id, q.certification_type::text AS certification_type, q.exam_language::text AS exam_language
    FROM public.quizzes q
    WHERE q.is_active = TRUE
      AND q.quiz_type = 'certification'
      AND (p_quiz_ids IS NULL OR q.id = ANY(p_quiz_ids))
  ),
  blueprint_draw AS (
    SELECT
      e.id AS quiz_id,
      COUNT(b.id)::INTEGER AS blueprint_rows,
      COALESCE(SUM(LEAST(
        b.question_count,
        (
          SELECT COUNT(*)::INTEGER
          FROM public.certification_question_bank cqb
          WHERE cqb.certification_type = e.certification_type
            AND cqb.exam_language = e.exam_language
            AND cqb.competency_name = b.competency_name
            AND cqb.is_active = TRUE
        )
      )), 0)::INTEGER AS drawable_count
    FROM target_exams e
    LEFT JOIN public.eco_blueprint_config b
      ON b.certification_type::text = e.certification_type
      AND b.question_count > 0
    GROUP BY e.id
  ),
  fallback_draw AS (
    SELECT
      e.id AS quiz_id,
      LEAST(
        120,
        COUNT(cqb.id)::INTEGER
      ) AS drawable_count
    FROM target_exams e
    LEFT JOIN public.certification_question_bank cqb
      ON cqb.certification_type = e.certification_type
      AND cqb.exam_language = e.exam_language
      AND cqb.is_active = TRUE
    GROUP BY e.id
  )
  SELECT
    e.id AS quiz_id,
    CASE
      WHEN bd.blueprint_rows > 0 THEN bd.drawable_count
      ELSE fd.drawable_count
    END AS question_count
  FROM target_exams e
  JOIN blueprint_draw bd ON bd.quiz_id = e.id
  JOIN fallback_draw fd ON fd.quiz_id = e.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_certification_exam_question_counts(UUID[]) TO authenticated;
