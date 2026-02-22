-- Migration: Fix stale attempts and prevent future occurrences
-- Date: 2026-01-03
-- Description:
--   1. Fix any attempts with status='in_progress' but completed_at IS NOT NULL
--   2. Update eligibility function to also check completed_at
--   3. Add trigger to auto-sync status when completed_at is set

-- =============================================================================
-- STEP 1: Fix existing stale attempts
-- Update any attempts that have completed_at set but status still shows in_progress
-- =============================================================================

UPDATE public.quiz_attempts
SET status = CASE
    WHEN passed = true THEN 'passed'::attempt_status
    WHEN passed = false THEN 'failed'::attempt_status
    WHEN score IS NOT NULL THEN 'scored'::attempt_status
    ELSE 'submitted'::attempt_status
  END
WHERE completed_at IS NOT NULL
  AND status IN ('in_progress', 'paused', 'not_started');

-- Log how many were fixed
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % stale attempt records', fixed_count;
END $$;

-- =============================================================================
-- STEP 2: Create trigger to auto-sync status when completed_at is set
-- This prevents future stale states
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_attempt_status_on_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- When completed_at is set and status is still in_progress/paused, update it
  IF NEW.completed_at IS NOT NULL
     AND OLD.completed_at IS NULL
     AND NEW.status IN ('in_progress', 'paused', 'not_started') THEN

    -- Determine the appropriate status based on scoring
    IF NEW.passed = true THEN
      NEW.status := 'passed';
    ELSIF NEW.passed = false THEN
      NEW.status := 'failed';
    ELSIF NEW.score IS NOT NULL THEN
      NEW.status := 'scored';
    ELSE
      NEW.status := 'submitted';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_sync_attempt_status ON public.quiz_attempts;

-- Create the trigger
CREATE TRIGGER trg_sync_attempt_status
  BEFORE UPDATE ON public.quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION sync_attempt_status_on_complete();

-- =============================================================================
-- STEP 3: Update check_exam_eligibility to also check completed_at
-- An attempt is only resumable if status is in_progress/paused AND completed_at IS NULL
-- =============================================================================

DROP FUNCTION IF EXISTS check_exam_eligibility(UUID, UUID);

CREATE OR REPLACE FUNCTION check_exam_eligibility(
    p_user_id UUID,
    p_quiz_id UUID
)
RETURNS TABLE (
    eligible BOOLEAN,
    reason TEXT,
    voucher_id UUID,
    voucher_source TEXT,
    has_existing_attempt BOOLEAN,
    existing_attempt_id UUID,
    existing_attempt_status TEXT,
    window_open BOOLEAN,
    next_window_date DATE,
    next_window_name VARCHAR
) AS $$
DECLARE
    v_quiz RECORD;
    v_voucher RECORD;
    v_attempt RECORD;
    v_window RECORD;
    v_certification_type TEXT;
