import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  Target,
  AlertCircle,
  PlayCircle,
  TrendingUp,
  CheckCircle2,
  ArrowLeft,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { useExamDetails, useMyAttempts } from '@/entities/mock-exam';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  EXAM_CATEGORY_LABELS,
  EXAM_DIFFICULTY_LABELS,
  EXAM_DIFFICULTY_COLORS,
} from '@/entities/mock-exam';
import type { ExamDifficulty } from '@/entities/mock-exam';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import { formatDistanceToNow } from 'date-fns';

/**
 * ExamDetail Page
 * Shows exam details and instructions before starting
 */

const translations = {
  en: {
    // Loading/Error
    loadingExam: 'Loading exam...',
    errorLoading: 'Error loading exam. Please try again.',
    backToExams: 'Back to Exams',
    // Badge
    passed: 'Passed',
    // Info Cards
    questions: 'Questions',
    duration: 'Duration',
    min: 'min',
    passingScore: 'Passing Score',
    // Progress
    yourProgress: 'Your Progress',
    totalAttempts: 'Total Attempts',
    bestScore: 'Best Score',
    lastAttempt: 'Last Attempt',
    recentAttempts: 'Recent Attempts',
    failed: 'Failed',
    // Instructions
    instructions: 'Instructions',
    instruction1: (minutes: number, questions: number) =>
      `You will have ${minutes} minutes to complete this exam with ${questions} questions.`,
    instruction2: (score: number) =>
      `You need to score at least ${score}% to pass the exam.`,
    instruction3: 'You can navigate between questions using the Previous/Next buttons or the question navigator.',
    instruction4: 'Questions marked with "Multiple answers possible" allow you to select more than one answer.',
    instruction5: 'The exam will automatically submit when time runs out. Make sure to answer all questions before the timer expires.',
    instruction6: 'After submitting, you\'ll see your results with detailed explanations for each question.',
    // Start
    readyToBegin: 'Ready to Begin?',
    clickToStart: 'Click the button below to start your exam. Good luck!',
    startExam: 'Start Exam',
    // Retake
    retakeAllowed: 'Retake Allowed',
    retakeMessage: 'You can retake this exam as many times as you like to improve your score.',
    retakeExam: 'Retake Exam',
  },
  ar: {
    // Loading/Error
    loadingExam: 'جارٍ تحميل الامتحان...',
    errorLoading: 'خطأ في تحميل الامتحان. يرجى المحاولة مرة أخرى.',
    backToExams: 'العودة للامتحانات',
    // Badge
    passed: 'ناجح',
    // Info Cards
    questions: 'الأسئلة',
    duration: 'المدة',
    min: 'دقيقة',
    passingScore: 'درجة النجاح',
    // Progress
    yourProgress: 'تقدمك',
    totalAttempts: 'إجمالي المحاولات',
    bestScore: 'أفضل درجة',
    lastAttempt: 'آخر محاولة',
    recentAttempts: 'المحاولات الأخيرة',
    failed: 'راسب',
    // Instructions
    instructions: 'التعليمات',
    instruction1: (minutes: number, questions: number) =>
      `سيكون لديك ${minutes} دقيقة لإكمال هذا الامتحان مع ${questions} سؤال.`,
    instruction2: (score: number) =>
      `تحتاج للحصول على ${score}% على الأقل للنجاح في الامتحان.`,
    instruction3: 'يمكنك التنقل بين الأسئلة باستخدام أزرار السابق/التالي أو مستعرض الأسئلة.',
    instruction4: 'الأسئلة التي تحمل علامة "إجابات متعددة ممكنة" تسمح لك باختيار أكثر من إجابة.',
    instruction5: 'سيتم تقديم الامتحان تلقائياً عند انتهاء الوقت. تأكد من الإجابة على جميع الأسئلة قبل انتهاء المؤقت.',
    instruction6: 'بعد التقديم، سترى نتائجك مع شروحات مفصلة لكل سؤال.',
    // Start
    readyToBegin: 'مستعد للبدء؟',
    clickToStart: 'انقر على الزر أدناه لبدء الامتحان. حظاً موفقاً!',
    startExam: 'بدء الامتحان',
    // Retake
    retakeAllowed: 'إعادة الامتحان متاحة',
    retakeMessage: 'يمكنك إعادة هذا الامتحان عدة مرات لتحسين درجتك.',
    retakeExam: 'إعادة الامتحان',
  }
};

