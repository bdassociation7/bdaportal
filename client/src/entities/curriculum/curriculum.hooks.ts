import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CurriculumService } from './curriculum.service';
import { CurriculumAccessService } from './curriculum-access.service';
import { CurriculumProgressService } from './curriculum-progress.service';
import type {
  CurriculumModule,
  CurriculumModuleWithStatus,
  ModuleDetail,
  AccessCheckResult,
  CurriculumDashboard,
  UpdateProgressDTO,
  CertificationType,
} from './curriculum.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const curriculumKeys = {
  all: ['curriculum'] as const,
  modules: () => [...curriculumKeys.all, 'modules'] as const,
  modulesList: (filters?: any) => [...curriculumKeys.modules(), { filters }] as const,
  module: (id: string) => [...curriculumKeys.modules(), id] as const,
  moduleDetail: (userId: string, moduleId: string) =>
    [...curriculumKeys.module(moduleId), 'detail', userId] as const,

  access: (userId: string, certType: CertificationType) =>
    [...curriculumKeys.all, 'access', userId, certType] as const,

  progress: (userId: string) => [...curriculumKeys.all, 'progress', userId] as const,
  moduleProgress: (userId: string, moduleId: string) =>
    [...curriculumKeys.progress(userId), moduleId] as const,

  dashboard: (userId: string, certType: CertificationType) =>
    [...curriculumKeys.all, 'dashboard', userId, certType] as const,

  stats: (userId: string, certType: CertificationType, examLanguage?: 'en' | 'ar') =>
    [...curriculumKeys.all, 'stats', userId, certType, examLanguage] as const,
};

// =============================================================================
// ACCESS HOOKS
// =============================================================================

/**
 * Check and auto-grant curriculum access
 * This is the main hook to use on curriculum entry
 */
export function useCurriculumAccess(
  userId: string | undefined,
  userEmail: string | undefined,
  certificationType: CertificationType
) {
  return useQuery({
    queryKey: curriculumKeys.access(userId || '', certificationType),
    queryFn: async () => {
      if (!userId || !userEmail) throw new Error('User not authenticated');

      const result = await CurriculumAccessService.checkAndGrantAccess(
        userId,
        userEmail,
        certificationType
      );

      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!userId && !!userEmail,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

// =============================================================================
// MODULE HOOKS
// =============================================================================

/**
 * Get all modules with user progress
 * @param examLanguage - Optional language filter ('en' or 'ar' lowercase)
 */
export function useModulesWithProgress(
  userId: string | undefined,
  certificationType: CertificationType,
  enabled: boolean = true,
  examLanguage?: 'en' | 'ar'
) {
  return useQuery({
    queryKey: [...curriculumKeys.dashboard(userId || '', certificationType), examLanguage],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      const result = await CurriculumService.getModulesWithProgress(
        userId,
        certificationType,
        examLanguage
      );

      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!userId && enabled,
  });
}

/**
 * Get single module with full detail
 */
export function useModuleDetail(
  userId: string | undefined,
  moduleId: string | undefined
) {
  return useQuery({
    queryKey: curriculumKeys.moduleDetail(userId || '', moduleId || ''),
    queryFn: async () => {
      if (!userId || !moduleId) throw new Error('User ID and Module ID required');

      const result = await CurriculumService.getModuleDetail(userId, moduleId);

      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!userId && !!moduleId,
  });
}

/**
 * Get next unlocked module
 * @param examLanguage - Optional language filter ('en' or 'ar' lowercase)
 */
export function useNextModule(
  userId: string | undefined,
  certificationType: CertificationType,
  examLanguage?: 'en' | 'ar'
) {
  return useQuery({
    queryKey: [...curriculumKeys.all, 'next-module', userId, certificationType, examLanguage],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      const result = await CurriculumService.getNextUnlockedModule(
        userId,
        certificationType,
        examLanguage
      );

      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!userId,
  });
}

// =============================================================================
// PROGRESS HOOKS
// =============================================================================

/**
 * Get module progress
 */
export function useModuleProgress(
  userId: string | undefined,
  moduleId: string | undefined
) {
  return useQuery({
    queryKey: curriculumKeys.moduleProgress(userId || '', moduleId || ''),
    queryFn: async () => {
      if (!userId || !moduleId) throw new Error('User ID and Module ID required');

      const result = await CurriculumProgressService.getModuleProgress(
        userId,
        moduleId
      );

      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!userId && !!moduleId,
  });
}

/**
 * Get overall progress statistics
 * @param examLanguage - Optional language filter ('en' or 'ar' lowercase)
 */
export function useOverallProgress(
  userId: string | undefined,
  certificationType: CertificationType,
  examLanguage?: 'en' | 'ar'
) {
  return useQuery({
    queryKey: curriculumKeys.stats(userId || '', certificationType, examLanguage),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      const result = await CurriculumProgressService.getOverallProgress(
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

// =============================================================================
// DASHBOARD HOOK (Combined data)
// =============================================================================

/**
 * Complete curriculum dashboard data
 * Combines access check, modules, and progress
 * @param examLanguage - Optional language filter ('EN' or 'AR' uppercase, will be converted to lowercase for DB)
 */
export function useCurriculumDashboard(
  userId: string | undefined,
  userEmail: string | undefined,
  certificationType: CertificationType,
  examLanguage?: 'EN' | 'AR'
) {
  // Convert uppercase language to lowercase for database query
  const dbLanguage = examLanguage?.toLowerCase() as 'en' | 'ar' | undefined;

  // Check access first
  const accessQuery = useCurriculumAccess(userId, userEmail, certificationType);

  // Get modules with progress, filtered by language
  const modulesQuery = useModulesWithProgress(
    userId,
    certificationType,
    accessQuery.data?.hasAccess || false,
    dbLanguage
  );

  // Get overall stats
  const statsQuery = useOverallProgress(
    userId,
    certificationType
  );

  // Get next module (filtered by language)
  const nextModuleQuery = useNextModule(userId, certificationType, dbLanguage);

  // Filter modules by section_type instead of hardcoded slice
  const knowledgeModules = modulesQuery.data?.filter(
    (m) => m.section_type === 'knowledge_based'
  ) || [];
  const behavioralModules = modulesQuery.data?.filter(
    (m) => m.section_type === 'behavioral'
  ) || [];
  // Intro (Module 0) and Outro (Module 15) - SHRM-style
  const introModules = modulesQuery.data?.filter(
    (m) => m.section_type === 'intro'
  ) || [];
  const outroModules = modulesQuery.data?.filter(
    (m) => m.section_type === 'outro'
  ) || [];

  return {
    // Loading states
    isLoading: accessQuery.isLoading || modulesQuery.isLoading,
    isError: accessQuery.isError || modulesQuery.isError,
    error: accessQuery.error || modulesQuery.error,

    // Access data
    hasAccess: accessQuery.data?.hasAccess || false,
    accessReason: accessQuery.data?.reason,
    access: accessQuery.data?.access,

    // Modules data (filtered by section_type)
    modules: modulesQuery.data || [],
    knowledgeModules,
    behavioralModules,
    introModules,
    outroModules,

    // Stats
    overallProgress: statsQuery.data,
    nextModule: nextModuleQuery.data,

    // Refetch functions
    refetch: () => {
      accessQuery.refetch();
      modulesQuery.refetch();
      statsQuery.refetch();
    },
  };
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Update module progress
 */
export function useUpdateProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      moduleId,
      updates,
    }: {
      userId: string;
      moduleId: string;
      updates: UpdateProgressDTO;
    }) => {
      const result = await CurriculumProgressService.updateProgress(
        userId,
        moduleId,
        updates
      );

      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: curriculumKeys.moduleProgress(variables.userId, variables.moduleId),
      });
      queryClient.invalidateQueries({
        queryKey: curriculumKeys.progress(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: curriculumKeys.stats(variables.userId, 'CP'), // TODO: dynamic cert type
      });
    },
  });
}

/**
 * Mark module as ready for quiz
 */
export function useMarkReadyForQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      moduleId,
    }: {
      userId: string;
      moduleId: string;
    }) => {
      const result = await CurriculumProgressService.markReadyForQuiz(
        userId,
        moduleId
      );

      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: curriculumKeys.moduleProgress(variables.userId, variables.moduleId),
      });
    },
  });
}

