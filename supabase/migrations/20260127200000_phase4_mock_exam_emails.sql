-- =============================================================================
-- Phase 4: Mock Exam Email Templates & Triggers
-- Date: 2026-01-27
-- Description: Email notifications for mock exam system (free and premium)
-- =============================================================================
-- Templates:
--   1. mock_exam_completed_free    - Free mock exam completed
--   2. mock_exam_access_granted    - Premium mock exam access granted
--   3. mock_exam_completed_premium - Premium mock exam passed
--   4. mock_exam_failed_premium    - Premium mock exam failed
-- =============================================================================

-- =============================================================================
-- EMAIL TEMPLATES
-- =============================================================================

-- 1. Free Mock Exam Completed
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'mock_exam_completed_free',
    'Free Mock Exam Completed',
    'mock_exam',
    'Your Free Mock Exam Results - {{exam_title}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock Exam Results</title>
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
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Mock Exam Complete!</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Youve completed the free mock exam: <strong>{{exam_title}}</strong>
                            </p>

                            <!-- Results Box -->
                            <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background-color: {{result_bg_color}}; border-radius: 8px; padding: 25px; text-align: center;">
                                        <p style="color: {{result_text_color}}; font-size: 48px; font-weight: bold; margin: 0;">{{score}}%</p>
                                        <p style="color: {{result_text_color}}; font-size: 18px; margin: 10px 0 0;">{{result_status}}</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Stats -->
                            <table role="presentation" style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Time Spent:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{time_spent}} minutes</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Passing Score:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{passing_score}}%</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px;">
                                        <span style="color: #666666;">Exam Category:</span>
                                    </td>
                                    <td style="padding: 10px; text-align: right;">
                                        <strong style="color: #333333;">{{exam_category}}</strong>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                {{#if passed}}
                                Great job! You passed this practice exam. Consider trying our premium mock exams for a more comprehensive assessment.
                                {{else}}
                                Dont be discouraged! Review the areas where you need improvement and try again. Practice makes perfect!
                                {{/if}}
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{portal_url}}/mock-exams" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">View All Mock Exams</a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                                Ready for the real certification exam? <a href="{{portal_url}}/certifications" style="color: #2563eb;">Explore our certification tracks</a>.
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
    '["first_name", "exam_title", "score", "passed", "result_status", "result_bg_color", "result_text_color", "time_spent", "passing_score", "exam_category", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 2. Premium Mock Exam Access Granted
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'mock_exam_access_granted',
    'Premium Mock Exam Access Granted',
    'mock_exam',
    'Your Premium Mock Exam Access is Ready - {{exam_title}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Access Granted</title>
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
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Premium Access Unlocked!</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Great news! You now have access to the premium mock exam:
                            </p>

                            <!-- Exam Card -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border-radius: 8px; padding: 25px; border-left: 4px solid #7c3aed;">
                                        <p style="color: #7c3aed; font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 0 0 8px;">Premium Mock Exam</p>
                                        <p style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 0 0 10px;">{{exam_title}}</p>
                                        <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                            {{exam_category}} | {{total_questions}} Questions | {{duration_minutes}} Minutes
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                This premium exam provides a comprehensive assessment of your knowledge and skills. Its designed to simulate the actual certification exam experience.
                            </p>

                            <!-- Access Info -->
                            <table role="presentation" style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Access Granted:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{granted_date}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px;">
                                        <span style="color: #666666;">Access Type:</span>
                                    </td>
                                    <td style="padding: 10px; text-align: right;">
                                        <strong style="color: #22c55e;">{{access_type}}</strong>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{portal_url}}/mock-exams/{{exam_id}}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Start Mock Exam</a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                                Take your time to prepare before starting. Good luck!
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
    '["first_name", "exam_title", "exam_id", "exam_category", "total_questions", "duration_minutes", "granted_date", "access_type", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 3. Premium Mock Exam Completed (Passed)
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'mock_exam_completed_premium',
    'Premium Mock Exam Passed',
    'mock_exam',
    'Congratulations! You Passed {{exam_title}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Mock Exam Passed</title>
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
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Excellent Work!</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Congratulations! You have <strong style="color: #059669;">passed</strong> the premium mock exam:
                            </p>

                            <!-- Results Box -->
                            <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 8px; padding: 30px; text-align: center; border: 2px solid #22c55e;">
                                        <p style="color: #166534; font-size: 14px; text-transform: uppercase; font-weight: bold; margin: 0 0 10px;">{{exam_title}}</p>
                                        <p style="color: #15803d; font-size: 56px; font-weight: bold; margin: 0;">{{score}}%</p>
                                        <p style="color: #166534; font-size: 18px; font-weight: bold; margin: 10px 0 0;">PASSED</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Stats -->
                            <table role="presentation" style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Time Spent:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{time_spent}} minutes</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Passing Score:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{passing_score}}%</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Correct Answers:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{points_earned}} / {{total_points}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px;">
                                        <span style="color: #666666;">Completed:</span>
                                    </td>
                                    <td style="padding: 10px; text-align: right;">
                                        <strong style="color: #333333;">{{completed_date}}</strong>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                This excellent performance indicates youre well-prepared for the actual certification exam. Consider scheduling your official exam soon!
                            </p>

                            <!-- CTA Buttons -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{portal_url}}/certifications" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); margin-right: 10px;">Schedule Certification Exam</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align: center; padding-top: 15px;">
                                        <a href="{{portal_url}}/mock-exams/{{attempt_id}}/review" style="color: #2563eb; text-decoration: none; font-size: 14px;">Review Your Answers</a>
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
    '["first_name", "exam_title", "score", "time_spent", "passing_score", "points_earned", "total_points", "completed_date", "attempt_id", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 4. Premium Mock Exam Failed
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'mock_exam_failed_premium',
    'Premium Mock Exam Failed',
    'mock_exam',
    'Your {{exam_title}} Results - Keep Practicing!',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Mock Exam Results</title>
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
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Mock Exam Complete</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Youve completed the premium mock exam: <strong>{{exam_title}}</strong>
                            </p>

                            <!-- Results Box -->
                            <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 8px; padding: 30px; text-align: center; border: 2px solid #f87171;">
                                        <p style="color: #991b1b; font-size: 14px; text-transform: uppercase; font-weight: bold; margin: 0 0 10px;">{{exam_title}}</p>
                                        <p style="color: #dc2626; font-size: 56px; font-weight: bold; margin: 0;">{{score}}%</p>
                                        <p style="color: #991b1b; font-size: 16px; margin: 10px 0 0;">Required: {{passing_score}}%</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Stats -->
                            <table role="presentation" style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Time Spent:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{time_spent}} minutes</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Correct Answers:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{points_earned}} / {{total_points}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px;">
                                        <span style="color: #666666;">Completed:</span>
                                    </td>
                                    <td style="padding: 10px; text-align: right;">
                                        <strong style="color: #333333;">{{completed_date}}</strong>
                                    </td>
                                </tr>
                            </table>

                            <!-- Encouragement Box -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background-color: #eff6ff; border-radius: 8px; padding: 20px; border-left: 4px solid #2563eb;">
                                        <p style="color: #1e40af; font-size: 14px; font-weight: bold; margin: 0 0 10px;">Dont Give Up!</p>
                                        <p style="color: #1e3a8a; font-size: 14px; line-height: 1.5; margin: 0;">
                                            This mock exam is designed to challenge you and identify areas for improvement. Review your answers, study the explanations, and try again when youre ready.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Buttons -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{portal_url}}/mock-exams/{{attempt_id}}/review" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Review Your Answers</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align: center; padding-top: 15px;">
                                        <a href="{{portal_url}}/learning" style="color: #2563eb; text-decoration: none; font-size: 14px;">Access Study Materials</a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                                Remember: Many successful certified professionals didnt pass their first practice exam. Keep studying!
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
    '["first_name", "exam_title", "score", "passing_score", "time_spent", "points_earned", "total_points", "completed_date", "attempt_id", "portal_url"]'::jsonb,
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
-- HELPER FUNCTION: Send Mock Exam Email
-- =============================================================================

