/**
 * ECP (Exclusive Certification Partner) Types
 * Complete type definitions for ECP partner management
 */

export type TrainingMode = 'in_person' | 'online' | 'hybrid';
export type BatchStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type TrainerStatus = 'pending' | 'approved' | 'suspended' | 'inactive';
export type EnrollmentStatus = 'enroled' | 'attending' | 'completed' | 'dropped' | 'transferred';
export type VoucherAllocationStatus = 'active' | 'depleted' | 'expired' | 'cancelled';
export type CertificationType = 'CP' | 'SCP';

// =============================================================================
// Training Batches
// =============================================================================

export interface TrainingBatch {
  id: string;
  partner_id: string;
  batch_code: string;
  batch_name: string;
  batch_name_ar?: string;
  description?: string;
  trainer_id?: string;
  trainer?: Trainer;
  training_start_date?: string;
  training_end_date?: string;
  training_location?: string;
  delivery_platform?: string;
  training_mode: TrainingMode;
  max_capacity: number;
  status: BatchStatus;
  created_at: string;
  updated_at: string;
  // Computed
  trainee_count?: number;
}

export interface CreateBatchDTO {
  batch_name?: string;
  batch_name_ar?: string;
  description?: string;
  trainer_id?: string | null;
  training_start_date?: string;
  training_end_date?: string;
  training_location?: string;
  delivery_platform?: string;
  training_mode: TrainingMode;
  max_capacity: number;
}

export interface UpdateBatchDTO extends Partial<CreateBatchDTO> {
  status?: BatchStatus;
}

// =============================================================================
// Trainers
// =============================================================================

export interface Trainer {
  id: string;
  partner_id: string;
  trainer_code?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  certifications: CertificationType[];
  trainer_certification_date?: string;
  trainer_certification_expiry?: string;
  is_active: boolean;
  status: TrainerStatus;
  job_title?: string;
  organisation?: string;
  country_code?: string;
  professional_experience_years?: number;
  training_experience_years?: number;
  expertise_areas?: string[];
  delivery_languages?: string[];
  bio?: string;
  photo_url?: string;
  linkedin_url?: string;
  created_at: string;
  updated_at: string;
  // Computed
  full_name?: string;
  batches_count?: number;
}

export interface CreateTrainerDTO {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  certifications: CertificationType[];
  trainer_certification_date?: string;
  trainer_certification_expiry?: string;
  job_title?: string;
  organisation?: string;
  country_code?: string;
  professional_experience_years?: number;
  training_experience_years?: number;
  expertise_areas?: string[];
  delivery_languages?: string[];
  bio?: string;
  photo_url?: string;
  linkedin_url?: string;
}

export interface UpdateTrainerDTO extends Partial<CreateTrainerDTO> {
  is_active?: boolean;
  status?: TrainerStatus;
}

// =============================================================================
// Trainees
// =============================================================================

export interface Trainee {
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
  batch?: TrainingBatch;
  certification_type: CertificationType;
  enrollment_status: EnrollmentStatus;
  training_completed: boolean;
  training_completion_date?: string;
  exam_voucher_id?: string;
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
}

export interface CreateTraineeDTO {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  job_title?: string;
  batch_id?: string | null;
  certification_type: CertificationType;
  notes?: string;
}

export interface UpdateTraineeDTO extends Partial<CreateTraineeDTO> {
  enrollment_status?: EnrollmentStatus;
  training_completed?: boolean;
  training_completion_date?: string | null;
  exam_voucher_id?: string | null;
  exam_scheduled?: boolean;
  exam_date?: string | null;
  exam_passed?: boolean | null;
  exam_score?: number | null;
  certified?: boolean;
  certification_date?: string | null;
  certificate_number?: string | null;
}

export interface BulkTraineeUpload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  job_title?: string;
}

// =============================================================================
// Voucher Allocations
// =============================================================================

