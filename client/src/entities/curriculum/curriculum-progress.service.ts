import { supabase } from '@/shared/config/supabase.config';
import type {
  UserCurriculumProgress,
  UserCurriculumProgressUpdate,
  UpdateProgressDTO,
  QuizCompletionResult,
  ServiceResponse,
  ModuleStatus,
} from './curriculum.types';

/**
 * Curriculum Progress Service
 * Manages user progress through curriculum modules
 */
export class CurriculumProgressService {
  // ==========================================================================
  // PROGRESS TRACKING
  // ==========================================================================

  /**
   * Get user progress for a specific module
   */
  static async getModuleProgress(
    userId: string,
    moduleId: string
  ): Promise<ServiceResponse<UserCurriculumProgress | null>> {
    try {
      const { data, error } = await supabase
        .from('user_curriculum_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .maybeSingle();

      if (error) throw error;

      return { data: data || null };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch module progress',
          details: error,
        },
      };
    }
  }

  /**
   * Get all progress for a user
   */
  static async getUserProgress(
    userId: string
  ): Promise<ServiceResponse<UserCurriculumProgress[]>> {
    try {
      const { data, error } = await supabase
        .from('user_curriculum_progress')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch user progress',
          details: error,
        },
      };
    }
  }

  /**
   * Update module progress (reading, time spent)
   */
  static async updateProgress(
    userId: string,
    moduleId: string,
    updates: UpdateProgressDTO
  ): Promise<ServiceResponse<UserCurriculumProgress>> {
    try {
      // Build update object
      const updateData: UserCurriculumProgressUpdate = {
        ...updates,
        last_accessed_at: updates.last_accessed_at || new Date().toISOString(),
      };

      // Check if progress exists
      const { data: existingProgress } = await this.getModuleProgress(
        userId,
        moduleId
      );

      if (!existingProgress) {
        // Create new progress record
        const { data, error } = await supabase
          .from('user_curriculum_progress')
          .insert({
            user_id: userId,
            module_id: moduleId,
            status: updates.status || 'in_progress',
            progress_percentage: updates.progress_percentage || 0,
            time_spent_minutes: updates.time_spent_minutes || 0,
            last_accessed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return { data };
      }

      // Update existing progress
      const { data, error } = await supabase
        .from('user_curriculum_progress')
        .update(updateData)
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'UPDATE_ERROR',
          message: 'Failed to update progress',
          details: error,
        },
      };
    }
  }

  /**
   * Mark module as ready for quiz (100% read)
   */
  static async markReadyForQuiz(
    userId: string,
    moduleId: string
  ): Promise<ServiceResponse<UserCurriculumProgress>> {
    return this.updateProgress(userId, moduleId, {
      progress_percentage: 100,
      status: 'quiz_pending',
      last_accessed_at: new Date().toISOString(),
    });
  }

  /**
   * Increment time spent on module
   */
  static async incrementTimeSpent(
    userId: string,
    moduleId: string,
    minutesToAdd: number
  ): Promise<ServiceResponse<UserCurriculumProgress>> {
    try {
      // Get current progress
      const { data: currentProgress } = await this.getModuleProgress(
        userId,
        moduleId
      );

      if (!currentProgress) {
        return this.updateProgress(userId, moduleId, {
          time_spent_minutes: minutesToAdd,
        });
      }

      const newTimeSpent =
        (currentProgress.time_spent_minutes || 0) + minutesToAdd;

      return this.updateProgress(userId, moduleId, {
        time_spent_minutes: newTimeSpent,
      });
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'UPDATE_ERROR',
          message: 'Failed to increment time spent',
          details: error,
        },
      };
    }
  }

  // ==========================================================================
  // QUIZ COMPLETION
  // ==========================================================================

  /**
   * Handle quiz completion and unlock next module if passed
   */
  static async handleQuizCompletion(
    userId: string,
    moduleId: string,
    quizAttemptId: string,
    score: number
  ): Promise<ServiceResponse<QuizCompletionResult>> {
    try {
      // Get module to check passing score
      const { data: module, error: moduleError } = await supabase
        .from('curriculum_modules')
        .select('quiz_passing_score, order_index, certification_type, section_type')
        .eq('id', moduleId)
        .maybeSingle();

      if (moduleError) throw moduleError;
      if (!module) throw new Error('Module not found');

      const passed = score >= module.quiz_passing_score;

      // Get current progress
      const { data: currentProgress } = await this.getModuleProgress(
        userId,
        moduleId
      );

      // Update progress
      const { data: updatedProgress, error: updateError } = await supabase
        .from('user_curriculum_progress')
        .update({
          best_quiz_score: Math.max(score, currentProgress?.best_quiz_score || 0),
          quiz_attempts_count:
            (currentProgress?.quiz_attempts_count || 0) + 1,
          last_quiz_attempt_id: quizAttemptId,
          status: passed ? 'completed' : 'quiz_pending',
          completed_at: passed ? new Date().toISOString() : null,
        })
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .select()
        .single();

      if (updateError) throw updateError;

      // If passed, unlock next module (following Behavioral -> Knowledge order)
      let nextModuleId: string | undefined;
      if (passed) {
        // First try to get next module in same section
        const { data: nextInSection } = await supabase
          .from('curriculum_modules')
          .select('id')
          .eq('certification_type', module.certification_type)
          .eq('section_type', module.section_type)
          .eq('is_published', true)
          .gt('order_index', module.order_index)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextInSection) {
          nextModuleId = nextInSection.id;
        } else if (module.section_type === 'behavioural') {
          // At end of behavioral section, get first knowledge_based module
          const { data: firstKnowledge } = await supabase
            .from('curriculum_modules')
            .select('id')
            .eq('certification_type', module.certification_type)
            .eq('section_type', 'knowledge_based')
            .eq('is_published', true)
            .order('order_index', { ascending: true })
            .limit(1)
            .maybeSingle();

          nextModuleId = firstKnowledge?.id;
        }

        // Update next module status to 'in_progress' if exists
        if (nextModuleId) {
          await this.updateProgress(userId, nextModuleId, {
            status: 'in_progress',
          });
        }
      }

      return {
        data: {
          passed,
          score,
          nextModuleUnlocked: passed,
          nextModuleId,
        },
      };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'QUIZ_COMPLETION_ERROR',
          message: 'Failed to handle quiz completion',
          details: error,
        },
      };
    }
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get overall progress statistics for a user
   * @param examLanguage - Optional language filter ('en' or 'ar' lowercase)
   */
  static async getOverallProgress(
    userId: string,
    certificationType: string,
    examLanguage?: 'en' | 'ar'
  ): Promise<
    ServiceResponse<{
      total: number;
      completed: number;
      in_progress: number;
      locked: number;
      percentage: number;
      totalTimeSpent: number;
    }>
  > {
    try {
      // Get all modules for certification
      let modulesQuery = supabase
        .from('curriculum_modules')
        .select('id')
        .eq('certification_type', certificationType)
        .eq('is_published', true);

      // Filter by exam_language if provided
      if (examLanguage) {
        modulesQuery = modulesQuery.eq('exam_language', examLanguage);
      }

      const { data: modules, error: modulesError } = await modulesQuery;

      if (modulesError) throw modulesError;

      const moduleIds = modules?.map((m) => m.id) || [];
      const total = moduleIds.length;

      // If no modules found, return empty stats
      if (total === 0) {
        return {
          data: {
            total: 0,
            completed: 0,
            in_progress: 0,
            locked: 0,
            percentage: 0,
            totalTimeSpent: 0,
          },
        };
      }

      // Get progress
      const { data: progress, error: progressError } = await supabase
        .from('user_curriculum_progress')
        .select('status, time_spent_minutes')
        .eq('user_id', userId)
        .in('module_id', moduleIds);

      if (progressError) throw progressError;

      const completed =
        progress?.filter((p) => p.status === 'completed').length || 0;
      const inProgress =
        progress?.filter((p) => p.status === 'in_progress').length || 0;
      const locked = total - completed - inProgress;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      const totalTimeSpent =
        progress?.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0) || 0;

      return {
        data: {
          total,
          completed,
          in_progress: inProgress,
          locked,
          percentage,
          totalTimeSpent,
        },
      };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'STATS_ERROR',
          message: 'Failed to calculate overall progress',
          details: error,
        },
      };
    }
  }

  /**
   * Get module completion rate (for admin analytics)
   */
  static async getModuleCompletionRate(
    moduleId: string
  ): Promise<
    ServiceResponse<{
      totalUsers: number;
      completedUsers: number;
      completionRate: number;
      averageScore: number;
      averageAttempts: number;
    }>
  > {
    try {
      const { data: allProgress, error } = await supabase
        .from('user_curriculum_progress')
        .select('status, best_quiz_score, quiz_attempts_count')
        .eq('module_id', moduleId);

      if (error) throw error;

      const totalUsers = allProgress?.length || 0;
      const completedUsers =
        allProgress?.filter((p) => p.status === 'completed').length || 0;
      const completionRate =
        totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0;

      const scoresSum = allProgress
        ?.filter((p) => p.best_quiz_score !== null)
        .reduce((sum, p) => sum + (p.best_quiz_score || 0), 0);
      const averageScore =
        completedUsers > 0 ? (scoresSum || 0) / completedUsers : 0;

      const attemptsSum = allProgress?.reduce(
        (sum, p) => sum + (p.quiz_attempts_count || 0),
        0
      );
      const averageAttempts =
        totalUsers > 0 ? (attemptsSum || 0) / totalUsers : 0;

      return {
        data: {
          totalUsers,
          completedUsers,
          completionRate: Math.round(completionRate),
          averageScore: Math.round(averageScore),
          averageAttempts: Math.round(averageAttempts * 10) / 10,
        },
      };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'STATS_ERROR',
          message: 'Failed to calculate completion rate',
          details: error,
        },
      };
    }
  }

  // ==========================================================================
  // ADMIN OPERATIONS
  // ==========================================================================

  /**
   * Reset user progress for a module (Admin only)
   */
  static async resetModuleProgress(
    userId: string,
    moduleId: string
  ): Promise<ServiceResponse<void>> {
    try {
      const { error} = await supabase
        .from('user_curriculum_progress')
        .update({
          status: 'in_progress',
          progress_percentage: 0,
          time_spent_minutes: 0,
          best_quiz_score: null,
          quiz_attempts_count: 0,
          last_quiz_attempt_id: null,
          completed_at: null,
        })
        .eq('user_id', userId)
        .eq('module_id', moduleId);

      if (error) throw error;

      return { data: undefined };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'RESET_ERROR',
          message: 'Failed to reset module progress',
          details: error,
        },
      };
    }
  }

  /**
   * Reset all progress for a user (Admin only)
   */
  static async resetUserProgress(userId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('user_curriculum_progress')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      return { data: undefined };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'RESET_ERROR',
          message: 'Failed to reset user progress',
          details: error,
        },
      };
    }
  }
}
