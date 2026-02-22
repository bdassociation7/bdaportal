-- =============================================================================
-- Phase 5: Certification Exam Emails (10 emails)
-- =============================================================================
-- Migration: Certification exam lifecycle email templates and triggers
-- Date: 2026-01-27
-- Description: Email notifications for exam vouchers, scheduling, and results
-- =============================================================================

-- =============================================================================
-- 1. INSERT EMAIL TEMPLATES (10 templates)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Template 1: Exam Voucher Issued
-- -----------------------------------------------------------------------------
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'exam_voucher_issued',
    'Exam Voucher Issued',
    'certification',
    'Your {{certification_type}} Certification Exam Voucher is Ready!',
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
                            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center;">
                                <span style="font-size: 48px;">🎫</span>
                                <h1 style="color: #ffffff; font-size: 24px; margin: 10px 0 0 0;">Exam Voucher Ready!</h1>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Great news! Your exam voucher for the <strong>{{certification_type}} Certification</strong> has been issued and is ready to use.
                            </p>
                            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Voucher Code:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right; font-family: monospace;">{{voucher_code}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Certification:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{certification_type}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Valid Until:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{expires_at}}</td>
                                    </tr>
                                </table>
                            </div>
                            <h2 style="color: #1e3a5f; font-size: 18px; margin: 30px 0 15px 0;">Next Steps</h2>
                            <ol style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Log in to the BDA Portal</li>
                                <li>Navigate to the Certification section</li>
                                <li>Schedule your exam at a time that works for you</li>
                                <li>Prepare using our study materials</li>
                            </ol>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="{{portal_url}}/certifications" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">Schedule Your Exam</a>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                                <p style="color: #1e40af; font-size: 14px; margin: 0;">
                                    <strong>Tip:</strong> Review the BoCK™ (Body of Certified Knowledge) and practice with mock exams before scheduling your certification exam.
                                </p>
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                                        <p style="margin: 0 0 10px 0;"><strong>Business Data Analytics Association</strong></p>
                                        <p style="margin: 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:certifications@bda-global.org" style="color: #2563eb; text-decoration: none;">Certifications Support</a>
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
    '["first_name", "certification_type", "voucher_code", "expires_at", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Template 2: Exam Voucher Assigned (ECP/Transfer)
-- -----------------------------------------------------------------------------
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'exam_voucher_assigned',
    'Exam Voucher Assigned (ECP)',
    'certification',
    'An Exam Voucher Has Been Assigned to You',
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
                            <h1 style="color: #1e3a5f; font-size: 24px; margin: 0 0 20px 0;">Exam Voucher Assigned</h1>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                {{assigned_by}} has assigned you an exam voucher for the <strong>{{certification_type}} Certification</strong> through the Enterprise Certification Program.
                            </p>
                            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Organization:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{organization_name}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Certification:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{certification_type}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Valid Until:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{expires_at}}</td>
                                    </tr>
                                </table>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                To use this voucher:
                            </p>
                            <ol style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Create or log in to your BDA Portal account</li>
                                <li>Your voucher will be automatically linked to your account</li>
                                <li>Schedule and take your certification exam</li>
                            </ol>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="{{portal_url}}/certifications" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">Access Your Voucher</a>
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
                                        <p style="margin: 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:certifications@bda-global.org" style="color: #2563eb; text-decoration: none;">Certifications Support</a>
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
    '["first_name", "assigned_by", "organization_name", "certification_type", "expires_at", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Template 3: Exam Scheduling Available
-- -----------------------------------------------------------------------------
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'exam_scheduling_available',
    'Exam Scheduling Available',
    'certification',
    'You Can Now Schedule Your {{certification_type}} Exam',
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
                            <div style="text-align: center; margin-bottom: 30px;">
                                <span style="font-size: 48px;">📅</span>
                                <h1 style="color: #1e3a5f; font-size: 24px; margin: 10px 0 0 0;">Ready to Schedule?</h1>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Your {{certification_type}} exam voucher is active and you are now eligible to schedule your certification exam. New exam slots have been added for {{exam_window}}.
                            </p>
                            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                                <p style="color: #166534; font-size: 14px; margin: 0;">
                                    <strong>Your voucher expires on {{expires_at}}</strong> - schedule your exam before this date to avoid losing your voucher.
                                </p>
                            </div>
                            <h2 style="color: #1e3a5f; font-size: 18px; margin: 30px 0 15px 0;">Available Time Slots</h2>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Exams are available during scheduled windows. Choose a time that works best for you.
                            </p>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="{{portal_url}}/certifications/schedule" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">View Available Slots</a>
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
                                        <p style="margin: 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:certifications@bda-global.org" style="color: #2563eb; text-decoration: none;">Certifications Support</a>
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
    '["first_name", "certification_type", "exam_window", "expires_at", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Template 4: Exam Scheduled (Confirmation)
