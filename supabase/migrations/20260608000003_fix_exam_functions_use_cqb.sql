-- ============================================================
-- Migration: Fix exam functions to use certification_question_bank
-- 
-- This migration updates three core exam functions to read from
-- certification_question_bank (CQB) instead of quiz_questions:
--
--   1. start_certification_exam()  — question draw / randomization
--   2. save_exam_answer()          — per-answer scoring
--   3. score_certification_exam()  — final score calculation
--
-- Also updates exam_attempt_question_set FK to point to CQB.
-- quiz_attempt_answers FK is relaxed via a new column approach
-- (we keep the old FK for legacy mock-exam rows and add a new
--  nullable cqb_question_id for certification exams).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Update exam_attempt_question_set to reference CQB
--    (drop old FK → quiz_questions, add new FK → CQB)
-- ─────────────────────────────────────────────────────────────

-- Drop existing FK constraint on question_id
ALTER TABLE public.exam_attempt_question_set
  DROP CONSTRAINT IF EXISTS exam_attempt_question_set_question_id_fkey;

-- Add new FK pointing to certification_question_bank
ALTER TABLE public.exam_attempt_question_set
  ADD CONSTRAINT exam_attempt_question_set_question_id_fkey
  FOREIGN KEY (question_id)
  REFERENCES public.certification_question_bank(id)
  ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 2. Fix start_certification_exam()
--    Draw questions from certification_question_bank using
--    (certification_type, exam_language) derived from the quiz.
-- ─────────────────────────────────────────────────────────────

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
  -- ── Get quiz (must be active) ────────────────────────────────
  SELECT * INTO v_quiz
  FROM public.quizzes
  WHERE id = p_quiz_id AND is_active = TRUE;

  IF v_quiz IS NULL THEN
    RAISE EXCEPTION 'Quiz not found or not active';
  END IF;

  v_proctoring_token   := gen_random_uuid();
  v_time_limit_seconds := v_quiz.time_limit_minutes * 60;

  -- ── Create attempt ───────────────────────────────────────────
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
    NOW() + INTERVAL '1 hour' * (v_quiz.time_limit_minutes / 60.0 + 2),
    gen_random_uuid(),
    v_time_limit_seconds,
    p_ip_address,
    p_user_agent,
    p_browser_info,
    'certification'
  )
  RETURNING * INTO v_attempt;

  -- ── Mark voucher as used ─────────────────────────────────────
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

  -- ── Update booking ───────────────────────────────────────────
  IF p_booking_id IS NOT NULL THEN
    UPDATE public.exam_bookings
    SET attempt_id = v_attempt.id
    WHERE id = p_booking_id AND user_id = p_user_id;
  END IF;

  -- ── Audit log ────────────────────────────────────────────────
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

  -- ── ECO BLUEPRINT WEIGHTED RANDOMIZATION ────────────────────
  -- Requires: certification_type and exam_language on the quiz
  SELECT COUNT(*) INTO v_blueprint_count
  FROM public.eco_blueprint_config
  WHERE certification_type = v_quiz.certification_type;

  IF v_blueprint_count > 0
     AND v_quiz.certification_type IS NOT NULL
     AND v_quiz.exam_language IS NOT NULL
  THEN
    -- Draw exactly question_count random questions per competency
    -- from certification_question_bank (active questions only)
    FOR v_blueprint IN
      SELECT competency_name, question_count
      FROM public.eco_blueprint_config
      WHERE certification_type = v_quiz.certification_type
        AND question_count > 0
      ORDER BY order_index
    LOOP
      FOR v_question_id IN
        SELECT id
        FROM public.certification_question_bank
        WHERE certification_type = v_quiz.certification_type
          AND exam_language      = v_quiz.exam_language
          AND competency_name    = v_blueprint.competency_name
          AND is_active          = TRUE
        ORDER BY RANDOM()
        LIMIT v_blueprint.question_count
      LOOP
        v_order_counter := v_order_counter + 1;
        INSERT INTO public.exam_attempt_question_set (attempt_id, question_id, order_index)
        VALUES (v_attempt.id, v_question_id, v_order_counter)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;

  ELSIF v_quiz.certification_type IS NOT NULL
        AND v_quiz.exam_language IS NOT NULL
  THEN
    -- No blueprint: fall back to ALL active CQB questions for this cert+lang
    INSERT INTO public.exam_attempt_question_set (attempt_id, question_id, order_index)
    SELECT v_attempt.id, id, ROW_NUMBER() OVER (ORDER BY created_at)
    FROM public.certification_question_bank
    WHERE certification_type = v_quiz.certification_type
      AND exam_language       = v_quiz.exam_language
      AND is_active           = TRUE;

  ELSE
    -- Legacy fallback: quiz_questions (for non-ECO quizzes)
    INSERT INTO public.exam_attempt_question_set (attempt_id, question_id, order_index)
    SELECT v_attempt.id, id, order_index
    FROM public.quiz_questions
    WHERE quiz_id = p_quiz_id
    ORDER BY order_index;
  END IF;
  -- ─────────────────────────────────────────────────────────────

  RETURN v_attempt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.start_certification_exam(UUID, UUID, UUID, UUID, INET, TEXT, JSONB) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. Fix save_exam_answer()
