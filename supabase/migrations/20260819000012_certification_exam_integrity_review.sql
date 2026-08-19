-- BDA Certification Integrity Review: score secure-session events and hold high-risk passes for admin review.

ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS integrity_risk_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS integrity_review_status TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS integrity_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS integrity_reviewed_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS integrity_review_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_certification_attempt_integrity_review
  ON public.quiz_attempts(integrity_review_status, integrity_risk_score DESC)
  WHERE exam_type = 'certification';

CREATE OR REPLACE FUNCTION public.apply_certification_integrity_signal(
  p_attempt_id UUID,
  p_signal_type TEXT,
  p_weight INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.quiz_attempts;
BEGIN
  UPDATE public.quiz_attempts
  SET suspicious_activity_count = COALESCE(suspicious_activity_count, 0) + 1,
      integrity_risk_score = COALESCE(integrity_risk_score, 0) + GREATEST(p_weight, 1),
      flagged_for_review = CASE
        WHEN COALESCE(suspicious_activity_count, 0) + 1 >= 3
          OR COALESCE(integrity_risk_score, 0) + GREATEST(p_weight, 1) >= 5
        THEN TRUE ELSE flagged_for_review END,
      integrity_review_status = CASE
        WHEN COALESCE(suspicious_activity_count, 0) + 1 >= 3
          OR COALESCE(integrity_risk_score, 0) + GREATEST(p_weight, 1) >= 5
        THEN 'pending' ELSE integrity_review_status END,
      last_activity_at = NOW()
  WHERE id = p_attempt_id AND exam_type = 'certification'
  RETURNING * INTO v_attempt;

  IF v_attempt IS NULL THEN
    RAISE EXCEPTION 'Certification attempt not found';
  END IF;

  INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
  VALUES (p_attempt_id, 'integrity_signal', jsonb_build_object(
    'signal', p_signal_type,
    'weight', GREATEST(p_weight, 1),
    'risk_score', v_attempt.integrity_risk_score,
    'flagged_for_review', v_attempt.flagged_for_review
  ));

  RETURN jsonb_build_object(
    'risk_score', v_attempt.integrity_risk_score,
    'suspicious_activity_count', v_attempt.suspicious_activity_count,
    'flagged_for_review', v_attempt.flagged_for_review,
    'review_status', v_attempt.integrity_review_status
  );
END;
$$;

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
  IF v_attempt IS NULL THEN RAISE EXCEPTION 'Certification attempt is not active'; END IF;

  v_fingerprint_hash := md5(p_device_fingerprint);
  SELECT * INTO v_session
  FROM public.exam_secure_sessions secure_session
  WHERE secure_session.attempt_id = p_attempt_id AND secure_session.ended_at IS NULL
  FOR UPDATE;

  IF v_session.id IS NOT NULL THEN
    IF v_session.last_heartbeat_at < NOW() - INTERVAL '3 minutes' THEN
      UPDATE public.exam_secure_sessions SET ended_at = NOW(), end_reason = 'heartbeat_expired' WHERE id = v_session.id;
      PERFORM public.apply_certification_integrity_signal(p_attempt_id, 'heartbeat_expired', 3);
      v_session := NULL;
    ELSIF v_session.device_fingerprint_hash = v_fingerprint_hash THEN
      UPDATE public.exam_secure_sessions
      SET last_heartbeat_at = NOW(), client_metadata = COALESCE(p_client_metadata, '{}'::jsonb)
      WHERE id = v_session.id RETURNING * INTO v_session;
      RETURN jsonb_build_object('session_token', v_session.session_secret, 'heartbeat_seconds', 30, 'fullscreen_requested', true, 'resumed', true);
    ELSE
      PERFORM public.apply_certification_integrity_signal(p_attempt_id, 'secure_session_conflict', 4);
      INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
      VALUES (p_attempt_id, 'secure_session_conflict', jsonb_build_object('reason', 'another_browser_or_device'));
      RAISE EXCEPTION 'This exam is already active in another secure browser session';
    END IF;
  END IF;

  INSERT INTO public.exam_secure_sessions (attempt_id, user_id, device_fingerprint_hash, client_metadata)
  VALUES (p_attempt_id, auth.uid(), v_fingerprint_hash, COALESCE(p_client_metadata, '{}'::jsonb))
  RETURNING * INTO v_session;

  UPDATE public.quiz_attempts SET secure_mode_required = TRUE, last_activity_at = NOW() WHERE id = p_attempt_id;
  INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
  VALUES (p_attempt_id, 'secure_session_started', jsonb_build_object('fullscreen_requested', true));

  RETURN jsonb_build_object('session_token', v_session.session_secret, 'heartbeat_seconds', 30, 'fullscreen_requested', true, 'resumed', false);
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
  v_weight INTEGER := 0;
  v_integrity JSONB;
BEGIN
  IF p_event_type NOT IN ('secure_mode_ready', 'fullscreen_entered', 'fullscreen_exited', 'visibility_hidden', 'window_blur', 'copy_blocked', 'cut_blocked', 'paste_blocked', 'print_blocked', 'context_menu_blocked', 'session_ended') THEN
    RAISE EXCEPTION 'Unsupported secure exam event';
  END IF;
  IF octet_length(COALESCE(p_event_data::TEXT, '')) > 2000 THEN p_event_data := '{}'::jsonb; END IF;

  PERFORM 1 FROM public.exam_secure_sessions secure_session
  JOIN public.quiz_attempts qa ON qa.id = secure_session.attempt_id
  WHERE secure_session.attempt_id = p_attempt_id
    AND secure_session.user_id = auth.uid()
    AND secure_session.session_secret = p_session_token
    AND secure_session.ended_at IS NULL
    AND qa.status = 'in_progress';
  IF NOT FOUND THEN RAISE EXCEPTION 'Secure exam session is not valid'; END IF;

  v_is_violation := p_event_type IN ('fullscreen_exited', 'visibility_hidden', 'window_blur', 'copy_blocked', 'cut_blocked', 'paste_blocked', 'print_blocked', 'context_menu_blocked');
  v_weight := CASE
    WHEN p_event_type IN ('copy_blocked', 'cut_blocked', 'paste_blocked', 'print_blocked', 'context_menu_blocked') THEN 2
    WHEN p_event_type = 'fullscreen_exited' THEN 2
    WHEN p_event_type IN ('visibility_hidden', 'window_blur') THEN 1
    ELSE 0 END;

  INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
  VALUES (p_attempt_id, p_event_type, COALESCE(p_event_data, '{}'::jsonb));

  IF v_is_violation THEN
    UPDATE public.exam_secure_sessions SET violation_count = violation_count + 1, last_heartbeat_at = NOW()
    WHERE attempt_id = p_attempt_id AND session_secret = p_session_token AND ended_at IS NULL;
    v_integrity := public.apply_certification_integrity_signal(p_attempt_id, p_event_type, v_weight);
  ELSE
    SELECT jsonb_build_object('risk_score', integrity_risk_score, 'suspicious_activity_count', suspicious_activity_count, 'flagged_for_review', flagged_for_review, 'review_status', integrity_review_status)
    INTO v_integrity FROM public.quiz_attempts WHERE id = p_attempt_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'violation', v_is_violation) || COALESCE(v_integrity, '{}'::jsonb);
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
  v_requires_review BOOLEAN := FALSE;
  v_credential_id TEXT;
