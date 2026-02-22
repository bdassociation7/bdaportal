/**
 * Email Templates Service
 *
 * Generates HTML and text email content using templates
 * and queues emails for sending via the send-emails Edge Function
 */

import { supabase } from '@/lib/supabase';
import type { EmailTemplateName } from './email.types';

// Import templates
import {
  welcomeEmailHtml,
  welcomeEmailText,
  getWelcomeEmailSubject,
  type WelcomeEmailData,
} from './templates/welcome-email';

import {
  examBookingHtml,
  examBookingText,
  getExamBookingSubject,
  type ExamBookingData,
} from './templates/exam-booking';

import {
  examReminderHtml,
  examReminderText,
  getExamReminderSubject,
  type ExamReminderData,
} from './templates/exam-reminder';

import {
  passwordResetHtml,
  passwordResetText,
  getPasswordResetSubject,
  type PasswordResetData,
} from './templates/password-reset';

import {
  certificationIssuedHtml,
  certificationIssuedText,
  getCertificationIssuedSubject,
  type CertificationIssuedData,
} from './templates/certification-issued';

import {
  voucherCreatedHtml,
  voucherCreatedText,
  getVoucherCreatedSubject,
  type VoucherCreatedData,
} from './templates/voucher-created';

import {
  partnerApprovedHtml,
  partnerApprovedText,
  getPartnerApprovedSubject,
  type PartnerApprovedData,
} from './templates/partner-approved';

// ============================================================================
// Types
// ============================================================================

interface QueueEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

