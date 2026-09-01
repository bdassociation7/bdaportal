-- ============================================================================
-- SEND A ONE-TIME EMAIL WHEN A BDA CERTIFICATE BECOMES AVAILABLE
-- ============================================================================
-- Candidates receive this notice only after their certificate is downloadable.
-- The email intentionally does not expose an availability date or internal
-- timing logic, and links only to the candidate's My Certifications page.
-- ============================================================================

-- Retain a durable, per-certificate send log. The table already exists in the
-- production database; this definition keeps clean environments compatible.
CREATE TABLE IF NOT EXISTS public.certificate_availability_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id UUID NOT NULL REFERENCES public.user_certifications(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL DEFAULT '3_days_before',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (certification_id, notification_type)
);

ALTER TABLE public.certificate_availability_notifications ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.certificate_availability_notifications
IS 'One-time certificate availability email log; prevents duplicate candidate notifications.';

-- Retire the previous advance-notice template so no date is emailed to a
-- candidate. The new template is intentionally concise and BDA-only.
UPDATE public.email_templates
SET is_active = false,
    updated_at = NOW()
WHERE template_key = 'certificate_available_soon';

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
  'certificate_now_available',
  'Certificate Now Available',
  'certification',
  'Your BDA-{{certification_type}} Certificate Is Now Available',
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your BDA Certificate Is Available</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f6ff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0f6ff;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td align="center" style="padding:30px 40px;background:linear-gradient(135deg,#0f91e0 0%,#1c4a8b 55%,#0d1f4e 100%);">
            <img src="https://portal.bda-global.org/bda-email-logo.png" alt="BDA" width="220" style="display:block;max-width:220px;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:40px;color:#1f2937;font-size:16px;line-height:1.6;">
            <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#0d1f4e;text-align:center;">Your BDA Certificate Is Now Available</h1>
            <p style="margin:0 0 16px;">Dear {{first_name}},</p>
            <p style="margin:0 0 24px;">Your BDA-{{certification_type}} certificate is now available in your portal. You may download and share it with your professional community.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
              <tr><td align="center" style="border-radius:8px;background-color:#0f91e0;">
                <a href="{{certificate_url}}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">View My Certificate</a>
              </td></tr>
            </table>
            <p style="margin:0;font-size:13px;color:#64748b;">If you need assistance, please contact <a href="mailto:support@bda-global.org" style="color:#1c4a8b;">support@bda-global.org</a>.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 40px;background-color:#f8fafc;text-align:center;">
            <p style="margin:0;font-size:12px;color:#64748b;">The Business Development Association (BDA)</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  'Your BDA-{{certification_type}} Certificate Is Now Available

Dear {{first_name}},

Your BDA-{{certification_type}} certificate is now available in your portal. You may download and share it with your professional community.

View your certificate: {{certificate_url}}

Need assistance? Contact support@bda-global.org.',
  '["first_name", "certification_type", "certificate_url"]'::jsonb,
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = true,
  updated_at = NOW();

-- Mark certificates that were already available before this feature as handled.
-- This prevents a bulk email to historical certificate holders. New records use
-- the availability date default and remain unlogged until they are eligible.
INSERT INTO public.certificate_availability_notifications (
  certification_id,
  notification_type,
  sent_at
)
SELECT
  uc.id,
  'available_now',
  NOW()
FROM public.user_certifications uc
WHERE uc.certificate_available_date IS NOT NULL
  AND uc.certificate_available_date <= CURRENT_DATE
ON CONFLICT (certification_id, notification_type) DO NOTHING;

CREATE OR REPLACE FUNCTION public.check_certificate_availability_reminder()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cert RECORD;
BEGIN
  FOR v_cert IN
    SELECT
      uc.id,
      uc.user_id,
      uc.certification_type,
      uc.credential_id
    FROM public.user_certifications uc
    WHERE uc.status = 'active'
      AND uc.certificate_available_date IS NOT NULL
      AND uc.certificate_available_date <= CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1
        FROM public.certificate_availability_notifications can
        WHERE can.certification_id = uc.id
          AND can.notification_type = 'available_now'
      )
  LOOP
    PERFORM public.send_certification_email(
      v_cert.user_id,
      'certificate_now_available',
      jsonb_build_object(
        'certification_type', v_cert.certification_type::text,
        'certificate_url', 'https://portal.bda-global.org/my-certifications'
      )
    );

    INSERT INTO public.certificate_availability_notifications (
      certification_id,
      notification_type
    ) VALUES (
      v_cert.id,
      'available_now'
    ) ON CONFLICT (certification_id, notification_type) DO NOTHING;
  END LOOP;
END;
$$;

-- Keep one deterministic daily check. Replacing the existing job avoids
-- duplicate runs while retaining the established 08:00 UTC operating time.
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'check-certificate-availability-reminder';

  PERFORM cron.schedule(
    'check-certificate-availability-reminder',
    '0 8 * * *',
    'SELECT public.check_certificate_availability_reminder();'
  );
END;
$$;

COMMENT ON FUNCTION public.check_certificate_availability_reminder()
IS 'Queues one BDA-only email when a certificate becomes downloadable; no availability date is disclosed.';
