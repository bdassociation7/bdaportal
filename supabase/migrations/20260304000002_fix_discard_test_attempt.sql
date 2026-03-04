-- Fix: discard_test_exam_attempt — explicitly delete quiz_attempt_answers
-- before deleting the attempt row, guarding against missing ON DELETE CASCADE
-- on the quiz_attempt_answers FK constraint.

CREATE OR REPLACE FUNCTION public.discard_test_exam_attempt(p_attempt_id UUID)
RETURNS VOID AS $$
DECLARE
  v_attempt RECORD;
BEGIN
  -- 1. Caller must be admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only administrators can discard exam attempts';
  END IF;

  -- 2. Attempt must exist and belong to the calling admin
  SELECT * INTO v_attempt
  FROM public.quiz_attempts
  WHERE id = p_attempt_id AND user_id = auth.uid();

  IF v_attempt IS NULL THEN
    RAISE EXCEPTION 'Attempt not found or does not belong to your account';
  END IF;

  -- 3. Cannot discard a completed attempt
  IF v_attempt.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot discard a completed attempt';
  END IF;

  -- Delete answers first (defensive: avoids FK violation if CASCADE is not set)
  DELETE FROM public.quiz_attempt_answers WHERE attempt_id = p_attempt_id;

  -- Delete attempt — exam_attempt_question_set cascades automatically (ON DELETE CASCADE)
  DELETE FROM public.quiz_attempts WHERE id = p_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.discard_test_exam_attempt(UUID) TO authenticated;
