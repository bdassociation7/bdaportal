/**
 * React Query Hooks for Lesson Management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LessonService } from './lesson.service';
import type {
  Lesson,
  CreateLessonDTO,
  UpdateLessonDTO,
  LessonFilters,
  LessonSummary,
} from './lesson.types';

// Query keys factory
export const lessonKeys = {
  all: ['lessons'] as const,
  lists: () => [...lessonKeys.all, 'list'] as const,
  list: (filters?: LessonFilters) => [...lessonKeys.lists(), filters] as const,
  details: () => [...lessonKeys.all, 'detail'] as const,
  detail: (id: string) => [...lessonKeys.details(), id] as const,
  byModule: (moduleId: string) => [...lessonKeys.all, 'module', moduleId] as const,
  summary: () => [...lessonKeys.all, 'summary'] as const,
};

/**
 * Fetch all lessons with optional filters
 */
export function useLessons(filters?: LessonFilters) {
  return useQuery({
    queryKey: lessonKeys.list(filters),
    queryFn: async () => {
      const { data, error } = await LessonService.getLessons(filters);
      if (error) throw error;
      // Sort by module.order_index first, then lesson.order_index within each module
      if (data) {
        data.sort((a, b) => {
          const modA = (a.module as any)?.order_index ?? 999;
          const modB = (b.module as any)?.order_index ?? 999;
          if (modA !== modB) return modA - modB;
          return (a.order_index ?? 0) - (b.order_index ?? 0);
        });
      }
      return data;
    },
  });
}

/**
 * Fetch a single lesson by ID
 */
export function useLesson(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: lessonKeys.detail(id!),
    queryFn: async () => {
      const { data, error } = await LessonService.getLessonById(id!);
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!id,
  });
}

/**
 * Fetch lessons for a specific module (3 lessons)
 */
export function useLessonsByModule(moduleId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: lessonKeys.byModule(moduleId!),
    queryFn: async () => {
      const { data, error } = await LessonService.getLessonsByModule(moduleId!);
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!moduleId,
  });
}

/**
 * Fetch lesson summary statistics
 */
export function useLessonSummary() {
  return useQuery({
    queryKey: lessonKeys.summary(),
    queryFn: async () => {
      const { data, error } = await LessonService.getLessonSummary();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Create a new lesson
 */
export function useCreateLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lesson: CreateLessonDTO) => {
      const { data, error } = await LessonService.createLesson(lesson);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate all lesson lists
      queryClient.invalidateQueries({ queryKey: lessonKeys.lists() });

      // Invalidate module-specific list
      if (data?.module_id) {
        queryClient.invalidateQueries({ queryKey: lessonKeys.byModule(data.module_id) });
      }

      // Invalidate summary
      queryClient.invalidateQueries({ queryKey: lessonKeys.summary() });
    },
  });
}

/**
 * Update an existing lesson
 */
export function useUpdateLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateLessonDTO }) => {
      const { data, error } = await LessonService.updateLesson(id, updates);
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific lesson
      queryClient.invalidateQueries({ queryKey: lessonKeys.detail(variables.id) });

      // Invalidate all lesson lists
      queryClient.invalidateQueries({ queryKey: lessonKeys.lists() });

      // Invalidate module-specific list
      if (data?.module_id) {
        queryClient.invalidateQueries({ queryKey: lessonKeys.byModule(data.module_id) });
      }

      // Invalidate summary
      queryClient.invalidateQueries({ queryKey: lessonKeys.summary() });
    },
  });
}

/**
 * Delete a lesson
 */
export function useDeleteLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await LessonService.deleteLesson(id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      // Invalidate all lesson queries
      queryClient.invalidateQueries({ queryKey: lessonKeys.all });
    },
  });
}

/**
 * Toggle lesson published status
 */
export function useTogglePublished() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const { data, error } = await LessonService.togglePublished(id, isPublished);
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific lesson
      queryClient.invalidateQueries({ queryKey: lessonKeys.detail(variables.id) });

      // Invalidate all lesson lists
      queryClient.invalidateQueries({ queryKey: lessonKeys.lists() });

      // Invalidate module-specific list
      if (data?.module_id) {
        queryClient.invalidateQueries({ queryKey: lessonKeys.byModule(data.module_id) });
      }

      // Invalidate summary
      queryClient.invalidateQueries({ queryKey: lessonKeys.summary() });
    },
  });
}

/**
 * Check if an order index is available in a module
 */
export function useCheckOrderIndex(
  moduleId: string | undefined,
  orderIndex: number,
  excludeLessonId?: string
) {
  return useQuery({
    queryKey: [...lessonKeys.byModule(moduleId!), 'order-check', orderIndex, excludeLessonId],
    queryFn: async () => {
      return await LessonService.isOrderIndexAvailable(moduleId!, orderIndex, excludeLessonId);
    },
    enabled: !!moduleId,
  });
}
