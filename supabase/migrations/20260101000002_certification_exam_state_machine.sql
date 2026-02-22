-- =============================================================================
-- Migration: Certification Exam State Machine & Enhanced Flow
-- =============================================================================
-- Implements the official exam flow specification with:
-- 1. Proper state machine (NOT_STARTED -> IN_PROGRESS -> PAUSED -> SUBMITTED -> SCORED -> PASSED/FAILED)
-- 2. Proctoring token generation and validation
-- 3. Answer timestamps and activity logging
-- 4. Pause/resume capability
-- 5. Security controls
-- =============================================================================

-- =============================================================================
-- 1. Create attempt status enum
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attempt_status') THEN
    CREATE TYPE attempt_status AS ENUM (
      'not_started',   -- Attempt created but exam not launched
      'in_progress',   -- User is actively taking the exam
      'paused',        -- User has paused the exam
      'submitted',     -- User has submitted answers, pending scoring
      'scored',        -- Scoring complete
      'passed',        -- Final status: passed
      'failed',        -- Final status: failed
      'expired',       -- Time ran out before submission
      'cancelled'      -- Admin cancelled or voided
    );
  END IF;
END $$;

-- =============================================================================
-- 2. Add new columns to quiz_attempts
-- =============================================================================

-- Add attempt status column
ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS status attempt_status DEFAULT 'not_started';

-- Add proctoring fields
ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS proctoring_token UUID DEFAULT gen_random_uuid();

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS proctoring_token_expires_at TIMESTAMPTZ;

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT gen_random_uuid();

-- Add pause/resume tracking
ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS total_pause_time_seconds INTEGER DEFAULT 0;

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS pause_count INTEGER DEFAULT 0;

-- Add time tracking
ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS time_remaining_seconds INTEGER;

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Add scoring details
ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS scoring_notes TEXT;

-- Add security/audit fields
ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS ip_address INET;

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS browser_info JSONB;

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS suspicious_activity_count INTEGER DEFAULT 0;

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN DEFAULT FALSE;

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- =============================================================================
-- 3. Add timestamp to quiz_attempt_answers
-- =============================================================================

ALTER TABLE public.quiz_attempt_answers
ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.quiz_attempt_answers
ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER;

ALTER TABLE public.quiz_attempt_answers
ADD COLUMN IF NOT EXISTS answer_changes INTEGER DEFAULT 0;