CREATE OR REPLACE FUNCTION send_mock_exam_email(
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

    RAISE NOTICE 'Mock exam email queued: % to %', p_template_key, v_user.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGER: On Mock Exam Attempt Completed
-- Handles both free and premium exams
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_mock_exam_attempt_completed()
RETURNS TRIGGER AS $$
DECLARE
    v_exam RECORD;
    v_user RECORD;
    v_template_key TEXT;
    v_variables JSONB;
    v_result_status TEXT;
    v_result_bg_color TEXT;
    v_result_text_color TEXT;
BEGIN
    -- Get exam details
    SELECT me.*,
           CASE WHEN me.category = 'cp' THEN 'CP (Certified Professional)'
                WHEN me.category = 'scp' THEN 'SCP (Senior Certified Professional)'
                ELSE 'General' END as category_name
    INTO v_exam
    FROM public.mock_exams me
    WHERE me.id = NEW.exam_id;

    IF v_exam IS NULL THEN
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

    -- Determine template based on exam type and result
    IF v_exam.is_premium THEN
        -- Premium exam
        IF NEW.passed THEN
            v_template_key := 'mock_exam_completed_premium';
        ELSE
            v_template_key := 'mock_exam_failed_premium';
        END IF;

        v_variables := jsonb_build_object(
            'first_name', COALESCE(v_user.first_name, 'Member'),
            'exam_title', v_exam.title,
            'score', NEW.score,
            'passing_score', v_exam.passing_score,
            'time_spent', NEW.time_spent_minutes,
            'points_earned', NEW.total_points_earned,
            'total_points', NEW.total_points_possible,
            'completed_date', TO_CHAR(NEW.completed_at, 'Month DD, YYYY'),
            'attempt_id', NEW.id
        );
    ELSE
        -- Free exam
        v_template_key := 'mock_exam_completed_free';

        -- Set result styling
        IF NEW.passed THEN
            v_result_status := 'PASSED';
            v_result_bg_color := '#dcfce7';
            v_result_text_color := '#166534';
        ELSE
            v_result_status := 'NEEDS IMPROVEMENT';
            v_result_bg_color := '#fef2f2';
            v_result_text_color := '#991b1b';
        END IF;

        v_variables := jsonb_build_object(
            'first_name', COALESCE(v_user.first_name, 'Member'),
            'exam_title', v_exam.title,
            'score', NEW.score,
            'passed', NEW.passed,
            'result_status', v_result_status,
            'result_bg_color', v_result_bg_color,
            'result_text_color', v_result_text_color,
            'time_spent', NEW.time_spent_minutes,
            'passing_score', v_exam.passing_score,
            'exam_category', v_exam.category_name
        );
    END IF;

    -- Send email
    PERFORM send_mock_exam_email(NEW.user_id, v_template_key, v_variables);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_mock_exam_attempt_completed ON public.mock_exam_attempts;

-- Create trigger
CREATE TRIGGER on_mock_exam_attempt_completed
    AFTER INSERT ON public.mock_exam_attempts
    FOR EACH ROW
    EXECUTE FUNCTION handle_mock_exam_attempt_completed();

-- =============================================================================
-- TRIGGER: On Premium Access Granted
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_mock_exam_premium_access_granted()
RETURNS TRIGGER AS $$
DECLARE
    v_exam RECORD;
    v_user RECORD;
    v_variables JSONB;
    v_access_type TEXT;
BEGIN
    -- Get exam details
    SELECT me.*,
           CASE WHEN me.category = 'cp' THEN 'CP (Certified Professional)'
                WHEN me.category = 'scp' THEN 'SCP (Senior Certified Professional)'
                ELSE 'General' END as category_name
    INTO v_exam
    FROM public.mock_exams me
    WHERE me.id = NEW.mock_exam_id;

    IF v_exam IS NULL THEN
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

    -- Determine access type
    IF NEW.woocommerce_order_id IS NOT NULL THEN
        v_access_type := 'Purchase';
    ELSE
        v_access_type := 'Admin Grant';
    END IF;

    -- Lifetime or expiring?
    IF NEW.expires_at IS NULL THEN
        v_access_type := v_access_type || ' (Lifetime)';
    ELSE
        v_access_type := v_access_type || ' (Until ' || TO_CHAR(NEW.expires_at, 'Mon DD, YYYY') || ')';
    END IF;

    v_variables := jsonb_build_object(
        'first_name', COALESCE(v_user.first_name, 'Member'),
        'exam_title', v_exam.title,
        'exam_id', v_exam.id,
        'exam_category', v_exam.category_name,
        'total_questions', v_exam.total_questions,
        'duration_minutes', v_exam.duration_minutes,
        'granted_date', TO_CHAR(NEW.granted_at, 'Month DD, YYYY'),
        'access_type', v_access_type
    );

    -- Send email
    PERFORM send_mock_exam_email(NEW.user_id, 'mock_exam_access_granted', v_variables);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_mock_exam_premium_access_granted ON public.mock_exam_premium_access;

-- Create trigger
CREATE TRIGGER on_mock_exam_premium_access_granted
    AFTER INSERT ON public.mock_exam_premium_access
    FOR EACH ROW
    EXECUTE FUNCTION handle_mock_exam_premium_access_granted();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Phase 4: Mock Exam Emails';
    RAISE NOTICE '   Templates created: 4 mock exam templates';
    RAISE NOTICE '   Triggers: on_mock_exam_attempt_completed, on_mock_exam_premium_access_granted';
END $$;