/**
 * Handle quiz completion
 */
export function useHandleQuizCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      moduleId,
      quizAttemptId,
      score,
    }: {
      userId: string;
      moduleId: string;
      quizAttemptId: string;
      score: number;
    }) => {
      const result = await CurriculumProgressService.handleQuizCompletion(
        userId,
        moduleId,
        quizAttemptId,
        score
      );

      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (data, variables) => {
      // Invalidate current module
      queryClient.invalidateQueries({
        queryKey: curriculumKeys.moduleProgress(variables.userId, variables.moduleId),
      });

      // Invalidate next module if unlocked
      if (data.nextModuleUnlocked && data.nextModuleId) {
        queryClient.invalidateQueries({
          queryKey: curriculumKeys.moduleProgress(variables.userId, data.nextModuleId),
        });
      }

      // Invalidate dashboard and stats
      queryClient.invalidateQueries({
        queryKey: curriculumKeys.dashboard(variables.userId, 'CP'), // TODO: dynamic
      });
      queryClient.invalidateQueries({
        queryKey: curriculumKeys.stats(variables.userId, 'CP'), // TODO: dynamic
      });
    },
  });
}

/**
 * Increment time spent on module
 */
export function useIncrementTimeSpent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      moduleId,
      minutes,
    }: {
      userId: string;
      moduleId: string;
      minutes: number;
    }) => {
      const result = await CurriculumProgressService.incrementTimeSpent(
        userId,
        moduleId,
        minutes
      );

      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: curriculumKeys.moduleProgress(variables.userId, variables.moduleId),
      });
    },
  });
}

// =============================================================================
// ADMIN HOOKS
// =============================================================================

/**
 * Create module (Admin)
 */
export function useCreateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (module: any) => {
      const result = await CurriculumService.createModule(module);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: curriculumKeys.modules() });
    },
  });
}

/**
 * Update module (Admin)
 */
export function useUpdateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moduleId, updates }: { moduleId: string; updates: any }) => {
      const result = await CurriculumService.updateModule(moduleId, updates);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: curriculumKeys.module(data.id) });
      queryClient.invalidateQueries({ queryKey: curriculumKeys.modules() });
    },
  });
}

/**
 * Delete module (Admin)
 */
export function useDeleteModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (moduleId: string) => {
      const result = await CurriculumService.deleteModule(moduleId);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: curriculumKeys.modules() });
    },
  });
}
