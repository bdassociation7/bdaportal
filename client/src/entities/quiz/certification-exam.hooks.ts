import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CertificationExamService } from './certification-exam.service';
import type {
  QuizAttempt,
  QuizAttemptAnswer,
  ExamEligibilityResult,
  ExamActivityLog,
  AttemptStatus,
  StartExamParams,
  SaveExamAnswerParams,
} from './quiz.types';

/**
 * React hooks for Certification Exam operations
 * Uses React Query for data fetching, caching, and mutations
 */

// =============================================================================
// QUERY KEYS
// =============================================================================

export const certificationExamKeys = {
  all: ['certification-exam'] as const,
  eligibility: (quizId: string) => [...certificationExamKeys.all, 'eligibility', quizId] as const,
  attempt: (attemptId: string) => [...certificationExamKeys.all, 'attempt', attemptId] as const,
  answers: (attemptId: string) => [...certificationExamKeys.all, 'answers', attemptId] as const,
  activityLog: (attemptId: string) => [...certificationExamKeys.all, 'activity', attemptId] as const,
  activeAttempts: () => [...certificationExamKeys.all, 'active'] as const,
  completedAttempts: () => [...certificationExamKeys.all, 'completed'] as const,
};

// =============================================================================
// ELIGIBILITY HOOKS
// =============================================================================

/**
 * Hook to check exam eligibility
 */
export const useExamEligibility = (quizId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: certificationExamKeys.eligibility(quizId),
    queryFn: async () => {
      const result = await CertificationExamService.checkEligibility(quizId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    enabled: enabled && !!quizId,
    staleTime: 30 * 1000, // 30 seconds - eligibility can change
    refetchOnWindowFocus: true,
  });
};

// =============================================================================
// ATTEMPT LIFECYCLE HOOKS
// =============================================================================

/**
 * Hook to create a new certification exam attempt
 */
export const useCreateExamAttempt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: StartExamParams) => {
      const result = await CertificationExamService.createExamAttempt(params);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: (data) => {
      // Invalidate eligibility and active attempts
      queryClient.invalidateQueries({ queryKey: certificationExamKeys.eligibility(data.quiz_id) });
      queryClient.invalidateQueries({ queryKey: certificationExamKeys.activeAttempts() });
      // Set the new attempt in cache
      queryClient.setQueryData(certificationExamKeys.attempt(data.id), data);
    },
  });
};

/**
 * Hook to start an exam (transition to in_progress)
 */
export const useStartExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attemptId: string) => {
      const result = await CertificationExamService.startExam(attemptId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(certificationExamKeys.attempt(data.id), data);
      queryClient.invalidateQueries({ queryKey: certificationExamKeys.activeAttempts() });
    },
  });
};

/**
 * Hook to pause an exam
 */
export const usePauseExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attemptId: string) => {
      const result = await CertificationExamService.pauseExam(attemptId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(certificationExamKeys.attempt(data.id), data);
    },
  });
};

/**
 * Hook to resume an exam
 */
export const useResumeExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attemptId: string) => {
      const result = await CertificationExamService.resumeExam(attemptId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(certificationExamKeys.attempt(data.id), data);
    },
  });
};

/**
 * Hook to submit an exam for scoring
 */
export const useSubmitExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attemptId: string) => {
      const result = await CertificationExamService.submitExam(attemptId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(certificationExamKeys.attempt(data.id), data);
      queryClient.invalidateQueries({ queryKey: certificationExamKeys.activeAttempts() });
    },
  });
};

/**
 * Hook to score an exam (after submission)
 */
export const useScoreExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attemptId: string) => {
      const result = await CertificationExamService.scoreExam(attemptId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(certificationExamKeys.attempt(data.id), data);
      queryClient.invalidateQueries({ queryKey: certificationExamKeys.activeAttempts() });
      queryClient.invalidateQueries({ queryKey: certificationExamKeys.completedAttempts() });
      // Also invalidate eligibility since exam is now completed
      queryClient.invalidateQueries({ queryKey: certificationExamKeys.eligibility(data.quiz_id) });
    },
  });
};

/**
 * Hook to expire an exam (time ran out)
 */
export const useExpireExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attemptId: string) => {
      const result = await CertificationExamService.expireExam(attemptId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(certificationExamKeys.attempt(data.id), data);
      queryClient.invalidateQueries({ queryKey: certificationExamKeys.activeAttempts() });
      queryClient.invalidateQueries({ queryKey: certificationExamKeys.completedAttempts() });
    },
  });
};

/**
 * Hook to cancel an exam (admin action)
 */
export const useCancelExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attemptId, reason }: { attemptId: string; reason?: string }) => {
      const result = await CertificationExamService.cancelExam(attemptId, reason);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(certificationExamKeys.attempt(data.id), data);
      queryClient.invalidateQueries({ queryKey: certificationExamKeys.activeAttempts() });
      queryClient.invalidateQueries({ queryKey: certificationExamKeys.completedAttempts() });
    },
  });
};

// =============================================================================
// ANSWER HOOKS
// =============================================================================

/**
 * Hook to save an exam answer
 */
export const useSaveExamAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveExamAnswerParams) => {
      const result = await CertificationExamService.saveAnswer(params);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return { answer: result.data!, attemptId: params.attempt_id };
    },
    onSuccess: ({ attemptId }) => {
      // Invalidate answers cache
      queryClient.invalidateQueries({ queryKey: certificationExamKeys.answers(attemptId) });
    },
  });
};

