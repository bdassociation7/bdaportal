-- ============================================================================
-- EXAM GOVERNANCE ENHANCED
-- ============================================================================
-- Implements missing exam governance features:
-- - 6-hour and 1-hour exam reminders
-- - No-show detection and automatic booking cancellation
-- - "Exam missed" notification email
-- - Rescheduling limits (only 1 retry allowed after no-show)
-- - Voucher forfeiture after repeated no-shows
-- ============================================================================

-- ============================================================================
-- PART 1: SCHEMA CHANGES
-- ============================================================================

-- Add no_show_count to exam_vouchers to track repeated no-shows
ALTER TABLE public.exam_vouchers
ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0;

-- Add comment explaining the field
COMMENT ON COLUMN public.exam_vouchers.no_show_count IS 'Number of times candidate has been a no-show. Voucher is forfeited after 2 no-shows.';

-- ============================================================================
-- PART 2: EMAIL TEMPLATES
-- ============================================================================

-- Template: 6-Hour Exam Reminder
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'exam_reminder_6_hours',
    '6-Hour Exam Reminder',
    'exam',
    '⏰ 6 Hours Until Your BDA Certification Exam',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; text-align: center;">
                            <img src="https://bfryvbxpcsprxfmhypqp.supabase.co/storage/v1/object/public/assets/bda-logo-white.png" alt="BDA Logo" style="height: 60px; margin-bottom: 15px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⏰ 6 Hours to Go!</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Your <strong>{{exam_type}}</strong> certification exam is starting in <strong>6 hours</strong>!
                            </p>

                            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                                <h3 style="color: #856404; margin: 0 0 15px 0;">📋 Final Checklist</h3>
                                <ul style="color: #856404; margin: 0; padding-left: 20px;">
                                    <li style="margin-bottom: 8px;">✓ Ensure stable internet connection</li>
                                    <li style="margin-bottom: 8px;">✓ Close all unnecessary applications</li>
                                    <li style="margin-bottom: 8px;">✓ Have your ID ready for verification</li>
                                    <li style="margin-bottom: 8px;">✓ Find a quiet, well-lit room</li>
                                    <li style="margin-bottom: 8px;">✓ Test your webcam and microphone</li>
                                </ul>
                            </div>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <tr>
                                    <td>
                                        <p style="color: #666666; font-size: 14px; margin: 0;"><strong>Exam Date:</strong> {{exam_date}}</p>
                                        <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;"><strong>Exam Time:</strong> {{exam_time}}</p>
                                        <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;"><strong>Booking ID:</strong> {{booking_id}}</p>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                                <p style="color: #721c24; margin: 0; font-size: 14px;">
                                    <strong>⚠️ Important:</strong> Missing your exam without prior cancellation will be recorded as a no-show and may affect your voucher eligibility.
                                </p>
                            </div>

                            <p style="text-align: center; margin: 30px 0;">
                                <a href="{{portal_url}}/exams/bookings" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold;">View Exam Details</a>
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">Good luck on your exam!</p>
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                <a href="{{portal_url}}" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                <a href="mailto:support@bda-global.org" style="color: #2563eb; text-decoration: none;">Support</a>
                            </p>
                            <p style="color: #999999; font-size: 11px; margin: 15px 0 0 0;">© 2026 Business Data Analytics Association. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    '["first_name", "exam_type", "exam_date", "exam_time", "booking_id", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active;

