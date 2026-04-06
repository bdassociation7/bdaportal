/**
 * useCompetencyAnalytics
 * Fetches per-competency mastery data for the current user via Supabase RPC.
 * Reads from the user_competency_analytics VIEW — zero writes.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/config/supabase.config';
import { useAuth } from '@/shared/hooks/useAuth';

export interface CompetencyAnalyticsRow {
  module_id: string;
  competency_name: string;
  competency_name_ar: string | null;
  certification_type: string;
  total_attempts: number;
  correct_answers: number;
  mastery_percentage: number;
  last_attempted_at: string | null;
  unique_questions_seen: number;
}

export function useCompetencyAnalytics() {
  const { user } = useAuth();

  return useQuery<CompetencyAnalyticsRow[]>({
    queryKey: ['competency-analytics', user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_competency_analytics', {
        p_user_id: user!.id,
      });
      if (error) throw error;
      return (data ?? []) as CompetencyAnalyticsRow[];
    },
  });
}
