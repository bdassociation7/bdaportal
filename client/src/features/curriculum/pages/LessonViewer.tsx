/**
 * Lesson Viewer Page
 * View an individual lesson (1 of the 42 sub-competencies)
 *
 * Features:
 * - Rich content display (TipTap JSON) — full-page, no scroll-box
 * - Reading progress tracking (page scroll)
 * - Auto-completion upon reading
 * - Navigation to next lesson
 */

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  useLessonProgressById,
  useLesson,
  useUpdateLessonProgress,
} from '@/entities/curriculum';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Clock, CheckCircle, BookOpen, Award, ChevronRight } from 'lucide-react';
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

  const timeTrackerRef = useRef<NodeJS.Timeout>();
  const progressUpdateTimeoutRef = useRef<NodeJS.Timeout>();
  const progressPercentageRef = useRef<number>(0);
  const saveProgressRef = useRef<((scrollProgress: number) => void) | null>(null);
  const autoCompleteAttemptedRef = useRef<string | null>(null);

  // Detect base path
  const basePath = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/ecp/learning-system')) return '/ecp/learning-system/training-kits';
    return '/learning-system/training-kits';
  }, [location.pathname]);

  const getModuleUrl = (modId: string) => `${basePath}/module/${modId}`;

  const { data: lesson, isLoading: isLoadingLesson } = useLesson(lessonId);
  const { data: progress, isLoading: isLoadingProgress } = useLessonProgressById(user?.id, lessonId);
  const updateProgress = useUpdateLessonProgress();

  // Keep progress ref in sync
  useEffect(() => {
    progressPercentageRef.current = progress?.progress_percentage || 0;
  }, [progress?.progress_percentage]);

  // Keep save function in ref
  useEffect(() => {
    saveProgressRef.current = (scrollProgress: number) => {
      if (!user?.id || !lessonId) return;
      updateProgress.mutate({
        userId: user.id,
        lessonId,
        updates: {
          progress_percentage: scrollProgress,
          status: scrollProgress === 100 ? 'completed' : 'in_progress',
          completed_at: scrollProgress === 100 ? new Date().toISOString() : undefined,
        },
      });
    };
  }, [user?.id, lessonId, updateProgress]);

  // Page-level scroll tracking
  useEffect(() => {
    if (!lessonId || !user?.id) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrollProgress = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      const clamped = Math.min(scrollProgress, 100);

      setReadingProgress(clamped);

      if (progressUpdateTimeoutRef.current) clearTimeout(progressUpdateTimeoutRef.current);

      if (clamped > progressPercentageRef.current) {
        progressUpdateTimeoutRef.current = setTimeout(() => {
          saveProgressRef.current?.(clamped);
          progressPercentageRef.current = clamped;
        }, 1000);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (progressUpdateTimeoutRef.current) clearTimeout(progressUpdateTimeoutRef.current);
    };
  }, [lessonId, user?.id]);

  // Auto-complete for short content
  useEffect(() => {
    if (!user?.id || !lessonId) return;
    if (progress?.status === 'completed') return;
    if (autoCompleteAttemptedRef.current === lessonId) return;

    const checkAndAutoComplete = () => {
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 10) {
        autoCompleteAttemptedRef.current = lessonId;
        setReadingProgress(100);
        updateProgress.mutate({
          userId: user.id,
          lessonId,
          updates: { progress_percentage: 100, status: 'completed', completed_at: new Date().toISOString() },
        });
      }
    };

    const t = setTimeout(checkAndAutoComplete, 1200);
    return () => clearTimeout(t);
  }, [user?.id, lessonId, progress?.status]);

  // Time tracking
  useEffect(() => {
    if (!user || !lessonId) return;
    timeTrackerRef.current = setInterval(() => {}, 60000);
    return () => { if (timeTrackerRef.current) clearInterval(timeTrackerRef.current); };
  }, [user, lessonId]);

  const isLoading = isLoadingLesson || isLoadingProgress;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Lesson Not Found</h2>
          <p className="text-muted-foreground mb-6">This lesson does not exist or has been deleted.</p>
          <Button onClick={() => navigate(getModuleUrl(moduleId || ''))}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Module
          </Button>
        </div>
      </div>
    );
  }

  if (showOptionalQuiz && lesson.lesson_quiz_id && progress) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LessonQuizGate lesson={lesson} progress={progress} onBack={() => setShowOptionalQuiz(false)} />
      </div>
    );
  }

  const isCompleted = readingProgress >= 100 || progress?.status === 'completed';

  return (
    <div className="min-h-screen bg-[#f8f9fb]">

      {/* ── Sticky top bar ───────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">

          {/* Left: back + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-gray-600 hover:text-gray-900"
              onClick={() => navigate(getModuleUrl(lesson.module_id))}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>

            <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 min-w-0">
              <BookOpen className="h-4 w-4 shrink-0" />
              <span className="truncate font-medium text-gray-800">{lesson.title}</span>
              <span className="shrink-0 text-gray-400">· Lesson {lesson.order_index}</span>
            </div>
          </div>

          {/* Right: progress tracker */}
          <div className="shrink-0">
            <LessonProgressTracker progress={progress} readingProgress={readingProgress} />
          </div>
        </div>

        {/* Reading progress bar */}
        <div className="h-0.5 bg-gray-100">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="w-full px-6 sm:px-12 lg:px-20 py-10">

        {/* Lesson title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-3">
            {lesson.title}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {lesson.estimated_duration_hours && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {lesson.estimated_duration_hours} hour{lesson.estimated_duration_hours > 1 ? 's' : ''} estimated
              </span>
            )}
            {isCompleted && (
              <span className="flex items-center gap-1.5 text-green-600 font-medium">
                <CheckCircle className="h-4 w-4" />
                Completed
              </span>
            )}
          </div>
        </div>

        {/* Description / intro card */}
        {lesson.description && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-6 py-4 mb-8">
            <p className="text-gray-700 leading-relaxed text-[1.02rem]">{lesson.description}</p>
          </div>
        )}

        {/* Learning Objectives */}
        {lesson.learning_objectives && lesson.learning_objectives.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 mb-8 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-blue-600" />
              Learning Objectives
            </h2>
            <ul className="space-y-2">
              {lesson.learning_objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700 text-sm leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                  {obj}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Lesson body content ────────────────────────────────────────── */}
        <article className="bg-white rounded-xl px-8 sm:px-14 py-10 mb-8">
          <div className="prose prose-gray max-w-none">
            <LessonContent content={lesson.content} contentAr={undefined} />
          </div>
        </article>

        {/* ── Completion banner ──────────────────────────────────────────── */}
        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-5 mb-6 text-center shadow-sm">
            <div className="flex items-center justify-center gap-2 text-green-700 font-semibold text-lg mb-1">
              <CheckCircle className="h-5 w-5" />
              Lesson Completed!
            </div>
            <p className="text-sm text-green-600">
              Great work. Use the navigation below to continue to the next lesson.
            </p>
            {lesson.lesson_quiz_id && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-green-300 text-green-700 hover:bg-green-100"
                onClick={() => setShowOptionalQuiz(true)}
              >
                <Award className="mr-2 h-4 w-4" />
                Practice Quiz (Optional)
              </Button>
            )}
          </div>
        )}

        {!isCompleted && (
          <p className="text-center text-sm text-gray-400 mb-6">
            Scroll to the bottom to mark this lesson as complete.
          </p>
        )}

        {/* ── Lesson navigator ───────────────────────────────────────────── */}
        <LessonNavigator
          currentLesson={lesson}
          moduleId={lesson.module_id}
          userId={user?.id}
          basePath={basePath}
          moduleLang={undefined}
        />
      </main>
    </div>
  );
}
