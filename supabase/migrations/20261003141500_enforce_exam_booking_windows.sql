-- Enforce BDA exam windows for every new or re-scheduled exam booking.
-- This is the authoritative server-side control; client calendars are only a convenience layer.

CREATE OR REPLACE FUNCTION public.enforce_exam_booking_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_date DATE;
  v_certification_type TEXT;
  v_window_id UUID;
BEGIN
  IF NEW.scheduled_start_time IS NULL THEN
    RAISE EXCEPTION 'A scheduled start time is required for an exam booking';
  END IF;

  -- Exam windows are calendar-date rules. Validate the date in the candidate's
  -- selected IANA timezone so a UTC day boundary cannot move a valid local date.
  v_candidate_date := (
    NEW.scheduled_start_time AT TIME ZONE COALESCE(NULLIF(NEW.timezone, ''), 'UTC')
  )::DATE;

  SELECT q.certification_type::TEXT
  INTO v_certification_type
  FROM public.quizzes AS q
  WHERE q.id = NEW.quiz_id;

  IF v_certification_type IS NULL THEN
    RAISE EXCEPTION 'The selected exam does not have a valid certification type';
  END IF;

  SELECT ew.id
  INTO v_window_id
  FROM public.certification_exam_windows AS ew
  WHERE ew.is_active = TRUE
    AND v_candidate_date BETWEEN ew.start_date AND ew.end_date
    AND (
      ew.certification_type IS NULL
      OR UPPER(ew.certification_type) = UPPER(v_certification_type)
    )
  ORDER BY
    CASE WHEN ew.certification_type IS NULL THEN 1 ELSE 0 END,
    ew.start_date
  LIMIT 1;

  IF v_window_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'The selected exam date is outside an active BDA exam window',
      DETAIL = format(
        'Selected local date: %s; certification type: %s',
        v_candidate_date,
        v_certification_type
      ),
      HINT = 'Choose a date within an active BDA exam window.';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_exam_booking_window()
IS 'Rejects new or re-scheduled exam dates outside an active BDA exam window, using the candidate local calendar date.';

DROP TRIGGER IF EXISTS enforce_exam_booking_window ON public.exam_bookings;

CREATE TRIGGER enforce_exam_booking_window
BEFORE INSERT OR UPDATE OF scheduled_start_time, scheduled_end_time, timezone, quiz_id
ON public.exam_bookings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_exam_booking_window();

-- A dedicated operational email for the isolated October scheduling exception.
-- The generic queue worker renders this template from email_templates.
INSERT INTO public.email_templates (
  template_key,
  name,
  category,
  subject,
  html_body,
  text_body,
  variables,
  is_active
)
VALUES (
  'exam_window_reschedule_required',
  'Exam window reschedule required',
  'exam',
  'Action required: reschedule your BDA examination',
  '<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f5f8fc;font-family:Arial,Helvetica,sans-serif;color:#172033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;background:#f5f8fc;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #dbe6f3;border-radius:10px;overflow:hidden;">
          <tr><td style="padding:22px 30px;background:#0b3d78;color:#ffffff;font-size:19px;font-weight:700;">Business Development Association (BDA)</td></tr>
          <tr><td style="padding:30px;font-size:15px;line-height:1.6;">
            <p style="margin:0 0 16px 0;">Dear {{first_name}},</p>
            <p style="margin:0 0 16px 0;">Your {{certification_label}} examination is currently scheduled for October. October is not an available BDA examination window.</p>
            <p style="margin:0 0 16px 0;">The next available BDA examination window is <strong>1–30 November 2026</strong>. Please select a new date and time within that window.</p>
            <p style="margin:24px 0;text-align:center;"><a href="{{reschedule_url}}" style="display:inline-block;background:#0b3d78;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:6px;font-weight:700;">Reschedule My Exam</a></p>
            <p style="margin:0 0 16px 0;">Your exam voucher remains assigned to your account. If you need assistance, contact {{support_email}}.</p>
            <p style="margin:0;">Kind regards,<br><strong>Business Development Association (BDA)</strong></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>',
  'Dear {{first_name}},

Your {{certification_label}} examination is currently scheduled for October. October is not an available BDA examination window.

The next available BDA examination window is 1–30 November 2026. Please select a new date and time within that window:
{{reschedule_url}}

Your exam voucher remains assigned to your account. If you need assistance, contact {{support_email}}.

Kind regards,
Business Development Association (BDA)',
  '["first_name", "certification_label", "reschedule_url", "support_email"]'::jsonb,
  TRUE
)
ON CONFLICT (template_key) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
