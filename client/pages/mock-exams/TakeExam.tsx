import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Send,
} from 'lucide-react';
import { useStartExam, useSubmitAnswer, useCompleteExam } from '@/entities/mock-exam';
import type { ExamSession, QuestionWithAnswers } from '@/entities/mock-exam';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/utils/cn';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * TakeExam Page
 * Active exam-taking interface with timer and navigation
 */

const translations = {
  en: {
    // Loading/Error
    loadingExam: 'Loading exam...',
    error: 'Error',
    failedToStart: 'Failed to start exam. Please try again.',
    failedToSubmit: 'Failed to submit exam. Please try again.',
    // Header
    questionOf: 'Question',
    of: 'of',
    answered: 'answered',
    // Question
    multipleAnswersPossible: 'Multiple answers possible',
    // Navigation
    previous: 'Previous',
    next: 'Next',
    submitting: 'Submitting...',
    submitExam: 'Submit Exam',
    // Navigator
    questionNavigator: 'Question Navigator',
    answeredLabel: 'Answered',
    notAnswered: 'Not answered',
  },
  ar: {
    // Loading/Error
    loadingExam: 'جارٍ تحميل الامتحان...',
    error: 'خطأ',
    failedToStart: 'فشل في بدء الامتحان. يرجى المحاولة مرة أخرى.',
    failedToSubmit: 'فشل في تقديم الامتحان. يرجى المحاولة مرة أخرى.',
    // Header
    questionOf: 'السؤال',
    of: 'من',
    answered: 'مجاب',
    // Question
    multipleAnswersPossible: 'إجابات متعددة ممكنة',
    // Navigation
    previous: 'السابق',
    next: 'التالي',
    submitting: 'جارٍ التقديم...',
    submitExam: 'تقديم الامتحان',
    // Navigator
    questionNavigator: 'مستعرض الأسئلة',
    answeredLabel: 'مجاب',
    notAnswered: 'غير مجاب',
  }
};

