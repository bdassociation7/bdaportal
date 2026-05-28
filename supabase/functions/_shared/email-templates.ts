/**
 * Shared Email Templates for Edge Functions
 *
 * Deno-compatible email template generators
 * Used by: woocommerce-webhook, send-emails, etc.
 */

// BDA Brand Colors
const COLORS = {
  primary: '#1e40af',
  primaryDark: '#1e3a8a',
  secondary: '#059669',
  text: '#1f2937',
  textLight: '#6b7280',
  background: '#f9fafb',
  white: '#ffffff',
  border: '#e5e7eb',
}

// ============================================================================
// Base Template
// ============================================================================

function baseTemplate(previewText: string, content: string): string {
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>The Business Development Association (BDA®)</title>
  <style type="text/css">
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100%; background-color: ${COLORS.background}; }
    .button { display: inline-block; padding: 14px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white} !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
    @media only screen and (max-width: 600px) { .container { width: 100% !important; padding: 16px !important; } .content { padding: 24px !important; } }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width: 600px; background-color: ${COLORS.white}; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td align="center" style="padding: 32px 40px; background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); border-radius: 12px 12px 0 0;">
              <img src="https://portal.bda-global.org/bda-email-logo.png" alt="The Business Development Association (BDA®)" width="220" style="max-width: 220px; height: auto;" />
            </td>
          </tr>
          <tr>
            <td class="content" style="padding: 40px; color: ${COLORS.text}; font-size: 16px; line-height: 1.6;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: ${COLORS.background}; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: ${COLORS.textLight};">The Business Development Association (BDA&reg;)</p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: ${COLORS.textLight};">
                <a href="https://bda-global.org" style="color: ${COLORS.primary}; text-decoration: none;">Website</a> |
                <a href="https://portal.bda-global.org" style="color: ${COLORS.primary}; text-decoration: none;">Portal</a> |
                <a href="mailto:info@bda-global.org" style="color: ${COLORS.primary}; text-decoration: none;">Contact Us</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: ${COLORS.textLight};">&copy; ${new Date().getFullYear()} The Business Development Association (BDA&reg;). All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

function button(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;"><tr><td align="center"><a href="${url}" class="button" style="display: inline-block; padding: 14px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white}; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">${text}</a></td></tr></table>`
}

function infoBox(title: string, items: { label: string; value: string }[]): string {
  const itemsHtml = items.map(item => `<tr><td style="padding: 8px 0; border-bottom: 1px solid ${COLORS.border};"><strong style="color: ${COLORS.textLight};">${item.label}:</strong></td><td style="padding: 8px 0 8px 16px; border-bottom: 1px solid ${COLORS.border}; text-align: right;">${item.value}</td></tr>`).join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background}; border-radius: 8px; margin: 24px 0;"><tr><td style="padding: 20px;"><h3 style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.primary};">${title}</h3><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${itemsHtml}</table></td></tr></table>`
}

// ============================================================================
// Welcome Email
// ============================================================================

export interface WelcomeEmailData {
  firstName: string
  email: string
  loginUrl: string
  setPasswordUrl?: string
}

export function welcomeEmailHtml(data: WelcomeEmailData): string {
  const { firstName, email, loginUrl, setPasswordUrl } = data
  const actionUrl = setPasswordUrl || loginUrl
  const actionLabel = setPasswordUrl ? 'Set My Password & Access Portal' : 'Login to BDA Portal'
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #1f2937;">Welcome to BDA Portal, ${firstName}!</h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #6b7280;">Your purchase has been confirmed and your account is ready.</p>

    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #1e40af; border-radius: 8px; padding: 20px 24px; margin: 0 0 28px 0;">
      <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #1e40af;">&#x1F511; Action Required: Set Your Password</p>
      <p style="margin: 0; font-size: 14px; color: #374151;">Your BDA Portal account has been created with the email address below. To access your exam voucher and portal features, please set your password using the button below.</p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin: 0 0 28px 0;">
      <tr><td style="padding: 18px 20px;">
        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">Your Portal Login Email</p>
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">${email}</p>
      </td></tr>
    </table>

    <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">Click the button below to set your password and access your account:</p>
    ${button(actionLabel, actionUrl)}
    <p style="margin: 0 0 28px 0; font-size: 12px; color: #9ca3af; text-align: center;">This link expires in 24 hours. If it has expired, use the <a href="${loginUrl}" style="color: #1e40af;">Forgot Password</a> option on the login page.</p>

    <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151;">Once inside the portal, you can:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px 0;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;">&#x2705;&nbsp; Access and schedule your BDA certification exam</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;">&#x2705;&nbsp; Use the Learning System (modules, flashcards, question bank)</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;">&#x2705;&nbsp; Track your Professional Development Credits (PDCs)</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-size: 14px; color: #374151;">&#x2705;&nbsp; Download your certificates and credentials</td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 13px; color: #9ca3af;">Need help? Contact us at <a href="mailto:support@bda-global.org" style="color: #1e40af; text-decoration: none;">support@bda-global.org</a></p>
  `
  return baseTemplate(`Action Required: Set your BDA Portal password, ${firstName}`, content)
}

