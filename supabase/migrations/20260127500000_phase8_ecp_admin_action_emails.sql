-- =============================================================================
-- Phase 8: ECP / Admin Action Email Templates & Triggers
-- Date: 2026-01-27
-- Description: Email notifications for ECP training batches and admin actions
-- =============================================================================
-- Templates:
--   1. trainee_batch_assigned    - Trainee added to training batch
--   2. admin_access_granted      - Admin granted access (generic)
--   3. admin_access_revoked      - Admin revoked access
-- =============================================================================

-- =============================================================================
-- EMAIL TEMPLATES
-- =============================================================================

-- 1. Trainee Added to Training Batch
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'trainee_batch_assigned',
    'Trainee Added to Training Batch',
    'ecp',
    'You Have Been Enrolled in Training Batch: {{batch_name}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Training Enrollment</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 30px; text-align: center;">
                            <img src="https://bfrqgmtwjfkzionlktpv.supabase.co/storage/v1/object/public/assets/bda-logo-white.png" alt="BDA" style="height: 50px; margin-bottom: 15px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Training Enrollment</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                You have been enrolled in a <strong>{{certification_type}}</strong> certification training program by <strong>{{partner_name}}</strong>.
                            </p>

                            <!-- Batch Card -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%); border-radius: 8px; padding: 25px; border-left: 4px solid #0891b2;">
                                        <p style="color: #0e7490; font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 0 0 8px;">Training Batch</p>
                                        <p style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 0 0 10px;">{{batch_name}}</p>
                                        <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                            Batch Code: <strong>{{batch_code}}</strong>
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Training Details -->
                            <table role="presentation" style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Certification Track:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{certification_type}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Training Period:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{training_start}} - {{training_end}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Training Mode:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{training_mode}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px;">
                                        <span style="color: #666666;">Location:</span>
                                    </td>
                                    <td style="padding: 10px; text-align: right;">
                                        <strong style="color: #333333;">{{training_location}}</strong>
                                    </td>
                                </tr>
                            </table>

                            <!-- What to Expect Box -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background-color: #eff6ff; border-radius: 8px; padding: 20px; border-left: 4px solid #2563eb;">
                                        <p style="color: #1e40af; font-size: 14px; font-weight: bold; margin: 0 0 10px;">What to Expect</p>
                                        <p style="color: #1e3a8a; font-size: 14px; line-height: 1.5; margin: 0;">
                                            Your training partner will provide you with all the necessary materials and schedule details. After completing the training, you will be eligible to take the official {{certification_type}} certification exam.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{portal_url}}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Access Your Portal</a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                                For questions about your training, please contact your training partner directly.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e5e5;">
                            <p style="color: #666666; font-size: 12px; margin: 0 0 10px;">
                                <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                <a href="{{portal_url}}" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                <a href="mailto:support@bda-global.org" style="color: #2563eb; text-decoration: none;">Support</a>
                            </p>
                            <p style="color: #999999; font-size: 11px; margin: 0;">
                                Business Data Analytics Association
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    '["first_name", "certification_type", "partner_name", "batch_name", "batch_code", "training_start", "training_end", "training_mode", "training_location", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 2. Admin Access Granted (Generic)
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'admin_access_granted',
    'Admin Access Granted',
    'admin',
    'Access Granted: {{access_type}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access Granted</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center;">
                            <img src="https://bfrqgmtwjfkzionlktpv.supabase.co/storage/v1/object/public/assets/bda-logo-white.png" alt="BDA" style="height: 50px; margin-bottom: 15px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Access Granted!</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                A BDA administrator has granted you access to the following:
                            </p>

                            <!-- Access Card -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 8px; padding: 25px; border-left: 4px solid #22c55e;">
                                        <p style="color: #166534; font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 0 0 8px;">Access Type</p>
                                        <p style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 0 0 10px;">{{access_type}}</p>
                                        <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                            {{access_description}}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Access Details -->
                            <table role="presentation" style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Granted On:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{granted_date}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px;">
                                        <span style="color: #666666;">Valid Until:</span>
                                    </td>
                                    <td style="padding: 10px; text-align: right;">
                                        <strong style="color: #333333;">{{valid_until}}</strong>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                You can now access this resource from your BDA Portal dashboard.
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{portal_url}}/{{access_link}}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Access Now</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e5e5;">
                            <p style="color: #666666; font-size: 12px; margin: 0 0 10px;">
                                <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                <a href="{{portal_url}}" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                <a href="mailto:support@bda-global.org" style="color: #2563eb; text-decoration: none;">Support</a>
                            </p>
                            <p style="color: #999999; font-size: 11px; margin: 0;">
                                Business Data Analytics Association
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    '["first_name", "access_type", "access_description", "granted_date", "valid_until", "access_link", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 3. Admin Access Revoked
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'admin_access_revoked',
    'Admin Access Revoked',
    'admin',
    'Access Update: {{access_type}} Has Been Revoked',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access Revoked</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; text-align: center;">
                            <img src="https://bfrqgmtwjfkzionlktpv.supabase.co/storage/v1/object/public/assets/bda-logo-white.png" alt="BDA" style="height: 50px; margin-bottom: 15px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Access Update</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                We wanted to let you know that your access to the following has been revoked by a BDA administrator:
                            </p>

                            <!-- Access Card -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 8px; padding: 25px; border-left: 4px solid #dc2626;">
                                        <p style="color: #991b1b; font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 0 0 8px;">Access Revoked</p>
                                        <p style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 0 0 10px;">{{access_type}}</p>
                                        <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                            Effective: {{revoked_date}}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Reason Box (if provided) -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background-color: #f3f4f6; border-radius: 8px; padding: 20px;">
                                        <p style="color: #374151; font-size: 14px; font-weight: bold; margin: 0 0 10px;">Reason</p>
                                        <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0;">
                                            {{revocation_reason}}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                If you believe this was done in error or have questions, please contact our support team.
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="mailto:support@bda-global.org" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Contact Support</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e5e5;">
                            <p style="color: #666666; font-size: 12px; margin: 0 0 10px;">
                                <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                <a href="{{portal_url}}" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                <a href="mailto:support@bda-global.org" style="color: #2563eb; text-decoration: none;">Support</a>
                            </p>
                            <p style="color: #999999; font-size: 11px; margin: 0;">
                                Business Data Analytics Association
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    '["first_name", "access_type", "revoked_date", "revocation_reason", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =============================================================================
-- HELPER FUNCTION: Send Admin/ECP Email
-- =============================================================================

