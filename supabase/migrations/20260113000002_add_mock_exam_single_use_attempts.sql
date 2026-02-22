-- Migration: Add Single-Use Attempt Logic for Mock Exams
-- Date: 2026-01-13
-- Description: Track and enforce single-use attempts per premium mock exam purchase
--
-- BUSINESS LOGIC:
-- - Each premium mock exam purchase grants exactly 1 attempt
-- - Once an attempt is used (exam started), the access is consumed
-- - User must purchase again for another attempt
-- - Free exams remain unlimited

-- =============================================================================
-- ALTER TABLE: mock_exam_premium_access
-- Add columns for attempt tracking
-- =============================================================================

-- Add attempts_allowed: how many attempts this access grants (default 1 for single-use)
ALTER TABLE public.mock_exam_premium_access
ADD COLUMN IF NOT EXISTS attempts_allowed INTEGER NOT NULL DEFAULT 1;

-- Add attempts_used: how many attempts have been consumed
ALTER TABLE public.mock_exam_premium_access
ADD COLUMN IF NOT EXISTS attempts_used INTEGER NOT NULL DEFAULT 0;

-- =============================================================================
-- FUNCTION: check_and_consume_mock_exam_attempt
-- Called when user starts a premium mock exam - checks if they have an available attempt
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_and_consume_mock_exam_attempt(
    p_user_id UUID,
    p_mock_exam_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exam mock_exams%ROWTYPE;
    v_access mock_exam_premium_access%ROWTYPE;
BEGIN
    -- 1. Get the exam
    SELECT * INTO v_exam
    FROM mock_exams
    WHERE id = p_mock_exam_id AND is_active = true;

    IF v_exam IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Exam not found or not active'
        );
    END IF;

    -- 2. If exam is free, allow unlimited attempts
    IF NOT v_exam.is_premium THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_premium', false,
            'message', 'Free exam - unlimited attempts allowed'
        );
    END IF;

    -- 3. For premium exams, check for valid access with remaining attempts
    SELECT * INTO v_access
    FROM mock_exam_premium_access
    WHERE user_id = p_user_id
    AND mock_exam_id = p_mock_exam_id
    AND (expires_at IS NULL OR expires_at > NOW())
    AND attempts_used < attempts_allowed
    FOR UPDATE;  -- Lock the row to prevent race conditions

    IF v_access IS NULL THEN
        -- Check if they have expired access or used all attempts
        IF EXISTS (
            SELECT 1 FROM mock_exam_premium_access
            WHERE user_id = p_user_id
            AND mock_exam_id = p_mock_exam_id
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'no_remaining_attempts',
                'message', 'You have used all your attempts for this exam. Please purchase a new attempt.'
            );
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', 'no_access',
                'message', 'No premium access found for this exam. Please purchase access.'
            );
        END IF;
    END IF;

    -- 4. Consume one attempt
    UPDATE mock_exam_premium_access
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

-- =============================================================================
-- FUNCTION: get_mock_exam_access_status
-- Get detailed access status for UI display
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_mock_exam_access_status(
    p_user_id UUID,
    p_mock_exam_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exam mock_exams%ROWTYPE;
    v_access mock_exam_premium_access%ROWTYPE;
    v_attempt_count INTEGER;
BEGIN
    -- Get the exam
    SELECT * INTO v_exam
    FROM mock_exams
    WHERE id = p_mock_exam_id;

    IF v_exam IS NULL THEN
        RETURN jsonb_build_object(
            'exam_exists', false
        );
    END IF;

    -- If free exam
    IF NOT v_exam.is_premium THEN
        -- Count completed attempts for free exam
        SELECT COUNT(*) INTO v_attempt_count
        FROM mock_exam_attempts
        WHERE exam_id = p_mock_exam_id
        AND user_id = p_user_id
        AND completed_at IS NOT NULL;

        RETURN jsonb_build_object(
            'exam_exists', true,
            'is_premium', false,
            'has_access', true,
            'attempts_unlimited', true,
            'completed_attempts', v_attempt_count
        );
    END IF;

    -- For premium exam, get access record
    SELECT * INTO v_access
    FROM mock_exam_premium_access
    WHERE user_id = p_user_id
    AND mock_exam_id = p_mock_exam_id;

    -- Count completed attempts
    SELECT COUNT(*) INTO v_attempt_count
    FROM mock_exam_attempts
    WHERE exam_id = p_mock_exam_id
    AND user_id = p_user_id
    AND completed_at IS NOT NULL;

    IF v_access IS NULL THEN
        RETURN jsonb_build_object(
            'exam_exists', true,
            'is_premium', true,
            'has_access', false,
            'completed_attempts', v_attempt_count
        );
    END IF;

    RETURN jsonb_build_object(
        'exam_exists', true,
        'is_premium', true,
        'has_access', true,
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

-- =============================================================================
-- UPDATE: grant_mock_exam_access function
-- Ensure new grants set attempts_allowed = 1 for single-use behavior
-- =============================================================================

-- The grant_mock_exam_access function in 20251230180001 already creates records
-- with defaults. The new columns will use DEFAULT 1 for attempts_allowed.

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN public.mock_exam_premium_access.attempts_allowed IS 'Number of exam attempts allowed with this access (default: 1 for single-use)';
COMMENT ON COLUMN public.mock_exam_premium_access.attempts_used IS 'Number of exam attempts already consumed';

COMMENT ON FUNCTION public.check_and_consume_mock_exam_attempt IS 'Check if user can start a premium mock exam and consume one attempt. Returns success/failure with details.';
COMMENT ON FUNCTION public.get_mock_exam_access_status IS 'Get detailed access status for a user/exam combination for UI display';
