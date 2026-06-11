/**
 * Question Bank Types
 * Types for the Question Bank feature
 */

import type { CertificationType, ModuleSectionType } from '../curriculum/curriculum.types';

// ============================================================================
// Database Row Types
// ============================================================================

export interface QuestionSet {
  id: string;
  certification_type: CertificationType;
  section_type: ModuleSectionType;
  competency_id: string | null;
  sub_unit_id: string | null;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  question_count: number;
  is_final_test: boolean;
  order_index: number;
  time_limit_minutes: number | null;
  passing_score: number;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  text_ar?: string;
}

export interface PracticeQuestion {
  id: string;
  question_set_id: string;
  question_text: string;
  question_text_ar: string | null;
  question_type: 'multiple_choice' | 'true_false';
  options: QuestionOption[];
  correct_option_id: string;
  explanation: string | null;
  explanation_ar: string | null;
  difficulty_level: 'easy' | 'medium' | 'hard';
  order_index: number;
  tags: string[];
  points: number;
  is_published: boolean;
  /** NULL = applies to both CP and SCP; 'CP' = BDA-CP only; 'SCP' = BDA-SCP only */
  certification_target: 'CP' | 'SCP' | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserQuestionBankProgress {
  id: string;
  user_id: string;
  question_set_id: string;
  questions_attempted: number;
  questions_correct: number;
  last_score_percentage: number | null;
  best_score_percentage: number | null;
  attempts_count: number;
  last_attempted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserQuestionAttempt {
  id: string;
  user_id: string;
  question_id: string;
  question_set_id: string;
  selected_option_id: string;
  is_correct: boolean;
  time_spent_seconds: number | null;
  is_marked_for_review: boolean;
  is_favorited: boolean;
  attempted_at: string;
}

// ============================================================================
// Extended Types (with relations)
// ============================================================================

export interface QuestionSetWithCompetency extends QuestionSet {
  competency?: {
    id: string;
    competency_name: string;
    competency_name_ar: string | null;
    section_type: ModuleSectionType;
  };
  sub_unit?: {
    id: string;
    title: string;
    title_ar: string | null;
  };
}

export interface QuestionSetWithProgress extends QuestionSet {
  progress?: UserQuestionBankProgress | null;
  competency?: {
    id: string;
    competency_name: string;
    competency_name_ar: string | null;
    section_type: ModuleSectionType;
  };
  sub_unit?: {
    id: string;
    title: string;
    title_ar: string | null;
    order_index?: number;
  };
}

export interface PracticeQuestionWithAttempt extends PracticeQuestion {
  last_attempt?: UserQuestionAttempt | null;
}

// ============================================================================
// Insert/Update Types
// ============================================================================

export interface QuestionSetInsert {
  certification_type: CertificationType;
  section_type: ModuleSectionType;
  competency_id?: string | null;
  sub_unit_id?: string | null;
  title: string;
  title_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  is_final_test?: boolean;
  order_index: number;
  time_limit_minutes?: number | null;
  passing_score?: number;
  is_published?: boolean;
  exam_language?: 'en' | 'ar';
}

export interface QuestionSetUpdate {
  title?: string;
  title_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  is_final_test?: boolean;
  order_index?: number;
  time_limit_minutes?: number | null;
  passing_score?: number;
  is_published?: boolean;
}

export interface PracticeQuestionInsert {
  question_set_id: string;
  question_text: string;
  question_text_ar?: string | null;
  question_type?: 'multiple_choice' | 'true_false';
  options: QuestionOption[];
  correct_option_id: string;
  explanation?: string | null;
  explanation_ar?: string | null;
  difficulty_level?: 'easy' | 'medium' | 'hard';
  order_index: number;
  tags?: string[];
  points?: number;
  is_published?: boolean;
  /** NULL = both CP & SCP; 'CP' = BDA-CP only; 'SCP' = BDA-SCP only */
  certification_target?: 'CP' | 'SCP' | null;
}

export interface PracticeQuestionUpdate {
  question_text?: string;
  question_text_ar?: string | null;
  question_type?: 'multiple_choice' | 'true_false';
  options?: QuestionOption[];
  correct_option_id?: string;
  explanation?: string | null;
  explanation_ar?: string | null;
  difficulty_level?: 'easy' | 'medium' | 'hard';
  order_index?: number;
  tags?: string[];
  points?: number;
  is_published?: boolean;
  /** NULL = both CP & SCP; 'CP' = BDA-CP only; 'SCP' = BDA-SCP only */
  certification_target?: 'CP' | 'SCP' | null;
}

// ============================================================================
// Practice Session Types
// ============================================================================

export interface PracticeSessionState {
  questionSetId: string;
  questions: PracticeQuestion[];
  currentIndex: number;
  answers: Record<string, string>; // questionId -> selectedOptionId
  markedForReview: Set<string>;
  startedAt: Date;
  timeRemaining: number | null; // in seconds
}

export interface PracticeSessionResult {
  questionSetId: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedQuestions: number;
  scorePercentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  questionResults: QuestionResult[];
}

export interface QuestionResult {
  questionId: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

// ============================================================================
// Filter Types
// ============================================================================

export type ExamLanguage = 'en' | 'ar';

export interface QuestionSetFilters {
  certification_type?: CertificationType;
  section_type?: ModuleSectionType;
  competency_id?: string;
  is_published?: boolean;
  is_final_test?: boolean;
  exam_language?: ExamLanguage;
}

export interface QuestionFilters {
  question_set_id?: string;
  difficulty_level?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  is_published?: boolean;
}

// ============================================================================
// Dashboard Stats Types
// ============================================================================

export interface QuestionBankStats {
  totalQuestionSets: number;
  totalQuestions: number;
  questionsAttempted: number;
  questionsCorrect: number;
  averageScore: number;
  favoritedQuestions: number;
  setsCompleted: number;
}

export interface CompetencyProgress {
  competencyId: string;
  competencyName: string;
  competencyNameAr: string | null;
  sectionType: ModuleSectionType;
  subUnits: SubUnitProgress[];
  finalTest: QuestionSetWithProgress | null;
  overallProgress: number;
}

export interface SubUnitProgress {
  subUnitId: string;
  subUnitName: string;
  subUnitNameAr: string | null;
  questionSet: QuestionSetWithProgress | null;
  progress: number;
}
