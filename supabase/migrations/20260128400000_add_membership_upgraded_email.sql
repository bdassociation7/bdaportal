-- ============================================================================
-- Migration: Add Membership Upgraded Email Template
-- Description: Distinguishes between membership upgrades (tier change) and
--              renewals (same tier extension)
-- ============================================================================

-- ============================================================================
-- 1. Add new email template for membership upgrades
-- ============================================================================

INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'membership_upgraded',
    'Membership Upgraded',
    'membership',
    'Congratulations! Your BDA Membership Has Been Upgraded!',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Membership Upgraded</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f4f4f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 30px 40px; text-align: center; border-bottom: 3px solid #7c3aed;">
                            <img src="https://portal.bda-global.org/bda-email-logo.png" alt="The Business Development Association (BDA)" style="height: 60px; width: auto;">
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h1 style="color: #1e3a5f; font-size: 24px; margin: 0 0 20px 0;">Membership Upgraded!</h1>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{user_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Congratulations on upgrading your BDA membership from <strong>{{previous_membership_type}}</strong> to <strong>{{membership_type}}</strong>! You now have access to enhanced benefits and exclusive resources.
                            </p>
                            <!-- Membership Card with purple/gold upgrade theme -->
                            <div style="background-color: #7c3aed; border-radius: 12px; padding: 25px; margin: 25px 0;">
                                <p style="margin: 0 0 5px 0; font-size: 12px; color: #e9d5ff;">UPGRADED TO</p>
                                <p style="margin: 0 0 15px 0; font-size: 22px; font-weight: bold; color: #ffffff;">{{membership_type}} Membership</p>
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #e9d5ff;">Membership ID</p>
                                <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; letter-spacing: 1px; color: #ffffff;">{{membership_id}}</p>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td width="50%">
                                            <p style="margin: 0; font-size: 12px; color: #e9d5ff;">Valid Until</p>
                                            <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600; color: #ffffff;">{{expiry_date}}</p>
                                        </td>
                                        <td width="50%">
                                            <p style="margin: 0; font-size: 12px; color: #e9d5ff;">Previous Tier</p>
                                            <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600; color: #ffffff;">{{previous_membership_type}}</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Professional Benefits Highlight -->
                            <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <h3 style="color: #7c3aed; font-size: 16px; margin: 0 0 15px 0;">Your New Professional Benefits Include:</h3>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                                            <span style="color: #7c3aed; margin-right: 8px;">&#10003;</span> Access to exclusive professional resources
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                                            <span style="color: #7c3aed; margin-right: 8px;">&#10003;</span> Priority support and networking opportunities
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                                            <span style="color: #7c3aed; margin-right: 8px;">&#10003;</span> Digital membership certificate
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                                            <span style="color: #7c3aed; margin-right: 8px;">&#10003;</span> Discounts on BDA certification exams
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                Thank you for your continued commitment to professional excellence. We are excited to support your growth!
                            </p>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="https://portal.bda-global.org/my-membership" style="display: inline-block; background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">View My Upgraded Membership</a>
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
                                        <p style="margin: 0 0 10px 0;"><strong>The Business Development Association (BDA)</strong></p>
                                        <p style="margin: 0 0 5px 0;">
                                            <a href="https://bda-global.org" style="color: #7c3aed; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #7c3aed; text-decoration: none;">Portal</a> |
                                            <a href="mailto:support@bda-global.org" style="color: #7c3aed; text-decoration: none;">Support</a>
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
    '["user_name", "membership_type", "previous_membership_type", "membership_id", "expiry_date"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    name = EXCLUDED.name,
    updated_at = NOW();


-- ============================================================================
-- 2. Update send_membership_email function to support previous_membership_type
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_membership_email(
    p_template_key TEXT,
    p_user_id UUID,
    p_membership_id UUID,
    p_previous_membership_type TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_membership RECORD;
    v_template RECORD;
    v_variables JSONB;
    v_days_remaining INTEGER;
BEGIN
    -- Get user details
    SELECT email,
           COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email) as full_name
    INTO v_user
    FROM auth.users
    WHERE id = p_user_id;

    IF v_user IS NULL THEN
        RAISE WARNING '[send_membership_email] User not found: %', p_user_id;
        RETURN;
    END IF;

    -- Get membership details
    SELECT * INTO v_membership
    FROM public.user_memberships
    WHERE id = p_membership_id;

    IF v_membership IS NULL THEN
        RAISE WARNING '[send_membership_email] Membership not found: %', p_membership_id;
        RETURN;
    END IF;

    -- Get email template
    SELECT * INTO v_template
    FROM public.email_templates
    WHERE template_key = p_template_key AND is_active = true;

    IF v_template IS NULL THEN
        RAISE WARNING '[send_membership_email] Template not found or inactive: %', p_template_key;
        RETURN;
    END IF;

    -- Calculate days remaining for expiry emails
    v_days_remaining := GREATEST(0, (v_membership.expiry_date - CURRENT_DATE));

    -- Build variables JSON
    v_variables := jsonb_build_object(
        'user_name', v_user.full_name,
        'membership_type', CASE
            WHEN v_membership.membership_type::text = 'professional' THEN 'Professional'
            ELSE 'Basic'
        END,
        'membership_id', v_membership.membership_id,
        'start_date', to_char(v_membership.start_date, 'Month DD, YYYY'),
        'expiry_date', to_char(v_membership.expiry_date, 'Month DD, YYYY'),
        'renewal_count', v_membership.renewal_count,
        'days_remaining', v_days_remaining
    );

    -- Add previous_membership_type for upgrade emails
    IF p_previous_membership_type IS NOT NULL THEN
        v_variables := v_variables || jsonb_build_object(
            'previous_membership_type', CASE
                WHEN p_previous_membership_type = 'professional' THEN 'Professional'
                ELSE 'Basic'
            END
        );
    END IF;

    -- Call the send-email edge function via HTTP
    PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-email',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
            'to', v_user.email,
            'template_key', p_template_key,
            'variables', v_variables
        )
    );

    RAISE NOTICE '[send_membership_email] Email queued: template=%, user=%, membership=%',
        p_template_key, p_user_id, p_membership_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '[send_membership_email] Error sending email: %', SQLERRM;
