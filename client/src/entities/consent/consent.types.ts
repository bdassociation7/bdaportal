/**
 * Consent & Honor Code Types
 *
 * TypeScript types for consent tracking and honor code acceptance
 * Requirements: task.md Step 1 - Accept Terms, Privacy Policy, and Exam Code of Conduct
 */

// ============================================================================
// Consent Types
// ============================================================================

export type ConsentType =
  | 'terms_of_use'
  | 'privacy_policy'
  | 'exam_code_of_conduct'
  | 'data_processing'
  | 'marketing_communications';

export interface ConsentLog {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  consent_version: string;
  consented: boolean; // TRUE = accepted, FALSE = withdrawn
  consented_at: string;
  ip_address?: string;
  user_agent?: string;
  consent_text?: string; // Snapshot of consent text at time of acceptance
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ConsentSubmission {
  consent_type: ConsentType;
  consent_version: string;
  consented: boolean;
  consent_text: string;
  ip_address?: string;
  user_agent?: string;
}

export interface ConsentSummary {
  consent_type: ConsentType;
  is_consented: boolean;
  last_updated: string;
  consent_version: string;
}

// ============================================================================
// Honor Code Types
// ============================================================================

export type HonorCodeContext =
  | 'exam_registration'
  | 'before_exam_launch'
  | 'profile_completion'
  | 'identity_verification';

export type SignatureType = 'checkbox' | 'typed_name' | 'drawn_signature';

export interface HonorCodeAcceptance {
  id: string;
  user_id: string;
  context: HonorCodeContext;
  quiz_id?: string;
  attempt_id?: string;
  honor_code_version: string;
  accepted_at: string;
  signature_type: SignatureType;
  signature_data?: string; // Typed name or base64 signature image
  ip_address?: string;
  user_agent?: string;
  honor_code_text: string; // Full text snapshot
  created_at: string;
}

export interface HonorCodeSubmission {
  context: HonorCodeContext;
  honor_code_text: string;
  quiz_id?: string;
  attempt_id?: string;
  signature_type?: SignatureType;
  signature_data?: string;
  honor_code_version?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface ConsentResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// ============================================================================
// Display Labels
// ============================================================================

export const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  terms_of_use: 'Terms of Use',
  privacy_policy: 'Privacy Policy',
  exam_code_of_conduct: 'Exam Code of Conduct',
  data_processing: 'Data Processing Agreement',
  marketing_communications: 'Marketing Communications',
};

export const HONOR_CODE_CONTEXT_LABELS: Record<HonorCodeContext, string> = {
  exam_registration: 'Exam Registration',
  before_exam_launch: 'Before Exam Launch',
  profile_completion: 'Profile Completion',
  identity_verification: 'Identity Verification',
};

export const SIGNATURE_TYPE_LABELS: Record<SignatureType, string> = {
  checkbox: 'Checkbox Acceptance',
  typed_name: 'Typed Signature',
  drawn_signature: 'Drawn Signature',
};

// ============================================================================
// Default Consent Texts (v1.0)
// ============================================================================

export const DEFAULT_CONSENT_TEXTS = {
  terms_of_use: `By using the BDA Portal and certification services, you agree to our Terms of Use. These terms govern your use of our platform, exam registration, certification processes, and related services.`,

  privacy_policy: `We collect and process your personal data in accordance with GDPR and applicable privacy laws. Your data will be used for certification purposes, identity verification, and exam administration. You have the right to access, correct, and delete your data.`,

  exam_code_of_conduct: `You agree to uphold academic integrity during all examinations. This includes: no unauthorised materials, no communication with others during exams, no sharing of exam content, and honest representation of your work. Violations may result in exam invalidation and certification denial.`,
};

// ============================================================================
// Default Honor Code Text
// ============================================================================

export const DEFAULT_HONOR_CODE_TEXT = `
I hereby pledge to uphold the highest standards of academic integrity and professional conduct:

1. **Identity Verification**: I confirm that I am the person registered for this exam, and I will not impersonate or allow impersonation.

2. **No Unauthorised Assistance**: I will not give or receive unauthorised assistance during the exam. I will complete all work independently.

3. **No Unauthorised Materials**: I will not use any unauthorised materials, resources, or technology during the exam unless explicitly permitted.

4. **Confidentiality**: I will not share, distribute, reproduce, or discuss exam content with anyone, during or after the examination.

5. **Honesty**: I will provide truthful information throughout the registration, identity verification, and examination process.

6. **Compliance**: I understand that violations of this honor code may result in:
   - Immediate exam termination
   - Invalidation of exam results
   - Denial of certification
   - Legal action if applicable

By signing below, I acknowledge that I have read, understood, and agree to comply with this Honor Code.
`.trim();

export const DEFAULT_CONSENT_VERSION = 'v1.0';
export const DEFAULT_HONOR_CODE_VERSION = 'v1.0';
