import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/config/supabase.config';

interface CertificationResultRow {
  id: string;
  score: number | null;
  passed: boolean | null;
  completed_at: string | null;
  integrity_review_status: 'not_required' | 'pending' | 'approved' | 'voided' | null;
  quiz: {
    title: string;
    title_ar: string | null;
    certification_type: string;
    exam_language: string | null;
    passing_score_percentage: number;
  } | null;
}

const formatDate = (date: string | null) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export default function MyExamResults() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: results = [], isLoading, error } = useQuery({
    queryKey: ['my-certification-exam-results', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as CertificationResultRow[];

      const { data, error: queryError } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          score,
          passed,
          completed_at,
          integrity_review_status,
          quiz:quizzes(title, title_ar, certification_type, exam_language, passing_score_percentage)
        `)
        .eq('user_id', user.id)
        .eq('exam_type', 'certification')
        .not('completed_at', 'is', null)
        .in('status', ['passed', 'failed'])
        .order('completed_at', { ascending: false });

      if (queryError) throw queryError;
      return (data || []) as unknown as CertificationResultRow[];
    },
    enabled: !!user?.id,
  });

  const passedCount = results.filter((result) => result.passed && result.integrity_review_status !== 'pending').length;
  const notPassedCount = results.filter((result) => !result.passed && result.integrity_review_status !== 'pending').length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-[#0f91e0] via-[#1c4a8b] to-[#0d1f4e] p-6 text-white">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-8 w-8 shrink-0" />
          <div>
            <h1 className="text-3xl font-bold">My Examination Results</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">
              Review your official BDA examination outcomes and download your result document whenever it is available.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <FileText className="h-6 w-6 text-[#1c4a8b]" />
            <div>
              <p className="text-2xl font-bold text-[#0d1f4e]">{results.length}</p>
              <p className="text-sm text-slate-600">Official results</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <CheckCircle2 className="h-6 w-6 text-[#1c4a8b]" />
            <div>
              <p className="text-2xl font-bold text-[#0d1f4e]">{passedCount}</p>
              <p className="text-sm text-slate-600">Passed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Clock className="h-6 w-6 text-[#1c4a8b]" />
            <div>
              <p className="text-2xl font-bold text-[#0d1f4e]">{notPassedCount}</p>
              <p className="text-sm text-slate-600">Development reports</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-xl text-[#0d1f4e]">Examination history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-600">
              <Loader2 className="mb-3 h-7 w-7 animate-spin text-[#0f91e0]" />
              <p>Loading your examination results…</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-slate-600">
              Your examination results could not be loaded. Please refresh the page and try again.
            </div>
          ) : results.length === 0 ? (
            <div className="p-12 text-center">
              <Award className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h2 className="font-semibold text-slate-900">No examination results yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Your completed BDA certification examination results will appear here for future reference.
              </p>
              <Button className="mt-5" onClick={() => navigate('/certification-exams')}>
                View Certification Exams
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {results.map((result) => {
                const reviewPending = result.integrity_review_status === 'pending';
                const passed = result.passed === true && !reviewPending;
                const statusLabel = reviewPending ? 'Review pending' : passed ? 'Passed' : 'Not passed';
                const StatusIcon = reviewPending ? ShieldCheck : passed ? CheckCircle2 : XCircle;
                const title = result.quiz?.title || `BDA-${result.quiz?.certification_type || 'CP'} Official Examination`;

                return (
                  <div key={result.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-lg bg-[#f0f6ff] p-2.5">
                        <StatusIcon className="h-5 w-5 text-[#1c4a8b]" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-slate-900">{title}</h2>
                        <p className="mt-1 text-sm text-slate-600">
                          Completed {formatDate(result.completed_at)} · BDA-{result.quiz?.certification_type || 'CP'} · {result.quiz?.exam_language || 'English'}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                          {reviewPending
                            ? 'Your result is recorded and is awaiting the routine integrity review.'
                            : passed
                              ? 'Your official examination result remains available to download at any time.'
                              : 'Your development report remains available to support a future attempt.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
                      <div className="text-left lg:text-right">
                        <p className="text-2xl font-bold text-[#0d1f4e]">{Math.round(result.score || 0)}%</p>
                        <Badge variant="outline" className="mt-1 border-[#bfdbfe] bg-[#f0f6ff] text-[#1c4a8b]">
                          {statusLabel}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        className="border-[#0d1f4e] text-[#0d1f4e] hover:bg-[#f0f6ff]"
                        onClick={() => navigate(`/exam-applications/results/${result.id}`)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View result
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

MyExamResults.displayName = 'MyExamResults';
