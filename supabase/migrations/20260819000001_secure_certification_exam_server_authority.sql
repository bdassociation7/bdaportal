-- BDA Official Examination Security Layer 1
-- Server-authoritative delivery, answer secrecy, and trusted scoring/certification issuance.

-- =============================================================================
-- 1. Candidate-safe question delivery: no correctness or rationale leaves the DB
-- =============================================================================
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

-- =============================================================================
-- 2. Harden all state-changing functions to authenticate the attempt owner
-- =============================================================================
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
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'You may only start an exam for your own account';
  END IF;

  SELECT * INTO v_quiz
  FROM public.quizzes
  WHERE id = p_quiz_id
    AND is_active = TRUE
    AND certification_type IS NOT NULL;

  IF v_quiz IS NULL THEN
    RAISE EXCEPTION 'Certification exam not found or not active';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.quiz_attempts
    WHERE user_id = auth.uid()
      AND quiz_id = p_quiz_id
      AND status IN ('not_started', 'in_progress', 'paused')
  ) THEN
    RAISE EXCEPTION 'An active attempt already exists for this examination';
  END IF;

  IF p_voucher_id IS NULL THEN
    RAISE EXCEPTION 'A valid examination voucher is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.exam_vouchers
    WHERE id = p_voucher_id
      AND user_id = auth.uid()
      AND status IN ('available', 'assigned')
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.ecp_vouchers ev
    JOIN public.users candidate ON candidate.id = auth.uid()
    WHERE ev.id = p_voucher_id
      AND LOWER(ev.assigned_to_email) = LOWER(candidate.email)
      AND ev.certification_type = v_quiz.certification_type
      AND ev.status IN ('available', 'assigned')
  ) THEN
    RAISE EXCEPTION 'Voucher is not valid for this examination';
  END IF;

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

  UPDATE public.exam_vouchers
  SET status = 'used', used_at = NOW(), attempt_id = v_attempt.id
    WHERE id = p_voucher_id AND user_id = auth.uid() AND status IN ('available', 'assigned');

  IF NOT FOUND THEN
    UPDATE public.ecp_vouchers ev
    SET status = 'used', used_at = NOW(), exam_attempt_id = v_attempt.id
    FROM public.users candidate
    WHERE ev.id = p_voucher_id
      AND candidate.id = auth.uid()
      AND LOWER(ev.assigned_to_email) = LOWER(candidate.email)
      AND ev.status IN ('available', 'assigned');
  END IF;

  IF p_booking_id IS NOT NULL THEN
    UPDATE public.exam_bookings
    SET attempt_id = v_attempt.id
    WHERE id = p_booking_id AND user_id = auth.uid();
  END IF;

  INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
  VALUES (v_attempt.id, 'exam_created', jsonb_build_object(
    'quiz_id', p_quiz_id,
    'voucher_id', p_voucher_id,
    'booking_id', p_booking_id,
    'ip_address', p_ip_address::TEXT,
    'time_limit_seconds', v_time_limit_seconds
  ));

  SELECT COUNT(*) INTO v_blueprint_count
  FROM public.eco_blueprint_config
  WHERE certification_type = v_quiz.certification_type;

  IF v_blueprint_count > 0 AND v_quiz.exam_language IS NOT NULL THEN
    FOR v_blueprint IN
      SELECT competency_name, question_count
      FROM public.eco_blueprint_config
      WHERE certification_type = v_quiz.certification_type AND question_count > 0
      ORDER BY order_index
    LOOP
      FOR v_question_id IN
        SELECT id
        FROM public.certification_question_bank
        WHERE certification_type::TEXT = v_quiz.certification_type::TEXT
          AND exam_language::TEXT = v_quiz.exam_language::TEXT
          AND competency_name = v_blueprint.competency_name
          AND is_active = TRUE
        ORDER BY RANDOM()
        LIMIT v_blueprint.question_count
      LOOP
        v_order_counter := v_order_counter + 1;
        INSERT INTO public.exam_attempt_question_set (attempt_id, question_id, order_index)
        VALUES (v_attempt.id, v_question_id, v_order_counter);
      END LOOP;
    END LOOP;
  ELSE
    INSERT INTO public.exam_attempt_question_set (attempt_id, question_id, order_index)
    SELECT v_attempt.id, id, ROW_NUMBER() OVER (ORDER BY created_at)
    FROM public.certification_question_bank
    WHERE certification_type::TEXT = v_quiz.certification_type::TEXT
      AND exam_language::TEXT = v_quiz.exam_language::TEXT
      AND is_active = TRUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.exam_attempt_question_set WHERE attempt_id = v_attempt.id) THEN
    RAISE EXCEPTION 'No eligible questions are available for this examination';
  END IF;

  RETURN v_attempt;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.finalize_certification_exam_attempt(
  p_attempt_id UUID,
  p_auto_submit BOOLEAN DEFAULT FALSE
) RETURNS public.quiz_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.quiz_attempts;
  v_quiz RECORD;
  v_total_points DECIMAL := 0;
  v_earned_points DECIMAL := 0;
  v_score DECIMAL := 0;
  v_passed BOOLEAN := FALSE;
  v_credential_id TEXT;
