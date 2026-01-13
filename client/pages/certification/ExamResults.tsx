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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/shared/utils/cn';
import { supabase } from '@/shared/config/supabase.config';

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
  };
}

export default function ExamResults() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

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

  // Fetch attempt answers with question info
  const { data: answers, isLoading: answersLoading } = useQuery({
    queryKey: ['certification-attempt-answers', attemptId],
    queryFn: async () => {
      if (!attemptId) throw new Error('No attempt ID');

      const { data, error } = await supabase
        .from('quiz_attempt_answers')
        .select(`
          *,
          question:quiz_questions(id, question_text, question_text_ar, points)
        `)
        .eq('attempt_id', attemptId);

      if (error) throw error;
      return (data || []) as AttemptAnswer[];
    },
    enabled: !!attemptId,
  });

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
  const isCP = certificationType === 'CP';
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

      {/* Questions Breakdown */}
      {answers && answers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Question Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {answers.map((answer, index) => (
              <div
                key={answer.id}
                className={cn(
                  'p-4 rounded-lg border-2',
                  answer.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {answer.is_correct ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-semibold text-gray-900">
                        Question {index + 1}
                      </span>
                    </div>
                    <p className="text-gray-700 line-clamp-2">
                      {answer.question?.question_text || 'Question text not available'}
                    </p>
                  </div>
                  <div className="text-sm font-semibold whitespace-nowrap">
                    {answer.points_earned}/{answer.question?.points || 1} pts
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => navigate('/individual/dashboard')} className="flex-1">
          <Home className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <Button onClick={() => navigate('/certification-exams')} className="flex-1">
          View Certification Exams
        </Button>
      </div>
    </div>
  );
}

ExamResults.displayName = 'ExamResults';
