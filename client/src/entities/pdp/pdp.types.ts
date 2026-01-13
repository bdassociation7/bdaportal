/**
 * PDP (Professional Development Provider) Types
 * Complete type definitions for PDP partner management
 */

export type ProgramStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired';
export type DeliveryMode = 'in_person' | 'online' | 'hybrid' | 'self_paced';
export type ActivityType = 'training_course' | 'conference' | 'workshop' | 'webinar' | 'self_study' | 'teaching' | 'publication' | 'volunteer_work' | 'other';
export type ReportStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';

// =============================================================================
// BoCK Competencies
// =============================================================================

export interface BockCompetency {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  domain: string;
  sort_order: number;
  is_active: boolean;
}

// =============================================================================
// PDP Programs
// =============================================================================

export interface PDPProgram {
  id: string;
  program_id: string; // Public program ID
  program_name: string;
  program_name_ar?: string;
  description?: string;
  description_ar?: string;
  provider_id: string;
  provider_name: string;
  max_pdc_credits: number;
  activity_type: ActivityType;
  bock_domain?: string[];
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  status?: ProgramStatus;
  learning_outcomes?: string[];
  duration_hours?: number;
  delivery_mode?: DeliveryMode;
  target_audience?: string;
  prerequisites?: string;
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed/Joined
  competencies?: ProgramCompetency[];
  enrollment_count?: number; // Count of distinct users who submitted PDCs
  total_pdcs?: number; // Total PDC submissions for this program
  approved_pdcs?: number; // Number of approved PDC submissions
}

// Legacy alias for backward compatibility
export type PdpProgram = PDPProgram;

export interface ProgramCompetency {
  id: string;
  program_id: string;
  competency_id: string;
  relevance_level: 'primary' | 'secondary' | 'supporting';
  competency?: BockCompetency;
}

export interface CreateProgramDTO {
  program_name: string;
  program_name_ar?: string;
  description?: string;
  description_ar?: string;
  max_pdc_credits: number;
  activity_type: ActivityType;
  valid_from: string;
  valid_until: string;
  learning_outcomes?: string[];
  duration_hours?: number;
  delivery_mode?: DeliveryMode;
  target_audience?: string;
  prerequisites?: string;
  competency_ids?: { id: string; level: 'primary' | 'secondary' | 'supporting' }[];
}

export interface UpdateProgramDTO extends Partial<CreateProgramDTO> {
  status?: ProgramStatus;
  is_active?: boolean;
}

// =============================================================================
// Program Slots
// =============================================================================

