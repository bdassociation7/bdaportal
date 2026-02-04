/**
 * Types for Quiz System - Mock Exams
 *
 * Defines all TypeScript types and interfaces for the Quiz feature
 * Based on Supabase schema: quizzes, quiz_questions, quiz_answers, quiz_attempts
 */

// =============================================================================
// ENUMS
// =============================================================================

export type CertificationType = 'CP' | 'SCP';

export type ExamLanguage = 'en' | 'ar';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type QuestionType = 'multiple_choice' | 'true_false' | 'multi_select';

export type VoucherStatus = 'available' | 'assigned' | 'used' | 'expired' | 'cancelled';

/**
 * Certification exam attempt status (state machine)
 * Transitions:
 *   not_started -> in_progress | cancelled
 *   in_progress -> paused | submitted | expired | cancelled
 *   paused -> in_progress | submitted | expired | cancelled
 *   submitted -> scored | cancelled
 *   scored -> passed | failed
 *   passed, failed, expired, cancelled -> (terminal)
 */
export type AttemptStatus =
  | 'not_started'   // Attempt created but exam not launched
  | 'in_progress'   // User is actively taking the exam
  | 'paused'        // User has paused the exam
  | 'submitted'     // User has submitted answers, pending scoring
  | 'scored'        // Scoring complete
  | 'passed'        // Final status: passed
  | 'failed'        // Final status: failed
  | 'expired'       // Time ran out before submission
  | 'cancelled';    // Admin cancelled or voided

export type ExamActivityEventType =
  | 'exam_created'
  | 'state_transition'
  | 'answer_saved'
  | 'tab_switch'
  | 'browser_blur'
  | 'suspicious_activity';

// =============================================================================
// DATABASE TYPES (matching Supabase schema)
// =============================================================================

/**
 * Quiz from database
 */
export interface Quiz {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  certification_type: CertificationType;
  difficulty_level: DifficultyLevel;
  time_limit_minutes: number;
  passing_score_percentage: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Competency section for BDA BoCK
 */
export type CompetencySection = 'behavioral' | 'knowledge_based';

/**
 * Quiz Question from database
 */
export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_text_ar: string | null;
  question_type: QuestionType;
  bock_domain: string | null;
  competency_section: CompetencySection | null;
  competency_name: string | null;
  difficulty: DifficultyLevel;
  points: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/**
 * Quiz Answer from database
 */
export interface QuizAnswer {
  id: string;
  question_id: string;
  answer_text: string;
  answer_text_ar: string | null;
  is_correct: boolean;
  explanation: string | null;
  explanation_ar: string | null;
  order_index: number;
  created_at: string;
}

/**
 * Quiz Attempt from database
 */
export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  total_points_earned: number | null;
  total_points_possible: number | null;
  passed: boolean | null;
  time_spent_minutes: number | null;
  // Certification exam state machine fields
  status?: AttemptStatus;
  proctoring_token?: string;
  proctoring_token_expires_at?: string;
  session_id?: string;
  // Pause/resume tracking
  paused_at?: string | null;
  total_pause_time_seconds?: number;
  pause_count?: number;
  // Time tracking
  time_remaining_seconds?: number;
  last_activity_at?: string;
  // Scoring
  scored_at?: string | null;
  scoring_notes?: string | null;
  // Security/audit
  ip_address?: string;
  user_agent?: string;
  browser_info?: Record<string, unknown>;
  suspicious_activity_count?: number;
  flagged_for_review?: boolean;
  review_notes?: string | null;
  exam_type?: 'mock' | 'certification';
}

/**
 * Quiz Attempt Answer from database
 */
export interface QuizAttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_answer_ids: string[];
  is_correct: boolean;
  points_earned: number;
  created_at: string;
  // Enhanced fields for certification exam
  answered_at?: string;
  time_spent_seconds?: number;
  answer_changes?: number;
}

/**
 * Exam activity log entry for audit trail
 */