export default function TakeExam() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { language } = useLanguage();
  const texts = translations[language];

  // Determine base path for navigation (ECP vs non-ECP routes)
  const basePath = location.pathname.startsWith('/ecp/') ? '/ecp/mock-exams' : '/mock-exams';

  const [session, setSession] = useState<ExamSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startExamMutation = useStartExam();
  const submitAnswerMutation = useSubmitAnswer();
  const completeExamMutation = useCompleteExam();

  // Start exam on mount
  useEffect(() => {
    if (!examId) return;

    const initExam = async () => {
      const result = await startExamMutation.mutateAsync({ exam_id: examId });
      if (result.error || !result.data) {
        toast({
          title: texts.error,
          description: texts.failedToStart,
          variant: 'destructive',
        });
        navigate(basePath);
        return;
      }

      setSession(result.data);
      setTimeRemaining(result.data.duration_minutes * 60);
      setAnswers(result.data.answers);
    };

    initExam();
  }, [examId]);

  // Timer countdown
  useEffect(() => {
    if (!session || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - auto submit
          handleCompleteExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, timeRemaining]);

  // Warn before leaving/refreshing page during exam
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if exam is in progress (has session and not submitting)
      if (session && !isSubmitting) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session, isSubmitting]);

  const currentQuestion = session?.questions[currentQuestionIndex];

  // Get localized text based on exam language
  const getQuestionText = (question: QuestionWithAnswers) => {
    // Use exam language, not UI language, for question content
    const examLanguage = session?.exam?.language || 'en';
    if (examLanguage === 'ar' && question.question_text_ar) {
      return question.question_text_ar;
    }
    return question.question_text;
  };

  const getAnswerText = (answer: { answer_text: string; answer_text_ar?: string | null }) => {
    const examLanguage = session?.exam?.language || 'en';
    if (examLanguage === 'ar' && answer.answer_text_ar) {
      return answer.answer_text_ar;
    }
    return answer.answer_text;
  };

  // Handle answer selection
  const handleAnswerSelect = (answerId: string) => {
    if (!currentQuestion) return;

    const questionId = currentQuestion.id;
    const currentAnswers = answers[questionId] || [];

    let newAnswers: string[];

    if (currentQuestion.question_type === 'single_choice') {
      // Single choice: replace
      newAnswers = [answerId];
    } else {
      // Multiple choice: toggle
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

    // Submit answer to backend
    if (session) {
      submitAnswerMutation.mutate({
        attempt_id: session.attempt_id,
        question_id: questionId,
        selected_answer_ids: newAnswers,
      });
    }
  };

  // Navigation
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < (session?.questions.length || 0)) {
      setCurrentQuestionIndex(index);
    }
  };

  const goNext = () => goToQuestion(currentQuestionIndex + 1);
  const goPrevious = () => goToQuestion(currentQuestionIndex - 1);

  // Complete exam
  const handleCompleteExam = useCallback(async () => {
    if (!session || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const result = await completeExamMutation.mutateAsync(session.attempt_id);

      if (result.error || !result.data) {
        toast({
          title: texts.error,
          description: texts.failedToSubmit,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Navigate to results
      navigate(`${basePath}/results/${session.attempt_id}`);
    } catch (error) {
      console.error('Error completing exam:', error);
      toast({
        title: texts.error,
        description: texts.failedToSubmit,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  }, [session, isSubmitting, completeExamMutation, navigate, toast]);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress
  const answeredCount = Object.keys(answers).filter(
    (qId) => answers[qId] && answers[qId].length > 0
  ).length;
  const totalQuestions = session?.questions.length || 0;

  if (!session || !currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">{texts.loadingExam}</p>
        </div>
      </div>
    );
  }

  const isTimeRunningOut = timeRemaining < 300; // less than 5 minutes

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with timer */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {session.exam.title}
              </h1>
              <p className="text-sm text-gray-600">
                {texts.questionOf} {currentQuestionIndex + 1} {texts.of} {totalQuestions}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Progress */}
              <div className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">{answeredCount}</span> /{' '}
                {totalQuestions} {texts.answered}
              </div>

              {/* Timer */}
              <div
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold',
                  isTimeRunningOut
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                )}
              >
                <Clock
                  className={cn('h-5 w-5', isTimeRunningOut && 'animate-pulse')}
                />
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Question */}
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                  {currentQuestionIndex + 1}
                </span>
                <div className="flex-1">
                  <p className="text-lg font-medium text-gray-900 leading-relaxed">
                    {getQuestionText(currentQuestion)}
                  </p>
                  {currentQuestion.question_type === 'multiple_choice' && (
                    <p className="mt-2 text-sm text-blue-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {texts.multipleAnswersPossible}
                    </p>
                  )}
                </div>
              </div>

              {/* Answers */}
              <div className="space-y-3">
                {currentQuestion.answers.map((answer) => {
                  const isSelected = (answers[currentQuestion.id] || []).includes(
                    answer.id
                  );

                  return (
                    <button
                      key={answer.id}
                      onClick={() => handleAnswerSelect(answer.id)}
                      className={cn(
                        'w-full text-left p-4 rounded-lg border-2 transition-all',
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 transition-all',
                            isSelected
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300 bg-white'
                          )}
                        >
                          {isSelected && (
                            <CheckCircle2 className="h-full w-full text-white" />
                          )}
                        </div>
                        <span className="text-gray-900">{getAnswerText(answer)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={goPrevious}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                {texts.previous}
              </Button>

              {currentQuestionIndex === totalQuestions - 1 ? (
                <Button
                  onClick={handleCompleteExam}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {texts.submitting}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {texts.submitExam}
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={goNext}>
                  {texts.next}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar - Question Navigator */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border bg-white p-4 shadow-sm sticky top-24">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {texts.questionNavigator}
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {session.questions.map((question, index) => {
                  const isAnswered =
                    answers[question.id] && answers[question.id].length > 0;
                  const isCurrent = index === currentQuestionIndex;

                  return (
                    <button
                      key={question.id}
                      onClick={() => goToQuestion(index)}
                      className={cn(
                        'aspect-square rounded text-sm font-medium transition-all',
                        isCurrent &&
                          'ring-2 ring-blue-500 ring-offset-2 scale-110',
                        isAnswered && !isCurrent && 'bg-blue-600 text-white',
                        !isAnswered && !isCurrent && 'bg-gray-100 text-gray-600',
                        isCurrent && isAnswered && 'bg-blue-600 text-white',
                        isCurrent && !isAnswered && 'bg-gray-200 text-gray-900'
                      )}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-600" />
                  <span className="text-gray-600">{texts.answeredLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300" />
                  <span className="text-gray-600">{texts.notAnswered}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

TakeExam.displayName = 'TakeExam';