BEGIN
  SELECT qa.*, q.certification_type, q.passing_score_percentage, q.time_limit_minutes
  INTO v_attempt
  FROM public.quiz_attempts qa
  JOIN public.quizzes q ON q.id = qa.quiz_id
  WHERE qa.id = p_attempt_id
    AND qa.user_id = auth.uid()
    AND qa.exam_type = 'certification'
    AND qa.status = 'in_progress'
  FOR UPDATE OF qa;

  IF v_attempt IS NULL THEN
    RAISE EXCEPTION 'Certification attempt is not active or does not belong to you';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_attempt.quiz_id;

  IF NOT p_auto_submit AND v_attempt.started_at IS NOT NULL
     AND NOW() > v_attempt.started_at + v_quiz.time_limit_minutes * INTERVAL '1 minute' THEN
    RAISE EXCEPTION 'Examination time has expired; wait for automatic finalisation';
  END IF;

  SELECT
    COALESCE(SUM(cqb.points), 0),
    COALESCE(SUM(answer_row.points_earned), 0)
  INTO v_total_points, v_earned_points
  FROM public.exam_attempt_question_set eaqs
  JOIN public.certification_question_bank cqb ON cqb.id = eaqs.question_id
  LEFT JOIN public.quiz_attempt_answers answer_row
    ON answer_row.attempt_id = p_attempt_id AND answer_row.question_id = eaqs.question_id
  WHERE eaqs.attempt_id = p_attempt_id;

  IF v_total_points > 0 THEN
    v_score := ROUND((v_earned_points / v_total_points) * 100, 2);
  END IF;
  v_passed := v_score >= v_quiz.passing_score_percentage;

  UPDATE public.quiz_attempts
  SET status = CASE WHEN v_passed THEN 'passed'::attempt_status ELSE 'failed'::attempt_status END,
      completed_at = NOW(),
      scored_at = NOW(),
      score = v_score,
      passed = v_passed,
      total_points_earned = v_earned_points,
      total_points_possible = v_total_points,
      last_activity_at = NOW()
  WHERE id = p_attempt_id;

  IF v_passed AND v_quiz.certification_type IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_certifications
       WHERE user_id = auth.uid()
         AND certification_type = v_quiz.certification_type
         AND status = 'active'
     ) THEN
    v_credential_id := public.generate_credential_id(v_quiz.certification_type);
    INSERT INTO public.user_certifications (
      user_id, certification_type, quiz_attempt_id, credential_id,
      issued_date, expiry_date, status, renewal_count
    ) VALUES (
      auth.uid(), v_quiz.certification_type, p_attempt_id, v_credential_id,
      CURRENT_DATE, CURRENT_DATE + INTERVAL '3 years', 'active', 0
    );
  END IF;

  INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
  VALUES (p_attempt_id, 'exam_finalised', jsonb_build_object(
    'auto_submit', p_auto_submit,
    'score', v_score,
    'passed', v_passed
  ));

  SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = p_attempt_id;
  RETURN v_attempt;
END;
$$;

-- =============================================================================
-- 3. Remove direct candidate access to authoritative exam records and answer keys
-- =============================================================================
DROP POLICY IF EXISTS "Candidates can read their exam questions" ON public.certification_question_bank;
DROP POLICY IF EXISTS "Candidates can read their exam answers" ON public.certification_question_bank_answers;
DROP POLICY IF EXISTS "Users read own attempt questions" ON public.exam_attempt_question_set;
DROP POLICY IF EXISTS "Users can view their own attempt answers" ON public.quiz_attempt_answers;
DROP POLICY IF EXISTS "Users can insert answers for their attempts" ON public.quiz_attempt_answers;
DROP POLICY IF EXISTS "Users can update their own attempt answers" ON public.quiz_attempt_answers;
DROP POLICY IF EXISTS "Users can update their own attempts" ON public.quiz_attempts;

CREATE POLICY "Users can view non-certification attempt answers"
  ON public.quiz_attempt_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.id = quiz_attempt_answers.attempt_id
        AND qa.user_id = auth.uid()
        AND qa.exam_type <> 'certification'
    )
  );