export function welcomeEmailText(data: WelcomeEmailData): string {
  const actionUrl = data.setPasswordUrl || data.loginUrl
  return [
    `Welcome to BDA Portal, ${data.firstName}!`,
    ``,
    `Your purchase has been confirmed and your BDA Portal account is ready.`,
    ``,
    `ACTION REQUIRED: Set Your Password`,
    `------------------------------------------`,
    `Your portal login email: ${data.email}`,
    ``,
    data.setPasswordUrl
      ? `Click the link below to set your password and access your account:`
      : `Click the link below to login to your account:`,
    actionUrl,
    ``,
    `This link expires in 24 hours. If it has expired, visit:`,
    `${data.loginUrl} and use the "Forgot Password" option.`,
    ``,
    `Once inside the portal, you can:`,
    `- Access and schedule your BDA certification exam`,
    `- Use the Learning System (modules, flashcards, question bank)`,
    `- Track your Professional Development Credits (PDCs)`,
    `- Download your certificates and credentials`,
    ``,
    `Need help? Contact us at support@bda-global.org`,
    ``,
    `---`,
    `The Business Development Association (BDA®)`,
    `https://bda-global.org | https://portal.bda-global.org`,
  ].join('\n')
}

// ============================================================================
// Exam Reminder Email
// ============================================================================

export interface ExamReminderData {
  firstName: string
  examTitle: string
  examDate: string
  examTime: string
  timezone: string
  confirmationCode: string
  duration: string
  dashboardUrl: string
  hoursUntilExam: 24 | 48
}

export function examReminderHtml(data: ExamReminderData): string {
  const { firstName, examTitle, examDate, examTime, timezone, confirmationCode, duration, dashboardUrl, hoursUntilExam } = data
  const urgencyText = hoursUntilExam === 24 ? 'Tomorrow' : 'In 2 Days'
  const urgencyColor = hoursUntilExam === 24 ? '#dc2626' : '#ea580c'

  const content = `
    <h1 style="margin: 0 0 24px 0; font-size: 24px; color: #1f2937;">Your Exam is ${urgencyText}!</h1>
    <p style="margin: 0 0 16px 0;">Hi ${firstName},</p>
    <p style="margin: 0 0 24px 0;">This is a friendly reminder that your <strong>${examTitle}</strong> exam is scheduled ${urgencyText.toLowerCase()}.</p>
    ${infoBox('Exam Details', [
      { label: 'Exam', value: examTitle },
      { label: 'Date', value: examDate },
      { label: 'Time', value: `${examTime} (${timezone})` },
      { label: 'Duration', value: duration },
      { label: 'Confirmation Code', value: `<strong>${confirmationCode}</strong>` },
    ])}
    ${button('Go to Dashboard', dashboardUrl)}
    <div style="background-color: #fef3c7; border-left: 4px solid ${urgencyColor}; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #92400e;"><strong>Before Your Exam:</strong></p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #92400e;">
        <li>Test your internet connection</li>
        <li>Ensure your webcam and microphone work properly</li>
        <li>Find a quiet, well-lit room</li>
        <li>Have a valid government-issued ID ready</li>
      </ul>
    </div>
    <p style="margin: 0; color: #6b7280; font-size: 14px;">Need to reschedule? Contact us at <a href="mailto:exams@bda-global.org" style="color: #1e40af;">exams@bda-global.org</a>.</p>
  `
  return baseTemplate(`Reminder: Your ${examTitle} exam is ${urgencyText.toLowerCase()} at ${examTime}`, content)
}

