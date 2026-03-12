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
 * Display certification exam results with real data from database
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

interface AttemptAnswer {
  id: string;
  question_id: string;
  selected_answer_ids: string[];
  is_correct: boolean;
  points_earned: number;
  question: {
    id: string;
    question_text: string;
    question_text_ar: string | null;
    points: number;
    bock_domain: string | null;
    competency_name: string | null;
    competency_section: string | null;
  };
}

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
        .select(`
          *,
          quiz:quizzes(id, title, title_ar, certification_type, passing_score_percentage)
        `)
        .eq('id', attemptId)
        .single();

      if (error) throw error;
      return data as AttemptWithQuiz;
    },
    enabled: !!attemptId,
  });

  // Fetch attempt answers with question info (including competency fields for feedback)
  const { data: answers, isLoading: answersLoading } = useQuery({
    queryKey: ['certification-attempt-answers', attemptId],
    queryFn: async () => {
      if (!attemptId) throw new Error('No attempt ID');

      const { data, error } = await supabase
        .from('quiz_attempt_answers')
        .select(`
          *,
          question:quiz_questions(id, question_text, question_text_ar, points, bock_domain, competency_name, competency_section)
        `)
        .eq('attempt_id', attemptId);

      if (error) throw error;
      return (data || []) as AttemptAnswer[];
    },
    enabled: !!attemptId,
  });

  // Calculate weak competency areas for failed candidates (qualitative only, no numeric data)
  const weakCompetencyAreas: string[] = React.useMemo(() => {
    if (!answers || answers.length === 0) return [];

    // Group answers by competency_name
    const competencyMap = new Map<string, { correct: number; total: number }>();

    answers.forEach((answer) => {
      const competency = answer.question?.competency_name;
      if (!competency) return; // Skip if no competency assigned

      const current = competencyMap.get(competency) || { correct: 0, total: 0 };
      current.total += 1;
      if (answer.is_correct) {
        current.correct += 1;
      }
      competencyMap.set(competency, current);
    });

    // Find competencies where performance is below target (< 50%)
    // Return only the names, no numeric data
    return Array.from(competencyMap.entries())
      .filter(([_, stats]) => {
        const percentage = (stats.correct / stats.total) * 100;
        return percentage < 50; // Below target threshold
      })
      .map(([competency]) => competency)
      .sort(); // Alphabetical order
  }, [answers]);

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
              ? `Congratulations! You have successfully passed the BDA-${certType}™ certification exam with a score of ${score}%. Your certification has been issued and will be available for download within 14 days.`
              : `Thank you for taking the BDA-${certType}™ certification exam. Your score of ${score}% did not meet the passing requirement of ${passingScore}%. We encourage you to review the competency areas and retake when ready.`,
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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (attemptLoading || answersLoading) {
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
        <Button onClick={() => navigate('/certification-exams')}>
          Back to Certification Exams
        </Button>
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
        <Button onClick={() => navigate('/certification-exams')}>
          Back to Certification Exams
        </Button>
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

  // Calculate time spent if not stored
  let timeSpent = attempt.time_spent_minutes;
  if (!timeSpent && attempt.started_at && attempt.completed_at) {
    const start = new Date(attempt.started_at).getTime();
    const end = new Date(attempt.completed_at).getTime();
    timeSpent = Math.round((end - start) / 1000 / 60);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div
        className={cn(
          'rounded-lg p-6 text-white',
          passed
            ? 'bg-gradient-to-r from-green-600 to-green-700'
            : 'bg-gradient-to-r from-red-600 to-red-700'
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 mb-3">
              {passed ? (
                <>
                  <CheckCircle2 className="h-8 w-8" />
                  {isSCP ? 'Outstanding Achievement!' : 'Congratulations!'}
                </>
              ) : (
                <>
                  <XCircle className="h-8 w-8" />
                  {isSCP ? 'Thank you for completing the BDA-SCP™ Exam.' : 'Thank you for completing the BDA-CP™ Exam.'}
                </>
              )}
            </h1>
            <p className="text-xl font-semibold mb-2">
              {passed
                ? isSCP
                  ? 'You have earned the BDA-SCP™ Senior Certified Professional Credential.'
                  : 'You have successfully earned the BDA-CP™ Certification.'
                : isSCP
                  ? 'Unfortunately, the required passing score was not achieved.'
                  : 'Unfortunately, you did not meet the passing score this time.'}
            </p>
            <p className="text-base opacity-95">
              {passed
                ? isSCP
                  ? 'This designation reflects your advanced expertise, strategic leadership ability, and mastery of the BDA BoCK® competencies at a senior professional level.'
                  : 'You are now recognized as a BDA Certified Professional in Business Development. Your achievement demonstrates your capability across the BDA BoCK® competencies and your commitment to professional excellence in business development.'
                : isSCP
                  ? 'The SCP credential represents advanced business development expertise. We encourage you to revisit the BDA Learning System modules and strengthen your strategic competency areas.'
                  : 'We encourage you to continue developing your competencies. You may review your areas of improvement through the BDA Learning System and retake the exam when ready.'}
            </p>
            {passed && (
              <p className="text-base opacity-95 mt-2">
                Your {isSCP ? 'certificate and verification link are now accessible' : 'digital certificate and verification link are now available'} in your Certification Portal.
              </p>
            )}
            {!passed && (
              <p className="text-base opacity-95 mt-2">
                {isSCP
                  ? 'Next exam eligibility and voucher updates will appear in your Certification Portal.'
                  : 'Your voucher status and next available attempt will appear in your portal.'}
              </p>
            )}
          </div>
          <div className="text-6xl font-bold">{score}%</div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Target className="h-4 w-4" />
              <div className="text-sm">Your Score</div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{score}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Target className="h-4 w-4" />
              <div className="text-sm">Passing Score</div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{passingScore}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <FileText className="h-4 w-4" />
              <div className="text-sm">Points</div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {totalPointsEarned}/{totalPointsPossible}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Clock className="h-4 w-4" />
              <div className="text-sm">Time Spent</div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {timeSpent ?? '-'} min
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Exam</div>
            <div className="text-lg font-semibold text-gray-900">
              {attempt.quiz?.title || 'Certification Exam'}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">Certification Type</div>
            <Badge
              className={
                attempt.quiz?.certification_type === 'CP'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-purple-100 text-purple-800'
              }
            >
              BDA-{attempt.quiz?.certification_type}™
            </Badge>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">Completed</div>
            <div className="text-gray-900">{formatDate(attempt.completed_at)}</div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <Badge
              variant="outline"
              className={cn(
                'border',
                passed
                  ? 'text-green-700 bg-green-100 border-green-300'
                  : 'text-red-700 bg-red-100 border-red-300'
              )}
            >
              {passed ? 'PASSED' : 'NOT PASSED'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Competency Feedback - Only shown to failed candidates */}
      {!passed && weakCompetencyAreas.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-900">Areas for Improvement</CardTitle>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Based on your exam performance, improvement is recommended in the following competency areas:
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {weakCompetencyAreas.map((competency) => (
                <li
                  key={competency}
                  className="flex items-center gap-2 text-amber-800"
                >
                  <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                  <span className="font-medium">{competency}</span>
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
                This policy aligns with international certification best practices.
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
                <p className="text-sm text-green-800 mb-3">
                  Congratulations on earning your BDA-{attempt.quiz?.certification_type}™ certification!
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
          <Home className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <Button
          variant="outline"
          onClick={handleSendResultsEmail}
          disabled={sendingEmail}
          className="flex-1 min-w-[140px]"
        >
          {sendingEmail ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Mail className="h-4 w-4 mr-2" />
          )}
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
