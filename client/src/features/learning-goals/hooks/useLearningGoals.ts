/**
 * useLearningGoals & useExamWindows
 * Hooks for Goal-Oriented UI feature.
 * - useExamWindows: fetches active BDA exam windows from certification_exam_windows table
 *   (the authoritative table managed by admins in the portal)
 * - useLearningGoal: fetches/saves the user's target exam window
 * - useHasVoucher: checks if user has a valid unused voucher
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { useAuth } from '@/shared/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Matches the shape of public.certification_exam_windows
 * (the existing admin-managed table)
 */
export interface ExamWindow {
  id: string;
  name: string;
  description: string | null;
  certification_type: string | null; // null means applies to all cert types
  start_date: string;
  end_date: string;
  is_active: boolean;
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
// Reads from certification_exam_windows — the authoritative table that admins
// manage directly from the portal. No separate exam_windows table needed.

export function useExamWindows(certType?: string) {
  return useQuery<ExamWindow[]>({
    queryKey: ['exam-windows', certType],
    staleTime: 1000 * 60 * 60, // 1 hour — windows don't change often
    queryFn: async () => {
      let query = supabase
        .from('certification_exam_windows')
        .select('id, name, description, certification_type, start_date, end_date, is_active')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString().split('T')[0]) // only future/ongoing windows
        .order('start_date', { ascending: true });

      // Filter by cert type: include windows that match the cert type OR have no cert type (applies to all)
      if (certType) {
        query = query.or(`certification_type.eq.${certType},certification_type.is.null`);
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
