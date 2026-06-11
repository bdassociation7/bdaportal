/**
 * Module Lessons Component — SHRM-style with BDA Branding
 * All lessons unlocked, self-paced, compact sidebar list
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle, Clock, ChevronRight, Circle, PlayCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  useLessonsByModule,
  useLessonProgress,
  type Lesson,
  type LessonProgress,
} from '@/entities/curriculum';

// BDA Brand Colors
const BDA = {
  navy: '#1C4A8B',
  navyDark: '#0d1f4e',
  blue: '#0f91e0',
  bluePale: '#f0f6ff',
  blueMid: '#e8f0fb',
  border: '#d0e4f7',
};

interface ModuleLessonsProps {
  moduleId: string;
  userId: string | undefined;
  basePath?: string;
  examLanguage?: string;
}

export function ModuleLessons({
  moduleId,
  userId,
  basePath = '/learning-system',
  examLanguage,
}: ModuleLessonsProps) {
  const navigate = useNavigate();

  const progressFilters = useMemo(() => ({ module_id: moduleId }), [moduleId]);

  const { data: lessons, isLoading: isLoadingLessons } = useLessonsByModule(moduleId);
  const { data: allProgress, isLoading: isLoadingProgress } = useLessonProgress(userId, progressFilters);



  if (isLoadingLessons || isLoadingProgress) {
    return (
      <div className="py-4">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl" style={{ background: BDA.bluePale }} />
          ))}
        </div>
      </div>
    );
  }

  if (!lessons || lessons.length === 0) {
    return (
      <div className="py-8 text-center">
        <BookOpen className="h-8 w-8 mx-auto mb-2" style={{ color: BDA.blue }} />
        <p className="text-xs text-gray-500">No lessons available yet.</p>
      </div>
    );
  }

  const sortedLessons = [...lessons].sort((a, b) => a.order_index - b.order_index);

  const getLessonProgress = (lessonId: string): LessonProgress | undefined =>
    allProgress?.find((p) => p.lesson_id === lessonId);

  const completedCount = sortedLessons.filter(
    (l) => getLessonProgress(l.id)?.status === 'completed'
  ).length;

  const handleLessonClick = (lesson: Lesson) => {
    navigate(`${basePath}/modules/${moduleId}/lessons/${lesson.id}`);
  };

  return (
    <div>
      {/* Count header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: BDA.navy }}>
          {sortedLessons.length} Lessons
        </span>
        <span className="text-xs" style={{ color: BDA.navy }}>
          {completedCount} / {sortedLessons.length} completed
        </span>
      </div>

      {/* Lessons List */}
      <div className="space-y-1.5">
        {sortedLessons.map((lesson) => {
          const progress = getLessonProgress(lesson.id);
          const isCompleted = progress?.status === 'completed';
          const isInProgress = progress?.status === 'in_progress';
          const displayTitle = lesson.title;

          // Style per status
          const rowStyle = isCompleted
            ? { border: '1px solid #bbf7d0', background: '#f0fdf4' }
            : isInProgress
            ? { border: `1px solid ${BDA.border}`, background: BDA.bluePale }
            : { border: '1px solid #e5e7eb', background: '#fff' };

          const numStyle = isCompleted
            ? { background: '#dcfce7', color: '#16a34a' }
            : isInProgress
            ? { background: BDA.blueMid, color: BDA.navy }
            : { background: '#f1f5f9', color: '#64748b' };

          return (
            <div
              key={lesson.id}
              className="group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 hover:shadow-sm"
              style={rowStyle}
              onClick={() => handleLessonClick(lesson)}
            >
              {/* Number / Status */}
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={numStyle}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" style={{ color: '#16a34a' }} />
                ) : isInProgress ? (
                  <PlayCircle className="h-4 w-4" style={{ color: BDA.blue }} />
                ) : (
                  lesson.order_index
                )}
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium leading-snug"
                  style={{ color: BDA.navyDark }}

                >
                  {displayTitle}
                </p>
                {isCompleted && (
                  <span className="text-xs" style={{ color: '#16a34a' }}>Completed</span>
                )}
                {isInProgress && (
                  <>
                    <span className="text-xs" style={{ color: BDA.blue }}>In Progress</span>
                    {progress?.progress_percentage != null && (
                      <div className="mt-1">
                        <Progress value={progress.progress_percentage} className="h-1" />
                      </div>
                    )}
                  </>
                )}
                {!isCompleted && !isInProgress && lesson.estimated_duration_hours && (
                  <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {lesson.estimated_duration_hours}h
                  </span>
                )}
              </div>

              {/* Arrow */}
              <ChevronRight
                className="h-4 w-4 flex-shrink-0 transition-colors"
                style={{ color: isInProgress ? BDA.blue : '#9ca3af' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
