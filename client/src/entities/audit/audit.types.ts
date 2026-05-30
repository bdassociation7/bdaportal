/**
 * Audit Trail Types
 *
 * TypeScript types for comprehensive audit logging
 * Requirements: task.md - Audit trail for certification exam workflow
 */

// ============================================================================
// Audit Event Types
// ============================================================================

export type AuditEventType =
  // Authentication & Account
  | 'user_login'
  | 'user_logout'
  | 'user_registered'
  | 'password_changed'
  | 'email_changed'

  // Profile & Identity
  | 'profile_updated'
  | 'identity_verification_submitted'
  | 'identity_verification_approved'
  | 'identity_verification_rejected'

  // Consent & Honor Code
  | 'consent_accepted'
  | 'consent_withdrawn'
  | 'honor_code_accepted'

  // Exam Registration & Access
  | 'exam_registered'
  | 'exam_access_granted'
  | 'exam_access_denied'
  | 'exam_launched'
  | 'exam_started'
  | 'exam_paused'
  | 'exam_resumed'
  | 'exam_submitted'
  | 'exam_auto_submitted'
  | 'exam_terminated'

  // Exam Answers
  | 'answer_saved'
  | 'answer_changed'
  | 'answer_submitted'

  // Results & Certification
  | 'exam_graded'
  | 'exam_passed'
  | 'exam_failed'
  | 'certificate_issued'
  | 'certificate_revoked'
  | 'certificate_downloaded'

  // Security & Violations
  | 'suspicious_activity_detected'
  | 'exam_violation_logged'
  | 'session_timeout'
  | 'multiple_login_attempt'
  | 'unauthorised_access_attempt'

  // Admin Actions
  | 'admin_user_modified'
  | 'admin_exam_modified'
  | 'admin_certificate_issued'
  | 'admin_certificate_revoked'
  | 'admin_verification_reviewed'

  // System
  | 'system_error'
  | 'data_export_requested'
  | 'data_deleted';

export type SecurityLevel = 'low' | 'normal' | 'high' | 'critical';

export type SubjectType =
  | 'user'
  | 'exam'
  | 'exam_attempt'
  | 'certificate'
  | 'answer'
  | 'identity_verification'
  | 'consent'
  | 'honor_code';

// ============================================================================
// Audit Log Interface
// ============================================================================

export interface AuditLog {
  id: string;
  event_type: AuditEventType;
  event_timestamp: string;

  // Actor (who performed the action)
  user_id?: string;
  actor_role?: string;
  actor_email?: string;

  // Subject (who/what was affected)
  subject_user_id?: string;
  subject_type?: SubjectType;
  subject_id?: string;

  // Context
  quiz_id?: string;
  attempt_id?: string;
  session_id?: string;

  // Details
  description: string;
  event_details?: Record<string, any>;

  // Technical Context
  ip_address?: string;
  user_agent?: string;
  request_url?: string;
  http_method?: string;

  // Security
  security_level: SecurityLevel;
  flagged_as_suspicious: boolean;

  // Outcome
  success: boolean;
  error_message?: string;

  // Metadata
  metadata?: Record<string, any>;
  created_at: string;
}

// ============================================================================
// Audit Log Submission
// ============================================================================

export interface AuditLogSubmission {
  event_type: AuditEventType;
  description: string;

  // Optional context
  subject_user_id?: string;
  subject_type?: SubjectType;
  subject_id?: string;

  quiz_id?: string;
  attempt_id?: string;

  event_details?: Record<string, any>;

  // Optional technical details
  ip_address?: string;
  user_agent?: string;

  security_level?: SecurityLevel;
  flagged_as_suspicious?: boolean;

  success?: boolean;
  error_message?: string;
}

// ============================================================================
// Audit Query Filters
// ============================================================================

export interface AuditHistoryFilters {
  user_id?: string;
  event_type?: AuditEventType;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

export interface ExamAuditFilters {
  quiz_id: string;
  attempt_id?: string;
}

// ============================================================================
// Audit Summary
// ============================================================================

export interface UserEventSummary {
  event_type: AuditEventType;
  event_count: number;
  last_occurrence: string;
}

export interface SuspiciousActivity extends AuditLog {
  // All fields from AuditLog
}

// ============================================================================
// Response Types
// ============================================================================

export interface AuditResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// ============================================================================
// Display Labels
// ============================================================================

export const AUDIT_EVENT_LABELS: Record<AuditEventType, string> = {
  // Authentication & Account
  user_login: 'User Login',
  user_logout: 'User Logout',
  user_registered: 'User Registered',
  password_changed: 'Password Changed',
  email_changed: 'Email Changed',

  // Profile & Identity
  profile_updated: 'Profile Updated',
  identity_verification_submitted: 'Identity Verification Submitted',
  identity_verification_approved: 'Identity Verification Approved',
  identity_verification_rejected: 'Identity Verification Rejected',

  // Consent & Honor Code
  consent_accepted: 'Consent Accepted',
  consent_withdrawn: 'Consent Withdrawn',
  honor_code_accepted: 'Honor Code Accepted',

  // Exam Registration & Access
  exam_registered: 'Exam Registered',
  exam_access_granted: 'Exam Access Granted',
  exam_access_denied: 'Exam Access Denied',
  exam_launched: 'Exam Launched',
  exam_started: 'Exam Started',
  exam_paused: 'Exam Paused',
  exam_resumed: 'Exam Resumed',
  exam_submitted: 'Exam Submitted',
  exam_auto_submitted: 'Exam Auto-Submitted',
  exam_terminated: 'Exam Terminated',

  // Exam Answers
  answer_saved: 'Answer Saved',
  answer_changed: 'Answer Changed',
  answer_submitted: 'Answer Submitted',

  // Results & Certification
  exam_graded: 'Exam Graded',
  exam_passed: 'Exam Passed',
  exam_failed: 'Exam Failed',
  certificate_issued: 'Certificate Issued',
  certificate_revoked: 'Certificate Revoked',
  certificate_downloaded: 'Certificate Downloaded',

  // Security & Violations
  suspicious_activity_detected: 'Suspicious Activity Detected',
  exam_violation_logged: 'Exam Violation Logged',
  session_timeout: 'Session Timeout',
  multiple_login_attempt: 'Multiple Login Attempt',
  unauthorized_access_attempt: 'Unauthorised Access Attempt',

  // Admin Actions
  admin_user_modified: 'Admin: User Modified',
  admin_exam_modified: 'Admin: Exam Modified',
  admin_certificate_issued: 'Admin: Certificate Issued',
  admin_certificate_revoked: 'Admin: Certificate Revoked',
  admin_verification_reviewed: 'Admin: Verification Reviewed',

  // System
  system_error: 'System Error',
  data_export_requested: 'Data Export Requested',
  data_deleted: 'Data Deleted',
};

export const SECURITY_LEVEL_LABELS: Record<SecurityLevel, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  critical: 'Critical',
};

export const SECURITY_LEVEL_COLORS: Record<SecurityLevel, string> = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};
