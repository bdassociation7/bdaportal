/**
 * Lesson Viewer Page
 * View an individual lesson (1 of the 42 sub-competencies)
 *
 * Features:
 * - Rich content display (TipTap/Lexical JSON)
 * - Reading progress tracking
 * - Time spent tracking
 * - Auto-completion upon reading
 * - Navigation to next lesson
 * - Sequential unlocking system
 */

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  useLessonProgressById,
  useIsLessonUnlocked,
  useLesson,
  useUpdateLessonProgress,
} from '@/entities/curriculum';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Lock, Clock, CheckCircle, BookOpen, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LessonContent } from '../components/LessonContent';
import { LessonProgressTracker } from '../components/LessonProgressTracker';
import { LessonNavigator } from '../components/LessonNavigator';
import { LessonQuizGate } from '../components/LessonQuizGate';

export function LessonViewer() {
  const { lessonId, moduleId } = useParams<{ lessonId: string; moduleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [readingProgress, setReadingProgress] = useState(0);
  const [showOptionalQuiz, setShowOptionalQuiz] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const timeTrackerRef = useRef<NodeJS.Timeout>();
  const progressUpdateTimeoutRef = useRef<NodeJS.Timeout>();

  // Use refs to store values needed in scroll handler without causing re-renders
  const progressPercentageRef = useRef<number>(0);
  const hasScrollListenerRef = useRef(false);
  const saveProgressRef = useRef<((scrollProgress: number) => void) | null>(null);

  // Detect base path from current location (ECP vs individual learning system)
  const basePath = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/ecp/learning-system')) {
      return '/ecp/learning-system/training-kits';
    }
    return '/learning-system/training-kits';
  }, [location.pathname]);

  // Helpers for back/module navigation (EN only)
  const getBackUrl = () => basePath;
  const getModuleUrl = (modId: string) => `${basePath}/module/${modId}`;

  // Fetch lesson data
  const { data: lesson, isLoading: isLoadingLesson } = useLesson(lessonId);

  // Fetch user progress for this lesson
  const { data: progress, isLoading: isLoadingProgress } = useLessonProgressById(
    user?.id,
    lessonId
  );

  // Mutation to update progress
  const updateProgress = useUpdateLessonProgress();

  // SHRM-style: All lessons are always accessible — no sequential lock
  const canAccessLesson = true;
  const isCheckingUnlock = false;

  // Keep progress percentage ref in sync (doesn't cause re-renders)
  useEffect(() => {
    progressPercentageRef.current = progress?.progress_percentage || 0;
  }, [progress?.progress_percentage]);

  // Keep save progress function in ref (updated via effect, called via ref to avoid dependency issues)
  useEffect(() => {
    saveProgressRef.current = (scrollProgress: number) => {
      if (!user?.id || !lessonId) return;

      updateProgress.mutate({
        userId: user.id,
        lessonId: lessonId,
        updates: {
          progress_percentage: scrollProgress,
          status: scrollProgress === 100 ? 'completed' : 'in_progress',
          completed_at: scrollProgress === 100 ? new Date().toISOString() : undefined,
        },
      });
    };
  }, [user?.id, lessonId, updateProgress]);

  // Ref to track if auto-complete has been attempted for this lesson
  const autoCompleteAttemptedRef = useRef<string | null>(null);

  // Auto-complete for short content that doesn't need scrolling
  useEffect(() => {
    if (!canAccessLesson || !contentRef.current || !user?.id || !lessonId) return;
    if (progress?.status === 'completed') return; // Already completed
    if (autoCompleteAttemptedRef.current === lessonId) return; // Already attempted for this lesson

    const element = contentRef.current;

    const checkAndAutoComplete = () => {
      const scrollableHeight = element.scrollHeight - element.clientHeight;
      // If content fits without scrolling (less than 10px to scroll)
      if (scrollableHeight <= 10) {
        autoCompleteAttemptedRef.current = lessonId; // Mark as attempted
        setReadingProgress(100);
        updateProgress.mutate({
          userId: user.id,
          lessonId: lessonId,
          updates: {
            progress_percentage: 100,
            status: 'completed',
            completed_at: new Date().toISOString(),
          },
        });
      }
    };

    // Check after content renders
    const timeout = setTimeout(checkAndAutoComplete, 1000);
    return () => clearTimeout(timeout);
  }, [canAccessLesson, user?.id, lessonId, progress?.status]);

  // Track reading progress on scroll - only set up listener once when canAccessLesson becomes true
  useEffect(() => {
    // Only set up the listener once canAccessLesson is true
    if (!canAccessLesson) return;
    if (!contentRef.current) return;
    if (hasScrollListenerRef.current) return;

    const element = contentRef.current;

    const handleScroll = () => {
      if (!element) return;

      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const scrollProgress = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;

      setReadingProgress(Math.min(scrollProgress, 100));

      // Debounce progress updates to avoid mutation storm
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current);
      }

      // Update progress in database if increased (debounced, using ref for current value)
      if (scrollProgress > progressPercentageRef.current) {
        progressUpdateTimeoutRef.current = setTimeout(() => {
          saveProgressRef.current?.(scrollProgress);
          // Update ref immediately so we don't send duplicate updates
          progressPercentageRef.current = scrollProgress;
        }, 1000); // Wait 1 second after scrolling stops
      }
    };

    element.addEventListener('scroll', handleScroll);
    hasScrollListenerRef.current = true;

    return () => {
      element.removeEventListener('scroll', handleScroll);
      hasScrollListenerRef.current = false;
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current);
      }
    };
  }, [canAccessLesson]); // Only depends on canAccessLesson - all other values accessed via refs

  // Track time spent (increment every minute)
  useEffect(() => {
    if (!user || !lessonId || !canAccessLesson) return;

    timeTrackerRef.current = setInterval(() => {
      // Note: Time tracking can be added to lesson_progress table if needed
      // For now, we just keep the user engaged
    }, 60000); // Every 1 minute

    return () => {
      if (timeTrackerRef.current) {
        clearInterval(timeTrackerRef.current);
      }
    };
  }, [user, lessonId, canAccessLesson]);

  const isLoading = isLoadingLesson || isLoadingProgress;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    );
  }

  // Lesson not found
  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Lesson Not Found</h2>
          <p className="text-muted-foreground mb-6">
            This lesson does not exist or has been deleted.
          </p>
          <Button onClick={() => navigate(getModuleUrl(moduleId || '', urlLang || undefined))}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Module
          </Button>
        </div>
      </div>
    );
  }

  // No lock check needed — all lessons are open (SHRM-style)

  // Show optional quiz if user requested it
  if (showOptionalQuiz && lesson.lesson_quiz_id && progress) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LessonQuizGate
          lesson={lesson}
          progress={progress}
          onBack={() => setShowOptionalQuiz(false)}
        />
      </div>
    );
  }

  // Main lesson viewer
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
                onClick={() => navigate(getModuleUrl(lesson.module_id))}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              <div className="border-l pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Lesson {lesson.order_index} / 3
                  </span>
                </div>
                <h1 className="text-xl font-bold">
                  {lesson.title}
                </h1>
              </div>
            </div>

            {/* Progress Indicator */}
            <LessonProgressTracker
              progress={progress}
              readingProgress={readingProgress}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Lesson Info */}
          {lesson.description && (
            <div className="p-6 border-b bg-blue-50">
              <p className="text-sm text-gray-700">
                {lesson.description}
              </p>
            </div>
          )}

          {/* Estimated Duration */}
          {lesson.estimated_duration_hours && (
            <div className="px-6 py-3 border-b bg-gray-50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Estimated duration: {lesson.estimated_duration_hours} hour{lesson.estimated_duration_hours > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Learning Objectives */}
          {lesson.learning_objectives && lesson.learning_objectives.length > 0 && (
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold mb-2">Learning Objectives:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                {lesson.learning_objectives.map((objective, index) => (
                  <li key={index}>{objective}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Lesson Content */}
          <div
            ref={contentRef}
            className="p-6 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 400px)' }}
          >
            <LessonContent
              content={lesson.content}
              contentAr={undefined}
            />
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t bg-gray-50">
            {readingProgress >= 100 || progress?.status === 'completed' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 justify-center">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Lesson completed!</span>
                </div>

                {/* Optional Quiz Button */}
                {lesson.lesson_quiz_id && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setShowOptionalQuiz(true)}
                      className="w-auto"
                    >
                      <Award className="mr-2 h-4 w-4" />
                      Practice Quiz (Optional)
                    </Button>
                  </div>
                )}

                <p className="text-sm text-muted-foreground text-center">
                  Use the navigation below to continue to the next lesson
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center">
                Scroll down to complete the lesson
              </div>
            )}
          </div>
        </div>

        {/* Lesson Navigator */}
        <LessonNavigator
          currentLesson={lesson}
          moduleId={lesson.module_id}
          userId={user?.id}
          basePath={basePath}
          moduleLang={undefined}
        />
      </div>
    </div>
  );
}
