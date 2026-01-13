/**
 * Email Types
 *
 * TypeScript types for email notification system
 * Requirements: task.md Step 4 - Email Confirmations
 */

// ============================================================================
// Email Status
// ============================================================================

export type EmailStatus = 'pending' | 'sent' | 'failed' | 'retrying';

export type EmailTemplateName =
  | 'welcome'
  | 'booking_confirmation'
  | 'exam_booking'
  | 'exam_reminder_48h'
  | 'exam_reminder_24h'
  | 'exam_reminder'
  | 'password_reset'
  | 'certification_issued'
  | 'voucher_created'
  | 'partner_approved';

// ============================================================================
// Email Queue Interface
// ============================================================================

export interface EmailQueueItem {
  id: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  template_name: EmailTemplateName;
  template_data: Record<string, any>;
  status: EmailStatus;
  attempts: number;
  max_attempts: number;
  last_attempt_at?: string;
  sent_at?: string;
  error_message?: string;
  priority: number; // 1=highest, 10=lowest
  scheduled_for: string;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Email Submission Types
// ============================================================================

export interface QueueEmailSubmission {
  recipient_email: string;
  recipient_name?: string;
  template_name: EmailTemplateName;
  template_data: Record<string, any>;
  priority?: number;
  scheduled_for?: Date;
  related_entity_type?: string;
  related_entity_id?: string;
}

// ============================================================================
// Response Type
// ============================================================================

export interface EmailResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// ============================================================================
// Template Data Interfaces
// ============================================================================

export interface BookingConfirmationData {
  candidate_name: string;
  confirmation_code: string;
  exam_date: string;
  exam_time: string;
  timezone: string;
  duration: string;
  exam_title?: string;
  dashboard_url: string;
}

export interface ExamReminderData {
  candidate_name: string;
  exam_date: string;
  exam_time: string;
  confirmation_code: string;
  dashboard_url?: string;
}
