-- Migration: Phase 2 - Membership Emails
-- Date: 2026-01-26
-- Description: Membership email notifications (activated, expiring, expired, renewed)

-- ============================================================================
-- 1. Add email templates for membership notifications
-- ============================================================================

-- Membership Activated
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'membership_activated',
    'Membership Activated',
    'membership',
    'Welcome to BDA {{membership_type}} Membership!',
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
                            <h1 style="color: #1e3a5f; font-size: 24px; margin: 0 0 20px 0;">🎉 Welcome to BDA {{membership_type}} Membership!</h1>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{user_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Congratulations! Your BDA <strong>{{membership_type}}</strong> membership is now active.
                            </p>
                            <!-- Membership Card -->
                            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); border-radius: 12px; padding: 25px; margin: 25px 0; color: #ffffff;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">Membership ID</p>
                                <p style="margin: 0 0 15px 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">{{membership_id}}</p>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td width="50%">
                                            <p style="margin: 0; font-size: 12px; opacity: 0.9;">Start Date</p>
                                            <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600;">{{start_date}}</p>
                                        </td>
                                        <td width="50%">
                                            <p style="margin: 0; font-size: 12px; opacity: 0.9;">Valid Until</p>
                                            <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600;">{{expiry_date}}</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                You now have access to all {{membership_type}} membership benefits. Visit your dashboard to explore your benefits.
                            </p>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="https://portal.bda-global.org/membership" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">View My Membership</a>
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
    '["user_name", "membership_type", "membership_id", "start_date", "expiry_date"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- Membership Renewed
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'membership_renewed',
    'Membership Renewed',
    'membership',
    'Your BDA Membership Has Been Renewed!',
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
                            <h1 style="color: #1e3a5f; font-size: 24px; margin: 0 0 20px 0;">🔄 Membership Renewed!</h1>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{user_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Thank you for renewing your BDA <strong>{{membership_type}}</strong> membership! Your continued support helps us grow the Business Analytics community.
                            </p>
                            <!-- Membership Card -->
                            <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 25px; margin: 25px 0; color: #ffffff;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">Membership ID</p>
                                <p style="margin: 0 0 15px 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">{{membership_id}}</p>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td width="50%">
                                            <p style="margin: 0; font-size: 12px; opacity: 0.9;">New Expiry Date</p>
                                            <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600;">{{expiry_date}}</p>
                                        </td>
                                        <td width="50%">
                                            <p style="margin: 0; font-size: 12px; opacity: 0.9;">Renewal #</p>
                                            <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600;">{{renewal_count}}</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                Your membership benefits continue uninterrupted. Keep making the most of your BDA membership!
                            </p>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="https://portal.bda-global.org/membership" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">View My Membership</a>
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
    '["user_name", "membership_type", "membership_id", "expiry_date", "renewal_count"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- Membership Expiring Soon (30 days warning)
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'membership_expiring_soon',
    'Membership Expiring Soon',
    'membership',
    'Your BDA Membership Expires in {{days_remaining}} Days',
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
                        <td style="background-color: #ffffff; padding: 30px 40px; text-align: center; border-bottom: 3px solid #f59e0b;">
                            <img src="https://portal.bda-global.org/bda-logo.png" alt="BDA Logo" style="height: 60px; width: auto;">
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h1 style="color: #1e3a5f; font-size: 24px; margin: 0 0 20px 0;">⏰ Your Membership Expires Soon</h1>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{user_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Your BDA <strong>{{membership_type}}</strong> membership will expire in <strong>{{days_remaining}} days</strong> on {{expiry_date}}.
                            </p>
                            <!-- Warning Box -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                                <p style="color: #92400e; font-size: 16px; margin: 0; font-weight: 600;">
                                    Don''t lose your benefits!
                                </p>
                                <p style="color: #92400e; font-size: 14px; margin: 10px 0 0 0;">
                                    Renew now to keep access to BDA BoCK®, certification discounts, and all your membership perks.
                                </p>
                            </div>
                            <!-- Membership Info -->
                            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td width="50%">
                                            <p style="margin: 0; font-size: 12px; color: #6b7280;">Membership ID</p>
                                            <p style="margin: 5px 0 0 0; font-size: 14px; color: #1e3a5f; font-weight: 600;">{{membership_id}}</p>
                                        </td>
                                        <td width="50%">
                                            <p style="margin: 0; font-size: 12px; color: #6b7280;">Expiry Date</p>
                                            <p style="margin: 5px 0 0 0; font-size: 14px; color: #dc2626; font-weight: 600;">{{expiry_date}}</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="https://bda-global.org/membership" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">Renew My Membership</a>
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
    '["user_name", "membership_type", "membership_id", "expiry_date", "days_remaining"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- Membership Expired
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'membership_expired',
    'Membership Expired',
    'membership',
    'Your BDA Membership Has Expired',
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
                        <td style="background-color: #ffffff; padding: 30px 40px; text-align: center; border-bottom: 3px solid #dc2626;">
                            <img src="https://portal.bda-global.org/bda-logo.png" alt="BDA Logo" style="height: 60px; width: auto;">
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h1 style="color: #1e3a5f; font-size: 24px; margin: 0 0 20px 0;">Your Membership Has Expired</h1>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{user_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Your BDA <strong>{{membership_type}}</strong> membership expired on {{expiry_date}}.
                            </p>
                            <!-- Expired Notice -->
                            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                                <p style="color: #991b1b; font-size: 16px; margin: 0; font-weight: 600;">
                                    Your benefits have been paused
                                </p>
                                <p style="color: #991b1b; font-size: 14px; margin: 10px 0 0 0;">
                                    You no longer have access to BDA BoCK®, certification discounts, and other membership benefits.
                                </p>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                We''d love to have you back! Renew your membership today to regain access to all benefits and continue your professional development journey.
                            </p>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="https://bda-global.org/membership" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">Renew Membership</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                                Questions? Contact us at <a href="mailto:support@bda-global.org" style="color: #2563eb;">support@bda-global.org</a>
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
    '["user_name", "membership_type", "membership_id", "expiry_date"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- ============================================================================
-- 2. Create email sending functions for memberships
-- ============================================================================

-- Function to send membership email
CREATE OR REPLACE FUNCTION public.send_membership_email(
    p_email_type TEXT,
    p_user_id UUID,
    p_membership_id UUID
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
    v_user RECORD;
    v_membership RECORD;
    v_user_name TEXT;
    v_days_remaining INTEGER;
BEGIN
    -- Get Edge Function configuration
    SELECT value INTO v_edge_url FROM public.system_config WHERE key = 'edge_function_base_url';
    SELECT value INTO v_anon_key FROM public.system_config WHERE key = 'supabase_anon_key';

    IF v_edge_url IS NULL OR v_anon_key IS NULL THEN
        RAISE WARNING '[Membership Email] Configuration not set - skipping email';
        RETURN;
    END IF;

    -- Get user info
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
    IF v_user IS NULL THEN
        RAISE WARNING '[Membership Email] User not found: %', p_user_id;
        RETURN;
    END IF;

    -- Get membership info
    SELECT * INTO v_membership FROM public.user_memberships WHERE id = p_membership_id;
    IF v_membership IS NULL THEN
        RAISE WARNING '[Membership Email] Membership not found: %', p_membership_id;
        RETURN;
    END IF;

    -- Calculate days remaining
    v_days_remaining := GREATEST((v_membership.expiry_date - CURRENT_DATE)::INTEGER, 0);
    v_user_name := COALESCE(v_user.first_name, SPLIT_PART(v_user.email, '@', 1));

    -- Send email via Edge Function
    BEGIN
        SELECT net.http_post(
            url := v_edge_url || '/send-email',
            body := jsonb_build_object(
                'type', p_email_type,
                'to', v_user.email,
                'user_id', p_user_id::TEXT,
                'data', jsonb_build_object(
                    'user_name', v_user_name,
                    'membership_type', INITCAP(v_membership.membership_type::TEXT),
                    'membership_id', v_membership.membership_id,
                    'start_date', TO_CHAR(v_membership.start_date, 'Mon DD, YYYY'),
                    'expiry_date', TO_CHAR(v_membership.expiry_date, 'Mon DD, YYYY'),
                    'days_remaining', v_days_remaining::TEXT,
                    'renewal_count', v_membership.renewal_count::TEXT
                )
            )::jsonb,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_anon_key,
                'apikey', v_anon_key
            )::jsonb
        ) INTO v_request_id;

        RAISE NOTICE '[Membership Email] % sent to %, request_id: %', p_email_type, v_user.email, v_request_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[Membership Email] Failed to send %: %', p_email_type, SQLERRM;
    END;
END;
$$;

-- ============================================================================
-- 3. Create trigger for membership activation/renewal
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_membership_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- New membership activated
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        PERFORM public.send_membership_email('membership_activated', NEW.user_id, NEW.id);
        RETURN NEW;
    END IF;

    -- Membership renewed (renewal_count increased)
    IF TG_OP = 'UPDATE' AND NEW.renewal_count > OLD.renewal_count THEN
        PERFORM public.send_membership_email('membership_renewed', NEW.user_id, NEW.id);
        RETURN NEW;
    END IF;

    -- Membership expired
    IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'expired' THEN
        PERFORM public.send_membership_email('membership_expired', NEW.user_id, NEW.id);
        RETURN NEW;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '[handle_membership_change] Error: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_membership_change ON public.user_memberships;
CREATE TRIGGER on_membership_change
    AFTER INSERT OR UPDATE ON public.user_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_membership_change();

-- ============================================================================
-- 4. Create table to track sent expiry notifications (prevent duplicates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.membership_expiry_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES public.user_memberships(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- 'expiring_30d', 'expiring_7d', 'expired'
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(membership_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_membership_expiry_notifications_membership
    ON public.membership_expiry_notifications(membership_id);

-- ============================================================================
-- 5. Create function for daily membership expiry check
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_membership_expiry_and_notify()
RETURNS TABLE(
    memberships_expiring_30d INTEGER,
    memberships_expiring_7d INTEGER,
    memberships_expired INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count_30d INTEGER := 0;
    v_count_7d INTEGER := 0;
    v_count_expired INTEGER := 0;
    r RECORD;
BEGIN
    -- Send 30-day expiry warnings
    FOR r IN
        SELECT um.id, um.user_id
        FROM public.user_memberships um
        WHERE um.status = 'active'
        AND um.expiry_date = CURRENT_DATE + INTERVAL '30 days'
        AND NOT EXISTS (
            SELECT 1 FROM public.membership_expiry_notifications men
            WHERE men.membership_id = um.id AND men.notification_type = 'expiring_30d'
        )
    LOOP
        PERFORM public.send_membership_email('membership_expiring_soon', r.user_id, r.id);
        INSERT INTO public.membership_expiry_notifications (membership_id, notification_type)
        VALUES (r.id, 'expiring_30d');
        v_count_30d := v_count_30d + 1;
    END LOOP;

    -- Send 7-day expiry warnings
    FOR r IN
        SELECT um.id, um.user_id
        FROM public.user_memberships um
        WHERE um.status = 'active'
        AND um.expiry_date = CURRENT_DATE + INTERVAL '7 days'
        AND NOT EXISTS (
            SELECT 1 FROM public.membership_expiry_notifications men
            WHERE men.membership_id = um.id AND men.notification_type = 'expiring_7d'
        )
    LOOP
        PERFORM public.send_membership_email('membership_expiring_soon', r.user_id, r.id);
        INSERT INTO public.membership_expiry_notifications (membership_id, notification_type)
        VALUES (r.id, 'expiring_7d');
        v_count_7d := v_count_7d + 1;
    END LOOP;

    -- Expire memberships and send expired emails
    FOR r IN
        SELECT um.id, um.user_id
        FROM public.user_memberships um
        WHERE um.status = 'active'
        AND um.expiry_date < CURRENT_DATE
        AND NOT EXISTS (
            SELECT 1 FROM public.membership_expiry_notifications men
            WHERE men.membership_id = um.id AND men.notification_type = 'expired'
        )
    LOOP
        -- Update status to expired
        UPDATE public.user_memberships SET status = 'expired', updated_at = NOW() WHERE id = r.id;

        -- Send expired email
        PERFORM public.send_membership_email('membership_expired', r.user_id, r.id);

        -- Record notification
        INSERT INTO public.membership_expiry_notifications (membership_id, notification_type)
        VALUES (r.id, 'expired');

        v_count_expired := v_count_expired + 1;
    END LOOP;

    RETURN QUERY SELECT v_count_30d, v_count_7d, v_count_expired;
END;
$$;

-- ============================================================================
-- 6. Create pg_cron job for daily membership check (8 AM UTC)
-- ============================================================================

-- Note: pg_cron must be enabled in the Supabase Dashboard
-- Go to Database > Extensions > Enable pg_cron

DO $$
BEGIN
    -- Try to schedule the cron job (will fail silently if pg_cron not available)
    BEGIN
        PERFORM cron.schedule(
            'check-membership-expiry',
            '0 8 * * *',  -- Run daily at 8 AM UTC
            'SELECT public.check_membership_expiry_and_notify()'
        );
        RAISE NOTICE 'pg_cron job scheduled: check-membership-expiry at 8 AM UTC daily';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron not available or already scheduled. Manual execution: SELECT public.check_membership_expiry_and_notify();';
    END;
END $$;

-- ============================================================================
-- 7. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.send_membership_email(TEXT, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_membership_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_membership_expiry_and_notify() TO service_role;

-- RLS for membership_expiry_notifications
ALTER TABLE public.membership_expiry_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage expiry notifications"
    ON public.membership_expiry_notifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 8. Success Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Phase 2 Membership Emails completed';
    RAISE NOTICE '';
    RAISE NOTICE 'Templates created:';
    RAISE NOTICE '  - membership_activated: New membership activation';
    RAISE NOTICE '  - membership_renewed: Membership renewal';
    RAISE NOTICE '  - membership_expiring_soon: 30/7 day warning';
    RAISE NOTICE '  - membership_expired: Membership expiration';
    RAISE NOTICE '';
    RAISE NOTICE 'Triggers:';
    RAISE NOTICE '  - on_membership_change: Fires on INSERT/UPDATE of user_memberships';
    RAISE NOTICE '';
    RAISE NOTICE 'Daily job:';
    RAISE NOTICE '  - check_membership_expiry_and_notify(): Runs at 8 AM UTC';
    RAISE NOTICE '  - Sends 30-day and 7-day expiry warnings';
    RAISE NOTICE '  - Auto-expires memberships and sends notification';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: Enable pg_cron extension in Supabase Dashboard for automated daily checks';
END $$;
