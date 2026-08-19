import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { supabase } from '@/shared/config/supabase.config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type PendingAttempt = {
  id: string;
  user_id: string;
  score: number | null;
  passed: boolean | null;
  suspicious_activity_count: number | null;
  integrity_risk_score: number | null;
  completed_at: string | null;
  quiz: { title: string; certification_type: string | null } | null;
  candidate?: { name: string; email: string };
};

export default function CertificationIntegrityReviews() {
  const queryClient = useQueryClient();
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ['certification-integrity-pending'],
    queryFn: async (): Promise<PendingAttempt[]> => {
      const { data: pendingAttempts, error } = await supabase
        .from('quiz_attempts')
        .select('id, user_id, score, passed, suspicious_activity_count, integrity_risk_score, completed_at, quiz:quizzes(title, certification_type)')
        .eq('exam_type', 'certification')
        .eq('integrity_review_status', 'pending')
        .order('integrity_risk_score', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((pendingAttempts || []).map((attempt) => attempt.user_id))];
      const { data: users, error: usersError } = userIds.length
        ? await supabase.from('users').select('id, first_name, last_name, email').in('id', userIds)
        : { data: [], error: null };
      if (usersError) throw usersError;

      const userById = new Map((users || []).map((user) => [user.id, user]));
      return (pendingAttempts || []).map((attempt) => {
        const candidate = userById.get(attempt.user_id);
        return {
          ...attempt,
          candidate: candidate
            ? { name: `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'Candidate', email: candidate.email }
            : { name: 'Candidate', email: 'Unavailable' },
        } as PendingAttempt;
      });
    },
  });

  const { data: activityEvents = [], isLoading: activityLoading } = useQuery({
    queryKey: ['certification-integrity-events', expandedAttemptId],
    queryFn: async () => {
      if (!expandedAttemptId) return [];
      const { data, error } = await supabase
        .from('exam_activity_log')
        .select('created_at, event_type, event_data')
        .eq('attempt_id', expandedAttemptId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!expandedAttemptId,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ attemptId, decision, notes }: { attemptId: string; decision: 'approve' | 'void'; notes: string }) => {
      const { error } = await supabase.rpc('review_certification_exam_integrity', {
        p_attempt_id: attemptId,
        p_decision: decision,
        p_notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.decision === 'approve' ? 'Attempt approved and certification released.' : 'Attempt voided.');
      queryClient.invalidateQueries({ queryKey: ['certification-integrity-pending'] });
      queryClient.invalidateQueries({ queryKey: ['certification-attempt-history'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Unable to complete the integrity review.'),
  });

  const reviewAttempt = (attempt: PendingAttempt, decision: 'approve' | 'void') => {
    const action = decision === 'approve' ? 'approve this attempt and release the certification' : 'void this attempt';
    const notes = window.prompt(`Add an internal review note before you ${action}:`, '');
    if (notes === null) return;
    if (!window.confirm(`Confirm: ${action}? This decision is recorded in the exam integrity audit trail.`)) return;
    reviewMutation.mutate({ attemptId: attempt.id, decision, notes });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0f91e0]">Exam security</p>
          <h1 className="mt-1 text-3xl font-bold text-[#0d1f4e]">Certification Integrity Reviews</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">Passed certification attempts with secure-session alerts are held here until an administrator confirms or voids the result.</p>
        </div>
        <Badge className="border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800 hover:bg-amber-50">
          <AlertTriangle className="mr-1.5 h-4 w-4" /> {attempts.length} pending review{attempts.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="flex gap-3 p-4 text-sm text-amber-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Approve only after reviewing the attempt’s activity trail and any supporting evidence. Approval releases the certification; voiding cancels the attempt and does not issue a credential.</p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#0f91e0]" /></div>
      ) : attempts.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-slate-500">There are no certification attempts awaiting integrity review.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {attempts.map((attempt) => (
            <Card key={attempt.id} className="overflow-hidden border-slate-200">
              <CardHeader className="border-b bg-slate-50/80 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg text-[#0d1f4e]">{attempt.candidate?.name}</CardTitle>
                    <p className="mt-1 text-sm text-slate-500">{attempt.candidate?.email} · {attempt.quiz?.title || 'Certification exam'} · BDA-{attempt.quiz?.certification_type || 'CP'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Risk score: {attempt.integrity_risk_score || 0}</Badge>
                    <Badge variant="outline">{attempt.suspicious_activity_count || 0} alert{attempt.suspicious_activity_count === 1 ? '' : 's'}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Recorded score:</span> {attempt.score ?? 0}% · Completed {attempt.completed_at ? new Date(attempt.completed_at).toLocaleString('en-GB') : '—'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setExpandedAttemptId(expandedAttemptId === attempt.id ? null : attempt.id)}>
                    <ShieldCheck className="mr-2 h-4 w-4" />{expandedAttemptId === attempt.id ? 'Hide activity' : 'View activity'}
                  </Button>
                  <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={reviewMutation.isPending} onClick={() => reviewAttempt(attempt, 'void')}>
                    <XCircle className="mr-2 h-4 w-4" />Void attempt
                  </Button>
                  <Button className="bg-[#0d1f4e] hover:bg-[#1c4a8b]" disabled={reviewMutation.isPending} onClick={() => reviewAttempt(attempt, 'approve')}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />Approve & release
                  </Button>
                </div>
              </CardContent>
              {expandedAttemptId === attempt.id && (
                <CardContent className="border-t bg-slate-50/60 p-5">
                  <p className="mb-3 text-sm font-semibold text-slate-800">Secure-session activity trail</p>
                  {activityLoading ? <Loader2 className="h-5 w-5 animate-spin text-[#0f91e0]" /> : activityEvents.length === 0 ? (
                    <p className="text-sm text-slate-500">No activity events were recorded.</p>
                  ) : (
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {activityEvents.map((event, index) => (
                        <div key={`${event.created_at}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white px-3 py-2 text-sm">
                          <span className="font-medium text-slate-800">{event.event_type.replaceAll('_', ' ')}</span>
                          <span className="text-slate-500">{new Date(event.created_at).toLocaleString('en-GB')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
