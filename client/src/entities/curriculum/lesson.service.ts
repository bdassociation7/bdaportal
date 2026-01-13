/**
 * Lesson Service
 * CRUD operations for curriculum lessons (42 sub-competencies)
 */

import { supabase } from '@/lib/supabase';
import type {
  Lesson,
  CreateLessonDTO,
  UpdateLessonDTO,
  LessonFilters,
  LessonSummary,
} from './lesson.types';

export class LessonService {
  /**
   * Get all lessons with optional filters
   */
  static async getLessons(filters?: LessonFilters): Promise<{ data: Lesson[] | null; error: any }> {
    try {
      let query = supabase
        .from('curriculum_lessons')
        .select(`
          *,
          module:module_id (
            id,
            competency_name,
            competency_name_ar,
            section_type,
            certification_type,
            exam_language
          ),
          quiz:lesson_quiz_id (
            id,
            title,
            title_ar
          )
        `)
        .order('order_index', { ascending: true });

      // Apply filters
      if (filters?.module_id) {
        query = query.eq('module_id', filters.module_id);
      }

      if (filters?.is_published !== undefined) {
        query = query.eq('is_published', filters.is_published);
      }

      if (filters?.order_index) {
        query = query.eq('order_index', filters.order_index);
      }

      if (filters?.has_quiz !== undefined) {
        if (filters.has_quiz) {
          query = query.not('lesson_quiz_id', 'is', null);
        } else {
          query = query.is('lesson_quiz_id', null);
        }
      }

      if (filters?.exam_language) {
        query = query.eq('exam_language', filters.exam_language);
      }

      // Filter by module's section_type (requires join)
      if (filters?.section_type) {
        // We'll filter client-side for now, or use a separate query
        // For efficiency, better to handle server-side with RPC
      }

      if (filters?.certification_type) {
        // Same - requires module join filtering
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching lessons:', error);
        return { data: null, error };
      }

      return { data: data as Lesson[], error: null };
    } catch (error) {
      console.error('Exception in getLessons:', error);
      return { data: null, error };
    }
  }

  /**
   * Get a single lesson by ID
   */
  static async getLessonById(id: string): Promise<{ data: Lesson | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('curriculum_lessons')
        .select(`
          *,
          module:module_id (
            id,
            competency_name,
            competency_name_ar,
            section_type,
            certification_type,
            order_index,
            exam_language
          ),
          quiz:lesson_quiz_id (
            id,
            title,
            title_ar,
            difficulty_level,
            time_limit_minutes,
            passing_score_percentage
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching lesson:', error);
        return { data: null, error };
      }

      return { data: data as Lesson, error: null };
    } catch (error) {
      console.error('Exception in getLessonById:', error);
      return { data: null, error };
    }
  }

  /**
   * Get lessons by module ID (3 lessons per module)
   */
  static async getLessonsByModule(
    moduleId: string
  ): Promise<{ data: Lesson[] | null; error: any }> {
    return this.getLessons({ module_id: moduleId });
  }

  /**
   * Create a new lesson
   */
  static async createLesson(
    lesson: CreateLessonDTO
  ): Promise<{ data: Lesson | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('curriculum_lessons')
        .insert({
          module_id: lesson.module_id,
          title: lesson.title,
          title_ar: lesson.title_ar,
          description: lesson.description,
          description_ar: lesson.description_ar,
          content: lesson.content,
          content_ar: lesson.content_ar,
          learning_objectives: lesson.learning_objectives,
          learning_objectives_ar: lesson.learning_objectives_ar,
          estimated_duration_hours: lesson.estimated_duration_hours || 1,
          order_index: lesson.order_index,
          lesson_quiz_id: lesson.lesson_quiz_id,
          quiz_required: lesson.quiz_required ?? true,
          quiz_passing_score: lesson.quiz_passing_score || 70,
          is_published: lesson.is_published ?? false,
          exam_language: lesson.exam_language || 'en',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating lesson:', error);
        return { data: null, error };
      }

      return { data: data as Lesson, error: null };
    } catch (error) {
      console.error('Exception in createLesson:', error);
      return { data: null, error };
    }
  }

  /**
   * Update a lesson
   */
  static async updateLesson(
    id: string,
    updates: UpdateLessonDTO
  ): Promise<{ data: Lesson | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('curriculum_lessons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating lesson:', error);
        return { data: null, error };
      }

      return { data: data as Lesson, error: null };
    } catch (error) {
      console.error('Exception in updateLesson:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a lesson
   */
  static async deleteLesson(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.from('curriculum_lessons').delete().eq('id', id);

      if (error) {
        console.error('Error deleting lesson:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Exception in deleteLesson:', error);
      return { error };
    }
  }

  /**
   * Toggle lesson published status
   */
  static async togglePublished(
    id: string,
    isPublished: boolean
  ): Promise<{ data: Lesson | null; error: any }> {
    return this.updateLesson(id, { is_published: isPublished });
  }

  /**
   * Get lesson summary statistics
   */
  static async getLessonSummary(): Promise<{ data: LessonSummary | null; error: any }> {
    try {
      const { data: allLessons, error } = await supabase
        .from('curriculum_lessons')
        .select('id, is_published, lesson_quiz_id');

      if (error) {
        console.error('Error fetching lesson summary:', error);
        return { data: null, error };
      }

      const summary: LessonSummary = {
        total_lessons: allLessons.length,
        published_lessons: allLessons.filter((l) => l.is_published).length,
        draft_lessons: allLessons.filter((l) => !l.is_published).length,
        lessons_with_quiz: allLessons.filter((l) => l.lesson_quiz_id).length,
        lessons_without_quiz: allLessons.filter((l) => !l.lesson_quiz_id).length,
      };

      return { data: summary, error: null };
    } catch (error) {
      console.error('Exception in getLessonSummary:', error);
      return { data: null, error };
    }
  }

  /**
   * Check if a lesson order_index is available in a module
   */
  static async isOrderIndexAvailable(
    moduleId: string,
    orderIndex: 1 | 2 | 3,
    excludeLessonId?: string
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('curriculum_lessons')
        .select('id')
        .eq('module_id', moduleId)
        .eq('order_index', orderIndex);

      if (excludeLessonId) {
        query = query.neq('id', excludeLessonId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking order index:', error);
        return false;
      }

      return data.length === 0;
    } catch (error) {
      console.error('Exception in isOrderIndexAvailable:', error);
      return false;
    }
  }
}
