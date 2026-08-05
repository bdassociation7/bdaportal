import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Award,
  Clock,
  Target,
  Home,
  FileText,
  Loader2,
  AlertCircle,
  BarChart3,
  ShieldCheck,
  Mail,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/shared/utils/cn';
import { supabase } from '@/shared/config/supabase.config';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';

/**
 * ExamResults Page
 * Display certification exam results with domain & competency performance breakdown
 */

interface AttemptWithQuiz {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number | null;
  passed: boolean | null;
  total_points_earned: number | null;
  total_points_possible: number | null;
  time_spent_minutes: number | null;
  started_at: string;
  completed_at: string | null;
  quiz: {
    id: string;
    title: string;
    title_ar: string | null;
    certification_type: string;
    passing_score_percentage: number;
  };
}

interface ExamReport {
  attempt: {
    id: string;
    score: number | null;
    passed: boolean | null;
    total_points_earned: number | null;
    total_points_possible: number | null;
    time_spent_minutes: number | null;
    passing_score_percentage: number;
  };
  domain_performance: Array<{
    domain: string;
    total_questions: number;
    correct_answers: number;
    score_percentage: number;
    points_earned: number;
    points_possible: number;
  }>;
  competency_performance: Array<{
    competency_name: string;
    competency_section: string;
    total_questions: number;
    correct_answers: number;
    score_percentage: number;
    points_earned: number;
    points_possible: number;
    performance_level: 'strong' | 'adequate' | 'needs_improvement' | 'weak';
  }>;
  summary_stats: {
    total_questions_drawn: number;
    total_answered: number;
    total_correct: number;
    total_incorrect: number;
    total_unanswered: number;
  };
}

