/**
 * Admin Training Batch Types
 * Types for admin management of ECP training batches (US12-13)
 */

import type { CertificationType, TrainingMode, EnrollmentStatus } from '../ecp/ecp.types';

// Re-export BatchStatus for use in pages
export type BatchStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// =============================================================================
// Admin Batch View (includes partner info)
// =============================================================================

export interface AdminTrainingBatch {
  id: string;
  partner_id: string;
  batch_code: string;
  batch_name: string;
  batch_name_ar?: string;
  description?: string;
  certification_type: CertificationType;
  trainer_id?: string;
  training_start_date: string;
  training_end_date: string;
  exam_date?: string;
  training_location?: string;
  training_mode: TrainingMode;
  max_capacity: number;
  status: BatchStatus;
  created_at: string;
  updated_at: string;
  // Admin-specific fields
  admin_approved?: boolean;
  admin_approved_at?: string;
  admin_approved_by?: string;
  admin_notes?: string;
  trainee_accounts_created?: boolean;
  // Relations
  partner?: {
    id: string;
    first_name: string;
    last_name: string;
    company_name?: string;
    email: string;
  };
  trainer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  // Computed
  trainee_count?: number;
  certified_count?: number;
}

export interface AdminTrainee {
  id: string;
  partner_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  user_id?: string;
  company_name?: string;
  job_title?: string;
  batch_id?: string;
  certification_type: CertificationType;
  enrollment_status: EnrollmentStatus;
  training_completed: boolean;
  training_completion_date?: string;
  exam_scheduled: boolean;
  exam_date?: string;
  exam_passed?: boolean;
  exam_score?: number;
  certified: boolean;
  certification_date?: string;
  certificate_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Computed
  full_name?: string;
  account_created?: boolean;
}

// =============================================================================
// Batch Review Actions
// =============================================================================

export type BatchReviewStatus = 'pending_review' | 'approved' | 'rejected' | 'needs_revision';

export interface BatchReviewAction {
  batch_id: string;
  action: 'approve' | 'reject' | 'request_revision';
  notes?: string;
  create_trainee_accounts?: boolean;
}

export interface BatchApprovalResult {
  success: boolean;
  batch_id: string;
  accounts_created?: number;
  errors?: string[];
}

// =============================================================================
// Trainee Account Creation
// =============================================================================

export interface CreateTraineeAccountDTO {
  trainee_id: string;
  send_welcome_email?: boolean;
  activate_membership?: boolean;
  membership_type?: 'basic' | 'professional';
  grant_curriculum_access?: boolean;
}

export interface BulkCreateAccountsDTO {
  batch_id: string;
  trainee_ids?: string[]; // If not provided, create for all trainees in batch
  send_welcome_email?: boolean;
  activate_membership?: boolean;
  membership_type?: 'basic' | 'professional';
  grant_curriculum_access?: boolean;
}

export interface BulkCreateAccountsResult {
  success_count: number;
  error_count: number;
  skipped_count: number;
  created_accounts: {
    trainee_id: string;
    user_id: string;
    email: string;
  }[];
  errors: {
    trainee_id: string;
    email: string;
    error: string;
  }[];
}

// =============================================================================
// Filters
// =============================================================================

export interface AdminBatchFilters {
  status?: BatchStatus;
  certification_type?: CertificationType;
  partner_id?: string;
  admin_approved?: boolean;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface AdminTraineeFilters {
  batch_id?: string;
  partner_id?: string;
  certification_type?: CertificationType;
  enrollment_status?: EnrollmentStatus;
  has_account?: boolean;
  certified?: boolean;
  search?: string;
}

// =============================================================================
// Statistics
// =============================================================================

export interface AdminBatchStats {
  total_batches: number;
  pending_review: number;
  approved: number;
  in_progress: number;
  completed: number;
  total_trainees: number;
  accounts_created: number;
  certified_trainees: number;
  average_pass_rate?: number;
}

// =============================================================================
// Batch Status Info for UI
// =============================================================================

export const BATCH_STATUS_INFO: Record<BatchStatus, { label: string; labelAr: string; color: string }> = {
  draft: { label: 'Draft', labelAr: 'مسودة', color: 'gray' },
  scheduled: { label: 'Scheduled', labelAr: 'مجدول', color: 'blue' },
  in_progress: { label: 'In Progress', labelAr: 'قيد التنفيذ', color: 'yellow' },
  completed: { label: 'Completed', labelAr: 'مكتمل', color: 'green' },
  cancelled: { label: 'Cancelled', labelAr: 'ملغى', color: 'red' },
};

export const ENROLLMENT_STATUS_INFO: Record<EnrollmentStatus, { label: string; labelAr: string; color: string }> = {
  enrolled: { label: 'Enroled', labelAr: 'مسجل', color: 'blue' },
  attending: { label: 'Attending', labelAr: 'حاضر', color: 'yellow' },
  completed: { label: 'Completed', labelAr: 'مكتمل', color: 'green' },
  dropped: { label: 'Dropped', labelAr: 'انسحب', color: 'red' },
  transferred: { label: 'Transferred', labelAr: 'محول', color: 'purple' },
};

export const TRAINING_MODE_INFO: Record<TrainingMode, { label: string; labelAr: string }> = {
  in_person: { label: 'In Person', labelAr: 'حضوري' },
  online: { label: 'Online', labelAr: 'عبر الإنترنت' },
  hybrid: { label: 'Hybrid', labelAr: 'مختلط' },
};
