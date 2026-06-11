/**
 * Question Bank Hooks
 * React Query hooks for question bank operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QuestionBankService } from './question-bank.service';
import type {
  QuestionSet,
  QuestionSetInsert,
  QuestionSetUpdate,
  QuestionSetWithProgress,
  QuestionSetWithCompetency,
  PracticeQuestion,
  PracticeQuestionInsert,
  PracticeQuestionUpdate,
  PracticeQuestionWithAttempt,
  UserQuestionBankProgress,
  QuestionSetFilters,
  QuestionFilters,
  QuestionBankStats,
  PracticeSessionResult,
} from './question-bank.types';
import type { CertificationType } from '../curriculum/curriculum.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const questionBankKeys = {
  all: ['question-bank'] as const,

  // Question Sets
  sets: () => [...questionBankKeys.all, 'sets'] as const,
  setsList: (filters?: QuestionSetFilters) =>
    [...questionBankKeys.sets(), { filters }] as const,
  setsWithProgress: (userId: string, certType: CertificationType, examLanguage?: 'EN' | 'AR') =>
    [...questionBankKeys.sets(), 'progress', userId, certType, examLanguage] as const,
  setsWithCompetency: (filters?: QuestionSetFilters) =>
    [...questionBankKeys.sets(), 'competency', { filters }] as const,
  set: (id: string) => [...questionBankKeys.sets(), id] as const,

  // Questions
  questions: () => [...questionBankKeys.all, 'questions'] as const,
  questionsList: (setId: string, filters?: QuestionFilters) =>
    [...questionBankKeys.questions(), setId, { filters }] as const,
  questionsWithAttempts: (userId: string, setId: string, certTarget?: 'CP' | 'SCP') =>
    [...questionBankKeys.questions(), 'attempts', userId, setId, certTarget] as const,
  question: (id: string) => [...questionBankKeys.questions(), id] as const,

  // Progress
  progress: (userId: string) =>
    [...questionBankKeys.all, 'progress', userId] as const,
  setProgress: (userId: string, setId: string) =>
    [...questionBankKeys.progress(userId), setId] as const,

  // Stats
  stats: (userId: string, certType?: CertificationType, examLanguage?: 'en' | 'ar') =>
    [...questionBankKeys.all, 'stats', userId, certType, examLanguage] as const,
  adminStats: (certType?: CertificationType) =>
    [...questionBankKeys.all, 'admin-stats', certType] as const,

  // Favourites
  favourites: (userId: string) =>
    [...questionBankKeys.all, 'favourites', userId] as const,
};

// =============================================================================
// QUESTION SET HOOKS
// =============================================================================

/**
 * Get all question sets
 */
export function useQuestionSets(filters?: QuestionSetFilters) {
  return useQuery({
    queryKey: questionBankKeys.setsList(filters),
    queryFn: async () => {
      const result = await QuestionBankService.getQuestionSets(filters);
      if (result.error) throw result.error;
      return result.data!;
    },
  });
}

/**
 * Get question sets with user progress
 */
export function useQuestionSetsWithProgress(
  userId: string | undefined,
  certificationType: CertificationType,
  examLanguage?: 'EN' | 'AR'
) {
  return useQuery({
    queryKey: questionBankKeys.setsWithProgress(userId || '', certificationType, examLanguage),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const result = await QuestionBankService.getQuestionSetsWithProgress(
        userId,
        certificationType,
        examLanguage
      );
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!userId,
  });
}

/**
 * Get question sets with competency info (admin)
 */
export function useQuestionSetsWithCompetency(filters?: QuestionSetFilters) {
  return useQuery({
    queryKey: questionBankKeys.setsWithCompetency(filters),
    queryFn: async () => {
      const result = await QuestionBankService.getQuestionSetsWithCompetency(filters);
      if (result.error) throw result.error;
      return result.data!;
    },
  });
}

/**
 * Get single question set
 */
