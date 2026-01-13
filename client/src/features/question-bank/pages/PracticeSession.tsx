/**
 * Practice Session Page
 * Interactive question practice with immediate feedback
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Flag,
  Star,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuestionViewProps {
  question: PracticeQuestionWithAttempt;
  selectedAnswer: string | null;
  isAnswered: boolean;
  onSelectAnswer: (optionId: string) => void;
  onSubmitAnswer: () => void;
  showExplanation: boolean;
}

function QuestionView({
  question,
  selectedAnswer,
  isAnswered,
  onSelectAnswer,
  onSubmitAnswer,
  showExplanation,
}: QuestionViewProps) {
  const options: QuestionOption[] = question.options || [];
  const isCorrect = selectedAnswer === question.correct_option_id;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      {/* Question Text */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-lg font-medium text-gray-900">
              {question.question_text}
            </p>
            {question.question_text_ar && (
              <p className="text-base text-gray-600 mt-2" dir="rtl">
                {question.question_text_ar}
              </p>
            )}
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              question.difficulty_level === 'easy'
                ? 'bg-green-100 text-green-700'
                : question.difficulty_level === 'hard'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {question.difficulty_level}
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {options.map((option) => {
          const isSelected = selectedAnswer === option.id;
          const isCorrectOption = option.id === question.correct_option_id;

          let optionClass =
            'border-2 rounded-lg p-4 cursor-pointer transition-all';

          if (isAnswered) {
            if (isCorrectOption) {
              optionClass +=
                ' border-green-500 bg-green-50 text-green-800';
            } else if (isSelected && !isCorrectOption) {
              optionClass += ' border-red-500 bg-red-50 text-red-800';
            } else {
              optionClass += ' border-gray-200 bg-gray-50 text-gray-500';
            }
          } else {
            if (isSelected) {
              optionClass += ' border-blue-500 bg-blue-50';
            } else {
              optionClass +=
                ' border-gray-200 hover:border-blue-300 hover:bg-blue-50';
            }
          }

          return (
            <div
              key={option.id}
              className={optionClass}
              onClick={() => !isAnswered && onSelectAnswer(option.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-600 uppercase">
                    {option.id}.
                  </span>
                  <span>{option.text}</span>
                </div>
                {isAnswered && isCorrectOption && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                {isAnswered && isSelected && !isCorrectOption && (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              {option.text_ar && (
                <p className="text-sm text-gray-500 mt-2 mr-8" dir="rtl">
                  {option.text_ar}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      {!isAnswered && selectedAnswer && (
        <Button onClick={onSubmitAnswer} className="w-full">
          Submit Answer
        </Button>
      )}

      {/* Feedback */}
      {isAnswered && (
        <div
          className={`p-4 rounded-lg ${
            isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {isCorrect ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span
              className={`font-semibold ${
                isCorrect ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </span>
          </div>

          {showExplanation && question.explanation && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-700">
                <strong>Explanation:</strong> {question.explanation}
              </p>
              {question.explanation_ar && (
                <p className="text-sm text-gray-600 mt-2" dir="rtl">
                  {question.explanation_ar}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PracticeSession() {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Detect base path for navigation (ECP vs Individual learning system)
  const basePath = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/ecp/learning-system')) {
      return '/ecp/learning-system';
    }
    return '/learning-system';
  }, [location.pathname]);

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(
    new Set()
  );
  const [startTime] = useState(new Date());
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionResult, setSessionResult] = useState<PracticeSessionResult | null>(
    null
  );

  // Data fetching
  const { data: questionSet, isLoading: isLoadingSet } = useQuestionSet(setId);
  const { data: questions, isLoading: isLoadingQuestions } =
    useQuestionsWithAttempts(user?.id, setId);

  // Mutations
  const recordAttempt = useRecordAttempt();
  const completeSession = useCompletePracticeSession();

  const currentQuestion = questions?.[currentIndex];
  const totalQuestions = questions?.length || 0;
  const answeredCount = answeredQuestions.size;

  // Handle answer selection
  const handleSelectAnswer = (optionId: string) => {
    if (!currentQuestion || answeredQuestions.has(currentQuestion.id)) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  // Handle answer submission
  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !user) return;

    const selectedOptionId = answers[currentQuestion.id];
    if (!selectedOptionId) return;

    const isCorrect = selectedOptionId === currentQuestion.correct_option_id;

    // Record the attempt
    await recordAttempt.mutateAsync({
      userId: user.id,
      questionId: currentQuestion.id,
      questionSetId: setId!,
      selectedOptionId,
      isCorrect,
    });

    setAnsweredQuestions((prev) => new Set(prev).add(currentQuestion.id));
  };

  // Handle navigation
  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Handle session completion
  const handleCompleteSession = useCallback(async () => {
    if (!user || !questionSet || !questions) return;

    const endTime = new Date();
    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000
    );

    // Calculate results
    let correctCount = 0;
    let incorrectCount = 0;

    questions.forEach((q) => {
      if (answeredQuestions.has(q.id)) {
        if (answers[q.id] === q.correct_option_id) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      }
    });

    const scorePercentage =
      answeredQuestions.size > 0
        ? Math.round((correctCount / answeredQuestions.size) * 100)
        : 0;

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

    await completeSession.mutateAsync({
      userId: user.id,
      questionSetId: setId!,
      result,
    });

    setSessionResult(result);
    setIsCompleted(true);
  }, [
    user,
    questionSet,
    questions,
    startTime,
    answeredQuestions,
    answers,
    setId,
    totalQuestions,
    completeSession,
  ]);

  // Loading state
  if (isLoadingSet || isLoadingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  // No questions state
  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md bg-white p-8 rounded-xl shadow-lg">
          <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Questions Available
          </h2>
          <p className="text-gray-600 mb-6">
            This question set doesn't have any published questions yet.
          </p>
          <Button onClick={() => navigate(`${basePath}/question-bank`)}>
            Back to Question Bank
          </Button>
        </div>
      </div>
    );
  }

  // Results screen
  if (isCompleted && sessionResult) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                sessionResult.passed ? 'bg-green-100' : 'bg-yellow-100'
              }`}
            >
              {sessionResult.passed ? (
                <CheckCircle className="w-10 h-10 text-green-600" />
              ) : (
                <RotateCcw className="w-10 h-10 text-yellow-600" />
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {sessionResult.passed ? 'Congratulations!' : 'Keep Practicing!'}
            </h1>
            <p className="text-gray-600 mb-8">
              {sessionResult.passed
                ? 'You passed this practice session!'
                : 'You can retake this practice session to improve your score.'}
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-3xl font-bold text-green-600">
                  {sessionResult.correctAnswers}
                </p>
                <p className="text-sm text-green-700">Correct</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-3xl font-bold text-red-600">
                  {sessionResult.incorrectAnswers}
                </p>
                <p className="text-sm text-red-700">Incorrect</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-3xl font-bold text-blue-600">
                  {sessionResult.scorePercentage}%
                </p>
                <p className="text-sm text-blue-700">Score</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`${basePath}/question-bank`)}
              >
                Back to Question Bank
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setIsCompleted(false);
                  setSessionResult(null);
                  setCurrentIndex(0);
                  setAnswers({});
                  setAnsweredQuestions(new Set());
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`${basePath}/question-bank`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit
              </Button>
              <div className="border-l pl-4">
                <h1 className="font-semibold text-gray-900">
                  {questionSet?.title}
                </h1>
                <p className="text-sm text-gray-500">
                  Question {currentIndex + 1} of {totalQuestions}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-green-600">{answeredCount}</span>
                <span className="text-gray-400"> / {totalQuestions} answered</span>
              </div>
              <Button
                onClick={handleCompleteSession}
                disabled={answeredCount === 0}
              >
                Finish Session
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{
                width: `${(answeredCount / totalQuestions) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {currentQuestion && (
          <QuestionView
            question={currentQuestion}
            selectedAnswer={answers[currentQuestion.id] || null}
            isAnswered={answeredQuestions.has(currentQuestion.id)}
            onSelectAnswer={handleSelectAnswer}
            onSubmitAnswer={handleSubmitAnswer}
            showExplanation={true}
          />
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={currentIndex === totalQuestions - 1}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Question Navigator */}
        <div className="mt-8 bg-white rounded-lg border p-4">
          <h3 className="font-medium text-gray-900 mb-4">Question Navigator</h3>
          <div className="flex flex-wrap gap-2">
            {questions?.map((q, index) => {
              const isAnswered = answeredQuestions.has(q.id);
              const isCurrent = index === currentIndex;
              const isCorrect =
                isAnswered && answers[q.id] === q.correct_option_id;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-10 h-10 rounded-lg font-medium text-sm transition-all ${
                    isCurrent
                      ? 'ring-2 ring-blue-500 ring-offset-2'
                      : ''
                  } ${
                    isAnswered
                      ? isCorrect
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : 'bg-red-100 text-red-700 border-red-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } border`}
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