CREATE OR REPLACE FUNCTION send_admin_ecp_email(
    p_user_id UUID,
    p_template_key TEXT,
    p_variables JSONB
)
RETURNS void AS $$
DECLARE
    v_user RECORD;
    v_template RECORD;
    v_subject TEXT;
    v_html_body TEXT;
    v_key TEXT;
    v_value TEXT;
    v_supabase_url TEXT := current_setting('app.settings.supabase_url', true);
    v_service_role_key TEXT := current_setting('app.settings.service_role_key', true);
BEGIN
    -- Get user info
    SELECT id, email, first_name, last_name
    INTO v_user
    FROM public.users
    WHERE id = p_user_id;

    IF v_user IS NULL THEN
        RAISE WARNING 'User not found: %', p_user_id;
        RETURN;
    END IF;

    -- Get template
    SELECT template_key, subject, html_body
    INTO v_template
    FROM public.email_templates
    WHERE template_key = p_template_key AND is_active = true;

    IF v_template IS NULL THEN
        RAISE WARNING 'Template not found or inactive: %', p_template_key;
        RETURN;
    END IF;

    -- Start with template
    v_subject := v_template.subject;
    v_html_body := v_template.html_body;

    -- Replace variables
    FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
    LOOP
        v_subject := REPLACE(v_subject, '{{' || v_key || '}}', COALESCE(v_value, ''));
        v_html_body := REPLACE(v_html_body, '{{' || v_key || '}}', COALESCE(v_value, ''));
    END LOOP;

    -- Default portal URL
    v_html_body := REPLACE(v_html_body, '{{portal_url}}', 'https://bda-global.org/portal');

    -- Call Edge Function via pg_net
    PERFORM net.http_post(
        url := COALESCE(v_supabase_url, 'https://bfrqgmtwjfkzionlktpv.supabase.co') || '/functions/v1/send-email',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(v_service_role_key, current_setting('supabase.service_role_key', true))
        ),
        body := jsonb_build_object(
            'to', v_user.email,
            'subject', v_subject,
            'html', v_html_body,
            'from', 'BDA <noreply@bda-global.org>',
            'replyTo', 'support@bda-global.org'
        )
    );

    RAISE NOTICE 'Admin/ECP email queued: % to %', p_template_key, v_user.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGER: On Trainee Batch Assignment
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_trainee_batch_assigned()
RETURNS TRIGGER AS $$
DECLARE
    v_batch RECORD;
    v_partner RECORD;
    v_user RECORD;
    v_variables JSONB;
    v_cert_display TEXT;
    v_mode_display TEXT;