export function useQuestionSet(setId: string | undefined) {
  return useQuery({
    queryKey: questionBankKeys.set(setId || ''),
    queryFn: async () => {
      if (!setId) throw new Error('Set ID required');
      const result = await QuestionBankService.getQuestionSetById(setId);
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!setId,
  });
}

// =============================================================================
// QUESTION HOOKS
// =============================================================================

/**
 * Get questions for a set
 */
export function useQuestions(
  questionSetId: string | undefined,
  filters?: QuestionFilters
) {
  return useQuery({
    queryKey: questionBankKeys.questionsList(questionSetId || '', filters),
    queryFn: async () => {
      if (!questionSetId) throw new Error('Question set ID required');
      const result = await QuestionBankService.getQuestions(questionSetId, filters);
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!questionSetId,
  });
}

/**
 * Get questions with user's attempts
 * @param certificationTarget - 'CP' | 'SCP' | undefined — filters questions by cert target
 */
export function useQuestionsWithAttempts(
  userId: string | undefined,
  questionSetId: string | undefined,
  certificationTarget?: 'CP' | 'SCP'
) {
  return useQuery({
    queryKey: questionBankKeys.questionsWithAttempts(userId || '', questionSetId || '', certificationTarget),
    queryFn: async () => {
      if (!userId || !questionSetId)
        throw new Error('User ID and Question set ID required');
      const result = await QuestionBankService.getQuestionsWithAttempts(
        userId,
        questionSetId,
        certificationTarget
      );
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!userId && !!questionSetId,
  });
}

/**
 * Get single question
 */
export function useQuestion(questionId: string | undefined) {
  return useQuery({
    queryKey: questionBankKeys.question(questionId || ''),
    queryFn: async () => {
      if (!questionId) throw new Error('Question ID required');
      const result = await QuestionBankService.getQuestionById(questionId);
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!questionId,
  });
}

// =============================================================================
// PROGRESS HOOKS
// =============================================================================

/**
 * Get user progress for a set
 */
export function useSetProgress(
  userId: string | undefined,
  questionSetId: string | undefined
) {
  return useQuery({
    queryKey: questionBankKeys.setProgress(userId || '', questionSetId || ''),
    queryFn: async () => {
      if (!userId || !questionSetId)
        throw new Error('User ID and Question set ID required');
      const result = await QuestionBankService.getSetProgress(userId, questionSetId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!userId && !!questionSetId,
  });
}

/**
 * Get user's question bank stats
 * @param examLanguage - Optional language filter ('en' or 'ar' lowercase)
 */
export function useQuestionBankStats(
  userId: string | undefined,
  certificationType?: CertificationType,
  examLanguage?: 'en' | 'ar'
) {
  return useQuery({
    queryKey: questionBankKeys.stats(userId || '', certificationType, examLanguage),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const result = await QuestionBankService.getUserStats(userId, certificationType, examLanguage);
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!userId,
  });
}

/**
 * Get user's favourited questions
 */
export function useFavouritedQuestions(
  userId: string | undefined,
  certificationType?: string
) {
  return useQuery({
    queryKey: questionBankKeys.favourites(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const result = await QuestionBankService.getFavouritedQuestions(
        userId,
        certificationType
      );
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!userId,
  });
}

// =============================================================================
// ADMIN HOOKS
// =============================================================================

/**
 * Get admin stats
 */
export function useAdminQuestionBankStats(certificationType?: CertificationType) {
  return useQuery({
    queryKey: questionBankKeys.adminStats(certificationType),
    queryFn: async () => {
      const result = await QuestionBankService.getAdminStats(certificationType);
      if (result.error) throw result.error;
      return result.data!;
    },
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Create question set (Admin)
 */
export function useCreateQuestionSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionSet: QuestionSetInsert) => {
      const result = await QuestionBankService.createQuestionSet(questionSet);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionBankKeys.sets() });
    },
  });
}

/**
 * Update question set (Admin)
 */
export function useUpdateQuestionSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      setId,
      updates,
    }: {
      setId: string;
      updates: QuestionSetUpdate;
    }) => {
      const result = await QuestionBankService.updateQuestionSet(setId, updates);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: questionBankKeys.set(data.id) });
      queryClient.invalidateQueries({ queryKey: questionBankKeys.sets() });
    },
  });
}

