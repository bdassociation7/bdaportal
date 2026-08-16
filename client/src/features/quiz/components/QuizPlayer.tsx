import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertCircle,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  useQuiz,
  useStartQuizAttempt,
  useCompleteQuizAttempt,
} from "@/entities/quiz";
import type { UserAnswer, QuizResults } from "@/entities/quiz";
import { QuestionCard } from "./QuestionCard";
import { Timer } from "@/shared/ui";
import { cn } from "@/shared/utils/cn";
import {
  QUIZ_MESSAGES,
  QUIZ_MESSAGES_AR,
  calculateQuizDuration,
} from "@/shared/constants/quiz.constants";
import { ROUTES } from "@/shared/constants/routes";

/**
 * QuizPlayer Component
 *
 * Full quiz-taking interface with timer, navigation, and submission
 */

export interface QuizPlayerProps {
  /**
   * Quiz ID to play
   */
  quizId: string;

  /**
   * Show in Arabic
   */
  isArabic?: boolean;

  /**
   * Callback when quiz is completed (optional, defaults to navigation)
   */
  onQuizComplete?: (results: QuizResults) => void;

  /**
   * Enables submit-and-review feedback for each question. Used only by lesson practice quizzes.
   */
  enablePerQuestionFeedback?: boolean;
}

