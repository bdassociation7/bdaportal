-- =============================================================================
-- Phase 7: PDCs & Recertification Email Templates & Triggers
-- Date: 2026-01-27
-- Description: Email notifications for PDC credits and recertification process
-- =============================================================================
-- Templates:
--   1. pdc_entry_approved        - PDC entry approved (credits added)
--   2. pdc_threshold_reached     - 60 PDCs completed for recertification
--   3. recertification_available - Eligible for recertification
--   4. recertification_completed - Recertification completed
-- =============================================================================

-- =============================================================================
-- EMAIL TEMPLATES
-- =============================================================================

-- 1. PDC Entry Approved
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'pdc_entry_approved',
    'PDC Entry Approved',
    'pdc',
    'Your PDC Submission Has Been Approved - {{credits_approved}} Credits',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDC Approved</title>
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
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">PDC Credits Approved!</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Great news! Your Professional Development Credit (PDC) submission has been approved.
                            </p>

                            <!-- Credits Card -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 8px; padding: 30px; text-align: center; border: 2px solid #22c55e;">
                                        <p style="color: #166534; font-size: 14px; text-transform: uppercase; font-weight: bold; margin: 0 0 10px;">Credits Awarded</p>
                                        <p style="color: #15803d; font-size: 48px; font-weight: bold; margin: 0;">+{{credits_approved}}</p>
                                        <p style="color: #166534; font-size: 14px; margin: 10px 0 0;">PDC Credits</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Activity Details -->
                            <table role="presentation" style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Activity:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{activity_title}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Activity Type:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{activity_type}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Activity Date:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{activity_date}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px;">
                                        <span style="color: #666666;">Total PDCs:</span>
                                    </td>
                                    <td style="padding: 10px; text-align: right;">
                                        <strong style="color: #059669;">{{total_pdcs}} / 60</strong>
                                    </td>
                                </tr>
                            </table>

                            <!-- Progress Bar -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td>
                                        <p style="color: #666666; font-size: 12px; margin: 0 0 8px;">Progress to Recertification (60 PDCs required)</p>
                                        <div style="background-color: #e5e5e5; border-radius: 10px; height: 20px; overflow: hidden;">
                                            <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); height: 100%; width: {{progress_percentage}}%; border-radius: 10px;"></div>
                                        </div>
                                        <p style="color: #666666; font-size: 12px; margin: 8px 0 0; text-align: right;">{{progress_percentage}}% Complete</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{portal_url}}/pdc" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">View PDC Dashboard</a>
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
    '["first_name", "credits_approved", "activity_title", "activity_type", "activity_date", "total_pdcs", "progress_percentage", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 2. PDC Threshold Reached (60 PDCs)
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'pdc_threshold_reached',
    '60 PDCs Reached',
    'pdc',
    'Congratulations! You Have Reached 60 PDCs - Recertification Ready',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>60 PDCs Reached</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; text-align: center;">
                            <img src="https://bfrqgmtwjfkzionlktpv.supabase.co/storage/v1/object/public/assets/bda-logo-white.png" alt="BDA" style="height: 50px; margin-bottom: 15px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">60 PDCs Achieved!</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                <strong>Congratulations!</strong> You have successfully earned 60 Professional Development Credits (PDCs), meeting the requirement for {{certification_type}} recertification.
                            </p>

                            <!-- Achievement Card -->
                            <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border-radius: 8px; padding: 30px; text-align: center; border: 2px solid #a855f7;">
                                        <p style="color: #6b21a8; font-size: 48px; margin: 0 0 10px;">🎯</p>
                                        <p style="color: #6b21a8; font-size: 48px; font-weight: bold; margin: 0;">{{total_pdcs}}</p>
                                        <p style="color: #7c3aed; font-size: 16px; margin: 10px 0 0;">PDC Credits Earned</p>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                Your dedication to professional development demonstrates your commitment to excellence in Business Data Analytics.
                            </p>

                            <!-- What This Means Box -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background-color: #eff6ff; border-radius: 8px; padding: 20px; border-left: 4px solid #2563eb;">
                                        <p style="color: #1e40af; font-size: 14px; font-weight: bold; margin: 0 0 10px;">What This Means</p>
                                        <p style="color: #1e3a8a; font-size: 14px; line-height: 1.5; margin: 0;">
                                            You are now eligible to renew your {{certification_type}} certification before it expires on <strong>{{expiry_date}}</strong>. Recertification ensures your credential remains valid and demonstrates ongoing expertise.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Buttons -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{portal_url}}/certifications/recertify" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Start Recertification</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align: center; padding-top: 15px;">
                                        <a href="{{portal_url}}/pdc" style="color: #2563eb; text-decoration: none; font-size: 14px;">View Your PDC History</a>
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
    '["first_name", "certification_type", "total_pdcs", "expiry_date", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 3. Recertification Available
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'recertification_available',
    'Recertification Available',
    'pdc',
    'Your {{certification_type}} Recertification is Now Available',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recertification Available</title>
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
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Recertification Ready!</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Good news! You are now eligible to recertify your <strong>{{certification_type}}</strong> certification.
                            </p>

                            <!-- Status Card -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%); border-radius: 8px; padding: 25px; border-left: 4px solid #0891b2;">
                                        <p style="color: #0e7490; font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 0 0 8px;">Recertification Eligible</p>
                                        <p style="color: #1f2937; font-size: 18px; font-weight: bold; margin: 0 0 10px;">{{certification_type}} Certification</p>
                                        <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                            Current expiry: <strong>{{expiry_date}}</strong>
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Requirements -->
                            <p style="color: #333333; font-size: 16px; font-weight: bold; margin: 25px 0 15px;">Your Qualifications:</p>
                            <table role="presentation" style="width: 100%; margin: 0 0 25px; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 24px;">
                                        <span style="color: #22c55e; font-size: 16px;">✓</span>
                                    </td>
                                    <td style="padding: 8px 0; color: #333333; font-size: 14px;">
                                        <strong>{{total_pdcs}} PDC Credits</strong> earned (60 required)
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 24px;">
                                        <span style="color: #22c55e; font-size: 16px;">✓</span>
                                    </td>
                                    <td style="padding: 8px 0; color: #333333; font-size: 14px;">
                                        Active {{certification_type}} certification
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 24px;">
                                        <span style="color: #22c55e; font-size: 16px;">✓</span>
                                    </td>
                                    <td style="padding: 8px 0; color: #333333; font-size: 14px;">
                                        Within recertification window
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                Complete your recertification before <strong>{{expiry_date}}</strong> to maintain your professional credential without interruption.
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{portal_url}}/certifications/recertify" style="display: inline-block; background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Complete Recertification</a>
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
    '["first_name", "certification_type", "total_pdcs", "expiry_date", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 4. Recertification Completed
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'recertification_completed',
    'Recertification Completed',
    'pdc',
    'Congratulations! Your {{certification_type}} Has Been Renewed',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recertification Complete</title>
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
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Recertification Complete!</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                <strong>Congratulations!</strong> Your <strong>{{certification_type}}</strong> certification has been successfully renewed.
                            </p>

                            <!-- Certificate Card -->
                            <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 8px; padding: 30px; text-align: center; border: 2px solid #22c55e;">
                                        <p style="color: #166534; font-size: 14px; text-transform: uppercase; font-weight: bold; margin: 0 0 10px;">Certification Renewed</p>
                                        <p style="color: #15803d; font-size: 24px; font-weight: bold; margin: 0 0 5px;">{{certification_type}}</p>
                                        <p style="color: #166534; font-size: 14px; margin: 10px 0 0;">Credential ID: <strong>{{credential_id}}</strong></p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Renewal Details -->
                            <table role="presentation" style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Renewal Date:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{renewed_date}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">New Expiry Date:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #22c55e;">{{new_expiry_date}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px;">
                                        <span style="color: #666666;">Renewal Count:</span>
                                    </td>
                                    <td style="padding: 10px; text-align: right;">
                                        <strong style="color: #333333;">{{renewal_count}}</strong>
                                    </td>
                                </tr>
                            </table>

                            <!-- PDC Reset Notice -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background-color: #fef3c7; border-radius: 8px; padding: 20px; border-left: 4px solid #f59e0b;">
                                        <p style="color: #92400e; font-size: 14px; font-weight: bold; margin: 0 0 10px;">PDC Cycle Reset</p>
                                        <p style="color: #78350f; font-size: 14px; line-height: 1.5; margin: 0;">
                                            Your PDC credits have been reset for the new certification period. Continue earning PDCs to maintain your certification for the next renewal cycle.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Buttons -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{portal_url}}/certifications/{{certification_id}}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">View Certification</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align: center; padding-top: 15px;">
                                        <a href="{{portal_url}}/certifications/{{certification_id}}/certificate" style="color: #2563eb; text-decoration: none; font-size: 14px;">Download Updated Certificate</a>
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
    '["first_name", "certification_type", "credential_id", "certification_id", "renewed_date", "new_expiry_date", "renewal_count", "portal_url"]'::jsonb,
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
-- HELPER FUNCTION: Send PDC Email
-- =============================================================================

