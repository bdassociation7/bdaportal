import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useStartExam, useSubmitAnswer, useCompleteExam } from '@/entities/mock-exam';
import type { ExamSession, QuestionWithAnswers } from '@/entities/mock-exam';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/utils/cn';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConfirm } from '@/contexts/ConfirmDialogContext';

/**
 * TakeExam Page
 * Active exam-taking interface with timer and bottom sticky navigator
 */

const translations = {
  en: {
    loadingExam: 'Loading exam...',
    error: 'Error',
    failedToStart: 'Failed to start exam. Please try again.',
    failedToSubmit: 'Failed to submit exam. Please try again.',
    questionOf: 'Question',
    of: 'of',
    answered: 'answered',
    multipleAnswersPossible: 'Multiple answers possible',
    previous: 'Previous',
    next: 'Next',
    submitting: 'Submitting...',
    submitExam: 'Submit Exam',
    questionNavigator: 'Question Navigator',
    answeredLabel: 'Answered',
    notAnswered: 'Not answered',
    current: 'Current',
    confirmSubmitTitle: 'Submit Exam?',
    confirmSubmitComplete: 'Are you sure you want to submit your exam? This action cannot be undone.',
    confirmSubmitIncomplete: "You haven't answered all questions. Submitting now will end your exam.",
    unansweredQuestions: 'Unanswered questions',
    submitAnyway: 'Submit Anyway',
    cancel: 'Cancel',
    showNavigator: 'Show Navigator',
    hideNavigator: 'Hide Navigator',
  },
  ar: {
    loadingExam: 'جارٍ تحميل الامتحان...',
    error: 'خطأ',
    failedToStart: 'فشل في بدء الامتحان. يرجى المحاولة مرة أخرى.',
    failedToSubmit: 'فشل في تقديم الامتحان. يرجى المحاولة مرة أخرى.',
    questionOf: 'السؤال',
    of: 'من',
    answered: 'مجاب',
    multipleAnswersPossible: 'إجابات متعددة ممكنة',
    previous: 'السابق',
    next: 'التالي',
    submitting: 'جارٍ التقديم...',
    submitExam: 'تقديم الامتحان',
    questionNavigator: 'مستعرض الأسئلة',
    answeredLabel: 'مجاب',
    notAnswered: 'غير مجاب',
    current: 'الحالي',
    confirmSubmitTitle: 'تقديم الامتحان؟',
    confirmSubmitComplete: 'هل أنت متأكد من أنك تريد تقديم الامتحان؟ لا يمكن التراجع عن هذا الإجراء.',
    confirmSubmitIncomplete: 'لم تجب على جميع الأسئلة. سيؤدي التقديم الآن إلى إنهاء الامتحان.',
    unansweredQuestions: 'أسئلة غير مجابة',
    submitAnyway: 'تقديم على أي حال',
    cancel: 'إلغاء',
    showNavigator: 'عرض المستعرض',
    hideNavigator: 'إخفاء المستعرض',
  }
};

