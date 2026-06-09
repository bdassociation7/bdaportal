import { supabase } from '@/shared/config/supabase.config';
import type {
  Quiz,
  QuizWithStats,
  QuizWithQuestions,
  QuizQuestion,
  QuestionWithAnswers,
  QuizAnswer,
  QuizAttempt,
  CreateQuizDTO,
  UpdateQuizDTO,
  CreateQuestionDTO,
  UpdateQuestionDTO,
  CreateAnswerDTO,
  UpdateAnswerDTO,
  QuizFilters,
  QueryOptions,
  QuizError,
  QuizResult,
} from './quiz.types';

/**
 * Service for Quiz operations - Handles all quiz-related database interactions
 */
export class QuizService {
  // ==========================================================================
  // PUBLIC QUIZ OPERATIONS (User-facing)
  // ==========================================================================

  /**
   * Get all active quizzes with optional filters
   */
  static async getActiveQuizzes(
    filters?: QuizFilters,
    options?: QueryOptions
  ): Promise<QuizResult<QuizWithStats[]>> {
    try {
      let query = supabase
        .from('quizzes')
        .select('*')
        .eq('is_active', true);

      // Apply filters
      if (filters?.certification_type) {
        query = query.eq('certification_type', filters.certification_type);
      }

      // Exclude formal certification exams from learning system quiz lists
      if (filters?.exclude_certification) {
        query = query.is('certification_type', null);
      }

      if (filters?.difficulty_level) {
        query = query.eq('difficulty_level', filters.difficulty_level);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply sorting
      const sortBy = options?.sort_by || 'created_at';
      const sortOrder = options?.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      if (options?.page && options?.limit) {
        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to fetch quizzes',
            details: error,
          },
        };
      }

      // Enrich with stats
      const quizzesWithStats = await Promise.all(
        (data || []).map(async (quiz) => {
          const stats = await this.getQuizStats(quiz.id);
          return { ...quiz, ...stats };
        })
      );

      return { data: quizzesWithStats, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while fetching quizzes',
          details: err,
        },
      };
    }
  }

  /**
   * Get a single quiz by ID (admin - no active check)
   */
  static async getQuiz(id: string): Promise<QuizResult<QuizWithQuestions>> {
    try {
      // Fetch quiz WITHOUT is_active check for admin
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .single();

      if (quizError || !quiz) {
        return {
          data: null,
          error: {
            code: quizError?.code || 'NOT_FOUND',
            message: 'Quiz not found',
            details: quizError,
          },
        };
      }

      // Fetch questions with answers
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select(`
          *,
          answers:quiz_answers(*)
        `)
        .eq('quiz_id', id)
        .order('order_index', { ascending: true });

      if (questionsError) {
        return {
          data: null,
          error: {
            code: questionsError.code,
            message: 'Failed to fetch quiz questions',
            details: questionsError,
          },
        };
      }

      // Sort answers within each question
      const questionsWithAnswers: QuestionWithAnswers[] = (questions || []).map((q: any) => ({
        ...q,
        answers: (q.answers || []).sort((a: QuizAnswer, b: QuizAnswer) => a.order_index - b.order_index),
      }));

      const quizWithQuestions: QuizWithQuestions = {
        ...quiz,
        questions: questionsWithAnswers,
      };

      return { data: quizWithQuestions, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while fetching quiz',
          details: err,
        },
      };
    }
  }

  /**
   * Get a single quiz by ID with all questions and answers (public - only active)
   */
  static async getQuizById(id: string): Promise<QuizResult<QuizWithQuestions>> {
    try {
      // Fetch quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (quizError || !quiz) {
        return {
          data: null,
          error: {
            code: quizError?.code || 'NOT_FOUND',
            message: 'Quiz not found or inactive',
            details: quizError,
          },
        };
      }

      // Fetch questions with answers
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select(`
          *,
          answers:quiz_answers(*)
        `)
        .eq('quiz_id', id)
        .order('order_index', { ascending: true });

      if (questionsError) {
        return {
          data: null,
          error: {
            code: questionsError.code,
            message: 'Failed to fetch quiz questions',
            details: questionsError,
          },
        };
      }

      // Sort answers within each question
      const questionsWithAnswers: QuestionWithAnswers[] = (questions || []).map((q: any) => ({
        ...q,
        answers: (q.answers || []).sort((a: QuizAnswer, b: QuizAnswer) => a.order_index - b.order_index),
      }));

      const quizWithQuestions: QuizWithQuestions = {
        ...quiz,
        questions: questionsWithAnswers,
      };

      return { data: quizWithQuestions, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while fetching quiz',
          details: err,
        },
      };
    }
  }

  /**
   * Get quiz statistics (question count, etc.)
   */
  static async getQuizStats(quizId: string): Promise<{ question_count: number; total_points: number }> {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('points')
        .eq('quiz_id', quizId);

      if (error || !data) {
        return { question_count: 0, total_points: 0 };
      }

      return {
        question_count: data.length,
        total_points: data.reduce((sum, q) => sum + (q.points || 1), 0),
      };
    } catch (err) {
      console.error('Error fetching quiz stats:', err);
      return { question_count: 0, total_points: 0 };
    }
  }

  /**
   * Record quiz attempt (analytics only - no scoring)
   */
  static async startQuizAttempt(quizId: string): Promise<QuizResult<QuizAttempt>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated to start quiz',
          },
        };
      }

      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to start quiz attempt',
            details: error,
          },
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while starting quiz',
          details: err,
        },
      };
    }
  }

  /**
   * Complete quiz attempt
   */
  static async completeQuizAttempt(attemptId: string): Promise<QuizResult<QuizAttempt>> {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .update({
          completed_at: new Date().toISOString(),
        })
        .eq('id', attemptId)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to complete quiz attempt',
            details: error,
          },
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while completing quiz',
          details: err,
        },
      };
    }
  }

  /**
   * Submit quiz attempt with score and answers
   */
  static async submitQuizAttempt(params: {
    attempt_id: string;
    answers: Record<string, string[]>;
    score: number;
    passed: boolean;
    total_points_earned: number;
    total_points_possible: number;
  }): Promise<QuizResult<QuizAttempt>> {
    try {
      // Update the attempt with score (answers are stored separately or client-side only)
      const { data, error } = await supabase
        .from('quiz_attempts')
        .update({
          completed_at: new Date().toISOString(),
          score: params.score,
          passed: params.passed,
          total_points_earned: params.total_points_earned,
          total_points_possible: params.total_points_possible,
        })
        .eq('id', params.attempt_id)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to submit quiz attempt',
            details: error,
          },
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while submitting quiz',
          details: err,
        },
      };
    }
  }

  /**
   * Get user's quiz attempts
   */
  static async getUserAttempts(): Promise<QuizResult<QuizAttempt[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated',
          },
        };
      }

      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to fetch user attempts',
            details: error,
          },
        };
      }

      return { data: data || [], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while fetching attempts',
          details: err,
        },
      };
    }
  }

  // ==========================================================================
  // ADMIN OPERATIONS (Quiz Management)
  // ==========================================================================

  /**
   * Get all quizzes (admin only)
   */
  static async getAllQuizzes(
    filters?: QuizFilters,
    options?: QueryOptions
  ): Promise<QuizResult<QuizWithStats[]>> {
    try {
      let query = supabase.from('quizzes').select('*');

      // Apply filters (without is_active filter for admin)
      if (filters?.certification_type) {
        query = query.eq('certification_type', filters.certification_type);
      }

      // Exclude formal certification exams from learning system quiz lists
      if (filters?.exclude_certification) {
        query = query.is('certification_type', null);
      }

      if (filters?.difficulty_level) {
        query = query.eq('difficulty_level', filters.difficulty_level);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply sorting
      const sortBy = options?.sort_by || 'created_at';
      const sortOrder = options?.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      if (options?.page && options?.limit) {
        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to fetch quizzes',
            details: error,
          },
        };
      }

      // Enrich with stats
      const quizzesWithStats = await Promise.all(
        (data || []).map(async (quiz) => {
          const stats = await this.getQuizStats(quiz.id);
          return { ...quiz, ...stats };
        })
      );

      return { data: quizzesWithStats, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while fetching quizzes',
          details: err,
        },
      };
    }
  }

  /**
   * Create a new quiz (admin only)
   */
  static async createQuiz(dto: CreateQuizDTO): Promise<QuizResult<Quiz>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated',
          },
        };
      }

      const { data, error } = await supabase
        .from('quizzes')
        .insert({
          ...dto,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to create quiz',
            details: error,
          },
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while creating quiz',
          details: err,
        },
      };
    }
  }

  /**
   * Update an existing quiz (admin only)
   */
  static async updateQuiz(id: string, dto: UpdateQuizDTO): Promise<QuizResult<Quiz>> {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to update quiz',
            details: error,
          },
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while updating quiz',
          details: err,
        },
      };
    }
  }

  /**
   * Delete a quiz (admin only)
   */
  static async deleteQuiz(id: string): Promise<QuizResult<void>> {
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to delete quiz',
            details: error,
          },
        };
      }

      return { data: null, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while deleting quiz',
          details: err,
        },
      };
    }
  }

  /**
   * Toggle quiz active status (admin only)
   */
  static async toggleQuizActive(id: string, isActive: boolean): Promise<QuizResult<Quiz>> {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to toggle quiz status',
            details: error,
          },
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while toggling quiz status',
          details: err,
        },
      };
    }
  }

  // ==========================================================================
  // QUESTION OPERATIONS (Admin only)
  // ==========================================================================

  /**
   * Create a new question with answers (admin only)
   */
  static async createQuestion(dto: CreateQuestionDTO): Promise<QuizResult<QuestionWithAnswers>> {
    try {
      // Create question
      const { data: question, error: questionError } = await supabase
        .from('quiz_questions')
        .insert({
          quiz_id: dto.quiz_id,
          question_text: dto.question_text,
          question_text_ar: dto.question_text_ar,
          question_type: dto.question_type,
          bock_domain: dto.bock_domain,
          competency_section: dto.competency_section,
          competency_name: dto.competency_name,
          difficulty: dto.difficulty,
          points: dto.points || 1,
          order_index: dto.order_index,
        })
        .select()
        .single();

      if (questionError || !question) {
        return {
          data: null,
          error: {
            code: questionError?.code || 'CREATE_FAILED',
            message: 'Failed to create question',
            details: questionError,
          },
        };
      }

      // Create answers
      const answersToInsert = dto.answers.map((answer) => ({
        question_id: question.id,
        ...answer,
      }));

      const { data: answers, error: answersError } = await supabase
        .from('quiz_answers')
        .insert(answersToInsert)
        .select();

      if (answersError) {
        // Rollback: delete the question if answers creation failed
        await supabase.from('quiz_questions').delete().eq('id', question.id);

        return {
          data: null,
          error: {
            code: answersError.code,
            message: 'Failed to create answers',
            details: answersError,
          },
        };
      }

      return {
        data: {
          ...question,
          answers: answers || [],
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while creating question',
          details: err,
        },
      };
    }
  }

  /**
   * Update a question with answers (admin only)
   */
  static async updateQuestion(id: string, dto: CreateQuestionDTO): Promise<QuizResult<QuestionWithAnswers>> {
    try {
      // Update question metadata
      const { data: question, error: questionError } = await supabase
        .from('quiz_questions')
        .update({
          question_text: dto.question_text,
          question_text_ar: dto.question_text_ar,
          question_type: dto.question_type,
          bock_domain: dto.bock_domain,
          competency_section: dto.competency_section,
          competency_name: dto.competency_name,
          difficulty: dto.difficulty,
          points: dto.points,
          order_index: dto.order_index,
        })
        .eq('id', id)
        .select()
        .single();

      if (questionError || !question) {
        return {
          data: null,
          error: {
            code: questionError?.code || 'UPDATE_FAILED',
            message: 'Failed to update question',
            details: questionError,
          },
        };
      }

      // Delete all existing answers
      const { error: deleteError } = await supabase
        .from('quiz_answers')
        .delete()
        .eq('question_id', id);

      if (deleteError) {
        return {
          data: null,
          error: {
            code: deleteError.code,
            message: 'Failed to delete old answers',
            details: deleteError,
          },
        };
      }

      // Create new answers
      const answersToInsert = dto.answers.map((answer) => ({
        question_id: id,
        ...answer,
      }));

      const { data: answers, error: answersError } = await supabase
        .from('quiz_answers')
        .insert(answersToInsert)
        .select();

      if (answersError) {
        return {
          data: null,
          error: {
            code: answersError.code,
            message: 'Failed to create new answers',
            details: answersError,
          },
        };
      }

      return {
        data: {
          ...question,
          answers: answers || [],
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while updating question',
          details: err,
        },
      };
    }
  }

  /**
   * Delete a question (admin only)
   */
  static async deleteQuestion(id: string): Promise<QuizResult<void>> {
    try {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to delete question',
            details: error,
          },
        };
      }

      return { data: null, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while deleting question',
          details: err,
        },
      };
    }
  }

  /**
   * Get all questions for a quiz (admin only)
   */
  static async getQuizQuestions(quizId: string): Promise<QuizResult<QuestionWithAnswers[]>> {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select(`
          *,
          answers:quiz_answers(*)
        `)
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to fetch questions',
            details: error,
          },
        };
      }

      const questionsWithAnswers: QuestionWithAnswers[] = (data || []).map((q: any) => ({
        ...q,
        answers: (q.answers || []).sort((a: QuizAnswer, b: QuizAnswer) => a.order_index - b.order_index),
      }));

      return { data: questionsWithAnswers, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while fetching questions',
          details: err,
        },
      };
    }
  }

  // ==========================================================================
  // ANSWER OPERATIONS (Admin only)
  // ==========================================================================

  /**
   * Create a new answer (admin only)
   */
  static async createAnswer(questionId: string, dto: CreateAnswerDTO): Promise<QuizResult<QuizAnswer>> {
    try {
      const { data, error } = await supabase
        .from('quiz_answers')
        .insert({
          question_id: questionId,
          ...dto,
        })
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to create answer',
            details: error,
          },
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while creating answer',
          details: err,
        },
      };
    }
  }

  /**
   * Update an answer (admin only)
   */
  static async updateAnswer(id: string, dto: UpdateAnswerDTO): Promise<QuizResult<QuizAnswer>> {
    try {
      const { data, error } = await supabase
        .from('quiz_answers')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to update answer',
            details: error,
          },
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while updating answer',
          details: err,
        },
      };
    }
  }

  /**
   * Delete an answer (admin only)
   */
  static async deleteAnswer(id: string): Promise<QuizResult<void>> {
    try {
      const { error } = await supabase
        .from('quiz_answers')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to delete answer',
            details: error,
          },
        };
      }

      return { data: null, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while deleting answer',
          details: err,
        },
      };
    }
  }
}