CREATE OR REPLACE FUNCTION send_pdc_email(
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

    RAISE NOTICE 'PDC email queued: % to %', p_template_key, v_user.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- NOTIFICATION TRACKING TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pdc_threshold_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    certification_type certification_type NOT NULL,
    threshold_type TEXT NOT NULL, -- '60_pdcs', 'recertification_available'
    notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, certification_type, threshold_type)
);

-- =============================================================================
-- TRIGGER: On PDC Entry Status Change
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_pdc_entry_approved()
RETURNS TRIGGER AS $$
DECLARE
    v_user RECORD;
    v_total_pdcs INTEGER;
    v_progress_percentage INTEGER;
    v_activity_type_display TEXT;
    v_variables JSONB;
    v_certification RECORD;
    v_already_notified BOOLEAN;
BEGIN
    -- Only trigger when status changes to 'approved'
    IF NEW.status != 'approved' OR (OLD IS NOT NULL AND OLD.status = 'approved') THEN
        RETURN NEW;
    END IF;

    -- Get user details
    SELECT id, email, first_name, last_name
    INTO v_user
    FROM public.users
    WHERE id = NEW.user_id;

    IF v_user IS NULL THEN
        RETURN NEW;
    END IF;

    -- Calculate total approved PDCs
    SELECT COALESCE(SUM(credits_approved), 0) INTO v_total_pdcs
    FROM public.pdc_entries
    WHERE user_id = NEW.user_id
    AND certification_type = NEW.certification_type
    AND status = 'approved';

    -- Calculate progress percentage (capped at 100)
    v_progress_percentage := LEAST(100, (v_total_pdcs * 100 / 60));

    -- Format activity type for display
    v_activity_type_display := REPLACE(INITCAP(NEW.activity_type::TEXT), '_', ' ');

    -- Send PDC approved email
    v_variables := jsonb_build_object(
        'first_name', COALESCE(v_user.first_name, 'Member'),
        'credits_approved', COALESCE(NEW.credits_approved, NEW.credits_claimed),
        'activity_title', NEW.activity_title,
        'activity_type', v_activity_type_display,
        'activity_date', TO_CHAR(NEW.activity_date, 'Month DD, YYYY'),
        'total_pdcs', v_total_pdcs,
        'progress_percentage', v_progress_percentage
    );

    PERFORM send_pdc_email(NEW.user_id, 'pdc_entry_approved', v_variables);

    -- Check if 60 PDC threshold reached (only notify once)
    IF v_total_pdcs >= 60 THEN
        SELECT EXISTS(
            SELECT 1 FROM public.pdc_threshold_notifications
            WHERE user_id = NEW.user_id
            AND certification_type = NEW.certification_type
            AND threshold_type = '60_pdcs'
        ) INTO v_already_notified;

        IF NOT v_already_notified THEN
            -- Get certification details
            SELECT * INTO v_certification
            FROM public.user_certifications
            WHERE user_id = NEW.user_id
            AND certification_type = NEW.certification_type
            AND status = 'active'
            ORDER BY expiry_date DESC
            LIMIT 1;

            IF v_certification IS NOT NULL THEN
                -- Record notification
                INSERT INTO public.pdc_threshold_notifications (user_id, certification_type, threshold_type)
                VALUES (NEW.user_id, NEW.certification_type, '60_pdcs')
                ON CONFLICT DO NOTHING;

                -- Send threshold reached email
                v_variables := jsonb_build_object(
                    'first_name', COALESCE(v_user.first_name, 'Member'),
                    'certification_type', CASE
                        WHEN NEW.certification_type = 'CP' THEN 'CP (Certified Professional)'
                        WHEN NEW.certification_type = 'SCP' THEN 'SCP (Senior Certified Professional)'
                        ELSE NEW.certification_type::TEXT
                    END,
                    'total_pdcs', v_total_pdcs,
                    'expiry_date', TO_CHAR(v_certification.expiry_date, 'Month DD, YYYY')
                );

                PERFORM send_pdc_email(NEW.user_id, 'pdc_threshold_reached', v_variables);
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_pdc_entry_approved ON public.pdc_entries;

