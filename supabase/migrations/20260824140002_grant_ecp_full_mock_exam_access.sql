-- ECP partners receive Premium Mock Exam access as part of the active ECP workspace.
-- The entitlement is role-based rather than a durable purchase record, so it ends automatically
-- if the account's role is changed away from ECP.

CREATE OR REPLACE FUNCTION public.check_and_consume_mock_exam_attempt(
  p_user_id UUID,
  p_mock_exam_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam public.mock_exams%ROWTYPE;
  v_access public.mock_exam_premium_access%ROWTYPE;
  v_is_trainer BOOLEAN;
  v_is_ecp BOOLEAN;
BEGIN
  SELECT * INTO v_exam
  FROM public.mock_exams
  WHERE id = p_mock_exam_id
    AND is_active = true;

  IF v_exam IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Exam not found or not active');
  END IF;

  IF NOT v_exam.is_premium THEN
    RETURN jsonb_build_object('success', true, 'is_premium', false, 'message', 'Free exam - unlimited attempts allowed');
  END IF;

  SELECT u.role = 'trainer', u.role = 'ecp'
  INTO v_is_trainer, v_is_ecp
  FROM public.users u
  WHERE u.id = p_user_id;

  IF COALESCE(v_is_ecp, false) THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_premium', true,
      'ecp_access', true,
      'attempts_remaining', 999,
      'message', 'ECP partner access granted'
    );
  END IF;

  IF COALESCE(v_is_trainer, false) THEN
    IF public.has_active_trainer_mock_access(p_user_id) THEN
      RETURN jsonb_build_object(
        'success', true,
        'is_premium', true,
        'trainer_access', true,
        'attempts_remaining', 999,
        'message', 'Instructor access granted after assessment pass'
      );
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'instructor_assessment_required',
      'message', 'A passed Instructor Assessment is required for premium mock exams.'
    );
  END IF;

  SELECT * INTO v_access
  FROM public.mock_exam_premium_access
  WHERE user_id = p_user_id
    AND mock_exam_id = p_mock_exam_id
    AND (expires_at IS NULL OR expires_at > NOW())
    AND attempts_used < attempts_allowed
  FOR UPDATE;

  IF v_access IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.mock_exam_premium_access
      WHERE user_id = p_user_id AND mock_exam_id = p_mock_exam_id
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'no_remaining_attempts',
        'message', 'You have used all your attempts for this exam. Please purchase a new attempt.'
      );
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_access',
      'message', 'No premium access found for this exam. Please purchase access.'
    );
  END IF;

  UPDATE public.mock_exam_premium_access
  SET attempts_used = attempts_used + 1
  WHERE id = v_access.id;

  RETURN jsonb_build_object(
    'success', true,
    'is_premium', true,
    'attempts_remaining', v_access.attempts_allowed - v_access.attempts_used - 1,
    'access_id', v_access.id,
    'message', 'Attempt consumed successfully'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_mock_exam_access_status(
  p_user_id UUID,
  p_mock_exam_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam public.mock_exams%ROWTYPE;
  v_access public.mock_exam_premium_access%ROWTYPE;
  v_attempt_count INTEGER;
  v_is_trainer BOOLEAN;
  v_is_ecp BOOLEAN;
BEGIN
  SELECT * INTO v_exam FROM public.mock_exams WHERE id = p_mock_exam_id;

  IF v_exam IS NULL THEN
    RETURN jsonb_build_object('exam_exists', false);
  END IF;

  SELECT COUNT(*) INTO v_attempt_count
  FROM public.mock_exam_attempts
  WHERE exam_id = p_mock_exam_id AND user_id = p_user_id AND completed_at IS NOT NULL;

  IF NOT v_exam.is_premium THEN
    RETURN jsonb_build_object(
      'exam_exists', true, 'is_premium', false, 'has_access', true,
      'can_take_exam', true, 'attempts_unlimited', true,
      'completed_attempts', v_attempt_count
    );
  END IF;

  SELECT u.role = 'trainer', u.role = 'ecp'
  INTO v_is_trainer, v_is_ecp
  FROM public.users u
  WHERE u.id = p_user_id;

  IF COALESCE(v_is_ecp, false) THEN
    RETURN jsonb_build_object(
      'exam_exists', true, 'is_premium', true, 'has_access', true,
      'can_take_exam', true, 'ecp_access', true,
      'attempts_allowed', 999, 'attempts_used', 0, 'attempts_remaining', 999,
      'completed_attempts', v_attempt_count
    );
  END IF;

  IF COALESCE(v_is_trainer, false) THEN
    IF public.has_active_trainer_mock_access(p_user_id) THEN
      RETURN jsonb_build_object(
        'exam_exists', true, 'is_premium', true, 'has_access', true,
        'can_take_exam', true, 'trainer_access', true,
        'attempts_allowed', 999, 'attempts_used', 0, 'attempts_remaining', 999,
        'completed_attempts', v_attempt_count
      );
    END IF;

    RETURN jsonb_build_object(
      'exam_exists', true, 'is_premium', true, 'has_access', false,
      'can_take_exam', false, 'instructor_assessment_required', true,
      'completed_attempts', v_attempt_count
    );
  END IF;

  SELECT * INTO v_access
  FROM public.mock_exam_premium_access
  WHERE user_id = p_user_id AND mock_exam_id = p_mock_exam_id;

  IF v_access IS NULL THEN
    RETURN jsonb_build_object(
      'exam_exists', true, 'is_premium', true, 'has_access', false,
      'completed_attempts', v_attempt_count
    );
  END IF;

  RETURN jsonb_build_object(
    'exam_exists', true, 'is_premium', true, 'has_access', true,
    'is_expired', v_access.expires_at IS NOT NULL AND v_access.expires_at <= NOW(),
    'attempts_allowed', v_access.attempts_allowed,
    'attempts_used', v_access.attempts_used,
    'attempts_remaining', GREATEST(0, v_access.attempts_allowed - v_access.attempts_used),
    'can_take_exam', v_access.attempts_used < v_access.attempts_allowed
                      AND (v_access.expires_at IS NULL OR v_access.expires_at > NOW()),
    'completed_attempts', v_attempt_count,
    'expires_at', v_access.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_consume_mock_exam_attempt(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mock_exam_access_status(UUID, UUID) TO authenticated;