END;
$$;


-- ============================================================================
-- 3. Update handle_membership_change trigger to detect upgrades vs renewals
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

    -- Check for membership tier upgrade or renewal
    IF TG_OP = 'UPDATE' AND NEW.renewal_count > OLD.renewal_count THEN
        -- Upgrade: membership_type changed (e.g., basic -> professional)
        IF OLD.membership_type IS DISTINCT FROM NEW.membership_type THEN
            PERFORM public.send_membership_email(
                'membership_upgraded',
                NEW.user_id,
                NEW.id,
                OLD.membership_type::text  -- Pass previous membership type
            );
        -- Renewal: same membership type, just extended
        ELSE
            PERFORM public.send_membership_email('membership_renewed', NEW.user_id, NEW.id);
        END IF;
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


-- ============================================================================
-- 4. Update activate_membership to log 'upgraded' action when tier changes
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_membership(
    p_user_id UUID,
    p_membership_type membership_type,
    p_woocommerce_order_id INTEGER DEFAULT NULL,
    p_woocommerce_product_id INTEGER DEFAULT NULL,
    p_duration_months INTEGER DEFAULT 12,
    p_admin_user_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_membership_id UUID;
    v_membership_code TEXT;
    v_existing_membership RECORD;
    v_start_date DATE;
    v_expiry_date DATE;
    v_triggered_by TEXT;
    v_action TEXT;
BEGIN
    -- Determine trigger source
    v_triggered_by := CASE WHEN p_admin_user_id IS NOT NULL THEN 'admin' ELSE 'webhook' END;

    -- Check for existing active membership
    SELECT * INTO v_existing_membership
    FROM public.user_memberships
    WHERE user_id = p_user_id
    AND status = 'active'
    ORDER BY expiry_date DESC
    LIMIT 1;

    IF v_existing_membership.id IS NOT NULL THEN
        -- Extend existing membership
        v_start_date := v_existing_membership.start_date;
        v_expiry_date := v_existing_membership.expiry_date + (p_duration_months || ' months')::INTERVAL;

        -- Determine if this is an upgrade or renewal
        v_action := CASE
            WHEN v_existing_membership.membership_type::text != p_membership_type::text
            THEN 'upgraded'
            ELSE 'renewed'
        END;

        UPDATE public.user_memberships
        SET
            expiry_date = v_expiry_date,
            renewal_count = renewal_count + 1,
            last_renewed_at = NOW(),
            membership_type = CASE
                WHEN p_membership_type = 'professional' THEN 'professional'::membership_type
                ELSE membership_type
            END,
            woocommerce_order_id = COALESCE(p_woocommerce_order_id, woocommerce_order_id),
            updated_at = NOW()
        WHERE id = v_existing_membership.id
        RETURNING id INTO v_membership_id;

        -- Log renewal or upgrade with correct action
        INSERT INTO public.membership_activation_logs (
            membership_id, user_id, action, previous_status, new_status,
            previous_expiry_date, new_expiry_date, triggered_by, admin_user_id,
            woocommerce_order_id, notes
        ) VALUES (
            v_membership_id, p_user_id, v_action, 'active', 'active',
            v_existing_membership.expiry_date, v_expiry_date, v_triggered_by, p_admin_user_id,
            p_woocommerce_order_id,
            CASE
                WHEN v_action = 'upgraded'
                THEN COALESCE(p_notes, '') || ' [Upgraded from ' || v_existing_membership.membership_type::text || ' to ' || p_membership_type::text || ']'
                ELSE p_notes
            END
        );
    ELSE
        -- Create new membership
        v_membership_code := generate_membership_id();
        v_start_date := CURRENT_DATE;
        v_expiry_date := CURRENT_DATE + (p_duration_months || ' months')::INTERVAL;

        INSERT INTO public.user_memberships (
            user_id, membership_type, membership_id, start_date, expiry_date,
            status, woocommerce_order_id, woocommerce_product_id, activated_by, admin_notes
        ) VALUES (
            p_user_id, p_membership_type, v_membership_code, v_start_date, v_expiry_date,
            'active', p_woocommerce_order_id, p_woocommerce_product_id, p_admin_user_id, p_notes
        ) RETURNING id INTO v_membership_id;

        -- Log activation
        INSERT INTO public.membership_activation_logs (
            membership_id, user_id, action, new_status, new_expiry_date,
            triggered_by, admin_user_id, woocommerce_order_id, notes
        ) VALUES (
            v_membership_id, p_user_id, 'activated', 'active', v_expiry_date,
            v_triggered_by, p_admin_user_id, p_woocommerce_order_id, p_notes
        );
    END IF;

    RETURN v_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 5. Grant necessary permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.send_membership_email(TEXT, UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_membership_change() TO service_role;
