/**
 * Lesson Quiz Gate Component
 * End-of-lesson quiz interface
 *
 * Integrates the QuizPlayer directly into the lesson flow
 */

import { useState } from 'react';
import { ArrowLeft, CheckCircle, Award, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCompleteQuiz } from '@/entities/curriculum';
import { QuizPlayer } from '@/features/quiz/components/QuizPlayer';
import type { Lesson, LessonProgress } from '@/entities/curriculum';
import type { QuizResults } from '@/entities/quiz';

interface LessonQuizGateProps {
  lesson: Lesson;
  progress: LessonProgress;
  onBack: () => void;
}

export function LessonQuizGate({ lesson, progress, onBack }: LessonQuizGateProps) {
  const [isPlayingQuiz, setIsPlayingQuiz] = useState(false);
  const completeQuiz = useCompleteQuiz();

  const passingScore = lesson.quiz_passing_score || 70;
  const hasPassedQuiz =
    progress.status === 'completed' ||
    (progress.best_quiz_score !== null && progress.best_quiz_score >= passingScore);

  // Handle quiz completion from QuizPlayer
  const handleQuizComplete = (results: QuizResults) => {
    const score = results.score_percentage;

    completeQuiz.mutate({
      userId: progress.user_id,
      lessonId: lesson.id,
      quizScore: score,
    });

    // Reset quiz playing state
    setIsPlayingQuiz(false);
  };

  // If quiz is already completed successfully
  if (hasPassedQuiz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
            <p className="text-muted-foreground">
              You achieved a score of {progress.best_quiz_score}%
            </p>
          </div>

          {progress.quiz_attempts_count > 1 && (
            <div className="mb-6 text-sm text-muted-foreground">
              Number of attempts: {progress.quiz_attempts_count}
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={onBack} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lesson
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // If quiz is being played, show QuizPlayer
  if (isPlayingQuiz && lesson.lesson_quiz_id) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <QuizPlayer
            quizId={lesson.lesson_quiz_id}
            onQuizComplete={handleQuizComplete}
          />
        </div>
      </div>
    );
  }

  // Quiz not started yet or failed - Show intro screen
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Award className="h-8 w-8 text-blue-600" />
            <h2 className="text-2xl font-bold">Practice Quiz (Optional)</h2>
          </div>
          <p className="text-muted-foreground">
            Test your knowledge and understanding of this lesson
          </p>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This quiz is optional and does not affect your progression to the next lesson
            </p>
          </div>
        </div>

        {/* Lesson Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-1">{lesson.title}</h3>
          {lesson.title_ar && (
            <p className="text-sm text-muted-foreground" dir="rtl">
              {lesson.title_ar}
            </p>
          )}
        </div>

        {/* Quiz Requirements */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">Passing score</span>
            <span className="text-lg font-bold text-blue-600">{passingScore}%</span>
          </div>

          {progress.best_quiz_score !== null && (
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="text-sm font-medium">Your best score</span>
              <span className="text-lg font-bold text-yellow-700">
                {progress.best_quiz_score}%
              </span>
            </div>
          )}

          {progress.quiz_attempts_count > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              Attempt {progress.quiz_attempts_count + 1}
            </div>
          )}
        </div>

        {/* Quiz Actions */}
        <div className="space-y-3">
          {lesson.lesson_quiz_id ? (
            <Button
              className="w-full"
              size="lg"
              onClick={() => setIsPlayingQuiz(true)}
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Start Quiz
            </Button>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-sm text-yellow-800">
                No quiz is configured for this lesson.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => {
                  // Auto-complete with perfect score if no quiz configured
                  handleQuizComplete({
                    quiz_id: '',
                    quiz_title: 'No quiz',
                    total_questions: 0,
                    correct_answers: 0,
                    incorrect_answers: 0,
                    score_percentage: 100,
                    passed: true,
                    time_spent_minutes: 0,
                    answers_detail: [],
                  });
                }}
              >
                Mark as Completed
              </Button>
            </div>
          )}

          <Button variant="ghost" onClick={onBack} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Skip Quiz & Go Back
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            You can retake this quiz as many times as you like. Only your best score will be saved. Completing this quiz is optional and won't block your progress.
          </p>
        </div>
      </Card>
    </div>
  );
}
