-- =============================================================================
-- Phase 3: Books & Learning System Email Templates & Triggers
-- Date: 2026-01-27
-- Description: Email notifications for book credits, redemption, and learning system
-- =============================================================================
-- Templates:
--   1. book_credit_granted      - Book credit granted (from membership)
--   2. book_redeemed            - Book redeemed (user selected language)
--   3. book_granted_admin       - Book access granted by admin
--   4. learning_access_granted  - Learning system access granted
--   5. curriculum_completed     - Curriculum fully completed
-- =============================================================================

-- =============================================================================
-- EMAIL TEMPLATES
-- =============================================================================

-- 1. Book Credit Granted (from membership)
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'book_credit_granted',
    'Book Credit Granted',
    'books',
    'Your Book Credit is Ready - {{book_name}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Book Credit Granted</title>
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
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Book Credit Received!</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Great news! As part of your <strong>{{membership_type}}</strong> membership, you have received a book credit.
                            </p>

                            <!-- Book Card -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px; padding: 25px; border-left: 4px solid #0284c7;">
                                        <p style="color: #0369a1; font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 0 0 8px;">Book Credit Available</p>
                                        <p style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 0 0 10px;">{{book_name}}</p>
                                        <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                            Choose your preferred language: <strong>English</strong> or <strong>Arabic</strong>
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                You can redeem this credit at any time to access either the English or Arabic version of the book. Once redeemed, the book will be available in your My Books section.
                            </p>

                            <!-- Validity Info -->
                            <table role="presentation" style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Credit Valid Until:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{valid_until}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px;">
                                        <span style="color: #666666;">Available Languages:</span>
                                    </td>
                                    <td style="padding: 10px; text-align: right;">
                                        <strong style="color: #333333;">English, Arabic</strong>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{portal_url}}/my-books/credits" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Redeem Your Book</a>
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
    '["first_name", "book_name", "membership_type", "valid_until", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 2. Book Redeemed
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'book_redeemed',
    'Book Redeemed',
    'books',
    'Your Book is Ready - {{book_name}} ({{language}})',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Book Redeemed</title>
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
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Book Redeemed!</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                You have successfully redeemed your book credit! Your book is now available.
                            </p>

                            <!-- Book Card -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 8px; padding: 25px; border-left: 4px solid #22c55e;">
                                        <p style="color: #166534; font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 0 0 8px;">Now Available</p>
                                        <p style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 0 0 10px;">{{book_name}}</p>
                                        <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                            Language: <strong>{{language_display}}</strong>
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Access Info -->
                            <table role="presentation" style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Redeemed On:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{redeemed_date}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px;">
                                        <span style="color: #666666;">Access Until:</span>
                                    </td>
                                    <td style="padding: 10px; text-align: right;">
                                        <strong style="color: #333333;">{{access_until}}</strong>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                You can now access your book anytime from the My Books section in your portal.
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{portal_url}}/my-books" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Read Your Book</a>
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
    '["first_name", "book_name", "language", "language_display", "redeemed_date", "access_until", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 3. Book Access Granted by Admin
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'book_granted_admin',
    'Book Access Granted by Admin',
    'books',
    'Book Access Granted - {{book_name}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Book Access Granted</title>
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
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Book Access Granted!</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                A BDA administrator has granted you access to the following book:
                            </p>

                            <!-- Book Card -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border-radius: 8px; padding: 25px; border-left: 4px solid #7c3aed;">
                                        <p style="color: #7c3aed; font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 0 0 8px;">Admin Grant</p>
                                        <p style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 0 0 10px;">{{book_name}}</p>
                                        <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                            Choose: <strong>English</strong> or <strong>Arabic</strong>
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                You can redeem this credit at any time to access either the English or Arabic version of the book.
                            </p>

                            <!-- Validity Info -->
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

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{portal_url}}/my-books/credits" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Redeem Your Book</a>
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
    '["first_name", "book_name", "granted_date", "valid_until", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 4. Learning System Access Granted
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'learning_access_granted',
    'Learning System Access Granted',
    'learning',
    'Your {{certification_type}} Learning Access is Ready!',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Learning Access Granted</title>
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
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Learning Access Unlocked!</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Your access to the <strong>{{certification_type}}</strong> certification learning system has been activated!
                            </p>

                            <!-- Access Card -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%); border-radius: 8px; padding: 25px; border-left: 4px solid #0891b2;">
                                        <p style="color: #0e7490; font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 0 0 8px;">{{certification_type}} Curriculum</p>
                                        <p style="color: #1f2937; font-size: 18px; font-weight: bold; margin: 0 0 10px;">14 Comprehensive Modules</p>
                                        <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                            7 Knowledge-Based + 7 Behavioral Competencies
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- What You Get -->
                            <p style="color: #333333; font-size: 16px; font-weight: bold; margin: 25px 0 15px;">What You Get:</p>
                            <table role="presentation" style="width: 100%; margin: 0 0 25px; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 24px;">
                                        <span style="color: #0891b2; font-size: 16px;">✓</span>
                                    </td>
                                    <td style="padding: 8px 0; color: #333333; font-size: 14px;">
                                        Complete BDA Body of Competency Knowledge (BoCK) curriculum
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 24px;">
                                        <span style="color: #0891b2; font-size: 16px;">✓</span>
                                    </td>
                                    <td style="padding: 8px 0; color: #333333; font-size: 14px;">
                                        Interactive quizzes after each module
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 24px;">
                                        <span style="color: #0891b2; font-size: 16px;">✓</span>
                                    </td>
                                    <td style="padding: 8px 0; color: #333333; font-size: 14px;">
                                        Progress tracking and achievements
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 24px;">
                                        <span style="color: #0891b2; font-size: 16px;">✓</span>
                                    </td>
                                    <td style="padding: 8px 0; color: #333333; font-size: 14px;">
                                        Preparation for the official certification exam
                                    </td>
                                </tr>
                            </table>

                            <!-- Access Info -->
                            <table role="presentation" style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Access Starts:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{purchased_date}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px;">
                                        <span style="color: #666666;">Access Expires:</span>
                                    </td>
                                    <td style="padding: 10px; text-align: right;">
                                        <strong style="color: #333333;">{{expires_date}}</strong>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{portal_url}}/learning" style="display: inline-block; background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Start Learning</a>
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
    '["first_name", "certification_type", "purchased_date", "expires_date", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 5. Curriculum Fully Completed
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'curriculum_completed',
    'Curriculum Completed',
    'learning',
    'Congratulations! You Have Completed the {{certification_type}} Curriculum!',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Curriculum Completed</title>
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
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Curriculum Complete!</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hello {{first_name}},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                <strong>Congratulations!</strong> You have successfully completed all 14 modules of the <strong>{{certification_type}}</strong> curriculum!
                            </p>

                            <!-- Achievement Card -->
                            <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 8px; padding: 30px; text-align: center; border: 2px solid #22c55e;">
                                        <p style="color: #166534; font-size: 48px; margin: 0 0 10px;">🎉</p>
                                        <p style="color: #166534; font-size: 20px; font-weight: bold; margin: 0 0 10px;">{{certification_type}} Curriculum</p>
                                        <p style="color: #15803d; font-size: 16px; margin: 0;">All 14 Modules Completed</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Stats -->
                            <table role="presentation" style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Modules Completed:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #22c55e;">14 / 14</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
                                        <span style="color: #666666;">Total Time Spent:</span>
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                                        <strong style="color: #333333;">{{total_time_spent}}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px;">
                                        <span style="color: #666666;">Completed On:</span>
                                    </td>
                                    <td style="padding: 10px; text-align: right;">
                                        <strong style="color: #333333;">{{completed_date}}</strong>
                                    </td>
                                </tr>
                            </table>

                            <!-- Next Steps Box -->
                            <table role="presentation" style="width: 100%; margin: 25px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background-color: #eff6ff; border-radius: 8px; padding: 20px; border-left: 4px solid #2563eb;">
                                        <p style="color: #1e40af; font-size: 14px; font-weight: bold; margin: 0 0 10px;">Ready for Certification?</p>
                                        <p style="color: #1e3a8a; font-size: 14px; line-height: 1.5; margin: 0;">
                                            Now that youve completed the curriculum, youre ready to take the official {{certification_type}} certification exam. Schedule your exam today!
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Buttons -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{{portal_url}}/certifications/schedule" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">Schedule Certification Exam</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align: center; padding-top: 15px;">
                                        <a href="{{portal_url}}/mock-exams" style="color: #2563eb; text-decoration: none; font-size: 14px;">Take a Mock Exam First</a>
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
    '["first_name", "certification_type", "total_time_spent", "completed_date", "portal_url"]'::jsonb,
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
-- HELPER FUNCTION: Send Books/Learning Email
-- =============================================================================

