-- Fix active secure-session detection when nullable audit fields are present.
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

GRANT EXECUTE ON FUNCTION public.begin_secure_certification_session(UUID, TEXT, JSONB) TO authenticated;
