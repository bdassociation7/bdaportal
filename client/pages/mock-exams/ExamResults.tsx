import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Trophy,
  XCircle,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  Home,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { useAttemptResults } from '@/entities/mock-exam';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/utils/cn';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * ExamResults Page
 * Displays detailed exam results with score, pass/fail, and question review
 */

const translations = {
  en: {
    // Loading/Error
    loadingResults: 'Loading results...',
    errorLoading: 'Error loading results. Please try again.',
    backToExams: 'Back to Exams',
    // Pass/Fail Banner
    congratulations: 'Congratulations! You Passed!',
    passedDesc: "You've successfully completed the exam with a passing score",
    notPassed: 'Not Passed',
    notPassedDesc: 'Keep practicing! You can retake this exam to improve your score',
    // Summary
    examSummary: 'Exam Summary',
    yourScore: 'Your Score',
    correct: 'Correct',
    points: 'Points',
    minutes: 'Minutes',
    passingScoreRequired: 'Passing Score Required:',
    completed: 'Completed:',
    // Question Review
    questionReview: 'Question Review',
    expandAll: 'Expand All',
    collapseAll: 'Collapse All',
    question: 'Question',
    correctAnswer: '✓ Correct answer',
    yourAnswerIncorrect: '✗ Your answer (incorrect)',
    explanation: 'Explanation:',
    pointsEarned: 'Points earned:',
    // Actions
    retakeExam: 'Retake Exam',
  },
  ar: {
    // Loading/Error
    loadingResults: 'جارٍ تحميل النتائج...',
    errorLoading: 'خطأ في تحميل النتائج. يرجى المحاولة مرة أخرى.',
    backToExams: 'العودة للامتحانات',
    // Pass/Fail Banner
    congratulations: 'تهانينا! لقد نجحت!',
    passedDesc: 'لقد أكملت الامتحان بنجاح بدرجة نجاح',
    notPassed: 'لم تنجح',
    notPassedDesc: 'استمر في التدريب! يمكنك إعادة الامتحان لتحسين درجتك',
    // Summary
    examSummary: 'ملخص الامتحان',
    yourScore: 'درجتك',
    correct: 'صحيح',
    points: 'النقاط',
    minutes: 'الدقائق',
    passingScoreRequired: 'درجة النجاح المطلوبة:',
    completed: 'مكتمل:',
    // Question Review
    questionReview: 'مراجعة الأسئلة',
    expandAll: 'توسيع الكل',
    collapseAll: 'طي الكل',
    question: 'السؤال',
    correctAnswer: '✓ الإجابة الصحيحة',
    yourAnswerIncorrect: '✗ إجابتك (غير صحيحة)',
    explanation: 'الشرح:',
    pointsEarned: 'النقاط المكتسبة:',
    // Actions
    retakeExam: 'إعادة الامتحان',
  }
};

