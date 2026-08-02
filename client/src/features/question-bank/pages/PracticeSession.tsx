/**
 * Practice Session Page — English Only
 * - BDA Brand Colors: #0d1f4e, #1C4A8B, #0f91e0
 */

import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  useQuestionSet,
  useQuestionsWithAttempts,
  useRecordAttempt,
  useCompletePracticeSession,
} from '@/entities/question-bank';
import type {
  PracticeQuestion,
  PracticeQuestionWithAttempt,
  QuestionOption,
  PracticeSessionResult,
} from '@/entities/question-bank';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  RotateCcw,
  Trophy,
  Target,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ─── Translations ─────────────────────────────────────────────────────────────
function t(key: string, isAR: boolean): string {
  const ar: Record<string, string> = {
    loading: 'جاري تحميل الأسئلة...',
    noQuestions: 'لا توجد أسئلة',
    noQuestionsSub: 'هذه المجموعة لا تحتوي على أسئلة منشورة بعد.',
    backToBank: 'العودة لبنك الأسئلة',
    exit: 'خروج',
    question: 'السؤال',
    of: 'من',
    answered: 'مُجاوَب',
    finishSession: 'إنهاء الجلسة',
    submitAnswer: 'تأكيد الإجابة',
    correct: 'إجابة صحيحة!',
    incorrect: 'إجابة خاطئة',
    explanation: 'الشرح',
    congratulations: 'أحسنت!',
    keepPracticing: 'استمر في التدريب!',
    passedMsg: 'لقد اجتزت هذه الجلسة التدريبية بنجاح.',
    failedMsg: 'يمكنك إعادة هذه الجلسة لتحسين درجتك.',
    correctAnswers: 'إجابات صحيحة',
    incorrectAnswers: 'إجابات خاطئة',
    score: 'الدرجة',
    tryAgain: 'إعادة المحاولة',
    previous: 'السابق',
    next: 'التالي',
    questionNavigator: 'متصفح الأسئلة',
    easy: 'سهل',
    medium: 'متوسط',
    hard: 'صعب',
  };
  const en: Record<string, string> = {
    loading: 'Loading questions...',
    noQuestions: 'No Questions Available',
    noQuestionsSub: "This question set doesn't have any published questions yet.",
    backToBank: 'Back to Question Bank',
    exit: 'Exit',
    question: 'Question',
    of: 'of',
    answered: 'answered',
    finishSession: 'Finish Session',
    submitAnswer: 'Submit Answer',
    correct: 'Correct!',
    incorrect: 'Incorrect',
    explanation: 'Explanation',
    congratulations: 'Congratulations!',
    keepPracticing: 'Keep Practicing!',
    passedMsg: 'You passed this practice session!',
    failedMsg: 'You can retake this practice session to improve your score.',
    correctAnswers: 'Correct',
    incorrectAnswers: 'Incorrect',
    score: 'Score',
    tryAgain: 'Try Again',
    previous: 'Previous',
    next: 'Next',
    questionNavigator: 'Question Navigator',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  };
  return isAR ? (ar[key] ?? key) : (en[key] ?? key);
}

