-- Migration: Fix UPPER() on enum types
-- Date: 2026-01-03
-- Description: Cast enum to TEXT before calling UPPER()

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
    v_certification_type TEXT;  -- Use TEXT, not VARCHAR
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

    -- Store as TEXT for case-insensitive comparisons
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
    SELECT qa.id, qa.status::TEXT
    INTO v_attempt
    FROM public.quiz_attempts qa
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
    IF v_certification_type IS NOT NULL THEN
        -- Check exam_vouchers first (cast to TEXT for case-insensitive comparison)
        SELECT ev.id, 'exam_vouchers'::TEXT as source
        INTO v_voucher
        FROM public.exam_vouchers ev
        WHERE ev.user_id = p_user_id
          AND UPPER(ev.certification_type::TEXT) = UPPER(v_certification_type)
          AND ev.status = 'available'
          AND (ev.expires_at IS NULL OR ev.expires_at > NOW())
        LIMIT 1;

        -- Check ecp_vouchers (assigned to user)
        IF v_voucher.id IS NULL THEN
            SELECT ecv.id, 'ecp_vouchers'::TEXT as source
            INTO v_voucher
            FROM public.ecp_vouchers ecv
            WHERE ecv.assigned_to = p_user_id
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

SELECT '✅ Fixed UPPER() on enum types by casting to TEXT' as status;
