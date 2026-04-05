/**
 * useLearningGoals & useExamWindows
 * Hooks for Goal-Oriented UI feature.
 * - useExamWindows: fetches active BDA exam windows from exam_windows table
 * - useLearningGoal: fetches/saves the user's target exam window
 * - useVoucherStatus: checks if user has a valid unused voucher
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { useAuth } from '@/shared/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExamWindow {
  id: string;
  certification_type: string; // 'CP' | 'SCP' | 'both'
  window_label: string;
  window_key: string;
  opens_at: string;
  closes_at: string;
  year: number;
  display_order: number;
}

export interface LearningGoal {
  id: string;
  user_id: string;
  certification_type: string;
  target_exam_window_id: string | null;
  target_exam_date: string | null;
  study_hours_per_week: number;
  created_at: string;
  updated_at: string;
}

export interface UpsertGoalPayload {
  certification_type: string;
  target_exam_window_id: string | null;
  target_exam_date: string | null;
  study_hours_per_week: number;
}

// ─── useExamWindows ───────────────────────────────────────────────────────────

export function useExamWindows(certType?: string) {
  return useQuery<ExamWindow[]>({
    queryKey: ['exam-windows', certType],
    staleTime: 1000 * 60 * 60, // 1 hour — windows don't change often
    queryFn: async () => {
      let query = supabase
        .from('exam_windows')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (certType) {
        query = query.or(`certification_type.eq.${certType},certification_type.eq.both`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ExamWindow[];
    },
  });
}

// ─── useLearningGoal ──────────────────────────────────────────────────────────

export function useLearningGoal(certType: string) {
  const { user } = useAuth();

  return useQuery<LearningGoal | null>({
    queryKey: ['learning-goal', user?.id, certType],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_learning_goals')
        .select('*')
        .eq('user_id', user!.id)
        .eq('certification_type', certType)
        .maybeSingle();
      if (error) throw error;
      return data as LearningGoal | null;
    },
  });
}

// ─── useUpsertLearningGoal ────────────────────────────────────────────────────

export function useUpsertLearningGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpsertGoalPayload) => {
      const { data, error } = await supabase.rpc('upsert_learning_goal', {
        p_user_id: user!.id,
        p_certification_type: payload.certification_type,
        p_target_exam_window_id: payload.target_exam_window_id,
        p_target_exam_date: payload.target_exam_date,
        p_study_hours_per_week: payload.study_hours_per_week,
      });
      if (error) throw error;
      return data as LearningGoal;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['learning-goal', user?.id, variables.certification_type],
      });
    },
  });
}

// ─── useHasVoucher ────────────────────────────────────────────────────────────
// Lightweight check: does the user have at least one valid unused voucher?

export function useHasVoucher(certType: string) {
  const { user } = useAuth();

  return useQuery<boolean>({
    queryKey: ['has-voucher', user?.id, certType],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      // Fetch at most 1 row — lightweight check
      const { data, error } = await supabase
        .from('exam_vouchers')
        .select('id')
        .eq('user_id', user!.id)
        .eq('certification_type', certType)
        .in('status', ['unused', 'available', 'assigned'])
        .gt('expires_at', new Date().toISOString())
        .limit(1);
      if (error) throw error;
      return Array.isArray(data) && data.length > 0;
    },
  });
}