CREATE OR REPLACE FUNCTION send_books_learning_email(
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

    RAISE NOTICE 'Books/learning email queued: % to %', p_template_key, v_user.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGER: On Book Credit Granted
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_book_credit_granted()
RETURNS TRIGGER AS $$
DECLARE
    v_user RECORD;
    v_membership RECORD;
    v_template_key TEXT;
    v_variables JSONB;
BEGIN
    -- Get user details
    SELECT id, email, first_name, last_name
    INTO v_user
    FROM public.users
    WHERE id = NEW.user_id;

    IF v_user IS NULL THEN
        RETURN NEW;
    END IF;

    -- Determine template based on source type
    IF NEW.source_type = 'membership' THEN
        v_template_key := 'book_credit_granted';

        -- Get membership type
        SELECT membership_type INTO v_membership
        FROM public.user_memberships
        WHERE id::TEXT = NEW.source_id;

        v_variables := jsonb_build_object(
            'first_name', COALESCE(v_user.first_name, 'Member'),
            'book_name', NEW.book_product_group_name,
            'membership_type', COALESCE(v_membership.membership_type::TEXT, 'BDA'),
            'valid_until', COALESCE(TO_CHAR(NEW.valid_until, 'Month DD, YYYY'), 'No Expiry')
        );
    ELSE
        -- Admin grant or other source
        v_template_key := 'book_granted_admin';

        v_variables := jsonb_build_object(
            'first_name', COALESCE(v_user.first_name, 'Member'),
            'book_name', NEW.book_product_group_name,
            'granted_date', TO_CHAR(NEW.created_at, 'Month DD, YYYY'),
            'valid_until', COALESCE(TO_CHAR(NEW.valid_until, 'Month DD, YYYY'), 'No Expiry')
        );
    END IF;

    -- Send email
    PERFORM send_books_learning_email(NEW.user_id, v_template_key, v_variables);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_book_credit_granted ON public.user_book_credits;

-- Create trigger
CREATE TRIGGER on_book_credit_granted
    AFTER INSERT ON public.user_book_credits
    FOR EACH ROW
    EXECUTE FUNCTION handle_book_credit_granted();

-- =============================================================================
-- TRIGGER: On Book Redeemed
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_book_redeemed()
RETURNS TRIGGER AS $$
DECLARE
    v_user RECORD;
    v_variables JSONB;
    v_language_display TEXT;
BEGIN
    -- Get user details
    SELECT id, email, first_name, last_name
    INTO v_user
    FROM public.users
    WHERE id = NEW.user_id;

    IF v_user IS NULL THEN
        RETURN NEW;
    END IF;

    -- Format language for display
    v_language_display := CASE
        WHEN NEW.language = 'en' THEN 'English'
        WHEN NEW.language = 'ar' THEN 'Arabic'
        ELSE NEW.language
    END;

    v_variables := jsonb_build_object(
        'first_name', COALESCE(v_user.first_name, 'Member'),
        'book_name', NEW.product_name,
        'language', NEW.language,
        'language_display', v_language_display,
        'redeemed_date', TO_CHAR(NEW.created_at, 'Month DD, YYYY'),
        'access_until', COALESCE(TO_CHAR(NEW.access_until, 'Month DD, YYYY'), 'Lifetime')
    );

    -- Send email
    PERFORM send_books_learning_email(NEW.user_id, 'book_redeemed', v_variables);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_book_redeemed ON public.user_redeemed_books;

-- Create trigger
CREATE TRIGGER on_book_redeemed
    AFTER INSERT ON public.user_redeemed_books
    FOR EACH ROW
    EXECUTE FUNCTION handle_book_redeemed();

-- =============================================================================
-- TRIGGER: On Learning System Access Granted
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_learning_access_granted()
RETURNS TRIGGER AS $$
DECLARE
    v_user RECORD;
    v_variables JSONB;
    v_cert_display TEXT;
BEGIN
    -- Get user details
    SELECT id, email, first_name, last_name
    INTO v_user
    FROM public.users
    WHERE id = NEW.user_id;

    IF v_user IS NULL THEN
        RETURN NEW;
    END IF;

    -- Format certification type for display
    v_cert_display := CASE
        WHEN NEW.certification_type = 'CP' THEN 'CP (Certified Professional)'
        WHEN NEW.certification_type = 'SCP' THEN 'SCP (Senior Certified Professional)'
        ELSE NEW.certification_type::TEXT
    END;

    v_variables := jsonb_build_object(
        'first_name', COALESCE(v_user.first_name, 'Member'),
        'certification_type', v_cert_display,
        'purchased_date', TO_CHAR(NEW.purchased_at, 'Month DD, YYYY'),
        'expires_date', TO_CHAR(NEW.expires_at, 'Month DD, YYYY')
    );

    -- Send email
    PERFORM send_books_learning_email(NEW.user_id, 'learning_access_granted', v_variables);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_learning_access_granted ON public.user_curriculum_access;

-- Create trigger
CREATE TRIGGER on_learning_access_granted
    AFTER INSERT ON public.user_curriculum_access
    FOR EACH ROW
    EXECUTE FUNCTION handle_learning_access_granted();

-- =============================================================================
-- TRIGGER: On Curriculum Module Completed (Check for Full Completion)
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_curriculum_progress_completed()
RETURNS TRIGGER AS $$
DECLARE
    v_user RECORD;
    v_module RECORD;
    v_total_modules INTEGER;
    v_completed_modules INTEGER;
    v_total_time_minutes INTEGER;
    v_cert_type certification_type;
    v_cert_display TEXT;
    v_variables JSONB;
BEGIN
    -- Only trigger when status changes to 'completed'
    IF NEW.status != 'completed' OR (OLD IS NOT NULL AND OLD.status = 'completed') THEN
        RETURN NEW;
    END IF;

    -- Get module to find certification type
    SELECT * INTO v_module
    FROM public.curriculum_modules
    WHERE id = NEW.module_id;

    IF v_module IS NULL THEN
        RETURN NEW;
    END IF;

    v_cert_type := v_module.certification_type;

    -- Count total and completed modules for this certification
    SELECT COUNT(*) INTO v_total_modules
    FROM public.curriculum_modules
    WHERE certification_type = v_cert_type
    AND is_published = true;

    SELECT COUNT(*) INTO v_completed_modules
    FROM public.user_curriculum_progress ucp
    JOIN public.curriculum_modules cm ON cm.id = ucp.module_id
    WHERE ucp.user_id = NEW.user_id
    AND cm.certification_type = v_cert_type
    AND ucp.status = 'completed';

    -- Check if all modules are completed
    IF v_completed_modules >= v_total_modules AND v_total_modules > 0 THEN
        -- Get user details
        SELECT id, email, first_name, last_name
        INTO v_user
        FROM public.users
        WHERE id = NEW.user_id;

        IF v_user IS NULL THEN
            RETURN NEW;
        END IF;

        -- Calculate total time spent
        SELECT COALESCE(SUM(time_spent_minutes), 0) INTO v_total_time_minutes
        FROM public.user_curriculum_progress ucp
        JOIN public.curriculum_modules cm ON cm.id = ucp.module_id
        WHERE ucp.user_id = NEW.user_id
        AND cm.certification_type = v_cert_type;

        -- Format certification type for display
        v_cert_display := CASE
            WHEN v_cert_type = 'CP' THEN 'CP (Certified Professional)'
            WHEN v_cert_type = 'SCP' THEN 'SCP (Senior Certified Professional)'
            ELSE v_cert_type::TEXT
        END;

        -- Format time spent
        v_variables := jsonb_build_object(
            'first_name', COALESCE(v_user.first_name, 'Member'),
            'certification_type', v_cert_display,
            'total_time_spent', CASE
                WHEN v_total_time_minutes >= 60 THEN
                    (v_total_time_minutes / 60)::TEXT || ' hours ' || (v_total_time_minutes % 60)::TEXT || ' minutes'
                ELSE
                    v_total_time_minutes::TEXT || ' minutes'
            END,
            'completed_date', TO_CHAR(NOW(), 'Month DD, YYYY')
        );

        -- Send curriculum completed email
        PERFORM send_books_learning_email(NEW.user_id, 'curriculum_completed', v_variables);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_curriculum_progress_completed ON public.user_curriculum_progress;

-- Create trigger
CREATE TRIGGER on_curriculum_progress_completed
    AFTER UPDATE ON public.user_curriculum_progress
    FOR EACH ROW
    EXECUTE FUNCTION handle_curriculum_progress_completed();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Phase 3: Books & Learning System Emails';
    RAISE NOTICE '   Templates created: 5 templates';
    RAISE NOTICE '   - book_credit_granted (membership auto-grant)';
    RAISE NOTICE '   - book_redeemed (user selected language)';
    RAISE NOTICE '   - book_granted_admin (admin manual grant)';
    RAISE NOTICE '   - learning_access_granted (curriculum access)';
    RAISE NOTICE '   - curriculum_completed (all 14 modules done)';
    RAISE NOTICE '   Triggers:';
    RAISE NOTICE '   - on_book_credit_granted';
    RAISE NOTICE '   - on_book_redeemed';
    RAISE NOTICE '   - on_learning_access_granted';
    RAISE NOTICE '   - on_curriculum_progress_completed';
END $$;