export default function TakeExam() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { language } = useLanguage();
  const texts = translations[language];

  const basePath = location.pathname.startsWith('/ecp/') ? '/ecp/mock-exams' : '/mock-exams';

  const [session, setSession] = useState<ExamSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [navigatorExpanded, setNavigatorExpanded] = useState(false);

  const startExamMutation = useStartExam();
  const submitAnswerMutation = useSubmitAnswer();
  const completeExamMutation = useCompleteExam();

  // Hide sidebar for full-screen exam mode
  useEffect(() => {
    document.body.classList.add('exam-fullscreen-mode');
    return () => {
      document.body.classList.remove('exam-fullscreen-mode');
    };
  }, []);

  // Start exam on mount
  useEffect(() => {
    if (!examId) return;

    const initExam = async () => {
      try {
        const result = await startExamMutation.mutateAsync({ exam_id: examId });
        if (result.error || !result.data) {
          toast({
            title: texts.error,
            description: result.error?.message || texts.failedToStart,
            variant: 'destructive',
          });
          navigate(basePath);
          return;
        }

        if (!result.data.questions || result.data.questions.length === 0) {
          toast({
            title: texts.error,
            description: 'This exam has no questions available.',
            variant: 'destructive',
          });
          navigate(basePath);
          return;
        }

        setSession(result.data);
        setTimeRemaining(result.data.duration_minutes * 60);
        setAnswers(result.data.answers);
      } catch (error: any) {
        console.error('Error starting exam:', error);
        toast({
          title: texts.error,
          description: error?.message || texts.failedToStart,
          variant: 'destructive',
        });
        navigate(basePath);
      }
    };

    initExam();
  }, [examId]);

  // Timer countdown
  useEffect(() => {
    if (!session || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleCompleteExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, timeRemaining]);

  // Warn before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (session && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session, isSubmitting]);

  const currentQuestion = session?.questions[currentQuestionIndex];

  const getQuestionText = (question: QuestionWithAnswers) => {
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

  const handleAnswerSelect = (answerId: string) => {
    if (!currentQuestion) return;

    const questionId = currentQuestion.id;
    const currentAnswers = answers[questionId] || [];

    let newAnswers: string[];

    if (currentQuestion.question_type === 'single_choice') {
      newAnswers = [answerId];
    } else {
      if (currentAnswers.includes(answerId)) {
        newAnswers = currentAnswers.filter((id) => id !== answerId);
      } else {
        newAnswers = [...currentAnswers, answerId];
      }
    }

    setAnswers({ ...answers, [questionId]: newAnswers });

    if (session) {
      submitAnswerMutation.mutate({
        attempt_id: session.attempt_id,
        question_id: questionId,
        selected_answer_ids: newAnswers,
      });
    }
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < (session?.questions.length || 0)) {
      setCurrentQuestionIndex(index);
      setNavigatorExpanded(false);
    }
  };

  const goNext = () => goToQuestion(currentQuestionIndex + 1);
  const goPrevious = () => goToQuestion(currentQuestionIndex - 1);

  const answeredCount = Object.keys(answers).filter(
    (qId) => answers[qId] && answers[qId].length > 0
  ).length;
  const totalQuestions = session?.questions.length || 0;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
  }, [session, isSubmitting, completeExamMutation, navigate, toast, basePath, texts]);

  const handleSubmitWithConfirmation = useCallback(async () => {
    if (!session || isSubmitting) return;

    const unansweredCount = totalQuestions - answeredCount;
    const hasUnanswered = unansweredCount > 0;

    const confirmed = await confirm({
      title: texts.confirmSubmitTitle,
      description: hasUnanswered
        ? `${texts.confirmSubmitIncomplete}\n\n${texts.unansweredQuestions}: ${unansweredCount}`
        : texts.confirmSubmitComplete,
      confirmText: hasUnanswered ? texts.submitAnyway : texts.submitExam,
      cancelText: texts.cancel,
      variant: hasUnanswered ? 'destructive' : 'default',
    });

    if (confirmed) {
      await handleCompleteExam();
    }
  }, [session, isSubmitting, totalQuestions, answeredCount, confirm, texts, handleCompleteExam]);

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

  const isTimeRunningOut = timeRemaining < 300;
  const isRTL = session.exam.language === 'ar';
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ paddingBottom: navigatorExpanded ? '280px' : '80px' }}
    >
      {/* ── Top Header ── */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: title + progress */}
            <div className="min-w-0 flex-1">
              <h1
                className="text-base font-bold text-gray-900 truncate"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {session.exam.language === 'ar' && session.exam.title_ar
                  ? session.exam.title_ar
                  : session.exam.title}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {texts.questionOf} {currentQuestionIndex + 1} {texts.of} {totalQuestions}
                &nbsp;·&nbsp;
                <span className="font-medium text-gray-700">{answeredCount}</span> / {totalQuestions} {texts.answered}
              </p>
            </div>

            {/* Right: timer + submit */}
            <div className={cn('flex items-center gap-3', isRTL ? 'mr-4' : 'ml-4')}>
              {/* Timer */}
              <div
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold',
                  isTimeRunningOut
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-50 text-blue-700'
                )}
              >
                <Clock className={cn('h-4 w-4', isTimeRunningOut && 'animate-pulse')} />
                {formatTime(timeRemaining)}
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmitWithConfirmation}
                disabled={isSubmitting}
                size="sm"
                className={cn('bg-green-600 hover:bg-green-700 text-white', isRTL && 'flex-row-reverse')}
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className={cn('h-4 w-4', isRTL ? 'ml-1.5' : 'mr-1.5')} />
                    {texts.submitExam}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Question Card */}
        <div className="rounded-xl border bg-white p-6 shadow-sm mb-6">
          {/* Question number badge + text */}
          <div className="flex items-start gap-4 mb-6">
            <span className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
              {currentQuestionIndex + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-base font-medium text-gray-900 leading-relaxed',
                  isRTL && 'text-right'
                )}
              >
                {getQuestionText(currentQuestion)}
              </p>
              {currentQuestion.question_type === 'multiple_choice' && (
                <p className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {texts.multipleAnswersPossible}
                </p>
              )}
            </div>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.answers.map((answer, idx) => {
              const isSelected = (answers[currentQuestion.id] || []).includes(answer.id);
              const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D

              return (
                <button
                  key={answer.id}
                  onClick={() => handleAnswerSelect(answer.id)}
                  className={cn(
                    'w-full p-4 rounded-lg border-2 transition-all text-left group',
                    isRTL ? 'text-right' : 'text-left',
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50'
                  )}
                >
                  <div className={cn('flex items-start gap-3', isRTL && 'flex-row-reverse')}>
                    {/* Option letter circle */}
                    <div
                      className={cn(
                        'flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all',
                        isSelected
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-300 text-gray-500 group-hover:border-blue-300'
                      )}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        optionLetter
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm text-gray-800 leading-relaxed pt-0.5',
                        isSelected && 'text-gray-900 font-medium'
                      )}
                    >
                      {getAnswerText(answer)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prev / Next navigation */}
        <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
          <Button
            variant="outline"
            onClick={goPrevious}
            disabled={currentQuestionIndex === 0}
            className={cn('gap-1', isRTL && 'flex-row-reverse')}
          >
            {isRTL ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
            {texts.previous}
          </Button>

          {/* Center: question counter */}
          <span className="text-sm text-gray-500 font-medium">
            {currentQuestionIndex + 1} / {totalQuestions}
          </span>

          {currentQuestionIndex === totalQuestions - 1 ? (
            <Button
              onClick={handleSubmitWithConfirmation}
              disabled={isSubmitting}
              className={cn('bg-green-600 hover:bg-green-700 gap-1', isRTL && 'flex-row-reverse')}
            >
              {isSubmitting ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {texts.submitExam}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              className={cn('gap-1', isRTL && 'flex-row-reverse')}
            >
              {texts.next}
              {isRTL ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* ── Bottom Sticky Navigator ── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t shadow-lg">
        {/* Collapsed bar — always visible */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between py-2 gap-3">
            {/* Mini dots strip — shows ~15 questions around current */}
            <div className="flex items-center gap-1 overflow-hidden flex-1">
              {session.questions.map((question, index) => {
                const isAnswered = answers[question.id] && answers[question.id].length > 0;
                const isCurrent = index === currentQuestionIndex;

                // Show only a window of questions around current
                const windowStart = Math.max(0, currentQuestionIndex - 7);
                const windowEnd = Math.min(totalQuestions - 1, windowStart + 14);
                if (index < windowStart || index > windowEnd) return null;

                return (
                  <button
                    key={question.id}
                    onClick={() => goToQuestion(index)}
                    title={`Q${index + 1}`}
                    className={cn(
                      'flex-shrink-0 rounded transition-all',
                      isCurrent
                        ? 'w-7 h-7 bg-blue-600 text-white text-xs font-bold ring-2 ring-blue-300 ring-offset-1'
                        : isAnswered
                          ? 'w-5 h-5 bg-blue-500 text-white text-xs font-medium'
                          : 'w-5 h-5 bg-gray-200 text-gray-500 text-xs',
                      'flex items-center justify-center'
                    )}
                  >
                    {isCurrent ? index + 1 : isAnswered ? '✓' : ''}
                  </button>
                );
              })}
            </div>

            {/* Stats + toggle */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-xs text-gray-500 whitespace-nowrap">
                <span className="font-semibold text-blue-600">{answeredCount}</span>
                <span className="text-gray-400"> / {totalQuestions}</span>
              </div>
              <button
                onClick={() => setNavigatorExpanded(!navigatorExpanded)}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-gray-100"
              >
                {navigatorExpanded ? (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    {texts.hideNavigator}
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    {texts.showNavigator}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Expanded full grid */}
          {navigatorExpanded && (
            <div className="pb-4 border-t pt-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {texts.questionNavigator}
                </h3>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />
                    {texts.answeredLabel}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-gray-200 border border-gray-300 inline-block" />
                    {texts.notAnswered}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-blue-700 ring-2 ring-blue-300 inline-block" />
                    {texts.current}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-20 gap-1.5 max-h-36 overflow-y-auto">
                {session.questions.map((question, index) => {
                  const isAnswered = answers[question.id] && answers[question.id].length > 0;
                  const isCurrent = index === currentQuestionIndex;

                  return (
                    <button
                      key={question.id}
                      onClick={() => goToQuestion(index)}
                      className={cn(
                        'aspect-square rounded text-xs font-medium transition-all flex items-center justify-center',
                        isCurrent
                          ? 'bg-blue-700 text-white ring-2 ring-blue-300 ring-offset-1 scale-110'
                          : isAnswered
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                      )}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

TakeExam.displayName = 'TakeExam';
