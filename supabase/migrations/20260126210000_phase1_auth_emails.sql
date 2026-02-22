-- Migration: Phase 1 - Account & Authentication Emails
-- Date: 2026-01-26
-- Description: Complete Phase 1 of email system with account activation and password change notifications

-- ============================================================================
-- 1. Add new email templates
-- ============================================================================

-- Account Activated (email verified)
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'account_activated',
    'Account Activated',
    'authentication',
    'Your BDA Account is Now Active',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f4f4f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 30px 40px; text-align: center; border-bottom: 3px solid #2563eb;">
                            <img src="https://portal.bda-global.org/bda-logo.png" alt="BDA Logo" style="height: 60px; width: auto;">
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h1 style="color: #1e3a5f; font-size: 24px; margin: 0 0 20px 0;">Account Activated!</h1>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{user_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Great news! Your email has been verified and your BDA Portal account is now fully activated.
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                You now have full access to all portal features including:
                            </p>
                            <ul style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 30px 20px; padding: 0;">
                                <li>Certification exam registration</li>
                                <li>Learning materials and curriculum</li>
                                <li>Mock exams and practice tests</li>
                                <li>Professional Development Credits (PDCs)</li>
                            </ul>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="https://portal.bda-global.org/dashboard" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">Go to Dashboard</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                                        <p style="margin: 0 0 10px 0;"><strong>Business Data Analytics Association</strong></p>
                                        <p style="margin: 0 0 5px 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:support@bda-global.org" style="color: #2563eb; text-decoration: none;">Support</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    '["user_name"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    updated_at = NOW();

-- Password Changed notification
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'password_changed',
    'Password Changed',
    'authentication',
    'Your BDA Password Has Been Changed',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f4f4f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 30px 40px; text-align: center; border-bottom: 3px solid #2563eb;">
                            <img src="https://portal.bda-global.org/bda-logo.png" alt="BDA Logo" style="height: 60px; width: auto;">
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h1 style="color: #1e3a5f; font-size: 24px; margin: 0 0 20px 0;">Password Changed</h1>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{user_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Your BDA Portal password was successfully changed on <strong>{{changed_at}}</strong>.
                            </p>
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                                <p style="color: #92400e; font-size: 14px; margin: 0;">
                                    <strong>Security Notice:</strong> If you did not make this change, please reset your password immediately and contact support.
                                </p>
                            </div>
                            <!-- CTA Buttons -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="https://portal.bda-global.org/forgot-password" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-right: 10px;">Reset Password</a>
                                        <a href="mailto:support@bda-global.org" style="display: inline-block; background: #6b7280; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 14px;">Contact Support</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                                If you made this change, no further action is needed.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                                        <p style="margin: 0 0 10px 0;"><strong>Business Data Analytics Association</strong></p>
                                        <p style="margin: 0 0 5px 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:support@bda-global.org" style="color: #2563eb; text-decoration: none;">Support</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    '["user_name", "changed_at"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    updated_at = NOW();

-- ============================================================================
-- 2. Create function to send account activation email
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_account_activated_email(
    p_user_id UUID,
    p_email TEXT,
    p_first_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_edge_url TEXT;
    v_anon_key TEXT;
    v_request_id BIGINT;
    v_user_name TEXT;
BEGIN
    -- Get Edge Function configuration
    SELECT value INTO v_edge_url FROM public.system_config WHERE key = 'edge_function_base_url';
    SELECT value INTO v_anon_key FROM public.system_config WHERE key = 'supabase_anon_key';

    -- Only proceed if configuration is set
    IF v_edge_url IS NULL OR v_edge_url = '' THEN
        RAISE WARNING '[Account Activated Email] Edge Function URL not configured - skipping email';
        RETURN;
    END IF;

    IF v_anon_key IS NULL OR v_anon_key = '' THEN
        RAISE WARNING '[Account Activated Email] Supabase anon key not configured - skipping email';
        RETURN;
    END IF;

    -- Determine user name
    v_user_name := COALESCE(NULLIF(p_first_name, ''), SPLIT_PART(p_email, '@', 1));

    -- Call the send-email Edge Function asynchronously via pg_net
    BEGIN
        SELECT net.http_post(
            url := v_edge_url || '/send-email',
            body := jsonb_build_object(
                'type', 'account_activated',
                'to', p_email,
                'user_id', p_user_id::TEXT,
                'data', jsonb_build_object(
                    'user_name', v_user_name
                )
            )::jsonb,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_anon_key,
                'apikey', v_anon_key
            )::jsonb
        ) INTO v_request_id;

        RAISE NOTICE '[Account Activated Email] Sent to %, request_id: %', p_email, v_request_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[Account Activated Email] Failed to send: %', SQLERRM;
    END;
END;
$$;

-- ============================================================================
-- 3. Create function to send password changed email
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_password_changed_email(
    p_user_id UUID,
    p_email TEXT,
    p_first_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_edge_url TEXT;
    v_anon_key TEXT;
    v_request_id BIGINT;
    v_user_name TEXT;
    v_changed_at TEXT;
BEGIN
    -- Get Edge Function configuration
    SELECT value INTO v_edge_url FROM public.system_config WHERE key = 'edge_function_base_url';
    SELECT value INTO v_anon_key FROM public.system_config WHERE key = 'supabase_anon_key';

    -- Only proceed if configuration is set
    IF v_edge_url IS NULL OR v_edge_url = '' THEN
        RAISE WARNING '[Password Changed Email] Edge Function URL not configured - skipping email';
        RETURN;
    END IF;

    IF v_anon_key IS NULL OR v_anon_key = '' THEN
        RAISE WARNING '[Password Changed Email] Supabase anon key not configured - skipping email';
        RETURN;
    END IF;

    -- Determine user name and format timestamp
    v_user_name := COALESCE(NULLIF(p_first_name, ''), SPLIT_PART(p_email, '@', 1));
    v_changed_at := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'Mon DD, YYYY at HH24:MI UTC');

    -- Call the send-email Edge Function asynchronously via pg_net
    BEGIN
        SELECT net.http_post(
            url := v_edge_url || '/send-email',
            body := jsonb_build_object(
                'type', 'password_changed',
                'to', p_email,
                'user_id', p_user_id::TEXT,
                'data', jsonb_build_object(
                    'user_name', v_user_name,
                    'changed_at', v_changed_at
                )
            )::jsonb,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_anon_key,
                'apikey', v_anon_key
            )::jsonb
        ) INTO v_request_id;

        RAISE NOTICE '[Password Changed Email] Sent to %, request_id: %', p_email, v_request_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[Password Changed Email] Failed to send: %', SQLERRM;
    END;
END;
$$;

-- ============================================================================
-- 4. Create trigger for email confirmation (account activation)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_first_name TEXT;
BEGIN
    -- Only trigger when email_confirmed_at changes from NULL to a value
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        -- Get first name from user metadata or public.users
        v_first_name := COALESCE(
            NEW.raw_user_meta_data->>'first_name',
            NEW.raw_user_meta_data->>'firstName',
            (SELECT first_name FROM public.users WHERE id = NEW.id)
        );

        -- Send account activated email
        PERFORM public.send_account_activated_email(NEW.id, NEW.email, v_first_name);
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to send account activated email: % - %', SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$$;

-- Create trigger on auth.users for email confirmation
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;
CREATE TRIGGER on_email_confirmed
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_email_confirmed();

-- ============================================================================
-- 5. Create trigger for password changes
-- Note: Supabase stores encrypted_password, we detect changes to this field
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_password_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_first_name TEXT;
BEGIN
    -- Only trigger when encrypted_password changes and it's not a new user
    -- Also check that email is confirmed (to avoid sending during signup flow)
    IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password
       AND OLD.created_at = NEW.created_at  -- Not a new user
       AND NEW.email_confirmed_at IS NOT NULL  -- Email is confirmed
    THEN
        -- Get first name from user metadata or public.users
        v_first_name := COALESCE(
            NEW.raw_user_meta_data->>'first_name',
            NEW.raw_user_meta_data->>'firstName',
            (SELECT first_name FROM public.users WHERE id = NEW.id)
        );

        -- Send password changed email
        PERFORM public.send_password_changed_email(NEW.id, NEW.email, v_first_name);
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to send password changed email: % - %', SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$$;

-- Create trigger on auth.users for password changes
DROP TRIGGER IF EXISTS on_password_changed ON auth.users;
CREATE TRIGGER on_password_changed
    AFTER UPDATE OF encrypted_password ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_password_changed();

-- ============================================================================
-- 6. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.send_account_activated_email(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_password_changed_email(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_email_confirmed() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_password_changed() TO service_role;

-- ============================================================================
-- 7. Success Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Phase 1 Authentication Emails completed';
    RAISE NOTICE '';
    RAISE NOTICE 'New templates created:';
    RAISE NOTICE '  - account_activated: Sent when email is verified';
    RAISE NOTICE '  - password_changed: Sent when password is changed';
    RAISE NOTICE '';
    RAISE NOTICE 'New triggers created:';
    RAISE NOTICE '  - on_email_confirmed: Fires when email_confirmed_at is set';
    RAISE NOTICE '  - on_password_changed: Fires when encrypted_password changes';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: password_reset and email_verification templates';
    RAISE NOTICE 'should be configured in Supabase Dashboard > Authentication > Email Templates';
END $$;
