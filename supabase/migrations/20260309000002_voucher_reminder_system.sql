-- =============================================================================
-- Migration: Voucher Reminder System
-- Date: 2026-03-09
-- Features:
--   1. voucher_reminder_logs table (dedup guard)
--   2. voucher_window_reminder email template
--   3. check_unused_voucher_reminders() cron function (4-reminder schedule)
--   4. get_voucher_tracking_data() RPC for admin UI
--   5. pg_cron job at 9:00 AM UTC daily
-- =============================================================================

-- 1. VOUCHER REMINDER LOGS TABLE
-- Guards against duplicate sends: UNIQUE(voucher_id, exam_window_id, reminder_type)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.voucher_reminder_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id      UUID NOT NULL REFERENCES public.exam_vouchers(id) ON DELETE CASCADE,
    exam_window_id  UUID NOT NULL REFERENCES public.certification_exam_windows(id) ON DELETE CASCADE,
    reminder_type   TEXT NOT NULL CHECK (reminder_type IN ('window_open', 'day_5', 'day_minus_3', 'day_minus_1')),
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (voucher_id, exam_window_id, reminder_type)
);

ALTER TABLE public.voucher_reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view voucher_reminder_logs"
ON public.voucher_reminder_logs FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

CREATE INDEX IF NOT EXISTS idx_vrl_voucher ON public.voucher_reminder_logs(voucher_id);
CREATE INDEX IF NOT EXISTS idx_vrl_window  ON public.voucher_reminder_logs(exam_window_id);

COMMENT ON TABLE public.voucher_reminder_logs IS
'Tracks which reminder emails have been sent per voucher per window — prevents duplicate sends.';

-- =============================================================================
-- 2. EMAIL TEMPLATE: voucher_window_reminder
-- =============================================================================

INSERT INTO public.email_templates (
    template_key,
    name,
    category,
    subject,
    html_body,
    text_body,
    variables,
    is_active
) VALUES (
    'voucher_window_reminder',
    'Voucher Window Reminder',
    'certification',
    '{{subject_line}}',
    '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BDA Exam Window Reminder</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f9fafb;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
        <tr>
          <td align="center" style="padding:32px 40px;background:linear-gradient(135deg,#1e40af 0%,#1e3a8a 100%);border-radius:12px 12px 0 0;">
            <img src="https://portal.bda-global.org/bda-email-logo.png" alt="BDA" width="220" style="max-width:220px;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:40px;color:#1f2937;font-size:16px;line-height:1.6;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="display:inline-block;background:#d97706;color:#ffffff;padding:10px 24px;border-radius:50px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">{{urgency_label}}</div>
            </div>
            <h1 style="margin:0 0 20px 0;font-size:22px;color:#1f2937;text-align:center;">Your BDA-{{certification_type}}™ Exam Voucher</h1>
            <p style="margin:0 0 16px 0;">Dear {{first_name}},</p>
            <p style="margin:0 0 24px 0;">{{reminder_message}}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#fef3c7;border:1px solid #fcd34d;border-radius:8px;margin:0 0 24px 0;">
              <tr><td style="padding:20px;">
                <p style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#92400e;">Exam Window Details</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #fcd34d;font-size:14px;color:#78350f;">Certification</td>
                    <td style="padding:7px 0;border-bottom:1px solid #fcd34d;font-size:14px;text-align:right;font-weight:600;">BDA-{{certification_type}}™</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #fcd34d;font-size:14px;color:#78350f;">Window Opens</td>
                    <td style="padding:7px 0;border-bottom:1px solid #fcd34d;font-size:14px;text-align:right;">{{window_start}}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #fcd34d;font-size:14px;color:#78350f;">Window Closes</td>
                    <td style="padding:7px 0;border-bottom:1px solid #fcd34d;font-size:14px;text-align:right;font-weight:600;color:#dc2626;">{{window_end}}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;font-size:14px;color:#78350f;">Days Remaining</td>
                    <td style="padding:7px 0;font-size:14px;text-align:right;font-weight:700;color:#dc2626;">{{days_remaining}}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style="margin:0 0 24px 0;font-size:14px;color:#374151;">Your voucher code: <strong style="font-family:monospace;background:#f3f4f6;padding:2px 8px;border-radius:4px;">{{voucher_code}}</strong></p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
              <tr><td><a href="https://portal.bda-global.org/exams/book" style="display:inline-block;padding:14px 32px;background-color:#1e40af;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Schedule My Exam Now</a></td></tr>
            </table>
            <p style="margin:0;color:#9ca3af;font-size:13px;">Questions? Contact us at <a href="mailto:exams@bda-global.org" style="color:#1e40af;">exams@bda-global.org</a></p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background-color:#f9fafb;border-radius:0 0 12px 12px;text-align:center;">
            <p style="margin:0 0 8px 0;font-size:13px;color:#9ca3af;">The Business Development Association (BDA®)</p>
            <p style="margin:0;font-size:11px;color:#9ca3af;">&copy; 2026 The Business Development Association (BDA®). All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
    'BDA-{{certification_type}}™ Exam Window Reminder

Dear {{first_name}},

{{reminder_message}}

EXAM WINDOW DETAILS
Certification:  BDA-{{certification_type}}™
Window Opens:   {{window_start}}
Window Closes:  {{window_end}}
Days Remaining: {{days_remaining}}

Voucher Code: {{voucher_code}}

Schedule your exam: https://portal.bda-global.org/exams/book

Questions? Contact exams@bda-global.org
---
The Business Development Association (BDA®)',
    '["first_name", "certification_type", "voucher_code", "window_start", "window_end", "days_remaining", "reminder_message", "urgency_label", "subject_line"]'::jsonb,
    true
)
ON CONFLICT (template_key) DO UPDATE SET
    subject   = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    text_body = EXCLUDED.text_body,
    variables = EXCLUDED.variables,
    is_active = true,
    updated_at = NOW();

