/**
 * Password Reset Email Template
 *
 * Sent when a user requests a password reset
 */

import { baseTemplate, baseTextTemplate, button } from './base-template';

export interface PasswordResetData {
  firstName: string;
  resetUrl: string;
  expiresIn: string; // e.g., "1 hour"
  ipAddress?: string;
  userAgent?: string;
}

export function passwordResetHtml(data: PasswordResetData): string {
  const { firstName, resetUrl, expiresIn, ipAddress, userAgent } = data;

  const content = `
    <h1 style="margin: 0 0 24px 0; font-size: 24px; color: #1f2937;">
      Reset Your Password
    </h1>

    <p style="margin: 0 0 16px 0;">
      Hi ${firstName},
    </p>

    <p style="margin: 0 0 24px 0;">
      We received a request to reset your password for your BDA Portal account. Click the button below to create a new password:
    </p>

    ${button('Reset Password', resetUrl)}

    <p style="margin: 24px 0 16px 0; color: #6b7280; font-size: 14px;">
      This link will expire in <strong>${expiresIn}</strong>.
    </p>

    ${ipAddress || userAgent ? `
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
        <strong>Request Details:</strong>
      </p>
      ${ipAddress ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">IP Address: ${ipAddress}</p>` : ''}
      ${userAgent ? `<p style="margin: 0; font-size: 13px; color: #6b7280;">Device: ${userAgent}</p>` : ''}
    </div>
    ` : ''}

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-size: 14px; color: #991b1b;">
        <strong>Didn't request this?</strong> If you didn't request a password reset, please ignore this email or contact our support team immediately at <a href="mailto:security@bda-global.org" style="color: #1e40af;">security@bda-global.org</a>.
      </p>
    </div>

    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      For security reasons, this link can only be used once.
    </p>
  `;

  return baseTemplate({
    previewText: `Reset your BDA Portal password - link expires in ${expiresIn}`,
    children: content,
  });
}

export function passwordResetText(data: PasswordResetData): string {
  const { firstName, resetUrl, expiresIn } = data;

  const content = `
Reset Your Password

Hi ${firstName},

We received a request to reset your password for your BDA Portal account.

Click here to reset your password:
${resetUrl}

This link will expire in ${expiresIn}.

DIDN'T REQUEST THIS?
--------------------
If you didn't request a password reset, please ignore this email or contact security@bda-global.org immediately.

For security reasons, this link can only be used once.
`.trim();

  return baseTextTemplate(content);
}

export function getPasswordResetSubject(): string {
  return 'Reset Your BDA Portal Password';
}
