-- BDA Secure Exam Mode: one monitored browser session per official certification attempt.

ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS secure_mode_required BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.exam_secure_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_secret UUID NOT NULL DEFAULT gen_random_uuid(),
  device_fingerprint_hash TEXT NOT NULL,
  client_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  end_reason TEXT,
  violation_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_secure_sessions_one_active_attempt
  ON public.exam_secure_sessions(attempt_id)
  WHERE ended_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_secure_sessions_secret
  ON public.exam_secure_sessions(session_secret);
CREATE INDEX IF NOT EXISTS idx_exam_secure_sessions_user
  ON public.exam_secure_sessions(user_id, last_heartbeat_at DESC);

ALTER TABLE public.exam_secure_sessions ENABLE ROW LEVEL SECURITY;

-- Candidates communicate with this data only through narrowly scoped RPCs.
REVOKE ALL ON public.exam_secure_sessions FROM anon, authenticated;
DROP POLICY IF EXISTS "System can insert activity logs" ON public.exam_activity_log;
REVOKE INSERT, UPDATE, DELETE ON public.exam_activity_log FROM authenticated;

CREATE OR REPLACE FUNCTION public.begin_secure_certification_session(
  p_attempt_id UUID,
  p_device_fingerprint TEXT,
  p_client_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.quiz_attempts;
  v_session public.exam_secure_sessions;
  v_fingerprint_hash TEXT;
BEGIN
  IF p_device_fingerprint IS NULL OR length(trim(p_device_fingerprint)) < 12 THEN
    RAISE EXCEPTION 'A supported browser fingerprint is required for secure exam mode';
  END IF;

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

  v_fingerprint_hash := md5(p_device_fingerprint);

  SELECT * INTO v_session
  FROM public.exam_secure_sessions secure_session
  WHERE secure_session.attempt_id = p_attempt_id
    AND secure_session.ended_at IS NULL
  FOR UPDATE;

  IF v_session.id IS NOT NULL THEN
    IF v_session.last_heartbeat_at < NOW() - INTERVAL '3 minutes' THEN
      UPDATE public.exam_secure_sessions
      SET ended_at = NOW(), end_reason = 'heartbeat_expired'
      WHERE id = v_session.id;
      v_session := NULL;
    ELSIF v_session.device_fingerprint_hash = v_fingerprint_hash THEN
      UPDATE public.exam_secure_sessions
      SET last_heartbeat_at = NOW(), client_metadata = COALESCE(p_client_metadata, '{}'::jsonb)
      WHERE id = v_session.id
      RETURNING * INTO v_session;

      RETURN jsonb_build_object(
        'session_token', v_session.session_secret,
        'heartbeat_seconds', 30,
        'fullscreen_requested', true,
        'resumed', true
      );
    ELSE
      UPDATE public.quiz_attempts
      SET suspicious_activity_count = COALESCE(suspicious_activity_count, 0) + 1,
          flagged_for_review = TRUE,
          review_notes = COALESCE(review_notes || E'\n', '') || 'Concurrent secure-session attempt detected at ' || NOW()::TEXT
      WHERE id = p_attempt_id;

      INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
      VALUES (p_attempt_id, 'secure_session_conflict', jsonb_build_object('reason', 'another_browser_or_device'));

      RAISE EXCEPTION 'This exam is already active in another secure browser session';
    END IF;
  END IF;

  INSERT INTO public.exam_secure_sessions (
    attempt_id, user_id, device_fingerprint_hash, client_metadata
  ) VALUES (
    p_attempt_id, auth.uid(), v_fingerprint_hash, COALESCE(p_client_metadata, '{}'::jsonb)
  ) RETURNING * INTO v_session;

  UPDATE public.quiz_attempts
  SET secure_mode_required = TRUE,
      last_activity_at = NOW()
  WHERE id = p_attempt_id;

  INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
  VALUES (p_attempt_id, 'secure_session_started', jsonb_build_object('fullscreen_requested', true));

  RETURN jsonb_build_object(
    'session_token', v_session.session_secret,
    'heartbeat_seconds', 30,
    'fullscreen_requested', true,
    'resumed', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_certification_heartbeat(
  p_attempt_id UUID,
  p_session_token UUID
) RETURNS JSONB
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
    AND qa.status = 'in_progress';

  IF v_attempt IS NULL THEN
    RAISE EXCEPTION 'Certification attempt is not active';
  END IF;

  UPDATE public.exam_secure_sessions
  SET last_heartbeat_at = NOW()
  WHERE attempt_id = p_attempt_id
    AND user_id = auth.uid()
    AND session_secret = p_session_token
    AND ended_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Secure exam session is not valid';
  END IF;

  UPDATE public.quiz_attempts
  SET last_activity_at = NOW()
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object('ok', true, 'flagged_for_review', v_attempt.flagged_for_review);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_secure_certification_event(
  p_attempt_id UUID,
  p_session_token UUID,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_violation BOOLEAN;
  v_suspicious_count INTEGER;
  v_flagged BOOLEAN;
BEGIN
  IF p_event_type NOT IN (
    'secure_mode_ready', 'fullscreen_entered', 'fullscreen_exited',
    'visibility_hidden', 'window_blur', 'copy_blocked', 'cut_blocked',
    'paste_blocked', 'print_blocked', 'context_menu_blocked', 'session_ended'
  ) THEN
    RAISE EXCEPTION 'Unsupported secure exam event';
  END IF;

  IF octet_length(COALESCE(p_event_data::TEXT, '')) > 2000 THEN
    p_event_data := '{}'::jsonb;
  END IF;

  PERFORM 1
  FROM public.exam_secure_sessions secure_session
  JOIN public.quiz_attempts qa ON qa.id = secure_session.attempt_id
  WHERE secure_session.attempt_id = p_attempt_id
    AND secure_session.user_id = auth.uid()
    AND secure_session.session_secret = p_session_token
    AND secure_session.ended_at IS NULL
    AND qa.status = 'in_progress';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Secure exam session is not valid';
  END IF;

  v_is_violation := p_event_type IN (
    'fullscreen_exited', 'visibility_hidden', 'window_blur', 'copy_blocked',
    'cut_blocked', 'paste_blocked', 'print_blocked', 'context_menu_blocked'
  );

  INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
  VALUES (p_attempt_id, p_event_type, COALESCE(p_event_data, '{}'::jsonb));

  IF v_is_violation THEN
    UPDATE public.exam_secure_sessions
    SET violation_count = violation_count + 1,
        last_heartbeat_at = NOW()
    WHERE attempt_id = p_attempt_id
      AND session_secret = p_session_token
      AND ended_at IS NULL;

    UPDATE public.quiz_attempts
    SET suspicious_activity_count = COALESCE(suspicious_activity_count, 0) + 1,
        flagged_for_review = CASE WHEN COALESCE(suspicious_activity_count, 0) + 1 >= 3 THEN TRUE ELSE flagged_for_review END,
        last_activity_at = NOW()
    WHERE id = p_attempt_id
    RETURNING suspicious_activity_count, flagged_for_review INTO v_suspicious_count, v_flagged;
  ELSE
    SELECT suspicious_activity_count, flagged_for_review INTO v_suspicious_count, v_flagged
    FROM public.quiz_attempts
    WHERE id = p_attempt_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'violation', v_is_violation,
    'suspicious_activity_count', COALESCE(v_suspicious_count, 0),
    'flagged_for_review', COALESCE(v_flagged, false)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.end_secure_certification_session(
  p_attempt_id UUID,
  p_session_token UUID,
  p_reason TEXT DEFAULT 'exam_completed'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.exam_secure_sessions
  SET ended_at = NOW(), end_reason = LEFT(COALESCE(p_reason, 'exam_completed'), 100)
  WHERE attempt_id = p_attempt_id
    AND user_id = auth.uid()
    AND session_secret = p_session_token
    AND ended_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.begin_secure_certification_session(UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.secure_certification_heartbeat(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_secure_certification_event(UUID, UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.end_secure_certification_session(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.begin_secure_certification_session(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_certification_heartbeat(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_secure_certification_event(UUID, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_secure_certification_session(UUID, UUID, TEXT) TO authenticated;

-- Enforce the monitored session for every candidate-sensitive action after secure mode begins.
CREATE OR REPLACE FUNCTION public.require_active_secure_exam_session(
  p_attempt_id UUID,
  p_session_token UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secure_mode_required BOOLEAN;
BEGIN
  SELECT secure_mode_required INTO v_secure_mode_required
  FROM public.quiz_attempts
  WHERE id = p_attempt_id
    AND user_id = auth.uid()
    AND exam_type = 'certification';

  IF v_secure_mode_required IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Secure exam session must be started before accessing this examination';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.exam_secure_sessions secure_session
    WHERE secure_session.attempt_id = p_attempt_id
      AND secure_session.user_id = auth.uid()
      AND secure_session.session_secret = p_session_token
      AND secure_session.ended_at IS NULL
      AND secure_session.last_heartbeat_at >= NOW() - INTERVAL '3 minutes'
  ) THEN
    RAISE EXCEPTION 'Secure exam session is not active';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.require_active_secure_exam_session(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.require_active_secure_exam_session(UUID, UUID) TO authenticated;
-- Candidate-sensitive exam operations require an active secure session.
CREATE OR REPLACE FUNCTION public.get_certification_attempt_questions(
  p_attempt_id UUID,
  p_session_token UUID
)
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

  PERFORM public.require_active_secure_exam_session(p_attempt_id, p_session_token);

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

CREATE OR REPLACE FUNCTION public.get_certification_attempt_answers(
  p_attempt_id UUID,
  p_session_token UUID
)
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

  PERFORM public.require_active_secure_exam_session(p_attempt_id, p_session_token);

  RETURN QUERY
  SELECT answer_row.question_id, answer_row.selected_answer_ids, answer_row.answered_at
  FROM public.quiz_attempt_answers answer_row
  WHERE answer_row.attempt_id = p_attempt_id
  ORDER BY answer_row.answered_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_exam_answer(
  p_attempt_id UUID,
  p_question_id UUID,
  p_selected_answer_ids UUID[],
  p_session_token UUID,
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

  PERFORM public.require_active_secure_exam_session(p_attempt_id, p_session_token);

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
  p_session_token UUID,
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

  PERFORM public.require_active_secure_exam_session(p_attempt_id, p_session_token);

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

