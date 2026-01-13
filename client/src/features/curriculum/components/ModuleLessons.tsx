/**
 * Module Lessons Component
 * Displays the list of 3 lessons in a module with status and unlock logic
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Lock, CheckCircle, Clock, Eye, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  useLessonsByModule,
  useLessonProgress,
  type Lesson,
  type LessonProgress,
} from '@/entities/curriculum';

interface ModuleLessonsProps {
  moduleId: string;
  userId: string | undefined;
  basePath?: string;
}

export function ModuleLessons({ moduleId, userId, basePath = '/learning-system' }: ModuleLessonsProps) {
  const navigate = useNavigate();

  // Memoize filters to prevent new object reference on every render
  const progressFilters = useMemo(() => ({ module_id: moduleId }), [moduleId]);

  // Fetch the 3 lessons for this module
  const { data: lessons, isLoading: isLoadingLessons } = useLessonsByModule(moduleId);

  // Fetch user progress for all lessons
  const { data: allProgress, isLoading: isLoadingProgress } = useLessonProgress(userId, progressFilters);

  if (isLoadingLessons || isLoadingProgress) {
    return (
      <div className="py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!lessons || lessons.length === 0) {
    return (
      <div className="py-8 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">
          No lessons available for this module yet
        </p>
      </div>
    );
  }

  // Sort lessons by order_index
  const sortedLessons = [...lessons].sort((a, b) => a.order_index - b.order_index);

  const getLessonProgress = (lessonId: string): LessonProgress | undefined => {
    return allProgress?.find((p) => p.lesson_id === lessonId);
  };

  const getStatusIcon = (lesson: Lesson, progress: LessonProgress | undefined, isLocked: boolean) => {
    if (isLocked) {
      return <Lock className="h-5 w-5 text-gray-400" />;
    }

    if (!progress || progress.status === 'locked') {
      // First lesson without progress - show as ready to start
      return <BookOpen className="h-5 w-5 text-blue-600" />;
    }

    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'quiz_pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'in_progress':
        return <Eye className="h-5 w-5 text-blue-600" />;
      default:
        return <BookOpen className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (lesson: Lesson, progress: LessonProgress | undefined, isLocked: boolean) => {
    if (isLocked) {
      return <Badge variant="outline">Locked</Badge>;
    }

    if (!progress || progress.status === 'locked') {
      // First lesson without progress - show as ready to start
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Ready</Badge>;
    }

    switch (progress.status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'quiz_pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Quiz Pending</Badge>
        );
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>;
      default:
        return null;
    }
  };

  const canAccessLesson = (lesson: Lesson, progress: LessonProgress | undefined): boolean => {
    // First lesson is always unlocked
    if (lesson.order_index === 1) {
      return true;
    }

    // Check if progress exists and is not locked
    if (progress && progress.status !== 'locked') {
      return true;
    }

    // Check if previous lesson is completed
    const prevLesson = sortedLessons.find(l => l.order_index === lesson.order_index - 1);
    if (prevLesson) {
      const prevProgress = getLessonProgress(prevLesson.id);
      return prevProgress?.status === 'completed';
    }

    return false;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">The 3 lessons of this module</h3>
        <div className="text-sm text-muted-foreground">
          {allProgress?.filter((p) => p.status === 'completed').length || 0} / 3 completed
        </div>
      </div>

      {sortedLessons.map((lesson) => {
        const progress = getLessonProgress(lesson.id);
        const isLocked = !canAccessLesson(lesson, progress);

        return (
          <Card
            key={lesson.id}
            className={`overflow-hidden transition-all hover:shadow-md ${
              isLocked ? 'opacity-60' : 'cursor-pointer'
            }`}
            onClick={() => {
              if (!isLocked) {
                navigate(`${basePath}/modules/${moduleId}/lessons/${lesson.id}`);
              }
            }}
          >
            <div className="p-5">
              <div className="flex items-start gap-4">
                {/* Order Number */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                    isLocked
                      ? 'bg-gray-100 text-gray-400'
                      : progress?.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : progress?.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {lesson.order_index}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title and Status */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(lesson, progress, isLocked)}
                        <h4 className="font-semibold text-lg">{lesson.title}</h4>
                      </div>
                      {lesson.title_ar && (
                        <p className="text-sm text-muted-foreground" dir="rtl">
                          {lesson.title_ar}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(lesson, progress, isLocked)}
                  </div>

                  {/* Description */}
                  {lesson.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {lesson.description}
                    </p>
                  )}

                  {/* Progress Bar (if in progress) */}
                  {progress && progress.status !== 'locked' && progress.status !== 'completed' && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{progress.progress_percentage || 0}%</span>
                      </div>
                      <Progress value={progress.progress_percentage || 0} className="h-2" />
                    </div>
                  )}

                  {/* Footer Info */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      {lesson.estimated_duration_hours && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {lesson.estimated_duration_hours}h
                          </span>
                        </div>
                      )}

                      {progress?.status === 'completed' && progress.best_quiz_score !== null && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Quiz: {progress.best_quiz_score}%</span>
                        </div>
                      )}
                    </div>

                    {!isLocked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`${basePath}/modules/${moduleId}/lessons/${lesson.id}`);
                        }}
                      >
                        {progress?.status === 'completed' ? 'Review' : 'Start'}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Lock Message */}
                  {isLocked && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      {lesson.order_index === 1
                        ? 'Unlocked automatically'
                        : `Complete lesson ${lesson.order_index - 1} to unlock`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
