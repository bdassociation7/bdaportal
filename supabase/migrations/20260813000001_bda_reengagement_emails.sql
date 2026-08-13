-- BDA re-engagement emails
-- Sends a maximum of three professionally branded messages per inactivity cycle:
-- 14 days, 28 days and 45 days after a user's most recent login.

CREATE TABLE IF NOT EXISTS public.user_reengagement_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  inactivity_stage_days SMALLINT NOT NULL CHECK (inactivity_stage_days IN (14, 28, 45)),
  activity_anchor TIMESTAMPTZ NOT NULL,
  email_queue_id UUID REFERENCES public.email_queue(id) ON DELETE SET NULL,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, inactivity_stage_days, activity_anchor)
);

CREATE INDEX IF NOT EXISTS idx_user_reengagement_emails_user_anchor
  ON public.user_reengagement_emails (user_id, activity_anchor DESC);

ALTER TABLE public.user_reengagement_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage reengagement email log" ON public.user_reengagement_emails;
CREATE POLICY "Admins can manage reengagement email log"
  ON public.user_reengagement_emails
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users admin_user
      WHERE admin_user.id = auth.uid()
        AND admin_user.role::text IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users admin_user
      WHERE admin_user.id = auth.uid()
        AND admin_user.role::text IN ('admin', 'super_admin')
    )
  );

