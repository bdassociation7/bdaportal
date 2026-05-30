/**
 * Voucher Created Email Template
 *
 * Sent to ECP partners when vouchers are created for their candidates
 */

import { baseTemplate, baseTextTemplate, button, infoBox } from './base-template';

export interface VoucherCreatedData {
  partnerName: string;
  voucherCode: string;
  examType: string;
  candidateEmail?: string;
  candidateName?: string;
  validUntil: string;
  bookingUrl: string;
  partnerDashboardUrl: string;
}

export function voucherCreatedHtml(data: VoucherCreatedData): string {
  const {
    partnerName,
    voucherCode,
    examType,
    candidateEmail,
    candidateName,
    validUntil,
    bookingUrl,
    partnerDashboardUrl,
  } = data;

  const infoItems = [
    { label: 'Voucher Code', value: `<strong style="font-family: monospace; font-size: 16px;">${voucherCode}</strong>` },
    { label: 'Exam Type', value: examType },
    { label: 'Valid Until', value: validUntil },
  ];

  if (candidateName) {
    infoItems.push({ label: 'Assigned To', value: candidateName });
  }
  if (candidateEmail) {
    infoItems.push({ label: 'Candidate Email', value: candidateEmail });
  }

  const content = `
    <h1 style="margin: 0 0 24px 0; font-size: 24px; color: #1f2937;">
      Exam Voucher Created
    </h1>

    <p style="margin: 0 0 16px 0;">
      Dear ${partnerName},
    </p>

    <p style="margin: 0 0 24px 0;">
      A new exam voucher has been created for your organisation. ${candidateName ? `This voucher has been assigned to <strong>${candidateName}</strong>.` : 'You can assign this voucher to a candidate or share the booking link directly.'}
    </p>

    ${infoBox('Voucher Details', infoItems)}

    ${candidateEmail ? '' : `
    <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #1e40af;">
        <strong>Booking Link for Candidate</strong>
      </p>
      <p style="margin: 0; font-size: 12px; word-break: break-all;">
        <a href="${bookingUrl}" style="color: #1e40af;">${bookingUrl}</a>
      </p>
    </div>
    `}

    ${button('View Partner Dashboard', partnerDashboardUrl)}

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Important:</strong> This voucher expires on ${validUntil}. Please ensure the candidate books their exam before this date.
      </p>
    </div>

    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      You can track all your vouchers and their status in your partner dashboard.
    </p>
  `;

  return baseTemplate({
    previewText: `New exam voucher created: ${voucherCode} for ${examType}`,
    children: content,
  });
}

export function voucherCreatedText(data: VoucherCreatedData): string {
  const {
    partnerName,
    voucherCode,
    examType,
    candidateEmail,
    candidateName,
    validUntil,
    bookingUrl,
    partnerDashboardUrl,
  } = data;

  const content = `
EXAM VOUCHER CREATED

Dear ${partnerName},

A new exam voucher has been created for your organisation.${candidateName ? ` This voucher has been assigned to ${candidateName}.` : ''}

VOUCHER DETAILS
---------------
Voucher Code: ${voucherCode}
Exam Type: ${examType}
Valid Until: ${validUntil}${candidateName ? `\nAssigned To: ${candidateName}` : ''}${candidateEmail ? `\nCandidate Email: ${candidateEmail}` : ''}

${!candidateEmail ? `BOOKING LINK FOR CANDIDATE\n--------------------------\n${bookingUrl}\n` : ''}
PARTNER DASHBOARD
-----------------
${partnerDashboardUrl}

IMPORTANT: This voucher expires on ${validUntil}. Please ensure the candidate books their exam before this date.

You can track all your vouchers and their status in your partner dashboard.
`.trim();

  return baseTextTemplate(content);
}

export function getVoucherCreatedSubject(examType: string): string {
  return `New Exam Voucher Created: ${examType}`;
}
