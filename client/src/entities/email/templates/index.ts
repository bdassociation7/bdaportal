/**
 * Email Templates Index
 *
 * Centralized exports for all BDA email templates
 * Each template provides HTML and plain text versions
 */

// Base template utilities
export {
  baseTemplate,
  baseTextTemplate,
  button,
  infoBox,
  BRAND_COLORS,
  type BaseTemplateProps,
} from './base-template';

// Welcome email
export {
  welcomeEmailHtml,
  welcomeEmailText,
  getWelcomeEmailSubject,
  type WelcomeEmailData,
} from './welcome-email';

// Exam booking confirmation
export {
  examBookingHtml,
  examBookingText,
  getExamBookingSubject,
  type ExamBookingData,
} from './exam-booking';

// Exam reminders (24h and 48h)
export {
  examReminderHtml,
  examReminderText,
  getExamReminderSubject,
  type ExamReminderData,
} from './exam-reminder';

// Password reset
export {
  passwordResetHtml,
  passwordResetText,
  getPasswordResetSubject,
  type PasswordResetData,
} from './password-reset';

// Certification issued
export {
  certificationIssuedHtml,
  certificationIssuedText,
  getCertificationIssuedSubject,
  type CertificationIssuedData,
} from './certification-issued';

// Voucher created (for ECP partners)
export {
  voucherCreatedHtml,
  voucherCreatedText,
  getVoucherCreatedSubject,
  type VoucherCreatedData,
} from './voucher-created';

// Partner approved (ECP/PDP)
export {
  partnerApprovedHtml,
  partnerApprovedText,
  getPartnerApprovedSubject,
  type PartnerApprovedData,
} from './partner-approved';

/**
 * Template Registry
 * Maps template names to their generators
 */
export const templateRegistry = {
  welcome: {
    html: (data: any) => {
      const { welcomeEmailHtml } = require('./welcome-email');
      return welcomeEmailHtml(data);
    },
    text: (data: any) => {
      const { welcomeEmailText } = require('./welcome-email');
      return welcomeEmailText(data);
    },
    subject: (data: any) => {
      const { getWelcomeEmailSubject } = require('./welcome-email');
      return getWelcomeEmailSubject(data.firstName);
    },
  },
  exam_booking: {
    html: (data: any) => {
      const { examBookingHtml } = require('./exam-booking');
      return examBookingHtml(data);
    },
    text: (data: any) => {
      const { examBookingText } = require('./exam-booking');
      return examBookingText(data);
    },
    subject: (data: any) => {
      const { getExamBookingSubject } = require('./exam-booking');
      return getExamBookingSubject(data.examTitle, data.confirmationCode);
    },
  },
  exam_reminder: {
    html: (data: any) => {
      const { examReminderHtml } = require('./exam-reminder');
      return examReminderHtml(data);
    },
    text: (data: any) => {
      const { examReminderText } = require('./exam-reminder');
      return examReminderText(data);
    },
    subject: (data: any) => {
      const { getExamReminderSubject } = require('./exam-reminder');
      return getExamReminderSubject(data.hoursUntilExam, data.examTitle);
    },
  },
  password_reset: {
    html: (data: any) => {
      const { passwordResetHtml } = require('./password-reset');
      return passwordResetHtml(data);
    },
    text: (data: any) => {
      const { passwordResetText } = require('./password-reset');
      return passwordResetText(data);
    },
    subject: () => {
      const { getPasswordResetSubject } = require('./password-reset');
      return getPasswordResetSubject();
    },
  },
  certification_issued: {
    html: (data: any) => {
      const { certificationIssuedHtml } = require('./certification-issued');
      return certificationIssuedHtml(data);
    },
    text: (data: any) => {
      const { certificationIssuedText } = require('./certification-issued');
      return certificationIssuedText(data);
    },
    subject: (data: any) => {
      const { getCertificationIssuedSubject } = require('./certification-issued');
      return getCertificationIssuedSubject(data.certificationName);
    },
  },
  voucher_created: {
    html: (data: any) => {
      const { voucherCreatedHtml } = require('./voucher-created');
      return voucherCreatedHtml(data);
    },
    text: (data: any) => {
      const { voucherCreatedText } = require('./voucher-created');
      return voucherCreatedText(data);
    },
    subject: (data: any) => {
      const { getVoucherCreatedSubject } = require('./voucher-created');
      return getVoucherCreatedSubject(data.examType);
    },
  },
  partner_approved: {
    html: (data: any) => {
      const { partnerApprovedHtml } = require('./partner-approved');
      return partnerApprovedHtml(data);
    },
    text: (data: any) => {
      const { partnerApprovedText } = require('./partner-approved');
      return partnerApprovedText(data);
    },
    subject: (data: any) => {
      const { getPartnerApprovedSubject } = require('./partner-approved');
      return getPartnerApprovedSubject(data.organizationName, data.partnerType);
    },
  },
} as const;

export type TemplateName = keyof typeof templateRegistry;