-- -----------------------------------------------------------------------------
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'exam_scheduled',
    'Exam Scheduled Confirmation',
    'certification',
    'Your {{certification_type}} Exam is Confirmed - {{scheduled_date}}',
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
                            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center;">
                                <span style="font-size: 48px;">✅</span>
                                <h1 style="color: #ffffff; font-size: 24px; margin: 10px 0 0 0;">Exam Confirmed!</h1>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Your <strong>{{certification_type}} Certification Exam</strong> has been successfully scheduled!
                            </p>
                            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Confirmation Code:</td>
                                        <td style="color: #1e3a5f; font-size: 18px; font-weight: 700; text-align: right; font-family: monospace;">{{confirmation_code}}</td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" style="border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 10px;"></td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Date:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{scheduled_date}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Time:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{scheduled_time}} ({{timezone}})</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Duration:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{duration_minutes}} minutes</td>
                                    </tr>
                                </table>
                            </div>
                            <h2 style="color: #1e3a5f; font-size: 18px; margin: 30px 0 15px 0;">Before Your Exam</h2>
                            <ul style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Ensure you have a stable internet connection</li>
                                <li>Use a modern browser (Chrome, Firefox, Safari, Edge)</li>
                                <li>Find a quiet location without interruptions</li>
                                <li>Have your government-issued ID ready</li>
                                <li>Log in 15 minutes before your scheduled time</li>
                            </ul>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="{{portal_url}}/certifications/exam/{{booking_id}}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">View Exam Details</a>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                                <p style="color: #92400e; font-size: 14px; margin: 0;">
                                    <strong>Need to reschedule?</strong> You can reschedule your exam up to 24 hours before the scheduled time through the portal.
                                </p>
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                                        <p style="margin: 0 0 10px 0;"><strong>Business Data Analytics Association</strong></p>
                                        <p style="margin: 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:certifications@bda-global.org" style="color: #2563eb; text-decoration: none;">Certifications Support</a>
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
    '["first_name", "certification_type", "confirmation_code", "scheduled_date", "scheduled_time", "timezone", "duration_minutes", "booking_id", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Template 5: Exam Reminder (3 Days)
-- -----------------------------------------------------------------------------
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'exam_reminder_3_days',
    'Exam Reminder (3 Days)',
    'certification',
    'Reminder: Your {{certification_type}} Exam is in 3 Days',
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
                            <div style="text-align: center; margin-bottom: 30px;">
                                <span style="font-size: 48px;">⏰</span>
                                <h1 style="color: #1e3a5f; font-size: 24px; margin: 10px 0 0 0;">3 Days Until Your Exam!</h1>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                This is a friendly reminder that your <strong>{{certification_type}} Certification Exam</strong> is scheduled for <strong>{{scheduled_date}}</strong>.
                            </p>
                            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Date:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{scheduled_date}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Time:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{scheduled_time}} ({{timezone}})</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Confirmation:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right; font-family: monospace;">{{confirmation_code}}</td>
                                    </tr>
                                </table>
                            </div>
                            <h2 style="color: #1e3a5f; font-size: 18px; margin: 30px 0 15px 0;">Final Preparation Checklist</h2>
                            <ul style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Review the BoCK framework one more time</li>
                                <li>Take a practice exam to assess your readiness</li>
                                <li>Get plenty of rest the night before</li>
                                <li>Prepare your exam environment</li>
                            </ul>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="{{portal_url}}/certifications/prepare" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">Access Study Materials</a>
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
                                        <p style="margin: 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:certifications@bda-global.org" style="color: #2563eb; text-decoration: none;">Certifications Support</a>
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
    '["first_name", "certification_type", "scheduled_date", "scheduled_time", "timezone", "confirmation_code", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Template 6: Exam Reminder (Day Of)
