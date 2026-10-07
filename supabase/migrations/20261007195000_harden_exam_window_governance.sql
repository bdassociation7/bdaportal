-- Permanent governance for BDA certification exam windows.
-- Scope: standard odd-month windows, overlap prevention, and a yearly maintenance job.
-- This does not alter existing bookings, vouchers, attempts, or active windows.

CREATE OR REPLACE FUNCTION public.prevent_overlapping_exam_windows()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inactive drafts do not affect candidate scheduling. An active window must
  -- never overlap another active BDA window, irrespective of certification
  -- scope, so a calendar date always has one unambiguous BDA exam window.
  IF NEW.is_active AND EXISTS (
    SELECT 1
    FROM public.certification_exam_windows AS existing_window
    WHERE existing_window.is_active = TRUE
      AND existing_window.id IS DISTINCT FROM NEW.id
      AND daterange(existing_window.start_date, existing_window.end_date, '[]')
          && daterange(NEW.start_date, NEW.end_date, '[]')
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23P01',
      MESSAGE = 'An active BDA exam window overlaps an existing active window',
      DETAIL = format(
        'Requested range: %s to %s',
        NEW.start_date,
        NEW.end_date
      ),
      HINT = 'Choose dates outside every active BDA exam window, or keep this window inactive until it is needed.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_overlapping_exam_windows ON public.certification_exam_windows;

CREATE TRIGGER prevent_overlapping_exam_windows
BEFORE INSERT OR UPDATE OF start_date, end_date, is_active
ON public.certification_exam_windows
FOR EACH ROW
EXECUTE FUNCTION public.prevent_overlapping_exam_windows();

COMMENT ON FUNCTION public.prevent_overlapping_exam_windows()
IS 'Prevents overlapping active BDA certification exam windows while allowing inactive drafts.';

CREATE OR REPLACE FUNCTION public.ensure_standard_bda_exam_windows(
  p_target_year INTEGER DEFAULT (EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER + 1)
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month INTEGER;
  v_start_date DATE;
  v_end_date DATE;
  v_inserted_count INTEGER := 0;
BEGIN
  IF p_target_year < 2026 OR p_target_year > 2100 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'The target year must be between 2026 and 2100';
  END IF;

  -- BDA standard windows: every other month, starting in January.
  FOREACH v_month IN ARRAY ARRAY[1, 3, 5, 7, 9, 11]
  LOOP
    v_start_date := make_date(p_target_year, v_month, 1);
    v_end_date := (date_trunc('month', v_start_date)::DATE + INTERVAL '1 month - 1 day')::DATE;

    -- Do not create a duplicate or conflict with a valid manually maintained
    -- window that already covers the standard month.
    IF NOT EXISTS (
      SELECT 1
      FROM public.certification_exam_windows AS existing_window
      WHERE daterange(existing_window.start_date, existing_window.end_date, '[]')
            && daterange(v_start_date, v_end_date, '[]')
    ) THEN
      INSERT INTO public.certification_exam_windows (
        name,
        description,
        certification_type,
        start_date,
        end_date,
        is_active
      )
      VALUES (
        format('%s %s Exam Window', p_target_year, to_char(v_start_date, 'FMMonth')),
        'Standard BDA examination availability window',
        NULL,
        v_start_date,
        v_end_date,
        TRUE
      );

      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;

  RETURN v_inserted_count;
END;
$$;

COMMENT ON FUNCTION public.ensure_standard_bda_exam_windows(INTEGER)
IS 'Ensures the six standard BDA odd-month exam windows exist for one calendar year without altering existing windows.';

-- Reconcile the following calendar year immediately. Existing 2027 windows
-- remain untouched; this is idempotent and only fills any missing standard month.
SELECT public.ensure_standard_bda_exam_windows();

-- Maintain the following calendar year's January, March, May, July, September,
-- and November windows each 1 December at 00:05 UTC.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ensure-standard-bda-exam-windows';

SELECT cron.schedule(
  'ensure-standard-bda-exam-windows',
  '5 0 1 12 *',
  'SELECT public.ensure_standard_bda_exam_windows()'
);
