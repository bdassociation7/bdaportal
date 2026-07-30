/**
 * Certification Exam Service
 * Gestion des examens officiels de certification (différents des mock exams)
 * Utilise la table 'quizzes' avec exam_type='certification'
 */

import { supabase } from '@/shared/config/supabase.config';
import type { QuizService } from '@/entities/quiz/quiz.service';

export type CertificationExamType = 'CP' | 'SCP';
export type ExamLanguage = 'en' | 'ar';
export type ExamStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface CertificationExam {
  id: string;
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  certification_type: CertificationExamType;
  exam_language: ExamLanguage; // Language of the exam (en or ar) - exams are language-specific
  difficulty_level: 'easy' | 'medium' | 'hard';
  time_limit_minutes: number;
  passing_score_percentage: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Stats
  question_count?: number;
  total_points?: number;
}

export interface CertificationAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  exam_type: 'certification'; // Always 'certification' for official exams
  started_at: string;
  completed_at?: string;
  score?: number;
  passed?: boolean;
  time_spent_minutes?: number;
}

export interface UserCertificationExamStats {
  total_attempts: number;
  passed_attempts: number;
  failed_attempts: number;
  best_score: number | null;
  last_attempt_date: string | null;
  is_certified: boolean;
  certification_id?: string;
}

/**
 * Service pour gérer les examens de certification officiels
 */
export class CertificationExamService {

  // ==========================================================================
  // ADMIN - GESTION DES EXAMENS
  // ==========================================================================