-- -----------------------------------------------------------------------------
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'exam_reminder_day_of',
    'Exam Reminder (Day Of)',
    'certification',
    'Your {{certification_type}} Exam is TODAY at {{scheduled_time}}',
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
                            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center;">
                                <span style="font-size: 48px;">🎯</span>
                                <h1 style="color: #ffffff; font-size: 24px; margin: 10px 0 0 0;">Your Exam is TODAY!</h1>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Today is the day! Your <strong>{{certification_type}} Certification Exam</strong> is scheduled for <strong>{{scheduled_time}} ({{timezone}})</strong>.
                            </p>
                            <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; border: 2px solid #f59e0b;">
                                <p style="color: #92400e; font-size: 18px; font-weight: 600; margin: 0 0 10px 0; text-align: center;">
                                    Please log in 15 minutes early
                                </p>
                                <p style="color: #92400e; font-size: 14px; margin: 0; text-align: center;">
                                    Confirmation Code: <strong style="font-family: monospace; font-size: 16px;">{{confirmation_code}}</strong>
                                </p>
                            </div>
                            <h2 style="color: #1e3a5f; font-size: 18px; margin: 30px 0 15px 0;">Quick Checklist</h2>
                            <ul style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Stable internet connection</li>
                                <li>Modern browser (Chrome, Firefox, Safari, Edge)</li>
                                <li>Quiet, distraction-free environment</li>
                                <li>Government-issued ID nearby</li>
                                <li>Water and any permitted materials</li>
                            </ul>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="{{portal_url}}/certifications/exam/{{booking_id}}/launch" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 50px; border-radius: 6px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">Launch Exam</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
                                Good luck! We believe in you.
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
                                        <p style="margin: 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:certifications@bda-global.org" style="color: #2563eb; text-decoration: none;">Certifications Support</a>
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
    '["first_name", "certification_type", "scheduled_time", "timezone", "confirmation_code", "booking_id", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Template 7: Exam Launched
-- -----------------------------------------------------------------------------
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'exam_launched',
    'Exam Launched',
    'certification',
    'Your {{certification_type}} Exam Has Started',
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
                            <div style="text-align: center; margin-bottom: 30px;">
                                <span style="font-size: 48px;">📝</span>
                                <h1 style="color: #1e3a5f; font-size: 24px; margin: 10px 0 0 0;">Exam In Progress</h1>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Your <strong>{{certification_type}} Certification Exam</strong> has been launched. This email serves as confirmation that your exam session has started.
                            </p>
                            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Started At:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{started_at}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Time Limit:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{duration_minutes}} minutes</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Session ID:</td>
                                        <td style="color: #1e3a5f; font-size: 14px; text-align: right; font-family: monospace;">{{session_id}}</td>
                                    </tr>
                                </table>
                            </div>
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                                <p style="color: #92400e; font-size: 14px; margin: 0;">
                                    <strong>Important:</strong> If you did not start this exam session, please contact support immediately at certifications@bda-global.org
                                </p>
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                                        <p style="margin: 0 0 10px 0;"><strong>Business Data Analytics Association</strong></p>
                                        <p style="margin: 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:certifications@bda-global.org" style="color: #2563eb; text-decoration: none;">Certifications Support</a>
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
    '["first_name", "certification_type", "started_at", "duration_minutes", "session_id"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Template 8: Exam Completed (Submitted)
-- -----------------------------------------------------------------------------
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'exam_completed',
    'Exam Submitted',
    'certification',
    'Your {{certification_type}} Exam Has Been Submitted',
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
                            <div style="text-align: center; margin-bottom: 30px;">
                                <span style="font-size: 48px;">📤</span>
                                <h1 style="color: #1e3a5f; font-size: 24px; margin: 10px 0 0 0;">Exam Submitted Successfully</h1>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Thank you for completing your <strong>{{certification_type}} Certification Exam</strong>. Your answers have been submitted and are being scored.
                            </p>
                            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Submitted At:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{completed_at}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Time Taken:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{time_taken_minutes}} minutes</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Questions Answered:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{questions_answered}} / {{total_questions}}</td>
                                    </tr>
                                </table>
                            </div>
                            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                                <p style="color: #1e40af; font-size: 14px; margin: 0;">
                                    <strong>What happens next?</strong> Your exam is being automatically scored. You will receive your results via email shortly. Results are typically available within a few minutes.
                                </p>
                            </div>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="{{portal_url}}/certifications/results" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">View Results</a>
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
                                        <p style="margin: 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:certifications@bda-global.org" style="color: #2563eb; text-decoration: none;">Certifications Support</a>
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
    '["first_name", "certification_type", "completed_at", "time_taken_minutes", "questions_answered", "total_questions", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Template 9: Exam Passed
