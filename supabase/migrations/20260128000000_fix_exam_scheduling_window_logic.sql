-- ============================================================================
-- FIX: Exam Scheduling Blocked Outside Window Start Date
-- ============================================================================
-- Problem: Scheduling is blocked unless TODAY is within an active window.
-- Fix: Allow scheduling anytime, as long as a date within an active window
--       (current or future) is selected.
-- ============================================================================

-- 1. Update check_exam_window_open to add can_schedule flag
DROP FUNCTION IF EXISTS check_exam_window_open(VARCHAR);

CREATE OR REPLACE FUNCTION check_exam_window_open(
    p_certification_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    is_open BOOLEAN,
    can_schedule BOOLEAN,
    current_window_id UUID,
    current_window_name VARCHAR,
    current_window_start DATE,
    current_window_end DATE,
    next_window_date DATE,
    next_window_name VARCHAR,
    message TEXT
) AS $$
DECLARE
    v_current_window RECORD;
    v_next_window RECORD;
    v_today DATE := CURRENT_DATE;
    v_any_schedulable BOOLEAN := false;
BEGIN
    -- Find current open window (today is within its range)
    SELECT
        ew.id,
        ew.name,
        ew.start_date,
        ew.end_date
    INTO v_current_window
    FROM public.certification_exam_windows ew
    WHERE ew.is_active = true
      AND v_today BETWEEN ew.start_date AND ew.end_date
      AND (ew.certification_type IS NULL OR UPPER(ew.certification_type) = UPPER(p_certification_type))
    ORDER BY ew.start_date
    LIMIT 1;

    -- Find next upcoming window (starts after today)
    SELECT
        ew.id,
        ew.name,
        ew.start_date,
        ew.end_date
    INTO v_next_window
    FROM public.certification_exam_windows ew
    WHERE ew.is_active = true
      AND ew.start_date > v_today
      AND (ew.certification_type IS NULL OR UPPER(ew.certification_type) = UPPER(p_certification_type))
    ORDER BY ew.start_date
    LIMIT 1;

    -- Check if ANY active windows exist (current or future) where scheduling is possible
    -- A window is schedulable if its end_date >= today + 2 days (minimum booking lead time)
    SELECT EXISTS (
        SELECT 1 FROM public.certification_exam_windows ew
        WHERE ew.is_active = true
          AND ew.end_date >= (v_today + INTERVAL '2 days')::DATE
          AND (ew.certification_type IS NULL OR UPPER(ew.certification_type) = UPPER(p_certification_type))
    ) INTO v_any_schedulable;

    -- Return results
    RETURN QUERY SELECT
        (v_current_window.id IS NOT NULL)::BOOLEAN AS is_open,
        v_any_schedulable AS can_schedule,
        v_current_window.id AS current_window_id,
        v_current_window.name AS current_window_name,
        v_current_window.start_date AS current_window_start,
        v_current_window.end_date AS current_window_end,
        COALESCE(v_next_window.start_date, NULL)::DATE AS next_window_date,
        v_next_window.name AS next_window_name,
        CASE
            WHEN v_current_window.id IS NOT NULL THEN 'Exam registration is currently open'
            WHEN v_any_schedulable THEN 'You can schedule your exam for an upcoming window'
            WHEN v_next_window.id IS NOT NULL THEN 'Exam registration is closed. Next window: ' || v_next_window.name
            ELSE 'No exam windows are currently scheduled'
        END::TEXT AS message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create function to get all schedulable windows
CREATE OR REPLACE FUNCTION get_schedulable_exam_windows(
    p_certification_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    window_id UUID,
    window_name VARCHAR,
    start_date DATE,
    end_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ew.id AS window_id,
        ew.name AS window_name,
        ew.start_date,
        ew.end_date
    FROM public.certification_exam_windows ew
    WHERE ew.is_active = true
      AND ew.end_date >= (CURRENT_DATE + INTERVAL '2 days')::DATE
      AND (ew.certification_type IS NULL OR UPPER(ew.certification_type) = UPPER(p_certification_type))
    ORDER BY ew.start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_exam_window_open TO authenticated;
GRANT EXECUTE ON FUNCTION check_exam_window_open TO anon;
GRANT EXECUTE ON FUNCTION get_schedulable_exam_windows TO authenticated;
GRANT EXECUTE ON FUNCTION get_schedulable_exam_windows TO anon;

SELECT '✅ Fixed exam scheduling window logic - scheduling now allowed for future windows' as status;