export default function ExamResults() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const texts = translations[language];
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  // Determine base path for navigation (ECP vs non-ECP routes)
  const basePath = location.pathname.startsWith('/ecp/') ? '/ecp/mock-exams' : location.pathname.startsWith('/instructor/') ? '/instructor/mock-exams' : '/mock-exams';

  const { data: results, isLoading, error } = useAttemptResults(attemptId || '');

  // Get localized text based on exam language
  const getQuestionText = (question: { question_text: string; question_text_ar?: string | null }) => {
    const examLanguage = results?.exam?.language || 'en';
    if (examLanguage === 'ar' && question.question_text_ar) {
      return question.question_text_ar;
    }
    return question.question_text;
  };

  const getAnswerText = (answer: { answer_text: string; answer_text_ar?: string | null }) => {
    const examLanguage = results?.exam?.language || 'en';
    if (examLanguage === 'ar' && answer.answer_text_ar) {
      return answer.answer_text_ar;
    }
    return answer.answer_text;
  };

  const getExplanationText = (question: { explanation?: string | null; explanation_ar?: string | null }) => {
    const examLanguage = results?.exam?.language || 'en';
    if (examLanguage === 'ar' && question.explanation_ar) {
      return question.explanation_ar;
    }
    return question.explanation;
  };

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedQuestions(
      new Set(Array.from({ length: results?.total_questions || 0 }, (_, i) => i))
    );
  };

  const collapseAll = () => {
    setExpandedQuestions(new Set());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">{texts.loadingResults}</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header - Pass/Fail Banner */}
        <div
          className={cn(
            'rounded-lg border-2 p-8 mb-6 text-center',
            results.passed
              ? 'border-green-500 bg-green-50'
              : 'border-red-500 bg-red-50'
          )}
        >
          {results.passed ? (
            <>
              <Trophy className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-green-900 mb-2">
                {texts.congratulations}
              </h1>
              <p className="text-green-700">
                {texts.passedDesc}
              </p>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-red-900 mb-2">{texts.notPassed}</h1>
              <p className="text-red-700">
                {texts.notPassedDesc}
              </p>
            </>
          )}
        </div>

        {/* Score Overview */}
        <div className="rounded-lg border bg-white p-6 shadow-sm mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{texts.examSummary}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-gray-50">
              <Target className="h-6 w-6 text-gray-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {results.score_percentage}%
              </p>
              <p className="text-sm text-gray-600">{texts.yourScore}</p>
            </div>

            <div className="text-center p-4 rounded-lg bg-gray-50">
              <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {results.correct_answers}/{results.total_questions}
              </p>
              <p className="text-sm text-gray-600">{texts.correct}</p>
            </div>

            <div className="text-center p-4 rounded-lg bg-gray-50">
              <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {results.attempt.total_points_earned}/
                {results.attempt.total_points_possible}
              </p>
              <p className="text-sm text-gray-600">{texts.points}</p>
            </div>

            <div className="text-center p-4 rounded-lg bg-gray-50">
              <Clock className="h-6 w-6 text-gray-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {results.time_spent_minutes}
              </p>
              <p className="text-sm text-gray-600">{texts.minutes}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{texts.passingScoreRequired}</span>
              <span className="font-medium text-gray-900">
                {results.exam.passing_score}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-600">{texts.completed}</span>
              <span className="font-medium text-gray-900">
                {formatDistanceToNow(new Date(results.attempt.completed_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Question Review */}
        <div className="rounded-lg border bg-white p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{texts.questionReview}</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={expandAll}>
                <ChevronDown className="h-4 w-4 mr-1" />
                {texts.expandAll}
              </Button>
              <Button size="sm" variant="outline" onClick={collapseAll}>
                <ChevronUp className="h-4 w-4 mr-1" />
                {texts.collapseAll}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {results.questions_with_answers.map((item, index) => {
              const isExpanded = expandedQuestions.has(index);
              const isCorrect = item.is_correct;
              const correctAnswerIds = item.question.answers
                .filter((a) => a.is_correct)
                .map((a) => a.id);

              return (
                <div
                  key={item.question.id}
                  className={cn(
                    'rounded-lg border-2 overflow-hidden transition-all',
                    isCorrect ? 'border-green-200' : 'border-red-200'
                  )}
                >
                  {/* Question Header */}
                  <button
                    onClick={() => toggleQuestion(index)}
                    className={cn(
                      'w-full p-4 flex items-center justify-between text-left transition-colors',
                      isCorrect
                        ? 'bg-green-50 hover:bg-green-100'
                        : 'bg-red-50 hover:bg-red-100'
                    )}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {texts.question} {index + 1}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {getQuestionText(item.question)}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>

                  {/* Question Details */}
                  {isExpanded && (
                    <div className="p-4 bg-white border-t space-y-3">
                      {item.question.answers.map((answer) => {
                        const wasSelected = item.user_answer_ids.includes(answer.id);
                        const isCorrectAnswer = correctAnswerIds.includes(answer.id);

                        // Determine styling based on correct/selected state
                        const answerStyle = isCorrectAnswer
                          ? {
                              border: 'border-green-500',
                              bg: 'bg-green-50',
                              icon: <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />,
                              textColor: 'text-green-800',
                              label: <p className="text-sm text-green-700 font-semibold mt-1">{texts.correctAnswer}</p>
                            }
                          : wasSelected
                          ? {
                              border: 'border-red-500',
                              bg: 'bg-red-50',
                              icon: <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />,
                              textColor: 'text-gray-900',
                              label: <p className="text-sm text-red-700 mt-1">{texts.yourAnswerIncorrect}</p>
                            }
                          : {
                              border: 'border-gray-200',
                              bg: 'bg-gray-50',
                              icon: null,
                              textColor: 'text-gray-900',
                              label: null
                            };

                        return (
                          <div
                            key={answer.id}
                            className={cn(
                              'p-3 rounded-lg border-2',
                              answerStyle.border,
                              answerStyle.bg
                            )}
                          >
                            <div className="flex items-start gap-2">
                              {answerStyle.icon}
                              <div className="flex-1">
                                <p className={cn("font-medium", answerStyle.textColor)}>
                                  {getAnswerText(answer)}
                                </p>
                                {answerStyle.label}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Explanation */}
                      {getExplanationText(item.question) && (
                        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                          <p className="text-sm font-semibold text-blue-900 mb-1">
                            {texts.explanation}
                          </p>
                          <p className="text-sm text-blue-800">
                            {getExplanationText(item.question)}
                          </p>
                        </div>
                      )}

                      {/* Points */}
                      <div className="flex items-center justify-between text-sm pt-2 border-t">
                        <span className="text-gray-600">{texts.pointsEarned}</span>
                        <span
                          className={cn(
                            'font-medium',
                            item.points_earned > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          )}
                        >
                          {item.points_earned} / {item.question.points}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => navigate(basePath)}
            variant="outline"
            className="flex-1"
          >
            <Home className="h-4 w-4 mr-2" />
            {texts.backToExams}
          </Button>
          <Button
            onClick={() => navigate(`${basePath}/${results.exam.id}`)}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {texts.retakeExam}
          </Button>
        </div>
      </div>
    </div>
  );
}

ExamResults.displayName = 'ExamResults';