export interface ExamActivityLog {
  id: string;
  attempt_id: string;
  event_type: ExamActivityEventType;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Certification Product from database
 * Links WooCommerce products to certifications
 */
export interface CertificationProduct {
  id: string;
  woocommerce_product_id: number;
  woocommerce_product_name: string;
  woocommerce_product_sku: string | null;
  certification_type: CertificationType;
  quiz_id: string | null;
  vouchers_per_purchase: number;
  voucher_validity_months: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Exam Voucher from database
 * Manages exam vouchers for certification attempts
 */
export interface ExamVoucher {
  id: string;
  code: string;
  user_id: string;
  certification_type: CertificationType;
  exam_language: ExamLanguage;
  quiz_id: string | null;
  woocommerce_order_id: number | null;
  certification_product_id: string | null;
  purchased_at: string | null;
  status: VoucherStatus;
  expires_at: string;
  used_at: string | null;
  attempt_id: string | null;
  admin_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// EXTENDED TYPES (with relations and computed data)
// =============================================================================

/**
 * Quiz with additional metadata
 */
export interface QuizWithStats extends Quiz {
  question_count?: number;
  total_points?: number;
  attempt_count?: number;
}

/**
 * Question with answers included
 */
export interface QuestionWithAnswers extends QuizQuestion {
  answers: QuizAnswer[];
}

/**
 * Quiz with full questions and answers
 */
export interface QuizWithQuestions extends Quiz {
  questions: QuestionWithAnswers[];
}

/**
 * Certification Product with related quiz data
 */
export interface CertificationProductWithQuiz extends CertificationProduct {
  quiz?: Quiz;
}

/**
 * Exam Voucher with user information
 */
export interface ExamVoucherWithUser extends ExamVoucher {
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

/**
 * Exam Voucher with quiz information
 */
export interface ExamVoucherWithQuiz extends ExamVoucher {
  quiz?: Quiz;
}

/**
 * Complete Exam Voucher with all relations
 */
export interface ExamVoucherComplete extends ExamVoucher {
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  quiz?: Quiz;
  certification_product?: CertificationProduct;
  attempt?: QuizAttempt;
}

// =============================================================================
// DTO TYPES (for creating/updating)
// =============================================================================

/**
 * Data Transfer Object for creating a new quiz
 */
export interface CreateQuizDTO {
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  certification_type: CertificationType;
  difficulty_level: DifficultyLevel;
  time_limit_minutes: number;
  passing_score_percentage: number;
  is_active?: boolean;
}

/**
 * Data Transfer Object for updating a quiz
 */
export interface UpdateQuizDTO {
  title?: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  difficulty_level?: DifficultyLevel;
  time_limit_minutes?: number;
  passing_score_percentage?: number;
  is_active?: boolean;
}

/**
 * Data Transfer Object for creating a question
 */
export interface CreateQuestionDTO {
  quiz_id: string;
  question_text: string;
  question_text_ar?: string;
  question_type: QuestionType;
  bock_domain?: string;
  competency_section?: CompetencySection;
  competency_name?: string;
  difficulty: DifficultyLevel;
  points?: number;
  order_index: number;
  answers: CreateAnswerDTO[];
}

/**
 * Data Transfer Object for updating a question
 */
export interface UpdateQuestionDTO {
  question_text?: string;
  question_text_ar?: string;
  question_type?: QuestionType;
  bock_domain?: string;
  competency_section?: CompetencySection;
  competency_name?: string;
  difficulty?: DifficultyLevel;
  points?: number;
  order_index?: number;
}

/**
 * Data Transfer Object for creating an answer
 */
export interface CreateAnswerDTO {
  answer_text: string;
  answer_text_ar?: string;
  is_correct: boolean;
  explanation?: string;
  explanation_ar?: string;
  order_index: number;
}

/**
 * Data Transfer Object for updating an answer
 */
export interface UpdateAnswerDTO {
  answer_text?: string;
  answer_text_ar?: string;
  is_correct?: boolean;
  explanation?: string;
  explanation_ar?: string;
  order_index?: number;
}

/**
 * Data Transfer Object for creating a certification product
 */
export interface CreateCertificationProductDTO {
  woocommerce_product_id: number;
  woocommerce_product_name: string;
  woocommerce_product_sku?: string;
  certification_type: CertificationType;
  quiz_id?: string;
  vouchers_per_purchase?: number;
  voucher_validity_months?: number;
  is_active?: boolean;
}

/**
 * Data Transfer Object for updating a certification product
 */
export interface UpdateCertificationProductDTO {
  woocommerce_product_name?: string;
  woocommerce_product_sku?: string;
  quiz_id?: string;
  vouchers_per_purchase?: number;
  voucher_validity_months?: number;
  is_active?: boolean;
}

/**
 * Data Transfer Object for creating an exam voucher
 */
export interface CreateExamVoucherDTO {
  user_id: string;
  certification_type: CertificationType;
  exam_language: ExamLanguage;
  quiz_id?: string;
  expires_at: string;
  woocommerce_order_id?: number;
  certification_product_id?: string;
  admin_notes?: string;
}

/**
 * Data Transfer Object for updating an exam voucher
 */
export interface UpdateExamVoucherDTO {
  status?: VoucherStatus;
  expires_at?: string;
  admin_notes?: string;
}

/**
 * Data Transfer Object for using a voucher
 */
export interface UseVoucherDTO {
  voucher_code: string;
  quiz_id: string;
  attempt_id: string;
}

// =============================================================================
// QUIZ PLAYER TYPES
// =============================================================================

/**
 * User's answer to a question
 */
export interface UserAnswer {
  question_id: string;
  selected_answer_ids: string[]; // Array for multi_select support
  is_correct?: boolean; // Calculated after submission
}

/**
 * Quiz session state
 */
export interface QuizSession {
  quiz: QuizWithQuestions;
  started_at: Date;
  time_remaining_seconds: number;
  current_question_index: number;
  user_answers: Map<string, UserAnswer>;
  is_completed: boolean;
}

/**
 * Quiz results after completion
 */
export interface QuizResults {
  quiz_id: string;
  quiz_title: string;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  score_percentage: number;
  passed: boolean;
  time_spent_minutes: number;
  answers_detail: UserAnswerResult[];
}

/**
 * Detailed result for a single question
 */
export interface UserAnswerResult {
  question: QuizQuestion;
  user_answer_ids: string[];
  correct_answer_ids: string[];
  is_correct: boolean;
  explanation?: string;
}

// =============================================================================
// FILTER & QUERY TYPES
// =============================================================================

/**
 * Filters for quiz list queries
 */
export interface QuizFilters {
  certification_type?: CertificationType;
  difficulty_level?: DifficultyLevel;
  is_active?: boolean;
  search?: string;
}

/**
 * Query options for pagination and sorting
 */
export interface QueryOptions {
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'title' | 'difficulty_level';
  sort_order?: 'asc' | 'desc';
}

/**
 * Filters for certification products list queries
 */
export interface CertificationProductFilters {
  certification_type?: CertificationType;
  is_active?: boolean;
  search?: string;
}

/**
 * Filters for exam vouchers list queries
 */
export interface ExamVoucherFilters {
  user_id?: string;
  certification_type?: CertificationType;
  exam_language?: ExamLanguage;
  status?: VoucherStatus;
  quiz_id?: string;
  search?: string;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Quiz-specific error types
 */
export interface QuizError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Quiz operation result wrapper
 */
export interface QuizResult<T> {
  data: T | null;
  error: QuizError | null;
}

// =============================================================================
// CERTIFICATION EXAM TYPES
// =============================================================================

/**
 * Result from check_exam_eligibility RPC function
 */
export interface ExamEligibilityResult {
  eligible: boolean;
  reason?: string;
  has_active_attempt?: boolean;
  attempt_id?: string;
  attempt_status?: AttemptStatus;
  can_resume?: boolean;
  voucher_id?: string;
  voucher_source?: 'direct' | 'ecp';
  booking_id?: string | null;
  has_booking?: boolean;
  quiz?: {
    id: string;
    title: string;
    time_limit_minutes: number;
    passing_score: number;
  };
}

/**
 * Parameters for starting a certification exam
 */
export interface StartExamParams {
  quiz_id: string;
  voucher_id?: string;
  booking_id?: string;
  ip_address?: string;
  user_agent?: string;
  browser_info?: Record<string, unknown>;
}

/**
 * Parameters for saving an exam answer
 */
export interface SaveExamAnswerParams {
  attempt_id: string;
  question_id: string;
  selected_answer_ids: string[];
  time_spent_seconds?: number;
}

/**
 * Certification exam session state (frontend)
 */
export interface CertificationExamSession {
  attempt: QuizAttempt;
  quiz: QuizWithQuestions;
  current_question_index: number;
  answers: Map<string, string[]>;
  time_remaining_seconds: number;
  is_paused: boolean;
  started_at: Date;
  proctoring_token: string;
}

/**
 * State transition event data
 */
export interface StateTransitionEvent {
  from_status: AttemptStatus;
  to_status: AttemptStatus;
  timestamp: string;
  additional_data?: Record<string, unknown>;
}

/**
 * Certification exam results
 */
export interface CertificationExamResults {
  attempt: QuizAttempt;
  quiz: Quiz;
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  score_percentage: number;
  passed: boolean;
  time_spent_minutes: number;
  certification?: {
    id: string;
    certification_type: CertificationType;
    issued_date: string;
    expiry_date: string;
  };
}

/**
 * Valid state transitions map
 */
export const VALID_STATE_TRANSITIONS: Record<AttemptStatus, AttemptStatus[]> = {
  not_started: ['in_progress', 'cancelled'],
  in_progress: ['paused', 'submitted', 'expired', 'cancelled'],
  paused: ['in_progress', 'submitted', 'expired', 'cancelled'],
  submitted: ['scored', 'cancelled'],
  scored: ['passed', 'failed'],
  passed: [],
  failed: [],
  expired: [],
  cancelled: [],
};

/**
 * Terminal states (no further transitions allowed)
 */
export const TERMINAL_STATES: AttemptStatus[] = ['passed', 'failed', 'expired', 'cancelled'];

/**
 * Active states (exam is ongoing)
 */
export const ACTIVE_STATES: AttemptStatus[] = ['not_started', 'in_progress', 'paused'];

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default values for quiz configuration
 */
export const QUIZ_DEFAULTS = {
  TIME_LIMIT_MINUTES: 60,
  PASSING_SCORE_PERCENTAGE: 70,
  DEFAULT_POINTS: 1,
} as const;

/**
 * Quiz validation constraints
 */
export const QUIZ_CONSTRAINTS = {
  MIN_TIME_LIMIT: 1,
  MAX_TIME_LIMIT: 240,
  MIN_PASSING_SCORE: 0,
  MAX_PASSING_SCORE: 100,
  MIN_POINTS: 1,
} as const;
