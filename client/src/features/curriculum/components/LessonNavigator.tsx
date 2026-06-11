/**
 * Lesson Navigator — SHRM-style
 * No lock, free navigation between all lessons
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Circle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLessonsByModule, useLessonProgress } from '@/entities/curriculum';

interface LessonNavigatorProps {
  currentLesson: { id: string; order_index: number; title: string; module_id: string; module?: { exam_language?: string } };
  moduleId: string;
  userId: string | undefined;
  basePath?: string;
  moduleLang?: string;
}

export function LessonNavigator({
  currentLesson,
  moduleId,
  userId,
  basePath = '/learning-system/training-kits',
  moduleLang,
}: LessonNavigatorProps) {
  const navigate = useNavigate();

  const { data: moduleLessons } = useLessonsByModule(moduleId);
  const progressFilters = useMemo(() => ({ module_id: moduleId }), [moduleId]);
  const { data: allProgress } = useLessonProgress(userId, progressFilters);

  if (!moduleLessons || moduleLessons.length === 0) return null;

  const sortedLessons = [...moduleLessons].sort((a, b) => a.order_index - b.order_index);
  const currentIndex = sortedLessons.findIndex((l) => l.id === currentLesson.id);
  const previousLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null;

  const getLessonStatus = (lessonId: string) => {
    const p = allProgress?.find((p) => p.lesson_id === lessonId);
    return p?.status || 'not_started';
  };

  const withLang = (path: string) => {
    const lang = moduleLang;
    return lang ? `${path}?lang=${lang}` : path;
  };

  return (
    <div className="mt-8 space-y-4">
      {/* Lesson Progress Dots */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {sortedLessons.map((lesson) => {
            const status = getLessonStatus(lesson.id);
            const isCurrent = lesson.id === currentLesson.id;
            const isCompleted = status === 'completed';
            const isInProgress = status === 'in_progress';

            return (
              <button
                key={lesson.id}
                title={lesson.title}
                onClick={() =>
                  navigate(withLang(`${basePath}/modules/${moduleId}/lessons/${lesson.id}`))
                }
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all hover:bg-gray-50 ${
                  isCurrent ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'bg-green-100 text-green-700'
                      : isInProgress
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : isInProgress ? (
                    <PlayCircle className="h-4 w-4" />
                  ) : (
                    lesson.order_index
                  )}
                </div>
                <span
                  className={`text-xs max-w-[80px] truncate ${
                    isCurrent ? 'text-blue-600 font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {lesson.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        {previousLesson ? (
          <Button
            variant="outline"
            onClick={() =>
              navigate(withLang(`${basePath}/modules/${moduleId}/lessons/${previousLesson.id}`))
            }
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous Lesson
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => navigate(withLang(`${basePath}/module/${moduleId}`))}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Module
          </Button>
        )}

        {nextLesson ? (
          <Button
            onClick={() =>
              navigate(withLang(`${basePath}/modules/${moduleId}/lessons/${nextLesson.id}`))
            }
            className="gap-2"
          >
            Next Lesson
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => navigate(withLang(`${basePath}/module/${moduleId}`))}
            className="gap-2"
          >
            Back to Module
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
