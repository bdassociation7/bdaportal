/**
 * Certification Issued Email Template
 *
 * Sent when a candidate passes an exam and receives certification
 */

import { baseTemplate, baseTextTemplate, button, infoBox } from './base-template';

export interface CertificationIssuedData {
  firstName: string;
  lastName: string;
  certificationName: string;
  certificationLevel: string;
  issueDate: string;
  expirationDate?: string;
  certificateNumber: string;
  verificationUrl: string;
  downloadUrl: string;
  linkedInUrl?: string;
}

export function certificationIssuedHtml(data: CertificationIssuedData): string {
  const {
    firstName,
    lastName,
    certificationName,
    certificationLevel,
    issueDate,
    expirationDate,
    certificateNumber,
    verificationUrl,
    downloadUrl,
    linkedInUrl,
  } = data;

  const infoItems = [
    { label: 'Name', value: `${firstName} ${lastName}` },
    { label: 'Certification', value: certificationName },
    { label: 'Level', value: certificationLevel },
    { label: 'Certificate #', value: certificateNumber },
    { label: 'Issue Date', value: issueDate },
  ];

  if (expirationDate) {
    infoItems.push({ label: 'Valid Until', value: expirationDate });
  }

  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
        🎉 Congratulations!
      </div>
    </div>

    <h1 style="margin: 0 0 24px 0; font-size: 24px; color: #1f2937; text-align: center;">
      You're Now BDA Certified!
    </h1>

    <p style="margin: 0 0 16px 0;">
      Dear ${firstName},
    </p>

    <p style="margin: 0 0 24px 0;">
      Congratulations on successfully completing your <strong>${certificationName}</strong> certification! This is a significant achievement that demonstrates your expertise and commitment to professional excellence in business data analytics.
    </p>

    ${infoBox('Your Certification Details', infoItems)}

    <div style="display: flex; gap: 16px; margin: 24px 0;">
      ${button('Download Certificate', downloadUrl)}
    </div>

    <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #166534;">
        <strong>Share Your Achievement</strong>
      </p>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #166534;">
        Your certification can be verified online. Share this link with employers and colleagues:
      </p>
      <p style="margin: 0; font-size: 12px;">
        <a href="${verificationUrl}" style="color: #1e40af; word-break: break-all;">${verificationUrl}</a>
      </p>
      ${linkedInUrl ? `
      <p style="margin: 16px 0 0 0;">
        <a href="${linkedInUrl}" style="display: inline-block; padding: 10px 20px; background-color: #0077b5; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">
          Add to LinkedIn
        </a>
      </p>
      ` : ''}
    </div>

    <p style="margin: 0 0 16px 0;">
      Your digital certificate and badge are now available in your BDA Portal dashboard. You can download them at any time.
    </p>

    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      Thank you for choosing BDA for your professional certification. We wish you continued success in your career!
    </p>
  `;

  return baseTemplate({
    previewText: `Congratulations! You've earned your ${certificationName} certification`,
    children: content,
  });
}

export function certificationIssuedText(data: CertificationIssuedData): string {
  const {
    firstName,
    lastName,
    certificationName,
    certificationLevel,
    issueDate,
    expirationDate,
    certificateNumber,
    verificationUrl,
    downloadUrl,
  } = data;

  const content = `
🎉 CONGRATULATIONS! YOU'RE NOW BDA CERTIFIED!

Dear ${firstName},

Congratulations on successfully completing your ${certificationName} certification! This is a significant achievement that demonstrates your expertise and commitment to professional excellence in business data analytics.

YOUR CERTIFICATION DETAILS
--------------------------
Name: ${firstName} ${lastName}
Certification: ${certificationName}
Level: ${certificationLevel}
Certificate #: ${certificateNumber}
Issue Date: ${issueDate}${expirationDate ? `\nValid Until: ${expirationDate}` : ''}

DOWNLOAD YOUR CERTIFICATE
-------------------------
${downloadUrl}

SHARE YOUR ACHIEVEMENT
----------------------
Your certification can be verified online. Share this link with employers and colleagues:
${verificationUrl}

Your digital certificate and badge are now available in your BDA Portal dashboard.

Thank you for choosing BDA for your professional certification. We wish you continued success in your career!
`.trim();

  return baseTextTemplate(content);
}

export function getCertificationIssuedSubject(certificationName: string): string {
  return `🎉 Congratulations! Your ${certificationName} Certificate is Ready`;
}
