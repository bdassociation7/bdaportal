/**
 * Mock Exam Types
 * Types for the mock exams system
 */

// Basic user type for relations
interface User {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

// =============================================================================
// ENUMS
// =============================================================================

export type ExamCategory = 'cp' | 'scp' | 'general';
export type ExamDifficulty = 'easy' | 'medium' | 'hard';
export type ExamQuestionType = 'single_choice' | 'multiple_choice';
export type MockExamLanguage = 'en' | 'ar';

// =============================================================================
// LABELS
// =============================================================================

export const EXAM_CATEGORY_LABELS: Record<ExamCategory, string> = {
  cp: 'CP Exam',
  scp: 'SCP Exam',
  general: 'General Knowledge',
};

export const EXAM_CATEGORY_LABELS_AR: Record<ExamCategory, string> = {
  cp: 'اختبار CP',
  scp: 'اختبار SCP',
  general: 'معرفة عامة',
};

export const EXAM_DIFFICULTY_LABELS: Record<ExamDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const EXAM_DIFFICULTY_LABELS_AR: Record<ExamDifficulty, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
};

export const EXAM_DIFFICULTY_COLORS: Record<ExamDifficulty, string> = {
  easy: 'green',
  medium: 'yellow',
  hard: 'red',
};

export const EXAM_LANGUAGE_LABELS: Record<MockExamLanguage, string> = {
  en: 'English',
  ar: 'Arabic',
};

export const EXAM_LANGUAGE_LABELS_AR: Record<MockExamLanguage, string> = {
  en: 'إنجليزي',
  ar: 'عربي',
};

// =============================================================================
// ENTITIES
// =============================================================================

export interface MockExam {
  id: string;

  // Basic information
  title: string;
  title_ar: string | null;
  description: string;
  description_ar: string | null;

  // Category and difficulty
  category: ExamCategory;
  difficulty: ExamDifficulty;

  // Configuration
  duration_minutes: number;
  total_questions: number;
  passing_score: number; // Percentage

  // Premium/Language fields
  is_premium: boolean;
  is_sample_exam: boolean; // Free sample exam (1 per language)
  language: MockExamLanguage;
  woocommerce_product_id: number | null;

  // Status
  is_active: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Premium access tracking
export interface MockExamPremiumAccess {
  id: string;
  user_id: string;
  mock_exam_id: string;
  woocommerce_order_id: number | null;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  created_at: string;
  // Single-use attempt tracking
  attempts_allowed: number;
  attempts_used: number;
}

export interface MockExamQuestion {
  id: string;
  exam_id: string;

  // Content
  question_text: string;
  question_text_ar: string | null;
  explanation: string | null;
  explanation_ar: string | null;

  // Type and configuration
  question_type: ExamQuestionType;
  points: number;
  order_index: number;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface MockExamAnswer {
  id: string;
  question_id: string;

  // Content
  answer_text: string;
  answer_text_ar: string | null;

  // Correction
  is_correct: boolean;
  order_index: number;

  // Metadata
  created_at: string;
}

export interface MockExamAttempt {
  id: string;

  // Relations
  exam_id: string;
  user_id: string;

  // Results
  score: number; // 0-100
  total_points_earned: number;
  total_points_possible: number;
  passed: boolean;

  // Time
  time_spent_minutes: number;
  started_at: string;
  completed_at: string;

  // Metadata
  created_at: string;
}

export interface MockExamAttemptAnswer {
  id: string;

  // Relations
  attempt_id: string;
  question_id: string;

  // User's answer(s)
  selected_answer_ids: string[]; // Array to support multiple choice

  // Correction
  is_correct: boolean;
  points_earned: number;

