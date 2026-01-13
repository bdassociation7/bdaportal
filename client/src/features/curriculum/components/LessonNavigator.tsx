/**
 * Lesson Navigator Component
 * Navigation between lessons within a module with status indicators
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Lock, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLessonsByModule, useLessonProgress, useIsLessonUnlocked } from '@/entities/curriculum';
import type { Lesson } from '@/entities/curriculum';

interface LessonNavigatorProps {
  currentLesson: Lesson;
  moduleId: string;
  userId: string | undefined;
  basePath?: string;
  moduleLang?: string; // Module's exam_language for navigation
}

export function LessonNavigator({
  currentLesson,
  moduleId,
  userId,
  basePath = '/learning-system/training-kits',
  moduleLang,
}: LessonNavigatorProps) {
  const navigate = useNavigate();

  // Helper to build URL with language parameter
  const withLang = (url: string) => {
    if (moduleLang) {
      return `${url}?lang=${moduleLang}`;
    }
    return url;
  };

  // Memoize filters to prevent new object reference on every render
  // This prevents React Query from treating it as a new query key
  const progressFilters = useMemo(() => ({ module_id: moduleId }), [moduleId]);

  // Fetch all 3 lessons for this module
  const { data: moduleLessons } = useLessonsByModule(moduleId);

  // Fetch user progress for all lessons
  const { data: allProgress } = useLessonProgress(userId, progressFilters);

  // Calculate next lesson - memoized to be stable for hook dependency
  // All hooks must be called before any early returns to follow React's rules of hooks
  const nextLesson = useMemo(() => {
    if (!moduleLessons || moduleLessons.length === 0) return null;
    const sortedLessons = [...moduleLessons].sort((a, b) => a.order_index - b.order_index);
    const currentIndex = sortedLessons.findIndex((l) => l.id === currentLesson.id);
    return currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null;
  }, [moduleLessons, currentLesson.id]);

  // Check if next lesson is unlocked using database function
  // IMPORTANT: This hook MUST be called before any early returns
  const { data: isNextLessonUnlocked } = useIsLessonUnlocked(
    userId,
    nextLesson?.id,
    !!nextLesson
  );

  // Early return AFTER all hooks are called
  if (!moduleLessons || moduleLessons.length === 0) {
    return null;
  }

  // Sort lessons by order_index
  const sortedLessons = [...moduleLessons].sort((a, b) => a.order_index - b.order_index);

  // Find previous and next lessons
  const currentIndex = sortedLessons.findIndex((l) => l.id === currentLesson.id);
  const previousLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null;

  return (
    <div className="mt-8 space-y-4">
      {/* Lesson Cards (3 dots showing progress) */}
      <Card className="p-4">
        <div className="flex items-center justify-center gap-4">
          {sortedLessons.map((lesson, index) => {
            const lessonProgress = allProgress?.find((p) => p.lesson_id === lesson.id);
            const isCurrent = lesson.id === currentLesson.id;
            const isCompleted = lessonProgress?.status === 'completed';
            const isLocked = lessonProgress?.status === 'locked';

            return (
              <div
                key={lesson.id}
                className={`flex flex-col items-center gap-2 ${
                  isCurrent ? 'scale-110' : 'opacity-60'
                }`}
              >
                {/* Icon */}
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full ${
                    isCurrent
                      ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-600'
                      : isCompleted
                      ? 'bg-green-100 text-green-600'
                      : isLocked
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-yellow-100 text-yellow-600'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : isLocked ? (
                    <Lock className="h-6 w-6" />
                  ) : (
                    <Circle className="h-6 w-6" />
                  )}
                </div>

                {/* Label */}
                <div className="text-center">
                  <div
                    className={`text-xs font-medium ${
                      isCurrent ? 'text-blue-600' : 'text-muted-foreground'
                    }`}
                  >
                    Lesson {lesson.order_index}
                  </div>
                  <div className="text-xs text-muted-foreground max-w-[100px] truncate">
                    {lesson.title}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        {/* Previous Lesson */}
        {previousLesson ? (
          <Button
            variant="outline"
            onClick={() =>
              navigate(withLang(`${basePath}/modules/${moduleId}/lessons/${previousLesson.id}`))
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous Lesson
          </Button>
        ) : (
          <div /> // Spacer
        )}

        {/* Next Lesson */}
        {nextLesson ? (
          isNextLessonUnlocked ? (
            <Button
              onClick={() =>
                navigate(withLang(`${basePath}/modules/${moduleId}/lessons/${nextLesson.id}`))
              }
            >
              Next Lesson
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" disabled>
              <Lock className="mr-2 h-4 w-4" />
              Lesson Locked
            </Button>
          )
        ) : (
          <Button
            variant="outline"
            onClick={() => navigate(withLang(`${basePath}/module/${moduleId}`))}
          >
            Back to Module
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Completion Message */}
      {!nextLesson && currentLesson.order_index === 3 && (
        <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            Congratulations! Module Completed
          </h3>
          <p className="text-sm text-green-700 mb-4">
            You have completed all 3 lessons of this module.
          </p>
          <Button onClick={() => navigate(withLang(`${basePath}/module/${moduleId}`))}>
            Back to Module
          </Button>
        </div>
      )}
    </div>
  );
}
