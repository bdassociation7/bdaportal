/**
 * Mock Exam Hooks
 * React Query hooks for mock exams
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MockExamService } from './mock-exam.service';
import type {
  ExamFilters,
  AttemptFilters,
  StartExamDTO,
  SubmitAnswerDTO,
} from './mock-exam.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const mockExamKeys = {
  all: ['mock-exams'] as const,
  lists: () => [...mockExamKeys.all, 'list'] as const,
  list: (filters?: ExamFilters) => [...mockExamKeys.lists(), filters] as const,
  catalog: (filters?: ExamFilters) => [...mockExamKeys.all, 'catalog', filters] as const,
  details: () => [...mockExamKeys.all, 'detail'] as const,
  detail: (id: string) => [...mockExamKeys.details(), id] as const,
  stats: (id: string) => [...mockExamKeys.all, 'stats', id] as const,
  premiumAccess: () => [...mockExamKeys.all, 'premium-access'] as const,
  examPremiumAccess: (examId: string) => [...mockExamKeys.all, 'exam-premium-access', examId] as const,
  attempts: () => [...mockExamKeys.all, 'attempts'] as const,
  myAttempts: (filters?: AttemptFilters) =>
    [...mockExamKeys.attempts(), 'my', filters] as const,
  allAttempts: (filters?: AttemptFilters) =>
    [...mockExamKeys.attempts(), 'all', filters] as const,
  attemptResults: (attemptId: string) =>
    [...mockExamKeys.attempts(), 'results', attemptId] as const,
  examStatistics: (examId: string) =>
    [...mockExamKeys.all, 'statistics', examId] as const,
  // Admin keys
  admin: () => [...mockExamKeys.all, 'admin'] as const,
  adminList: (filters?: ExamFilters) => [...mockExamKeys.admin(), 'list', filters] as const,
  adminDetail: (id: string) => [...mockExamKeys.admin(), 'detail', id] as const,
  adminQuestions: (examId: string) => [...mockExamKeys.admin(), 'questions', examId] as const,
};

// =============================================================================
// EXAM QUERIES
// =============================================================================

/**
 * Get all active exams with optional filters
 */
export function useActiveExams(filters?: ExamFilters) {
  return useQuery({
    queryKey: mockExamKeys.list(filters),
    queryFn: async () => {
      const { data, error } = await MockExamService.getActiveExams(filters);
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Get all exams for catalog view (shows free/premium status)
 */
export function useExamsCatalog(filters?: ExamFilters) {
  return useQuery({
    queryKey: mockExamKeys.catalog(filters),
    queryFn: async () => {
      const { data, error } = await MockExamService.getAllExamsForCatalog(filters);
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Get user's premium access records
 */
export function useUserPremiumAccess() {
  return useQuery({
    queryKey: mockExamKeys.premiumAccess(),
    queryFn: async () => {
      const { data, error } = await MockExamService.getUserPremiumAccess();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Get all users with premium access to a specific exam (admin only)
 */
export function useExamPremiumAccess(examId: string, enabled = true) {
  return useQuery({
    queryKey: mockExamKeys.examPremiumAccess(examId),
    queryFn: async () => {
      const { data, error } = await MockExamService.getExamPremiumAccess(examId);
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!examId,
  });
}

/**
 * Grant premium access mutation (admin only)
 */
export function useGrantPremiumAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      examId,
      expiresAt,
    }: {
      userId: string;
      examId: string;
      expiresAt?: string;
    }) => MockExamService.grantPremiumAccess(userId, examId, expiresAt),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mockExamKeys.premiumAccess() });
      queryClient.invalidateQueries({ queryKey: mockExamKeys.examPremiumAccess(variables.examId) });
      queryClient.invalidateQueries({ queryKey: mockExamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mockExamKeys.catalog() });
    },
  });
}

/**
 * Revoke premium access mutation (admin only)
 */
export function useRevokePremiumAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, examId }: { userId: string; examId: string }) =>
      MockExamService.revokePremiumAccess(userId, examId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mockExamKeys.premiumAccess() });
      queryClient.invalidateQueries({ queryKey: mockExamKeys.examPremiumAccess(variables.examId) });
      queryClient.invalidateQueries({ queryKey: mockExamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mockExamKeys.catalog() });
    },
  });
}

/**
 * Get exam details with questions and answers
 */