  /**
   * Obtenir tous les examens de certification (admin)
   */
  static async getAllCertificationExams(): Promise<{
    data: CertificationExam[] | null;
    error: any;
  }> {
    try {
            const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('quiz_type', 'certification') // Exclude lesson practice quizzes
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching certification exams:', error);
        return { data: null, error };
      }

      // Enrichir avec stats
      const examsWithStats = await Promise.all(
        (data || []).map(async (exam) => {
          const { data: questions } = await supabase
            .from('certification_question_bank')
            .select('points')
            .eq('certification_type', exam.certification_type)
            .eq('exam_language', exam.exam_language)
            .eq('is_active', true);

          return {
            ...exam,
            question_count: questions?.length || 0,
            total_points: questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0,
          };
        })
      );

      return { data: examsWithStats, error: null };
    } catch (error) {
      console.error('Error in getAllCertificationExams:', error);
      return { data: null, error };
    }
  }

  /**
   * Créer un nouvel examen de certification (admin)
   */
  static async createCertificationExam(dto: {
    title: string;
    title_ar?: string;
    description?: string;
    description_ar?: string;
    certification_type: CertificationExamType;
    exam_language: ExamLanguage; // Required: each exam is language-specific
    difficulty_level?: 'easy' | 'medium' | 'hard';
    time_limit_minutes?: number;
    passing_score_percentage?: number;
  }): Promise<{ data: CertificationExam | null; error: any }> {
    try {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('quizzes')
        .insert({
          ...dto,
          quiz_type: 'certification', // CRITICAL: must always be 'certification' for official exams
          exam_language: dto.exam_language || 'en',
          difficulty_level: dto.difficulty_level || 'medium',
          time_limit_minutes: dto.time_limit_minutes || 120,
          passing_score_percentage: dto.passing_score_percentage || 70,
          is_active: false, // Disabled by default until questions are added
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating certification exam:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in createCertificationExam:', error);
      return { data: null, error };
    }
  }

  /**
   * Mettre à jour un examen de certification (admin)
   */
  static async updateCertificationExam(
    examId: string,
    dto: Partial<CertificationExam>
  ): Promise<{ data: CertificationExam | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .update(dto)
        .eq('id', examId)
        .select()
        .single();

      if (error) {
        console.error('Error updating certification exam:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in updateCertificationExam:', error);
      return { data: null, error };
    }
  }

  /**
   * Check if exam can be deleted and return attempt count
   */
  static async checkExamDeletable(examId: string): Promise<{
    canDelete: boolean;
    attemptCount: number;
    error: any;
  }> {
    try {
      const { count: attemptCount, error: countError } = await supabase
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', examId);

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
   * Supprimer un examen de certification (admin)
   * @param examId - The exam ID to delete
   * @param force - If true, delete even if exam has attempts (use with caution)
   */
  static async deleteCertificationExam(
    examId: string,
    force: boolean = false
  ): Promise<{ error: any }> {
    try {
      // Step 1: Check if anyone has attempted this exam (unless force delete)
      if (!force) {
        const { canDelete, attemptCount } = await this.checkExamDeletable(examId);

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
      // CASCADE will handle: quiz_questions, quiz_answers, exam_bookings, exam_timeslots
      // SET NULL will preserve: user_certifications (quiz_attempt_id becomes null)
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', examId);

      if (error) {
        console.error('Error deleting certification exam:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in deleteCertificationExam:', error);
      return { error };
    }
  }

  /**
   * Activer/Désactiver un examen (admin)
   */
  static async toggleExamActive(
    examId: string,
    isActive: boolean
  ): Promise<{ data: CertificationExam | null; error: any }> {
    return this.updateCertificationExam(examId, { is_active: isActive });
  }

  /**
   * Obtenir statistiques globales d'un examen (admin)
   */
  static async getExamStatistics(examId: string): Promise<{
    data: {
      total_attempts: number;
      unique_candidates: number;
      pass_rate: number;
      average_score: number;
      certified_count: number;
    } | null;
    error: any;
  }> {
    try {
      // Récupérer toutes les tentatives
      const attemptsQuery = await supabase
        .from('quiz_attempts')
        .select('user_id, completed_at')
        .eq('quiz_id', examId)
        .eq('exam_type', 'certification')
        .not('completed_at', 'is', null);

      const { data: attempts, error: attemptsError } = attemptsQuery;

      if (attemptsError) {
        return { data: null, error: attemptsError };
      }

      // Récupérer les certifications délivrées
      const attemptIds = (attempts || []).map(a => a.user_id);
      const { data: certifications, error: certError } = await supabase
        .from('user_certifications')
        .select('id')
        .in('quiz_attempt_id', attemptIds);

      const uniqueCandidates = new Set((attempts || []).map(a => a.user_id)).size;

      return {
        data: {
          total_attempts: attempts?.length || 0,
          unique_candidates: uniqueCandidates,
          pass_rate: 0, // TODO: Calculate from scores
          average_score: 0, // TODO: Calculate from scores
          certified_count: certifications?.length || 0,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error in getExamStatistics:', error);
      return { data: null, error };
    }
  }

  // ==========================================================================
  // CANDIDATS - PASSER LES EXAMENS
  // ==========================================================================

  /**
   * Obtenir les examens de certification disponibles pour l'utilisateur
   * @param certificationType - Filter by certification type (CP or SCP)
   * @param examLanguage - Filter by exam language (en or ar) - REQUIRED for voucher-based filtering
   */
  static async getAvailableCertificationExams(
    certificationType?: CertificationExamType,
    examLanguage?: ExamLanguage
  ): Promise<{ data: CertificationExam[] | null; error: any }> {
    try {
      let query = supabase
        .from('quizzes')
        .select('*')
        .eq('is_active', true)
        .eq('quiz_type', 'certification') // Exclude lesson practice quizzes
        .order('created_at', { ascending: false });

      if (certificationType) {
        query = query.eq('certification_type', certificationType);
      }

      // Language-specific filtering: vouchers are language-specific, so exams must match
      if (examLanguage) {
        query = query.eq('exam_language', examLanguage);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching available exams:', error);
        return { data: null, error };
      }

      // Enrichir avec question count et stats utilisateur
      const examsWithStats = await Promise.all(
        (data || []).map(async (exam) => {
          // Get question count
          const { data: questions } = await supabase
            .from('certification_question_bank')
            .select('points')
            .eq('certification_type', exam.certification_type)
            .eq('exam_language', exam.exam_language)
            .eq('is_active', true);

          // Get user stats
          const stats = await this.getUserExamStats(exam.id);

          return {
            ...exam,
            question_count: questions?.length || 0,
            total_points: questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0,
            ...stats,
          };
        })
      );

      return { data: examsWithStats, error: null };
    } catch (error) {
      console.error('Error in getAvailableCertificationExams:', error);
      return { data: null, error };
    }
  }

  /**
   * Obtenir les statistiques de l'utilisateur pour un examen
   */
  static async getUserExamStats(
    examId: string
  ): Promise<UserCertificationExamStats> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return {
          total_attempts: 0,
          passed_attempts: 0,
          failed_attempts: 0,
          best_score: null,
          last_attempt_date: null,
          is_certified: false,
        };
      }

      // Get the exam's certification type first
      const { data: exam } = await supabase
        .from('quizzes')
        .select('certification_type')
        .eq('id', examId)
        .single();

      // Récupérer les tentatives de l'utilisateur
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', examId)
        .eq('user_id', user.user.id)
        .eq('exam_type', 'certification')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      // Check if user is certified for THIS SPECIFIC certification type (CP or SCP)
      // A CP certification should NOT block taking SCP exams and vice versa
      let certification = null;
      if (exam?.certification_type) {
        const { data: certData } = await supabase
          .from('user_certifications')
          .select('id')
          .eq('user_id', user.user.id)
          .eq('certification_type', exam.certification_type) // Filter by specific type!
          .eq('status', 'active')
          .maybeSingle();
        certification = certData;
      }

      return {
        total_attempts: attempts?.length || 0,
        passed_attempts: 0, // TODO: Count from scores
        failed_attempts: 0, // TODO: Count from scores
        best_score: null, // TODO: Calculate max score
        last_attempt_date: attempts?.[0]?.completed_at || null,
        is_certified: !!certification,
        certification_id: certification?.id,
      };
    } catch (error) {
      console.error('Error in getUserExamStats:', error);
      return {
        total_attempts: 0,
        passed_attempts: 0,
        failed_attempts: 0,
        best_score: null,
        last_attempt_date: null,
        is_certified: false,
      };
    }
  }

  /**
   * Démarrer une tentative d'examen de certification
   */
  static async startCertificationAttempt(
    examId: string
  ): Promise<{ data: CertificationAttempt | null; error: any }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Vérifier que l'examen existe et est actif
      const { data: exam, error: examError } = await supabase
        .from('quizzes')
        .select('id, is_active')
        .eq('id', examId)
        .single();

      if (examError || !exam?.is_active) {
        return { data: null, error: new Error('Exam not available') };
      }

      // Créer la tentative
      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: examId,
          user_id: user.user.id,
          exam_type: 'certification' as const,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (attemptError) {
        console.error('Error creating certification attempt:', attemptError);
        return { data: null, error: attemptError };
      }

      return { data: attempt as any as CertificationAttempt, error: null };
    } catch (error) {
      console.error('Error in startCertificationAttempt:', error);
      return { data: null, error };
    }
  }

  /**
   * Obtenir l'historique des tentatives de l'utilisateur
   */
  static async getUserAttemptHistory(): Promise<{
    data: CertificationAttempt[] | null;
    error: any;
  }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quiz:quizzes(title, title_ar, certification_type)
        `)
        .eq('user_id', user.user.id)
        .eq('exam_type', 'certification')
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Error fetching user attempt history:', error);
        return { data: null, error };
      }

      return { data: data as any, error: null };
    } catch (error) {
      console.error('Error in getUserAttemptHistory:', error);
      return { data: null, error };
    }
  }
}