export default function ExamDetail() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const texts = translations[language];

  // Determine base path for navigation (ECP vs non-ECP routes)
  const basePath = location.pathname.startsWith('/ecp/') ? '/ecp/mock-exams' : location.pathname.startsWith('/instructor/') ? '/instructor/mock-exams' : '/mock-exams';

  const { data: exam, isLoading, error } = useExamDetails(examId || '');
  const { data: attempts } = useMyAttempts({ exam_id: examId });

  const getDifficultyVariant = (
    difficulty: ExamDifficulty
  ): 'default' | 'success' | 'warning' | 'danger' => {
    const colorMap: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
      green: 'success',
      yellow: 'warning',
      red: 'danger',
    };
    const color = EXAM_DIFFICULTY_COLORS[difficulty];
    return colorMap[color] || 'default';
  };

  const handleStartExam = () => {
    navigate(`${basePath}/${examId}/take`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">{texts.loadingExam}</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm max-w-md">
          <p className="text-red-800">{texts.errorLoading}</p>
          <Button
            onClick={() => navigate(basePath)}
            className="mt-4 w-full"
            variant="outline"
          >
            {texts.backToExams}
          </Button>
        </div>
      </div>
    );
  }

  // Calculate user stats - only count completed attempts (with completed_at)
  const completedAttempts = attempts?.filter((a) => a.completed_at) || [];
  const attemptCount = completedAttempts.length;
  const bestScore =
    attemptCount > 0 ? Math.max(...completedAttempts.map((a) => a.score)) : null;
  const hasPassed = completedAttempts.some((a) => a.passed);
  const lastAttempt = completedAttempts[0];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => navigate(basePath)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {texts.backToExams}
        </Button>

        {/* Exam Header */}
        <div className="rounded-lg border bg-white p-6 shadow-sm mb-6">
          <div className="flex items-start gap-3 mb-4">
            <BookOpen className="h-8 w-8 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <h1
                className="text-3xl font-bold text-gray-900 mb-2"
                dir={exam.language === 'ar' ? 'rtl' : 'ltr'}
              >
                {exam.language === 'ar' && exam.title_ar ? exam.title_ar : exam.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge variant={getDifficultyVariant(exam.difficulty)} size="sm">
                  {EXAM_DIFFICULTY_LABELS[exam.difficulty]}
                </StatusBadge>
                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                  {EXAM_CATEGORY_LABELS[exam.category]}
                </span>
                {hasPassed && (
                  <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {texts.passed}
                  </span>
                )}
              </div>
            </div>
          </div>

          <p
            className="text-gray-700 leading-relaxed"
            dir={exam.language === 'ar' ? 'rtl' : 'ltr'}
          >
            {exam.language === 'ar' && exam.description_ar ? exam.description_ar : exam.description}
          </p>
        </div>

        {/* Exam Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">{texts.questions}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{exam.total_questions}</p>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">{texts.duration}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{exam.duration_minutes} {texts.min}</p>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">{texts.passingScore}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{exam.passing_score}%</p>
          </div>
        </div>

        {/* Your Progress */}
        {attemptCount > 0 && (
          <div className="rounded-lg border bg-white p-6 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">{texts.yourProgress}</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">{texts.totalAttempts}</p>
                <p className="text-2xl font-bold text-gray-900">{attemptCount}</p>
              </div>
              {bestScore !== null && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">{texts.bestScore}</p>
                  <p
                    className={cn(
                      'text-2xl font-bold',
                      bestScore >= exam.passing_score
                        ? 'text-green-600'
                        : 'text-red-600'
                    )}
                  >
                    {bestScore}%
                  </p>
                </div>
              )}
              {lastAttempt && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">{texts.lastAttempt}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDistanceToNow(new Date(lastAttempt.completed_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Recent Attempts */}
            {completedAttempts && completedAttempts.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {texts.recentAttempts}
                </p>
                <div className="space-y-2">
                  {completedAttempts.slice(0, 3).map((attempt) => (
                    <div
                      key={attempt.id}
                      onClick={() => navigate(`${basePath}/results/${attempt.id}`)}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {new Date(attempt.completed_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'text-sm font-bold',
                            attempt.passed ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          {attempt.score}%
                        </span>
                        {attempt.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                            {texts.failed}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="rounded-lg border bg-white p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">{texts.instructions}</h2>
          </div>

          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center">
                1
              </span>
              <span>{texts.instruction1(exam.duration_minutes, exam.total_questions)}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center">
                2
              </span>
              <span>{texts.instruction2(exam.passing_score)}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center">
                3
              </span>
              <span>{texts.instruction3}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center">
                4
              </span>
              <span>{texts.instruction4}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center">
                5
              </span>
              <span>{texts.instruction5}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center">
                6
              </span>
              <span>{texts.instruction6}</span>
            </li>
          </ul>
        </div>

        {/* Start/Retake Exam Button */}
        <div className={cn(
          "rounded-lg border p-6 shadow-sm",
          attemptCount > 0
            ? "bg-gradient-to-r from-blue-50 to-sky-100"
            : "bg-gradient-to-r from-sky-50 to-royal-100"
        )}>
          <div className="flex flex-col items-center text-center">
            {attemptCount > 0 ? (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-800 font-semibold mb-3">
                  <RotateCcw className="h-4 w-4" />
                  {texts.retakeAllowed}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{texts.readyToBegin}</h3>
                <p className="text-gray-600 mb-4">
                  {texts.retakeMessage}
                </p>
                <Button onClick={handleStartExam} size="lg" className="px-8">
                  <RotateCcw className="h-5 w-5 mr-2" />
                  {texts.retakeExam}
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{texts.readyToBegin}</h3>
                <p className="text-gray-600 mb-4">
                  {texts.clickToStart}
                </p>
                <Button onClick={handleStartExam} size="lg" className="px-8">
                  <PlayCircle className="h-5 w-5 mr-2" />
                  {texts.startExam}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

ExamDetail.displayName = 'ExamDetail';