interface QueueOptions {
  priority?: number; // 1=highest, 10=lowest (default: 5)
  scheduledFor?: Date;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

// ============================================================================
// Core Queue Function
// ============================================================================

async function queueEmailWithTemplate(
  recipientEmail: string,
  recipientName: string | undefined,
  templateName: EmailTemplateName,
  subject: string,
  htmlBody: string,
  textBody: string,
  templateData: Record<string, any>,
  options: QueueOptions = {}
): Promise<QueueEmailResult> {
  try {
    const { data, error } = await supabase.rpc('queue_email', {
      p_recipient_email: recipientEmail,
      p_recipient_name: recipientName || null,
      p_template_name: templateName,
      p_template_data: {
        ...templateData,
        html_body: htmlBody,
        text_body: textBody,
      },
      p_priority: options.priority || 5,
      p_scheduled_for: options.scheduledFor?.toISOString() || new Date().toISOString(),
      p_related_entity_type: options.relatedEntityType || null,
      p_related_entity_id: options.relatedEntityId || null,
    });

    if (error) {
      console.error('[EmailTemplates] Queue error:', error);
      return { success: false, error: error.message };
    }

    // Update subject in email_queue (RPC doesn't handle it)
    if (data) {
      await supabase
        .from('email_queue')
        .update({ subject })
        .eq('id', data);
    }

    return { success: true, emailId: data };
  } catch (error) {
    console.error('[EmailTemplates] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Template-Specific Queue Functions
// ============================================================================

/**
 * Queue a welcome email for a new user
 */
export async function queueWelcomeEmail(
  data: WelcomeEmailData,
  options?: QueueOptions
): Promise<QueueEmailResult> {
  const htmlBody = welcomeEmailHtml(data);
  const textBody = welcomeEmailText(data);
  const subject = getWelcomeEmailSubject(data.firstName);

  return queueEmailWithTemplate(
    data.email,
    data.firstName,
    'welcome',
    subject,
    htmlBody,
    textBody,
    data,
    { priority: 2, ...options }
  );
}

/**
 * Queue an exam booking confirmation email
 */
export async function queueExamBookingEmail(
  recipientEmail: string,
  data: ExamBookingData,
  options?: QueueOptions
): Promise<QueueEmailResult> {
  const htmlBody = examBookingHtml(data);
  const textBody = examBookingText(data);
  const subject = getExamBookingSubject(data.examTitle, data.confirmationCode);

  return queueEmailWithTemplate(
    recipientEmail,
    data.firstName,
    'exam_booking',
    subject,
    htmlBody,
    textBody,
    data,
    {
      priority: 1, // High priority
      relatedEntityType: 'exam_booking',
      ...options,
    }
  );
}

/**
 * Queue an exam reminder email (24h or 48h)
 */
export async function queueExamReminderEmail(
  recipientEmail: string,
  data: ExamReminderData,
  options?: QueueOptions
): Promise<QueueEmailResult> {
  const htmlBody = examReminderHtml(data);
  const textBody = examReminderText(data);
  const subject = getExamReminderSubject(data.hoursUntilExam, data.examTitle);

  const templateName: EmailTemplateName =
    data.hoursUntilExam === 24 ? 'exam_reminder_24h' : 'exam_reminder_48h';

  return queueEmailWithTemplate(
    recipientEmail,
    data.firstName,
    templateName,
    subject,
    htmlBody,
    textBody,
    data,
    {
      priority: 1, // High priority
      relatedEntityType: 'exam_booking',
      ...options,
    }
  );
}

/**
 * Queue a password reset email
 */
export async function queuePasswordResetEmail(
  recipientEmail: string,
  data: PasswordResetData,
  options?: QueueOptions
): Promise<QueueEmailResult> {
  const htmlBody = passwordResetHtml(data);
  const textBody = passwordResetText(data);
  const subject = getPasswordResetSubject();

  return queueEmailWithTemplate(
    recipientEmail,
    data.firstName,
    'password_reset',
    subject,
    htmlBody,
    textBody,
    data,
    { priority: 1, ...options } // High priority
  );
}

/**
 * Queue a certification issued email
 */
export async function queueCertificationIssuedEmail(
  recipientEmail: string,
  data: CertificationIssuedData,
  options?: QueueOptions
): Promise<QueueEmailResult> {
  const htmlBody = certificationIssuedHtml(data);
  const textBody = certificationIssuedText(data);
  const subject = getCertificationIssuedSubject(data.certificationName);

  return queueEmailWithTemplate(
    recipientEmail,
    data.firstName,
    'certification_issued',
    subject,
    htmlBody,
    textBody,
    data,
    {
      priority: 2,
      relatedEntityType: 'certification',
      ...options,
    }
  );
}

/**
 * Queue a voucher created email (for ECP partners)
 */
export async function queueVoucherCreatedEmail(
  recipientEmail: string,
  data: VoucherCreatedData,
  options?: QueueOptions
): Promise<QueueEmailResult> {
  const htmlBody = voucherCreatedHtml(data);
  const textBody = voucherCreatedText(data);
  const subject = getVoucherCreatedSubject(data.examType);

  return queueEmailWithTemplate(
    recipientEmail,
    data.partnerName,
    'voucher_created',
    subject,
    htmlBody,
    textBody,
    data,
    {
      priority: 3,
      relatedEntityType: 'voucher',
      ...options,
    }
  );
}

/**
 * Queue a partner approved email (ECP/PDP)
 */
export async function queuePartnerApprovedEmail(
  recipientEmail: string,
  data: PartnerApprovedData,
  options?: QueueOptions
): Promise<QueueEmailResult> {
  const htmlBody = partnerApprovedHtml(data);
  const textBody = partnerApprovedText(data);
  const subject = getPartnerApprovedSubject(data.organizationName, data.partnerType);

  return queueEmailWithTemplate(
    recipientEmail,
    data.firstName,
    'partner_approved',
    subject,
    htmlBody,
    textBody,
    data,
    {
      priority: 2,
      relatedEntityType: data.partnerType === 'ECP' ? 'ecp_license' : 'pdp_program',
      ...options,
    }
  );
}

// ============================================================================
// Trigger Email Sending
// ============================================================================

/**
 * Trigger the send-emails Edge Function to process queued emails
 * This is optional - can also be triggered via cron or manual call
 */
export async function triggerEmailSending(): Promise<{
  success: boolean;
  processed?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('send-emails', {
      body: { limit: 20 },
    });

    if (error) {
      console.error('[EmailTemplates] Trigger error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      processed: data?.processed || 0,
    };
  } catch (error) {
    console.error('[EmailTemplates] Trigger error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Export Service
// ============================================================================

export const EmailTemplatesService = {
  // Queue functions
  queueWelcomeEmail,
  queueExamBookingEmail,
  queueExamReminderEmail,
  queuePasswordResetEmail,
  queueCertificationIssuedEmail,
  queueVoucherCreatedEmail,
  queuePartnerApprovedEmail,

  // Trigger sending
  triggerEmailSending,
};

export default EmailTemplatesService;