--    Look up question in CQB first; fall back to quiz_questions
--    for legacy mock-exam attempts.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.save_exam_answer(
  p_attempt_id          UUID,
  p_question_id         UUID,
  p_selected_answer_ids UUID[],
  p_time_spent_seconds  INTEGER DEFAULT NULL
) RETURNS public.quiz_attempt_answers AS $$
DECLARE
  v_attempt       RECORD;
  v_answer        public.quiz_attempt_answers;
  v_is_correct    BOOLEAN;
  v_points_earned DECIMAL;
  v_question      RECORD;
BEGIN
  -- Verify attempt is in progress
  SELECT * INTO v_attempt
  FROM public.quiz_attempts
  WHERE id = p_attempt_id AND status IN ('in_progress')
  FOR UPDATE;

  IF v_attempt IS NULL THEN
    RAISE EXCEPTION 'Cannot save answer: attempt not in progress';
  END IF;

  -- ── Try CQB first (certification exams) ─────────────────────
  SELECT
    cqb.id,
    cqb.question_type,
    cqb.points,
    ARRAY_AGG(a.id) FILTER (WHERE a.is_correct = TRUE) AS correct_answer_ids
  INTO v_question
  FROM public.certification_question_bank cqb
  LEFT JOIN public.certification_question_bank_answers a ON a.question_id = cqb.id
  WHERE cqb.id = p_question_id
  GROUP BY cqb.id, cqb.question_type, cqb.points;

  -- ── Fall back to quiz_questions (mock / legacy exams) ────────
  IF v_question IS NULL THEN
    SELECT
      q.id,
      q.question_type,
      q.points,
      ARRAY_AGG(a.id) FILTER (WHERE a.is_correct = TRUE) AS correct_answer_ids
    INTO v_question
    FROM public.quiz_questions q
    LEFT JOIN public.quiz_answers a ON a.question_id = q.id
    WHERE q.id = p_question_id AND q.quiz_id = v_attempt.quiz_id
    GROUP BY q.id, q.question_type, q.points;
  END IF;

  IF v_question IS NULL THEN
    RAISE EXCEPTION 'Question not found: %', p_question_id;
  END IF;

  -- ── Score the answer ─────────────────────────────────────────
  IF v_question.question_type = 'multi_select' THEN
    v_is_correct := p_selected_answer_ids <@ v_question.correct_answer_ids
                    AND v_question.correct_answer_ids <@ p_selected_answer_ids;
  ELSE
    v_is_correct := p_selected_answer_ids && v_question.correct_answer_ids;
  END IF;

  v_points_earned := CASE WHEN v_is_correct THEN v_question.points ELSE 0 END;

  -- ── Upsert answer ────────────────────────────────────────────
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
      is_correct          = EXCLUDED.is_correct,
      points_earned       = EXCLUDED.points_earned,
      answered_at         = NOW(),
      time_spent_seconds  = COALESCE(EXCLUDED.time_spent_seconds, quiz_attempt_answers.time_spent_seconds),
      answer_changes      = quiz_attempt_answers.answer_changes + 1
  RETURNING * INTO v_answer;

  -- Keep last_activity fresh
  UPDATE public.quiz_attempts
  SET last_activity_at = NOW()
  WHERE id = p_attempt_id;

  RETURN v_answer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.save_exam_answer(UUID, UUID, UUID[], INTEGER) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. Fix score_certification_exam()
