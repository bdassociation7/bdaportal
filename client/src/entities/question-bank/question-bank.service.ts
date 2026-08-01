/**
 * Question Bank Service
 * Handles all question bank operations
 */

import { supabase } from '@/shared/config/supabase.config';
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
  UserQuestionAttempt,
  QuestionSetFilters,
  QuestionFilters,
  QuestionBankStats,
  PracticeSessionResult,
} from './question-bank.types';

interface ServiceResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Question Bank Service
 */
export class QuestionBankService {
  // ==========================================================================
  // QUESTION SET OPERATIONS
  // ==========================================================================

  /**
   * Get all question sets with optional filters
   */
  static async getQuestionSets(
    filters?: QuestionSetFilters
  ): Promise<ServiceResponse<QuestionSet[]>> {
    try {
      let query = supabase
        .from('curriculum_question_sets')
        .select('*')
        .order('order_index', { ascending: true });

      if (filters?.certification_type) {
        query = query.eq('certification_type', filters.certification_type);
      }

      if (filters?.section_type) {
        query = query.eq('section_type', filters.section_type);
      }

      if (filters?.competency_id) {
        query = query.eq('competency_id', filters.competency_id);
      }

      if (filters?.is_published !== undefined) {
        query = query.eq('is_published', filters.is_published);
      }

      if (filters?.is_final_test !== undefined) {
        query = query.eq('is_final_test', filters.is_final_test);
      }

      if (filters?.exam_language) {
        query = query.eq('exam_language', filters.exam_language);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch question sets',
          details: error,
        },
      };
    }
  }

  /**
   * Get question sets with user progress
   */
  static async getQuestionSetsWithProgress(
    userId: string,
    certificationType: string,
    examLanguage?: 'EN' | 'AR'
  ): Promise<ServiceResponse<QuestionSetWithProgress[]>> {
    try {
      // Get all published question sets WITH competency and sub-lesson info for hierarchy
      let query = supabase
        .from('curriculum_question_sets')
        .select(`
          *,
          competency:curriculum_modules!competency_id(
            id,
            competency_name,
            competency_name_ar,
            section_type
          ),
          sub_unit:curriculum_lessons!sub_unit_id(
            id,
            title,
            title_ar,
            order_index
          )
        `)
        .eq('is_published', true);

      // Filter by exam language if provided (convert to lowercase for DB)
      if (examLanguage) {
        query = query.eq('exam_language', examLanguage.toLowerCase());
      }

      const { data: sets, error: setsError } = await query.order('order_index', { ascending: true });

      if (setsError) throw setsError;

      // Fetch question certification_target counts for all sets in one query
      // to compute the correct question_count per certification type
      const { data: questionTargets, error: qtError } = await supabase
        .from('curriculum_practice_questions')
        .select('question_set_id, certification_target')
        .eq('is_published', true);

      if (qtError) throw qtError;

      // Build a map: setId -> { CP: count, SCP: count, both: count }
      const certCountMap = new Map<string, { CP: number; SCP: number; both: number }>();
      (questionTargets || []).forEach((q) => {
        const entry = certCountMap.get(q.question_set_id) || { CP: 0, SCP: 0, both: 0 };
        if (q.certification_target === 'CP') entry.CP += 1;
        else if (q.certification_target === 'SCP') entry.SCP += 1;
        else entry.both += 1; // NULL = both
        certCountMap.set(q.question_set_id, entry);
      });

      // Get user progress for all sets
      const { data: progress, error: progressError } = await supabase
        .from('user_question_bank_progress')
        .select('*')
        .eq('user_id', userId);

      if (progressError) throw progressError;

      // Create progress map
      const progressMap = new Map(
        progress?.map((p) => [p.question_set_id, p]) || []
      );

      // Combine sets with progress and computed question_count per cert type
      const certType = certificationType as 'CP' | 'SCP';
      const setsWithProgress: QuestionSetWithProgress[] = (sets || []).map(
        (set) => {
          const counts = certCountMap.get(set.id);
          // Compute the number of questions visible for this cert type:
          // questions targeting this cert + questions targeting both (null)
          const certQuestionCount = counts
            ? (certType === 'CP' ? counts.CP + counts.both : counts.SCP + counts.both)
            : set.question_count;
          return {
            ...set,
            question_count: certQuestionCount,
            progress: progressMap.get(set.id) || null,
          };
        }
      );

      return { data: setsWithProgress };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch question sets with progress',
          details: error,
        },
      };
    }
  }

  /**
   * Get question sets with competency info (for admin)
   */
  static async getQuestionSetsWithCompetency(
    filters?: QuestionSetFilters
  ): Promise<ServiceResponse<QuestionSetWithCompetency[]>> {
    try {
      let query = supabase
        .from('curriculum_question_sets')
        .select(
          `
          *,
                    competency:curriculum_modules!competency_id(
            id,
            competency_name,
            competency_name_ar,
            section_type,
            order_index
          ),
          sub_unit:curriculum_lessons!sub_unit_id(
            id,
            title,
            title_ar,
            order_index
          )
        `
        )
        .order('order_index', { ascending: true });
      if (filters?.certification_type) {
        query = query.eq('certification_type', filters.certification_type);
      }
      if (filters?.section_type) {
        query = query.eq('section_type', filters.section_type);
      }
      if (filters?.is_published !== undefined) {
        query = query.eq('is_published', filters.is_published);
      }
      if (filters?.exam_language) {
        query = query.eq('exam_language', filters.exam_language);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch question sets with competency',
          details: error,
        },
      };
    }
  }

  /**
   * Get single question set by ID
   */
  static async getQuestionSetById(
    setId: string
  ): Promise<ServiceResponse<QuestionSet>> {
    try {
      const { data, error } = await supabase
        .from('curriculum_question_sets')
        .select('*')
        .eq('id', setId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return {
          error: {
            code: 'NOT_FOUND',
            message: 'Question set not found',
          },
        };
      }

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch question set',
          details: error,
        },
      };
    }
  }

  /**
   * Create question set (Admin)
   */
  static async createQuestionSet(
    questionSet: QuestionSetInsert
  ): Promise<ServiceResponse<QuestionSet>> {
    try {
      const { data, error } = await supabase
        .from('curriculum_question_sets')
        .insert(questionSet)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'CREATE_ERROR',
          message: 'Failed to create question set',
          details: error,
        },
      };
    }
  }

  /**
   * Update question set (Admin)
   */
  static async updateQuestionSet(
    setId: string,
    updates: QuestionSetUpdate
  ): Promise<ServiceResponse<QuestionSet>> {
    try {
      const { data, error } = await supabase
        .from('curriculum_question_sets')
        .update(updates)
        .eq('id', setId)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'UPDATE_ERROR',
          message: 'Failed to update question set',
          details: error,
        },
      };
    }
  }

  /**
   * Delete question set (Admin)
   */
  static async deleteQuestionSet(
    setId: string
  ): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('curriculum_question_sets')
        .delete()
        .eq('id', setId);

      if (error) throw error;

      return { data: undefined };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'DELETE_ERROR',
          message: 'Failed to delete question set',
          details: error,
        },
      };
    }
  }

  // ==========================================================================
  // QUESTION OPERATIONS
  // ==========================================================================

  /**
   * Get questions for a question set
   */
  static async getQuestions(
    questionSetId: string,
    filters?: QuestionFilters
  ): Promise<ServiceResponse<PracticeQuestion[]>> {
    try {
      let query = supabase
        .from('curriculum_practice_questions')
        .select('*')
        .eq('question_set_id', questionSetId)
        .order('order_index', { ascending: true });

      if (filters?.difficulty_level) {
        query = query.eq('difficulty_level', filters.difficulty_level);
      }

      if (filters?.is_published !== undefined) {
        query = query.eq('is_published', filters.is_published);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch questions',
          details: error,
        },
      };
    }
  }

  /**
   * Get questions with user's last attempt
   * @param certificationTarget - 'CP' | 'SCP' | undefined — filters questions by target cert.
   *   A question is included if its certification_target matches OR is NULL (applies to both).
   */
  static async getQuestionsWithAttempts(
    userId: string,
    questionSetId: string,
    certificationTarget?: 'CP' | 'SCP'
  ): Promise<ServiceResponse<PracticeQuestionWithAttempt[]>> {
    try {
      // Get all published questions
      const { data: questions, error: questionsError } = await supabase
        .from('curriculum_practice_questions')
        .select('*')
        .eq('question_set_id', questionSetId)
        .eq('is_published', true)
        .order('order_index', { ascending: true });

      if (questionsError) throw questionsError;

      // Filter by certification_target: include questions that match the cert OR are NULL (both)
      const filteredQuestions = certificationTarget
        ? (questions || []).filter(
            (q) => q.certification_target === null || q.certification_target === certificationTarget
          )
        : (questions || []);

      // Get user's latest attempts for each question
      const { data: attempts, error: attemptsError } = await supabase
        .from('user_question_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('question_set_id', questionSetId)
        .order('attempted_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Create map of latest attempt per question
      const attemptMap = new Map<string, UserQuestionAttempt>();
      attempts?.forEach((attempt) => {
        if (!attemptMap.has(attempt.question_id)) {
          attemptMap.set(attempt.question_id, attempt);
        }
      });

      // Combine questions with attempts
      const questionsWithAttempts: PracticeQuestionWithAttempt[] = (
        filteredQuestions
      ).map((q) => ({
        ...q,
        last_attempt: attemptMap.get(q.id) || null,
      }));

      return { data: questionsWithAttempts };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch questions with attempts',
          details: error,
        },
      };
    }
  }

  /**
   * Get single question by ID
   */
  static async getQuestionById(
    questionId: string
  ): Promise<ServiceResponse<PracticeQuestion>> {
    try {
      const { data, error } = await supabase
        .from('curriculum_practice_questions')
        .select('*')
        .eq('id', questionId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return {
          error: {
            code: 'NOT_FOUND',
            message: 'Question not found',
          },
        };
      }

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch question',
          details: error,
        },
      };
    }
  }

  /**
   * Create question (Admin)
   */
  static async createQuestion(
    question: PracticeQuestionInsert
  ): Promise<ServiceResponse<PracticeQuestion>> {
    try {
      // Note: Don't JSON.stringify options - Supabase handles JSONB serialization automatically
      const { data, error } = await supabase
        .from('curriculum_practice_questions')
        .insert(question)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'CREATE_ERROR',
          message: 'Failed to create question',
          details: error,
        },
      };
    }
  }

  /**
   * Update question (Admin)
   */
  static async updateQuestion(
    questionId: string,
    updates: PracticeQuestionUpdate
  ): Promise<ServiceResponse<PracticeQuestion>> {
    try {
      // Note: Don't JSON.stringify options - Supabase handles JSONB serialization automatically
      const { data, error } = await supabase
        .from('curriculum_practice_questions')
        .update(updates)
        .eq('id', questionId)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'UPDATE_ERROR',
          message: 'Failed to update question',
          details: error,
        },
      };
    }
  }

  /**
   * Delete question (Admin)
   */
  static async deleteQuestion(
    questionId: string
  ): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('curriculum_practice_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      return { data: undefined };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'DELETE_ERROR',
          message: 'Failed to delete question',
          details: error,
        },
      };
    }
  }

  /**
   * Bulk create questions (Admin - for import)
   */
  static async bulkCreateQuestions(
    questions: PracticeQuestionInsert[]
  ): Promise<ServiceResponse<PracticeQuestion[]>> {
    try {
      // Note: Don't JSON.stringify options - Supabase handles JSONB serialization automatically
      const { data, error } = await supabase
        .from('curriculum_practice_questions')
        .insert(questions)
        .select();

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'CREATE_ERROR',
          message: 'Failed to bulk create questions',
          details: error,
        },
      };
    }
  }

  // ==========================================================================
  // USER PROGRESS OPERATIONS
  // ==========================================================================

  /**
   * Record a question attempt
   */
  static async recordAttempt(
    userId: string,
    questionId: string,
    questionSetId: string,
    selectedOptionId: string,
    isCorrect: boolean,
    timeSpentSeconds?: number
  ): Promise<ServiceResponse<UserQuestionAttempt>> {
    try {
      const { data, error } = await supabase
        .from('user_question_attempts')
        .insert({
          user_id: userId,
          question_id: questionId,
          question_set_id: questionSetId,
          selected_option_id: selectedOptionId,
          is_correct: isCorrect,
          time_spent_seconds: timeSpentSeconds,
        })
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'CREATE_ERROR',
          message: 'Failed to record attempt',
          details: error,
        },
      };
    }
  }

  /**
   * Toggle favourite status for a question
   */
  static async toggleFavourite(
    userId: string,
    questionId: string,
    isFavourited: boolean
  ): Promise<ServiceResponse<void>> {
    try {
      // Update the most recent attempt for this question
      const { error } = await supabase
        .from('user_question_attempts')
        .update({ is_favorited: isFavourited })
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .order('attempted_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      return { data: undefined };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'UPDATE_ERROR',
          message: 'Failed to toggle favorite',
          details: error,
        },
      };
    }
  }

  /**
   * Get user's favorited questions
   */
  static async getFavoritedQuestions(
    userId: string,
    certificationType?: string
  ): Promise<ServiceResponse<PracticeQuestion[]>> {
    try {
      // Get favorited question IDs
      const { data: attempts, error: attemptsError } = await supabase
        .from('user_question_attempts')
        .select('question_id')
        .eq('user_id', userId)
        .eq('is_favorited', true);

      if (attemptsError) throw attemptsError;

      if (!attempts || attempts.length === 0) {
        return { data: [] };
      }

      const questionIds = [...new Set(attempts.map((a) => a.question_id))];

      // Get the questions
      let query = supabase
        .from('curriculum_practice_questions')
        .select('*')
        .in('id', questionIds);

      const { data: questions, error: questionsError } = await query;

      if (questionsError) throw questionsError;

      return { data: questions || [] };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch favourited questions',
          details: error,
        },
      };
    }
  }

  /**
   * Get user progress for a question set
   */
  static async getSetProgress(
    userId: string,
    questionSetId: string
  ): Promise<ServiceResponse<UserQuestionBankProgress | null>> {
    try {
      const { data, error } = await supabase
        .from('user_question_bank_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('question_set_id', questionSetId)
        .maybeSingle();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch set progress',
          details: error,
        },
      };
    }
  }

  /**
   * Complete a practice session
   */
  static async completePracticeSession(
    userId: string,
    questionSetId: string,
    result: PracticeSessionResult
  ): Promise<ServiceResponse<UserQuestionBankProgress>> {
    try {
      // Upsert progress
      const { data, error } = await supabase
        .from('user_question_bank_progress')
        .upsert(
          {
            user_id: userId,
            question_set_id: questionSetId,
            last_score_percentage: result.scorePercentage,
            best_score_percentage: result.scorePercentage, // Will be handled by trigger
            attempts_count: 1, // Will be incremented
            last_attempted_at: new Date().toISOString(),
            completed_at: result.passed ? new Date().toISOString() : null,
          },
          {
            onConflict: 'user_id,question_set_id',
          }
        )
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'UPDATE_ERROR',
          message: 'Failed to complete practice session',
          details: error,
        },
      };
    }
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get user's question bank statistics
   */
  static async getUserStats(
    userId: string,
    certificationType?: string,
    examLanguage?: 'en' | 'ar'
  ): Promise<ServiceResponse<QuestionBankStats>> {
    try {
      // Get all question sets
      let setsQuery = supabase
        .from('curriculum_question_sets')
        .select('id, question_count')
        .eq('is_published', true);

      if (certificationType) {
        setsQuery = setsQuery.eq('certification_type', certificationType);
      }

      if (examLanguage) {
        setsQuery = setsQuery.eq('exam_language', examLanguage);
      }

      const { data: sets, error: setsError } = await setsQuery;
      if (setsError) throw setsError;

      const setIds = sets?.map((s) => s.id) || [];
      const totalQuestions = sets?.reduce((sum, s) => sum + s.question_count, 0) || 0;

      // Get user progress
      const { data: progress, error: progressError } = await supabase
        .from('user_question_bank_progress')
        .select('*')
        .eq('user_id', userId)
        .in('question_set_id', setIds);

      if (progressError) throw progressError;

      // Get favourited count
      const { count: favouritedCount, error: favError } = await supabase
        .from('user_question_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_favorited', true);

      if (favError) throw favError;

      // Calculate stats
      const questionsAttempted = progress?.reduce(
        (sum, p) => sum + p.questions_attempted,
        0
      ) || 0;
      const questionsCorrect = progress?.reduce(
        (sum, p) => sum + p.questions_correct,
        0
      ) || 0;
      const setsCompleted = progress?.filter((p) => p.completed_at !== null).length || 0;
      const averageScore =
        progress && progress.length > 0
          ? progress.reduce((sum, p) => sum + (p.best_score_percentage || 0), 0) /
            progress.length
          : 0;

      return {
        data: {
          totalQuestionSets: sets?.length || 0,
          totalQuestions,
          questionsAttempted,
          questionsCorrect,
          averageScore,
          favouritedQuestions: favouritedCount || 0,
          setsCompleted,
        },
      };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch user stats',
          details: error,
        },
      };
    }
  }

  // ==========================================================================
  // ADMIN STATISTICS
  // ==========================================================================

  /**
   * Get admin statistics for question bank
   */
  static async getAdminStats(
    certificationType?: string
  ): Promise<ServiceResponse<{
    totalSets: number;
    totalQuestions: number;
    publishedSets: number;
    unpublishedSets: number;
    questionsByDifficulty: { easy: number; medium: number; hard: number };
  }>> {
    try {
      // Get sets count
      let setsQuery = supabase
        .from('curriculum_question_sets')
        .select('id, is_published', { count: 'exact' });

      if (certificationType) {
        setsQuery = setsQuery.eq('certification_type', certificationType);
      }

      const { data: sets, error: setsError } = await setsQuery;
      if (setsError) throw setsError;

      // Get total questions count using COUNT (avoids 1000-row Supabase default limit)
      const { count: totalCount, error: totalCountError } = await supabase
        .from('curriculum_practice_questions')
        .select('*', { count: 'exact', head: true });
      if (totalCountError) throw totalCountError;

      // Get questions by difficulty using separate COUNT queries
      const { count: easyCount, error: easyErr } = await supabase
        .from('curriculum_practice_questions')
        .select('*', { count: 'exact', head: true })
        .eq('difficulty_level', 'easy');
      const { count: mediumCount, error: mediumErr } = await supabase
        .from('curriculum_practice_questions')
        .select('*', { count: 'exact', head: true })
        .eq('difficulty_level', 'medium');
      const { count: hardCount, error: hardErr } = await supabase
        .from('curriculum_practice_questions')
        .select('*', { count: 'exact', head: true })
        .eq('difficulty_level', 'hard');
      if (easyErr || mediumErr || hardErr) throw easyErr || mediumErr || hardErr;

      const difficultyCount = {
        easy: easyCount || 0,
        medium: mediumCount || 0,
        hard: hardCount || 0,
      };

      return {
        data: {
          totalSets: sets?.length || 0,
          totalQuestions: totalCount || 0,
          publishedSets: sets?.filter((s) => s.is_published).length || 0,
          unpublishedSets: sets?.filter((s) => !s.is_published).length || 0,
          questionsByDifficulty: difficultyCount,
        },
      };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch admin stats',
          details: error,
        },
      };
    }
  }
}
