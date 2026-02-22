-- Migration: Fix Exam Window Check
-- Date: 2026-01-03
-- Description: Make exam windows optional - if no windows exist, allow exams
-- This ensures exams work even if admin hasn't configured windows yet

-- =============================================================================
-- UPDATE: check_exam_window_open function
-- Return is_open=true when NO windows are configured (fallback behavior)
-- =============================================================================

-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS check_exam_window_open(VARCHAR);

CREATE OR REPLACE FUNCTION check_exam_window_open(
    p_certification_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    is_open BOOLEAN,
    current_window_id UUID,
    current_window_name VARCHAR,
    current_window_end DATE,
    next_window_date DATE,
    next_window_name VARCHAR,
    message TEXT
) AS $$
DECLARE
    v_current_window RECORD;
    v_next_window RECORD;
    v_today DATE := CURRENT_DATE;
    v_any_windows_exist BOOLEAN;
BEGIN
    -- First check if ANY active windows exist for this certification type
    SELECT EXISTS (
        SELECT 1 FROM public.certification_exam_windows ew
        WHERE ew.is_active = true
          AND (ew.certification_type IS NULL OR p_certification_type IS NULL OR LOWER(ew.certification_type) = LOWER(p_certification_type))
    ) INTO v_any_windows_exist;

    -- If no windows are configured at all, allow exams (fallback)
    IF NOT v_any_windows_exist THEN
        RETURN QUERY SELECT
            true::BOOLEAN AS is_open,
            NULL::UUID AS current_window_id,
            NULL::VARCHAR AS current_window_name,
            NULL::DATE AS current_window_end,
            NULL::DATE AS next_window_date,
            NULL::VARCHAR AS next_window_name,
            'No exam windows configured - exams are open'::TEXT AS message;
        RETURN;
    END IF;

    -- Find current open window (case-insensitive certification type match)
    SELECT
        ew.id,
        ew.name,
        ew.end_date
    INTO v_current_window
    FROM public.certification_exam_windows ew
    WHERE ew.is_active = true
      AND v_today BETWEEN ew.start_date AND ew.end_date
      AND (ew.certification_type IS NULL OR p_certification_type IS NULL OR LOWER(ew.certification_type) = LOWER(p_certification_type))
    ORDER BY ew.start_date
    LIMIT 1;

    -- Find next upcoming window
    SELECT
        ew.id,
        ew.name,
        ew.start_date,
        ew.end_date
    INTO v_next_window
    FROM public.certification_exam_windows ew
    WHERE ew.is_active = true
      AND ew.start_date > v_today
      AND (ew.certification_type IS NULL OR p_certification_type IS NULL OR LOWER(ew.certification_type) = LOWER(p_certification_type))
    ORDER BY ew.start_date
    LIMIT 1;

    -- Return results
    IF v_current_window.id IS NOT NULL THEN
        -- Window is currently open
        RETURN QUERY SELECT
            true::BOOLEAN AS is_open,
            v_current_window.id AS current_window_id,
            v_current_window.name AS current_window_name,
            v_current_window.end_date AS current_window_end,
            v_next_window.start_date AS next_window_date,
            v_next_window.name AS next_window_name,
            'Exam registration is currently open'::TEXT AS message;
    ELSE
        -- No current window open
        RETURN QUERY SELECT
            false::BOOLEAN AS is_open,
            NULL::UUID AS current_window_id,
            NULL::VARCHAR AS current_window_name,
            NULL::DATE AS current_window_end,
            v_next_window.start_date AS next_window_date,
            v_next_window.name AS next_window_name,
            CASE
                WHEN v_next_window.start_date IS NOT NULL THEN
                    'Exam registration is closed. Next window: ' || v_next_window.name || ' (' || v_next_window.start_date::TEXT || ')'
                ELSE
                    'Exam registration is currently closed. No upcoming windows scheduled.'
            END::TEXT AS message;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UPDATE: check_exam_eligibility function
-- Fix case sensitivity and improve error messages
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
    v_certification_type VARCHAR;
BEGIN
    -- Get quiz info (note: quizzes table has certification_type, not exam_type)
    SELECT q.id, q.title, q.certification_type
    INTO v_quiz
    FROM quizzes q
    WHERE q.id = p_quiz_id;

    IF v_quiz.id IS NULL THEN
        RETURN QUERY SELECT
            false, 'Quiz not found'::TEXT, NULL::UUID, NULL::TEXT,
            false, NULL::UUID, NULL::TEXT,
            false, NULL::DATE, NULL::VARCHAR;
        RETURN;
    END IF;

    -- Store original certification type (uppercase: CP, SCP)
    v_certification_type := v_quiz.certification_type;

    -- Check exam window (only for certification exams)
    -- Note: quiz_type might be 'certification' or exam_type='certification'
    -- The quizzes table uses certification_type for CP/SCP exams
    IF v_quiz.certification_type IS NOT NULL THEN
        SELECT * INTO v_window FROM check_exam_window_open(v_certification_type);

        IF NOT v_window.is_open THEN
            RETURN QUERY SELECT
                false,
                v_window.message,
                NULL::UUID, NULL::TEXT,
                false, NULL::UUID, NULL::TEXT,
                false, v_window.next_window_date, v_window.next_window_name;
            RETURN;
        END IF;
    END IF;

    -- Check for existing in-progress attempt
    SELECT qa.id, qa.status
    INTO v_attempt
    FROM quiz_attempts qa
    WHERE qa.user_id = p_user_id
      AND qa.quiz_id = p_quiz_id
      AND qa.status IN ('in_progress', 'paused')
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
    IF v_quiz.certification_type IS NOT NULL THEN
        -- Check exam_vouchers first (case-insensitive certification type)
        SELECT ev.id, 'exam_vouchers'::TEXT as source
        INTO v_voucher
        FROM exam_vouchers ev
        WHERE ev.user_id = p_user_id
          AND UPPER(ev.certification_type) = UPPER(v_certification_type)
          AND ev.status = 'available'
          AND (ev.expires_at IS NULL OR ev.expires_at > NOW())
        LIMIT 1;

        -- If not found, check ecp_vouchers (assigned to user)
        IF v_voucher.id IS NULL THEN
            SELECT ecv.id, 'ecp_vouchers'::TEXT as source
            INTO v_voucher
            FROM ecp_vouchers ecv
            WHERE ecv.assigned_to = p_user_id
              AND UPPER(ecv.certification_type) = UPPER(v_certification_type)
              AND ecv.status IN ('assigned', 'available')
              AND (ecv.valid_until IS NULL OR ecv.valid_until > NOW())
            LIMIT 1;
        END IF;

        -- Also check ecp_vouchers by email (for users who received vouchers before linking)
        IF v_voucher.id IS NULL THEN
            SELECT ecv.id, 'ecp_vouchers'::TEXT as source
            INTO v_voucher
            FROM ecp_vouchers ecv
            JOIN users u ON LOWER(u.email) = LOWER(ecv.assigned_to_email)
            WHERE u.id = p_user_id
              AND UPPER(ecv.certification_type) = UPPER(v_certification_type)
              AND ecv.status IN ('assigned', 'available')
              AND (ecv.valid_until IS NULL OR ecv.valid_until > NOW())
            LIMIT 1;
        END IF;

        IF v_voucher.id IS NULL THEN
            RETURN QUERY SELECT
                false, 'No valid voucher found for this certification type. Please purchase a voucher or contact your ECP partner.'::TEXT,
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

SELECT '✅ Exam window check fixed - now allows exams when no windows configured' as status;
