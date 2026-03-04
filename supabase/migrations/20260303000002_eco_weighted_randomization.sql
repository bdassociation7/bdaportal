-- Migration: ECO Weighted Randomization Engine
-- 1. Creates exam_attempt_question_set table (per-attempt question tracking)
-- 2. Extends start_certification_exam() with weighted random selection
--    using eco_blueprint_config. Falls back to all questions if no blueprint.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. exam_attempt_question_set table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.exam_attempt_question_set (
  attempt_id  UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id),
  order_index INTEGER NOT NULL,
  PRIMARY KEY (attempt_id, question_id)
);

CREATE INDEX ON public.exam_attempt_question_set (attempt_id);

COMMENT ON TABLE public.exam_attempt_question_set IS
  'Per-attempt question selection. Populated by start_certification_exam() using the '
  'eco_blueprint_config weights. Each row = one question assigned to one attempt.';

-- RLS: candidates read their own, admins read all
ALTER TABLE public.exam_attempt_question_set ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own attempt questions"
ON public.exam_attempt_question_set FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts
    WHERE id = attempt_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins read all attempt questions"
ON public.exam_attempt_question_set FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Extend start_certification_exam() with ECO randomization
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.start_certification_exam(
  p_user_id    UUID,
  p_quiz_id    UUID,
  p_voucher_id UUID DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_browser_info JSONB DEFAULT NULL
) RETURNS public.quiz_attempts AS $$
DECLARE
  v_quiz               RECORD;
  v_attempt            public.quiz_attempts;
  v_proctoring_token   UUID;
  v_time_limit_seconds INTEGER;
  v_blueprint_count    INTEGER;
  v_order_counter      INTEGER := 0;
  v_blueprint          RECORD;
  v_question_id        UUID;
BEGIN
  -- Get quiz
  SELECT * INTO v_quiz
  FROM public.quizzes
  WHERE id = p_quiz_id AND is_active = TRUE;

  IF v_quiz IS NULL THEN
    RAISE EXCEPTION 'Quiz not found or not active';
  END IF;

  v_proctoring_token   := gen_random_uuid();
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
    NOW() + INTERVAL '1 hour' * (v_quiz.time_limit_minutes / 60 + 2),
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
    UPDATE public.exam_vouchers
    SET status = 'used',
        used_at = NOW(),
        attempt_id = v_attempt.id
    WHERE id = p_voucher_id AND user_id = p_user_id;

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

  -- Log exam start
  INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
  VALUES (
    v_attempt.id,
    'exam_created',
    jsonb_build_object(
      'quiz_id',            p_quiz_id,
      'voucher_id',         p_voucher_id,
      'booking_id',         p_booking_id,
      'ip_address',         p_ip_address::TEXT,
      'time_limit_seconds', v_time_limit_seconds
    )
  );

  -- ── ECO BLUEPRINT WEIGHTED RANDOMIZATION ────────────────────────────────
  -- Check whether a blueprint is configured for this certification type
  SELECT COUNT(*) INTO v_blueprint_count
  FROM public.eco_blueprint_config
  WHERE certification_type = v_quiz.certification_type;

  IF v_blueprint_count > 0 THEN
    -- Draw exactly question_count random questions per competency
    FOR v_blueprint IN
      SELECT competency_name, question_count
      FROM public.eco_blueprint_config
      WHERE certification_type = v_quiz.certification_type
      ORDER BY order_index
    LOOP
      FOR v_question_id IN
        SELECT id
        FROM public.quiz_questions
        WHERE quiz_id = p_quiz_id
          AND competency_name = v_blueprint.competency_name
        ORDER BY RANDOM()
        LIMIT v_blueprint.question_count
      LOOP
        v_order_counter := v_order_counter + 1;
        INSERT INTO public.exam_attempt_question_set (attempt_id, question_id, order_index)
        VALUES (v_attempt.id, v_question_id, v_order_counter)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;

  ELSE
    -- No blueprint configured: fall back to all quiz questions in fixed order
    INSERT INTO public.exam_attempt_question_set (attempt_id, question_id, order_index)
    SELECT v_attempt.id, id, order_index
    FROM public.quiz_questions
    WHERE quiz_id = p_quiz_id
    ORDER BY order_index;
  END IF;
  -- ────────────────────────────────────────────────────────────────────────

  RETURN v_attempt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.start_certification_exam(UUID, UUID, UUID, UUID, INET, TEXT, JSONB) TO authenticated;