-- -----------------------------------------------------------------------------
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'exam_passed',
    'Exam Passed - Congratulations!',
    'certification',
    'Congratulations! You Passed the {{certification_type}} Exam!',
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
                            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 30px; margin-bottom: 30px; text-align: center;">
                                <span style="font-size: 64px;">🏆</span>
                                <h1 style="color: #ffffff; font-size: 28px; margin: 15px 0 5px 0;">Congratulations!</h1>
                                <p style="color: #d1fae5; font-size: 18px; margin: 0;">You are now a certified {{certification_type}} professional!</p>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Dear {{first_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                We are thrilled to inform you that you have <strong>successfully passed</strong> the <strong>{{certification_type}} Certification Exam</strong>! This is a significant achievement that demonstrates your expertise in business data analytics.
                            </p>
                            <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border: 2px solid #10b981;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="color: #166534; font-size: 14px; padding: 5px 0;">Your Score:</td>
                                        <td style="color: #166534; font-size: 24px; font-weight: 700; text-align: right;">{{score}}%</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #166534; font-size: 14px; padding: 5px 0;">Passing Score:</td>
                                        <td style="color: #166534; font-size: 16px; font-weight: 600; text-align: right;">{{passing_score}}%</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #166534; font-size: 14px; padding: 5px 0;">Certification Valid Until:</td>
                                        <td style="color: #166534; font-size: 16px; font-weight: 600; text-align: right;">{{expiry_date}}</td>
                                    </tr>
                                </table>
                            </div>
                            <h2 style="color: #1e3a5f; font-size: 18px; margin: 30px 0 15px 0;">Your Benefits</h2>
                            <ul style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Digital certificate and badge for LinkedIn</li>
                                <li>Listing in the BDA Certified Professionals Directory</li>
                                <li>Access to exclusive certified community resources</li>
                                <li>Use of {{certification_type}} designation after your name</li>
                            </ul>
                            <!-- CTA Buttons -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="{{portal_url}}/certifications/certificate/{{certification_id}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); margin: 0 10px 10px 0;">Download Certificate</a>
                                        <a href="{{portal_url}}/certifications/badge/{{certification_id}}" style="display: inline-block; background: #ffffff; color: #2563eb; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; border: 2px solid #2563eb;">Get Digital Badge</a>
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
                                        <p style="margin: 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:certifications@bda-global.org" style="color: #2563eb; text-decoration: none;">Certifications Support</a>
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
    '["first_name", "certification_type", "score", "passing_score", "expiry_date", "certification_id", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Template 10: Exam Failed
-- -----------------------------------------------------------------------------
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'exam_failed',
    'Exam Results - Did Not Pass',
    'certification',
    'Your {{certification_type}} Exam Results',
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
                            <h1 style="color: #1e3a5f; font-size: 24px; margin: 0 0 20px 0;">Your Exam Results</h1>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Dear {{first_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Thank you for taking the <strong>{{certification_type}} Certification Exam</strong>. Unfortunately, you did not achieve the passing score on this attempt.
                            </p>
                            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Your Score:</td>
                                        <td style="color: #1e3a5f; font-size: 20px; font-weight: 700; text-align: right;">{{score}}%</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Required to Pass:</td>
                                        <td style="color: #1e3a5f; font-size: 16px; font-weight: 600; text-align: right;">{{passing_score}}%</td>
                                    </tr>
                                </table>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                Do not be discouraged! Many successful professionals need more than one attempt. Here is how you can prepare for your retake:
                            </p>
                            <h2 style="color: #1e3a5f; font-size: 18px; margin: 30px 0 15px 0;">Recommended Next Steps</h2>
                            <ol style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Review the BoCK domains where you need improvement</li>
                                <li>Practice with additional mock exams</li>
                                <li>Consider joining a study group or taking a prep course</li>
                                <li>Wait the required {{retake_wait_days}} days before retaking</li>
                            </ol>
                            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px 20px; margin: 30px 0; border-radius: 0 6px 6px 0;">
                                <p style="color: #1e40af; font-size: 14px; margin: 0;">
                                    <strong>Retake Policy:</strong> You can retake the exam after {{retake_wait_days}} days. A new exam voucher will be required.
                                </p>
                            </div>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="{{portal_url}}/certifications/prepare" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">Access Study Materials</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                We are here to support you on your certification journey. If you have any questions, please do not hesitate to contact us.
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
                                        <p style="margin: 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:certifications@bda-global.org" style="color: #2563eb; text-decoration: none;">Certifications Support</a>
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
    '["first_name", "certification_type", "score", "passing_score", "retake_wait_days", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- =============================================================================
-- 2. CREATE HELPER FUNCTIONS FOR SENDING EXAM EMAILS
-- =============================================================================

-- Function to send exam-related emails
CREATE OR REPLACE FUNCTION public.send_exam_email(
    p_user_id UUID,
    p_template_key TEXT,
    p_variables JSONB DEFAULT '{}'::jsonb
) RETURNS void AS $$
DECLARE
    v_user RECORD;
    v_template RECORD;
    v_subject TEXT;
    v_body TEXT;
    v_var_key TEXT;
    v_var_value TEXT;
    v_edge_function_url TEXT;
BEGIN
    -- Get user info
    SELECT u.id, u.email, u.first_name, u.last_name
    INTO v_user
    FROM public.users u
    WHERE u.id = p_user_id;

    IF v_user IS NULL THEN
        RAISE WARNING 'User not found: %', p_user_id;
        RETURN;
    END IF;

    -- Get template
    SELECT * INTO v_template
    FROM public.email_templates
    WHERE template_key = p_template_key AND is_active = true;

    IF v_template IS NULL THEN
        RAISE WARNING 'Email template not found or inactive: %', p_template_key;
        RETURN;
    END IF;

    -- Add default variables
    p_variables := p_variables || jsonb_build_object(
        'first_name', COALESCE(v_user.first_name, 'Member'),
        'last_name', COALESCE(v_user.last_name, ''),
        'email', v_user.email,
        'portal_url', 'https://portal.bda-global.org'
    );

    -- Replace variables in subject and body
    v_subject := v_template.subject;
    v_body := v_template.html_body;

    FOR v_var_key, v_var_value IN SELECT * FROM jsonb_each_text(p_variables)
    LOOP
        v_subject := REPLACE(v_subject, '{{' || v_var_key || '}}', COALESCE(v_var_value, ''));
        v_body := REPLACE(v_body, '{{' || v_var_key || '}}', COALESCE(v_var_value, ''));
    END LOOP;

    -- Get Edge Function URL from secrets
    SELECT decrypted_secret INTO v_edge_function_url
    FROM vault.decrypted_secrets
    WHERE name = 'EDGE_FUNCTION_URL';

    -- If no Edge Function URL, try to send via pg_net directly to Resend
    IF v_edge_function_url IS NULL OR v_edge_function_url = '' THEN
        v_edge_function_url := 'https://upmtqqfgvtjbqothaceg.supabase.co/functions/v1/send-email';
    END IF;

    -- Queue email via pg_net
    PERFORM net.http_post(
        url := v_edge_function_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
            'to', v_user.email,
            'subject', v_subject,
            'html', v_body
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. CREATE TRIGGERS FOR EXAM LIFECYCLE
-- =============================================================================

-- Trigger: When exam voucher is assigned to a user
CREATE OR REPLACE FUNCTION public.handle_voucher_assigned()
RETURNS TRIGGER AS $$
BEGIN
    -- Only send if user_id is newly set
    IF NEW.user_id IS NOT NULL AND (OLD.user_id IS NULL OR OLD.user_id != NEW.user_id) THEN
        PERFORM public.send_exam_email(
            NEW.user_id,
            'exam_voucher_issued',
            jsonb_build_object(
                'certification_type', NEW.certification_type::text,
                'voucher_code', NEW.code,
                'expires_at', COALESCE(to_char(NEW.expires_at, 'Month DD, YYYY'), 'No expiration')
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_voucher_assigned ON public.exam_vouchers;
CREATE TRIGGER on_voucher_assigned
    AFTER INSERT OR UPDATE OF user_id ON public.exam_vouchers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_voucher_assigned();

-- Trigger: When exam booking is created (scheduled)
CREATE OR REPLACE FUNCTION public.handle_exam_scheduled()
RETURNS TRIGGER AS $$
DECLARE
    v_quiz RECORD;
BEGIN
    IF NEW.status = 'scheduled' THEN
        -- Get quiz info
        SELECT * INTO v_quiz FROM public.quizzes WHERE id = NEW.quiz_id;

        PERFORM public.send_exam_email(
            NEW.user_id,
            'exam_scheduled',
            jsonb_build_object(
                'certification_type', COALESCE(v_quiz.certification_type::text, 'Certification'),
                'confirmation_code', COALESCE(NEW.confirmation_code, 'N/A'),
                'scheduled_date', to_char(NEW.scheduled_start_time AT TIME ZONE NEW.timezone, 'Day, Month DD, YYYY'),
                'scheduled_time', to_char(NEW.scheduled_start_time AT TIME ZONE NEW.timezone, 'HH24:MI'),
                'timezone', NEW.timezone,
                'duration_minutes', COALESCE(v_quiz.time_limit_minutes::text, '120'),
                'booking_id', NEW.id::text
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_exam_scheduled ON public.exam_bookings;
CREATE TRIGGER on_exam_scheduled
    AFTER INSERT ON public.exam_bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_exam_scheduled();

-- Trigger: When exam attempt status changes
CREATE OR REPLACE FUNCTION public.handle_exam_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_quiz RECORD;
    v_questions_answered INTEGER;
    v_total_questions INTEGER;
    v_certification RECORD;
BEGIN
    -- Get quiz info
    SELECT * INTO v_quiz FROM public.quizzes WHERE id = NEW.quiz_id;

    -- Handle status changes
    CASE NEW.status
        WHEN 'in_progress' THEN
            -- Only send on first start (not resume from pause)
            IF OLD.status = 'not_started' THEN
                PERFORM public.send_exam_email(
                    NEW.user_id,
                    'exam_launched',
                    jsonb_build_object(
                        'certification_type', COALESCE(v_quiz.certification_type::text, 'Certification'),
                        'started_at', to_char(NEW.started_at, 'Month DD, YYYY HH24:MI'),
                        'duration_minutes', COALESCE(v_quiz.time_limit_minutes::text, '120'),
                        'session_id', NEW.session_id::text
                    )
                );
            END IF;

        WHEN 'submitted' THEN
            -- Get answer counts
            SELECT COUNT(*) INTO v_questions_answered
            FROM public.quiz_attempt_answers
            WHERE attempt_id = NEW.id;

            SELECT COUNT(*) INTO v_total_questions
            FROM public.quiz_questions
            WHERE quiz_id = NEW.quiz_id;

            PERFORM public.send_exam_email(
                NEW.user_id,
                'exam_completed',
                jsonb_build_object(
                    'certification_type', COALESCE(v_quiz.certification_type::text, 'Certification'),
                    'completed_at', to_char(NEW.completed_at, 'Month DD, YYYY HH24:MI'),
                    'time_taken_minutes', COALESCE(NEW.time_spent_minutes::text,
                        EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::integer / 60)::text,
                    'questions_answered', v_questions_answered::text,
                    'total_questions', v_total_questions::text
                )
            );

        WHEN 'passed' THEN
            -- Get certification info
            SELECT * INTO v_certification
            FROM public.user_certifications
            WHERE quiz_attempt_id = NEW.id
            ORDER BY issued_date DESC
            LIMIT 1;

            PERFORM public.send_exam_email(
                NEW.user_id,
                'exam_passed',
                jsonb_build_object(
                    'certification_type', COALESCE(v_quiz.certification_type::text, 'Certification'),
                    'score', COALESCE(NEW.score::text, '0'),
                    'passing_score', COALESCE(v_quiz.passing_score_percentage::text, '70'),
                    'expiry_date', COALESCE(to_char(v_certification.expiry_date, 'Month DD, YYYY'),
                        to_char(CURRENT_DATE + INTERVAL '3 years', 'Month DD, YYYY')),
                    'certification_id', COALESCE(v_certification.id::text, NEW.id::text)
                )
            );

        WHEN 'failed' THEN
            PERFORM public.send_exam_email(
                NEW.user_id,
                'exam_failed',
                jsonb_build_object(
                    'certification_type', COALESCE(v_quiz.certification_type::text, 'Certification'),
                    'score', COALESCE(NEW.score::text, '0'),
                    'passing_score', COALESCE(v_quiz.passing_score_percentage::text, '70'),
                    'retake_wait_days', '30'  -- Configure as needed
                )
            );
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_exam_status_change ON public.quiz_attempts;
CREATE TRIGGER on_exam_status_change
    AFTER UPDATE OF status ON public.quiz_attempts
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.handle_exam_status_change();

-- =============================================================================
-- 4. CREATE TRACKING TABLE FOR EXAM REMINDERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.exam_reminder_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.exam_bookings(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL, -- '3_days', 'day_of'
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(booking_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_exam_reminder_notifications_booking
ON public.exam_reminder_notifications(booking_id, reminder_type);

-- =============================================================================
-- 5. CREATE CRON JOB FUNCTION FOR EXAM REMINDERS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_exam_reminders_and_notify()
RETURNS void AS $$
DECLARE
    v_booking RECORD;
    v_quiz RECORD;
BEGIN
    -- Send 3-day reminders
    FOR v_booking IN
        SELECT eb.*, u.first_name, u.last_name, u.email
        FROM public.exam_bookings eb
        JOIN public.users u ON u.id = eb.user_id
        WHERE eb.status = 'scheduled'
          AND eb.scheduled_start_time::date = (CURRENT_DATE + INTERVAL '3 days')
          AND NOT EXISTS (
              SELECT 1 FROM public.exam_reminder_notifications ern
              WHERE ern.booking_id = eb.id AND ern.reminder_type = '3_days'
          )
    LOOP
        -- Get quiz info
        SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_booking.quiz_id;

        -- Send 3-day reminder
        PERFORM public.send_exam_email(
            v_booking.user_id,
            'exam_reminder_3_days',
            jsonb_build_object(
                'certification_type', COALESCE(v_quiz.certification_type::text, 'Certification'),
                'scheduled_date', to_char(v_booking.scheduled_start_time AT TIME ZONE v_booking.timezone, 'Day, Month DD, YYYY'),
                'scheduled_time', to_char(v_booking.scheduled_start_time AT TIME ZONE v_booking.timezone, 'HH24:MI'),
                'timezone', v_booking.timezone,
                'confirmation_code', COALESCE(v_booking.confirmation_code, 'N/A')
            )
        );

        -- Record notification sent
        INSERT INTO public.exam_reminder_notifications (booking_id, reminder_type)
        VALUES (v_booking.id, '3_days')
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Send day-of reminders (morning of exam day)
    FOR v_booking IN
        SELECT eb.*, u.first_name, u.last_name, u.email
        FROM public.exam_bookings eb
        JOIN public.users u ON u.id = eb.user_id
        WHERE eb.status = 'scheduled'
          AND eb.scheduled_start_time::date = CURRENT_DATE
          AND NOT EXISTS (
              SELECT 1 FROM public.exam_reminder_notifications ern
              WHERE ern.booking_id = eb.id AND ern.reminder_type = 'day_of'
          )
    LOOP
        -- Get quiz info
        SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_booking.quiz_id;

        -- Send day-of reminder
        PERFORM public.send_exam_email(
            v_booking.user_id,
            'exam_reminder_day_of',
            jsonb_build_object(
                'certification_type', COALESCE(v_quiz.certification_type::text, 'Certification'),
                'scheduled_time', to_char(v_booking.scheduled_start_time AT TIME ZONE v_booking.timezone, 'HH24:MI'),
                'timezone', v_booking.timezone,
                'confirmation_code', COALESCE(v_booking.confirmation_code, 'N/A'),
                'booking_id', v_booking.id::text
            )
        );

        -- Record notification sent
        INSERT INTO public.exam_reminder_notifications (booking_id, reminder_type)
        VALUES (v_booking.id, 'day_of')
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.send_exam_email(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_exam_reminders_and_notify() TO authenticated;

-- =============================================================================
-- 7. VERIFICATION
-- =============================================================================

DO $$
DECLARE
    v_template_count INTEGER;
BEGIN
    -- Count templates
    SELECT COUNT(*) INTO v_template_count
    FROM public.email_templates
    WHERE category = 'certification';

    RAISE NOTICE '✅ Phase 5: Certification Exam Emails';
    RAISE NOTICE '   Templates created: % certification templates', v_template_count;
    RAISE NOTICE '   Triggers: on_voucher_assigned, on_exam_scheduled, on_exam_status_change';
    RAISE NOTICE '   Cron function: check_exam_reminders_and_notify()';
END $$;

SELECT
    '✅ Phase 5 Complete' as status,
    (SELECT COUNT(*) FROM public.email_templates WHERE category = 'certification') as certification_templates;
