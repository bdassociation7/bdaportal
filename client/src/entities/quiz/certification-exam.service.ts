import { supabase } from '@/shared/config/supabase.config';
import type {
  QuizAttempt,
  QuizAttemptAnswer,
  ExamEligibilityResult,
  ExamActivityLog,
  AttemptStatus,
  QuizResult,
  StartExamParams,
  SaveExamAnswerParams,
} from './quiz.types';

/**
 * Service for Certification Exam operations
 * Uses the state machine and RPC functions defined in the database
 */
export class CertificationExamService {
  // ==========================================================================
  // ELIGIBILITY & VALIDATION
  // ==========================================================================

  /**
   * Check if user is eligible to take an exam
   * Returns eligibility status, active attempts, and voucher info
   */
  static async checkEligibility(quizId: string): Promise<QuizResult<ExamEligibilityResult>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated to check eligibility',
          },
        };
      }

      const { data, error } = await supabase.rpc('check_exam_eligibility', {
        p_user_id: user.id,
        p_quiz_id: quizId,
      });

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to check exam eligibility',
            details: error,
          },
        };
      }

      return { data: data as ExamEligibilityResult, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while checking eligibility',
          details: err,
        },
      };
    }
  }

  // ==========================================================================
  // EXAM LIFECYCLE
  // ==========================================================================

  /**
   * Create a new certification exam attempt
   * This creates the attempt record but doesn't start the exam yet
   */
  static async createExamAttempt(params: StartExamParams): Promise<QuizResult<QuizAttempt>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated to start exam',
          },
        };
      }

      const { data, error } = await supabase.rpc('start_certification_exam', {
        p_user_id: user.id,
        p_quiz_id: params.quiz_id,
        p_voucher_id: params.voucher_id || null,
        p_booking_id: params.booking_id || null,
        p_ip_address: params.ip_address || null,
        p_user_agent: params.user_agent || navigator.userAgent,
        p_browser_info: params.browser_info || this.getBrowserInfo(),
      });

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to create exam attempt',
            details: error,
          },
        };
      }

      return { data: data as QuizAttempt, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while creating exam attempt',
          details: err,
        },
      };
    }
  }

  /**
   * Transition exam state (state machine)
   */
  static async transitionState(
    attemptId: string,
    newStatus: AttemptStatus,
    eventData?: Record<string, unknown>
  ): Promise<QuizResult<QuizAttempt>> {
    try {
      const { data, error } = await supabase.rpc('transition_exam_state', {
        p_attempt_id: attemptId,
        p_new_status: newStatus,
        p_event_data: eventData || null,
      });

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: `Failed to transition exam to ${newStatus}`,
            details: error,
          },
        };
      }

      return { data: data as QuizAttempt, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred during state transition',
          details: err,
        },
      };
    }
  }

  /**
   * Start the exam (transition from not_started to in_progress)
   */
  static async startExam(attemptId: string): Promise<QuizResult<QuizAttempt>> {
    return this.transitionState(attemptId, 'in_progress', { action: 'start' });
  }

  /**
   * Pause the exam
   */
  static async pauseExam(attemptId: string): Promise<QuizResult<QuizAttempt>> {
    return this.transitionState(attemptId, 'paused', { action: 'pause' });
  }

  /**
   * Resume the exam from paused state
   */
  static async resumeExam(attemptId: string): Promise<QuizResult<QuizAttempt>> {
    return this.transitionState(attemptId, 'in_progress', { action: 'resume' });
  }

  /**
   * Submit the exam for scoring
   */
  static async submitExam(attemptId: string): Promise<QuizResult<QuizAttempt>> {
    return this.transitionState(attemptId, 'submitted', { action: 'submit' });
  }

  /**
   * Mark exam as expired (time ran out)
   */
  static async expireExam(attemptId: string): Promise<QuizResult<QuizAttempt>> {
    return this.transitionState(attemptId, 'expired', { action: 'timeout' });
  }

  /**
   * Cancel the exam (admin action)
   */
  static async cancelExam(attemptId: string, reason?: string): Promise<QuizResult<QuizAttempt>> {
    return this.transitionState(attemptId, 'cancelled', { action: 'cancel', reason });
  }

  // ==========================================================================
  // ANSWER MANAGEMENT
  // ==========================================================================

  /**
   * Save an answer during the exam
   * Uses server-side validation and scoring
   */
  static async saveAnswer(params: SaveExamAnswerParams): Promise<QuizResult<QuizAttemptAnswer>> {
    try {
      const { data, error } = await supabase.rpc('save_exam_answer', {
        p_attempt_id: params.attempt_id,
        p_question_id: params.question_id,
        p_selected_answer_ids: params.selected_answer_ids,
        p_time_spent_seconds: params.time_spent_seconds || null,
      });

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to save answer',
            details: error,
          },
        };
      }

      return { data: data as QuizAttemptAnswer, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while saving answer',
          details: err,
        },
      };
    }
  }

  /**
   * Get all saved answers for an attempt
   */
  static async getAttemptAnswers(attemptId: string): Promise<QuizResult<QuizAttemptAnswer[]>> {
    try {
      const { data, error } = await supabase
        .from('quiz_attempt_answers')
        .select('*')
        .eq('attempt_id', attemptId)
        .order('answered_at', { ascending: true });

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to fetch attempt answers',
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
          message: 'An unexpected error occurred while fetching answers',
          details: err,
        },
      };
    }
  }

  // ==========================================================================
  // SCORING
  // ==========================================================================

  /**
   * Score a submitted exam
   * Calculates score and transitions to passed/failed
   */
  static async scoreExam(attemptId: string): Promise<QuizResult<QuizAttempt>> {
    try {
      const { data, error } = await supabase.rpc('score_certification_exam', {
        p_attempt_id: attemptId,
      });

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to score exam',
            details: error,
          },
        };
      }

      return { data: data as QuizAttempt, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while scoring exam',
          details: err,
        },
      };
    }
  }

  // ==========================================================================
  // ATTEMPT RETRIEVAL
  // ==========================================================================

  /**
   * Get an attempt by ID
   */
  static async getAttempt(attemptId: string): Promise<QuizResult<QuizAttempt>> {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to fetch attempt',
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
          message: 'An unexpected error occurred while fetching attempt',
          details: err,
        },
      };
    }
  }

  /**
   * Get user's active exam attempts (not_started, in_progress, paused)
   */
  static async getActiveAttempts(): Promise<QuizResult<QuizAttempt[]>> {
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
        .select('*, quizzes(*)')
        .eq('user_id', user.id)
        .eq('exam_type', 'certification')
        .in('status', ['not_started', 'in_progress', 'paused'])
        .order('started_at', { ascending: false });

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to fetch active attempts',
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
          message: 'An unexpected error occurred while fetching active attempts',
          details: err,
        },
      };
    }
  }

  /**
   * Get user's completed certification exam attempts
   */
  static async getCompletedAttempts(): Promise<QuizResult<QuizAttempt[]>> {
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
        .select('*, quizzes(*)')
        .eq('user_id', user.id)
        .eq('exam_type', 'certification')
        .in('status', ['passed', 'failed', 'expired', 'cancelled'])
        .order('completed_at', { ascending: false });

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to fetch completed attempts',
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
          message: 'An unexpected error occurred while fetching completed attempts',
          details: err,
        },
      };
    }
  }

  // ==========================================================================
  // ACTIVITY LOGGING
  // ==========================================================================

  /**
   * Log an activity event for an exam attempt
   */
  static async logActivity(
    attemptId: string,
    eventType: string,
    eventData?: Record<string, unknown>
  ): Promise<QuizResult<ExamActivityLog>> {
    try {
      const { data, error } = await supabase
        .from('exam_activity_log')
        .insert({
          attempt_id: attemptId,
          event_type: eventType,
          event_data: eventData || null,
        })
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to log activity',
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
          message: 'An unexpected error occurred while logging activity',
          details: err,
        },
      };
    }
  }

  /**
   * Get activity log for an attempt
   */
  static async getActivityLog(attemptId: string): Promise<QuizResult<ExamActivityLog[]>> {
    try {
      const { data, error } = await supabase
        .from('exam_activity_log')
        .select('*')
        .eq('attempt_id', attemptId)
        .order('created_at', { ascending: true });

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to fetch activity log',
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
          message: 'An unexpected error occurred while fetching activity log',
          details: err,
        },
      };
    }
  }

  /**
   * Report suspicious activity
   */
  static async reportSuspiciousActivity(
    attemptId: string,
    activityType: string,
    details?: Record<string, unknown>
  ): Promise<QuizResult<void>> {
    try {
      // Log the suspicious activity
      await this.logActivity(attemptId, 'suspicious_activity', {
        type: activityType,
        ...details,
      });

      // Increment the suspicious activity counter
      const { error } = await supabase.rpc('increment_suspicious_activity', {
        p_attempt_id: attemptId,
      });

      // If the RPC doesn't exist, do it manually
      if (error && error.code === 'PGRST202') {
        await supabase
          .from('quiz_attempts')
          .update({
            suspicious_activity_count: supabase.rpc('increment_field', {
              table: 'quiz_attempts',
              id: attemptId,
              field: 'suspicious_activity_count',
            }),
          })
          .eq('id', attemptId);
      }

      return { data: null, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while reporting suspicious activity',
          details: err,
        },
      };
    }
  }

  // ==========================================================================
  // PROCTORING
  // ==========================================================================

  /**
   * Validate proctoring token
   */
  static async validateProctoringToken(
    attemptId: string,
    token: string
  ): Promise<QuizResult<boolean>> {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('proctoring_token, proctoring_token_expires_at')
        .eq('id', attemptId)
        .single();

      if (error || !data) {
        return {
          data: null,
          error: {
            code: error?.code || 'NOT_FOUND',
            message: 'Attempt not found',
            details: error,
          },
        };
      }

      const isValid =
        data.proctoring_token === token &&
        (!data.proctoring_token_expires_at ||
          new Date(data.proctoring_token_expires_at) > new Date());

      return { data: isValid, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while validating token',
          details: err,
        },
      };
    }
  }

  /**
   * Update time remaining (called periodically during exam)
   */
  static async updateTimeRemaining(
    attemptId: string,
    timeRemainingSeconds: number
  ): Promise<QuizResult<void>> {
    try {
      const { error } = await supabase
        .from('quiz_attempts')
        .update({
          time_remaining_seconds: timeRemainingSeconds,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', attemptId);

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to update time remaining',
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
          message: 'An unexpected error occurred while updating time',
          details: err,
        },
      };
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Get browser information for security tracking
   */
  static getBrowserInfo(): Record<string, unknown> {
    if (typeof window === 'undefined') {
      return {};
    }

    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      colorDepth: window.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
    };
  }

  /**
   * Calculate effective time remaining accounting for pauses
   */
  static calculateEffectiveTimeRemaining(attempt: QuizAttempt): number {
    if (!attempt.started_at || !attempt.time_remaining_seconds) {
      return 0;
    }

    const startTime = new Date(attempt.started_at).getTime();
    const now = Date.now();
    const totalPauseMs = (attempt.total_pause_time_seconds || 0) * 1000;

    // If currently paused, don't count time since pause started
    let effectiveElapsed: number;
    if (attempt.paused_at) {
      const pauseStart = new Date(attempt.paused_at).getTime();
      effectiveElapsed = (pauseStart - startTime - totalPauseMs) / 1000;
    } else {
      effectiveElapsed = (now - startTime - totalPauseMs) / 1000;
    }

    const initialTime = attempt.time_remaining_seconds + effectiveElapsed;
    const remaining = initialTime - effectiveElapsed;

    return Math.max(0, Math.floor(remaining));
  }
}