CREATE OR REPLACE FUNCTION public.queue_bda_reengagement_emails(p_dry_run BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_eligible_count INTEGER := 0;
  v_queued_count INTEGER := 0;
BEGIN
  -- Prevent concurrent invocations from queuing the same stage more than once.
  PERFORM pg_advisory_xact_lock(hashtext('bda_reengagement_email_queue'));

  CREATE TEMP TABLE reengagement_candidates ON COMMIT DROP AS
  SELECT
    u.id AS user_id,
    u.email,
    COALESCE(NULLIF(btrim(u.first_name), ''), 'there') AS first_name,
    COALESCE(u.last_login_at, u.created_at) AS activity_anchor,
    CASE
      WHEN COALESCE(u.last_login_at, u.created_at) <= now() - interval '45 days' THEN 45
      WHEN COALESCE(u.last_login_at, u.created_at) <= now() - interval '28 days' THEN 28
      WHEN COALESCE(u.last_login_at, u.created_at) <= now() - interval '14 days' THEN 14
      ELSE NULL
    END::SMALLINT AS inactivity_stage_days
  FROM public.users u
  WHERE COALESCE(u.is_active, true) = true
    AND COALESCE(u.notifications_enabled, true) = true
    AND NULLIF(btrim(u.email), '') IS NOT NULL
    AND u.role::text NOT IN ('admin', 'super_admin')
    AND COALESCE(u.last_login_at, u.created_at) <= now() - interval '14 days';

  DELETE FROM reengagement_candidates WHERE inactivity_stage_days IS NULL;

  DELETE FROM reengagement_candidates candidate
  USING public.user_reengagement_emails prior
  WHERE prior.user_id = candidate.user_id
    AND prior.inactivity_stage_days = candidate.inactivity_stage_days
    AND prior.activity_anchor = candidate.activity_anchor;

  SELECT count(*) INTO v_eligible_count FROM reengagement_candidates;

  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'dry_run', true,
      'eligible_count', v_eligible_count,
      'stage_counts', COALESCE((SELECT jsonb_object_agg(inactivity_stage_days, stage_count)
        FROM (SELECT inactivity_stage_days, count(*) AS stage_count FROM reengagement_candidates GROUP BY inactivity_stage_days) counts), '{}'::jsonb)
    );
  END IF;

  WITH queued AS (
    INSERT INTO public.email_queue (
      recipient_email,
      recipient_name,
      subject,
      template_name,
      template_data,
      priority,
      scheduled_for,
      related_entity_type,
      related_entity_id,
      metadata
    )
    SELECT
      candidate.email,
      candidate.first_name,
      CASE candidate.inactivity_stage_days
        WHEN 14 THEN 'Your professional development journey is waiting'
        WHEN 28 THEN 'Keep building your business development capability'
        ELSE 'Your BDA account is ready when you are'
      END,
      'bda_reengagement_' || candidate.inactivity_stage_days,
      jsonb_build_object(
        'html_body', CASE candidate.inactivity_stage_days
          WHEN 14 THEN format($email$
<!doctype html><html lang="en"><body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#34435f;"><table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f6fb;padding:36px 16px;"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%%;max-width:640px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(13,31,78,.10);"><tr><td style="height:8px;background:linear-gradient(90deg,#0f91e0,#0d1f4e);"></td></tr><tr><td align="center" style="padding:34px 40px 20px;"><img src="https://portal.bda-global.org/bda-email-logo.png" alt="Business Development Association (BDA)" width="190" style="display:block;border:0;" /></td></tr><tr><td style="padding:10px 52px 8px;"><h1 style="margin:0 0 18px;font-size:27px;line-height:1.3;color:#0d1f4e;">Your professional development journey is waiting</h1><p style="margin:0 0 18px;font-size:16px;line-height:1.7;">Dear %s,</p><p style="margin:0 0 18px;font-size:16px;line-height:1.7;">We have missed you at <strong>Business Development Association (BDA)</strong>.</p><p style="margin:0 0 18px;font-size:16px;line-height:1.7;">Your professional development journey is ready whenever you are. You can continue exploring your learning resources, revisit your progress, practise with assessment tools, and make the most of the benefits available through your BDA account.</p><p style="margin:0 0 28px;font-size:16px;line-height:1.7;">A few focused minutes can help you keep your development moving forward.</p></td></tr><tr><td align="center" style="padding:4px 52px 36px;"><a href="https://portal.bda-global.org/dashboard" style="display:inline-block;background:linear-gradient(135deg,#0f91e0,#0d1f4e);color:#fff;text-decoration:none;border-radius:8px;padding:14px 24px;font-size:15px;font-weight:700;">Continue your development</a></td></tr><tr><td style="background:#f0f6ff;border-top:1px solid #e2eaf6;padding:24px 40px;text-align:center;"><p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#5c6980;">Need support? Visit the BDA Help Center or contact the BDA support team.</p><p style="margin:0;font-size:12px;color:#7b879b;">© Business Development Association (BDA). All rights reserved.</p></td></tr></table></td></tr></table></body></html>$email$, candidate.first_name)
          WHEN 28 THEN format($email$
<!doctype html><html lang="en"><body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#34435f;"><table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f6fb;padding:36px 16px;"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%%;max-width:640px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(13,31,78,.10);"><tr><td style="height:8px;background:linear-gradient(90deg,#0d1f4e,#0f91e0);"></td></tr><tr><td align="center" style="padding:34px 40px 20px;"><img src="https://portal.bda-global.org/bda-email-logo.png" alt="Business Development Association (BDA)" width="190" style="display:block;border:0;" /></td></tr><tr><td style="padding:10px 52px 8px;"><h1 style="margin:0 0 18px;font-size:27px;line-height:1.3;color:#0d1f4e;">Keep building your business development capability</h1><p style="margin:0 0 18px;font-size:16px;line-height:1.7;">Dear %s,</p><p style="margin:0 0 18px;font-size:16px;line-height:1.7;">Professional development is most valuable when it becomes consistent.</p><p style="margin:0 0 18px;font-size:16px;line-height:1.7;">Return to Business Development Association (BDA) to continue your learning, strengthen key business development competencies, and use the resources available in your account.</p><p style="margin:0 0 28px;font-size:16px;line-height:1.7;">Whether you have a short session or more time to dedicate, your next step is ready.</p></td></tr><tr><td align="center" style="padding:4px 52px 36px;"><a href="https://portal.bda-global.org/dashboard" style="display:inline-block;background:#0d1f4e;color:#fff;text-decoration:none;border-radius:8px;padding:14px 24px;font-size:15px;font-weight:700;">Resume your development</a></td></tr><tr><td style="background:#f0f6ff;border-top:1px solid #e2eaf6;padding:24px 40px;text-align:center;"><p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#5c6980;">Need support? Visit the BDA Help Center or contact the BDA support team.</p><p style="margin:0;font-size:12px;color:#7b879b;">© Business Development Association (BDA). All rights reserved.</p></td></tr></table></td></tr></table></body></html>$email$, candidate.first_name)
          ELSE format($email$
<!doctype html><html lang="en"><body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#34435f;"><table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f6fb;padding:36px 16px;"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%%;max-width:640px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(13,31,78,.10);"><tr><td style="height:8px;background:linear-gradient(90deg,#0f91e0,#0d1f4e);"></td></tr><tr><td align="center" style="padding:34px 40px 20px;"><img src="https://portal.bda-global.org/bda-email-logo.png" alt="Business Development Association (BDA)" width="190" style="display:block;border:0;" /></td></tr><tr><td style="padding:10px 52px 8px;"><h1 style="margin:0 0 18px;font-size:27px;line-height:1.3;color:#0d1f4e;">Your BDA account is ready when you are</h1><p style="margin:0 0 18px;font-size:16px;line-height:1.7;">Dear %s,</p><p style="margin:0 0 18px;font-size:16px;line-height:1.7;">We would be pleased to welcome you back.</p><p style="margin:0 0 18px;font-size:16px;line-height:1.7;">Your Business Development Association (BDA) account gives you a single place to continue learning, review your professional resources, and stay connected with your development journey.</p><p style="margin:0 0 28px;font-size:16px;line-height:1.7;">Take the next step when it suits you — your account and learning resources are ready.</p></td></tr><tr><td align="center" style="padding:4px 52px 36px;"><a href="https://portal.bda-global.org/dashboard" style="display:inline-block;background:linear-gradient(135deg,#0f91e0,#0d1f4e);color:#fff;text-decoration:none;border-radius:8px;padding:14px 24px;font-size:15px;font-weight:700;">Access your BDA account</a></td></tr><tr><td style="background:#f0f6ff;border-top:1px solid #e2eaf6;padding:24px 40px;text-align:center;"><p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#5c6980;">Need support? Visit the BDA Help Center or contact the BDA support team.</p><p style="margin:0;font-size:12px;color:#7b879b;">© Business Development Association (BDA). All rights reserved.</p></td></tr></table></td></tr></table></body></html>$email$, candidate.first_name)
        END,
        'text_body', CASE candidate.inactivity_stage_days
          WHEN 14 THEN format('Dear %s,\n\nWe have missed you at Business Development Association (BDA). Your professional development journey is ready whenever you are.\n\nContinue your development: https://portal.bda-global.org/dashboard', candidate.first_name)
          WHEN 28 THEN format('Dear %s,\n\nProfessional development is most valuable when it becomes consistent. Resume your development with Business Development Association (BDA).\n\nResume your development: https://portal.bda-global.org/dashboard', candidate.first_name)
          ELSE format('Dear %s,\n\nYour Business Development Association (BDA) account is ready when you are. Reconnect with your learning and professional resources.\n\nAccess your BDA account: https://portal.bda-global.org/dashboard', candidate.first_name)
        END
      ),
      5,
      now(),
      'user_reengagement',
      candidate.user_id,
      jsonb_build_object(
        'inactivity_stage_days', candidate.inactivity_stage_days,
        'activity_anchor', candidate.activity_anchor,
        'campaign', 'bda_reengagement'
      )
    FROM reengagement_candidates candidate
    RETURNING id, related_entity_id, metadata
  ), logged AS (
    INSERT INTO public.user_reengagement_emails (
      user_id,
      inactivity_stage_days,
      activity_anchor,
      email_queue_id
    )
    SELECT
      queue_item.related_entity_id,
      (queue_item.metadata->>'inactivity_stage_days')::SMALLINT,
      (queue_item.metadata->>'activity_anchor')::TIMESTAMPTZ,
      queue_item.id
    FROM queued queue_item
    ON CONFLICT (user_id, inactivity_stage_days, activity_anchor) DO NOTHING
    RETURNING id
  )
  SELECT count(*) INTO v_queued_count FROM logged;

  RETURN jsonb_build_object(
    'dry_run', false,
    'eligible_count', v_eligible_count,
    'queued_count', v_queued_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.queue_bda_reengagement_emails(BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_bda_reengagement_emails(BOOLEAN) TO service_role;

-- Daily at 08:30 in the project time zone (UTC+3 = 05:30 UTC).
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'bda_reengagement_email_check';

  PERFORM cron.schedule(
    'bda_reengagement_email_check',
    '30 5 * * *',
    'SELECT public.queue_bda_reengagement_emails(false);'
  );
END;
$$;

COMMENT ON TABLE public.user_reengagement_emails IS
  'Audit log for the 14, 28 and 45-day BDA user re-engagement email sequence.';
COMMENT ON FUNCTION public.queue_bda_reengagement_emails(BOOLEAN) IS
  'Queues BDA re-engagement emails once per inactivity stage and restarts the sequence when a user logs in again.';