export function useExamDetails(examId: string, enabled = true) {
  return useQuery({
    queryKey: mockExamKeys.detail(examId),
    queryFn: async () => {
      const { data, error } = await MockExamService.getExamWithQuestions(examId);
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!examId,
  });
}

/**
 * Get user's stats for a specific exam
 */
export function useExamStats(examId: string) {
  return useQuery({
    queryKey: mockExamKeys.stats(examId),
    queryFn: () => MockExamService.getExamStatsForUser(examId),
    enabled: !!examId,
  });
}

// =============================================================================
// ATTEMPT QUERIES
// =============================================================================

/**
 * Get user's attempt history
 */
export function useMyAttempts(filters?: AttemptFilters) {
  return useQuery({
    queryKey: mockExamKeys.myAttempts(filters),
    queryFn: async () => {
      const { data, error } = await MockExamService.getMyAttempts(filters);
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Get detailed results for a specific attempt
 */
export function useAttemptResults(attemptId: string, enabled = true) {
  return useQuery({
    queryKey: mockExamKeys.attemptResults(attemptId),
    queryFn: async () => {
      const { data, error } = await MockExamService.getAttemptResults(attemptId);
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!attemptId,
  });
}

/**
 * Get all attempts (admin only)
 */
export function useAllAttempts(filters?: AttemptFilters) {
  return useQuery({
    queryKey: mockExamKeys.allAttempts(filters),
    queryFn: async () => {
      const { data, error } = await MockExamService.getAllAttempts(filters);
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Get exam statistics (admin only)
 */
export function useExamStatistics(examId: string) {
  return useQuery({
    queryKey: mockExamKeys.examStatistics(examId),
    queryFn: async () => {
      const { data, error } = await MockExamService.getExamStatistics(examId);
      if (error) throw error;
      return data;
    },
    enabled: !!examId,
  });
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Start a new exam attempt
 */
export function useStartExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: StartExamDTO) => MockExamService.startExam(dto),
    onSuccess: (result, variables) => {
      // Invalidate exam stats to reflect new attempt
      queryClient.invalidateQueries({
        queryKey: mockExamKeys.stats(variables.exam_id),
      });
      queryClient.invalidateQueries({
        queryKey: mockExamKeys.myAttempts(),
      });
    },
  });
}

/**
 * Submit answer for a question
 */
export function useSubmitAnswer() {
  return useMutation({
    mutationFn: (dto: SubmitAnswerDTO) => MockExamService.submitAnswer(dto),
  });
}

/**
 * Complete exam and get results
 */
export function useCompleteExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attemptId: string) => MockExamService.completeExam(attemptId),
    onSuccess: (result) => {
      if (result.data) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({
          queryKey: mockExamKeys.stats(result.data.exam.id),
        });
        queryClient.invalidateQueries({
          queryKey: mockExamKeys.myAttempts(),
        });
        queryClient.invalidateQueries({
          queryKey: mockExamKeys.allAttempts(),
        });
        // Set the attempt results in cache
        queryClient.setQueryData(
          mockExamKeys.attemptResults(result.data.attempt.id),
          result.data
        );
      }
    },
  });
}

// =============================================================================
// ADMIN HOOKS
// =============================================================================

/**
 * Get all exams for admin (including inactive) with statistics
 */
export function useExamsAdmin(filters?: ExamFilters) {
  return useQuery({
    queryKey: mockExamKeys.adminList(filters),
    queryFn: async () => {
      const { data, error } = await MockExamService.getExamsAdmin(filters);
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Get exam details for admin (with questions)
 */
export function useExamAdmin(examId: string, enabled = true) {
  return useQuery({
    queryKey: mockExamKeys.adminDetail(examId),
    queryFn: async () => {
      const { data, error } = await MockExamService.getExamWithQuestions(examId);
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!examId,
  });
}

/**
 * Get exam questions for admin
 */
export function useExamQuestions(examId: string, enabled = true) {
  return useQuery({
    queryKey: mockExamKeys.adminQuestions(examId),
    queryFn: async () => {
      const { data, error } = await MockExamService.getExamWithQuestions(examId);
      if (error) throw error;
      return data?.questions || [];
    },
    enabled: enabled && !!examId,
  });
}

/**
 * Create exam mutation
 */
export function useCreateExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: import('./mock-exam.types').CreateExamDTO) =>
      MockExamService.createExam(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mockExamKeys.admin() });
      queryClient.invalidateQueries({ queryKey: mockExamKeys.lists() });
    },
  });
}

/**
 * Update exam mutation
 */
export function useUpdateExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: Partial<import('./mock-exam.types').CreateExamDTO>;
    }) => MockExamService.updateExam(id, dto),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: mockExamKeys.admin() });
      queryClient.invalidateQueries({ queryKey: mockExamKeys.adminDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: mockExamKeys.lists() });
    },
  });
}

/**
 * Delete exam mutation
 */
export function useDeleteExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => MockExamService.deleteExam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mockExamKeys.admin() });
      queryClient.invalidateQueries({ queryKey: mockExamKeys.lists() });
    },
  });
}

/**
 * Toggle exam active status mutation
 */
export function useToggleExamActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      MockExamService.toggleExamActive(id, isActive),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: mockExamKeys.admin() });
      queryClient.invalidateQueries({ queryKey: mockExamKeys.adminDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: mockExamKeys.lists() });
    },
  });
}

/**
 * Create question mutation
 */