-- Template: 1-Hour Exam Reminder
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'exam_reminder_1_hour',
    '1-Hour Exam Reminder',
    'exam',
    '🚨 1 Hour Until Your BDA Certification Exam - Get Ready!',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); padding: 30px; text-align: center;">
                            <img src="https://bfryvbxpcsprxfmhypqp.supabase.co/storage/v1/object/public/assets/bda-logo-white.png" alt="BDA Logo" style="height: 60px; margin-bottom: 15px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🚨 1 HOUR TO GO!</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 18px; line-height: 1.6; margin: 0 0 20px 0; font-weight: bold;">
                                Your <strong>{{exam_type}}</strong> certification exam starts in <span style="color: #dc3545;">1 HOUR</span>!
                            </p>

                            <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                                <h3 style="color: #155724; margin: 0 0 10px 0;">✅ You should now:</h3>
                                <p style="color: #155724; margin: 0; font-size: 16px;">
                                    Be at your computer, ready to launch the exam when it''s time.
                                </p>
                            </div>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e7f3ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <p style="color: #0056b3; font-size: 20px; margin: 0; font-weight: bold;">{{exam_time}}</p>
                                        <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;">{{exam_date}}</p>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                                <p style="color: #721c24; margin: 0; font-size: 14px;">
                                    <strong>⚠️ Last Chance:</strong> If you cannot take the exam, please cancel NOW to avoid a no-show penalty.
                                </p>
                            </div>

                            <p style="text-align: center; margin: 30px 0;">
                                <a href="{{portal_url}}/exams/bookings" style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 5px; font-weight: bold; font-size: 18px;">Go to Exam Portal</a>
                            </p>

                            <p style="color: #666666; font-size: 14px; text-align: center; margin-top: 30px;">
                                Booking ID: {{booking_id}}
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #666666; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">You''ve got this! 💪</p>
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                <a href="{{portal_url}}" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                <a href="mailto:support@bda-global.org" style="color: #2563eb; text-decoration: none;">Support</a>
                            </p>
                            <p style="color: #999999; font-size: 11px; margin: 15px 0 0 0;">© 2026 Business Data Analytics Association. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    '["first_name", "exam_type", "exam_date", "exam_time", "booking_id", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active;

-- Template: Exam Missed (No-Show)
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'exam_missed',
    'Exam Missed (No-Show)',
    'exam',
    '❌ You Missed Your BDA Certification Exam',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%); padding: 30px; text-align: center;">
                            <img src="https://bfryvbxpcsprxfmhypqp.supabase.co/storage/v1/object/public/assets/bda-logo-white.png" alt="BDA Logo" style="height: 60px; margin-bottom: 15px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Exam Missed</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Unfortunately, you did not attend your scheduled <strong>{{exam_type}}</strong> certification exam.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <tr>
                                    <td>
                                        <p style="color: #666666; font-size: 14px; margin: 0;"><strong>Scheduled Date:</strong> {{exam_date}}</p>
                                        <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;"><strong>Scheduled Time:</strong> {{exam_time}}</p>
                                        <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;"><strong>Booking ID:</strong> {{booking_id}}</p>
                                        <p style="color: #dc3545; font-size: 14px; margin: 10px 0 0 0;"><strong>Status:</strong> No-Show</p>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                                <h3 style="color: #856404; margin: 0 0 10px 0;">What This Means</h3>
                                <p style="color: #856404; margin: 0; font-size: 14px;">
                                    This no-show has been recorded on your account. You have <strong>{{remaining_attempts}}</strong> more chance(s) to reschedule before your voucher is forfeited.
                                </p>
                            </div>

                            <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                                <h3 style="color: #155724; margin: 0 0 10px 0;">✅ You Can Still Reschedule</h3>
                                <p style="color: #155724; margin: 0; font-size: 14px;">
                                    Your voucher is still valid. Please reschedule your exam as soon as possible.
                                </p>
                            </div>

                            <p style="text-align: center; margin: 30px 0;">
                                <a href="{{portal_url}}/exams/schedule" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold;">Reschedule Your Exam</a>
                            </p>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 25px 0 0 0;">
                                If you experienced a technical issue or emergency, please contact our support team immediately with documentation.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                <a href="{{portal_url}}" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                <a href="mailto:support@bda-global.org" style="color: #2563eb; text-decoration: none;">Support</a>
                            </p>
                            <p style="color: #999999; font-size: 11px; margin: 15px 0 0 0;">© 2026 Business Data Analytics Association. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    '["first_name", "exam_type", "exam_date", "exam_time", "booking_id", "remaining_attempts", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active;

