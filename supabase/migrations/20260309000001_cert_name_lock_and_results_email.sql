-- =============================================================================
-- Migration: Certificate Name Lock + Exam Results Email Template
-- Date: 2026-03-09
-- Safe for production: uses IF NOT EXISTS and ON CONFLICT
-- =============================================================================

-- 1. Add certificate_holder_name column (locked on first PDF download)
ALTER TABLE public.user_certifications
ADD COLUMN IF NOT EXISTS certificate_holder_name TEXT;

COMMENT ON COLUMN public.user_certifications.certificate_holder_name
IS 'Name printed on the certificate PDF, locked on first download. Null = not yet downloaded. Cannot be changed without admin intervention.';

-- 2. SECURITY DEFINER function: lock the name on first download only
--    - If not yet set: saves the name and returns it
--    - If already set: returns the stored name (prevents overwrite)
--    - Admin can always update (for corrections via support)
CREATE OR REPLACE FUNCTION public.lock_certificate_holder_name(
    p_cert_id UUID,
    p_name    TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cert RECORD;
    v_is_admin BOOLEAN;
BEGIN
    SELECT id, user_id, certificate_holder_name
    INTO v_cert
    FROM public.user_certifications
    WHERE id = p_cert_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Certificate not found';
    END IF;

    -- Check caller identity
    IF v_cert.user_id != auth.uid() THEN
        SELECT EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        ) INTO v_is_admin;

        IF NOT v_is_admin THEN
            RAISE EXCEPTION 'Not authorized';
        END IF;
    END IF;

    -- Lock only if not yet set (idempotent for normal users)
    IF v_cert.certificate_holder_name IS NULL THEN
        UPDATE public.user_certifications
        SET certificate_holder_name = TRIM(p_name)
        WHERE id = p_cert_id;
        RETURN TRIM(p_name);
    END IF;

    -- Already locked — return the stored name unchanged
    RETURN v_cert.certificate_holder_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lock_certificate_holder_name(UUID, TEXT) TO authenticated;

-- 3. Exam results email template
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
    'exam_results',
    'Exam Results Report',
    'certification',
    'Your BDA-{{certification_type}}™ Exam Results',
    '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BDA Exam Results</title>
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;">
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
              <div style="display:inline-block;background:{{header_bg}};color:#ffffff;padding:10px 24px;border-radius:50px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">{{header_label}}</div>
            </div>
            <h1 style="margin:0 0 20px 0;font-size:22px;color:#1f2937;text-align:center;">BDA-{{certification_type}}™ Exam Results</h1>
            <p style="margin:0 0 16px 0;">Dear {{first_name}},</p>
            <p style="margin:0 0 24px 0;">{{result_message}}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f3f4f6;border-radius:8px;margin:0 0 24px 0;">
              <tr><td style="padding:20px;">
                <p style="margin:0 0 14px 0;font-size:15px;font-weight:600;color:#1e40af;">Exam Summary</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Certification</td>
                    <td style="padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;font-weight:600;">BDA-{{certification_type}}™</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Your Score</td>
                    <td style="padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:18px;text-align:right;font-weight:700;color:{{score_color}};">{{score}}%</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Passing Score</td>
                    <td style="padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;">{{passing_score}}%</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Points Earned</td>
                    <td style="padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;">{{points_earned}} / {{points_possible}}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Time Spent</td>
                    <td style="padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;">{{time_spent}} min</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;font-size:14px;color:#6b7280;">Completed</td>
                    <td style="padding:7px 0;font-size:14px;text-align:right;">{{completed_date}}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style="margin:0 0 24px 0;font-size:14px;color:#374151;">{{next_steps}}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
              <tr><td><a href="https://portal.bda-global.org" style="display:inline-block;padding:14px 32px;background-color:#1e40af;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View My Portal</a></td></tr>
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
    'BDA-{{certification_type}}™ Exam Results

Dear {{first_name}},

{{result_message}}

EXAM SUMMARY
Certification:  BDA-{{certification_type}}™
Your Score:     {{score}}%
Passing Score:  {{passing_score}}%
Points Earned:  {{points_earned}} / {{points_possible}}
Time Spent:     {{time_spent}} min
Completed:      {{completed_date}}

{{next_steps}}

View your portal: https://portal.bda-global.org

Questions? Contact exams@bda-global.org
---
The Business Development Association (BDA®)',
    '["first_name", "certification_type", "score", "passing_score", "points_earned", "points_possible", "time_spent", "completed_date", "result_message", "next_steps", "header_bg", "header_label", "score_color"]'::jsonb,
    true
)
ON CONFLICT (template_key) DO UPDATE SET
    subject   = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    text_body = EXCLUDED.text_body,
    variables = EXCLUDED.variables,
    is_active = true,
    updated_at = NOW();

SELECT '✅ certificate_holder_name column, lock function, and exam_results email template applied' AS status;