/**
 * Hook to get saved answers for an attempt
 */
export const useExamAnswers = (attemptId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: certificationExamKeys.answers(attemptId),
    queryFn: async () => {
      const result = await CertificationExamService.getAttemptAnswers(attemptId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    enabled: enabled && !!attemptId,
    staleTime: 10 * 1000, // 10 seconds
  });
};

// =============================================================================
// ATTEMPT RETRIEVAL HOOKS
// =============================================================================

/**
 * Hook to get a specific attempt
 */
export const useExamAttempt = (attemptId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: certificationExamKeys.attempt(attemptId),
    queryFn: async () => {
      const result = await CertificationExamService.getAttempt(attemptId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    enabled: enabled && !!attemptId,
    staleTime: 5 * 1000, // 5 seconds - attempt status can change
    refetchInterval: (query) => {
      // Poll every 30 seconds if exam is in progress
      const data = query.state.data as QuizAttempt | undefined;
      if (data?.status === 'in_progress') {
        return 30 * 1000;
      }
      return false;
    },
  });
};

/**
 * Hook to get user's active exam attempts
 */
export const useActiveExamAttempts = (enabled: boolean = true) => {
  return useQuery({
    queryKey: certificationExamKeys.activeAttempts(),
    queryFn: async () => {
      const result = await CertificationExamService.getActiveAttempts();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to get user's completed exam attempts
 */
export const useCompletedExamAttempts = (enabled: boolean = true) => {
  return useQuery({
    queryKey: certificationExamKeys.completedAttempts(),
    queryFn: async () => {
      const result = await CertificationExamService.getCompletedAttempts();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// =============================================================================
// ACTIVITY LOGGING HOOKS
// =============================================================================

/**
 * Hook to log exam activity
 */
export const useLogExamActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attemptId,
      eventType,
      eventData,
    }: {
      attemptId: string;
      eventType: string;
      eventData?: Record<string, unknown>;
    }) => {
      const result = await CertificationExamService.logActivity(attemptId, eventType, eventData);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return { log: result.data!, attemptId };
    },
    onSuccess: ({ attemptId }) => {
      queryClient.invalidateQueries({ queryKey: certificationExamKeys.activityLog(attemptId) });
    },
  });
};

/**
 * Hook to get activity log for an attempt
 */
export const useExamActivityLog = (attemptId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: certificationExamKeys.activityLog(attemptId),
    queryFn: async () => {
      const result = await CertificationExamService.getActivityLog(attemptId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    enabled: enabled && !!attemptId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Hook to report suspicious activity
 */
export const useReportSuspiciousActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attemptId,
      activityType,
      details,
    }: {
      attemptId: string;
      activityType: string;
      details?: Record<string, unknown>;
    }) => {
      const result = await CertificationExamService.reportSuspiciousActivity(
        attemptId,
        activityType,
        details
      );
      if (result.error) {
        throw new Error(result.error.message);
      }
      return { attemptId };
    },
    onSuccess: ({ attemptId }) => {
      queryClient.invalidateQueries({ queryKey: certificationExamKeys.attempt(attemptId) });
      queryClient.invalidateQueries({ queryKey: certificationExamKeys.activityLog(attemptId) });
    },
  });
};

// =============================================================================
// PROCTORING HOOKS
// =============================================================================

/**
 * Hook to validate proctoring token
 */
export const useValidateProctoringToken = () => {
  return useMutation({
    mutationFn: async ({ attemptId, token }: { attemptId: string; token: string }) => {
      const result = await CertificationExamService.validateProctoringToken(attemptId, token);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
  });
};

/**
 * Hook to update time remaining
 */
export const useUpdateTimeRemaining = () => {
  return useMutation({
    mutationFn: async ({
      attemptId,
      timeRemainingSeconds,
    }: {
      attemptId: string;
      timeRemainingSeconds: number;
    }) => {
      const result = await CertificationExamService.updateTimeRemaining(
        attemptId,
        timeRemainingSeconds
      );
      if (result.error) {
        throw new Error(result.error.message);
      }
      return { attemptId, timeRemainingSeconds };
    },
  });
};

// =============================================================================
// COMBINED HOOKS
// =============================================================================

/**
 * Hook for the complete exam flow
 * Combines create, start, and submit into a convenient interface
 */
export const useCertificationExamFlow = (quizId: string) => {
  const eligibility = useExamEligibility(quizId);
  const createAttempt = useCreateExamAttempt();
  const startExam = useStartExam();
  const pauseExam = usePauseExam();
  const resumeExam = useResumeExam();
  const submitExam = useSubmitExam();
  const scoreExam = useScoreExam();
  const saveAnswer = useSaveExamAnswer();

  return {
    // Query states
    eligibility,
    isLoading:
      eligibility.isLoading ||
      createAttempt.isPending ||
      startExam.isPending ||
      submitExam.isPending ||
      scoreExam.isPending,

    // Mutations
    createAttempt,
    startExam,
    pauseExam,
    resumeExam,
    submitExam,
    scoreExam,
    saveAnswer,

    // Computed states
    canStart: eligibility.data?.eligible && !eligibility.data?.has_active_attempt,
    canResume: eligibility.data?.has_active_attempt && eligibility.data?.can_resume,
    activeAttemptId: eligibility.data?.attempt_id,
    voucherId: eligibility.data?.voucher_id,
  };
};