-- Template: Last Reschedule Warning
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'exam_last_reschedule_warning',
    'Final Exam Attempt Warning',
    'exam',
    '⚠️ Final Warning: This is Your Last Exam Attempt',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center;">
                            <img src="https://bfryvbxpcsprxfmhypqp.supabase.co/storage/v1/object/public/assets/bda-logo-white.png" alt="BDA Logo" style="height: 60px; margin-bottom: 15px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ FINAL ATTEMPT WARNING</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Your <strong>{{exam_type}}</strong> exam has been rescheduled. However, due to a previous no-show, <span style="color: #dc3545; font-weight: bold;">this is your FINAL attempt</span>.
                            </p>

                            <div style="background-color: #f8d7da; border: 2px solid #dc3545; padding: 25px; margin: 25px 0; border-radius: 8px; text-align: center;">
                                <p style="color: #721c24; margin: 0; font-size: 18px; font-weight: bold;">
                                    🚨 If you miss this exam, your voucher will be PERMANENTLY FORFEITED
                                </p>
                            </div>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e7f3ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <p style="color: #0056b3; font-size: 14px; margin: 0;">YOUR FINAL EXAM DATE</p>
                                        <p style="color: #0056b3; font-size: 24px; margin: 10px 0; font-weight: bold;">{{exam_date}}</p>
                                        <p style="color: #0056b3; font-size: 20px; margin: 0;">{{exam_time}}</p>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                                <h3 style="color: #856404; margin: 0 0 15px 0;">📋 Ensure You''re Ready:</h3>
                                <ul style="color: #856404; margin: 0; padding-left: 20px;">
                                    <li style="margin-bottom: 8px;">Mark this date in your calendar NOW</li>
                                    <li style="margin-bottom: 8px;">Set multiple reminders (phone, email, calendar)</li>
                                    <li style="margin-bottom: 8px;">Prepare your exam environment in advance</li>
                                    <li style="margin-bottom: 8px;">Have a backup internet connection ready</li>
                                    <li style="margin-bottom: 8px;">If ANY conflict arises, contact support IMMEDIATELY</li>
                                </ul>
                            </div>

                            <p style="text-align: center; margin: 30px 0;">
                                <a href="{{portal_url}}/exams/bookings" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold;">View Exam Details</a>
                            </p>

                            <p style="color: #666666; font-size: 14px; margin-top: 25px;">
                                Booking ID: {{booking_id}}
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                <a href="{{portal_url}}" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                <a href="mailto:support@bda-global.org" style="color: #2563eb; text-decoration: none;">Support</a>
                            </p>
                            <p style="color: #999999; font-size: 11px; margin: 15px 0 0 0;">© 2026 Business Data Analytics Association. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    '["first_name", "exam_type", "exam_date", "exam_time", "booking_id", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active;

