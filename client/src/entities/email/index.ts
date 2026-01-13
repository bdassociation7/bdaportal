/**
 * Email Entity
 *
 * Exports for email notification system
 */

// Types
export * from './email.types';

// Services
export * from './email.service';
export * from './email-templates.service';

// Templates
export * from './templates';

// Named exports for convenience
export {
  queueEmail,
  getEmailQueue,
  getPendingEmails,
  updateEmailStatus,
  getEmailStatistics,
  replaceTemplateVariables,
} from './email.service';

// Template-based queue functions (recommended)
export {
  queueWelcomeEmail,
  queueExamBookingEmail,
  queueExamReminderEmail,
  queuePasswordResetEmail,
  queueCertificationIssuedEmail,
  queueVoucherCreatedEmail,
  queuePartnerApprovedEmail,
  triggerEmailSending,
  EmailTemplatesService,
} from './email-templates.service';