/**
 * Delete question set (Admin)
 */
export function useDeleteQuestionSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (setId: string) => {
      const result = await QuestionBankService.deleteQuestionSet(setId);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionBankKeys.sets() });
    },
  });
}

/**
 * Create question (Admin)
 */
export function useCreateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (question: PracticeQuestionInsert) => {
      const result = await QuestionBankService.createQuestion(question);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: questionBankKeys.questionsList(data.question_set_id),
      });
      queryClient.invalidateQueries({
        queryKey: questionBankKeys.set(data.question_set_id),
      });
    },
  });
}

/**
 * Update question (Admin)
 */
export function useUpdateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      questionId,
      updates,
    }: {
      questionId: string;
      updates: PracticeQuestionUpdate;
    }) => {
      const result = await QuestionBankService.updateQuestion(questionId, updates);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: questionBankKeys.question(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: questionBankKeys.questionsList(data.question_set_id),
      });
    },
  });
}

/**
 * Delete question (Admin)
 */
export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      questionId,
      questionSetId,
    }: {
      questionId: string;
      questionSetId: string;
    }) => {
      const result = await QuestionBankService.deleteQuestion(questionId);
      if (result.error) throw result.error;
      return { questionSetId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: questionBankKeys.questionsList(data.questionSetId),
      });
      queryClient.invalidateQueries({
        queryKey: questionBankKeys.set(data.questionSetId),
      });
    },
  });
}

/**
 * Bulk create questions (Admin)
 */
export function useBulkCreateQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questions: PracticeQuestionInsert[]) => {
      const result = await QuestionBankService.bulkCreateQuestions(questions);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({
          queryKey: questionBankKeys.questionsList(data[0].question_set_id),
        });
        queryClient.invalidateQueries({
          queryKey: questionBankKeys.set(data[0].question_set_id),
        });
      }
    },
  });
}

/**
 * Record question attempt
 */
export function useRecordAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      questionId,
      questionSetId,
      selectedOptionId,
      isCorrect,
      timeSpentSeconds,
    }: {
      userId: string;
      questionId: string;
      questionSetId: string;
      selectedOptionId: string;
      isCorrect: boolean;
      timeSpentSeconds?: number;
    }) => {
      const result = await QuestionBankService.recordAttempt(
        userId,
        questionId,
        questionSetId,
        selectedOptionId,
        isCorrect,
        timeSpentSeconds
      );
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: questionBankKeys.questionsWithAttempts(
          variables.userId,
          variables.questionSetId
        ),
      });
      queryClient.invalidateQueries({
        queryKey: questionBankKeys.setProgress(
          variables.userId,
          variables.questionSetId
        ),
      });
    },
  });
}

/**
 * Toggle favourite
 */
export function useToggleFavourite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      questionId,
      isFavourited,
    }: {
      userId: string;
      questionId: string;
      isFavourited: boolean;
    }) => {
      const result = await QuestionBankService.toggleFavourite(
        userId,
        questionId,
        isFavourited
      );
      if (result.error) throw result.error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: questionBankKeys.favourites(variables.userId),
      });
    },
  });
}

/**
 * Complete practice session
 */
export function useCompletePracticeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      questionSetId,
      result,
    }: {
      userId: string;
      questionSetId: string;
      result: PracticeSessionResult;
    }) => {
      const response = await QuestionBankService.completePracticeSession(
        userId,
        questionSetId,
        result
      );
      if (response.error) throw response.error;
      return response.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: questionBankKeys.setProgress(
          variables.userId,
          variables.questionSetId
        ),
      });
      queryClient.invalidateQueries({
        queryKey: questionBankKeys.stats(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: questionBankKeys.setsWithProgress(variables.userId, 'CP'),
      });
    },
  });
}
