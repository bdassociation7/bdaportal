-- ============================================================================
-- FIX: Membership Email Issues
-- ============================================================================
-- 1. Fix invisible text in light mode (add fallback background-color)
-- 2. Update branding to "The Business Development Association (BDA®)"
-- 3. Update logo URL to portal-hosted version
-- ============================================================================

-- Fix membership_activated email
UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
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
                            <img src="https://portal.bda-global.org/bda-email-logo.png" alt="BDA Logo" style="height: 60px; width: auto;">
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
                            <!-- Membership Card - FIXED: Added background-color fallback -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1e3a5f; border-radius: 12px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #e0e7ff;">Membership ID</p>
                                        <p style="margin: 0 0 15px 0; font-size: 20px; font-weight: bold; letter-spacing: 1px; color: #ffffff;">{{membership_id}}</p>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td width="50%">
                                                    <p style="margin: 0; font-size: 12px; color: #e0e7ff;">Start Date</p>
                                                    <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600; color: #ffffff;">{{start_date}}</p>
                                                </td>
                                                <td width="50%">
                                                    <p style="margin: 0; font-size: 12px; color: #e0e7ff;">Valid Until</p>
                                                    <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600; color: #ffffff;">{{expiry_date}}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 25px 0 30px 0;">
                                You now have access to all {{membership_type}} membership benefits. Visit your dashboard to explore your benefits.
                            </p>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="https://portal.bda-global.org/my-membership" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">View My Membership</a>
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
                                        <p style="margin: 0 0 10px 0;"><strong>The Business Development Association (BDA®)</strong></p>
                                        <p style="margin: 0 0 5px 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:info@bda-global.org" style="color: #2563eb; text-decoration: none;">Contact</a>
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
    updated_at = NOW()
WHERE template_key = 'membership_activated';

-- Fix membership_renewed email
UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
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
                        <td style="background-color: #ffffff; padding: 30px 40px; text-align: center; border-bottom: 3px solid #059669;">
                            <img src="https://portal.bda-global.org/bda-email-logo.png" alt="BDA Logo" style="height: 60px; width: auto;">
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
                                Thank you for renewing your BDA <strong>{{membership_type}}</strong> membership! Your continued support helps us grow the Business Development community.
                            </p>
                            <!-- Membership Card - FIXED: Added background-color fallback -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #059669; border-radius: 12px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #d1fae5;">Membership ID</p>
                                        <p style="margin: 0 0 15px 0; font-size: 20px; font-weight: bold; letter-spacing: 1px; color: #ffffff;">{{membership_id}}</p>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td width="50%">
                                                    <p style="margin: 0; font-size: 12px; color: #d1fae5;">New Expiry Date</p>
                                                    <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600; color: #ffffff;">{{expiry_date}}</p>
                                                </td>
                                                <td width="50%">
                                                    <p style="margin: 0; font-size: 12px; color: #d1fae5;">Renewal #</p>
                                                    <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600; color: #ffffff;">{{renewal_count}}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 25px 0 30px 0;">
                                Your membership benefits continue uninterrupted. Keep making the most of your BDA membership!
                            </p>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="https://portal.bda-global.org/my-membership" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">View My Membership</a>
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
                                        <p style="margin: 0 0 10px 0;"><strong>The Business Development Association (BDA®)</strong></p>
                                        <p style="margin: 0 0 5px 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:info@bda-global.org" style="color: #2563eb; text-decoration: none;">Contact</a>
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
    updated_at = NOW()
WHERE template_key = 'membership_renewed';

-- Fix membership_expiring_soon email
UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
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
                            <img src="https://portal.bda-global.org/bda-email-logo.png" alt="BDA Logo" style="height: 60px; width: auto;">
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
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 20px; border-left: 4px solid #f59e0b;">
                                        <p style="color: #92400e; font-size: 16px; margin: 0; font-weight: 600;">
                                            Don''t lose your benefits!
                                        </p>
                                        <p style="color: #92400e; font-size: 14px; margin: 10px 0 0 0;">
                                            Renew now to keep access to BDA BoCK®, certification discounts, and all your membership perks.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <!-- Membership Info -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 20px;">
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
                                    </td>
                                </tr>
                            </table>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="https://bda-global.org/en/memberships/" style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">Renew My Membership</a>
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
                                        <p style="margin: 0 0 10px 0;"><strong>The Business Development Association (BDA®)</strong></p>
                                        <p style="margin: 0 0 5px 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:info@bda-global.org" style="color: #2563eb; text-decoration: none;">Contact</a>
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
    updated_at = NOW()
WHERE template_key = 'membership_expiring_soon';

-- Fix membership_expired email
UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
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
                            <img src="https://portal.bda-global.org/bda-email-logo.png" alt="BDA Logo" style="height: 60px; width: auto;">
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
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 20px; border-left: 4px solid #dc2626;">
                                        <p style="color: #991b1b; font-size: 16px; margin: 0; font-weight: 600;">
                                            Your benefits have been paused
                                        </p>
                                        <p style="color: #991b1b; font-size: 14px; margin: 10px 0 0 0;">
                                            You no longer have access to BDA BoCK®, certification discounts, and other membership benefits.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 25px 0 30px 0;">
                                We''d love to have you back! Renew your membership today to regain access to all benefits and continue your professional development journey.
                            </p>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="https://bda-global.org/en/memberships/" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">Renew Membership</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                                Questions? Contact us at <a href="mailto:info@bda-global.org" style="color: #2563eb;">info@bda-global.org</a>
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                                        <p style="margin: 0 0 10px 0;"><strong>The Business Development Association (BDA®)</strong></p>
                                        <p style="margin: 0 0 5px 0;">
                                            <a href="https://bda-global.org" style="color: #2563eb; text-decoration: none;">Website</a> |
                                            <a href="https://portal.bda-global.org" style="color: #2563eb; text-decoration: none;">Portal</a> |
                                            <a href="mailto:info@bda-global.org" style="color: #2563eb; text-decoration: none;">Contact</a>
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
    updated_at = NOW()
WHERE template_key = 'membership_expired';

SELECT '✅ Fixed membership email templates - text now visible in light mode, branding updated' as status;