-- =============================================================================
-- 3. FUNCTION: check_unused_voucher_reminders()
-- Called daily by pg_cron at 9:00 AM UTC.
-- Reminder schedule:
--   window_open  → day window opens (start_date = today)
--   day_5        → 5 days after window opens (start_date + 5 = today)
--   day_minus_3  → 3 days before window closes (end_date - 3 = today)
--   day_minus_1  → 1 day before window closes (end_date - 1 = today)
-- Only sends to users with an 'unused' voucher and no active booking in this window.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_unused_voucher_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window       RECORD;
    v_reminder_type TEXT;
    v_days_remaining INT;
    v_voucher      RECORD;
    v_urgency      TEXT;
    v_message      TEXT;
    v_subject      TEXT;
    v_cert_label   TEXT;
BEGIN
    -- Iterate over all currently open exam windows
    FOR v_window IN
        SELECT id, name, certification_type, start_date, end_date
        FROM public.certification_exam_windows
        WHERE is_active = true
          AND start_date <= CURRENT_DATE
          AND end_date   >= CURRENT_DATE
    LOOP
        -- Determine which reminder type fires today (skip if none)
        v_reminder_type := NULL;

        IF v_window.start_date = CURRENT_DATE THEN
            v_reminder_type := 'window_open';
        ELSIF v_window.start_date + 5 = CURRENT_DATE THEN
            v_reminder_type := 'day_5';
        ELSIF v_window.end_date - 3 = CURRENT_DATE THEN
            v_reminder_type := 'day_minus_3';
        ELSIF v_window.end_date - 1 = CURRENT_DATE THEN
            v_reminder_type := 'day_minus_1';
        END IF;

        CONTINUE WHEN v_reminder_type IS NULL;

        v_days_remaining := (v_window.end_date - CURRENT_DATE)::INT;

        -- Build copy based on reminder type
        CASE v_reminder_type
            WHEN 'window_open' THEN
                v_urgency := 'Exam Window Open';
                v_message := 'Great news — your exam window is now open! You can schedule your exam at any time before the window closes. Don''t wait too long — slots fill up fast.';
                v_subject := 'Your BDA Exam Window Is Now Open — Schedule Today!';
            WHEN 'day_5' THEN
                v_urgency := 'Reminder';
                v_message := 'Just a friendly reminder that your exam window is still open and your voucher hasn''t been used yet. Log in to the portal and book your exam before the window closes.';
                v_subject := 'Reminder: You Still Have an Unused Exam Voucher';
            WHEN 'day_minus_3' THEN
                v_urgency := '3 Days Left';
                v_message := 'Only 3 days left in your current exam window! Your voucher is still unused. Please schedule your exam now to avoid missing this window.';
                v_subject := 'Urgent: 3 Days Left to Use Your BDA Exam Voucher';
            WHEN 'day_minus_1' THEN
                v_urgency := 'Last Day Tomorrow';
                v_message := 'This is your final reminder — the exam window closes tomorrow! Your voucher will not be usable after the window ends. Book your exam tonight to secure your slot.';
                v_subject := 'Final Reminder: Exam Window Closes Tomorrow — Act Now';
        END CASE;

        -- Find all unused vouchers for this window's certification type, with no active booking
        FOR v_voucher IN
            SELECT
                ev.id AS voucher_id,
                ev.code AS voucher_code,
                ev.certification_type,
                u.id AS user_id,
                u.email,
                u.first_name,
                u.last_name
            FROM public.exam_vouchers ev
            JOIN public.users u ON u.id = ev.user_id
            WHERE ev.status = 'unused'
              -- Match certification type: window NULL = all; otherwise match (case-insensitive)
              AND (
                  v_window.certification_type IS NULL
                  OR LOWER(ev.certification_type::TEXT) = LOWER(v_window.certification_type)
              )
              -- Voucher not expired
              AND ev.expires_at > NOW()
              -- No active booking within this window's dates
              AND NOT EXISTS (
                  SELECT 1 FROM public.exam_bookings eb
                  WHERE eb.voucher_id = ev.id
                    AND eb.status NOT IN ('cancelled', 'no_show')
                    AND eb.scheduled_start_time::DATE BETWEEN v_window.start_date AND v_window.end_date
              )
              -- Not already sent this reminder for this window
              AND NOT EXISTS (
                  SELECT 1 FROM public.voucher_reminder_logs vrl
                  WHERE vrl.voucher_id = ev.id
                    AND vrl.exam_window_id = v_window.id
                    AND vrl.reminder_type = v_reminder_type
              )
        LOOP
            -- Friendly cert label
            v_cert_label := UPPER(v_voucher.certification_type::TEXT);

            -- Send via send_exam_email helper (queues into email_queue → pg_net → send-email edge fn)
            PERFORM public.send_exam_email(
                v_voucher.user_id,
                'voucher_window_reminder',
                jsonb_build_object(
                    'first_name',       COALESCE(v_voucher.first_name, 'Candidate'),
                    'certification_type', v_cert_label,
                    'voucher_code',     v_voucher.voucher_code,
                    'window_start',     to_char(v_window.start_date, 'Month DD, YYYY'),
                    'window_end',       to_char(v_window.end_date,   'Month DD, YYYY'),
                    'days_remaining',   v_days_remaining::TEXT || ' day' || CASE WHEN v_days_remaining = 1 THEN '' ELSE 's' END,
                    'reminder_message', v_message,
                    'urgency_label',    v_urgency,
                    'subject_line',     v_subject
                )
            );

            -- Log to prevent duplicate sends
            INSERT INTO public.voucher_reminder_logs (voucher_id, exam_window_id, reminder_type)
            VALUES (v_voucher.voucher_id, v_window.id, v_reminder_type)
            ON CONFLICT DO NOTHING;

        END LOOP;
    END LOOP;