export function useCreateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: import('./mock-exam.types').CreateQuestionDTO) =>
      MockExamService.createQuestion(dto),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: mockExamKeys.adminQuestions(variables.exam_id),
      });
      queryClient.invalidateQueries({
        queryKey: mockExamKeys.adminDetail(variables.exam_id),
      });
      // Update question count
      MockExamService.updateExamQuestionCount(variables.exam_id);
      queryClient.invalidateQueries({ queryKey: mockExamKeys.admin() });
    },
  });
}

/**
 * Update question mutation
 */
export function useUpdateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: import('./mock-exam.types').UpdateQuestionDTO) =>
      MockExamService.updateQuestion(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mockExamKeys.admin() });
    },
  });
}

/**
 * Delete question mutation
 */
export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, examId }: { id: string; examId: string }) =>
      MockExamService.deleteQuestion(id),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: mockExamKeys.adminQuestions(variables.examId),
      });
      queryClient.invalidateQueries({
        queryKey: mockExamKeys.adminDetail(variables.examId),
      });
      // Update question count
      MockExamService.updateExamQuestionCount(variables.examId);
      queryClient.invalidateQueries({ queryKey: mockExamKeys.admin() });
    },
  });
}

/**
 * Create answer mutation
 */
export function useCreateAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      dto,
      examId,
    }: {
      questionId: string;
      dto: import('./mock-exam.types').CreateAnswerDTO;
      examId: string;
    }) => MockExamService.createAnswer(questionId, dto),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: mockExamKeys.adminQuestions(variables.examId),
      });
      queryClient.invalidateQueries({
        queryKey: mockExamKeys.adminDetail(variables.examId),
      });
    },
  });
}

/**
 * Update answer mutation
 */
export function useUpdateAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dto,
      examId,
    }: {
      dto: import('./mock-exam.types').UpdateAnswerDTO;
      examId: string;
    }) => MockExamService.updateAnswer(dto),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: mockExamKeys.adminQuestions(variables.examId),
      });
      queryClient.invalidateQueries({
        queryKey: mockExamKeys.adminDetail(variables.examId),
      });
    },
  });
}

/**
 * Delete answer mutation
 */
export function useDeleteAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, examId }: { id: string; examId: string }) =>
      MockExamService.deleteAnswer(id),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: mockExamKeys.adminQuestions(variables.examId),
      });
      queryClient.invalidateQueries({
        queryKey: mockExamKeys.adminDetail(variables.examId),
      });
    },
  });
}

// =============================================================================
// MOCK EXAM PRODUCTS HOOKS (Admin)
// =============================================================================

export const mockExamProductKeys = {
  all: ['mock-exam-products'] as const,
  list: () => [...mockExamProductKeys.all, 'list'] as const,
  grants: (userId?: string) => [...mockExamProductKeys.all, 'grants', userId] as const,
  credits: (userId: string) => [...mockExamProductKeys.all, 'credits', userId] as const,
};

/**
 * Get all mock exam products (admin only)
 */
export function useMockExamProducts() {
  return useQuery({
    queryKey: mockExamProductKeys.list(),
    queryFn: async () => {
      const { data, error } = await MockExamService.getAllMockExamProducts();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Create mock exam product mutation (admin only)
 */
export function useCreateMockExamProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: import('./mock-exam.types').CreateMockExamProductDTO) =>
      MockExamService.createMockExamProduct(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mockExamProductKeys.list() });
    },
  });
}

/**
 * Update mock exam product mutation (admin only)
 */
export function useUpdateMockExamProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: import('./mock-exam.types').UpdateMockExamProductDTO;
    }) => MockExamService.updateMockExamProduct(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mockExamProductKeys.list() });
    },
  });
}

/**
 * Delete mock exam product mutation (admin only)
 */
export function useDeleteMockExamProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => MockExamService.deleteMockExamProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mockExamProductKeys.list() });
    },
  });
}

/**
 * Get user's mock exam credits
 */
export function useUserMockExamCredits(userId: string, enabled = true) {
  return useQuery({
    queryKey: mockExamProductKeys.credits(userId),
    queryFn: async () => {
      const { data, error } = await MockExamService.getUserMockExamCredits(userId);
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!userId,
  });
}

/**
 * Use mock exam credit to unlock an exam
 */
export function useUseMockExamCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, examId }: { userId: string; examId: string }) =>
      MockExamService.useMockExamCredit(userId, examId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mockExamProductKeys.credits(variables.userId) });
      queryClient.invalidateQueries({ queryKey: mockExamKeys.premiumAccess() });
      queryClient.invalidateQueries({ queryKey: mockExamKeys.catalog() });
    },
  });
}

/**
 * Get mock exam access grants (admin only)
 */
export function useMockExamAccessGrants(userId?: string) {
  return useQuery({
    queryKey: mockExamProductKeys.grants(userId),
    queryFn: async () => {
      const { data, error } = await MockExamService.getUserAccessGrants(userId);
      if (error) throw error;
      return data;
    },
  });
}