BEGIN
    -- Get quiz info
    SELECT q.id, q.title, q.certification_type::TEXT
    INTO v_quiz
    FROM public.quizzes q
    WHERE q.id = p_quiz_id;

    IF v_quiz.id IS NULL THEN
        RETURN QUERY SELECT
            false, 'Quiz not found'::TEXT, NULL::UUID, NULL::TEXT,
            false, NULL::UUID, NULL::TEXT,
            false, NULL::DATE, NULL::VARCHAR;
        RETURN;
    END IF;

    v_certification_type := v_quiz.certification_type;

    -- Check exam window (only for certification exams)
    IF v_certification_type IS NOT NULL THEN
        SELECT * INTO v_window FROM check_exam_window_open(v_certification_type);
        IF NOT v_window.is_open THEN
            RETURN QUERY SELECT
                false, v_window.message,
                NULL::UUID, NULL::TEXT,
                false, NULL::UUID, NULL::TEXT,
                false, v_window.next_window_date, v_window.next_window_name;
            RETURN;
        END IF;
    END IF;

    -- Check for existing in-progress attempt
    -- IMPORTANT: Also verify completed_at IS NULL to avoid stale states
    SELECT qa.id, qa.status::TEXT
    INTO v_attempt
    FROM public.quiz_attempts qa
    WHERE qa.user_id = p_user_id
      AND qa.quiz_id = p_quiz_id
      AND qa.status IN ('in_progress', 'paused')
      AND qa.completed_at IS NULL  -- ← This prevents stale "completed but in_progress" attempts
    ORDER BY qa.started_at DESC
    LIMIT 1;

    IF v_attempt.id IS NOT NULL THEN
        RETURN QUERY SELECT
            true, 'Resume existing attempt'::TEXT, NULL::UUID, NULL::TEXT,
            true, v_attempt.id, v_attempt.status,
            true, NULL::DATE, NULL::VARCHAR;
        RETURN;
    END IF;

    -- For certification exams, check voucher
    IF v_certification_type IS NOT NULL THEN
        -- Check exam_vouchers first
        SELECT ev.id, 'exam_vouchers'::TEXT as source
        INTO v_voucher
        FROM public.exam_vouchers ev
        WHERE ev.user_id = p_user_id
          AND UPPER(ev.certification_type::TEXT) = UPPER(v_certification_type)
          AND ev.status = 'available'
          AND (ev.expires_at IS NULL OR ev.expires_at > NOW())
        LIMIT 1;

        -- Check ecp_vouchers (assigned by trainee_id)
        IF v_voucher.id IS NULL THEN
            SELECT ecv.id, 'ecp_vouchers'::TEXT as source
            INTO v_voucher
            FROM public.ecp_vouchers ecv
            WHERE ecv.trainee_id = p_user_id
              AND UPPER(ecv.certification_type::TEXT) = UPPER(v_certification_type)
              AND ecv.status IN ('assigned', 'available')
              AND (ecv.valid_until IS NULL OR ecv.valid_until > NOW())
            LIMIT 1;
        END IF;

        -- Check ecp_vouchers by email
        IF v_voucher.id IS NULL THEN
            SELECT ecv.id, 'ecp_vouchers'::TEXT as source
            INTO v_voucher
            FROM public.ecp_vouchers ecv
            JOIN public.users u ON LOWER(u.email) = LOWER(ecv.assigned_to_email)
            WHERE u.id = p_user_id
              AND UPPER(ecv.certification_type::TEXT) = UPPER(v_certification_type)
              AND ecv.status IN ('assigned', 'available')
              AND (ecv.valid_until IS NULL OR ecv.valid_until > NOW())
            LIMIT 1;
        END IF;

        IF v_voucher.id IS NULL THEN
            RETURN QUERY SELECT
                false, 'No valid voucher found for this certification type.'::TEXT,
                NULL::UUID, NULL::TEXT,
                false, NULL::UUID, NULL::TEXT,
                true, NULL::DATE, NULL::VARCHAR;
            RETURN;
        END IF;

        -- User has voucher and window is open
        RETURN QUERY SELECT
            true, 'Eligible to start exam'::TEXT,
            v_voucher.id, v_voucher.source,
            false, NULL::UUID, NULL::TEXT,
            true, NULL::DATE, NULL::VARCHAR;
        RETURN;
    END IF;

    -- For non-certification quizzes, always eligible
    RETURN QUERY SELECT
        true, 'Eligible'::TEXT,
        NULL::UUID, NULL::TEXT,
        false, NULL::UUID, NULL::TEXT,
        true, NULL::DATE, NULL::VARCHAR;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Verification
-- =============================================================================

SELECT '✅ Fixed stale attempts and added prevention measures:' as status;
SELECT '   1. Updated all stale attempts with completed_at but wrong status' as step1;
SELECT '   2. Added trigger to auto-sync status when completed_at is set' as step2;
SELECT '   3. Updated eligibility function to check completed_at IS NULL' as step3;