BEGIN
    -- Only trigger when batch_id is set (not NULL to value)
    IF NEW.batch_id IS NULL OR (OLD IS NOT NULL AND OLD.batch_id = NEW.batch_id) THEN
        RETURN NEW;
    END IF;

    -- Get batch details
    SELECT * INTO v_batch
    FROM public.ecp_training_batches
    WHERE id = NEW.batch_id;

    IF v_batch IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get partner details
    SELECT id, first_name, last_name, company_name INTO v_partner
    FROM public.users
    WHERE id = NEW.partner_id;

    -- Try to get user if linked
    IF NEW.user_id IS NOT NULL THEN
        SELECT id, email, first_name, last_name INTO v_user
        FROM public.users
        WHERE id = NEW.user_id;
    END IF;

    -- Format certification type
    v_cert_display := CASE
        WHEN NEW.certification_type = 'CP' THEN 'CP (Certified Professional)'
        WHEN NEW.certification_type = 'SCP' THEN 'SCP (Senior Certified Professional)'
        ELSE NEW.certification_type::TEXT
    END;

    -- Format training mode
    v_mode_display := CASE
        WHEN v_batch.training_mode = 'in_person' THEN 'In Person'
        WHEN v_batch.training_mode = 'online' THEN 'Online'
        WHEN v_batch.training_mode = 'hybrid' THEN 'Hybrid'
        ELSE v_batch.training_mode
    END;

    v_variables := jsonb_build_object(
        'first_name', COALESCE(v_user.first_name, NEW.first_name, 'Member'),
        'certification_type', v_cert_display,
        'partner_name', COALESCE(v_partner.company_name, v_partner.first_name || ' ' || v_partner.last_name, 'Training Partner'),
        'batch_name', v_batch.batch_name,
        'batch_code', v_batch.batch_code,
        'training_start', TO_CHAR(v_batch.training_start_date, 'Month DD, YYYY'),
        'training_end', TO_CHAR(v_batch.training_end_date, 'Month DD, YYYY'),
        'training_mode', v_mode_display,
        'training_location', COALESCE(v_batch.training_location, 'TBD')
    );

    -- Send email (to linked user or trainee email)
    IF NEW.user_id IS NOT NULL THEN
        PERFORM send_admin_ecp_email(NEW.user_id, 'trainee_batch_assigned', v_variables);
    ELSE
        -- Send directly to trainee email using pg_net
        DECLARE
            v_template RECORD;
            v_subject TEXT;
            v_html_body TEXT;
            v_key TEXT;
            v_value TEXT;
        BEGIN
            SELECT * INTO v_template
            FROM public.email_templates
            WHERE template_key = 'trainee_batch_assigned' AND is_active = true;

            IF v_template IS NOT NULL THEN
                v_subject := v_template.subject;
                v_html_body := v_template.html_body;

                FOR v_key, v_value IN SELECT * FROM jsonb_each_text(v_variables)
                LOOP
                    v_subject := REPLACE(v_subject, '{{' || v_key || '}}', COALESCE(v_value, ''));
                    v_html_body := REPLACE(v_html_body, '{{' || v_key || '}}', COALESCE(v_value, ''));
                END LOOP;

                v_html_body := REPLACE(v_html_body, '{{portal_url}}', 'https://bda-global.org/portal');

                PERFORM net.http_post(
                    url := 'https://bfrqgmtwjfkzionlktpv.supabase.co/functions/v1/send-email',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
                    ),
                    body := jsonb_build_object(
                        'to', NEW.email,
                        'subject', v_subject,
                        'html', v_html_body,
                        'from', 'BDA <noreply@bda-global.org>',
                        'replyTo', 'support@bda-global.org'
                    )
                );
            END IF;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_trainee_batch_assigned ON public.ecp_trainees;

