/**
 * Welcome Email Template
 *
 * Sent to new users after account creation
 */

import { baseTemplate, baseTextTemplate, button } from './base-template';

export interface WelcomeEmailData {
  firstName: string;
  email: string;
  temporaryPassword?: string;
  loginUrl: string;
  setPasswordUrl?: string;
}

export function welcomeEmailHtml(data: WelcomeEmailData): string {
  const { firstName, email, temporaryPassword, loginUrl, setPasswordUrl } = data;

  const content = `
    <h1 style="margin: 0 0 24px 0; font-size: 24px; color: #1f2937;">
      Welcome to BDA Association, ${firstName}!
    </h1>

    <p style="margin: 0 0 16px 0;">
      Your account has been successfully created. You can now access the BDA Portal to manage your certifications, training, and professional development.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; border-radius: 8px; margin: 24px 0;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e40af;">Your Account Details</h3>
          <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
          ${temporaryPassword ? `<p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 8px; border-radius: 4px;">${temporaryPassword}</code></p>` : ''}
        </td>
      </tr>
    </table>

    ${setPasswordUrl ? `
    <p style="margin: 0 0 16px 0;">
      <strong>Important:</strong> Please set your password by clicking the button below:
    </p>
    ${button('Set Your Password', setPasswordUrl)}
    ` : `
    ${button('Login to Portal', loginUrl)}
    `}

    <p style="margin: 24px 0 16px 0;">
      Once logged in, you can:
    </p>

    <ul style="margin: 0 0 24px 0; padding-left: 20px;">
      <li style="margin-bottom: 8px;">View and register for BDA certification exams</li>
      <li style="margin-bottom: 8px;">Access the Learning System (modules, flashcards, question bank)</li>
      <li style="margin-bottom: 8px;">Track your professional development credits (PDCs)</li>
      <li style="margin-bottom: 8px;">Download certificates and credentials</li>
    </ul>

    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      If you have any questions, please don't hesitate to contact us at <a href="mailto:support@bda-global.org" style="color: #1e40af;">support@bda-global.org</a>.
    </p>
  `;

  return baseTemplate({
    previewText: `Welcome to BDA Association, ${firstName}! Your account is ready.`,
    children: content,
  });
}

export function welcomeEmailText(data: WelcomeEmailData): string {
  const { firstName, email, temporaryPassword, loginUrl, setPasswordUrl } = data;

  const content = `
Welcome to BDA Association, ${firstName}!

Your account has been successfully created.

ACCOUNT DETAILS
---------------
Email: ${email}
${temporaryPassword ? `Temporary Password: ${temporaryPassword}` : ''}

${setPasswordUrl ? `Please set your password here: ${setPasswordUrl}` : `Login here: ${loginUrl}`}

WHAT YOU CAN DO
---------------
• View and register for BDA certification exams
• Access the Learning System (modules, flashcards, question bank)
• Track your professional development credits (PDCs)
• Download certificates and credentials

If you have any questions, contact us at support@bda-global.org.
`.trim();

  return baseTextTemplate(content);
}

export function getWelcomeEmailSubject(firstName: string): string {
  return `Welcome to BDA Association, ${firstName}!`;
}
