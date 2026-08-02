/**
 * Lesson Progress Tracker Component
 * Displays reading progress and lesson status
 */

import { CheckCircle, Clock, Eye } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { LessonProgress } from '@/entities/curriculum';

interface LessonProgressTrackerProps {
  progress: LessonProgress | null | undefined;
  readingProgress: number;
}

export function LessonProgressTracker({
  progress,
  readingProgress,
}: LessonProgressTrackerProps) {
  if (!progress) {
    // Return a fixed-width placeholder to prevent header layout shift
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 rounded-full bg-gray-100" />
          <span className="text-sm text-muted-foreground font-medium">0%</span>
        </div>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (progress.status) {
      case 'completed':
        return (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Completed</span>
          </div>
        );

      case 'quiz_pending':
        return (
          <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-full">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Quiz Pending</span>
          </div>
        );

      case 'in_progress':
        return (
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">In Progress</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4">
        {/* Reading Progress Bar */}
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-2">
              <div className="w-32">
                <Progress value={readingProgress} className="h-2" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">
                {readingProgress}%
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reading Progress</p>
          </TooltipContent>
        </Tooltip>

        {/* Status Badge */}
        {getStatusBadge()}

        {/* Quiz Score (if completed) */}
        {progress.status === 'completed' && progress.best_quiz_score !== null && (
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="font-medium">{progress.best_quiz_score}%</span>
                <span>quiz score</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Best quiz score</p>
              {progress.quiz_attempts_count > 1 && (
                <p className="text-xs mt-1">
                  {progress.quiz_attempts_count} attempts
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