export const QuizPlayer = ({
  quizId,
  isArabic = false,
  onQuizComplete,
  enablePerQuestionFeedback = false,
}: QuizPlayerProps) => {
  const navigate = useNavigate();

  // Fetch quiz data
  const { data: quiz, isLoading, isError, error } = useQuiz(quizId);

  // Mutations
  const startAttempt = useStartQuizAttempt();
  const completeAttempt = useCompleteQuizAttempt();

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Map<string, UserAnswer>>(
    new Map(),
  );
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [submittedQuestionIds, setSubmittedQuestionIds] = useState<Set<string>>(
    new Set(),
  );

  const messages = isArabic ? QUIZ_MESSAGES_AR : QUIZ_MESSAGES;

  // Initialize quiz attempt
  useEffect(() => {
    if (quiz && !attemptId && !startTime) {
      const now = new Date();
      setStartTime(now);

      // Record attempt start (optional analytics)
      startAttempt.mutate(quiz.id, {
        onSuccess: (attempt) => {
          setAttemptId(attempt.id);
        },
      });
    }
  }, [quiz, attemptId, startTime, startAttempt]);

  // Current question
  const currentQuestion = quiz?.questions[currentQuestionIndex];

  // Navigation handlers
  const goToNextQuestion = useCallback(() => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  }, [quiz, currentQuestionIndex]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  }, [currentQuestionIndex]);

  // Answer selection handler
  const handleAnswerSelect = useCallback(
    (answerId: string) => {
      if (!currentQuestion) return;

      const questionId = currentQuestion.id;
      const currentAnswer = userAnswers.get(questionId);

      let newSelectedIds: string[];

      if (currentQuestion.question_type === "multi_select") {
        // Multi-select: toggle answer
        const currentIds = currentAnswer?.selected_answer_ids || [];
        newSelectedIds = currentIds.includes(answerId)
          ? currentIds.filter((id) => id !== answerId)
          : [...currentIds, answerId];
      } else {
        // Single select: replace answer
        newSelectedIds = [answerId];
      }

      const newAnswer: UserAnswer = {
        question_id: questionId,
        selected_answer_ids: newSelectedIds,
      };

      setUserAnswers((prev) => new Map(prev).set(questionId, newAnswer));
    },
    [currentQuestion, userAnswers],
  );

  const getQuestionFeedback = useCallback(
    (question: NonNullable<typeof currentQuestion>) => {
      const selectedAnswerIds =
        userAnswers.get(question.id)?.selected_answer_ids || [];
      const correctAnswerIds = question.answers
        .filter((answer) => answer.is_correct)
        .map((answer) => answer.id);
      const isCorrect =
        selectedAnswerIds.length === correctAnswerIds.length &&
        selectedAnswerIds.every((id) => correctAnswerIds.includes(id));
      const correctAnswer = question.answers.find(
        (answer) => answer.is_correct,
      );
      const rationale = isArabic
        ? correctAnswer?.explanation_ar || correctAnswer?.explanation
        : correctAnswer?.explanation;

      return { isCorrect, rationale };
    },
    [currentQuestion, isArabic, userAnswers],
  );

  const submitCurrentAnswer = useCallback(() => {
    if (!currentQuestion) return;
    const selectedAnswerIds =
      userAnswers.get(currentQuestion.id)?.selected_answer_ids || [];
    if (selectedAnswerIds.length === 0) return;

    setSubmittedQuestionIds((previous) => {
      const next = new Set(previous);
      next.add(currentQuestion.id);
      return next;
    });
  }, [currentQuestion, userAnswers]);

  // Calculate results
  const calculateResults = useCallback((): QuizResults => {
    if (!quiz || !startTime) {
      throw new Error("Quiz not loaded");
    }

    const endTime = new Date();
    const timeSpentMinutes = calculateQuizDuration(startTime, endTime);

    let correctAnswers = 0;
    let incorrectAnswers = 0;
    const answersDetail = [];

    for (const question of quiz.questions) {
      const userAnswer = userAnswers.get(question.id);
      const correctAnswerIds = question.answers
        .filter((a) => a.is_correct)
        .map((a) => a.id);

      const userAnswerIds = userAnswer?.selected_answer_ids || [];

      // Check if answer is correct
      const isCorrect =
        userAnswerIds.length === correctAnswerIds.length &&
        userAnswerIds.every((id) => correctAnswerIds.includes(id));

      if (isCorrect) {
        correctAnswers++;
      } else {
        incorrectAnswers++;
      }

      // Find explanation from correct answer
      const correctAnswer = question.answers.find((a) => a.is_correct);
      const explanation = isArabic
        ? correctAnswer?.explanation_ar || correctAnswer?.explanation
        : correctAnswer?.explanation;

      answersDetail.push({
        question,
        user_answer_ids: userAnswerIds,
        correct_answer_ids: correctAnswerIds,
        is_correct: isCorrect,
        explanation,
      });
    }

    const scorePercentage = Math.round(
      (correctAnswers / quiz.questions.length) * 100,
    );
    const passed = scorePercentage >= quiz.passing_score_percentage;

    return {
      quiz_id: quiz.id,
      quiz_title: quiz.title,
      total_questions: quiz.questions.length,
      correct_answers: correctAnswers,
      incorrect_answers: incorrectAnswers,
      score_percentage: scorePercentage,
      passed,
      time_spent_minutes: timeSpentMinutes,
      answers_detail: answersDetail,
    };
  }, [quiz, userAnswers, startTime, isArabic]);

  // Submit quiz
  const handleSubmitQuiz = useCallback(async () => {
    if (!quiz || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Calculate results
      const results = calculateResults();

      // Complete attempt (optional analytics)
      if (attemptId) {
        await completeAttempt.mutateAsync(attemptId);
      }

      // Call callback or navigate to results
      if (onQuizComplete) {
        onQuizComplete(results);
      } else {
        // Store results in sessionStorage and navigate
        sessionStorage.setItem("quiz_results", JSON.stringify(results));
        navigate(ROUTES.QUIZ.RESULTS.replace(":id", quiz.id));
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      setIsSubmitting(false);
    }
  }, [
    quiz,
    isSubmitting,
    calculateResults,
    attemptId,
    completeAttempt,
    onQuizComplete,
    navigate,
  ]);

  // Time up handler
  const handleTimeUp = useCallback(() => {
    handleSubmitQuiz();
  }, [handleSubmitQuiz]);

  // Progress calculation
  const answeredQuestions = Array.from(userAnswers.keys()).length;
  const progressPercentage = quiz
    ? Math.round((answeredQuestions / quiz.questions.length) * 100)
    : 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600">{messages.SUCCESS.QUIZ_STARTED}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">
                {messages.ERROR.QUIZ_NOT_FOUND}
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {error instanceof Error
                  ? error.message
                  : messages.ERROR.NETWORK_ERROR}
              </p>
              <button
                onClick={() => navigate(ROUTES.QUIZ.LIST)}
                className="mt-3 text-sm font-medium text-red-600 hover:text-red-700 hover:underline"
              >
                {isArabic ? "العودة إلى القائمة" : "Back to quiz list"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const currentAnswer = currentQuestion
    ? userAnswers.get(currentQuestion.id)
    : undefined;
  const hasAnswered = Boolean(
    currentAnswer && currentAnswer.selected_answer_ids.length > 0,
  );
  const isCurrentQuestionSubmitted = Boolean(
    currentQuestion && submittedQuestionIds.has(currentQuestion.id),
  );
  const currentQuestionFeedback =
    currentQuestion && enablePerQuestionFeedback && isCurrentQuestionSubmitted
      ? getQuestionFeedback(currentQuestion)
      : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 space-y-4">
          {/* Title and Timer */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isArabic && quiz.title_ar ? quiz.title_ar : quiz.title}
              </h1>
              {quiz.description && (
                <p className="mt-1 text-sm text-gray-600">
                  {isArabic && quiz.description_ar
                    ? quiz.description_ar
                    : quiz.description}
                </p>
              )}
            </div>

            <Timer
              initialSeconds={quiz.time_limit_minutes * 60}
              onTimeUp={handleTimeUp}
              showWarning
              size="lg"
            />
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {isArabic ? "التقدم" : "Progress"}: {answeredQuestions} /{" "}
                {quiz.questions.length}
              </span>
              <span className="text-gray-600">{progressPercentage}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question feedback — enabled only for lesson practice quizzes */}
        {currentQuestionFeedback && (
          <div
            className={cn(
              "mb-5 rounded-xl border p-5 shadow-sm",
              currentQuestionFeedback.isCorrect
                ? "border-emerald-200 bg-emerald-50"
                : "border-rose-200 bg-rose-50",
            )}
            role="status"
          >
            <div className="flex items-center gap-3">
              {currentQuestionFeedback.isCorrect ? (
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="h-6 w-6 shrink-0 text-rose-600" />
              )}
              <div>
                <p
                  className={cn(
                    "font-bold",
                    currentQuestionFeedback.isCorrect
                      ? "text-emerald-800"
                      : "text-rose-800",
                  )}
                >
                  {currentQuestionFeedback.isCorrect
                    ? isArabic
                      ? "إجابتك صحيحة"
                      : "Correct answer"
                    : isArabic
                      ? "إجابتك غير صحيحة"
                      : "Incorrect answer"}
                </p>
              </div>
            </div>
            {currentQuestionFeedback.rationale && (
              <div className="mt-4 border-t border-current/10 pt-4 text-sm leading-relaxed text-slate-700">
                <p className="mb-1 font-semibold text-slate-900">
                  {isArabic ? "التبرير" : "Rationale"}
                </p>
                <p>{currentQuestionFeedback.rationale}</p>
              </div>
            )}
          </div>
        )}

        {/* Question Card */}
        {currentQuestion && (
          <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
            <QuestionCard
              question={currentQuestion}
              selectedAnswerIds={currentAnswer?.selected_answer_ids || []}
              onAnswerSelect={handleAnswerSelect}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={quiz.questions.length}
              disabled={isCurrentQuestionSubmitted}
              isArabic={isArabic}
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              {
                "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50":
                  currentQuestionIndex > 0,
                "bg-gray-100 text-gray-400 cursor-not-allowed":
                  currentQuestionIndex === 0,
              },
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            {isArabic ? "السابق" : "Previous"}
          </button>

          <div className="flex items-center gap-3">
            {enablePerQuestionFeedback && !isCurrentQuestionSubmitted ? (
              <button
                onClick={submitCurrentAnswer}
                disabled={!hasAnswered}
                className="flex items-center gap-2 rounded-lg bg-[#0f91e0] px-6 py-2 font-medium text-white transition-all hover:bg-[#1c4a8b] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isArabic ? "إرسال الإجابة" : "Submit Answer"}
                <CheckCircle2 className="h-4 w-4" />
              </button>
            ) : !isLastQuestion ? (
              <button
                onClick={goToNextQuestion}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 active:bg-blue-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isArabic ? "التالي" : "Next"}
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitConfirmation(true)}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 active:bg-green-800 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Flag className="h-4 w-4" />
                {isSubmitting
                  ? isArabic
                    ? "جاري الإرسال..."
                    : "Submitting..."
                  : isArabic
                    ? "إنهاء الاختبار"
                    : "Finish Quiz"}
              </button>
            )}
          </div>
        </div>

        {/* Submit Confirmation Dialog */}
        {showSubmitConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900">
                {isArabic ? "تأكيد الإرسال" : "Confirm Submission"}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {isArabic
                  ? `لقد أجبت على ${answeredQuestions} من ${quiz.questions.length} أسئلة. هل أنت متأكد أنك تريد إنهاء الاختبار؟`
                  : `You have answered ${answeredQuestions} out of ${quiz.questions.length} questions. Are you sure you want to submit?`}
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowSubmitConfirmation(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={() => {
                    setShowSubmitConfirmation(false);
                    handleSubmitQuiz();
                  }}
                  disabled={isSubmitting}
                  className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isArabic ? "تأكيد الإرسال" : "Confirm & Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

QuizPlayer.displayName = "QuizPlayer";