  // Metadata
  created_at: string;
}

// =============================================================================
// ENRICHED TYPES
// =============================================================================

export interface MockExamWithStats extends MockExam {
  attempt_count?: number;
  best_score?: number;
  average_score?: number;
  last_attempt_date?: string;
  last_attempt_id?: string;
  user_has_passed?: boolean;
  // Premium access info
  has_premium_access?: boolean;
}

export interface QuestionWithAnswers extends MockExamQuestion {
  answers: MockExamAnswer[];
}

export interface ExamWithQuestions extends MockExam {
  questions: QuestionWithAnswers[];
  creator?: Pick<User, 'id' | 'first_name' | 'last_name'>;
}

export interface AttemptWithDetails extends MockExamAttempt {
  exam: MockExam;
  user: Pick<User, 'id' | 'first_name' | 'last_name' | 'email'>;
  answers: AttemptAnswerWithDetails[];
}

export interface AttemptAnswerWithDetails extends MockExamAttemptAnswer {
  question: QuestionWithAnswers;
}

export interface MockExamAdminStats extends MockExam {
  total_attempts: number;
  total_questions: number;
  pass_rate: number; // Percentage
  average_score: number;
  last_attempt_date: string | null;
}

// =============================================================================
// DTOs (Data Transfer Objects)
// =============================================================================

export interface StartExamDTO {
  exam_id: string;
}

export interface SubmitAnswerDTO {
  attempt_id: string;
  question_id: string;
  selected_answer_ids: string[];
}

export interface CompleteAttemptDTO {
  attempt_id: string;
}

export interface CreateExamDTO {
  title: string;
  title_ar?: string;
  description: string;
  description_ar?: string;
  category: ExamCategory;
  difficulty: ExamDifficulty;
  duration_minutes: number;
  total_questions: number;
  passing_score: number;
  is_active?: boolean;
  is_premium?: boolean;
  is_sample_exam?: boolean; // Free sample exam (1 per language)
  language?: MockExamLanguage;
  woocommerce_product_id?: number;
}

export interface UpdateExamDTO extends Partial<CreateExamDTO> {
  id: string;
}

export interface CreateQuestionDTO {
  exam_id: string;
  question_text: string;
  question_text_ar?: string;
  explanation?: string;
  explanation_ar?: string;
  question_type: ExamQuestionType;
  points?: number;
  order_index: number;
  answers: CreateAnswerDTO[];
}

export interface CreateAnswerDTO {
  answer_text: string;
  answer_text_ar?: string;
  is_correct: boolean;
  order_index: number;
}

export interface UpdateQuestionDTO {
  id: string;
  question_text?: string;
  question_text_ar?: string;
  explanation?: string;
  explanation_ar?: string;
  question_type?: ExamQuestionType;
  points?: number;
  order_index?: number;
}

export interface UpdateAnswerDTO {
  id: string;
  answer_text?: string;
  answer_text_ar?: string;
  is_correct?: boolean;
  order_index?: number;
}

// =============================================================================
// QUERY FILTERS
// =============================================================================

export interface ExamFilters {
  category?: ExamCategory;
  difficulty?: ExamDifficulty;
  is_active?: boolean;
  search?: string;
  is_premium?: boolean;
  is_sample_exam?: boolean;
  language?: MockExamLanguage;
}

export interface AttemptFilters {
  exam_id?: string;
  user_id?: string;
  passed?: boolean;
  date_from?: string;
  date_to?: string;
}

// =============================================================================
// EXAM SESSION (for active exam taking)
// =============================================================================

export interface ExamSession {
  attempt_id: string;
  exam: MockExam;
  questions: QuestionWithAnswers[];
  started_at: Date;
  duration_minutes: number;
  answers: Record<string, string[]>; // question_id -> selected_answer_ids[]
  current_question_index: number;
}

export interface ExamResults {
  attempt: MockExamAttempt;
  exam: MockExam;
  questions_with_answers: {
    question: QuestionWithAnswers;
    user_answer_ids: string[];
    is_correct: boolean;
    points_earned: number;
  }[];
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  passed: boolean;
  time_spent_minutes: number;
}

// =============================================================================
// MOCK EXAM PRODUCTS (for WooCommerce automation)
// =============================================================================

export interface MockExamProduct {
  id: string;
  woocommerce_product_id: number;
  product_name: string;
  language: MockExamLanguage; // en or ar - package is language-specific
  exams_count: number;
  specific_exam_ids: string[] | null; // If set, grants access to these specific exams
  validity_months: number | null; // NULL = lifetime, default 12
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface MockExamAccessGrant {
  id: string;
  user_id: string;
  mock_exam_product_id: string;
  woocommerce_order_id: number;
  exams_granted: number;
  exams_remaining: number;
  expires_at: string | null;
  status: 'active' | 'revoked' | 'expired';
  created_at: string;
}

export interface CreateMockExamProductDTO {
  woocommerce_product_id: number;
  product_name: string;
  exams_count: number;
  specific_exam_ids?: string[];
  validity_months?: number;
  is_active?: boolean;
}

export interface UpdateMockExamProductDTO {
  product_name?: string;
  exams_count?: number;
  specific_exam_ids?: string[] | null;
  validity_months?: number | null;
  is_active?: boolean;
}

export interface UserMockExamCredits {
  total_credits: number;
  grants: {
    id: string;
    product_name: string;
    exams_remaining: number;
    expires_at: string | null;
    created_at: string;
  }[];
}