BEGIN
  SELECT qa.*, q.certification_type, q.passing_score_percentage, q.time_limit_minutes INTO v_attempt
  FROM public.quiz_attempts qa JOIN public.quizzes q ON q.id = qa.quiz_id
  WHERE qa.id = p_attempt_id AND qa.user_id = auth.uid() AND qa.exam_type = 'certification' AND qa.status = 'in_progress'
  FOR UPDATE OF qa;
  IF v_attempt IS NULL THEN RAISE EXCEPTION 'Certification attempt is not active or does not belong to you'; END IF;
  PERFORM public.require_active_secure_exam_session(p_attempt_id, p_session_token);
  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_attempt.quiz_id;
  IF NOT p_auto_submit AND v_attempt.started_at IS NOT NULL AND NOW() > v_attempt.started_at + v_quiz.time_limit_minutes * INTERVAL '1 minute' THEN
    RAISE EXCEPTION 'Examination time has expired; wait for automatic finalisation';
  END IF;

  SELECT COALESCE(SUM(cqb.points), 0), COALESCE(SUM(answer_row.points_earned), 0) INTO v_total_points, v_earned_points
  FROM public.exam_attempt_question_set eaqs
  JOIN public.certification_question_bank cqb ON cqb.id = eaqs.question_id
  LEFT JOIN public.quiz_attempt_answers answer_row ON answer_row.attempt_id = p_attempt_id AND answer_row.question_id = eaqs.question_id
  WHERE eaqs.attempt_id = p_attempt_id;
  IF v_total_points > 0 THEN v_score := ROUND((v_earned_points / v_total_points) * 100, 2); END IF;
  v_passed := v_score >= v_quiz.passing_score_percentage;
  v_requires_review := COALESCE(v_attempt.flagged_for_review, false) OR COALESCE(v_attempt.integrity_risk_score, 0) >= 5;

  UPDATE public.quiz_attempts
  SET status = CASE WHEN v_passed THEN 'passed'::attempt_status ELSE 'failed'::attempt_status END,
      completed_at = NOW(), scored_at = NOW(), score = v_score, passed = v_passed,
      total_points_earned = v_earned_points, total_points_possible = v_total_points,
      integrity_review_status = CASE WHEN v_requires_review THEN 'pending' ELSE 'not_required' END,
      last_activity_at = NOW()
  WHERE id = p_attempt_id;

  IF v_passed AND NOT v_requires_review AND v_quiz.certification_type IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.user_certifications WHERE user_id = auth.uid() AND certification_type = v_quiz.certification_type AND status = 'active') THEN
    v_credential_id := public.generate_credential_id(v_quiz.certification_type);
    INSERT INTO public.user_certifications (user_id, certification_type, quiz_attempt_id, credential_id, issued_date, expiry_date, status, renewal_count)
    VALUES (auth.uid(), v_quiz.certification_type, p_attempt_id, v_credential_id, CURRENT_DATE, CURRENT_DATE + INTERVAL '3 years', 'active', 0);
  END IF;

  INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
  VALUES (p_attempt_id, 'exam_finalised', jsonb_build_object('auto_submit', p_auto_submit, 'score', v_score, 'passed', v_passed, 'integrity_review_status', CASE WHEN v_requires_review THEN 'pending' ELSE 'not_required' END));
  SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = p_attempt_id;
  RETURN v_attempt;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_certification_exam_integrity(
  p_attempt_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS public.quiz_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.quiz_attempts;
  v_quiz RECORD;
  v_credential_id TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
    RAISE EXCEPTION 'Administrator access is required';
  END IF;
  IF p_decision NOT IN ('approve', 'void') THEN RAISE EXCEPTION 'Review decision must be approve or void'; END IF;

  SELECT * INTO v_attempt FROM public.quiz_attempts
  WHERE id = p_attempt_id AND exam_type = 'certification' AND integrity_review_status = 'pending'
  FOR UPDATE;
  IF v_attempt IS NULL THEN RAISE EXCEPTION 'No pending integrity review exists for this attempt'; END IF;

  UPDATE public.quiz_attempts
  SET integrity_review_status = CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'voided' END,
      integrity_reviewed_at = NOW(), integrity_reviewed_by = auth.uid(), integrity_review_notes = LEFT(COALESCE(p_notes, ''), 2000),
      status = CASE WHEN p_decision = 'void' THEN 'cancelled'::attempt_status ELSE status END,
      passed = CASE WHEN p_decision = 'void' THEN FALSE ELSE passed END
  WHERE id = p_attempt_id RETURNING * INTO v_attempt;

  IF p_decision = 'approve' AND v_attempt.passed THEN
    SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_attempt.quiz_id;
    IF v_quiz.certification_type IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.user_certifications WHERE user_id = v_attempt.user_id AND certification_type = v_quiz.certification_type AND status = 'active') THEN
      v_credential_id := public.generate_credential_id(v_quiz.certification_type);
      INSERT INTO public.user_certifications (user_id, certification_type, quiz_attempt_id, credential_id, issued_date, expiry_date, status, renewal_count)
      VALUES (v_attempt.user_id, v_quiz.certification_type, p_attempt_id, v_credential_id, CURRENT_DATE, CURRENT_DATE + INTERVAL '3 years', 'active', 0);
    END IF;
  END IF;

  INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
  VALUES (p_attempt_id, 'integrity_review_completed', jsonb_build_object('decision', p_decision, 'reviewer_id', auth.uid()));
  RETURN v_attempt;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_certification_integrity_signal(UUID, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_certification_exam_integrity(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_certification_exam_integrity(UUID, TEXT, TEXT) TO authenticated;
