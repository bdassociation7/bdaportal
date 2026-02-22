/**
 * Certificate Types
 *
 * Type definitions for certificate system
 */

// ============================================================================
// Enums
// ============================================================================

export type CertificationType = 'CP' | 'SCP';

export type CertificationStatus = 'active' | 'expired' | 'revoked' | 'suspended';

// ============================================================================
// Database Types
// ============================================================================

export interface Certificate {
  id: string;
  user_id: string;
  certification_type: CertificationType;
  credential_id: string;
  quiz_attempt_id: string | null;
  issued_date: string; // ISO date string
  expiry_date: string; // ISO date string
  status: CertificationStatus;
  certificate_url: string | null;
  certificate_available_date: string | null; // Date when PDF download becomes available
  renewal_count: number;
  last_renewed_at: string | null;
  pdc_credits_earned: number;
  notes: string | null;
  revocation_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CertificateDetails {
  credential_id: string;
  user_full_name: string;
  user_email: string;
  certification_type: string;
  issued_date: string;
  expiry_date: string;
  status: string;
  certificate_url: string | null;
  exam_title: string | null;
  exam_score: number | null;
  exam_date: string | null;
}

export interface CertificateVerification {
  is_valid: boolean;
  status: string;
  holder_name: string | null;
  certification_type: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  message: string;
}

export interface UserCertificate {
  id: string;
  credential_id: string;
  certification_type: string;
  status: string;
  issued_date: string;
  expiry_date: string;
  certificate_url: string | null;
  certificate_available_date: string | null;
  exam_title: string | null;
  exam_score: number | null;
  is_expiring_soon: boolean;
}

// ============================================================================
// Certificate Generation Data
// ============================================================================

export interface CertificateGenerationData {
  credential_id: string;
  user_full_name: string;
  user_email: string;
  certification_type: CertificationType;
  issued_date: string;
  expiry_date: string;
  exam_title: string;
  exam_score: number;
  exam_date: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface CertificateResponse {
  data: Certificate | null;
  error: {
    message: string;
    code?: string;
  } | null;
}

export interface CertificateListResponse {
  data: UserCertificate[] | null;
  error: {
    message: string;
    code?: string;
  } | null;
}

export interface CertificateDetailsResponse {
  data: CertificateDetails | null;
  error: {
    message: string;
    code?: string;
  } | null;
}

export interface CertificateVerificationResponse {
  data: CertificateVerification | null;
  error: {
    message: string;
    code?: string;
  } | null;
}

export interface BooleanResponse {
  data: boolean;
  error: {
    message: string;
    code?: string;
  } | null;
}

// ============================================================================
// Certificate PDF Generation Types
// ============================================================================

export interface CertificatePDFOptions {
  credential_id: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'A4' | 'Letter';
  margin?: number;
}

export interface CertificatePDFResult {
  success: boolean;
  file_path?: string;
  public_url?: string;
  error?: string;
}

// ============================================================================
// Certificate Search Types
// ============================================================================

export interface CertificateSearchResult {
  credential_id: string;
  holder_name: string;
  certification_type: string;
  issued_date: string;
  expiry_date: string;
  status: string;
  is_valid: boolean;
}

export interface CertificateSearchResponse {
  data: CertificateSearchResult[] | null;
  error: {
    message: string;
    code?: string;
  } | null;
}