// ─── Difficulty Label ─────────────────────────────────────────────────────────
function difficultyLabel(level: string, isAR: boolean) {
  const map: Record<string, { key: string; cls: string }> = {
    easy: { key: 'easy', cls: 'bg-green-100 text-green-700' },
    medium: { key: 'medium', cls: 'bg-amber-100 text-amber-700' },
    hard: { key: 'hard', cls: 'bg-red-100 text-red-700' },
  };
  const d = map[level] || map['medium'];
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${d.cls}`}>{t(d.key, false)}</span>;
}

// ─── Question View ────────────────────────────────────────────────────────────
interface QuestionViewProps {
  question: PracticeQuestionWithAttempt;
  selectedAnswer: string | null;
  isAnswered: boolean;
  onSelectAnswer: (optionId: string) => void;
  onSubmitAnswer: () => void;
  onNext: () => void;
  isLastQuestion: boolean;
}

function QuestionView({ question, selectedAnswer, isAnswered, onSelectAnswer, onSubmitAnswer, onNext, isLastQuestion }: QuestionViewProps) {
  const options: QuestionOption[] = question.options || [];
  const isCorrect = selectedAnswer === question.correct_option_id;

  const questionText = question.question_text;
  const explanationText = question.explanation;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#dbeafe] overflow-hidden">
      {/* Question Header */}
      <div className="p-6 border-b border-[#f0f6ff]" style={{ background: 'linear-gradient(135deg, #f8faff 0%, #f0f6ff 100%)' }}>
        <div className="flex items-start justify-between gap-4">
          <p className="text-base font-medium text-[#0d1f4e] leading-relaxed flex-1">
            {questionText}
          </p>
          {question.difficulty_level && difficultyLabel(question.difficulty_level, false)}
        </div>
      </div>

      {/* Options */}
      <div className="p-6 space-y-3">
        {options.map((option) => {
          const isSelected = selectedAnswer === option.id;
          const isCorrectOption = option.id === question.correct_option_id;
          const optionText = option.text;

          let cls = 'border-2 rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between gap-3';
          if (isAnswered) {
            if (isCorrectOption) cls += ' border-green-400 bg-green-50';
            else if (isSelected) cls += ' border-red-400 bg-red-50';
            else cls += ' border-gray-100 bg-gray-50 opacity-60';
          } else {
            if (isSelected) cls += ' border-[#1C4A8B] bg-[#f0f6ff]';
            else cls += ' border-[#dbeafe] hover:border-[#1C4A8B]/50 hover:bg-[#f8faff]';
          }

          return (
            <div key={option.id} className={cls} onClick={() => !isAnswered && onSelectAnswer(option.id)}>
              <div className="flex items-center gap-3 flex-1">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  isAnswered && isCorrectOption ? 'bg-green-500 text-white'
                  : isAnswered && isSelected ? 'bg-red-500 text-white'
                  : isSelected ? 'bg-[#1C4A8B] text-white'
                  : 'bg-[#f0f6ff] text-[#1C4A8B]'
                }`}>
                  {option.id.toUpperCase()}
                </span>
                <span className={`text-sm ${isAnswered && !isCorrectOption && !isSelected ? 'text-slate-400' : 'text-[#0d1f4e]'}`}>
                  {optionText}
                </span>
              </div>
              {isAnswered && isCorrectOption && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
              {isAnswered && isSelected && !isCorrectOption && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Submit & Next combined */}
      {!isAnswered && selectedAnswer && (
        <div className="px-6 pb-6">
          <button
            onClick={onSubmitAnswer}
            className="w-full bg-[#0f91e0] text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-[#1C4A8B] transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            {isLastQuestion ? t('submitAnswer', false) : `${t('submitAnswer', false)} & ${t('next', false)}`}
            {!isLastQuestion && <ChevronLeft className="w-4 h-4 rotate-180" />}
          </button>
        </div>
      )}

      {/* Auto-advance after answering (if not last question) */}
      {isAnswered && !isLastQuestion && (
        <div className="px-6 pb-6">
          <button
            onClick={onNext}
            className="w-full bg-[#0f91e0] text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-[#1C4A8B] transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            {t('next', false)}
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
      )}

      {/* Feedback */}
      {isAnswered && (
        <div className={`mx-6 mb-6 p-4 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {isCorrect
              ? <CheckCircle className="w-5 h-5 text-green-600" />
              : <XCircle className="w-5 h-5 text-red-600" />
            }
            <span className={`font-bold text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? t('correct', false) : t('incorrect', false)}
            </span>
          </div>
          {explanationText && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs font-semibold text-slate-500 mb-1">{t('explanation', false)}</p>
              <p className="text-sm text-slate-700 leading-relaxed">{explanationText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function PracticeSession() {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const basePath = useMemo(() => {
    return location.pathname.startsWith('/ecp/') ? '/ecp/learning-system' : '/learning-system';
  }, [location.pathname]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [startTime] = useState(new Date());
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionResult, setSessionResult] = useState<PracticeSessionResult | null>(null);

  // Read certificationTarget from navigation state (passed by QuestionBankDashboard)
  const certificationTarget = (location.state as { certType?: 'CP' | 'SCP' } | null)?.certType;

  const { data: questionSet, isLoading: isLoadingSet } = useQuestionSet(setId);
  const { data: questions, isLoading: isLoadingQuestions } = useQuestionsWithAttempts(user?.id, setId, certificationTarget);

  const recordAttempt = useRecordAttempt();
  const completeSession = useCompletePracticeSession();

  const currentQuestion = questions?.[currentIndex];
  const totalQuestions = questions?.length || 0;
  const answeredCount = answeredQuestions.size;

  const handleSelectAnswer = (optionId: string) => {
    if (!currentQuestion || answeredQuestions.has(currentQuestion.id)) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }));
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !user) return;
    const selectedOptionId = answers[currentQuestion.id];
    if (!selectedOptionId) return;
    const isCorrect = selectedOptionId === currentQuestion.correct_option_id;
    await recordAttempt.mutateAsync({ userId: user.id, questionId: currentQuestion.id, questionSetId: setId!, selectedOptionId, isCorrect });
    setAnsweredQuestions((prev) => new Set(prev).add(currentQuestion.id));
    // Auto-advance to next question after a brief moment to show feedback
    if (currentIndex < totalQuestions - 1) {
      setTimeout(() => setCurrentIndex((p) => p + 1), 800);
    }
  };

  const handleNext = () => { if (currentIndex < totalQuestions - 1) setCurrentIndex((p) => p + 1); };
  const handlePrevious = () => { if (currentIndex > 0) setCurrentIndex((p) => p - 1); };

  const handleCompleteSession = useCallback(async () => {
    if (!user || !questionSet || !questions) return;
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    let correctCount = 0, incorrectCount = 0;
    questions.forEach((q) => {
      if (answeredQuestions.has(q.id)) {
        if (answers[q.id] === q.correct_option_id) correctCount++;
        else incorrectCount++;
      }
    });
    const scorePercentage = answeredQuestions.size > 0 ? Math.round((correctCount / answeredQuestions.size) * 100) : 0;
    const result: PracticeSessionResult = {
      questionSetId: setId!,
      totalQuestions,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      skippedQuestions: totalQuestions - answeredQuestions.size,
      scorePercentage,
      passed: scorePercentage >= questionSet.passing_score,
      timeSpentSeconds: durationMinutes * 60,
      questionResults: questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: answers[q.id] || null,
        correctOptionId: q.correct_option_id,
        isCorrect: answers[q.id] === q.correct_option_id,
        timeSpentSeconds: 0,
      })),
    };
    await completeSession.mutateAsync({ userId: user.id, questionSetId: setId!, result });
    setSessionResult(result);
    setIsCompleted(true);
  }, [user, questionSet, questions, startTime, answeredQuestions, answers, setId, totalQuestions, completeSession]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoadingSet || isLoadingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f6ff]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-4 border-[#dbeafe] border-t-[#1C4A8B] animate-spin mx-auto mb-5" />
          <p className="text-slate-500 font-medium">{t('loading', false)}</p>
        </div>
      </div>
    );
  }

  // ── No Questions ─────────────────────────────────────────────────────────
  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f6ff] px-4">
        <div className="text-center max-w-md bg-white p-10 rounded-3xl shadow-xl border border-[#dbeafe]">
          <HelpCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0d1f4e] mb-2">{t('noQuestions', false)}</h2>
          <p className="text-slate-400 mb-6 text-sm">{t('noQuestionsSub', false)}</p>
          <button
            onClick={() => navigate(`${basePath}/question-bank`)}
            className="bg-[#0f91e0] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#1C4A8B] transition-colors"
          >
            {t('backToBank', false)}
          </button>
        </div>
      </div>
    );
  }

  // ── Results Screen ───────────────────────────────────────────────────────
  if (isCompleted && sessionResult) {
    const passed = sessionResult.passed;
    return (
      <div className="min-h-screen bg-[#f0f6ff] flex items-center justify-center py-12 px-4">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-3xl shadow-xl border border-[#dbeafe] overflow-hidden">
            {/* Result Header */}
            <div className="p-8 text-center border-b border-[#dbeafe]">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${passed ? 'bg-[#e8f4fd]' : 'bg-[#f0f6ff]'}`}>
                {passed
                  ? <Trophy className="w-10 h-10 text-[#0f91e0]" />
                  : <RotateCcw className="w-10 h-10 text-[#1C4A8B]" />
                }
              </div>
              <h1 className="text-3xl font-bold mb-2 text-[#0d1f4e]">
                {passed ? t('congratulations', false) : t('keepPracticing', false)}
              </h1>
              <p className="text-slate-400 text-sm">
                {passed ? t('passedMsg', false) : t('failedMsg', false)}
              </p>
            </div>

            {/* Stats */}
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
                  <p className="text-3xl font-bold text-green-600">{sessionResult.correctAnswers}</p>
                  <p className="text-xs text-green-700 mt-1 font-medium">{t('correctAnswers', false)}</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-4 text-center border border-red-100">
                  <p className="text-3xl font-bold text-red-500">{sessionResult.incorrectAnswers}</p>
                  <p className="text-xs text-red-600 mt-1 font-medium">{t('incorrectAnswers', false)}</p>
                </div>
                <div className="bg-[#f0f6ff] rounded-2xl p-4 text-center border border-[#dbeafe]">
                  <p className="text-3xl font-bold text-[#1C4A8B]">{sessionResult.scorePercentage}%</p>
                  <p className="text-xs text-[#1C4A8B] mt-1 font-medium">{t('score', false)}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`${basePath}/question-bank`)}
                  className="flex-1 border-2 border-[#dbeafe] text-[#1C4A8B] font-semibold py-3 px-4 rounded-xl hover:bg-[#f0f6ff] transition-colors text-sm"
                >
                  {t('backToBank', false)}
                </button>
                <button
                  onClick={() => {
                    setIsCompleted(false);
                    setSessionResult(null);
                    setCurrentIndex(0);
                    setAnswers({});
                    setAnsweredQuestions(new Set());
                  }}
                  className="flex-1 bg-[#0f91e0] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#1C4A8B] transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('tryAgain', false)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Active Session ───────────────────────────────────────────────────────
  const setTitle = questionSet?.title;

  return (
    <div className="min-h-screen bg-[#f0f6ff]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 border-b bg-white border-[#dbeafe] shadow-sm">
        <div className="container mx-auto px-6 py-3 max-w-4xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`${basePath}/question-bank`)}
                className="flex items-center gap-1.5 text-slate-400 hover:text-[#0f91e0] transition-colors text-sm font-medium"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                {t('exit', false)}
              </button>
              <div className="border-[#dbeafe] border-l pl-4">
                <p className="font-semibold text-[#0d1f4e] text-sm line-clamp-1">{setTitle}</p>
                <p className="text-slate-400 text-xs">
                  {t('question', false)} {currentIndex + 1} {t('of', false)} {totalQuestions}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-400">
                <span className="font-bold text-[#0f91e0]">{answeredCount}</span>
                <span> / {totalQuestions} {t('answered', false)}</span>
              </div>
              <button
                onClick={handleCompleteSession}
                disabled={answeredCount === 0}
                className="bg-[#0f91e0] text-white font-bold text-sm px-5 py-2 rounded-xl hover:bg-[#1C4A8B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {t('finishSession', false)}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-1.5 bg-[#f0f6ff] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0f91e0] rounded-full transition-all"
              style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {currentQuestion && (
          <QuestionView
            question={currentQuestion}
            selectedAnswer={answers[currentQuestion.id] || null}
            isAnswered={answeredQuestions.has(currentQuestion.id)}
            onSelectAnswer={handleSelectAnswer}
            onSubmitAnswer={handleSubmitAnswer}
            onNext={handleNext}
            isLastQuestion={currentIndex === totalQuestions - 1}
          />
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-5">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 border-2 border-[#dbeafe] text-[#1C4A8B] font-semibold px-5 py-2.5 rounded-xl hover:bg-[#f0f6ff] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm bg-white"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            {t('previous', false)}
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === totalQuestions - 1}
            className="flex items-center gap-2 bg-[#0f91e0] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1C4A8B] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
          >
            {t('next', false)}
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>

        {/* Question Navigator */}
        <div className="mt-6 bg-white rounded-2xl border border-[#dbeafe] p-5 shadow-sm">
          <h3 className="font-semibold text-[#0d1f4e] text-sm mb-4">{t('questionNavigator', false)}</h3>
          <div className="flex flex-wrap gap-2">
            {questions?.map((q, index) => {
              const isAnswered = answeredQuestions.has(q.id);
              const isCurrent = index === currentIndex;
              const isCorrect = isAnswered && answers[q.id] === q.correct_option_id;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-10 h-10 rounded-xl font-bold text-sm transition-all border-2 ${
                    isCurrent ? 'ring-2 ring-[#0f91e0] ring-offset-2' : ''
                  } ${
                    isAnswered
                      ? isCorrect
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : 'bg-red-100 text-red-600 border-red-300'
                      : 'bg-[#f0f6ff] text-[#1C4A8B] border-[#dbeafe] hover:border-[#1C4A8B]/50'
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