export interface VoucherAllocation {
  id: string;
  partner_id: string;
  certification_type: CertificationType;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
  order_reference?: string;
  payment_status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  status: VoucherAllocationStatus;
  valid_from: string;
  valid_until: string;
  vouchers_used: number;
  vouchers_remaining: number;
  allocated_by?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Performance Metrics
// =============================================================================

export interface PerformanceMetrics {
  id: string;
  partner_id: string;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  batches_conducted: number;
  trainees_trained: number;
  training_completion_rate?: number;
  exams_taken: number;
  exams_passed: number;
  pass_rate?: number;
  average_score?: number;
  certifications_issued: number;
  cp_certifications: number;
  scp_certifications: number;
  trainee_satisfaction_score?: number;
  nps_score?: number;
  calculated_at: string;
}

// =============================================================================
// Dashboard Stats
// =============================================================================

export interface ECPDashboardStats {
  total_trainees: number;
  active_trainees: number;
  certified_trainees: number;
  total_batches: number;
  active_batches: number;
  total_trainers: number;
  active_trainers: number;
  vouchers_available: number;
  pass_rate?: number;
}

// =============================================================================
// Filters
// =============================================================================

export interface BatchFilters {
  status?: BatchStatus;
  trainer_id?: string;
  search?: string;
}

export interface TrainerFilters {
  status?: TrainerStatus;
  is_active?: boolean;
  certification?: CertificationType;
  search?: string;
}

export interface TraineeFilters {
  batch_id?: string;
  certification_type?: CertificationType;
  enrollment_status?: EnrollmentStatus;
  certified?: boolean;
  search?: string;
}

// =============================================================================
// License Types
// =============================================================================

export type LicenseStatus = 'active' | 'expiring_soon' | 'expired' | 'suspended' | 'pending_renewal';
export type LicenseRequestType = 'renewal' | 'scope_update' | 'territory_expansion' | 'program_addition';
export type LicenseRequestStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'cancelled';
export type LicenseDocumentType =
  | 'license_agreement'
  | 'brand_guidelines'
  | 'training_standards'
  | 'compliance_checklist'
  | 'renewal_contract'
  | 'amendment'
  | 'other';

export interface ECPLicense {
  id: string;
  partner_id: string;
  license_number: string;
  partner_code: string;
  status: LicenseStatus;
  issue_date: string;
  expiry_date: string;
  last_renewal_date?: string;
  territories: string[];
  programs: CertificationType[];
  agreement_signed_date?: string;
  agreement_document_url?: string;
  renewal_requested: boolean;
  renewal_requested_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  documents?: LicenseDocument[];
  pending_requests?: LicenseRequest[];
}

export interface LicenseRequest {
  id: string;
  license_id: string;
  partner_id: string;
  request_type: LicenseRequestType;
  description: string;
  requested_territories?: string[];
  requested_programs?: CertificationType[];
  status: LicenseRequestStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLicenseRequestDTO {
  request_type: LicenseRequestType;
  description: string;
  requested_territories?: string[];
  requested_programs?: CertificationType[];
}

export interface LicenseDocument {
  id: string;
  license_id: string;
  document_type: LicenseDocumentType;
  title: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  version?: string;
  is_current: boolean;
  uploaded_at: string;
  uploaded_by?: string;
}

export interface LicenseTerm {
  id: string;
  term_key: string;
  title: string;
  title_ar?: string;
  description: string;
  description_ar?: string;
  display_order: number;
  is_active: boolean;
}

export interface ComplianceRequirement {
  id: string;
  requirement_key: string;
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  display_order: number;
  is_active: boolean;
}

export interface LicenseInfo {
  id: string;
  license_number: string;
  partner_code: string;
  status: LicenseStatus;
  issue_date: string;
  expiry_date: string;
  last_renewal_date?: string;
  territories: string[];
  programs: CertificationType[];
  agreement_signed_date?: string;
  agreement_document_url?: string;
  renewal_requested: boolean;
  renewal_requested_at?: string;
  documents: LicenseDocument[];
  terms: LicenseTerm[];
  compliance_requirements: ComplianceRequirement[];
  pending_requests: LicenseRequest[];
}

// =============================================================================
// Voucher Types (Individual Voucher Tracking)
// =============================================================================

export type VoucherStatus = 'available' | 'assigned' | 'used' | 'expired' | 'cancelled';
export type VoucherRequestStatus = 'pending' | 'approved' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded';

export interface Voucher {
  id: string;
  partner_id: string;
  allocation_id?: string;
  voucher_code: string;
  certification_type: CertificationType;
  status: VoucherStatus;
  assigned_to_email?: string;
  assigned_to_name?: string;
  trainee_id?: string;
  assigned_at?: string;
  assigned_by?: string;
  used_at?: string;
  exam_attempt_id?: string;
  valid_from: string;
  valid_until: string;
  order_id?: string;
  order_reference?: string;
  purchased_at?: string;
  unit_price?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VoucherRequest {
  id: string;
  partner_id: string;
  request_number: string;
  certification_type: CertificationType;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: VoucherRequestStatus;
  payment_method?: string;
  payment_reference?: string;
  paid_at?: string;
  fulfilled_at?: string;
  fulfilled_by?: string;
  vouchers_generated?: number;
  woocommerce_order_id?: string;
  woocommerce_invoice_url?: string;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateVoucherRequestDTO {
  certification_type: CertificationType;
  quantity: number;
  unit_price?: number;
  payment_method?: string;
}

export interface AssignVoucherDTO {
  voucher_id: string;
  email: string;
  name: string;
  trainee_id?: string | null;
}

export interface VoucherStats {
  total: number;
  available: number;
  assigned: number;
  used: number;
  expired: number;
  cp_available: number;
  scp_available: number;
  expiring_soon: number;
}

export interface VoucherFilters {
  status?: VoucherStatus;
  certification_type?: CertificationType;
  search?: string;
}

// =============================================================================
// ECP Toolkit Types
// =============================================================================

export type ECPToolkitCategory = 'logos' | 'templates' | 'guidelines' | 'marketing' | 'social_media';

export interface ECPToolkitItem {
  id: string;
  category: ECPToolkitCategory;
  title: string;
  description?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateECPToolkitItemDTO {
  category: ECPToolkitCategory;
  title: string;
  description?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateECPToolkitItemDTO {
  category?: ECPToolkitCategory;
  title?: string;
  description?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  sort_order?: number;
  is_active?: boolean;
}
