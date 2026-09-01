import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  FileText,
  Loader2,
  AlertCircle,
  BarChart3,
  User,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/shared/utils/cn';
import { supabase } from '@/shared/config/supabase.config';

/**
 * CandidateExamReport - Admin view
 * Full detailed report for a candidate's exam attempt
 * Includes: candidate info, domain/competency breakdown, question-level review
 */

interface ExamReport {
  attempt: {
    id: string;
    started_at: string;
    completed_at: string;
    score: number | null;
    passed: boolean | null;
    total_points_earned: number | null;
    total_points_possible: number | null;
    time_spent_minutes: number | null;
    passing_score_percentage: number;
  };
  candidate: {
    user_id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  exam: {
    quiz_id: string;
    title: string;
    title_ar: string | null;
    certification_type: string;
    exam_language: string | null;
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
  question_details: Array<{
    order_index: number;
    question_id: string;
    question_text: string;
    question_text_ar: string | null;
    competency_name: string | null;
    competency_section: string | null;
    points: number;
    is_answered: boolean;
    is_correct: boolean | null;
    points_earned: number | null;
    time_spent_seconds: number | null;
    selected_answer_ids: string[] | null;
    correct_answer_ids: string[] | null;
    answers: Array<{
      id: string;
      answer_text: string;
      answer_text_ar: string | null;
      is_correct: boolean;
    }> | null;
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
  strong: { label: 'Strong', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', barColor: 'bg-green-500', icon: TrendingUp },
  adequate: { label: 'Adequate', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', barColor: 'bg-blue-500', icon: Minus },
  needs_improvement: { label: 'Needs Improvement', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', barColor: 'bg-amber-500', icon: TrendingDown },
  weak: { label: 'Weak', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', barColor: 'bg-red-500', icon: TrendingDown },
};

const DOMAIN_LABELS: Record<string, string> = {
  behavioral: 'Behavioural Domain',
  behavioural: 'Behavioural Domain',
  knowledge_based: 'Knowledge Domain',
  untagged: 'General',
};

export default function CandidateExamReport() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [showQuestions, setShowQuestions] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['admin-exam-report', attemptId],
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number | null, startedAt?: string, completedAt?: string) => {
    let mins = minutes;
    if (!mins && startedAt && completedAt) {
      const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
      mins = Math.round(ms / 60000);
    }
    if (!mins) return '-';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading candidate report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Report</AlertTitle>
          <AlertDescription>
            {(error as any)?.message || 'Unable to load the exam report. The attempt may not exist.'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate('/admin/exam-scheduling')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Exam Scheduling
        </Button>
      </div>
    );
  }

  const { attempt, candidate, exam, domain_performance, competency_performance, question_details, summary_stats } = report;
  const passed = attempt.passed ?? false;
  const score = attempt.score ?? 0;
  const passingScore = attempt.passing_score_percentage ?? 70;

  const behaviouralCompetencies = competency_performance?.filter(
    c => c.competency_section === 'behavioral' || c.competency_section === 'behavioural'
  ) || [];
  const knowledgeCompetencies = competency_performance?.filter(
    c => c.competency_section === 'knowledge_based'
  ) || [];

  const candidateName = [candidate.first_name, candidate.last_name].filter(Boolean).join(' ') || candidate.email;
  const isArabicExam = exam.exam_language?.toLowerCase() === 'ar';

  const questionDisplayText = (question: ExamReport['question_details'][number]) => {
    const preferred = isArabicExam ? question.question_text_ar : question.question_text;
    const fallback = isArabicExam ? question.question_text : question.question_text_ar;
    return preferred?.trim() || fallback?.trim() || 'Question text is unavailable.';
  };

  const answerDisplayText = (answer: NonNullable<ExamReport['question_details'][number]['answers']>[number]) => {
    const preferred = isArabicExam ? answer.answer_text_ar : answer.answer_text;
    const fallback = isArabicExam ? answer.answer_text : answer.answer_text_ar;
    return preferred?.trim() || fallback?.trim() || 'Answer text is unavailable.';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6 px-4">
      {/* Back Button */}
      <Button variant="outline" size="sm" onClick={() => navigate('/admin/exam-scheduling')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Exam Scheduling
      </Button>

      {/* Header */}
      <div className={cn('rounded-xl p-6 text-white', passed ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-red-600 to-red-700')}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User className="h-5 w-5 opacity-80" />
              <span className="text-sm opacity-80">Candidate Report — Admin View</span>
            </div>
            <h1 className="text-2xl font-bold mb-1">{candidateName}</h1>
            <p className="text-sm opacity-80">{candidate.email}</p>
            <div className="flex items-center gap-3 mt-3">
              <Badge className="bg-white/20 text-white border-white/30">BDA-{exam.certification_type}</Badge>
              {exam.exam_language && <Badge className="bg-white/20 text-white border-white/30">{exam.exam_language.toUpperCase()}</Badge>}
              <Badge className={cn('border', passed ? 'bg-green-500 text-white border-green-400' : 'bg-red-500 text-white border-red-400')}>
                {passed ? '✓ PASSED' : '✗ NOT PASSED'}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold">{score}%</div>
            <div className="text-sm opacity-80 mt-1">Passing: {passingScore}%</div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: Target, label: 'Score', value: `${score}%` },
          { icon: FileText, label: 'Points', value: `${attempt.total_points_earned ?? 0}/${attempt.total_points_possible ?? 0}` },
          { icon: CheckCircle2, label: 'Correct', value: `${summary_stats?.total_correct ?? 0}` },
          { icon: XCircle, label: 'Incorrect', value: `${summary_stats?.total_incorrect ?? 0}` },
          { icon: Clock, label: 'Duration', value: formatDuration(attempt.time_spent_minutes, attempt.started_at, attempt.completed_at) },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Icon className="h-4 w-4" />
                <div className="text-xs">{label}</div>
              </div>
              <div className="text-xl font-bold text-gray-900">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attempt Info */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" />Attempt Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><div className="text-gray-500 mb-1">Exam</div><div className="font-medium">{exam.title}</div></div>
          <div><div className="text-gray-500 mb-1">Attempt ID</div><div className="font-mono text-xs text-gray-600">{attempt.id}</div></div>
          <div><div className="text-gray-500 mb-1">Started</div><div>{formatDate(attempt.started_at)}</div></div>
          <div><div className="text-gray-500 mb-1">Completed</div><div>{attempt.completed_at ? formatDate(attempt.completed_at) : 'In Progress'}</div></div>
          <div><div className="text-gray-500 mb-1">Questions Drawn</div><div className="font-medium">{summary_stats?.total_questions_drawn ?? 0}</div></div>
          <div><div className="text-gray-500 mb-1">Answered</div><div className="font-medium">{summary_stats?.total_answered ?? 0}</div></div>
          <div><div className="text-gray-500 mb-1">Unanswered</div><div className="font-medium text-amber-600">{summary_stats?.total_unanswered ?? 0}</div></div>
          <div><div className="text-gray-500 mb-1">Pass Threshold</div><div className="font-medium">{passingScore}%</div></div>
        </CardContent>
      </Card>

      {/* Domain Performance */}
      {(domain_performance?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <CardTitle>Performance by Domain</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {domain_performance.map((domain) => {
              const label = DOMAIN_LABELS[domain.domain] || domain.domain;
              const pct = domain.score_percentage ?? 0;
              const isGood = pct >= passingScore;
              return (
                <div key={domain.domain} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-800">{label}</div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">{domain.correct_answers} correct / {domain.total_questions} total</span>
                      <span className="text-gray-500">{domain.points_earned}/{domain.points_possible} pts</span>
                      <span className={cn('font-bold text-lg', isGood ? 'text-green-600' : 'text-red-600')}>{pct}%</span>
                    </div>
                  </div>
                  <div className="relative w-full bg-gray-100 rounded-full h-4">
                    <div className={cn('h-4 rounded-full transition-all', isGood ? 'bg-green-500' : 'bg-red-400')} style={{ width: `${Math.min(pct, 100)}%` }} />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400" style={{ left: `${passingScore}%` }} title={`Passing: ${passingScore}%`} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0%</span>
                    <span>Passing threshold: {passingScore}%</span>
                    <span>100%</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Competency Breakdown - Behavioural */}
      {behaviouralCompetencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Behavioural Domain — Competency Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {behaviouralCompetencies.map((comp) => {
                const config = PERFORMANCE_CONFIG[comp.performance_level];
                const Icon = config.icon;
                return (
                  <div key={comp.competency_name} className={cn('flex items-center justify-between p-3 rounded-lg border', config.bg, config.border)}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Icon className={cn('h-4 w-4 flex-shrink-0', config.color)} />
                      <span className="font-medium text-sm text-gray-800 truncate">{comp.competency_name}</span>
                      <Badge variant="outline" className={cn('text-xs ml-2 flex-shrink-0', config.color, config.border)}>{config.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm flex-shrink-0 ml-4">
                      <span className="text-gray-500 text-xs">{comp.correct_answers}/{comp.total_questions}</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className={cn('h-2 rounded-full', config.barColor)} style={{ width: `${Math.min(comp.score_percentage, 100)}%` }} />
                      </div>
                      <span className={cn('font-bold w-12 text-right', config.color)}>{comp.score_percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competency Breakdown - Knowledge */}
      {knowledgeCompetencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Knowledge Domain — Competency Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {knowledgeCompetencies.map((comp) => {
                const config = PERFORMANCE_CONFIG[comp.performance_level];
                const Icon = config.icon;
                return (
                  <div key={comp.competency_name} className={cn('flex items-center justify-between p-3 rounded-lg border', config.bg, config.border)}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Icon className={cn('h-4 w-4 flex-shrink-0', config.color)} />
                      <span className="font-medium text-sm text-gray-800 truncate">{comp.competency_name}</span>
                      <Badge variant="outline" className={cn('text-xs ml-2 flex-shrink-0', config.color, config.border)}>{config.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm flex-shrink-0 ml-4">
                      <span className="text-gray-500 text-xs">{comp.correct_answers}/{comp.total_questions}</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className={cn('h-2 rounded-full', config.barColor)} style={{ width: `${Math.min(comp.score_percentage, 100)}%` }} />
                      </div>
                      <span className={cn('font-bold w-12 text-right', config.color)}>{comp.score_percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question-Level Review (Admin Only) */}
      {(question_details?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  Question-Level Review
                  <Badge variant="outline" className="text-xs ml-2 text-orange-600 border-orange-300 bg-orange-50">Admin Only</Badge>
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">Full question breakdown with correct answers — not visible to candidates</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowQuestions(!showQuestions)}>
                {showQuestions ? <><ChevronUp className="h-4 w-4 mr-1" />Hide</> : <><ChevronDown className="h-4 w-4 mr-1" />Show All</>}
              </Button>
            </div>
          </CardHeader>
          {showQuestions && (
            <CardContent className="space-y-3">
              {question_details.map((q) => {
                const isExpanded = expandedQuestion === q.question_id;
                const isCorrect = q.is_correct;
                const isAnswered = q.is_answered;

                return (
                  <div key={q.question_id} className={cn('border rounded-lg overflow-hidden', isCorrect ? 'border-green-200' : isAnswered ? 'border-red-200' : 'border-gray-200')}>
                    <button
                      className={cn('w-full text-left p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors', isCorrect ? 'bg-green-50' : isAnswered ? 'bg-red-50' : 'bg-gray-50')}
                      onClick={() => setExpandedQuestion(isExpanded ? null : q.question_id)}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {!isAnswered ? (
                          <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs text-white font-bold">-</span>
                          </div>
                        ) : isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500 font-medium">Q{q.order_index + 1}</span>
                          {q.competency_name && (
                            <Badge variant="outline" className="text-xs">{q.competency_name}</Badge>
                          )}
                          {q.time_spent_seconds != null && (
                            <span className="text-xs text-gray-400">{q.time_spent_seconds}s</span>
                          )}
                          <span className="text-xs text-gray-400 ml-auto">{q.points_earned ?? 0}/{q.points} pts</span>
                        </div>
                        <p
                          dir={isArabicExam ? 'rtl' : 'ltr'}
                          className={cn('text-sm text-gray-800 line-clamp-2', isArabicExam && 'text-right')}
                        >
                          {questionDisplayText(q)}
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </button>

                    {isExpanded && q.answers && (
                      <div className="p-4 border-t bg-white space-y-2">
                        <p
                          dir={isArabicExam ? 'rtl' : 'ltr'}
                          className={cn('text-sm font-medium text-gray-700 mb-3', isArabicExam && 'text-right')}
                        >
                          {questionDisplayText(q)}
                        </p>
                        {q.answers.map((answer) => {
                          const wasSelected = q.selected_answer_ids?.includes(answer.id);
                          const isCorrectAnswer = answer.is_correct;
                          return (
                            <div
                              key={answer.id}
                              className={cn(
                                'flex items-start gap-2 p-2 rounded text-sm',
                                isCorrectAnswer && wasSelected ? 'bg-green-100 border border-green-300' :
                                isCorrectAnswer ? 'bg-green-50 border border-green-200' :
                                wasSelected ? 'bg-red-100 border border-red-300' :
                                'bg-gray-50 border border-gray-200'
                              )}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                {isCorrectAnswer ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : wasSelected ? (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-gray-300" />
                                )}
                              </div>
                              <span
                                dir={isArabicExam ? 'rtl' : 'ltr'}
                                className={cn(
                                  isCorrectAnswer ? 'text-green-800 font-medium' : wasSelected ? 'text-red-800' : 'text-gray-700',
                                  isArabicExam && 'text-right flex-1'
                                )}
                              >
                                {answerDisplayText(answer)}
                                {wasSelected && !isCorrectAnswer && <span className="ml-2 text-xs text-red-500">(Candidate's answer)</span>}
                                {isCorrectAnswer && <span className="ml-2 text-xs text-green-600">(Correct answer)</span>}
                              </span>
                            </div>
                          );
                        })}
                        {!isAnswered && (
                          <p className="text-xs text-gray-400 italic mt-2">This question was not answered by the candidate.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate('/admin/exam-scheduling')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Exam Scheduling
        </Button>
      </div>
    </div>
  );
}

CandidateExamReport.displayName = 'CandidateExamReport';
