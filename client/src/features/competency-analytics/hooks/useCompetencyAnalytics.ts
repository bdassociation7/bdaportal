/**
 * useCompetencyAnalytics
 * Fetches per-competency mastery data for the current user via Supabase RPC.
 * Uses get_user_competency_analytics_v2 which reads from the real question bank
 * progress tables (user_question_bank_progress + curriculum_modules).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/config/supabase.config';
import { useAuth } from '@/shared/hooks/useAuth';

export interface CompetencyAnalyticsRow {
  module_id: string;
  competency_name: string;
  section_type: string;
  order_index: number;
  total_sets: number;
  attempted_sets: number;
  completed_sets: number;
  total_questions: number;
  questions_attempted: number;
  questions_correct: number;
  mastery_percentage: number;
  best_score_percentage: number;
  last_attempted_at: string | null;
}

export interface QuestionBankSummary {
  total_sets: number;
  attempted_sets: number;
  completed_sets: number;
  total_questions_available: number;
  total_questions_attempted: number;
  total_correct: number;
  overall_accuracy: number;
  avg_best_score: number;
  last_activity: string | null;
}

export function useCompetencyAnalytics(
  certificationType: 'CP' | 'SCP' = 'CP',
  examLanguage: 'en' | 'ar' = 'en'
) {
  const { user } = useAuth();

  const competencyQuery = useQuery<CompetencyAnalyticsRow[]>({
    queryKey: ['competency-analytics-v2', user?.id, certificationType, examLanguage],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 3,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_competency_analytics_v2', {
        p_user_id: user!.id,
        p_certification_type: certificationType,
        p_exam_language: examLanguage,
      });
      if (error) throw error;
      return (data ?? []) as CompetencyAnalyticsRow[];
    },
  });

  const summaryQuery = useQuery<QuestionBankSummary>({
    queryKey: ['question-bank-summary', user?.id, certificationType, examLanguage],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 3,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_question_bank_summary', {
        p_user_id: user!.id,
        p_certification_type: certificationType,
        p_exam_language: examLanguage,
      });
      if (error) throw error;
      return (data?.[0] ?? null) as QuestionBankSummary;
    },
  });

  return {
    competencies: competencyQuery.data ?? [],
    summary: summaryQuery.data ?? null,
    isLoading: competencyQuery.isLoading || summaryQuery.isLoading,
    isError: competencyQuery.isError || summaryQuery.isError,
  };
}