-- Template: Voucher Forfeited
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'exam_voucher_forfeited',
    'Exam Voucher Forfeited',
    'exam',
    '🚫 Your BDA Exam Voucher Has Been Forfeited',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #343a40 0%, #212529 100%); padding: 30px; text-align: center;">
                            <img src="https://bfryvbxpcsprxfmhypqp.supabase.co/storage/v1/object/public/assets/bda-logo-white.png" alt="BDA Logo" style="height: 60px; margin-bottom: 15px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Voucher Forfeited</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                We regret to inform you that your <strong>{{exam_type}}</strong> exam voucher has been <strong>permanently forfeited</strong> due to repeated no-shows.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <tr>
                                    <td>
                                        <p style="color: #666666; font-size: 14px; margin: 0;"><strong>Voucher Code:</strong> {{voucher_code}}</p>
                                        <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;"><strong>Exam Type:</strong> {{exam_type}}</p>
                                        <p style="color: #dc3545; font-size: 14px; margin: 10px 0 0 0;"><strong>Status:</strong> Revoked</p>
                                        <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;"><strong>Reason:</strong> 2 consecutive no-shows</p>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                                <h3 style="color: #721c24; margin: 0 0 10px 0;">What This Means</h3>
                                <p style="color: #721c24; margin: 0; font-size: 14px;">
                                    This voucher can no longer be used to schedule an exam. You will need to purchase a new voucher if you wish to take the certification exam.
                                </p>
                            </div>

                            <div style="background-color: #e7f3ff; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                                <h3 style="color: #0056b3; margin: 0 0 10px 0;">Need to Appeal?</h3>
                                <p style="color: #0056b3; margin: 0; font-size: 14px;">
                                    If you believe this forfeiture was due to exceptional circumstances (medical emergency, technical failure on our end, etc.), you may submit an appeal to our support team with supporting documentation.
                                </p>
                            </div>

                            <p style="text-align: center; margin: 30px 0;">
                                <a href="mailto:support@bda-global.org?subject=Voucher%20Appeal%20-%20{{voucher_code}}" style="display: inline-block; background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold;">Contact Support</a>
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                <a href="{{portal_url}}" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                <a href="mailto:support@bda-global.org" style="color: #2563eb; text-decoration: none;">Support</a>
                            </p>
                            <p style="color: #999999; font-size: 11px; margin: 15px 0 0 0;">© 2026 Business Data Analytics Association. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    '["first_name", "exam_type", "voucher_code", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- PART 3: NOTIFICATION TRACKING TABLE
-- ============================================================================

