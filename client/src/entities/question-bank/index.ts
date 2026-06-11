/**
 * Question Bank Entity - Centralized exports
 *
 * Architecture: Practice question system for BDA certifications
 * - Question sets organized by competency/sub-unit
 * - Multiple choice and true/false questions
 * - Progress tracking and scoring
 * - Admin management interface
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Database types
  QuestionSet,
  QuestionOption,
  PracticeQuestion,
  UserQuestionBankProgress,
  UserQuestionAttempt,

  // Extended types
  QuestionSetWithCompetency,
  QuestionSetWithProgress,
  PracticeQuestionWithAttempt,

  // Insert/Update types
  QuestionSetInsert,
  QuestionSetUpdate,
  PracticeQuestionInsert,
  PracticeQuestionUpdate,

  // Session types
  PracticeSessionState,
  PracticeSessionResult,
  QuestionResult,

  // Filter types
  QuestionSetFilters,
  QuestionFilters,

  // Stats types
  QuestionBankStats,
  CompetencyProgress,
  SubUnitProgress,
} from './question-bank.types';

// =============================================================================
// SERVICES
// =============================================================================

export { QuestionBankService } from './question-bank.service';

// =============================================================================
// HOOKS
// =============================================================================

export {
  // Query keys
  questionBankKeys,

  // Question Set hooks
  useQuestionSets,
  useQuestionSetsWithProgress,
  useQuestionSetsWithCompetency,
  useQuestionSet,

  // Question hooks
  useQuestions,
  useQuestionsWithAttempts,
  useQuestion,

  // Progress hooks
  useSetProgress,
  useQuestionBankStats,
  useFavouritedQuestions,

  // Admin hooks
  useAdminQuestionBankStats,

  // Mutation hooks - Admin
  useCreateQuestionSet,
  useUpdateQuestionSet,
  useDeleteQuestionSet,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useBulkCreateQuestions,

  // Mutation hooks - User
  useRecordAttempt,
  useToggleFavorite,
  useCompletePracticeSession,
} from './question-bank.hooks';
