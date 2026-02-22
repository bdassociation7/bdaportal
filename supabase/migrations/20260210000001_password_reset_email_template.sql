-- Migration: Ensure password_reset email template exists
-- Date: 2026-02-10
-- Description: Creates or updates the password_reset email template
--              Used by the request-password-reset Edge Function
--              which sends emails via Resend API instead of Supabase Auth SMTP

-- Upsert the password_reset template
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active, created_at, updated_at)
VALUES (
  'password_reset',
  'Password Reset',
  'auth',
  'Reset Your Password - BDA Portal',
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
                            <img src="https://portal.bda-global.org/bda-logo.png" alt="BDA Logo" style="height: 80px; width: auto;">
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h1 style="color: #1e3a5f; font-size: 24px; margin: 0 0 20px 0;">Reset Your Password</h1>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                We received a request to reset your BDA Portal password.
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                Click the button below to set a new password:
                            </p>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{reset_link}}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">Reset Password</a>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                                <p style="color: #92400e; font-size: 14px; margin: 0;">
                                    <strong>Security Notice:</strong> If you didn''t request this password reset, please ignore this email. Your password will remain unchanged.
                                </p>
                            </div>
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 15px 0 0 0;">
                                This link will expire in 1 hour for security reasons.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                                        <p style="margin: 0 0 10px 0;"><strong>The Business Development Association (BDA&reg;)</strong></p>
                                        <p style="margin: 0 0 5px 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:support@bda-global.org" style="color: #2563eb; text-decoration: none;">Support</a>
                                        </p>
                                        <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">&copy; 2026 The Business Development Association (BDA&reg;). All rights reserved.</p>
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
  '["reset_link"]',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Password reset email template created/updated';
    RAISE NOTICE 'Template key: password_reset';
    RAISE NOTICE 'Variable: {{reset_link}} - the password reset URL';
END $$;
