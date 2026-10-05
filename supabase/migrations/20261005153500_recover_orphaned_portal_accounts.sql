-- Recover historic Auth-only accounts safely and prevent a legacy source value
-- from leaving future WooCommerce accounts without a BDA portal profile.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_first_name text;
  v_created_from text;
BEGIN
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'firstName', '');
  v_created_from := CASE
    WHEN COALESCE(NEW.raw_user_meta_data->>'created_from', 'portal') = 'woocommerce'
      THEN 'woocommerce_webhook'
    ELSE COALESCE(NEW.raw_user_meta_data->>'created_from', 'portal')
  END;

  INSERT INTO public.users (
    id, email, first_name, last_name, role, wp_user_id,
    created_from, created_at, updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    v_first_name,
    COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'lastName', ''),
    COALESCE(
      (NEW.raw_user_meta_data->>'bda_role')::public.user_role,
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'individual'::public.user_role
    ),
    (NEW.raw_user_meta_data->>'wp_user_id')::integer,
    v_created_from,
    NEW.created_at,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
    role = COALESCE(EXCLUDED.role, public.users.role),
    wp_user_id = COALESCE(EXCLUDED.wp_user_id, public.users.wp_user_id),
    updated_at = now();

  IF v_created_from IN ('portal', 'signup') THEN
    PERFORM public.send_signup_welcome_email(NEW.id, NEW.email, v_first_name);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to sync user to public.users: % - %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

INSERT INTO public.email_templates (
  template_key, name, category, subject, html_body, text_body, variables, is_active
) VALUES (
  'account_access_restored',
  'Account Access Restored',
  'account',
  'Your BDA Portal access is ready',
  $html$
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f0f6ff;font-family:Arial,Helvetica,sans-serif;color:#182a4d;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f0f6ff;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(13,31,78,.12);">
          <tr><td style="padding:28px 32px;background:linear-gradient(135deg,#0d1f4e,#0f91e0);color:#ffffff;">
            <strong style="font-size:20px;">Business Development Association (BDA)</strong>
          </td></tr>
          <tr><td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:24px;color:#0d1f4e;">Your portal access is ready</h1>
            <p style="margin:0 0 16px;line-height:1.6;">Hello {{first_name}},</p>
            <p style="margin:0 0 24px;line-height:1.6;">We have completed an update to your BDA Portal account. You can now sign in using your existing email address and password.</p>
            <p style="margin:0 0 24px;"><a href="{{login_url}}" style="display:inline-block;background:#0f91e0;color:#ffffff;padding:13px 22px;border-radius:8px;text-decoration:none;font-weight:700;">Sign in to BDA Portal</a></p>
            <p style="margin:0;color:#5f6f8f;font-size:13px;line-height:1.6;">If you do not remember your password, use the Forgot Password option on the sign-in page.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
$html$,
  'Hello {{first_name}},\n\nYour BDA Portal access is ready. You can now sign in using your existing email address and password.\n\nSign in: {{login_url}}\n\nIf you do not remember your password, use the Forgot Password option on the sign-in page.\n\nThe Business Development Association (BDA)',
  '["first_name", "login_url"]'::jsonb,
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  updated_at = now();
