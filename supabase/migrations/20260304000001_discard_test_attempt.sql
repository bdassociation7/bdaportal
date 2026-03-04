-- Migration: discard_test_exam_attempt()
-- Allows admins to cleanly delete a test attempt they created under their own account.
-- Guards:
--   1. Caller must be admin or super_admin
--   2. Attempt must belong to the caller
--   3. Attempt must not be completed (cannot delete real results)
-- Cascade: quiz_attempt_answers and exam_attempt_question_set are deleted automatically.

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

  -- Delete — exam_attempt_question_set and quiz_attempt_answers cascade automatically
  DELETE FROM public.quiz_attempts WHERE id = p_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.discard_test_exam_attempt(UUID) TO authenticated;