export interface ProgramSlot {
  id: string;
  program_id: string;
  total_slots: number;
  used_slots: number;
  available_slots: number;
  period_start: string;
  period_end: string;
  slot_price?: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSlotDTO {
  program_id: string;
  total_slots: number;
  period_start: string;
  period_end: string;
  slot_price?: number;
  currency?: string;
}

// =============================================================================
// Program Enrollments
// =============================================================================

export interface ProgramEnrollment {
  id: string;
  program_id: string;
  slot_id?: string;
  user_id?: string;
  participant_name: string;
  participant_email: string;
  enrollment_date: string;
  completion_date?: string;
  pdc_credits_earned?: number;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped' | 'cancelled';
  certificate_issued: boolean;
  certificate_number?: string;
  created_at: string;
  updated_at: string;
  // Joined
  program?: PDPProgram;
}

// =============================================================================
// Annual Reports
// =============================================================================

export interface AnnualReport {
  id: string;
  partner_id: string;
  report_year: number;
  total_programs: number;
  total_enrollments: number;
  total_completions: number;
  total_pdc_credits_issued: number;
  average_satisfaction_score?: number;
  completion_rate?: number;
  summary?: string;
  challenges?: string;
  improvements_planned?: string;
  report_file_url?: string;
  supporting_documents?: any[];
  status: ReportStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReportDTO {
  report_year: number;
  summary?: string;
  challenges?: string;
  improvements_planned?: string;
  report_file_url?: string;
}

export interface UpdateReportDTO extends Partial<CreateReportDTO> {
  status?: ReportStatus;
}

// =============================================================================
// Dashboard Stats
// =============================================================================

export interface PDPDashboardStats {
  total_programs: number;
  active_programs: number;
  pending_programs: number;
  total_enrollments: number;
  completions: number;
  total_pdc_credits: number;
  completion_rate?: number;
}

// =============================================================================
// Filters (Legacy + New)
// =============================================================================

export interface ProgramFilters {
  status?: ProgramStatus;
  activity_type?: ActivityType;
  is_active?: boolean;
  search?: string;
  bock_domain?: string;
}

// Legacy alias
export type PdpProgramFilters = ProgramFilters;

export interface EnrollmentFilters {
  program_id?: string;
  status?: string;
  search?: string;
}

export interface PdpProgramStats {
  total_programs: number;
  active_programs: number;
  programs_by_type: Record<ActivityType, number>;
  total_providers: number;
}

export interface PdpProgramResult<T> {
  data: T | null;
  error: Error | null;
}

// =============================================================================
// PDP License Management
// =============================================================================

export type PDPLicenseStatus = 'active' | 'suspended' | 'expired' | 'pending' | 'expiring_soon';
export type LicenseRequestType = 'renewal' | 'slot_increase' | 'scope_update' | 'suspension_appeal';
export type LicenseRequestStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'cancelled';

export interface PDPLicense {
  id: string;
  partner_id: string;
  license_number: string;
  partner_code: string;
  status: PDPLicenseStatus;
  issue_date: string;
  expiry_date: string;
  max_programs: number;
  programs_used: number;
  program_submission_enabled: boolean;
  agreement_signed_date?: string;
  agreement_document_url?: string;
  renewal_requested: boolean;
  renewal_requested_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PDPLicenseTerm {
  id: string;
  license_id: string;
  term_key: string;
  term_title: string;
  term_description?: string;
  is_required: boolean;
  created_at: string;
}

export interface PDPLicenseDocument {
  id: string;
  license_id: string;
  document_type: string;
  document_name: string;
  document_url: string;
  file_size?: number;
  uploaded_at: string;
  uploaded_by?: string;
}

export interface PDPLicenseRequest {
  id: string;
  license_id: string;
  partner_id: string;
  request_type: LicenseRequestType;
  requested_slots?: number;
  current_slots?: number;
  justification?: string;
  status: LicenseRequestStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PDPLicenseInfo {
  license: PDPLicense | null;
  terms: PDPLicenseTerm[];
  documents: PDPLicenseDocument[];
  pending_requests: PDPLicenseRequest[];
}

export interface CreateLicenseRequestDTO {
  request_type: LicenseRequestType;
  requested_slots?: number;
  justification?: string;
}

export interface ProgramSlotStatus {
  can_submit: boolean;
  reason: string | null;
  max_programs: number;
  programs_used: number;
  remaining_slots: number;
}

// =============================================================================
// Toolkit Items
// =============================================================================

export type ToolkitCategory = 'logos' | 'templates' | 'guidelines' | 'marketing' | 'social_media';

export interface PDPToolkitItem {
  id: string;
  category: ToolkitCategory;
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

export interface CreateToolkitItemDTO {
  category: ToolkitCategory;
  title: string;
  description?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateToolkitItemDTO {
  category?: ToolkitCategory;
  title?: string;
  description?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  sort_order?: number;
  is_active?: boolean;
}

// =============================================================================
// PDP Partner Profile
// =============================================================================

export type DeliveryMethod = 'in_person' | 'online' | 'hybrid' | 'blended';
export type TargetAudience = 'corporate' | 'individual' | 'government' | 'academic' | 'nonprofit';
export type Specialization =
  | 'business_development'
  | 'leadership'
  | 'project_management'
  | 'data_analytics'
  | 'hr_management'
  | 'finance'
  | 'marketing'
  | 'operations'
  | 'technology'
  | 'compliance'
  | 'strategy'
  | 'communication'
  | 'other';

export interface PDPPartnerProfile {
  id: string;
  partner_id: string;

  // Organization Info
  organization_name?: string;
  legal_name?: string;
  registration_number?: string;
  tax_id?: string;
  year_established?: number;
  website?: string;
  description?: string;

  // Address
  street_address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  timezone: string;

  // Primary Contact
  primary_contact_name?: string;
  primary_contact_title?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;

  // Billing Contact
  billing_contact_name?: string;
  billing_contact_email?: string;
  billing_contact_phone?: string;

  // Specializations (JSONB arrays)
  specializations: Specialization[];
  delivery_methods: DeliveryMethod[];
  target_audiences: TargetAudience[];

  // Social Media
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;

  // Branding
  logo_url?: string;
  badge_url?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface UpdatePDPPartnerProfileDTO {
  organization_name?: string;
  legal_name?: string;
  registration_number?: string;
  tax_id?: string;
  year_established?: number;
  website?: string;
  description?: string;
  street_address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  timezone?: string;
  primary_contact_name?: string;
  primary_contact_title?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  billing_contact_name?: string;
  billing_contact_email?: string;
  billing_contact_phone?: string;
  specializations?: Specialization[];
  delivery_methods?: DeliveryMethod[];
  target_audiences?: TargetAudience[];
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  logo_url?: string;
  badge_url?: string;
}

// =============================================================================
// PDP Guidelines / Downloadable Resources
// =============================================================================

export type GuidelineCategory = 'policy' | 'template' | 'guide' | 'logo' | 'format';

export interface PDPGuideline {
  id: string;
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  category: GuidelineCategory;
  file_url: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  version: string;
  is_active: boolean;
  is_required: boolean;
  sort_order: number;
  download_count: number;
  last_updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePDPGuidelineDTO {
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  category: GuidelineCategory;
  file_url: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  version?: string;
  is_required?: boolean;
  sort_order?: number;
}

export interface UpdatePDPGuidelineDTO extends Partial<CreatePDPGuidelineDTO> {
  is_active?: boolean;
}
