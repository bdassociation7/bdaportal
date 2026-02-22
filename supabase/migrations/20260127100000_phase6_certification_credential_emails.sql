-- =============================================================================
-- Phase 6: Certification & Credentials Emails (4 emails)
-- =============================================================================
-- Migration: Certification credential lifecycle email templates and triggers
-- Date: 2026-01-27
-- Description: Email notifications for certification issuance, credentials, and expiry
-- =============================================================================

-- =============================================================================
-- 1. INSERT EMAIL TEMPLATES (4 templates)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Template 1: Certification Issued
-- -----------------------------------------------------------------------------
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'certification_issued',
    'Certification Issued',
    'certification',
    'Congratulations! Your {{certification_type}} Certification Has Been Issued',
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
                            <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); border-radius: 8px; padding: 30px; margin-bottom: 30px; text-align: center;">
                                <span style="font-size: 64px;">🎓</span>
                                <h1 style="color: #ffffff; font-size: 28px; margin: 15px 0 5px 0;">Certification Issued!</h1>
                                <p style="color: #e9d5ff; font-size: 18px; margin: 0;">You are now a {{certification_type}} Certified Professional</p>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Dear {{first_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                We are proud to announce that your <strong>{{certification_type}} Certification</strong> has been officially issued by the Business Data Analytics Association.
                            </p>
                            <!-- Credential Card -->
                            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); border-radius: 12px; padding: 25px; margin: 25px 0; color: #ffffff;">
                                <p style="margin: 0 0 5px 0; font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px;">Credential ID</p>
                                <p style="margin: 0 0 20px 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; font-family: monospace;">{{credential_id}}</p>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td width="50%">
                                            <p style="margin: 0; font-size: 12px; opacity: 0.9;">Issued Date</p>
                                            <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600;">{{issued_date}}</p>
                                        </td>
                                        <td width="50%">
                                            <p style="margin: 0; font-size: 12px; opacity: 0.9;">Valid Until</p>
                                            <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600;">{{expiry_date}}</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            <h2 style="color: #1e3a5f; font-size: 18px; margin: 30px 0 15px 0;">Your Certification Benefits</h2>
                            <ul style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Official digital certificate (PDF)</li>
                                <li>LinkedIn digital badge</li>
                                <li>Listing in the BDA Certified Professionals Directory</li>
                                <li>Use of {{certification_type}} designation after your name</li>
                                <li>Access to certified professionals community</li>
                            </ul>
                            <!-- CTA Buttons -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="{{portal_url}}/certifications/certificate/{{certification_id}}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4); margin: 0 10px 10px 0;">Download Certificate</a>
                                        <a href="{{portal_url}}/certifications/badge/{{certification_id}}" style="display: inline-block; background: #ffffff; color: #2563eb; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; border: 2px solid #2563eb;">Get LinkedIn Badge</a>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                                <p style="color: #166534; font-size: 14px; margin: 0;">
                                    <strong>Maintain Your Certification:</strong> Earn 60 PDC (Professional Development Credits) before {{expiry_date}} to renew your certification.
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
    '["first_name", "certification_type", "credential_id", "issued_date", "expiry_date", "certification_id", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Template 2: Credential ID Generated (Verification Ready)
-- -----------------------------------------------------------------------------
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'credential_id_generated',
    'Credential ID Generated',
    'certification',
    'Your {{certification_type}} Credential ID: {{credential_id}}',
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
                                <span style="font-size: 48px;">🆔</span>
                                <h1 style="color: #1e3a5f; font-size: 24px; margin: 10px 0 0 0;">Your Credential ID</h1>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Dear {{first_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Your unique credential ID has been generated for your <strong>{{certification_type}} Certification</strong>. This ID can be used by employers and third parties to verify your certification status.
                            </p>
                            <!-- Credential Display -->
                            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 30px; margin: 20px 0; text-align: center;">
                                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Your Credential ID</p>
                                <p style="color: #1e3a5f; font-size: 32px; font-weight: 700; margin: 0; font-family: monospace; letter-spacing: 3px;">{{credential_id}}</p>
                            </div>
                            <h2 style="color: #1e3a5f; font-size: 18px; margin: 30px 0 15px 0;">How to Use Your Credential ID</h2>
                            <ul style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Add it to your resume and LinkedIn profile</li>
                                <li>Include it on your business cards</li>
                                <li>Share the verification link with employers</li>
                                <li>Use it when applying for data analytics positions</li>
                            </ul>
                            <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="color: #1e40af; font-size: 14px; margin: 0 0 10px 0;"><strong>Verification Link</strong></p>
                                <p style="color: #1e40af; font-size: 14px; margin: 0; word-break: break-all;">
                                    <a href="{{verification_url}}" style="color: #2563eb;">{{verification_url}}</a>
                                </p>
                            </div>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="{{portal_url}}/certifications/verify/{{credential_id}}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">View Verification Page</a>
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
    '["first_name", "certification_type", "credential_id", "verification_url", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Template 3: Certification Expiring Soon
-- -----------------------------------------------------------------------------
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'certification_expiring_soon',
    'Certification Expiring Soon',
    'certification',
    'Action Required: Your {{certification_type}} Certification Expires in {{days_remaining}} Days',
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
                                <span style="font-size: 48px;">⚠️</span>
                                <h1 style="color: #ffffff; font-size: 24px; margin: 10px 0 0 0;">Certification Expiring Soon</h1>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Dear {{first_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Your <strong>{{certification_type}} Certification</strong> ({{credential_id}}) will expire in <strong>{{days_remaining}} days</strong> on <strong>{{expiry_date}}</strong>.
                            </p>
                            <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; border: 2px solid #f59e0b;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="color: #92400e; font-size: 14px; padding: 5px 0;">Credential ID:</td>
                                        <td style="color: #92400e; font-size: 16px; font-weight: 600; text-align: right; font-family: monospace;">{{credential_id}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #92400e; font-size: 14px; padding: 5px 0;">Expiry Date:</td>
                                        <td style="color: #92400e; font-size: 16px; font-weight: 600; text-align: right;">{{expiry_date}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #92400e; font-size: 14px; padding: 5px 0;">PDCs Earned:</td>
                                        <td style="color: #92400e; font-size: 16px; font-weight: 600; text-align: right;">{{pdc_earned}} / 60 required</td>
                                    </tr>
                                </table>
                            </div>
                            <h2 style="color: #1e3a5f; font-size: 18px; margin: 30px 0 15px 0;">How to Renew</h2>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                                To maintain your {{certification_type}} certification, you need to:
                            </p>
                            <ol style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Earn at least 60 PDC (Professional Development Credits)</li>
                                <li>Complete the recertification process in the portal</li>
                                <li>Pay the recertification fee (if applicable)</li>
                            </ol>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="{{portal_url}}/certifications/renew/{{certification_id}}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">Renew Now</a>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                                <p style="color: #1e40af; font-size: 14px; margin: 0;">
                                    <strong>Need more PDCs?</strong> Complete learning modules, attend webinars, or submit external training for PDC credit.
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
    '["first_name", "certification_type", "credential_id", "days_remaining", "expiry_date", "pdc_earned", "certification_id", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Template 4: Certification Expired
-- -----------------------------------------------------------------------------
INSERT INTO public.email_templates (template_key, name, category, subject, html_body, variables, is_active)
VALUES (
    'certification_expired',
    'Certification Expired',
    'certification',
    'Your {{certification_type}} Certification Has Expired',
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
                            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center;">
                                <span style="font-size: 48px;">📋</span>
                                <h1 style="color: #ffffff; font-size: 24px; margin: 10px 0 0 0;">Certification Expired</h1>
                            </div>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Dear {{first_name}},
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                We regret to inform you that your <strong>{{certification_type}} Certification</strong> ({{credential_id}}) expired on <strong>{{expiry_date}}</strong>.
                            </p>
                            <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0; border: 2px solid #dc2626;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="color: #991b1b; font-size: 14px; padding: 5px 0;">Credential ID:</td>
                                        <td style="color: #991b1b; font-size: 16px; font-weight: 600; text-align: right; font-family: monospace;">{{credential_id}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #991b1b; font-size: 14px; padding: 5px 0;">Status:</td>
                                        <td style="color: #991b1b; font-size: 16px; font-weight: 600; text-align: right;">Expired</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #991b1b; font-size: 14px; padding: 5px 0;">Expired On:</td>
                                        <td style="color: #991b1b; font-size: 16px; font-weight: 600; text-align: right;">{{expiry_date}}</td>
                                    </tr>
                                </table>
                            </div>
                            <h2 style="color: #1e3a5f; font-size: 18px; margin: 30px 0 15px 0;">What This Means</h2>
                            <ul style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Your credential ID is no longer valid for verification</li>
                                <li>You should not use the {{certification_type}} designation</li>
                                <li>Access to certified professionals benefits is suspended</li>
                            </ul>
                            <h2 style="color: #1e3a5f; font-size: 18px; margin: 30px 0 15px 0;">Options to Reinstate</h2>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                                You have options to regain your certification status:
                            </p>
                            <ol style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li><strong>Within 90 days:</strong> Complete recertification with late fee</li>
                                <li><strong>After 90 days:</strong> Retake the certification exam</li>
                            </ol>
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="{{portal_url}}/certifications/reinstate" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">View Reinstatement Options</a>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                                <p style="color: #1e40af; font-size: 14px; margin: 0;">
                                    <strong>Questions?</strong> Contact our certifications team at certifications@bda-global.org for assistance with your reinstatement options.
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
    '["first_name", "certification_type", "credential_id", "expiry_date", "portal_url"]'::jsonb,
    true
) ON CONFLICT (template_key) DO UPDATE SET
    html_body = EXCLUDED.html_body,
    subject = EXCLUDED.subject,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- =============================================================================
-- 2. CREATE HELPER FUNCTION FOR SENDING CERTIFICATION EMAILS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.send_certification_email(
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

    -- Get Edge Function URL
    v_edge_function_url := 'https://upmtqqfgvtjbqothaceg.supabase.co/functions/v1/send-email';

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
-- 3. CREATE TRIGGERS FOR CERTIFICATION LIFECYCLE
-- =============================================================================

-- Trigger: When a new certification is issued
CREATE OR REPLACE FUNCTION public.handle_certification_issued()
RETURNS TRIGGER AS $$
BEGIN
    -- Send certification issued email
    PERFORM public.send_certification_email(
        NEW.user_id,
        'certification_issued',
        jsonb_build_object(
            'certification_type', NEW.certification_type::text,
            'credential_id', NEW.credential_id,
            'issued_date', to_char(NEW.issued_date, 'Month DD, YYYY'),
            'expiry_date', to_char(NEW.expiry_date, 'Month DD, YYYY'),
            'certification_id', NEW.id::text
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_certification_issued ON public.user_certifications;
CREATE TRIGGER on_certification_issued
    AFTER INSERT ON public.user_certifications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_certification_issued();

-- Trigger: When certification status changes to expired
CREATE OR REPLACE FUNCTION public.handle_certification_expired()
RETURNS TRIGGER AS $$
BEGIN
    -- Only send if status changed to 'expired'
    IF NEW.status = 'expired' AND (OLD.status IS NULL OR OLD.status != 'expired') THEN
        PERFORM public.send_certification_email(
            NEW.user_id,
            'certification_expired',
            jsonb_build_object(
                'certification_type', NEW.certification_type::text,
                'credential_id', NEW.credential_id,
                'expiry_date', to_char(NEW.expiry_date, 'Month DD, YYYY')
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_certification_status_change ON public.user_certifications;
CREATE TRIGGER on_certification_status_change
    AFTER UPDATE OF status ON public.user_certifications
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.handle_certification_expired();

-- =============================================================================
-- 4. CREATE TRACKING TABLE FOR CERTIFICATION EXPIRY NOTIFICATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.certification_expiry_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certification_id UUID NOT NULL REFERENCES public.user_certifications(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- '60_days', '30_days', '7_days', 'expired'
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(certification_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_certification_expiry_notifications_cert
ON public.certification_expiry_notifications(certification_id, notification_type);

-- =============================================================================
-- 5. CREATE CRON JOB FUNCTION FOR CERTIFICATION EXPIRY
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_certification_expiry_and_notify()
RETURNS void AS $$
DECLARE
    v_cert RECORD;
    v_days_remaining INTEGER;
BEGIN
    -- Process all active certifications
    FOR v_cert IN
        SELECT uc.*, u.first_name, u.last_name, u.email
        FROM public.user_certifications uc
        JOIN public.users u ON u.id = uc.user_id
        WHERE uc.status = 'active'
    LOOP
        v_days_remaining := (v_cert.expiry_date - CURRENT_DATE);

        -- 60-day warning
        IF v_days_remaining = 60 AND NOT EXISTS (
            SELECT 1 FROM public.certification_expiry_notifications
            WHERE certification_id = v_cert.id AND notification_type = '60_days'
        ) THEN
            PERFORM public.send_certification_email(
                v_cert.user_id,
                'certification_expiring_soon',
                jsonb_build_object(
                    'certification_type', v_cert.certification_type::text,
                    'credential_id', v_cert.credential_id,
                    'days_remaining', '60',
                    'expiry_date', to_char(v_cert.expiry_date, 'Month DD, YYYY'),
                    'pdc_earned', COALESCE(v_cert.pdc_credits_earned, 0)::text,
                    'certification_id', v_cert.id::text
                )
            );
            INSERT INTO public.certification_expiry_notifications (certification_id, notification_type)
            VALUES (v_cert.id, '60_days') ON CONFLICT DO NOTHING;
        END IF;

        -- 30-day warning
        IF v_days_remaining = 30 AND NOT EXISTS (
            SELECT 1 FROM public.certification_expiry_notifications
            WHERE certification_id = v_cert.id AND notification_type = '30_days'
        ) THEN
            PERFORM public.send_certification_email(
                v_cert.user_id,
                'certification_expiring_soon',
                jsonb_build_object(
                    'certification_type', v_cert.certification_type::text,
                    'credential_id', v_cert.credential_id,
                    'days_remaining', '30',
                    'expiry_date', to_char(v_cert.expiry_date, 'Month DD, YYYY'),
                    'pdc_earned', COALESCE(v_cert.pdc_credits_earned, 0)::text,
                    'certification_id', v_cert.id::text
                )
            );
            INSERT INTO public.certification_expiry_notifications (certification_id, notification_type)
            VALUES (v_cert.id, '30_days') ON CONFLICT DO NOTHING;
        END IF;

        -- 7-day warning
        IF v_days_remaining = 7 AND NOT EXISTS (
            SELECT 1 FROM public.certification_expiry_notifications
            WHERE certification_id = v_cert.id AND notification_type = '7_days'
        ) THEN
            PERFORM public.send_certification_email(
                v_cert.user_id,
                'certification_expiring_soon',
                jsonb_build_object(
                    'certification_type', v_cert.certification_type::text,
                    'credential_id', v_cert.credential_id,
                    'days_remaining', '7',
                    'expiry_date', to_char(v_cert.expiry_date, 'Month DD, YYYY'),
                    'pdc_earned', COALESCE(v_cert.pdc_credits_earned, 0)::text,
                    'certification_id', v_cert.id::text
                )
            );
            INSERT INTO public.certification_expiry_notifications (certification_id, notification_type)
            VALUES (v_cert.id, '7_days') ON CONFLICT DO NOTHING;
        END IF;

        -- Auto-expire and send notification
        IF v_days_remaining <= 0 AND v_cert.status = 'active' THEN
            -- Update status to expired
            UPDATE public.user_certifications
            SET status = 'expired'
            WHERE id = v_cert.id;
            -- Note: The trigger will send the expired email
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.send_certification_email(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_certification_expiry_and_notify() TO authenticated;

-- =============================================================================
-- 7. VERIFICATION
-- =============================================================================

DO $$
DECLARE
    v_template_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_template_count
    FROM public.email_templates
    WHERE template_key IN ('certification_issued', 'credential_id_generated', 'certification_expiring_soon', 'certification_expired');

    RAISE NOTICE '✅ Phase 6: Certification & Credentials Emails';
    RAISE NOTICE '   Templates created: % credential templates', v_template_count;
    RAISE NOTICE '   Triggers: on_certification_issued, on_certification_status_change';
    RAISE NOTICE '   Cron function: check_certification_expiry_and_notify()';
END $$;

SELECT
    '✅ Phase 6 Complete' as status,
    (SELECT COUNT(*) FROM public.email_templates WHERE template_key LIKE 'certif%' OR template_key LIKE 'credential%') as credential_templates;
