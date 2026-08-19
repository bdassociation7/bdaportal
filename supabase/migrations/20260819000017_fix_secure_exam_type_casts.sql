-- Server-side enforcement for the candidate integrity acknowledgement recorded at exam launch.

CREATE OR REPLACE FUNCTION public.start_certification_exam(
  p_user_id UUID,
  p_quiz_id UUID,
  p_voucher_id UUID DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_browser_info JSONB DEFAULT NULL
) RETURNS public.quiz_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz RECORD;
  v_attempt public.quiz_attempts;
  v_proctoring_token UUID;
  v_time_limit_seconds INTEGER;
  v_blueprint_count INTEGER;
  v_order_counter INTEGER := 0;
  v_blueprint RECORD;
  v_question_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'You may only start an exam for your own account'; END IF;
  IF COALESCE(p_browser_info->>'integrity_policy_version', '') <> '2026-08-19' OR p_browser_info->>'integrity_acknowledged_at' IS NULL THEN
    RAISE EXCEPTION 'BDA Secure Exam integrity acknowledgement is required before starting an official examination';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id AND is_active = TRUE AND certification_type IS NOT NULL;
  IF v_quiz IS NULL THEN RAISE EXCEPTION 'Certification exam not found or not active'; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_attempts WHERE user_id = auth.uid() AND quiz_id = p_quiz_id AND status IN ('not_started', 'in_progress', 'paused')) THEN RAISE EXCEPTION 'An active attempt already exists for this examination'; END IF;
  IF p_voucher_id IS NULL THEN RAISE EXCEPTION 'A valid examination voucher is required'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.exam_vouchers WHERE id = p_voucher_id AND user_id = auth.uid() AND status IN ('available', 'assigned'))
    AND NOT EXISTS (
      SELECT 1 FROM public.ecp_vouchers ev JOIN public.users candidate ON candidate.id = auth.uid()
      WHERE ev.id = p_voucher_id AND LOWER(ev.assigned_to_email) = LOWER(candidate.email)
        AND ev.certification_type = v_quiz.certification_type AND ev.status IN ('available', 'assigned')
    ) THEN RAISE EXCEPTION 'Voucher is not valid for this examination'; END IF;

  v_proctoring_token := gen_random_uuid();
  v_time_limit_seconds := v_quiz.time_limit_minutes * 60;
  INSERT INTO public.quiz_attempts (
    quiz_id, user_id, status, proctoring_token, proctoring_token_expires_at,
    session_id, time_remaining_seconds, ip_address, user_agent, browser_info, exam_type
  ) VALUES (
    p_quiz_id, auth.uid(), 'not_started', v_proctoring_token,
    NOW() + (v_quiz.time_limit_minutes + 120) * INTERVAL '1 minute',
    gen_random_uuid(), v_time_limit_seconds, p_ip_address, p_user_agent, p_browser_info, 'certification'
  ) RETURNING * INTO v_attempt;

  UPDATE public.exam_vouchers SET status = 'used', used_at = NOW(), attempt_id = v_attempt.id
    WHERE id = p_voucher_id AND user_id = auth.uid() AND status IN ('available', 'assigned');
  IF NOT FOUND THEN
    UPDATE public.ecp_vouchers ev SET status = 'used', used_at = NOW(), exam_attempt_id = v_attempt.id
      FROM public.users candidate WHERE ev.id = p_voucher_id AND candidate.id = auth.uid()
        AND LOWER(ev.assigned_to_email) = LOWER(candidate.email) AND ev.status IN ('available', 'assigned');
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Voucher could not be consumed'; END IF;

  SELECT COUNT(*) INTO v_blueprint_count
  FROM public.eco_blueprint_config
  WHERE certification_type = v_quiz.certification_type::text;

  IF v_blueprint_count > 0 AND v_quiz.exam_language IS NOT NULL THEN
    FOR v_blueprint IN
      SELECT competency_name, question_count
      FROM public.eco_blueprint_config
      WHERE certification_type = v_quiz.certification_type
        AND question_count > 0
      ORDER BY order_index
    LOOP
      FOR v_question_id IN
        SELECT q.id
        FROM public.certification_question_bank q
        WHERE q.certification_type = v_quiz.certification_type::text
          AND q.exam_language = v_quiz.exam_language::text
          AND q.competency_name = v_blueprint.competency_name
          AND q.is_active = TRUE
        ORDER BY random()
        LIMIT v_blueprint.question_count
      LOOP
        v_order_counter := v_order_counter + 1;
        INSERT INTO public.exam_attempt_question_set (attempt_id, question_id, order_index)
        VALUES (v_attempt.id, v_question_id, v_order_counter)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  ELSIF v_quiz.exam_language IS NOT NULL THEN
    FOR v_question_id IN
      SELECT q.id
      FROM public.certification_question_bank q
      WHERE q.certification_type = v_quiz.certification_type
        AND q.exam_language = v_quiz.exam_language
        AND q.is_active = TRUE
      ORDER BY random()
      LIMIT 120
    LOOP
      v_order_counter := v_order_counter + 1;
      INSERT INTO public.exam_attempt_question_set (attempt_id, question_id, order_index)
      VALUES (v_attempt.id, v_question_id, v_order_counter)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  IF v_order_counter = 0 THEN RAISE EXCEPTION 'No active examination questions are available'; END IF;

  INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
  VALUES (v_attempt.id, 'exam_started', jsonb_build_object('integrity_policy_version', p_browser_info->>'integrity_policy_version', 'integrity_acknowledged_at', p_browser_info->>'integrity_acknowledged_at'));
  RETURN v_attempt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_certification_exam(UUID, UUID, UUID, UUID, INET, TEXT, JSONB) TO authenticated;