export function examReminderText(data: ExamReminderData): string {
  const urgencyText = data.hoursUntilExam === 24 ? 'tomorrow' : 'in 2 days'
  return `YOUR EXAM IS ${urgencyText.toUpperCase()}!\n\nHi ${data.firstName},\n\nYour ${data.examTitle} exam is scheduled ${urgencyText}.\n\nExam: ${data.examTitle}\nDate: ${data.examDate}\nTime: ${data.examTime} (${data.timezone})\nDuration: ${data.duration}\nConfirmation: ${data.confirmationCode}\n\nDashboard: ${data.dashboardUrl}\n\n---\nBDA Association`
}

// ============================================================================
// Partner Approved Email
// ============================================================================

export interface PartnerApprovedData {
  firstName: string
  organizationName: string
  partnerType: 'ECP' | 'PDP'
  partnerNumber: string
  dashboardUrl: string
}

export function partnerApprovedHtml(data: PartnerApprovedData): string {
  const { firstName, organizationName, partnerType, partnerNumber, dashboardUrl } = data
  const partnerTypeFull = partnerType === 'ECP' ? 'Exam Center Partner' : 'Program Development Partner'
  const benefits = partnerType === 'ECP'
    ? ['Access to exam voucher management', 'Trainer certification tools', 'Learning system resources', 'Mock exam access for candidates', 'Partner badge and certificate']
    : ['Program development resources', 'Competency mapping tools', 'Trainer certification pathway', 'Partner badge and certificate', 'Marketing co-branding materials']

  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color: white; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">✓ Application Approved</div>
    </div>
    <h1 style="margin: 0 0 24px 0; font-size: 24px; color: #1f2937; text-align: center;">Welcome to the BDA Partner Network!</h1>
    <p style="margin: 0 0 16px 0;">Dear ${firstName},</p>
    <p style="margin: 0 0 24px 0;">We are pleased to inform you that <strong>${organizationName}</strong> has been approved as a <strong>BDA ${partnerTypeFull} (${partnerType})</strong>.</p>
    <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #1e40af;"><strong>Your Partner ID:</strong></p>
      <p style="margin: 0; font-size: 20px; font-weight: bold; color: #1e40af; font-family: monospace;">${partnerNumber}</p>
    </div>
    <h3 style="margin: 24px 0 16px 0; font-size: 16px; color: #1f2937;">As a BDA ${partnerType} Partner, you now have access to:</h3>
    <ul style="margin: 0 0 24px 0; padding-left: 24px; color: #4b5563;">
      ${benefits.map(b => `<li style="margin-bottom: 8px;">${b}</li>`).join('')}
    </ul>
    ${button('Access Partner Dashboard', dashboardUrl)}
    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">Questions? Contact us at <a href="mailto:partners@bda-global.org" style="color: #1e40af;">partners@bda-global.org</a>.</p>
  `
  return baseTemplate(`Congratulations! ${organizationName} is now a BDA ${partnerType} Partner`, content)
}

export function partnerApprovedText(data: PartnerApprovedData): string {
  return `APPLICATION APPROVED!\n\nWelcome to the BDA Partner Network!\n\nDear ${data.firstName},\n\n${data.organizationName} has been approved as a BDA ${data.partnerType} Partner.\n\nPartner ID: ${data.partnerNumber}\n\nDashboard: ${data.dashboardUrl}\n\n---\nBDA Association`
}

// ============================================================================
// Certification Issued Email
// ============================================================================

export interface CertificationIssuedData {
  firstName: string
  lastName: string
  certificationName: string
  certificationLevel: string
  issueDate: string
  expirationDate?: string
  certificateNumber: string
  verificationUrl: string
  downloadUrl: string
}

export function certificationIssuedHtml(data: CertificationIssuedData): string {
  const { firstName, lastName, certificationName, certificationLevel, issueDate, expirationDate, certificateNumber, verificationUrl, downloadUrl } = data

  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">🎉 Congratulations!</div>
    </div>
    <h1 style="margin: 0 0 24px 0; font-size: 24px; color: #1f2937; text-align: center;">You're Now BDA Certified!</h1>
    <p style="margin: 0 0 16px 0;">Dear ${firstName},</p>
    <p style="margin: 0 0 24px 0;">Congratulations on successfully completing your <strong>${certificationName}</strong> certification!</p>
    ${infoBox('Your Certification Details', [
      { label: 'Name', value: `${firstName} ${lastName}` },
      { label: 'Certification', value: certificationName },
      { label: 'Level', value: certificationLevel },
      { label: 'Certificate #', value: certificateNumber },
      { label: 'Issue Date', value: issueDate },
      ...(expirationDate ? [{ label: 'Valid Until', value: expirationDate }] : []),
    ])}
    ${button('Download Certificate', downloadUrl)}
    <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #166534;"><strong>Share Your Achievement</strong></p>
      <p style="margin: 0; font-size: 12px;"><a href="${verificationUrl}" style="color: #1e40af; word-break: break-all;">${verificationUrl}</a></p>
    </div>
    <p style="margin: 0; color: #6b7280; font-size: 14px;">Thank you for choosing BDA for your professional certification!</p>
  `
  return baseTemplate(`Congratulations! You've earned your ${certificationName} certification`, content)
}

