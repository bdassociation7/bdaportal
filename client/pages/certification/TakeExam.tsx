import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useQuiz, useCheckVoucherForQuiz, useVoucher } from '@/entities/quiz';
import { cn } from '@/shared/utils/cn';

/**
 * TakeExam Page
 * Interface for taking certification exams
 * TODO: Complete implementation with full quiz service integration
 */

export default function TakeExam() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch quiz and voucher
  const { data: quiz, isLoading } = useQuiz(examId || '');
  const { data: voucher } = useCheckVoucherForQuiz(examId || '', !!examId);
  const useVoucherMutation = useVoucher();

  // Initialize exam
  useEffect(() => {
    if (!quiz || !voucher) return;

    const initExam = async () => {
      // TODO: Call QuizService.startQuizAttempt to create attempt
      // For now, using placeholder
      const mockAttemptId = 'temp-attempt-' + Date.now();
      setAttemptId(mockAttemptId);
      setTimeRemaining(quiz.time_limit_minutes * 60);

      // Use voucher
      try {
        await useVoucherMutation.mutateAsync({
          voucher_code: voucher.code,
          quiz_id: quiz.id,
          attempt_id: mockAttemptId,
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: 'Failed to activate voucher',
          variant: 'destructive',
        });
        navigate(`/exam-applications/${quiz.id}`);
      }
    };

    initExam();
  }, [quiz?.id, voucher?.code]);

  // Timer
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Warn before leaving/refreshing page during exam
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if exam is in progress (has attemptId and not submitting)
      if (attemptId && !isSubmitting) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [attemptId, isSubmitting]);

  const handleAnswerSelect = (answerId: string) => {
    if (!currentQuestion) return;

    const questionId = currentQuestion.id;
    const currentAnswers = answers[questionId] || [];

    let newAnswers: string[];

    if (currentQuestion.question_type === 'multiple_choice' || currentQuestion.question_type === 'true_false') {
      newAnswers = [answerId];
    } else {
      // multi_select
      if (currentAnswers.includes(answerId)) {
        newAnswers = currentAnswers.filter((id) => id !== answerId);
      } else {
        newAnswers = [...currentAnswers, answerId];
      }
    }

    setAnswers({
      ...answers,
      [questionId]: newAnswers,
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const confirmed = await confirm({
      title: 'Submit Exam',
      description: 'Are you sure you want to submit your exam? This action cannot be undone.',
      confirmText: 'Submit',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      // TODO: Implement full submission logic with QuizService
      // 1. Save all answers to quiz_attempt_answers
      // 2. Calculate score
      // 3. Update quiz_attempts with score and passed status
      // 4. Navigate to results

      toast({
        title: 'Success',
        description: 'Exam submitted successfully',
      });

      navigate(`/exam-applications/results/${attemptId}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit exam',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Valid Voucher</h2>
            <p className="text-gray-600 mb-4">
              You need a valid voucher to take this exam.
            </p>
            <Button onClick={() => navigate(`/exam-applications/${quiz.id}`)}>
              Back to Exam Details
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = quiz.questions?.[currentQuestionIndex];
  const answeredCount = Object.keys(answers).filter((qId) => answers[qId]?.length > 0).length;
  const totalQuestions = quiz.questions?.length || 0;
  const isTimeRunningOut = timeRemaining < 300;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Answered: {answeredCount}/{totalQuestions}
              </div>
              <div
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-semibold',
                  isTimeRunningOut ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                )}
              >
                <Clock className="h-4 w-4" />
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {currentQuestion ? (
          <Card className="mb-6">
            <CardContent className="p-6">
              {/* Question */}
              <div className="mb-6">
                <div className="text-sm text-gray-500 mb-2">
                  Question {currentQuestionIndex + 1} • {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {currentQuestion.question_text}
                </h2>
              </div>

              {/* Answers */}
              <div className="space-y-3">
                {currentQuestion.question_type === 'multi_select' ? (
                  currentQuestion.answers.map((answer) => (
                    <div
                      key={answer.id}
                      className="flex items-start gap-3 p-4 rounded-lg border-2 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleAnswerSelect(answer.id)}
                    >
                      <Checkbox
                        id={answer.id}
                        checked={answers[currentQuestion.id]?.includes(answer.id)}
                        className="mt-0.5"
                      />
                      <Label htmlFor={answer.id} className="flex-1 cursor-pointer">
                        {answer.answer_text}
                      </Label>
                    </div>
                  ))
                ) : (
                  <RadioGroup
                    value={answers[currentQuestion.id]?.[0] || ''}
                    onValueChange={handleAnswerSelect}
                  >
                    {currentQuestion.answers.map((answer) => (
                      <div
                        key={answer.id}
                        className="flex items-start gap-3 p-4 rounded-lg border-2 hover:bg-gray-50"
                      >
                        <RadioGroupItem value={answer.id} id={answer.id} className="mt-0.5" />
                        <Label htmlFor={answer.id} className="flex-1 cursor-pointer">
                          {answer.answer_text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-12">No questions available</div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((p) => Math.max(0, p - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentQuestionIndex === totalQuestions - 1 ? (
            <Button onClick={handleSubmit} size="lg" disabled={isSubmitting}>
              <Send className="h-4 w-4 mr-2" />
              Submit Exam
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestionIndex((p) => Math.min(totalQuestions - 1, p + 1))}
              disabled={currentQuestionIndex === totalQuestions - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

TakeExam.displayName = 'TakeExam';
