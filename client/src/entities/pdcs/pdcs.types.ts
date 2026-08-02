/**
 * PDC (Professional Development Credits) Types
 * System for managing and validating professional development credits
 */

export type PdcStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type PdcActivityType =
  | 'training_course'
  | 'conference'
  | 'workshop'
  | 'webinar'
  | 'self_study'
  | 'teaching'
  | 'publication'
  | 'volunteer_work'
  | 'other';

export type CertificationType = 'CP' | 'SCP';

export interface PdcEntry {
  id: string;

  // User and certification
  user_id: string;
  certification_id: string | null;
  certification_type: CertificationType;

  // Activity details
  program_id: string | null;
  activity_type: PdcActivityType;
  activity_title: string;
  activity_title_ar: string | null;
  activity_description: string | null;

  // Credits
  credits_claimed: number;
  credits_approved: number | null;

  // Dates
  activity_date: string; // ISO date
  submission_date: string;

  // Documentation
  certificate_url: string | null; // Supabase Storage path
  notes: string | null;

  // Status
  status: PdcStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;

  // Audit
  created_at: string;
  updated_at: string;

  // Joined data
  user?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  reviewer?: {
    first_name: string | null;
    last_name: string | null;
  };
  program?: {
    program_name: string;
    provider_name: string;
    max_pdc_credits: number;
  };
}

export interface PdpProgram {
  id: string;
  program_id: string; // Public ID for user entry
  program_name: string;
  program_name_ar: string | null;
  description: string | null;
  description_ar: string | null;

  provider_id: string | null;
  provider_name: string;

  max_pdc_credits: number;
  activity_type: PdcActivityType;

  bock_domain: string[] | null;

  valid_from: string;
  valid_until: string;
  is_active: boolean;

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePdcEntryDTO {
  certification_type: CertificationType;
  program_id?: string; // Optional: link to approved program (PDP Partner path)
  activity_type: PdcActivityType;
  activity_title: string;
  activity_title_ar?: string;
  activity_description?: string;
  credits_claimed: number;
  activity_date: string; // ISO date
  certificate_file?: File; // Will upload to Storage
  notes?: string;
  submission_path?: 'pdp_partner' | 'professional_development'; // Recertification path
}

export interface UpdatePdcEntryDTO {
  activity_type?: PdcActivityType;
  activity_title?: string;
  activity_title_ar?: string;
  activity_description?: string;
  credits_claimed?: number;
  activity_date?: string;
  notes?: string;
}

export interface ReviewPdcDTO {
  status: 'approved' | 'rejected';
  credits_approved?: number; // For approved entries
  rejection_reason?: string; // For rejected entries
}

export interface PdcFilters {
  user_id?: string;
  status?: PdcStatus;
  certification_type?: CertificationType;
  activity_type?: PdcActivityType;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface PdcStats {
  total_entries: number;
  pending_entries: number;
  approved_entries: number;
  rejected_entries: number;
  total_credits_claimed: number;
  total_credits_approved: number;
  by_certification_type: {
    CP: number;
    SCP: number;
  };
  by_status: Record<PdcStatus, number>;
}

export interface UserPdcSummary {
  user_id: string;
  certification_type: CertificationType;
  total_approved_credits: number; // Last 3 years
  pending_credits: number;
  total_entries: number;
}

export interface PdcResult<T> {
  data: T | null;
  error: Error | null;
}

export const ACTIVITY_TYPE_LABELS: Record<PdcActivityType, string> = {
  training_course: 'Training Course',
  conference: 'Conference',
  workshop: 'Workshop',
  webinar: 'Webinar',
  self_study: 'Self Study',
  teaching: 'Teaching',
  publication: 'Publication',
  volunteer_work: 'Volunteer Work',
  other: 'Other',
};

export const STATUS_LABELS: Record<PdcStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
};