export function certificationIssuedText(data: CertificationIssuedData): string {
  return `CONGRATULATIONS! YOU'RE NOW BDA CERTIFIED!\n\nDear ${data.firstName},\n\nYou've successfully completed your ${data.certificationName} certification!\n\nCertificate #: ${data.certificateNumber}\nLevel: ${data.certificationLevel}\nIssue Date: ${data.issueDate}${data.expirationDate ? `\nValid Until: ${data.expirationDate}` : ''}\n\nDownload: ${data.downloadUrl}\nVerify: ${data.verificationUrl}\n\n---\nBDA Association`
}

// ============================================================================
// Voucher Created Email
// ============================================================================

export interface VoucherCreatedData {
  partnerName: string
  voucherCode: string
  examType: string
  candidateEmail?: string
  candidateName?: string
  validUntil: string
  bookingUrl: string
  partnerDashboardUrl: string
}

export function voucherCreatedHtml(data: VoucherCreatedData): string {
  const { partnerName, voucherCode, examType, candidateName, validUntil, bookingUrl, partnerDashboardUrl } = data

  const content = `
    <h1 style="margin: 0 0 24px 0; font-size: 24px; color: #1f2937;">Exam Voucher Created</h1>
    <p style="margin: 0 0 16px 0;">Dear ${partnerName},</p>
    <p style="margin: 0 0 24px 0;">A new exam voucher has been created for your organization.${candidateName ? ` This voucher has been assigned to <strong>${candidateName}</strong>.` : ''}</p>
    ${infoBox('Voucher Details', [
      { label: 'Voucher Code', value: `<strong style="font-family: monospace; font-size: 16px;">${voucherCode}</strong>` },
      { label: 'Exam Type', value: examType },
      { label: 'Valid Until', value: validUntil },
      ...(candidateName ? [{ label: 'Assigned To', value: candidateName }] : []),
    ])}
    <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #1e40af;"><strong>Booking Link for Candidate</strong></p>
      <p style="margin: 0; font-size: 12px; word-break: break-all;"><a href="${bookingUrl}" style="color: #1e40af;">${bookingUrl}</a></p>
    </div>
    ${button('View Partner Dashboard', partnerDashboardUrl)}
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Important:</strong> This voucher expires on ${validUntil}.</p>
    </div>
  `
  return baseTemplate(`New exam voucher created: ${voucherCode} for ${examType}`, content)
}