-- Create trigger
CREATE TRIGGER on_pdc_entry_approved
    AFTER UPDATE ON public.pdc_entries
    FOR EACH ROW
    EXECUTE FUNCTION handle_pdc_entry_approved();

-- =============================================================================
-- TRIGGER: On Certification Renewed (Recertification Completed)
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_certification_renewed()
RETURNS TRIGGER AS $$
DECLARE
    v_user RECORD;
    v_variables JSONB;
    v_cert_display TEXT;
BEGIN
    -- Only trigger when renewal_count increases
    IF NEW.renewal_count <= COALESCE(OLD.renewal_count, 0) THEN
        RETURN NEW;
    END IF;

    -- Get user details
    SELECT id, email, first_name, last_name
    INTO v_user
    FROM public.users
    WHERE id = NEW.user_id;

    IF v_user IS NULL THEN
        RETURN NEW;
    END IF;

    -- Format certification type
    v_cert_display := CASE
        WHEN NEW.certification_type = 'CP' THEN 'CP (Certified Professional)'
        WHEN NEW.certification_type = 'SCP' THEN 'SCP (Senior Certified Professional)'
        ELSE NEW.certification_type::TEXT
    END;

    v_variables := jsonb_build_object(
        'first_name', COALESCE(v_user.first_name, 'Member'),
        'certification_type', v_cert_display,
        'credential_id', NEW.credential_id,
        'certification_id', NEW.id,
        'renewed_date', TO_CHAR(NEW.last_renewed_at, 'Month DD, YYYY'),
        'new_expiry_date', TO_CHAR(NEW.expiry_date, 'Month DD, YYYY'),
        'renewal_count', NEW.renewal_count
    );

    -- Send recertification completed email
    PERFORM send_pdc_email(NEW.user_id, 'recertification_completed', v_variables);

    -- Clear PDC threshold notifications for next cycle
    DELETE FROM public.pdc_threshold_notifications
    WHERE user_id = NEW.user_id
    AND certification_type = NEW.certification_type;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_certification_renewed ON public.user_certifications;

-- Create trigger
CREATE TRIGGER on_certification_renewed
    AFTER UPDATE ON public.user_certifications
    FOR EACH ROW
    EXECUTE FUNCTION handle_certification_renewed();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Phase 7: PDCs & Recertification Emails';
    RAISE NOTICE '   Templates created: 4 templates';
    RAISE NOTICE '   - pdc_entry_approved (credits added)';
    RAISE NOTICE '   - pdc_threshold_reached (60 PDCs milestone)';
    RAISE NOTICE '   - recertification_available (eligible to renew)';
    RAISE NOTICE '   - recertification_completed (renewal done)';
    RAISE NOTICE '   Triggers:';
    RAISE NOTICE '   - on_pdc_entry_approved (with 60 PDC threshold check)';
    RAISE NOTICE '   - on_certification_renewed';
    RAISE NOTICE '   Tables:';
    RAISE NOTICE '   - pdc_threshold_notifications (prevent duplicate notifications)';
END $$;
