/**
 * React Query Hooks for Lesson Progress Tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LessonProgressService } from './lesson-progress.service';
import type {
  LessonProgress,
  CreateLessonProgressDTO,
  UpdateLessonProgressDTO,
  LessonProgressSummary,
  LessonProgressFilters,
  LessonProgressStatus,
} from './lesson-progress.types';
import type { CertificationType } from '@/shared/database.types';

// Query keys factory
export const lessonProgressKeys = {
  all: ['lesson-progress'] as const,
  lists: () => [...lessonProgressKeys.all, 'list'] as const,
  list: (userId: string, filters?: LessonProgressFilters) =>
    [...lessonProgressKeys.lists(), userId, filters] as const,
  details: () => [...lessonProgressKeys.all, 'detail'] as const,
  detail: (userId: string, lessonId: string) =>
    [...lessonProgressKeys.details(), userId, lessonId] as const,
  summary: (userId: string) => [...lessonProgressKeys.all, 'summary', userId] as const,
  byStatus: (userId: string, status: LessonProgressStatus) =>
    [...lessonProgressKeys.all, 'status', userId, status] as const,
  unlockCheck: (userId: string, lessonId: string) =>
    [...lessonProgressKeys.all, 'unlock', userId, lessonId] as const,
};

/**
 * Fetch lesson progress for a user with optional filters
 */
export function useLessonProgress(userId: string | undefined, filters?: LessonProgressFilters) {
  // Create a stable string key for filters to avoid reference issues
  const filterKey = filters ? JSON.stringify(filters) : undefined;

  return useQuery({
    queryKey: ['lesson-progress', 'list', userId, filterKey],
    queryFn: async () => {
      const { data, error } = await LessonProgressService.getLessonProgress(userId!, filters);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

/**
 * Fetch progress for a specific lesson
 */
export function useLessonProgressById(
  userId: string | undefined,
  lessonId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: lessonProgressKeys.detail(userId!, lessonId!),
    queryFn: async () => {
      const { data, error } = await LessonProgressService.getLessonProgressById(
        userId!,
        lessonId!
      );
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!userId && !!lessonId,
  });
}

/**
 * Fetch progress summary for a user
 */
export function useLessonProgressSummary(userId: string | undefined) {
  return useQuery({
    queryKey: lessonProgressKeys.summary(userId!),
    queryFn: async () => {
      const { data, error } = await LessonProgressService.getProgressSummary(userId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

/**
 * Check if a lesson is unlocked for a user
 */
export function useIsLessonUnlocked(
  userId: string | undefined,
  lessonId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: lessonProgressKeys.unlockCheck(userId!, lessonId!),
    queryFn: async () => {
      const { data, error } = await LessonProgressService.isLessonUnlocked(userId!, lessonId!);
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!userId && !!lessonId,
  });
}

/**
 * Fetch locked lessons for a user
 */
export function useLockedLessons(userId: string | undefined) {
  return useQuery({
    queryKey: lessonProgressKeys.byStatus(userId!, 'locked'),
    queryFn: async () => {
      const { data, error } = await LessonProgressService.getLockedLessons(userId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

/**
 * Fetch in-progress lessons for a user
 */
export function useInProgressLessons(userId: string | undefined) {
  return useQuery({
    queryKey: lessonProgressKeys.byStatus(userId!, 'in_progress'),
    queryFn: async () => {
      const { data, error } = await LessonProgressService.getInProgressLessons(userId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

/**
 * Fetch completed lessons for a user
 */
export function useCompletedLessons(userId: string | undefined) {
  return useQuery({
    queryKey: lessonProgressKeys.byStatus(userId!, 'completed'),
    queryFn: async () => {
      const { data, error } = await LessonProgressService.getCompletedLessons(userId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

/**
 * Create initial progress record
 */
export function useCreateLessonProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (progress: CreateLessonProgressDTO) => {
      const { data, error } = await LessonProgressService.createLessonProgress(progress);
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all progress lists for this user
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.lists(),
      });

      // Invalidate summary
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.summary(variables.user_id),
      });
    },
  });
}

/**
 * Update lesson progress
 */
export function useUpdateLessonProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      lessonId,
      updates,
    }: {
      userId: string;
      lessonId: string;
      updates: UpdateLessonProgressDTO;
    }) => {
      const { data, error } = await LessonProgressService.updateLessonProgress(
        userId,
        lessonId,
        updates
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific progress record
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.detail(variables.userId, variables.lessonId),
      });

      // Invalidate all progress lists for this user
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.lists(),
      });

      // Invalidate summary
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.summary(variables.userId),
      });

      // Invalidate unlock checks (progress update may unlock next lesson)
      queryClient.invalidateQueries({
        queryKey: [...lessonProgressKeys.all, 'unlock'],
      });
    },
  });
}

/**
 * Initialize progress for all lessons in a certification
 */
export function useInitializeLessonProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      certificationType,
    }: {
      userId: string;
      certificationType: CertificationType;
    }) => {
      const { data, error } = await LessonProgressService.initializeProgress(
        userId,
        certificationType
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all progress queries for this user
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.lists(),
      });

      // Invalidate summary
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.summary(variables.userId),
      });

      // Note: Unlock checks will auto-refresh when progress queries refetch
      // No need to manually invalidate to prevent cascading refetches
    },
  });
}

/**
 * Start a lesson (change status from locked to in_progress)
 */
export function useStartLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, lessonId }: { userId: string; lessonId: string }) => {
      const { data, error } = await LessonProgressService.startLesson(userId, lessonId);
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific progress record
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.detail(variables.userId, variables.lessonId),
      });

      // Invalidate progress lists
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.lists(),
      });

      // Invalidate summary
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.summary(variables.userId),
      });
    },
  });
}

/**
 * Complete lesson content (ready for quiz)
 */
export function useCompleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, lessonId }: { userId: string; lessonId: string }) => {
      const { data, error } = await LessonProgressService.completeContent(userId, lessonId);
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific progress record
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.detail(variables.userId, variables.lessonId),
      });

      // Invalidate progress lists
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.lists(),
      });

      // Invalidate summary
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.summary(variables.userId),
      });
    },
  });
}

/**
 * Complete lesson quiz and update status
 */
export function useCompleteQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      lessonId,
      quizScore,
    }: {
      userId: string;
      lessonId: string;
      quizScore: number;
    }) => {
      const { data, error } = await LessonProgressService.completeQuiz(
        userId,
        lessonId,
        quizScore
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific progress record
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.detail(variables.userId, variables.lessonId),
      });

      // Invalidate progress lists
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.lists(),
      });

      // Invalidate summary
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.summary(variables.userId),
      });

      // Invalidate unlock checks (quiz completion may unlock next lesson)
      queryClient.invalidateQueries({
        queryKey: [...lessonProgressKeys.all, 'unlock'],
      });
    },
  });
}

/**
 * Reset lesson progress (admin function)
 */
export function useResetProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, lessonId }: { userId: string; lessonId: string }) => {
      const { data, error } = await LessonProgressService.resetProgress(userId, lessonId);
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all progress queries for this user
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.lists(),
      });

      // Invalidate summary
      queryClient.invalidateQueries({
        queryKey: lessonProgressKeys.summary(variables.userId),
      });

      // Invalidate unlock checks
      queryClient.invalidateQueries({
        queryKey: [...lessonProgressKeys.all, 'unlock'],
      });
    },
  });
}