export function voucherCreatedText(data: VoucherCreatedData): string {
  return `EXAM VOUCHER CREATED\n\nDear ${data.partnerName},\n\nVoucher Code: ${data.voucherCode}\nExam Type: ${data.examType}\nValid Until: ${data.validUntil}${data.candidateName ? `\nAssigned To: ${data.candidateName}` : ''}\n\nBooking: ${data.bookingUrl}\nDashboard: ${data.partnerDashboardUrl}\n\n---\nBDA Association`
}

// ============================================================================
// Exam Booking Email
// ============================================================================

export interface ExamBookingData {
  firstName: string
  examTitle: string
  examDate: string
  examTime: string
  timezone: string
  duration: string
  confirmationCode: string
  dashboardUrl: string
}

export function examBookingHtml(data: ExamBookingData): string {
  const { firstName, examTitle, examDate, examTime, timezone, duration, confirmationCode, dashboardUrl } = data

  const content = `
    <h1 style="margin: 0 0 24px 0; font-size: 24px; color: #1f2937;">Exam Booking Confirmed!</h1>
    <p style="margin: 0 0 16px 0;">Dear ${firstName},</p>
    <p style="margin: 0 0 24px 0;">Your exam has been successfully scheduled. Please save this confirmation for reference.</p>
    ${infoBox('Exam Details', [
      { label: 'Exam', value: examTitle },
      { label: 'Date', value: examDate },
      { label: 'Time', value: `${examTime} (${timezone})` },
      { label: 'Duration', value: duration },
      { label: 'Confirmation Code', value: `<strong style="color: #059669;">${confirmationCode}</strong>` },
    ])}
    ${button('View in Dashboard', dashboardUrl)}
    <h3 style="margin: 32px 0 16px 0; font-size: 18px; color: #1e40af;">Preparation Tips</h3>
    <ul style="margin: 0 0 24px 0; padding-left: 20px;">
      <li style="margin-bottom: 8px;">Ensure a stable internet connection</li>
      <li style="margin-bottom: 8px;">Use a quiet, well-lit environment</li>
      <li style="margin-bottom: 8px;">Have your ID ready for verification</li>
      <li style="margin-bottom: 8px;">Complete any required system checks beforehand</li>
    </ul>
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Important:</strong> Please arrive 15 minutes before your scheduled time.</p>
    </div>
  `
  return baseTemplate(`Your ${examTitle} exam is confirmed for ${examDate} at ${examTime}`, content)
}

export function examBookingText(data: ExamBookingData): string {
  return `EXAM BOOKING CONFIRMED!\n\nDear ${data.firstName},\n\nExam: ${data.examTitle}\nDate: ${data.examDate}\nTime: ${data.examTime} (${data.timezone})\nDuration: ${data.duration}\nConfirmation: ${data.confirmationCode}\n\nDashboard: ${data.dashboardUrl}\n\nPlease arrive 15 minutes early.\n\n---\nBDA Association`
}

// ============================================================================
// Helper: Queue Email with Template
// ============================================================================

export interface QueueEmailParams {
  supabase: any
  recipientEmail: string
  recipientName?: string
  templateName: string
  subject: string
  htmlBody: string
  textBody: string
  priority?: number
  relatedEntityType?: string
  relatedEntityId?: string
}

export async function queueEmailWithTemplate(params: QueueEmailParams): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const { supabase, recipientEmail, recipientName, templateName, subject, htmlBody, textBody, priority = 5, relatedEntityType, relatedEntityId } = params

  try {
    const { data, error } = await supabase.rpc('queue_email', {
      p_recipient_email: recipientEmail,
      p_recipient_name: recipientName || null,
      p_template_name: templateName,
      p_template_data: { html_body: htmlBody, text_body: textBody },
      p_priority: priority,
      p_scheduled_for: new Date().toISOString(),
      p_related_entity_type: relatedEntityType || null,
      p_related_entity_id: relatedEntityId || null,
    })

    if (error) {
      console.error('[queueEmailWithTemplate] Error:', error)
      return { success: false, error: error.message }
    }

    // Update subject
    if (data) {
      await supabase.from('email_queue').update({ subject }).eq('id', data)
    }

    return { success: true, emailId: data }
  } catch (err: any) {
    console.error('[queueEmailWithTemplate] Exception:', err)
    return { success: false, error: err.message }
  }
}
