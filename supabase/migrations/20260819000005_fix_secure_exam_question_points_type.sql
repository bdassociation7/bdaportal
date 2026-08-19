-- Fix numeric points type in secure candidate question delivery.
CREATE OR REPLACE FUNCTION public.get_certification_attempt_questions(p_attempt_id UUID)
RETURNS TABLE (
  order_index INTEGER,
  id UUID,
  question_text TEXT,
  question_text_ar TEXT,
  question_type TEXT,
  points NUMERIC,
  answers JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.quiz_attempts;
BEGIN
  SELECT qa.* INTO v_attempt
  FROM public.quiz_attempts qa
  WHERE qa.id = p_attempt_id
    AND qa.user_id = auth.uid()
    AND qa.exam_type = 'certification'
    AND qa.status IN ('not_started', 'in_progress');

  IF v_attempt IS NULL THEN
    RAISE EXCEPTION 'Certification attempt is not available';
  END IF;

  RETURN QUERY
  SELECT
    eaqs.order_index::INTEGER,
    cqb.id,
    cqb.question_text,
    cqb.question_text_ar,
    cqb.question_type,
    cqb.points::NUMERIC,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', answer_item.id,
          'answer_text', answer_item.answer_text,
          'answer_text_ar', answer_item.answer_text_ar,
          'order_index', answer_item.order_index
        ) ORDER BY answer_item.order_index
      ) FILTER (WHERE answer_item.id IS NOT NULL),
      '[]'::jsonb
    ) AS answers
  FROM public.exam_attempt_question_set eaqs
  JOIN public.certification_question_bank cqb ON cqb.id = eaqs.question_id
  LEFT JOIN public.certification_question_bank_answers answer_item ON answer_item.question_id = cqb.id
  WHERE eaqs.attempt_id = p_attempt_id
  GROUP BY eaqs.order_index, cqb.id, cqb.question_text, cqb.question_text_ar, cqb.question_type, cqb.points
  ORDER BY eaqs.order_index;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_certification_attempt_answers(p_attempt_id UUID)
RETURNS TABLE (question_id UUID, selected_answer_ids UUID[], answered_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.id = p_attempt_id
      AND qa.user_id = auth.uid()
      AND qa.exam_type = 'certification'
  ) THEN
    RAISE EXCEPTION 'Certification attempt is not available';
  END IF;

  RETURN QUERY
  SELECT answer_row.question_id, answer_row.selected_answer_ids, answer_row.answered_at
  FROM public.quiz_attempt_answers answer_row
  WHERE answer_row.attempt_id = p_attempt_id
  ORDER BY answer_row.answered_at;
END;
$$;