--    Calculate total_points from the attempt's question set
--    (CQB for certification, quiz_questions for legacy).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.score_certification_exam(
  p_attempt_id UUID
) RETURNS public.quiz_attempts AS $$
DECLARE
  v_attempt       public.quiz_attempts;
  v_quiz          RECORD;
  v_total_points  DECIMAL := 0;
  v_earned_points DECIMAL := 0;
  v_score         DECIMAL;
  v_passed        BOOLEAN;
BEGIN
  SELECT * INTO v_attempt
  FROM public.quiz_attempts
  WHERE id = p_attempt_id AND status = 'submitted'
  FOR UPDATE;

  IF v_attempt IS NULL THEN
    RAISE EXCEPTION 'Attempt not found or not in submitted status';
  END IF;

  SELECT * INTO v_quiz
  FROM public.quizzes
  WHERE id = v_attempt.quiz_id;

  -- ── Score using CQB if this is a certification exam ──────────
  IF v_quiz.certification_type IS NOT NULL THEN
    SELECT
      COALESCE(SUM(cqb.points), 0),
      COALESCE(SUM(ans.points_earned), 0)
    INTO v_total_points, v_earned_points
    FROM public.exam_attempt_question_set eaqs
    JOIN public.certification_question_bank cqb ON cqb.id = eaqs.question_id
    LEFT JOIN public.quiz_attempt_answers ans
           ON ans.question_id = eaqs.question_id
          AND ans.attempt_id  = p_attempt_id
    WHERE eaqs.attempt_id = p_attempt_id;

  ELSE
    -- Legacy: score from quiz_questions
    SELECT
      COALESCE(SUM(q.points), 0),
      COALESCE(SUM(a.points_earned), 0)
    INTO v_total_points, v_earned_points
    FROM public.quiz_questions q
    LEFT JOIN public.quiz_attempt_answers a
           ON a.question_id = q.id
          AND a.attempt_id  = p_attempt_id
    WHERE q.quiz_id = v_attempt.quiz_id;
  END IF;

  -- ── Calculate percentage ─────────────────────────────────────
  IF v_total_points > 0 THEN
    v_score := ROUND((v_earned_points / v_total_points) * 100, 2);
  ELSE
    v_score := 0;
  END IF;

  v_passed := v_score >= v_quiz.passing_score_percentage;

  UPDATE public.quiz_attempts
  SET score               = v_score,
      total_points_earned = v_earned_points,
      total_points_possible = v_total_points,
      scored_at           = NOW()
  WHERE id = p_attempt_id;

  SELECT * INTO v_attempt
  FROM public.quiz_attempts
  WHERE id = p_attempt_id;

  RETURN v_attempt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.score_certification_exam(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. Drop the old FK on quiz_attempt_answers.question_id
--    so certification exam answers (CQB IDs) are accepted.
--    We keep the column but remove the FK constraint.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.quiz_attempt_answers
  DROP CONSTRAINT IF EXISTS quiz_attempt_answers_question_id_fkey;

COMMENT ON COLUMN public.quiz_attempt_answers.question_id IS
  'References either certification_question_bank.id (certification exams) '
  'or quiz_questions.id (mock/legacy exams). FK intentionally removed to '
  'support both sources.';
