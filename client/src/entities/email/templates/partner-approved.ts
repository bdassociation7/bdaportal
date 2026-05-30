/**
 * Partner Approved Email Templates
 *
 * Sent when ECP or PDP partner applications are approved
 */

import { baseTemplate, baseTextTemplate, button } from './base-template';

export interface PartnerApprovedData {
  firstName: string;
  organizationName: string;
  partnerType: 'ECP' | 'PDP';
  partnerNumber: string;
  dashboardUrl: string;
  agreementUrl?: string;
}

export function partnerApprovedHtml(data: PartnerApprovedData): string {
  const {
    firstName,
    organizationName,
    partnerType,
    partnerNumber,
    dashboardUrl,
    agreementUrl,
  } = data;

  const partnerTypeFull = partnerType === 'ECP'
    ? 'Exam Center Partner'
    : 'Program Development Partner';

  const partnerBenefits = partnerType === 'ECP'
    ? [
        'Access to exam voucher management',
        'Trainer certification tools',
        'Learning system resources',
        'Mock exam access for candidates',
        'Partner badge and certificate',
      ]
    : [
        'Program development resources',
        'Competency mapping tools',
        'Trainer certification pathway',
        'Partner badge and certificate',
        'Marketing co-branding materials',
      ];

  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color: white; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
        ✓ Application Approved
      </div>
    </div>

    <h1 style="margin: 0 0 24px 0; font-size: 24px; color: #1f2937; text-align: center;">
      Welcome to the BDA Partner Network!
    </h1>

    <p style="margin: 0 0 16px 0;">
      Dear ${firstName},
    </p>

    <p style="margin: 0 0 24px 0;">
      We are pleased to inform you that <strong>${organisationName}</strong> has been approved as a <strong>BDA ${partnerTypeFull} (${partnerType})</strong>. Welcome to the BDA Partner Network!
    </p>

    <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #1e40af;">
        <strong>Your Partner ID:</strong>
      </p>
      <p style="margin: 0; font-size: 20px; font-weight: bold; color: #1e40af; font-family: monospace;">
        ${partnerNumber}
      </p>
    </div>

    <h3 style="margin: 24px 0 16px 0; font-size: 16px; color: #1f2937;">
      As a BDA ${partnerType} Partner, you now have access to:
    </h3>

    <ul style="margin: 0 0 24px 0; padding-left: 24px; color: #4b5563;">
      ${partnerBenefits.map(benefit => `<li style="margin-bottom: 8px;">${benefit}</li>`).join('')}
    </ul>

    ${button('Access Partner Dashboard', dashboardUrl)}

    ${agreementUrl ? `
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Next Step:</strong> Please review and sign your partner agreement to complete the onboarding process.
        <a href="${agreementUrl}" style="color: #1e40af; display: block; margin-top: 8px;">View Partner Agreement →</a>
      </p>
    </div>
    ` : ''}

    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      If you have any questions, please don't hesitate to contact our partner support team at <a href="mailto:partners@bda-global.org" style="color: #1e40af;">partners@bda-global.org</a>.
    </p>
  `;

  return baseTemplate({
    previewText: `Congratulations! ${organisationName} is now a BDA ${partnerType} Partner`,
    children: content,
  });
}

export function partnerApprovedText(data: PartnerApprovedData): string {
  const {
    firstName,
    organizationName,
    partnerType,
    partnerNumber,
    dashboardUrl,
    agreementUrl,
  } = data;

  const partnerTypeFull = partnerType === 'ECP'
    ? 'Exam Center Partner'
    : 'Program Development Partner';

  const partnerBenefits = partnerType === 'ECP'
    ? [
        'Access to exam voucher management',
        'Trainer certification tools',
        'Learning system resources',
        'Mock exam access for candidates',
        'Partner badge and certificate',
      ]
    : [
        'Program development resources',
        'Competency mapping tools',
        'Trainer certification pathway',
        'Partner badge and certificate',
        'Marketing co-branding materials',
      ];

  const content = `
✓ APPLICATION APPROVED

WELCOME TO THE BDA PARTNER NETWORK!

Dear ${firstName},

We are pleased to inform you that ${organisationName} has been approved as a BDA ${partnerTypeFull} (${partnerType}). Welcome to the BDA Partner Network!

YOUR PARTNER ID: ${partnerNumber}

AS A BDA ${partnerType} PARTNER, YOU NOW HAVE ACCESS TO:
${partnerBenefits.map(benefit => `• ${benefit}`).join('\n')}

ACCESS YOUR DASHBOARD
---------------------
${dashboardUrl}
${agreementUrl ? `
NEXT STEP: Please review and sign your partner agreement to complete the onboarding process.
${agreementUrl}
` : ''}
If you have any questions, please contact our partner support team at partners@bda-global.org.
`.trim();

  return baseTextTemplate(content);
}

export function getPartnerApprovedSubject(organizationName: string, partnerType: 'ECP' | 'PDP'): string {
  return `✓ ${organisationName} Approved as BDA ${partnerType} Partner`;
}
