/**
 * Lesson Quiz Gate Component
 * End-of-lesson quiz interface
 *
 * Integrates the QuizPlayer directly into the lesson flow
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Award, PlayCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCompleteQuiz, useLessonsByModule } from '@/entities/curriculum';
import { QuizPlayer } from '@/features/quiz/components/QuizPlayer';
import type { Lesson, LessonProgress } from '@/entities/curriculum';
import type { QuizResults } from '@/entities/quiz';

interface LessonQuizGateProps {
  lesson: Lesson;
  progress: LessonProgress;
  onBack: () => void;
  /** Base path for navigation (e.g. /learning-system/training-kits) */
  basePath?: string;
}

export function LessonQuizGate({
  lesson,
  progress,
  onBack,
  basePath = '/learning-system/training-kits',
}: LessonQuizGateProps) {
  const navigate = useNavigate();
  const [isPlayingQuiz, setIsPlayingQuiz] = useState(false);
  const completeQuiz = useCompleteQuiz();

  // For a practice quiz we only track whether the trainee has attempted it
  const hasAttempted = progress.quiz_attempts_count > 0;

  // Fetch sibling lessons to find next lesson
  const { data: moduleLessons } = useLessonsByModule(lesson.module_id);
  const sortedLessons = moduleLessons
    ? [...moduleLessons].sort((a, b) => a.order_index - b.order_index)
    : [];
  const currentIndex = sortedLessons.findIndex((l) => l.id === lesson.id);
  const nextLesson = currentIndex >= 0 && currentIndex < sortedLessons.length - 1
    ? sortedLessons[currentIndex + 1]
    : null;

  const goToNextLesson = () => {
    if (nextLesson) {
      navigate(`${basePath}/modules/${lesson.module_id}/lessons/${nextLesson.id}`);
    } else {
      navigate(`${basePath}/module/${lesson.module_id}`);
    }
  };

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

  // After completing the quiz, show a summary screen
  if (hasAttempted && !isPlayingQuiz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
            {progress.best_quiz_score !== null && (
              <p className="text-muted-foreground">
                Your score: <span className="font-semibold text-gray-800">{progress.best_quiz_score}%</span>
              </p>
            )}
          </div>

          <div className="space-y-3">
            {/* Primary: go to next lesson or module */}
            <Button className="w-full" onClick={goToNextLesson}>
              {nextLesson ? (
                <>
                  Next Lesson
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Back to Module
                  <Home className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <Button onClick={onBack} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lesson
            </Button>
            <Button variant="ghost" onClick={() => setIsPlayingQuiz(true)} className="w-full">
              <PlayCircle className="mr-2 h-4 w-4" />
              Retake Quiz
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

  // Quiz not started yet — Show intro screen
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Award className="h-8 w-8 text-blue-600" />
            <h2 className="text-2xl font-bold">Practice Quiz</h2>
          </div>
          <p className="text-muted-foreground">
            Test your knowledge and understanding of this lesson
          </p>
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
            </div>
          )}

          {/* Navigation buttons */}
          <Button
            variant="outline"
            className="w-full"
            onClick={goToNextLesson}
          >
            {nextLesson ? (
              <>
                Skip & Go to Next Lesson
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Skip & Back to Module
                <Home className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <Button variant="ghost" onClick={onBack} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lesson
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            You can retake this quiz as many times as you like. Only your best score will be saved.
          </p>
        </div>
      </Card>
    </div>
  );
}
