/**
 * Lesson Progress Service
 * User progress tracking through curriculum lessons (42 sub-competencies)
 */

import { supabase } from '@/lib/supabase';
import type {
  LessonProgress,
  LessonProgressRow,
  CreateLessonProgressDTO,
  UpdateLessonProgressDTO,
  LessonProgressSummary,
  LessonProgressFilters,
} from './lesson-progress.types';
import type { CertificationType } from '@/shared/database.types';

export class LessonProgressService {
  /**
   * Get progress records for a user with optional filters
   */
  static async getLessonProgress(
    userId: string,
    filters?: LessonProgressFilters
  ): Promise<{ data: LessonProgress[] | null; error: any }> {
    try {
      let query = supabase
        .from('user_lesson_progress')
        .select(`
          *,
          lesson:lesson_id (
            id,
            title,
            title_ar,
            order_index,
            quiz_required,
            quiz_passing_score,
            module:module_id (
              id,
              competency_name,
              competency_name_ar,
              section_type,
              certification_type
            )
          )
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      // Apply filters
      if (filters?.lesson_id) {
        query = query.eq('lesson_id', filters.lesson_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.module_id) {
        // Filter by lesson's module_id (requires client-side filtering or RPC)
        // For now, fetch all and filter
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching lesson progress:', error);
        return { data: null, error };
      }

      return { data: data as unknown as LessonProgress[], error: null };
    } catch (error) {
      console.error('Exception in getLessonProgress:', error);
      return { data: null, error };
    }
  }

  /**
   * Get progress for a specific lesson
   */
  static async getLessonProgressById(
    userId: string,
    lessonId: string
  ): Promise<{ data: LessonProgress | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_lesson_progress')
        .select(`
          *,
          lesson:lesson_id (
            id,
            title,
            title_ar,
            order_index,
            quiz_required,
            quiz_passing_score,
            module:module_id (
              id,
              competency_name,
              competency_name_ar,
              section_type,
              certification_type,
              order_index
            )
          )
        `)
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching lesson progress:', error);
        return { data: null, error };
      }

      return { data: data as unknown as LessonProgress | null, error: null };
    } catch (error) {
      console.error('Exception in getLessonProgressById:', error);
      return { data: null, error };
    }
  }

  /**
   * Create initial progress record for a lesson
   */
  static async createLessonProgress(
    progress: CreateLessonProgressDTO
  ): Promise<{ data: LessonProgressRow | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_lesson_progress')
        .insert({
          user_id: progress.user_id,
          lesson_id: progress.lesson_id,
          status: progress.status || 'locked',
          progress_percentage: progress.progress_percentage || 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating lesson progress:', error);
        return { data: null, error };
      }

      return { data: data as LessonProgressRow, error: null };
    } catch (error) {
      console.error('Exception in createLessonProgress:', error);
      return { data: null, error };
    }
  }

  /**
   * Update progress for a lesson (creates record if doesn't exist)
   * Uses two-step process to ensure database triggers fire properly
   */
  static async updateLessonProgress(
    userId: string,
    lessonId: string,
    updates: UpdateLessonProgressDTO
  ): Promise<{ data: LessonProgressRow | null; error: any }> {
    try {
      const updateData: any = { ...updates };

      // Auto-set completed_at when status changes to completed
      if (updates.status === 'completed' && !updates.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }

      // Check if record exists first
      const { data: existing } = await supabase
        .from('user_lesson_progress')
        .select('id, quiz_attempts_count, best_quiz_score, status')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      // Increment quiz attempts if quiz score is provided
      if (updates.best_quiz_score !== undefined && existing) {
        updateData.quiz_attempts_count = (existing.quiz_attempts_count || 0) + 1;

        // Only update best score if new score is higher
        if (existing.best_quiz_score !== null && updates.best_quiz_score <= existing.best_quiz_score) {
          delete updateData.best_quiz_score;
        }
      }

      let data, error;

      if (existing) {
        // Record exists - update it (this will fire the trigger)
        const result = await supabase
          .from('user_lesson_progress')
          .update(updateData)
          .eq('user_id', userId)
          .eq('lesson_id', lessonId)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Record doesn't exist - create it first with in_progress status
        // Then update to desired status to ensure trigger fires
        const createResult = await supabase
          .from('user_lesson_progress')
          .insert({
            user_id: userId,
            lesson_id: lessonId,
            status: 'in_progress',
            progress_percentage: 0,
          })
          .select()
          .single();

        if (createResult.error) {
          console.error('Error creating lesson progress:', createResult.error);
          return { data: null, error: createResult.error };
        }

        // If the desired status is different from in_progress, update it
        // This ensures the AFTER UPDATE trigger fires properly
        if (updateData.status && updateData.status !== 'in_progress') {
          const updateResult = await supabase
            .from('user_lesson_progress')
            .update(updateData)
            .eq('user_id', userId)
            .eq('lesson_id', lessonId)
            .select()
            .single();
          data = updateResult.data;
          error = updateResult.error;
        } else {
          // Just update the progress percentage if needed
          if (updateData.progress_percentage && updateData.progress_percentage > 0) {
            const updateResult = await supabase
              .from('user_lesson_progress')
              .update(updateData)
              .eq('user_id', userId)
              .eq('lesson_id', lessonId)
              .select()
              .single();
            data = updateResult.data;
            error = updateResult.error;
          } else {
            data = createResult.data;
            error = null;
          }
        }
      }

      if (error) {
        console.error('Error updating lesson progress:', error);
        return { data: null, error };
      }

      return { data: data as LessonProgressRow, error: null };
    } catch (error) {
      console.error('Exception in updateLessonProgress:', error);
      return { data: null, error };
    }
  }

  /**
   * Get progress summary for a user using database function
   */
  static async getProgressSummary(
    userId: string
  ): Promise<{ data: LessonProgressSummary | null; error: any }> {
    try {
      const { data, error } = await supabase.rpc('get_lesson_progress_summary', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error fetching progress summary:', error);
        return { data: null, error };
      }

      return { data: (Array.isArray(data) ? data[0] : data) as unknown as LessonProgressSummary, error: null };
    } catch (error) {
      console.error('Exception in getProgressSummary:', error);
      return { data: null, error };
    }
  }

  /**
   * Initialize lesson progress for a user (all lessons for certification type)
   */
  static async initializeProgress(
    userId: string,
    certificationType: CertificationType
  ): Promise<{ data: boolean; error: any }> {
    try {
      const { data, error } = await supabase.rpc('initialize_lesson_progress', {
        p_user_id: userId,
        p_certification_type: certificationType,
      });

      if (error) {
        console.error('Error initializing progress:', error);
        return { data: false, error };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Exception in initializeProgress:', error);
      return { data: false, error };
    }
  }

  /**
   * Check if a lesson is unlocked for a user using database function
   */
  static async isLessonUnlocked(
    userId: string,
    lessonId: string
  ): Promise<{ data: boolean; error: any }> {
    try {
      const { data, error } = await supabase.rpc('is_lesson_unlocked', {
        p_user_id: userId,
        p_lesson_id: lessonId,
      });

      if (error) {
        console.error('Error checking lesson unlock status:', error);
        return { data: false, error };
      }

      return { data: data as boolean, error: null };
    } catch (error) {
      console.error('Exception in isLessonUnlocked:', error);
      return { data: false, error };
    }
  }

  /**
   * Mark lesson as started (change status from locked to in_progress)
   */
  static async startLesson(
    userId: string,
    lessonId: string
  ): Promise<{ data: LessonProgressRow | null; error: any }> {
    // First check if lesson is unlocked
    const { data: isUnlocked, error: unlockError } = await this.isLessonUnlocked(
      userId,
      lessonId
    );

    if (unlockError || !isUnlocked) {
      return {
        data: null,
        error: unlockError || new Error('Lesson is locked'),
      };
    }

    return this.updateLessonProgress(userId, lessonId, {
      status: 'in_progress',
      progress_percentage: 0,
    });
  }

  /**
   * Mark lesson content as completed (ready for quiz)
   */
  static async completeContent(
    userId: string,
    lessonId: string
  ): Promise<{ data: LessonProgressRow | null; error: any }> {
    return this.updateLessonProgress(userId, lessonId, {
      status: 'quiz_pending',
      progress_percentage: 100,
    });
  }

  /**
   * Record quiz completion and check if lesson is fully completed
   */
  static async completeQuiz(
    userId: string,
    lessonId: string,
    quizScore: number
  ): Promise<{ data: LessonProgressRow | null; error: any }> {
    // Get lesson to check passing score
    const { data: progress } = await this.getLessonProgressById(userId, lessonId);

    if (!progress || !progress.lesson) {
      return { data: null, error: new Error('Lesson not found') };
    }

    const passingScore = progress.lesson.quiz_passing_score || 70;
    const passed = quizScore >= passingScore;

    return this.updateLessonProgress(userId, lessonId, {
      status: passed ? 'completed' : 'quiz_pending',
      best_quiz_score: quizScore,
      completed_at: passed ? new Date().toISOString() : null,
    });
  }

  /**
   * Get all locked lessons for a user
   */
  static async getLockedLessons(
    userId: string
  ): Promise<{ data: LessonProgress[] | null; error: any }> {
    return this.getLessonProgress(userId, { status: 'locked' });
  }

  /**
   * Get all in-progress lessons for a user
   */
  static async getInProgressLessons(
    userId: string
  ): Promise<{ data: LessonProgress[] | null; error: any }> {
    return this.getLessonProgress(userId, { status: 'in_progress' });
  }

  /**
   * Get all completed lessons for a user
   */
  static async getCompletedLessons(
    userId: string
  ): Promise<{ data: LessonProgress[] | null; error: any }> {
    return this.getLessonProgress(userId, { status: 'completed' });
  }

  /**
   * Reset progress for a lesson (admin function)
   */
  static async resetProgress(
    userId: string,
    lessonId: string
  ): Promise<{ data: LessonProgressRow | null; error: any }> {
    return this.updateLessonProgress(userId, lessonId, {
      status: 'locked',
      progress_percentage: 0,
      best_quiz_score: null,
      completed_at: null,
    });
  }
}
