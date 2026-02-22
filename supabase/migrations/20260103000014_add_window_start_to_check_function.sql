-- Migration: Add current_window_start to check_exam_window_open
-- Date: 2026-01-03
-- Description: Return window start date so frontend can restrict scheduling to window period

DROP FUNCTION IF EXISTS check_exam_window_open(VARCHAR);

CREATE OR REPLACE FUNCTION check_exam_window_open(
    p_certification_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    is_open BOOLEAN,
    current_window_id UUID,
    current_window_name VARCHAR,
    current_window_start DATE,  -- Added: window start date
    current_window_end DATE,
    next_window_date DATE,
    next_window_name VARCHAR,
    message TEXT
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
        ew.start_date,
        ew.end_date
    INTO v_current_window
    FROM public.certification_exam_windows ew
    WHERE ew.is_active = true
      AND v_today BETWEEN ew.start_date AND ew.end_date
      AND (ew.certification_type IS NULL OR UPPER(ew.certification_type) = UPPER(p_certification_type))
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
      AND (ew.certification_type IS NULL OR UPPER(ew.certification_type) = UPPER(p_certification_type))
    ORDER BY ew.start_date
    LIMIT 1;

    -- Return results
    RETURN QUERY SELECT
        (v_current_window.id IS NOT NULL)::BOOLEAN AS is_open,
        v_current_window.id AS current_window_id,
        v_current_window.name AS current_window_name,
        v_current_window.start_date AS current_window_start,  -- Added
        v_current_window.end_date AS current_window_end,
        v_next_window.start_date AS next_window_date,
        v_next_window.name AS next_window_name,
        CASE
            WHEN v_current_window.id IS NOT NULL THEN 'Exam registration is currently open'
            WHEN v_next_window.id IS NOT NULL THEN 'Exam registration is closed. Next window: ' || v_next_window.name
            ELSE 'No exam windows are currently scheduled'
        END::TEXT AS message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_exam_window_open TO authenticated;
GRANT EXECUTE ON FUNCTION check_exam_window_open TO anon;

SELECT '✅ Added current_window_start to check_exam_window_open function' as status;