END;
$$;

-- =============================================================================
-- 4. FUNCTION: get_voucher_tracking_data()
-- Returns per-voucher tracking data for the admin UI.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_voucher_tracking_data(
    p_cert_type     TEXT DEFAULT NULL,
    p_country_code  TEXT DEFAULT NULL,
    p_status        TEXT DEFAULT NULL   -- 'unused_no_booking' | 'scheduled' | 'used' | 'expired'
)
RETURNS TABLE (
    voucher_id          UUID,
    voucher_code        TEXT,
    certification_type  TEXT,
    exam_language       TEXT,
    user_id             UUID,
    user_email          TEXT,
    user_first_name     TEXT,
    user_last_name      TEXT,
    user_country_code   TEXT,
    voucher_status      TEXT,
    expires_at          TIMESTAMPTZ,
    booking_id          UUID,
    booking_status      TEXT,
    scheduled_date      DATE,
    window_id           UUID,
    window_name         TEXT,
    window_start        DATE,
    window_end          DATE,
    reminders_sent      BIGINT,
    last_reminder_type  TEXT,
    last_reminder_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Restrict to admins
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    RETURN QUERY
    SELECT
        ev.id                               AS voucher_id,
        ev.code                             AS voucher_code,
        ev.certification_type::TEXT         AS certification_type,
        ev.exam_language::TEXT              AS exam_language,
        u.id                                AS user_id,
        u.email                             AS user_email,
        u.first_name                        AS user_first_name,
        u.last_name                         AS user_last_name,
        u.country_code                      AS user_country_code,
        ev.status::TEXT                     AS voucher_status,
        ev.expires_at                       AS expires_at,
        eb.id                               AS booking_id,
        eb.status::TEXT                     AS booking_status,
        eb.scheduled_start_time::DATE       AS scheduled_date,
        cew.id                              AS window_id,
        cew.name                            AS window_name,
        cew.start_date                      AS window_start,
        cew.end_date                        AS window_end,
        COALESCE(rl.reminder_count, 0)      AS reminders_sent,
        rl.last_type                        AS last_reminder_type,
        rl.last_sent                        AS last_reminder_at
    FROM public.exam_vouchers ev
    JOIN public.users u ON u.id = ev.user_id
    -- Latest active booking (if any)
    LEFT JOIN LATERAL (
        SELECT id, status, scheduled_start_time
        FROM public.exam_bookings
        WHERE voucher_id = ev.id
          AND status NOT IN ('cancelled', 'no_show')
        ORDER BY scheduled_start_time DESC
        LIMIT 1
    ) eb ON true
    -- Current open window matching this cert type
    LEFT JOIN LATERAL (
        SELECT id, name, start_date, end_date
        FROM public.certification_exam_windows
        WHERE is_active = true
          AND start_date <= CURRENT_DATE
          AND end_date   >= CURRENT_DATE
          AND (
              certification_type IS NULL
              OR LOWER(certification_type) = LOWER(ev.certification_type::TEXT)
          )
        ORDER BY end_date ASC
        LIMIT 1
    ) cew ON true
    -- Reminder summary
    LEFT JOIN LATERAL (
        SELECT
            COUNT(*)               AS reminder_count,
            MAX(reminder_type)     AS last_type,
            MAX(sent_at)           AS last_sent
        FROM public.voucher_reminder_logs
        WHERE voucher_id = ev.id
    ) rl ON true
    WHERE
        -- cert type filter
        (p_cert_type IS NULL OR LOWER(ev.certification_type::TEXT) = LOWER(p_cert_type))
        -- country filter
        AND (p_country_code IS NULL OR u.country_code = p_country_code)
        -- status filter
        AND (
            p_status IS NULL
            OR (p_status = 'unused_no_booking' AND ev.status = 'unused' AND eb.id IS NULL AND ev.expires_at > NOW())
            OR (p_status = 'scheduled'          AND eb.id IS NOT NULL)
            OR (p_status = 'used'               AND ev.status = 'used')
            OR (p_status = 'expired'            AND (ev.status = 'expired' OR ev.expires_at <= NOW()))
        )
    ORDER BY
        -- Urgent unused first: open window, no booking
        CASE WHEN ev.status = 'unused' AND eb.id IS NULL AND cew.id IS NOT NULL AND ev.expires_at > NOW() THEN 0 ELSE 1 END,
        cew.end_date ASC NULLS LAST,
        ev.expires_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_voucher_tracking_data(TEXT, TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 5. pg_cron JOB: check-voucher-reminders (daily at 09:00 UTC)
-- =============================================================================

SELECT cron.schedule(
    'check-voucher-reminders',
    '0 9 * * *',
    'SELECT public.check_unused_voucher_reminders()'
);

SELECT '✅ Voucher reminder system: logs table, email template, cron function, tracking RPC, and pg_cron job applied' AS status;
