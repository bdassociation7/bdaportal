/**
 * Mock Exam Service
 * Service layer for mock exams API operations
 */

import { supabase } from '@/lib/supabase';
import type {
  MockExam,
  MockExamWithStats,
  ExamWithQuestions,
  MockExamAttempt,
  AttemptWithDetails,
  ExamSession,
  ExamResults,
  StartExamDTO,
  SubmitAnswerDTO,
  ExamFilters,
  AttemptFilters,
  QuestionWithAnswers,
  MockExamAttemptAnswer,
  MockExamPremiumAccess,
  MockExamProduct,
  MockExamAccessGrant,
  CreateMockExamProductDTO,
  UpdateMockExamProductDTO,
  UserMockExamCredits,
} from './mock-exam.types';

export class MockExamService {
  // =============================================================================
  // PREMIUM ACCESS MANAGEMENT
  // =============================================================================

  /**
   * Check if user has premium access to a specific exam (with remaining attempts)
   */
  static async checkPremiumAccess(
    examId: string,
    userId?: string
  ): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        return false;
      }

      const { data, error } = await supabase
        .from('mock_exam_premium_access')
        .select('id, expires_at, attempts_allowed, attempts_used')
        .eq('mock_exam_id', examId)
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error || !data) {
        return false;
      }

      // Check if access is expired
      if (data.expires_at) {
        const expiryDate = new Date(data.expires_at);
        if (expiryDate < new Date()) {
          return false;
        }
      }

      // Check if user has remaining attempts
      if (data.attempts_used >= data.attempts_allowed) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking premium access:', error);
      return false;
    }
  }

  /**
   * Get detailed access status for an exam (for UI display)
   */
  static async getExamAccessStatus(
    examId: string,
    userId?: string
  ): Promise<{
    data: {
      exam_exists: boolean;
      is_premium: boolean;
      has_access: boolean;
      can_take_exam: boolean;
      attempts_allowed?: number;
      attempts_used?: number;
      attempts_remaining?: number;
      completed_attempts?: number;
      is_expired?: boolean;
      expires_at?: string;
    } | null;
    error: any;
  }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .rpc('get_mock_exam_access_status', {
          p_user_id: targetUserId,
          p_mock_exam_id: examId
        });

      if (error) {
        console.error('Error getting exam access status:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getExamAccessStatus:', error);
      return { data: null, error };
    }
  }

  /**
   * Get all premium access records for a user
   */
  static async getUserPremiumAccess(
    userId?: string
  ): Promise<{ data: MockExamPremiumAccess[] | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from('mock_exam_premium_access')
        .select('*')
        .eq('user_id', targetUserId);

      if (error) {
        console.error('Error fetching premium access:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getUserPremiumAccess:', error);
      return { data: null, error };
    }
  }

  /**
   * Grant premium access to a user (admin only)
   */
  static async grantPremiumAccess(
    userId: string,
    examId: string,
    expiresAt?: string
  ): Promise<{ data: MockExamPremiumAccess | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('mock_exam_premium_access')
        .upsert({
          user_id: userId,
          mock_exam_id: examId,
          granted_by: user?.id,
          expires_at: expiresAt || null,
        }, {
          onConflict: 'user_id,mock_exam_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error granting premium access:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in grantPremiumAccess:', error);
      return { data: null, error };
    }
  }

  /**
   * Revoke premium access (admin only)
   */
  static async revokePremiumAccess(
    userId: string,
    examId: string
  ): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('mock_exam_premium_access')
        .delete()
        .eq('user_id', userId)
        .eq('mock_exam_id', examId);

      if (error) {
        console.error('Error revoking premium access:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in revokePremiumAccess:', error);
      return { error };
    }
  }

  /**
   * Get all users with premium access to a specific exam (admin only)
   */
  static async getExamPremiumAccess(
    examId: string
  ): Promise<{ data: (MockExamPremiumAccess & { user: { id: string; email: string; first_name: string; last_name: string } })[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('mock_exam_premium_access')
        .select(`
          *,
          user:users!mock_exam_premium_access_user_id_fkey(id, email, first_name, last_name)
        `)
        .eq('mock_exam_id', examId)
        .order('granted_at', { ascending: false });

      if (error) {
        console.error('Error fetching exam premium access:', error);
        return { data: null, error };
      }

      return { data: data as any, error: null };
    } catch (error) {
      console.error('Error in getExamPremiumAccess:', error);
      return { data: null, error };
    }
  }

  // =============================================================================
  // EXAM LISTING & DETAILS
  // =============================================================================

  /**
   * Get all active exams with optional filters and user stats
   * Note: RLS already filters premium exams based on user access
   */
  static async getActiveExams(
    filters?: ExamFilters
  ): Promise<{ data: MockExamWithStats[] | null; error: any }> {
    try {
      let query = supabase
        .from('mock_exams')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters?.is_premium !== undefined) {
        query = query.eq('is_premium', filters.is_premium);
      }

      if (filters?.language) {
        query = query.eq('language', filters.language);
      }

      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching exams:', error);
        return { data: null, error };
      }

      // Get user's premium access with remaining attempts
      const { data: premiumAccess } = await this.getUserPremiumAccess();
      // Only include access records that have remaining attempts and aren't expired
      const premiumExamIds = new Set(
        (premiumAccess || [])
          .filter(a => {
            // Check if has remaining attempts
            const hasAttempts = (a.attempts_used ?? 0) < (a.attempts_allowed ?? 1);
            // Check if not expired
            const notExpired = !a.expires_at || new Date(a.expires_at) > new Date();
            return hasAttempts && notExpired;
          })
          .map((a) => a.mock_exam_id)
      );

      // Enrich with user stats and premium access
      const examsWithStats = await Promise.all(
        (data || []).map(async (exam) => {
          const stats = await this.getExamStatsForUser(exam.id);
          return {
            ...exam,
            ...stats,
            has_premium_access: !exam.is_premium || premiumExamIds.has(exam.id),
          };
        })
      );

      return { data: examsWithStats, error: null };
    } catch (error) {
      console.error('Error in getActiveExams:', error);
      return { data: null, error };
    }
  }

  /**
   * Get all exams (including premium ones user may not have access to)
   * Used for displaying catalog with purchase options
   */
  static async getAllExamsForCatalog(
    filters?: ExamFilters
  ): Promise<{ data: MockExamWithStats[] | null; error: any }> {
    try {
      // Use a service call that bypasses RLS to get all active exams
      // For now, we query all active exams - RLS will filter what user can see
      let query = supabase
        .from('mock_exams')
        .select('*')
        .eq('is_active', true)
        .order('is_premium', { ascending: true }) // Free first
        .order('category', { ascending: true })
        .order('language', { ascending: true });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching exams catalog:', error);
        return { data: null, error };
      }

      // Get user's premium access with remaining attempts
      const { data: premiumAccess } = await this.getUserPremiumAccess();
      // Only include access records that have remaining attempts and aren't expired
      const premiumExamIds = new Set(
        (premiumAccess || [])
          .filter(a => {
            // Check if has remaining attempts
            const hasAttempts = (a.attempts_used ?? 0) < (a.attempts_allowed ?? 1);
            // Check if not expired
            const notExpired = !a.expires_at || new Date(a.expires_at) > new Date();
            return hasAttempts && notExpired;
          })
          .map((a) => a.mock_exam_id)
      );

      // Enrich with stats and access info
      const examsWithStats = await Promise.all(
        (data || []).map(async (exam) => {
          const stats = await this.getExamStatsForUser(exam.id);
          return {
            ...exam,
            ...stats,
            has_premium_access: !exam.is_premium || premiumExamIds.has(exam.id),
          };
        })
      );

      return { data: examsWithStats, error: null };
    } catch (error) {
      console.error('Error in getAllExamsForCatalog:', error);
      return { data: null, error };
    }
  }

  /**
   * Get exam details with all questions and answers
   */
  static async getExamWithQuestions(
    examId: string
  ): Promise<{ data: ExamWithQuestions | null; error: any }> {
    try {
      // Get exam
      const { data: exam, error: examError } = await supabase
        .from('mock_exams')
        .select('*, creator:created_by(id, first_name, last_name)')
        .eq('id', examId)
        .single();

      if (examError) {
        console.error('Error fetching exam:', examError);
        return { data: null, error: examError };
      }

      // Get questions with answers
      const { data: questions, error: questionsError } = await supabase
        .from('mock_exam_questions')
        .select('*, answers:mock_exam_answers(*)')
        .eq('exam_id', examId)
        .order('order_index', { ascending: true });

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        return { data: null, error: questionsError };
      }

      // Sort answers by order_index
      const questionsWithSortedAnswers = questions.map((q: any) => ({
        ...q,
        answers: (q.answers || []).sort(
          (a: any, b: any) => a.order_index - b.order_index
        ),
      }));

      return {
        data: {
          ...exam,
          questions: questionsWithSortedAnswers,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error in getExamWithQuestions:', error);
      return { data: null, error };
    }
  }

  /**
   * Get user's stats for a specific exam
   */
  static async getExamStatsForUser(
    examId: string
  ): Promise<{
    attempt_count: number;
    best_score: number | null;
    average_score: number | null;
    last_attempt_date: string | null;
    user_has_passed: boolean;
  }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return {
          attempt_count: 0,
          best_score: null,
          average_score: null,
          last_attempt_date: null,
          user_has_passed: false,
        };
      }

      const { data: attempts } = await supabase
        .from('mock_exam_attempts')
        .select('score, passed, completed_at')
        .eq('exam_id', examId)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (!attempts || attempts.length === 0) {
        return {
          attempt_count: 0,
          best_score: null,
          average_score: null,
          last_attempt_date: null,
          user_has_passed: false,
        };
      }

      const scores = attempts.map((a) => a.score);
      const bestScore = Math.max(...scores);
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const hasPassed = attempts.some((a) => a.passed);

      return {
        attempt_count: attempts.length,
        best_score: bestScore,
        average_score: avgScore,
        last_attempt_date: attempts[0].completed_at,
        user_has_passed: hasPassed,
      };
    } catch (error) {
      console.error('Error getting exam stats:', error);
      return {
        attempt_count: 0,
        best_score: null,
        average_score: null,
        last_attempt_date: null,
        user_has_passed: false,
      };
    }
  }

  // =============================================================================
  // EXAM ATTEMPTS - START & MANAGE
  // =============================================================================

  /**
   * Start a new exam attempt
   * For premium exams, this will consume one attempt from the user's access
   */
  static async startExam(
    dto: StartExamDTO
  ): Promise<{ data: ExamSession | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Get exam with questions
      const { data: examData, error: examError } = await this.getExamWithQuestions(
        dto.exam_id
      );
      if (examError || !examData) {
        return { data: null, error: examError };
      }

      // For premium exams, check and consume an attempt
      if (examData.is_premium) {
        const { data: accessCheck, error: accessError } = await supabase
          .rpc('check_and_consume_mock_exam_attempt', {
            p_user_id: user.id,
            p_mock_exam_id: dto.exam_id
          });

        if (accessError) {
          console.error('Error checking exam access:', accessError);
          return { data: null, error: accessError };
        }

        if (!accessCheck?.success) {
          const errorMessage = accessCheck?.message || 'No access to this exam';
          return {
            data: null,
            error: new Error(errorMessage)
          };
        }
      }

      // Create attempt record
      const { data: attempt, error: attemptError } = await supabase
        .from('mock_exam_attempts')
        .insert({
          exam_id: dto.exam_id,
          user_id: user.id,
          started_at: new Date().toISOString(),
          // Don't set completed_at - will be set when completeExam() is called
          score: 0,
          total_points_earned: 0,
          total_points_possible: examData.questions.reduce(
            (sum, q) => sum + q.points,
            0
          ),
          passed: false,
          time_spent_minutes: 0,
        })
        .select()
        .single();

      if (attemptError) {
        console.error('Error creating attempt:', attemptError);
        return { data: null, error: attemptError };
      }

      // Create exam session
      const session: ExamSession = {
        attempt_id: attempt.id,
        exam: examData,
        questions: examData.questions,
        started_at: new Date(),
        duration_minutes: examData.duration_minutes,
        answers: {},
        current_question_index: 0,
      };

      return { data: session, error: null };
    } catch (error) {
      console.error('Error starting exam:', error);
      return { data: null, error };
    }
  }

  /**
   * Submit answer for a question (can be called multiple times to update answer)
   */
  static async submitAnswer(
    dto: SubmitAnswerDTO
  ): Promise<{ data: boolean; error: any }> {
    try {
      // Check if answer already exists
      const { data: existing } = await supabase
        .from('mock_exam_attempt_answers')
        .select('id')
        .eq('attempt_id', dto.attempt_id)
        .eq('question_id', dto.question_id)
        .maybeSingle();

      if (existing) {
        // Update existing answer
        const { error } = await supabase
          .from('mock_exam_attempt_answers')
          .update({
            selected_answer_ids: dto.selected_answer_ids,
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating answer:', error);
          return { data: false, error };
        }
      } else {
        // Create new answer (will be corrected on exam completion)
        const { error } = await supabase
          .from('mock_exam_attempt_answers')
          .insert({
            attempt_id: dto.attempt_id,
            question_id: dto.question_id,
            selected_answer_ids: dto.selected_answer_ids,
            is_correct: false, // Will be updated on completion
            points_earned: 0, // Will be updated on completion
          });

        if (error) {
          console.error('Error inserting answer:', error);
          return { data: false, error };
        }
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Error submitting answer:', error);
      return { data: false, error };
    }
  }

  /**
   * Complete exam attempt and calculate results
   */
  static async completeExam(
    attemptId: string
  ): Promise<{ data: ExamResults | null; error: any }> {
    try {
      // Get attempt with exam and questions
      const { data: attempt, error: attemptError } = await supabase
        .from('mock_exam_attempts')
        .select('*, exam:mock_exams(*)')
        .eq('id', attemptId)
        .single();

      if (attemptError || !attempt) {
        return { data: null, error: attemptError };
      }

      // Get all questions with answers
      const { data: questions, error: questionsError } = await supabase
        .from('mock_exam_questions')
        .select('*, answers:mock_exam_answers(*)')
        .eq('exam_id', attempt.exam_id)
        .order('order_index', { ascending: true });

      if (questionsError) {
        return { data: null, error: questionsError };
      }

      // Get user's answers
      const { data: userAnswers, error: userAnswersError } = await supabase
        .from('mock_exam_attempt_answers')
        .select('*')
        .eq('attempt_id', attemptId);

      if (userAnswersError) {
        return { data: null, error: userAnswersError };
      }


      // Calculate results for each question
      let totalPointsEarned = 0;
      const questionsWithResults = await Promise.all(
        questions.map(async (question: any) => {
          const userAnswer = userAnswers?.find((a) => a.question_id === question.id);
          const correctAnswerIds = question.answers
            .filter((a: any) => a.is_correct)
            .map((a: any) => a.id);

          let isCorrect = false;
          let pointsEarned = 0;

          if (userAnswer) {
            // Check if user's answer is correct
            const selectedIds = userAnswer.selected_answer_ids || [];

            if (question.question_type === 'single_choice') {
              isCorrect =
                selectedIds.length === 1 && correctAnswerIds.includes(selectedIds[0]);
            } else {
              // multiple_choice: all correct answers must be selected, no incorrect ones
              isCorrect =
                selectedIds.length === correctAnswerIds.length &&
                selectedIds.every((id: string) => correctAnswerIds.includes(id));
            }

            pointsEarned = isCorrect ? question.points : 0;
            totalPointsEarned += pointsEarned;

            // Update the answer record with correction
            const { error: updateError } = await supabase
              .from('mock_exam_attempt_answers')
              .update({
                is_correct: isCorrect,
                points_earned: pointsEarned,
              })
              .eq('id', userAnswer.id);

            if (updateError) {
              console.error('Failed to update answer:', updateError);
            }
          }

          return {
            question: {
              ...question,
              answers: question.answers.sort(
                (a: any, b: any) => a.order_index - b.order_index
              ),
            },
            user_answer_ids: userAnswer?.selected_answer_ids || [],
            is_correct: isCorrect,
            points_earned: pointsEarned,
          };
        })
      );

      // Calculate final score
      const totalPointsPossible = questions.reduce(
        (sum: number, q: any) => sum + q.points,
        0
      );
      const scorePercentage = Math.round(
        (totalPointsEarned / totalPointsPossible) * 100
      );
      const passed = scorePercentage >= attempt.exam.passing_score;

      // Calculate time spent
      const timeSpentMinutes = Math.round(
        (new Date().getTime() - new Date(attempt.started_at).getTime()) / 60000
      );

      // Update attempt record
      const { error: updateError } = await supabase
        .from('mock_exam_attempts')
        .update({
          score: scorePercentage,
          total_points_earned: totalPointsEarned,
          total_points_possible: totalPointsPossible,
          passed,
          time_spent_minutes: timeSpentMinutes,
          completed_at: new Date().toISOString(),
        })
        .eq('id', attemptId);

      if (updateError) {
        console.error('Error updating attempt:', updateError);
        return { data: null, error: updateError };
      }

      // Return results
      const results: ExamResults = {
        attempt: {
          ...attempt,
          score: scorePercentage,
          total_points_earned: totalPointsEarned,
          total_points_possible: totalPointsPossible,
          passed,
          time_spent_minutes: timeSpentMinutes,
          completed_at: new Date().toISOString(),
        },
        exam: attempt.exam,
        questions_with_answers: questionsWithResults,
        total_questions: questions.length,
        correct_answers: questionsWithResults.filter((q) => q.is_correct).length,
        score_percentage: scorePercentage,
        passed,
        time_spent_minutes: timeSpentMinutes,
      };

      return { data: results, error: null };
    } catch (error) {
      console.error('Error completing exam:', error);
      return { data: null, error };
    }
  }

  // =============================================================================
  // ATTEMPT HISTORY
  // =============================================================================

  /**
   * Get user's attempt history with filters
   */
  static async getMyAttempts(
    filters?: AttemptFilters
  ): Promise<{ data: MockExamAttempt[] | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      let query = supabase
        .from('mock_exam_attempts')
        .select('*, exam:mock_exams(*)')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (filters?.exam_id) {
        query = query.eq('exam_id', filters.exam_id);
      }

      if (filters?.passed !== undefined) {
        query = query.eq('passed', filters.passed);
      }

      if (filters?.date_from) {
        query = query.gte('completed_at', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('completed_at', filters.date_to);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching attempts:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getMyAttempts:', error);
      return { data: null, error };
    }
  }

  /**
   * Get detailed results for a specific attempt
   */
  static async getAttemptResults(
    attemptId: string
  ): Promise<{ data: ExamResults | null; error: any }> {
    try {
      // Get attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('mock_exam_attempts')
        .select('*, exam:mock_exams(*)')
        .eq('id', attemptId)
        .single();

      if (attemptError || !attempt) {
        return { data: null, error: attemptError };
      }

      // Get questions with answers
      const { data: questions, error: questionsError } = await supabase
        .from('mock_exam_questions')
        .select('*, answers:mock_exam_answers(*)')
        .eq('exam_id', attempt.exam_id)
        .order('order_index', { ascending: true });

      if (questionsError) {
        return { data: null, error: questionsError };
      }

      // Get user's answers
      const { data: userAnswers, error: userAnswersError } = await supabase
        .from('mock_exam_attempt_answers')
        .select('*')
        .eq('attempt_id', attemptId);

      if (userAnswersError) {
        return { data: null, error: userAnswersError };
      }

      // Build results
      const questionsWithResults = questions.map((question: any) => {
        const userAnswer = userAnswers?.find((a) => a.question_id === question.id);
        return {
          question: {
            ...question,
            answers: question.answers.sort(
              (a: any, b: any) => a.order_index - b.order_index
            ),
          },
          user_answer_ids: userAnswer?.selected_answer_ids || [],
          is_correct: userAnswer?.is_correct || false,
          points_earned: userAnswer?.points_earned || 0,
        };
      });

      const results: ExamResults = {
        attempt: attempt,
        exam: attempt.exam,
        questions_with_answers: questionsWithResults,
        total_questions: questions.length,
        correct_answers: questionsWithResults.filter((q) => q.is_correct).length,
        score_percentage: attempt.score,
        passed: attempt.passed,
        time_spent_minutes: attempt.time_spent_minutes,
      };

      return { data: results, error: null };
    } catch (error) {
      console.error('Error getting attempt results:', error);
      return { data: null, error };
    }
  }

  // =============================================================================
  // ADMIN OPERATIONS
  // =============================================================================

  /**
   * Get all attempts (admin only)
   */
  static async getAllAttempts(
    filters?: AttemptFilters
  ): Promise<{ data: AttemptWithDetails[] | null; error: any }> {
    try {
      let query = supabase
        .from('mock_exam_attempts')
        .select('*, exam:mock_exams(*), user:users(id, first_name, last_name, email)')
        .order('completed_at', { ascending: false });

      if (filters?.exam_id) {
        query = query.eq('exam_id', filters.exam_id);
      }

      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters?.passed !== undefined) {
        query = query.eq('passed', filters.passed);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching all attempts:', error);
        return { data: null, error };
      }

      return { data: data as any, error: null };
    } catch (error) {
      console.error('Error in getAllAttempts:', error);
      return { data: null, error };
    }
  }

  /**
   * Get exam statistics (admin only)
   */
  static async getExamStatistics(
    examId: string
  ): Promise<{
    data: {
      total_attempts: number;
      unique_users: number;
      pass_rate: number;
      average_score: number;
      average_time_minutes: number;
    } | null;
    error: any;
  }> {
    try {
      const { data: attempts, error } = await supabase
        .from('mock_exam_attempts')
        .select('user_id, score, passed, time_spent_minutes')
        .eq('exam_id', examId);

      if (error) {
        return { data: null, error };
      }

      if (!attempts || attempts.length === 0) {
        return {
          data: {
            total_attempts: 0,
            unique_users: 0,
            pass_rate: 0,
            average_score: 0,
            average_time_minutes: 0,
          },
          error: null,
        };
      }

      const uniqueUsers = new Set(attempts.map((a) => a.user_id)).size;
      const passedCount = attempts.filter((a) => a.passed).length;
      const avgScore = Math.round(
        attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
      );
      const avgTime = Math.round(
        attempts.reduce((sum, a) => sum + a.time_spent_minutes, 0) / attempts.length
      );

      return {
        data: {
          total_attempts: attempts.length,
          unique_users: uniqueUsers,
          pass_rate: Math.round((passedCount / attempts.length) * 100),
          average_score: avgScore,
          average_time_minutes: avgTime,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error getting exam statistics:', error);
      return { data: null, error };
    }
  }

  // =============================================================================
  // ADMIN OPERATIONS
  // =============================================================================

  /**
   * Get all exams for admin (including inactive) with statistics
   */
  static async getExamsAdmin(filters?: ExamFilters): Promise<{
    data: import('./mock-exam.types').MockExamAdminStats[] | null;
    error: any;
  }> {
    try {
      let query = supabase
        .from('mock_exams')
        .select(`
          *,
          mock_exam_questions(count),
          mock_exam_attempts(
            id,
            passed,
            score
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,title_ar.ilike.%${filters.search}%`
        );
      }

      if (filters?.language) {
        query = query.eq('language', filters.language);
      }

      if (filters?.is_premium !== undefined) {
        query = query.eq('is_premium', filters.is_premium);
      }

      if (filters?.is_sample_exam !== undefined) {
        query = query.eq('is_sample_exam', filters.is_sample_exam);
      }

      const { data: exams, error } = await query;

      if (error) {
        console.error('Error fetching exams for admin:', error);
        return { data: null, error };
      }

      // Calculate statistics for each exam
      const examsWithStats = (exams || []).map((exam: any) => {
        const attempts = exam.mock_exam_attempts || [];
        const totalAttempts = attempts.length;
        const passedAttempts = attempts.filter((a: any) => a.passed).length;
        const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
        const avgScore = totalAttempts > 0
          ? Math.round(attempts.reduce((sum: number, a: any) => sum + a.score, 0) / totalAttempts)
          : 0;

        // Get last attempt date
        const lastAttemptDate = attempts.length > 0
          ? attempts.sort((a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0].created_at
          : null;

        const { mock_exam_questions, mock_exam_attempts, ...examData } = exam;
        const totalQuestions = Array.isArray(mock_exam_questions) ? mock_exam_questions.length : 0;

        return {
          ...examData,
          total_attempts: totalAttempts,
          total_questions: totalQuestions,
          pass_rate: passRate,
          average_score: avgScore,
          last_attempt_date: lastAttemptDate,
        };
      });

      return { data: examsWithStats, error: null };
    } catch (error) {
      console.error('Error in getExamsAdmin:', error);
      return { data: null, error };
    }
  }

  /**
   * Create a new exam (admin only)
   */
  static async createExam(dto: import('./mock-exam.types').CreateExamDTO): Promise<{
    data: MockExam | null;
    error: any;
  }> {
    try {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('mock_exams')
        .insert({
          ...dto,
          created_by: user.user?.id,
          is_active: dto.is_active ?? false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating exam:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in createExam:', error);
      return { data: null, error };
    }
  }

  /**
   * Update an exam (admin only)
   */
  static async updateExam(
    id: string,
    dto: Partial<import('./mock-exam.types').CreateExamDTO>
  ): Promise<{
    data: MockExam | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('mock_exams')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating exam:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in updateExam:', error);
      return { data: null, error };
    }
  }

  /**
   * Check if exam can be deleted and return attempt count
   */
  static async checkExamDeletable(id: string): Promise<{
    canDelete: boolean;
    attemptCount: number;
    error: any;
  }> {
    try {
      const { count: attemptCount, error: countError } = await supabase
        .from('mock_exam_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('exam_id', id);

      if (countError) {
        console.error('Error checking exam attempts:', countError);
        return { canDelete: false, attemptCount: 0, error: countError };
      }

      return {
        canDelete: !attemptCount || attemptCount === 0,
        attemptCount: attemptCount || 0,
        error: null,
      };
    } catch (error) {
      console.error('Error in checkExamDeletable:', error);
      return { canDelete: false, attemptCount: 0, error };
    }
  }

  /**
   * Delete an exam (admin only)
   * @param id - The exam ID to delete
   * @param force - If true, delete even if exam has attempts (use with caution)
   */
  static async deleteExam(id: string, force: boolean = false): Promise<{ error: any }> {
    try {
      // Step 1: Check if anyone has attempted this exam (unless force delete)
      if (!force) {
        const { canDelete, attemptCount } = await this.checkExamDeletable(id);

        if (!canDelete) {
          return {
            error: {
              type: 'HAS_ATTEMPTS',
              attemptCount,
              message: `This exam has been attempted by ${attemptCount} user(s).`,
            },
          };
        }
      }

      // Step 2: Delete the exam
      const { error } = await supabase
        .from('mock_exams')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting exam:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in deleteExam:', error);
      return { error };
    }
  }

  /**
   * Toggle exam active status (admin only)
   */
  static async toggleExamActive(id: string, isActive: boolean): Promise<{
    data: MockExam | null;
    error: any;
  }> {
    return this.updateExam(id, { is_active: isActive });
  }

  /**
   * Create a question for an exam (admin only)
   */
  static async createQuestion(dto: import('./mock-exam.types').CreateQuestionDTO): Promise<{
    data: QuestionWithAnswers | null;
    error: any;
  }> {
    try {
      const { answers, ...questionData } = dto;

      // Create question
      const { data: question, error: questionError } = await supabase
        .from('mock_exam_questions')
        .insert(questionData)
        .select()
        .single();

      if (questionError) {
        console.error('Error creating question:', questionError);
        return { data: null, error: questionError };
      }

      // Create answers
      const answersWithQuestionId = answers.map((answer) => ({
        ...answer,
        question_id: question.id,
      }));

      const { data: createdAnswers, error: answersError } = await supabase
        .from('mock_exam_answers')
        .insert(answersWithQuestionId)
        .select();

      if (answersError) {
        console.error('Error creating answers:', answersError);
        // Rollback: delete the question
        await supabase.from('mock_exam_questions').delete().eq('id', question.id);
        return { data: null, error: answersError };
      }

      return {
        data: {
          ...question,
          answers: createdAnswers || [],
        },
        error: null,
      };
    } catch (error) {
      console.error('Error in createQuestion:', error);
      return { data: null, error };
    }
  }

  /**
   * Update a question (admin only)
   */
  static async updateQuestion(dto: import('./mock-exam.types').UpdateQuestionDTO): Promise<{
    data: import('./mock-exam.types').MockExamQuestion | null;
    error: any;
  }> {
    try {
      const { id, ...updateData } = dto;

      const { data, error } = await supabase
        .from('mock_exam_questions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating question:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in updateQuestion:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a question (admin only)
   */
  static async deleteQuestion(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('mock_exam_questions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting question:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in deleteQuestion:', error);
      return { error };
    }
  }

  /**
   * Create an answer for a question (admin only)
   */
  static async createAnswer(
    questionId: string,
    dto: import('./mock-exam.types').CreateAnswerDTO
  ): Promise<{
    data: import('./mock-exam.types').MockExamAnswer | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('mock_exam_answers')
        .insert({
          ...dto,
          question_id: questionId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating answer:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in createAnswer:', error);
      return { data: null, error };
    }
  }

  /**
   * Update an answer (admin only)
   */
  static async updateAnswer(dto: import('./mock-exam.types').UpdateAnswerDTO): Promise<{
    data: import('./mock-exam.types').MockExamAnswer | null;
    error: any;
  }> {
    try {
      const { id, ...updateData } = dto;

      const { data, error } = await supabase
        .from('mock_exam_answers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating answer:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in updateAnswer:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete an answer (admin only)
   */
  static async deleteAnswer(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('mock_exam_answers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting answer:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in deleteAnswer:', error);
      return { error };
    }
  }

  /**
   * Update total_questions count for an exam (admin only)
   */
  static async updateExamQuestionCount(examId: string): Promise<{ error: any }> {
    try {
      // Count questions for the exam
      const { count, error: countError } = await supabase
        .from('mock_exam_questions')
        .select('*', { count: 'exact', head: true })
        .eq('exam_id', examId);

      if (countError) {
        console.error('Error counting questions:', countError);
        return { error: countError };
      }

      // Update the exam's total_questions field
      const { error: updateError } = await supabase
        .from('mock_exams')
        .update({ total_questions: count || 0 })
        .eq('id', examId);

      if (updateError) {
        console.error('Error updating question count:', updateError);
        return { error: updateError };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in updateExamQuestionCount:', error);
      return { error };
    }
  }

  // ============================================================================
  // MOCK EXAM PRODUCTS (Admin)
  // ============================================================================

  /**
   * Get all mock exam products (admin only)
   */
  static async getAllMockExamProducts(): Promise<{ data: MockExamProduct[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('mock_exam_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching mock exam products:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getAllMockExamProducts:', error);
      return { data: null, error };
    }
  }

  /**
   * Create a mock exam product (admin only)
   */
  static async createMockExamProduct(
    product: CreateMockExamProductDTO
  ): Promise<{ data: MockExamProduct | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('mock_exam_products')
        .insert(product)
        .select()
        .single();

      if (error) {
        console.error('Error creating mock exam product:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in createMockExamProduct:', error);
      return { data: null, error };
    }
  }

  /**
   * Update a mock exam product (admin only)
   */
  static async updateMockExamProduct(
    id: string,
    updates: UpdateMockExamProductDTO
  ): Promise<{ data: MockExamProduct | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('mock_exam_products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating mock exam product:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in updateMockExamProduct:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete a mock exam product (admin only)
   */
  static async deleteMockExamProduct(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('mock_exam_products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting mock exam product:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in deleteMockExamProduct:', error);
      return { error };
    }
  }

  // ============================================================================
  // MOCK EXAM CREDITS (User)
  // ============================================================================

  /**
   * Get user's available mock exam credits
   */
  static async getUserMockExamCredits(
    userId: string
  ): Promise<{ data: UserMockExamCredits | null; error: any }> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_mock_exam_credits', { p_user_id: userId });

      if (error) {
        console.error('Error fetching user mock exam credits:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getUserMockExamCredits:', error);
      return { data: null, error };
    }
  }

  /**
   * Use a mock exam credit to unlock an exam
   */
  static async useMockExamCredit(
    userId: string,
    examId: string
  ): Promise<{ data: { success: boolean; message: string; premium_access_id?: string } | null; error: any }> {
    try {
      const { data, error } = await supabase
        .rpc('use_mock_exam_credit', {
          p_user_id: userId,
          p_mock_exam_id: examId
        });

      if (error) {
        console.error('Error using mock exam credit:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in useMockExamCredit:', error);
      return { data: null, error };
    }
  }

  /**
   * Get user's mock exam access grants (admin view)
   */
  static async getUserAccessGrants(
    userId?: string
  ): Promise<{ data: MockExamAccessGrant[] | null; error: any }> {
    try {
      let query = supabase
        .from('mock_exam_access_grants')
        .select(`
          *,
          mock_exam_product:mock_exam_products(product_name, exams_count),
          user:profiles(email, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching access grants:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getUserAccessGrants:', error);
      return { data: null, error };
    }
  }
}
