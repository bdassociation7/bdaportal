-- Migration: Create Exam Windows System
-- Date: 2026-01-03
-- Description: Implements exam window scheduling for certification exams
-- Exams can only be taken during defined open periods

-- =============================================================================
-- TABLE: certification_exam_windows
-- Defines time periods when certification exams are available
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.certification_exam_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Window identification
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Certification type (NULL = applies to all)
    certification_type VARCHAR(50), -- 'cp', 'scp', or NULL for all

    -- Window period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT valid_certification_type CHECK (
        certification_type IS NULL
        OR certification_type IN ('cp', 'scp')
    )
);

-- Index for efficient lookups
CREATE INDEX idx_exam_windows_dates ON public.certification_exam_windows(start_date, end_date);
CREATE INDEX idx_exam_windows_cert_type ON public.certification_exam_windows(certification_type);
CREATE INDEX idx_exam_windows_active ON public.certification_exam_windows(is_active);

-- =============================================================================
-- FUNCTION: check_exam_window_open
-- Returns whether exam window is currently open for a certification type
-- =============================================================================

CREATE OR REPLACE FUNCTION check_exam_window_open(
    p_certification_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    is_open BOOLEAN,
    current_window_id UUID,
    current_window_name VARCHAR,
    window_end_date DATE,
    next_window_id UUID,
    next_window_name VARCHAR,
    next_window_start DATE,
    next_window_end DATE
) AS $$
DECLARE
    v_current_window RECORD;
    v_next_window RECORD;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Find current open window
    SELECT
        ew.id,
        ew.name,
        ew.end_date
    INTO v_current_window
    FROM public.certification_exam_windows ew
    WHERE ew.is_active = true
      AND v_today BETWEEN ew.start_date AND ew.end_date
      AND (ew.certification_type IS NULL OR ew.certification_type = p_certification_type)
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
      AND (ew.certification_type IS NULL OR ew.certification_type = p_certification_type)
    ORDER BY ew.start_date
    LIMIT 1;

    -- Return results
    RETURN QUERY SELECT
        (v_current_window.id IS NOT NULL)::BOOLEAN AS is_open,
        v_current_window.id AS current_window_id,
        v_current_window.name AS current_window_name,
        v_current_window.end_date AS window_end_date,
        v_next_window.id AS next_window_id,
        v_next_window.name AS next_window_name,
        v_next_window.start_date AS next_window_start,
        v_next_window.end_date AS next_window_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: get_exam_windows
-- Returns all exam windows with status info
-- =============================================================================

CREATE OR REPLACE FUNCTION get_exam_windows(
    p_certification_type VARCHAR DEFAULT NULL,
    p_include_past BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    certification_type VARCHAR,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN,
    status VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    SELECT
        ew.id,
        ew.name,
        ew.description,
        ew.certification_type,
        ew.start_date,
        ew.end_date,
        ew.is_active,
        CASE
            WHEN NOT ew.is_active THEN 'inactive'
            WHEN v_today < ew.start_date THEN 'upcoming'
            WHEN v_today BETWEEN ew.start_date AND ew.end_date THEN 'open'
            ELSE 'closed'
        END::VARCHAR AS status,
        ew.created_at
    FROM public.certification_exam_windows ew
    WHERE (p_certification_type IS NULL OR ew.certification_type IS NULL OR ew.certification_type = p_certification_type)
      AND (p_include_past = true OR ew.end_date >= v_today OR (v_today BETWEEN ew.start_date AND ew.end_date))
    ORDER BY ew.start_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UPDATE: check_exam_eligibility function
-- Add exam window validation
-- =============================================================================

-- Drop the existing function first (return type is changing)
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
    -- Get quiz info
    SELECT q.id, q.title, q.quiz_type, q.certification_type
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

    -- Determine certification type
    v_certification_type := LOWER(v_quiz.certification_type);

    -- Check exam window (only for certification exams)
    IF v_quiz.quiz_type = 'certification' THEN
        SELECT * INTO v_window FROM check_exam_window_open(v_certification_type);

        IF NOT v_window.is_open THEN
            RETURN QUERY SELECT
                false,
                CASE
                    WHEN v_window.next_window_start IS NOT NULL THEN
                        'Exam window is currently closed. Next window: ' || v_window.next_window_name || ' (' || v_window.next_window_start::TEXT || ')'
                    ELSE
                        'Exam window is currently closed. No upcoming windows scheduled.'
                END::TEXT,
                NULL::UUID, NULL::TEXT,
                false, NULL::UUID, NULL::TEXT,
                false, v_window.next_window_start, v_window.next_window_name;
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
    IF v_quiz.quiz_type = 'certification' THEN
        -- Check exam_vouchers first
        SELECT ev.id, 'exam_vouchers'::TEXT as source
        INTO v_voucher
        FROM exam_vouchers ev
        WHERE ev.user_id = p_user_id
          AND ev.certification_type = v_quiz.certification_type
          AND ev.status = 'available'
          AND (ev.expires_at IS NULL OR ev.expires_at > NOW())
        LIMIT 1;

        -- If not found, check ecp_vouchers
        IF v_voucher.id IS NULL THEN
            SELECT ecv.id, 'ecp_vouchers'::TEXT as source
            INTO v_voucher
            FROM ecp_vouchers ecv
            WHERE ecv.assigned_to = p_user_id
              AND ecv.certification_type = v_quiz.certification_type
              AND ecv.status = 'assigned'
              AND (ecv.valid_until IS NULL OR ecv.valid_until > NOW())
            LIMIT 1;
        END IF;

        IF v_voucher.id IS NULL THEN
            RETURN QUERY SELECT
                false, 'No valid voucher found for this certification'::TEXT,
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
-- RLS Policies
-- =============================================================================

ALTER TABLE public.certification_exam_windows ENABLE ROW LEVEL SECURITY;

-- Everyone can view active exam windows
CREATE POLICY "Anyone can view active exam windows"
    ON public.certification_exam_windows
    FOR SELECT
    USING (is_active = true);

-- Admins can manage exam windows
CREATE POLICY "Admins can manage exam windows"
    ON public.certification_exam_windows
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin')
        )
    );

-- =============================================================================
-- Grant permissions
-- =============================================================================

GRANT SELECT ON public.certification_exam_windows TO authenticated;
GRANT ALL ON public.certification_exam_windows TO service_role;
GRANT EXECUTE ON FUNCTION check_exam_window_open TO authenticated;
GRANT EXECUTE ON FUNCTION get_exam_windows TO authenticated;

-- =============================================================================
-- Insert default exam windows (example - can be modified by admin)
-- =============================================================================

-- Create initial exam windows for 2026
INSERT INTO public.certification_exam_windows (name, description, certification_type, start_date, end_date, is_active)
VALUES
    ('Q1 2026 Exam Window', 'First quarter certification exam window', NULL, '2026-01-01', '2026-03-31', true),
    ('Q2 2026 Exam Window', 'Second quarter certification exam window', NULL, '2026-04-01', '2026-06-30', true),
    ('Q3 2026 Exam Window', 'Third quarter certification exam window', NULL, '2026-07-01', '2026-09-30', true),
    ('Q4 2026 Exam Window', 'Fourth quarter certification exam window', NULL, '2026-10-01', '2026-12-31', true);

-- =============================================================================
-- Verification
-- =============================================================================

SELECT '✅ Exam windows system created successfully' as status;
