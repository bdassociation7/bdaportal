/**
 * Lesson Viewer Page
 * View an individual lesson (1 of the 42 sub-competencies)
 *
 * Features:
 * - Rich content display (TipTap JSON) — full-page, no scroll-box
 * - Reading progress tracking (page scroll)
 * - Auto-completion upon reading
 * - Navigation to next lesson
 * - Automatic Table of Contents (extracted from H1/H2/H3 headings)
 * - Scroll-to-top button
 */

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  useLessonProgressById,
  useLesson,
  useUpdateLessonProgress,
} from '@/entities/curriculum';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Clock, CheckCircle, BookOpen, Award, ChevronRight, ArrowUp, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LessonContent } from '../components/LessonContent';
import { LessonProgressTracker } from '../components/LessonProgressTracker';
import { LessonNavigator } from '../components/LessonNavigator';
import { LessonQuizGate } from '../components/LessonQuizGate';
import type { Json } from '@/shared/database.types';

// ── Types ──────────────────────────────────────────────────────────────────
type TipTapNode = {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  text?: string;
};

type TocItem = {
  id: string;
  text: string;
  level: 1 | 2 | 3;
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Extract plain text from a TipTap inline content array */
function extractText(nodes: TipTapNode[] | undefined): string {
  if (!nodes) return '';
  return nodes.map((n) => n.text || extractText(n.content)).join('');
}

/** Slugify heading text into a DOM id */
function slugify(text: string, index: number): string {
  return `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
}

/** Walk TipTap JSON and collect all H1/H2/H3 headings */
function extractToc(content: Json): TocItem[] {
  if (!content || typeof content !== 'object' || !('type' in content)) return [];
  const doc = content as Record<string, any>;
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return [];

  const items: TocItem[] = [];
  let headingIndex = 0;

  for (const node of doc.content as TipTapNode[]) {
    if (node.type === 'heading') {
      const level = (node.attrs?.level || 2) as 1 | 2 | 3;
      if (level <= 3) {
        const text = extractText(node.content);
        if (text.trim()) {
          items.push({ id: slugify(text, headingIndex), text: text.trim(), level });
          headingIndex++;
        }
      }
    }
  }
  return items;
}

// ── Component ──────────────────────────────────────────────────────────────
export function LessonViewer() {
  const { lessonId, moduleId } = useParams<{ lessonId: string; moduleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [readingProgress, setReadingProgress] = useState(0);
  const [showOptionalQuiz, setShowOptionalQuiz] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [tocOpen, setTocOpen] = useState(true);

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

  // Extract Table of Contents from lesson content
  const tocItems = useMemo(() => {
    if (!lesson?.content) return [];
    return extractToc(lesson.content);
  }, [lesson?.content]);

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

  // Page-level scroll tracking + scroll-to-top button + active heading
  useEffect(() => {
    if (!lessonId || !user?.id) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrollProgress = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      const clamped = Math.min(scrollProgress, 100);

      setReadingProgress(clamped);
      setShowScrollTop(scrollTop > 400);

      if (progressUpdateTimeoutRef.current) clearTimeout(progressUpdateTimeoutRef.current);

      if (clamped > progressPercentageRef.current) {
        progressUpdateTimeoutRef.current = setTimeout(() => {
          saveProgressRef.current?.(clamped);
          progressPercentageRef.current = clamped;
        }, 1000);
      }

      // Update active heading in TOC
      const headingEls = document.querySelectorAll('[data-toc-id]');
      let currentId = '';
      headingEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) {
          currentId = el.getAttribute('data-toc-id') || '';
        }
      });
      if (currentId) setActiveHeadingId(currentId);
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

  // Scroll to heading
  const scrollToHeading = (id: string) => {
    const el = document.querySelector(`[data-toc-id="${id}"]`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
      setActiveHeadingId(id);
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
  const hasToc = tocItems.length >= 3;

  return (
    <div className="min-h-screen bg-[#f8f9fb]">

      {/* ── Sticky top bar ───────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">

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

          {/* Right: TOC toggle + progress tracker */}
          <div className="flex items-center gap-3 shrink-0">
            {hasToc && (
              <button
                onClick={() => setTocOpen((v) => !v)}
                title={tocOpen ? 'Hide contents' : 'Show contents'}
                className={`hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors
                  ${tocOpen
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
              >
                <List className="h-3.5 w-3.5" />
                Contents
              </button>
            )}
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

      {/* ── Two-column layout: content + TOC sidebar ─────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex gap-8 items-start">

        {/* ── Main content column ──────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">

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

          {/* ── Lesson body content ──────────────────────────────────────── */}
          <article className="bg-white rounded-xl px-8 sm:px-14 py-10 mb-8">
            <div className="prose prose-gray max-w-none">
              <LessonContent content={lesson.content} contentAr={undefined} tocItems={tocItems} />
            </div>
          </article>

          {/* ── Completion banner ────────────────────────────────────────── */}
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

          {/* ── Lesson navigator ─────────────────────────────────────────── */}
          <LessonNavigator
            currentLesson={lesson}
            moduleId={lesson.module_id}
            userId={user?.id}
            basePath={basePath}
            moduleLang={undefined}
          />
        </main>

        {/* ── Table of Contents Sidebar ────────────────────────────────────── */}
        {hasToc && tocOpen && (
          <aside className="hidden lg:block w-64 xl:w-72 shrink-0">
            <div className="sticky top-[72px] max-h-[calc(100vh-100px)] overflow-y-auto">
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                  On this page
                </p>
                <nav className="space-y-0.5">
                  {tocItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToHeading(item.id)}
                      className={`w-full text-left text-sm rounded-lg px-3 py-1.5 transition-colors leading-snug
                        ${item.level === 1 ? 'font-semibold' : ''}
                        ${item.level === 2 ? 'pl-5 text-gray-600' : ''}
                        ${item.level === 3 ? 'pl-7 text-gray-500 text-xs' : ''}
                        ${activeHeadingId === item.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}
                      `}
                    >
                      {item.level === 2 && <span className="mr-1 text-gray-300">–</span>}
                      {item.level === 3 && <span className="mr-1 text-gray-300">·</span>}
                      {item.text}
                    </button>
                  ))}
                </nav>

                {/* Scroll to top inside TOC */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={scrollToTop}
                    className="w-full flex items-center gap-2 text-xs text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                    Back to top
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ── Floating Scroll-to-Top button (mobile + when TOC hidden) ──────── */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          title="Back to top"
          className="fixed bottom-8 right-6 z-30 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-11 h-11 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 lg:hidden"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