-- Create trigger
CREATE TRIGGER on_trainee_batch_assigned
    AFTER INSERT OR UPDATE ON public.ecp_trainees
    FOR EACH ROW
    EXECUTE FUNCTION handle_trainee_batch_assigned();

-- =============================================================================
-- CONVENIENCE FUNCTIONS FOR ADMIN MANUAL EMAILS
-- =============================================================================

-- Function to send generic admin access granted email
CREATE OR REPLACE FUNCTION send_admin_access_granted_notification(
    p_user_id UUID,
    p_access_type TEXT,
    p_access_description TEXT,
    p_valid_until TEXT DEFAULT 'No Expiry',
    p_access_link TEXT DEFAULT 'dashboard'
)
RETURNS void AS $$
DECLARE
    v_variables JSONB;
    v_user RECORD;
BEGIN
    SELECT first_name INTO v_user FROM public.users WHERE id = p_user_id;

    v_variables := jsonb_build_object(
        'first_name', COALESCE(v_user.first_name, 'Member'),
        'access_type', p_access_type,
        'access_description', p_access_description,
        'granted_date', TO_CHAR(NOW(), 'Month DD, YYYY'),
        'valid_until', p_valid_until,
        'access_link', p_access_link
    );

    PERFORM send_admin_ecp_email(p_user_id, 'admin_access_granted', v_variables);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send generic admin access revoked email
CREATE OR REPLACE FUNCTION send_admin_access_revoked_notification(
    p_user_id UUID,
    p_access_type TEXT,
    p_revocation_reason TEXT DEFAULT 'Access period ended or policy update.'
)
RETURNS void AS $$
DECLARE
    v_variables JSONB;
    v_user RECORD;
BEGIN
    SELECT first_name INTO v_user FROM public.users WHERE id = p_user_id;

    v_variables := jsonb_build_object(
        'first_name', COALESCE(v_user.first_name, 'Member'),
        'access_type', p_access_type,
        'revoked_date', TO_CHAR(NOW(), 'Month DD, YYYY'),
        'revocation_reason', p_revocation_reason
    );

    PERFORM send_admin_ecp_email(p_user_id, 'admin_access_revoked', v_variables);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_admin_access_granted_notification TO authenticated;
GRANT EXECUTE ON FUNCTION send_admin_access_revoked_notification TO authenticated;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Phase 8: ECP / Admin Action Emails';
    RAISE NOTICE '   Templates created: 3 templates';
    RAISE NOTICE '   - trainee_batch_assigned (ECP training enrollment)';
    RAISE NOTICE '   - admin_access_granted (generic admin grant)';
    RAISE NOTICE '   - admin_access_revoked (generic admin revocation)';
    RAISE NOTICE '   Triggers:';
    RAISE NOTICE '   - on_trainee_batch_assigned';
    RAISE NOTICE '   Functions:';
    RAISE NOTICE '   - send_admin_access_granted_notification(user_id, access_type, description, valid_until, access_link)';
    RAISE NOTICE '   - send_admin_access_revoked_notification(user_id, access_type, reason)';
END $$;