-- =============================================================================
-- 4. Create exam activity log table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.exam_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by attempt
CREATE INDEX IF NOT EXISTS idx_exam_activity_log_attempt ON public.exam_activity_log(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_activity_log_type ON public.exam_activity_log(event_type);
CREATE INDEX IF NOT EXISTS idx_exam_activity_log_created ON public.exam_activity_log(created_at);

-- RLS for activity log
ALTER TABLE public.exam_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity logs"
  ON public.exam_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.id = exam_activity_log.attempt_id AND qa.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert activity logs"
  ON public.exam_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Admins can view all activity logs"
  ON public.exam_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =============================================================================
-- 5. Create exam state transition function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.transition_exam_state(
  p_attempt_id UUID,
  p_new_status attempt_status,
  p_event_data JSONB DEFAULT NULL
) RETURNS public.quiz_attempts AS $$
DECLARE
  v_attempt public.quiz_attempts;
  v_current_status attempt_status;
  v_valid_transition BOOLEAN := FALSE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Get current attempt with lock
  SELECT * INTO v_attempt
  FROM public.quiz_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF v_attempt IS NULL THEN
    RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
  END IF;

  v_current_status := COALESCE(v_attempt.status, 'not_started');

  -- Validate state transitions
  CASE v_current_status
    WHEN 'not_started' THEN
      v_valid_transition := p_new_status IN ('in_progress', 'cancelled');
    WHEN 'in_progress' THEN
      v_valid_transition := p_new_status IN ('paused', 'submitted', 'expired', 'cancelled');
    WHEN 'paused' THEN
      v_valid_transition := p_new_status IN ('in_progress', 'submitted', 'expired', 'cancelled');
    WHEN 'submitted' THEN
      v_valid_transition := p_new_status IN ('scored', 'cancelled');
    WHEN 'scored' THEN
      v_valid_transition := p_new_status IN ('passed', 'failed');
    WHEN 'passed', 'failed', 'expired', 'cancelled' THEN
      v_valid_transition := FALSE; -- Terminal states
    ELSE
      v_valid_transition := FALSE;
  END CASE;

  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'Invalid state transition from % to %', v_current_status, p_new_status;
  END IF;

  -- Apply state-specific updates
  CASE p_new_status
    WHEN 'in_progress' THEN
      IF v_current_status = 'not_started' THEN
        -- First start
        UPDATE public.quiz_attempts
        SET status = p_new_status,
            started_at = v_now,
            last_activity_at = v_now
        WHERE id = p_attempt_id
        RETURNING * INTO v_attempt;
      ELSE
        -- Resume from pause
        UPDATE public.quiz_attempts
        SET status = p_new_status,
            total_pause_time_seconds = total_pause_time_seconds +
              EXTRACT(EPOCH FROM (v_now - paused_at))::INTEGER,
            paused_at = NULL,
            last_activity_at = v_now
        WHERE id = p_attempt_id
        RETURNING * INTO v_attempt;
      END IF;

    WHEN 'paused' THEN
      UPDATE public.quiz_attempts
      SET status = p_new_status,
          paused_at = v_now,
          pause_count = pause_count + 1,
          last_activity_at = v_now
      WHERE id = p_attempt_id
      RETURNING * INTO v_attempt;

    WHEN 'submitted' THEN
      UPDATE public.quiz_attempts
      SET status = p_new_status,
          completed_at = v_now,
          time_spent_minutes = EXTRACT(EPOCH FROM (v_now - started_at))::INTEGER / 60,
          last_activity_at = v_now
      WHERE id = p_attempt_id
      RETURNING * INTO v_attempt;

    WHEN 'scored' THEN
      UPDATE public.quiz_attempts
      SET status = p_new_status,
          scored_at = v_now,
          last_activity_at = v_now
      WHERE id = p_attempt_id
      RETURNING * INTO v_attempt;

    WHEN 'passed' THEN
      UPDATE public.quiz_attempts
      SET status = p_new_status,
          passed = TRUE,
          last_activity_at = v_now
      WHERE id = p_attempt_id
      RETURNING * INTO v_attempt;

    WHEN 'failed' THEN
      UPDATE public.quiz_attempts
      SET status = p_new_status,
          passed = FALSE,
          last_activity_at = v_now
      WHERE id = p_attempt_id
      RETURNING * INTO v_attempt;

    WHEN 'expired' THEN
      UPDATE public.quiz_attempts
      SET status = p_new_status,
          completed_at = v_now,
          passed = FALSE,
          last_activity_at = v_now
      WHERE id = p_attempt_id
      RETURNING * INTO v_attempt;

    WHEN 'cancelled' THEN
      UPDATE public.quiz_attempts
      SET status = p_new_status,
          completed_at = v_now,
          last_activity_at = v_now
      WHERE id = p_attempt_id
      RETURNING * INTO v_attempt;
  END CASE;

  -- Log the state transition
  INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
  VALUES (
    p_attempt_id,
    'state_transition',
    jsonb_build_object(
      'from_status', v_current_status,
      'to_status', p_new_status,
      'timestamp', v_now,
      'additional_data', p_event_data
    )
  );

  RETURN v_attempt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. Create eligibility check function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_exam_eligibility(
  p_user_id UUID,
  p_quiz_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_voucher RECORD;
  v_booking RECORD;
  v_active_attempt RECORD;
  v_quiz RECORD;
  v_result JSONB;
BEGIN
  -- Get quiz info
  SELECT * INTO v_quiz
  FROM public.quizzes
  WHERE id = p_quiz_id AND is_active = TRUE;

  IF v_quiz IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', FALSE,
      'reason', 'Quiz not found or not active'
    );
  END IF;

  -- Check for active attempt (in_progress or paused)
  SELECT * INTO v_active_attempt
  FROM public.quiz_attempts
  WHERE user_id = p_user_id
    AND quiz_id = p_quiz_id
    AND status IN ('not_started', 'in_progress', 'paused')
  LIMIT 1;

  IF v_active_attempt IS NOT NULL THEN
    RETURN jsonb_build_object(
      'eligible', TRUE,
      'has_active_attempt', TRUE,
      'attempt_id', v_active_attempt.id,
      'attempt_status', v_active_attempt.status,
      'can_resume', v_active_attempt.status IN ('in_progress', 'paused')
    );
  END IF;

  -- Check for valid voucher
  SELECT * INTO v_voucher
  FROM public.exam_vouchers
  WHERE user_id = p_user_id
    AND certification_type = v_quiz.certification_type
    AND status = 'available'
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (quiz_id IS NULL OR quiz_id = p_quiz_id)
  ORDER BY expires_at ASC NULLS LAST
  LIMIT 1;

  IF v_voucher IS NULL THEN
    -- Also check ECP vouchers
    SELECT * INTO v_voucher
    FROM public.ecp_vouchers
    WHERE LOWER(assigned_to_email) = LOWER((SELECT email FROM public.users WHERE id = p_user_id))
      AND certification_type = v_quiz.certification_type
      AND status IN ('assigned', 'available')
      AND (valid_until IS NULL OR valid_until > CURRENT_DATE)
    LIMIT 1;
  END IF;

  IF v_voucher IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', FALSE,
      'reason', 'No valid voucher found'
    );
  END IF;

  -- Check for scheduled booking (optional, depends on your flow)
  SELECT * INTO v_booking
  FROM public.exam_bookings
  WHERE user_id = p_user_id
    AND quiz_id = p_quiz_id
    AND status = 'scheduled'
    AND scheduled_start_time <= NOW() + INTERVAL '15 minutes'
    AND scheduled_end_time >= NOW()
  LIMIT 1;

  RETURN jsonb_build_object(
    'eligible', TRUE,
    'has_active_attempt', FALSE,
    'voucher_id', v_voucher.id,
    'voucher_source', CASE WHEN v_voucher.user_id IS NOT NULL THEN 'direct' ELSE 'ecp' END,
    'booking_id', v_booking.id,
    'has_booking', v_booking IS NOT NULL,
    'quiz', jsonb_build_object(
      'id', v_quiz.id,
      'title', v_quiz.title,
      'time_limit_minutes', v_quiz.time_limit_minutes,
      'passing_score', v_quiz.passing_score_percentage
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. Create start exam function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.start_certification_exam(
  p_user_id UUID,
  p_quiz_id UUID,
  p_voucher_id UUID DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_browser_info JSONB DEFAULT NULL
) RETURNS public.quiz_attempts AS $$
DECLARE
  v_quiz RECORD;
  v_attempt public.quiz_attempts;
  v_proctoring_token UUID;
  v_time_limit_seconds INTEGER;
BEGIN
  -- Get quiz
  SELECT * INTO v_quiz
  FROM public.quizzes
  WHERE id = p_quiz_id AND is_active = TRUE;

  IF v_quiz IS NULL THEN
    RAISE EXCEPTION 'Quiz not found or not active';
  END IF;

  -- Generate proctoring token
  v_proctoring_token := gen_random_uuid();
  v_time_limit_seconds := v_quiz.time_limit_minutes * 60;

  -- Create attempt
  INSERT INTO public.quiz_attempts (
    quiz_id,
    user_id,
    status,
    proctoring_token,
    proctoring_token_expires_at,
    session_id,
    time_remaining_seconds,
    ip_address,
    user_agent,
    browser_info,
    exam_type
  ) VALUES (
    p_quiz_id,
    p_user_id,
    'not_started',
    v_proctoring_token,
    NOW() + INTERVAL '1 hour' * (v_quiz.time_limit_minutes / 60 + 2), -- Token valid for exam duration + 2 hours
    gen_random_uuid(),
    v_time_limit_seconds,
    p_ip_address,
    p_user_agent,
    p_browser_info,
    'certification'
  )
  RETURNING * INTO v_attempt;

  -- Mark voucher as used if provided
  IF p_voucher_id IS NOT NULL THEN
    -- Try exam_vouchers first
    UPDATE public.exam_vouchers
    SET status = 'used',
        used_at = NOW(),
        attempt_id = v_attempt.id
    WHERE id = p_voucher_id AND user_id = p_user_id;

    -- If not found in exam_vouchers, try ecp_vouchers
    IF NOT FOUND THEN
      UPDATE public.ecp_vouchers
      SET status = 'used',
          used_at = NOW(),
          exam_attempt_id = v_attempt.id
      WHERE id = p_voucher_id;
    END IF;
  END IF;

  -- Update booking if provided
  IF p_booking_id IS NOT NULL THEN
    UPDATE public.exam_bookings
    SET attempt_id = v_attempt.id
    WHERE id = p_booking_id AND user_id = p_user_id;
  END IF;

  -- Log the exam start
  INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
  VALUES (
    v_attempt.id,
    'exam_created',
    jsonb_build_object(
      'quiz_id', p_quiz_id,
      'voucher_id', p_voucher_id,
      'booking_id', p_booking_id,
      'ip_address', p_ip_address::TEXT,
      'time_limit_seconds', v_time_limit_seconds
    )
  );

  RETURN v_attempt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 8. Create save answer function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.save_exam_answer(
  p_attempt_id UUID,
  p_question_id UUID,
  p_selected_answer_ids UUID[],
  p_time_spent_seconds INTEGER DEFAULT NULL
) RETURNS public.quiz_attempt_answers AS $$
DECLARE
  v_attempt RECORD;
  v_answer public.quiz_attempt_answers;
  v_is_correct BOOLEAN;
  v_points_earned DECIMAL;
  v_question RECORD;
BEGIN
  -- Verify attempt is active
  SELECT * INTO v_attempt
  FROM public.quiz_attempts
  WHERE id = p_attempt_id AND status IN ('in_progress')
  FOR UPDATE;

  IF v_attempt IS NULL THEN
    RAISE EXCEPTION 'Cannot save answer: attempt not in progress';
  END IF;

  -- Get question details for scoring
  SELECT q.*,
         ARRAY_AGG(a.id) FILTER (WHERE a.is_correct = TRUE) as correct_answer_ids
  INTO v_question
  FROM public.quiz_questions q
  LEFT JOIN public.quiz_answers a ON a.question_id = q.id
  WHERE q.id = p_question_id AND q.quiz_id = v_attempt.quiz_id
  GROUP BY q.id;

  IF v_question IS NULL THEN
    RAISE EXCEPTION 'Question not found or not part of this quiz';
  END IF;

  -- Calculate if answer is correct
  IF v_question.question_type = 'multi_select' THEN
    -- For multi-select, must match exactly
    v_is_correct := p_selected_answer_ids <@ v_question.correct_answer_ids
                    AND v_question.correct_answer_ids <@ p_selected_answer_ids;
  ELSE
    -- For single choice, check if selected is in correct answers
    v_is_correct := p_selected_answer_ids && v_question.correct_answer_ids;
  END IF;

  v_points_earned := CASE WHEN v_is_correct THEN v_question.points ELSE 0 END;

  -- Upsert the answer
  INSERT INTO public.quiz_attempt_answers (
    attempt_id,
    question_id,
    selected_answer_ids,
    is_correct,
    points_earned,
    answered_at,
    time_spent_seconds,
    answer_changes
  ) VALUES (
    p_attempt_id,
    p_question_id,
    p_selected_answer_ids,
    v_is_correct,
    v_points_earned,
    NOW(),
    p_time_spent_seconds,
    0
  )
  ON CONFLICT (attempt_id, question_id) DO UPDATE
  SET selected_answer_ids = EXCLUDED.selected_answer_ids,
      is_correct = EXCLUDED.is_correct,
      points_earned = EXCLUDED.points_earned,
      answered_at = NOW(),
      time_spent_seconds = COALESCE(EXCLUDED.time_spent_seconds, quiz_attempt_answers.time_spent_seconds),
      answer_changes = quiz_attempt_answers.answer_changes + 1
  RETURNING * INTO v_answer;

  -- Update last activity
  UPDATE public.quiz_attempts
  SET last_activity_at = NOW()
  WHERE id = p_attempt_id;

  RETURN v_answer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 9. Create score exam function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.score_certification_exam(
  p_attempt_id UUID
) RETURNS public.quiz_attempts AS $$
DECLARE
  v_attempt public.quiz_attempts;
  v_quiz RECORD;
  v_total_points DECIMAL := 0;
  v_earned_points DECIMAL := 0;
  v_score DECIMAL;
  v_passed BOOLEAN;
BEGIN
  -- Get attempt
  SELECT * INTO v_attempt
  FROM public.quiz_attempts
  WHERE id = p_attempt_id AND status = 'submitted'
  FOR UPDATE;

  IF v_attempt IS NULL THEN
    RAISE EXCEPTION 'Attempt not found or not in submitted status';
  END IF;

  -- Get quiz
  SELECT * INTO v_quiz
  FROM public.quizzes
  WHERE id = v_attempt.quiz_id;

  -- Calculate score
  SELECT
    COALESCE(SUM(q.points), 0),
    COALESCE(SUM(a.points_earned), 0)
  INTO v_total_points, v_earned_points
  FROM public.quiz_questions q
  LEFT JOIN public.quiz_attempt_answers a ON a.question_id = q.id AND a.attempt_id = p_attempt_id
  WHERE q.quiz_id = v_attempt.quiz_id;

  -- Calculate percentage
  IF v_total_points > 0 THEN
    v_score := ROUND((v_earned_points / v_total_points) * 100, 2);
  ELSE
    v_score := 0;
  END IF;

  v_passed := v_score >= v_quiz.passing_score_percentage;

  -- Update attempt with score
  UPDATE public.quiz_attempts
  SET score = v_score,
      total_points_earned = v_earned_points,
      total_points_possible = v_total_points,
      scored_at = NOW()
  WHERE id = p_attempt_id;

  -- Transition to scored state
  PERFORM public.transition_exam_state(p_attempt_id, 'scored');

  -- Transition to final state (passed/failed)
  IF v_passed THEN
    PERFORM public.transition_exam_state(p_attempt_id, 'passed');
  ELSE
    PERFORM public.transition_exam_state(p_attempt_id, 'failed');
  END IF;

  -- Get updated attempt
  SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = p_attempt_id;

  -- If passed, create certification
  IF v_passed THEN
    INSERT INTO public.user_certifications (
      user_id,
      certification_type,
      quiz_attempt_id,
      issued_date,
      expiry_date,
      status
    ) VALUES (
      v_attempt.user_id,
      v_quiz.certification_type,
      p_attempt_id,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '3 years',
      'active'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_attempt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 10. Create indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON public.quiz_attempts(status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_proctoring_token ON public.quiz_attempts(proctoring_token);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_session ON public.quiz_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz_status ON public.quiz_attempts(user_id, quiz_id, status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_answered_at ON public.quiz_attempt_answers(answered_at);

-- =============================================================================
-- 11. Update existing attempts to have proper status
-- =============================================================================

UPDATE public.quiz_attempts
SET status = CASE
  WHEN completed_at IS NOT NULL AND passed = TRUE THEN 'passed'::attempt_status
  WHEN completed_at IS NOT NULL AND passed = FALSE THEN 'failed'::attempt_status
  WHEN completed_at IS NOT NULL THEN 'scored'::attempt_status
  WHEN started_at IS NOT NULL THEN 'in_progress'::attempt_status
  ELSE 'not_started'::attempt_status
END
WHERE status IS NULL;

-- =============================================================================
-- 12. Grant permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.transition_exam_state(UUID, attempt_status, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_exam_eligibility(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_certification_exam(UUID, UUID, UUID, UUID, INET, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_exam_answer(UUID, UUID, UUID[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.score_certification_exam(UUID) TO authenticated;