-- Track which reminders have been sent to prevent duplicates
CREATE TABLE IF NOT EXISTS public.exam_reminder_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.exam_bookings(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL, -- '6_hour', '1_hour'
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(booking_id, reminder_type)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_exam_reminder_notifications_booking
ON public.exam_reminder_notifications(booking_id);

-- ============================================================================
-- PART 4: BUSINESS LOGIC FUNCTIONS
-- ============================================================================

-- Function to send email via Edge Function
CREATE OR REPLACE FUNCTION public.send_exam_governance_email(
    p_user_id UUID,
    p_template_key TEXT,
    p_variables JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_edge_function_url TEXT;
BEGIN
    -- Get Edge Function URL from app settings
    SELECT value INTO v_edge_function_url
    FROM public.app_settings
    WHERE key = 'edge_function_base_url';

    IF v_edge_function_url IS NULL THEN
        v_edge_function_url := 'https://bfryvbxpcsprxfmhypqp.supabase.co/functions/v1';
    END IF;

    -- Queue email via Edge Function
    PERFORM net.http_post(
        url := v_edge_function_url || '/send-email',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
            'user_id', p_user_id,
            'template_key', p_template_key,
            'variables', p_variables
        )
    );
END;
$$;

-- Function to handle no-show detection and booking cancellation
CREATE OR REPLACE FUNCTION public.process_exam_no_shows()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
    v_voucher RECORD;
    v_user RECORD;
    v_no_show_count INTEGER;
    v_remaining_attempts INTEGER;
    v_can_reschedule BOOLEAN;
    v_portal_url TEXT := 'https://portal.bda-global.org';
BEGIN
    -- Find all scheduled bookings where exam time has passed by more than 30 minutes
    -- and exam was never launched
    FOR v_booking IN
        SELECT
            eb.id AS booking_id,
            eb.user_id,
            eb.voucher_id,
            eb.scheduled_time,
            ev.exam_type,
            ev.code AS voucher_code,
            ev.no_show_count
        FROM public.exam_bookings eb
        JOIN public.exam_vouchers ev ON eb.voucher_id = ev.id
        WHERE eb.status = 'scheduled'
        AND eb.scheduled_time < (NOW() - INTERVAL '30 minutes')
        AND NOT EXISTS (
            SELECT 1 FROM public.exam_sessions es
            WHERE es.booking_id = eb.id
        )
    LOOP
        -- Get user details
        SELECT first_name, last_name, email INTO v_user
        FROM public.profiles
        WHERE id = v_booking.user_id;

        -- Calculate new no-show count
        v_no_show_count := COALESCE(v_booking.no_show_count, 0) + 1;
        v_remaining_attempts := GREATEST(0, 2 - v_no_show_count);
        v_can_reschedule := v_no_show_count < 2;

        -- Update booking status to no_show
        UPDATE public.exam_bookings
        SET status = 'no_show',
            updated_at = NOW()
        WHERE id = v_booking.booking_id;

        -- Update voucher no_show_count
        UPDATE public.exam_vouchers
        SET no_show_count = v_no_show_count,
            updated_at = NOW()
        WHERE id = v_booking.voucher_id;

        -- Send exam missed notification
        PERFORM public.send_exam_governance_email(
            v_booking.user_id,
            'exam_missed',
            jsonb_build_object(
                'first_name', v_user.first_name,
                'exam_type', v_booking.exam_type,
                'exam_date', TO_CHAR(v_booking.scheduled_time AT TIME ZONE 'UTC', 'Month DD, YYYY'),
                'exam_time', TO_CHAR(v_booking.scheduled_time AT TIME ZONE 'UTC', 'HH24:MI') || ' UTC',
                'booking_id', v_booking.booking_id,
                'remaining_attempts', v_remaining_attempts,
                'portal_url', v_portal_url
            )
        );

        -- If this was the second no-show, forfeit the voucher
        IF v_no_show_count >= 2 THEN
            UPDATE public.exam_vouchers
            SET status = 'revoked',
                updated_at = NOW()
            WHERE id = v_booking.voucher_id;

            -- Send voucher forfeited notification
            PERFORM public.send_exam_governance_email(
                v_booking.user_id,
                'exam_voucher_forfeited',
                jsonb_build_object(
                    'first_name', v_user.first_name,
                    'exam_type', v_booking.exam_type,
                    'voucher_code', v_booking.voucher_code,
                    'portal_url', v_portal_url
                )
            );
        END IF;

        -- Log the action
        INSERT INTO public.email_logs (user_id, template_key, status, metadata)
        VALUES (
            v_booking.user_id,
            'exam_no_show_processed',
            'processed',
            jsonb_build_object(
                'booking_id', v_booking.booking_id,
                'voucher_id', v_booking.voucher_id,
                'no_show_count', v_no_show_count,
                'voucher_forfeited', v_no_show_count >= 2
            )
        );
    END LOOP;
END;
$$;

-- Function to send 6-hour and 1-hour reminders
CREATE OR REPLACE FUNCTION public.send_exam_hour_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
    v_user RECORD;
    v_portal_url TEXT := 'https://portal.bda-global.org';
    v_reminder_type TEXT;
BEGIN
    -- Find bookings that need 6-hour reminder (between 5.5 and 6.5 hours from now)
    FOR v_booking IN
        SELECT
            eb.id AS booking_id,
            eb.user_id,
            eb.scheduled_time,
            ev.exam_type
        FROM public.exam_bookings eb
        JOIN public.exam_vouchers ev ON eb.voucher_id = ev.id
        WHERE eb.status IN ('scheduled', 'rescheduled')
        AND eb.scheduled_time BETWEEN (NOW() + INTERVAL '5 hours 30 minutes')
                                   AND (NOW() + INTERVAL '6 hours 30 minutes')
        AND NOT EXISTS (
            SELECT 1 FROM public.exam_reminder_notifications ern
            WHERE ern.booking_id = eb.id AND ern.reminder_type = '6_hour'
        )
    LOOP
        -- Get user details
        SELECT first_name INTO v_user
        FROM public.profiles
        WHERE id = v_booking.user_id;

        -- Send 6-hour reminder
        PERFORM public.send_exam_governance_email(
            v_booking.user_id,
            'exam_reminder_6_hours',
            jsonb_build_object(
                'first_name', v_user.first_name,
                'exam_type', v_booking.exam_type,
                'exam_date', TO_CHAR(v_booking.scheduled_time AT TIME ZONE 'UTC', 'Month DD, YYYY'),
                'exam_time', TO_CHAR(v_booking.scheduled_time AT TIME ZONE 'UTC', 'HH24:MI') || ' UTC',
                'booking_id', v_booking.booking_id,
                'portal_url', v_portal_url
            )
        );

        -- Mark reminder as sent
        INSERT INTO public.exam_reminder_notifications (booking_id, reminder_type)
        VALUES (v_booking.booking_id, '6_hour')
        ON CONFLICT (booking_id, reminder_type) DO NOTHING;
    END LOOP;

    -- Find bookings that need 1-hour reminder (between 30 minutes and 1.5 hours from now)
    FOR v_booking IN
        SELECT
            eb.id AS booking_id,
            eb.user_id,
            eb.scheduled_time,
            ev.exam_type
        FROM public.exam_bookings eb
        JOIN public.exam_vouchers ev ON eb.voucher_id = ev.id
        WHERE eb.status IN ('scheduled', 'rescheduled')
        AND eb.scheduled_time BETWEEN (NOW() + INTERVAL '30 minutes')
                                   AND (NOW() + INTERVAL '1 hour 30 minutes')
        AND NOT EXISTS (
            SELECT 1 FROM public.exam_reminder_notifications ern
            WHERE ern.booking_id = eb.id AND ern.reminder_type = '1_hour'
        )
    LOOP
        -- Get user details
        SELECT first_name INTO v_user
        FROM public.profiles
        WHERE id = v_booking.user_id;

        -- Send 1-hour reminder
        PERFORM public.send_exam_governance_email(
            v_booking.user_id,
            'exam_reminder_1_hour',
            jsonb_build_object(
                'first_name', v_user.first_name,
                'exam_type', v_booking.exam_type,
                'exam_date', TO_CHAR(v_booking.scheduled_time AT TIME ZONE 'UTC', 'Month DD, YYYY'),
                'exam_time', TO_CHAR(v_booking.scheduled_time AT TIME ZONE 'UTC', 'HH24:MI') || ' UTC',
                'booking_id', v_booking.booking_id,
                'portal_url', v_portal_url
            )
        );

        -- Mark reminder as sent
        INSERT INTO public.exam_reminder_notifications (booking_id, reminder_type)
        VALUES (v_booking.booking_id, '1_hour')
        ON CONFLICT (booking_id, reminder_type) DO NOTHING;
    END LOOP;
END;
$$;

-- ============================================================================
-- PART 5: TRIGGER FOR LAST RESCHEDULE WARNING
-- ============================================================================

-- Trigger function to send warning when someone with a no-show reschedules
CREATE OR REPLACE FUNCTION public.on_exam_rescheduled_after_noshow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_voucher RECORD;
    v_user RECORD;
    v_portal_url TEXT := 'https://portal.bda-global.org';
BEGIN
    -- Only trigger on status change to 'rescheduled' or new scheduled booking
    IF (TG_OP = 'UPDATE' AND NEW.status IN ('scheduled', 'rescheduled') AND OLD.status = 'no_show')
       OR (TG_OP = 'INSERT' AND NEW.status = 'scheduled') THEN

        -- Get voucher details including no_show_count
        SELECT ev.*, ev.no_show_count INTO v_voucher
        FROM public.exam_vouchers ev
        WHERE ev.id = NEW.voucher_id;

        -- If voucher has previous no-shows, send final warning
        IF v_voucher.no_show_count >= 1 THEN
            -- Get user details
            SELECT first_name INTO v_user
            FROM public.profiles
            WHERE id = NEW.user_id;

            -- Send last reschedule warning
            PERFORM public.send_exam_governance_email(
                NEW.user_id,
                'exam_last_reschedule_warning',
                jsonb_build_object(
                    'first_name', v_user.first_name,
                    'exam_type', v_voucher.exam_type,
                    'exam_date', TO_CHAR(NEW.scheduled_time AT TIME ZONE 'UTC', 'Month DD, YYYY'),
                    'exam_time', TO_CHAR(NEW.scheduled_time AT TIME ZONE 'UTC', 'HH24:MI') || ' UTC',
                    'booking_id', NEW.id,
                    'portal_url', v_portal_url
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for reschedule warning
DROP TRIGGER IF EXISTS trigger_exam_rescheduled_warning ON public.exam_bookings;
CREATE TRIGGER trigger_exam_rescheduled_warning
    AFTER INSERT OR UPDATE ON public.exam_bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.on_exam_rescheduled_after_noshow();

-- ============================================================================
-- PART 6: FUNCTION TO CHECK RESCHEDULE ELIGIBILITY
-- ============================================================================

-- Function to check if a voucher can be used to reschedule
CREATE OR REPLACE FUNCTION public.can_reschedule_exam(p_voucher_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_voucher RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_voucher
    FROM public.exam_vouchers
    WHERE id = p_voucher_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'can_reschedule', false,
            'reason', 'Voucher not found'
        );
    END IF;

    IF v_voucher.status = 'revoked' THEN
        RETURN jsonb_build_object(
            'can_reschedule', false,
            'reason', 'Voucher has been revoked due to repeated no-shows',
            'no_show_count', v_voucher.no_show_count
        );
    END IF;

    IF v_voucher.status = 'expired' THEN
        RETURN jsonb_build_object(
            'can_reschedule', false,
            'reason', 'Voucher has expired'
        );
    END IF;

    IF v_voucher.no_show_count >= 2 THEN
        RETURN jsonb_build_object(
            'can_reschedule', false,
            'reason', 'Maximum no-shows reached. Voucher will be forfeited.',
            'no_show_count', v_voucher.no_show_count
        );
    END IF;

    RETURN jsonb_build_object(
        'can_reschedule', true,
        'remaining_attempts', 2 - COALESCE(v_voucher.no_show_count, 0),
        'is_final_attempt', v_voucher.no_show_count = 1,
        'no_show_count', COALESCE(v_voucher.no_show_count, 0)
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_reschedule_exam(UUID) TO authenticated;

-- ============================================================================
-- PART 7: CRON JOBS
-- ============================================================================

-- Schedule hourly job for 6h/1h reminders and no-show detection
SELECT cron.schedule(
    'exam-hour-reminders-and-noshow',
    '0 * * * *', -- Every hour at minute 0
    $$
    SELECT public.send_exam_hour_reminders();
    SELECT public.process_exam_no_shows();
    $$
);

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- New Email Templates (5):
--   1. exam_reminder_6_hours - 6 hours before exam
--   2. exam_reminder_1_hour - 1 hour before exam
--   3. exam_missed - When candidate is detected as no-show
--   4. exam_last_reschedule_warning - When rescheduling after a no-show
--   5. exam_voucher_forfeited - When voucher is revoked after 2 no-shows
--
-- Schema Changes:
--   - Added no_show_count to exam_vouchers
--   - Created exam_reminder_notifications tracking table
--
-- Business Logic:
--   - process_exam_no_shows() - Detects and handles no-shows
--   - send_exam_hour_reminders() - Sends 6h and 1h reminders
--   - can_reschedule_exam() - Checks if rescheduling is allowed
--
-- Triggers:
--   - trigger_exam_rescheduled_warning - Sends final warning on reschedule
--
-- Cron Jobs:
--   - Hourly job for reminders and no-show detection
-- ============================================================================
