-- Return no candidate-visible data from secure answer saving.
DROP FUNCTION IF EXISTS public.save_exam_answer(UUID, UUID, UUID[], INTEGER);

CREATE FUNCTION public.save_exam_answer(
  p_attempt_id UUID,
  p_question_id UUID,
  p_selected_answer_ids UUID[],
  p_time_spent_seconds INTEGER DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.quiz_attempts;
  v_time_limit_minutes INTEGER;
  v_is_correct BOOLEAN;
  v_points_earned DECIMAL;
  v_question RECORD;
BEGIN
  SELECT qa.* INTO v_attempt
  FROM public.quiz_attempts qa
  WHERE qa.id = p_attempt_id
    AND qa.user_id = auth.uid()
    AND qa.exam_type = 'certification'
    AND qa.status = 'in_progress'
  FOR UPDATE;

  IF v_attempt IS NULL THEN
    RAISE EXCEPTION 'Certification attempt is not active';
  END IF;

  SELECT time_limit_minutes INTO v_time_limit_minutes
  FROM public.quizzes
  WHERE id = v_attempt.quiz_id;

  IF v_attempt.started_at IS NULL OR NOW() > v_attempt.started_at + v_time_limit_minutes * INTERVAL '1 minute' THEN
    RAISE EXCEPTION 'Certification examination time has expired';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.exam_attempt_question_set assigned_question
    WHERE assigned_question.attempt_id = p_attempt_id
      AND assigned_question.question_id = p_question_id
  ) THEN
    RAISE EXCEPTION 'Question is not assigned to this certification attempt';
  END IF;

  SELECT
    cqb.id,
    cqb.question_type,
    cqb.points,
    ARRAY_AGG(answer_item.id) FILTER (WHERE answer_item.is_correct = TRUE) AS correct_answer_ids,
    ARRAY_AGG(answer_item.id) AS all_answer_ids
  INTO v_question
  FROM public.certification_question_bank cqb
  LEFT JOIN public.certification_question_bank_answers answer_item ON answer_item.question_id = cqb.id
  WHERE cqb.id = p_question_id
  GROUP BY cqb.id, cqb.question_type, cqb.points;

  IF v_question IS NULL OR p_selected_answer_ids IS NULL OR cardinality(p_selected_answer_ids) = 0 THEN
    RAISE EXCEPTION 'A valid answer selection is required';
  END IF;

  IF NOT (p_selected_answer_ids <@ v_question.all_answer_ids) THEN
    RAISE EXCEPTION 'Selected answer is not valid for this question';
  END IF;

  IF v_question.question_type = 'multi_select' THEN
    v_is_correct := p_selected_answer_ids <@ v_question.correct_answer_ids
                    AND v_question.correct_answer_ids <@ p_selected_answer_ids;
  ELSE
    v_is_correct := p_selected_answer_ids && v_question.correct_answer_ids;
  END IF;

  v_points_earned := CASE WHEN v_is_correct THEN v_question.points ELSE 0 END;

  INSERT INTO public.quiz_attempt_answers (
    attempt_id, question_id, selected_answer_ids, is_correct, points_earned,
    answered_at, time_spent_seconds, answer_changes
  ) VALUES (
    p_attempt_id, p_question_id, p_selected_answer_ids, v_is_correct, v_points_earned,
    NOW(), LEAST(GREATEST(COALESCE(p_time_spent_seconds, 0), 0), 3600), 0
  ) ON CONFLICT (attempt_id, question_id) DO UPDATE
  SET selected_answer_ids = EXCLUDED.selected_answer_ids,
      is_correct = EXCLUDED.is_correct,
      points_earned = EXCLUDED.points_earned,
      answered_at = NOW(),
      time_spent_seconds = COALESCE(EXCLUDED.time_spent_seconds, quiz_attempt_answers.time_spent_seconds),
      answer_changes = quiz_attempt_answers.answer_changes + 1;

  UPDATE public.quiz_attempts
  SET last_activity_at = NOW()
  WHERE id = p_attempt_id;

  INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
  VALUES (p_attempt_id, 'answer_saved', jsonb_build_object('question_id', p_question_id));

  RETURN;
END;
$$;
GRANT EXECUTE ON FUNCTION public.save_exam_answer(UUID, UUID, UUID[], INTEGER) TO authenticated;