CREATE POLICY "Users can modify non-certification attempt answers"
  ON public.quiz_attempt_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.id = quiz_attempt_answers.attempt_id
        AND qa.user_id = auth.uid()
        AND qa.exam_type <> 'certification'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.id = quiz_attempt_answers.attempt_id
        AND qa.user_id = auth.uid()
        AND qa.exam_type <> 'certification'
    )
  );

CREATE POLICY "Users can update non-certification attempts"
  ON public.quiz_attempts FOR UPDATE
  USING (user_id = auth.uid() AND exam_type <> 'certification')
  WITH CHECK (user_id = auth.uid() AND exam_type <> 'certification');

-- Legacy client-side certification issuance is not permitted.
REVOKE EXECUTE ON FUNCTION public.issue_certification(UUID, certification_type, UUID, TEXT, DATE, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.issue_certification(UUID, certification_type, UUID, TEXT, DATE, DATE) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.get_certification_attempt_questions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_certification_attempt_answers(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_certification_exam(UUID, UUID, UUID, UUID, INET, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_exam_answer(UUID, UUID, UUID[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_certification_exam_attempt(UUID, BOOLEAN) TO authenticated;

-- The legacy scoring path must not remain callable by candidates.
REVOKE EXECUTE ON FUNCTION public.score_certification_exam(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.score_certification_exam(UUID) FROM authenticated;

-- Candidates may only use the state machine to launch their own pending attempt.
-- Finalisation is exclusively handled by finalize_certification_exam_attempt().
CREATE OR REPLACE FUNCTION public.transition_exam_state(
  p_attempt_id UUID,
  p_new_status attempt_status,
  p_event_data JSONB DEFAULT NULL
) RETURNS public.quiz_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.quiz_attempts;
  v_current_status attempt_status;
  v_is_admin BOOLEAN := FALSE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) INTO v_is_admin;

  SELECT * INTO v_attempt
  FROM public.quiz_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF v_attempt IS NULL THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  IF NOT v_is_admin AND v_attempt.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'You may only modify your own examination attempt';
  END IF;

  v_current_status := COALESCE(v_attempt.status, 'not_started');

  IF v_attempt.exam_type = 'certification' AND NOT v_is_admin THEN
    IF v_current_status <> 'not_started' OR p_new_status <> 'in_progress' THEN
      RAISE EXCEPTION 'Certification attempt status is managed by the secure examination workflow';
    END IF;

    UPDATE public.quiz_attempts
    SET status = 'in_progress', started_at = v_now, last_activity_at = v_now
    WHERE id = p_attempt_id
    RETURNING * INTO v_attempt;

    INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
    VALUES (p_attempt_id, 'exam_started', COALESCE(p_event_data, '{}'::jsonb));

    RETURN v_attempt;
  END IF;

  IF v_current_status = 'not_started' AND p_new_status = 'in_progress' THEN
    UPDATE public.quiz_attempts
    SET status = p_new_status, started_at = v_now, last_activity_at = v_now
    WHERE id = p_attempt_id
    RETURNING * INTO v_attempt;
  ELSIF v_current_status = 'in_progress' AND p_new_status = 'paused' THEN
    UPDATE public.quiz_attempts
    SET status = p_new_status, paused_at = v_now, pause_count = pause_count + 1, last_activity_at = v_now
    WHERE id = p_attempt_id
    RETURNING * INTO v_attempt;
  ELSIF v_current_status = 'paused' AND p_new_status = 'in_progress' THEN
    UPDATE public.quiz_attempts
    SET status = p_new_status,
        total_pause_time_seconds = total_pause_time_seconds + EXTRACT(EPOCH FROM (v_now - paused_at))::INTEGER,
        paused_at = NULL,
        last_activity_at = v_now
    WHERE id = p_attempt_id
    RETURNING * INTO v_attempt;
  ELSIF v_is_admin AND p_new_status = 'cancelled' THEN
    UPDATE public.quiz_attempts SET status = p_new_status, last_activity_at = v_now WHERE id = p_attempt_id RETURNING * INTO v_attempt;
  ELSE
    RAISE EXCEPTION 'Invalid or unauthorised state transition';
  END IF;

  INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
  VALUES (p_attempt_id, 'state_transition', jsonb_build_object('from', v_current_status, 'to', p_new_status, 'data', COALESCE(p_event_data, '{}'::jsonb)));

  RETURN v_attempt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_exam_state(UUID, attempt_status, JSONB) TO authenticated;