const PERFORMANCE_CONFIG = {
  strong: { label: 'Strong', color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200', icon: TrendingUp },
  adequate: { label: 'Adequate', color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200', icon: Minus },
  needs_improvement: { label: 'Needs Improvement', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200', icon: TrendingDown },
  weak: { label: 'Weak', color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200', icon: TrendingDown },
};

const DOMAIN_LABELS: Record<string, string> = {
  behavioral: 'Behavioural Domain',
  behavioural: 'Behavioural Domain',
  knowledge_based: 'Knowledge Domain',
  untagged: 'General',
};

export default function ExamResults() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sendingEmail, setSendingEmail] = useState(false);

  // Fetch attempt with quiz info
  const { data: attempt, isLoading: attemptLoading, error: attemptError } = useQuery({
    queryKey: ['certification-attempt', attemptId],
    queryFn: async () => {
      if (!attemptId) throw new Error('No attempt ID');
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`*, quiz:quizzes(id, title, title_ar, certification_type, passing_score_percentage)`)
        .eq('id', attemptId)
        .single();
      if (error) throw error;
      return data as AttemptWithQuiz;
    },
    enabled: !!attemptId,
  });

  // Fetch comprehensive exam report using the new DB function
  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['exam-report', attemptId],
    queryFn: async () => {
      if (!attemptId) throw new Error('No attempt ID');
      const { data, error } = await supabase.rpc('get_exam_attempt_report', {
        p_attempt_id: attemptId,
      });
      if (error) throw error;
      return data as ExamReport;
    },
    enabled: !!attemptId,
  });

  const handleSendResultsEmail = async () => {
    if (!attempt || !user?.email) return;
    setSendingEmail(true);
    try {
      const certType = attempt.quiz?.certification_type || 'CP';
      const isPassed = attempt.passed ?? false;
      const score = attempt.score ?? 0;
      const passingScore = attempt.quiz?.passing_score_percentage ?? 70;
      const pointsEarned = attempt.total_points_earned ?? 0;
      const pointsPossible = attempt.total_points_possible ?? 0;

      let timeSpentMin = attempt.time_spent_minutes;
      if (!timeSpentMin && attempt.started_at && attempt.completed_at) {
        const ms = new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime();
        timeSpentMin = Math.round(ms / 60000);
      }

      const completedDate = new Date(attempt.completed_at!).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });

      const firstName = user?.profile?.first_name || user?.email || 'Candidate';

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'exam_results',
          to: user.email,
          data: {
            first_name: firstName,
            certification_type: certType,
            score: String(score),
            passing_score: String(passingScore),
            points_earned: String(pointsEarned),
            points_possible: String(pointsPossible),
            time_spent: String(timeSpentMin ?? '-'),
            completed_date: completedDate,
            header_bg: isPassed ? '#059669' : '#dc2626',
            header_label: isPassed ? '🎉 Passed' : 'Not Passed',
            score_color: isPassed ? '#059669' : '#dc2626',
            result_message: isPassed
              ? `Congratulations! You have successfully passed the BDA-${certType} certification exam with a score of ${score}%. Your certification has been issued and will be available for download within 14 days.`
              : `Thank you for taking the BDA-${certType} certification exam. Your score of ${score}% did not meet the passing requirement of ${passingScore}%. We encourage you to review the competency areas and retake when ready.`,
            next_steps: isPassed
              ? 'Your digital certificate will be available in your portal within 14 days. You will also receive a separate certificate issuance confirmation email.'
              : 'You can access study materials and mock exams through the BDA Learning System to prepare for your next attempt.',
          },
        },
      });

      if (error) throw error;
      toast.success('Results sent to ' + user.email);
    } catch (err: any) {
      console.error('Email send error:', err);
      toast.error('Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  // Loading state
  if (attemptLoading || reportLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (attemptError || !attempt) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Results</AlertTitle>
          <AlertDescription>
            Unable to load exam results. The attempt may not exist or you may not have permission to view it.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/certification-exams')}>Back to Certification Exams</Button>
      </div>
    );
  }

  // Not completed yet
  if (!attempt.completed_at) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8 px-4">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Exam In Progress</AlertTitle>
          <AlertDescription className="text-yellow-700">
            This exam attempt has not been completed yet.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/certification-exams')}>Back to Certification Exams</Button>
      </div>
    );
  }

  const passed = attempt.passed ?? false;
  const score = attempt.score ?? 0;
  const totalPointsEarned = attempt.total_points_earned ?? 0;
  const totalPointsPossible = attempt.total_points_possible ?? 0;
  const passingScore = attempt.quiz?.passing_score_percentage ?? 70;
  const certificationType = attempt.quiz?.certification_type || 'CP';
  const isSCP = certificationType === 'SCP';

  let timeSpent = attempt.time_spent_minutes;
  if (!timeSpent && attempt.started_at && attempt.completed_at) {
    const start = new Date(attempt.started_at).getTime();
    const end = new Date(attempt.completed_at).getTime();
    timeSpent = Math.round((end - start) / 1000 / 60);
  }

  const summaryStats = report?.summary_stats;
  const domainPerformance = report?.domain_performance || [];
  const competencyPerformance = report?.competency_performance || [];

  // Group competencies by domain
  const behaviouralCompetencies = competencyPerformance.filter(
    c => c.competency_section === 'behavioral' || c.competency_section === 'behavioural'
  );
  const knowledgeCompetencies = competencyPerformance.filter(
    c => c.competency_section === 'knowledge_based'
  );

  // Weak areas for failed candidates (< 60%)
  const weakAreas = competencyPerformance.filter(
    c => c.performance_level === 'weak' || c.performance_level === 'needs_improvement'
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className={cn('rounded-lg p-6 text-white', passed ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-red-600 to-red-700')}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2 mb-3">
              {passed ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
              {passed ? (isSCP ? 'Outstanding Achievement!' : 'Congratulations!') : (isSCP ? 'Thank you for completing the BDA-SCP Exam.' : 'Thank you for completing the BDA-CP Exam.')}
            </h1>
            <p className="text-xl font-semibold mb-2">
              {passed
                ? isSCP ? 'You have earned the BDA-SCP Senior Certified Professional Credential.' : 'You have successfully earned the BDA-CP Certification.'
                : isSCP ? 'Unfortunately, the required passing score was not achieved.' : 'Unfortunately, you did not meet the passing score this time.'}
            </p>
            <p className="text-base opacity-95">
              {passed
                ? isSCP
                  ? 'This designation reflects your advanced expertise, strategic leadership ability, and mastery of the BDA BoCK® competencies at a senior professional level.'
                  : 'You are now recognised as a BDA Certified Professional in Business Development.'
                : isSCP
                  ? 'The SCP credential represents advanced business development expertise. We encourage you to revisit the BDA Learning System modules and strengthen your strategic competency areas.'
                  : 'We encourage you to continue developing your competencies. You may review your areas of improvement through the BDA Learning System and retake the exam when ready.'}
            </p>
          </div>
          <div className="text-center ml-6">
            <div className="text-6xl font-bold">{score}%</div>
            <div className="text-sm opacity-80 mt-1">{passed ? 'PASSED' : 'NOT PASSED'}</div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1"><Target className="h-4 w-4" /><div className="text-xs">Your Score</div></div>
            <div className="text-2xl font-bold text-gray-900">{score}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1"><Target className="h-4 w-4" /><div className="text-xs">Passing Score</div></div>
            <div className="text-2xl font-bold text-gray-900">{passingScore}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1"><FileText className="h-4 w-4" /><div className="text-xs">Points</div></div>
            <div className="text-2xl font-bold text-gray-900">{totalPointsEarned}/{totalPointsPossible}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1"><Clock className="h-4 w-4" /><div className="text-xs">Time Spent</div></div>
            <div className="text-2xl font-bold text-gray-900">{timeSpent ?? '-'} min</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1"><BarChart3 className="h-4 w-4" /><div className="text-xs">Correct</div></div>
            <div className="text-2xl font-bold text-gray-900">
              {summaryStats?.total_correct ?? '-'}/{summaryStats?.total_questions_drawn ?? '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exam Details */}
      <Card>
        <CardHeader><CardTitle>Exam Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Exam</div>
            <div className="text-base font-semibold text-gray-900">{attempt.quiz?.title || 'Certification Exam'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Certification</div>
            <Badge className={certificationType === 'CP' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}>
              BDA-{certificationType}
            </Badge>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Completed</div>
            <div className="text-gray-900 text-sm">{formatDate(attempt.completed_at)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <Badge variant="outline" className={cn('border', passed ? 'text-green-700 bg-green-100 border-green-300' : 'text-red-700 bg-red-100 border-red-300')}>
              {passed ? 'PASSED' : 'NOT PASSED'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Domain Performance */}
      {domainPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <CardTitle>Performance by Domain</CardTitle>
            </div>
            <p className="text-sm text-gray-500 mt-1">Your performance across the two main exam domains</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {domainPerformance.map((domain) => {
              const label = DOMAIN_LABELS[domain.domain] || domain.domain;
              const pct = domain.score_percentage ?? 0;
              const isGood = pct >= passingScore;
              return (
                <div key={domain.domain} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-800">{label}</div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">{domain.correct_answers}/{domain.total_questions} correct</span>
                      <span className={cn('font-bold text-base', isGood ? 'text-green-600' : 'text-red-600')}>{pct}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className={cn('h-3 rounded-full transition-all', isGood ? 'bg-green-500' : 'bg-red-400')}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0%</span>
                    <span className="text-gray-500">Passing: {passingScore}%</span>
                    <span>100%</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Competency Performance - Behavioural */}
      {behaviouralCompetencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Behavioural Domain — Competency Breakdown</CardTitle>
            <p className="text-sm text-gray-500">Target: 45% of exam (54 questions)</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {behaviouralCompetencies.map((comp) => {
                const config = PERFORMANCE_CONFIG[comp.performance_level];
                const Icon = config.icon;
                return (
                  <div key={comp.competency_name} className={cn('flex items-center justify-between p-3 rounded-lg border', comp.performance_level === 'strong' ? 'bg-green-50 border-green-200' : comp.performance_level === 'adequate' ? 'bg-blue-50 border-blue-200' : comp.performance_level === 'needs_improvement' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200')}>
                    <div className="flex items-center gap-2 flex-1">
                      <Icon className={cn('h-4 w-4 flex-shrink-0', config.color)} />
                      <span className="font-medium text-sm text-gray-800">{comp.competency_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">{comp.correct_answers}/{comp.total_questions}</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div className={cn('h-2 rounded-full', comp.performance_level === 'strong' ? 'bg-green-500' : comp.performance_level === 'adequate' ? 'bg-blue-500' : comp.performance_level === 'needs_improvement' ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${Math.min(comp.score_percentage, 100)}%` }} />
                      </div>
                      <span className={cn('font-bold w-10 text-right', config.color)}>{comp.score_percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competency Performance - Knowledge */}
      {knowledgeCompetencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Knowledge Domain — Competency Breakdown</CardTitle>
            <p className="text-sm text-gray-500">Target: 55% of exam (66 questions)</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {knowledgeCompetencies.map((comp) => {
                const config = PERFORMANCE_CONFIG[comp.performance_level];
                const Icon = config.icon;
                return (
                  <div key={comp.competency_name} className={cn('flex items-center justify-between p-3 rounded-lg border', comp.performance_level === 'strong' ? 'bg-green-50 border-green-200' : comp.performance_level === 'adequate' ? 'bg-blue-50 border-blue-200' : comp.performance_level === 'needs_improvement' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200')}>
                    <div className="flex items-center gap-2 flex-1">
                      <Icon className={cn('h-4 w-4 flex-shrink-0', config.color)} />
                      <span className="font-medium text-sm text-gray-800">{comp.competency_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">{comp.correct_answers}/{comp.total_questions}</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div className={cn('h-2 rounded-full', comp.performance_level === 'strong' ? 'bg-green-500' : comp.performance_level === 'adequate' ? 'bg-blue-500' : comp.performance_level === 'needs_improvement' ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${Math.min(comp.score_percentage, 100)}%` }} />
                      </div>
                      <span className={cn('font-bold w-10 text-right', config.color)}>{comp.score_percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Areas for Improvement - Only for failed candidates */}
      {!passed && weakAreas.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-900">Priority Areas for Improvement</CardTitle>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Focus your preparation on these competency areas before your next attempt:
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {weakAreas.map((comp) => (
                <li key={comp.competency_name} className="flex items-center gap-2 text-amber-800">
                  <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                  <span className="font-medium">{comp.competency_name}</span>
                  <span className="text-amber-600 text-sm ml-auto">
                    {comp.performance_level === 'weak' ? 'Weak' : 'Needs Improvement'}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-amber-700 mt-4">
              We encourage you to review these competency areas through the BDA Learning System before your next attempt.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Exam Integrity Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 text-sm">Exam Content Protection</h4>
              <p className="text-sm text-blue-700 mt-1">
                To maintain exam integrity and validity, detailed question-level feedback,
                correct answers, and explanations are not provided for official certification exams.
                This policy aligns with international certification best practices (PMI, SHRM, ISACA).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      {passed ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Award className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 mb-1">What's Next?</h3>
                <p className="text-sm text-green-800">
                  Congratulations on earning your BDA-{certificationType} certification!
                  Your certification has been issued and you can view it in your dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <FileText className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">Next Steps</h3>
                <p className="text-sm text-blue-800">
                  Don't give up! Review the material and practice with mock exams.
                  You can retake the certification exam when you feel ready. Good luck!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => navigate('/individual/dashboard')} className="flex-1 min-w-[140px]">
          <Home className="h-4 w-4 mr-2" />Back to Dashboard
        </Button>
        <Button variant="outline" onClick={handleSendResultsEmail} disabled={sendingEmail} className="flex-1 min-w-[140px]">
          {sendingEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
          {sendingEmail ? 'Sending...' : 'Email My Results'}
        </Button>
        <Button onClick={() => navigate('/certification-exams')} className="flex-1 min-w-[140px]">
          View Certification Exams
        </Button>
      </div>
    </div>
  );
}

ExamResults.displayName = 'ExamResults';
