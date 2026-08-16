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

import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import {
  useLessonProgressById,
  useLesson,
  useModuleDetail,
  useUpdateLessonProgress,
} from "@/entities/curriculum";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  BookOpen,
  Award,
  ChevronRight,
  ArrowUp,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LessonContent } from "../components/LessonContent";
import { LessonProgressTracker } from "../components/LessonProgressTracker";
import { LessonNavigator } from "../components/LessonNavigator";
import { LessonQuizGate } from "../components/LessonQuizGate";
import type { Json } from "@/shared/database.types";

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
  if (!nodes) return "";
  return nodes.map((n) => n.text || extractText(n.content)).join("");
}

/** Slugify heading text into a DOM id */
function slugify(text: string, index: number): string {
  return `heading-${index}-${text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

/** Walk TipTap JSON and collect all H1/H2/H3 headings */
function extractToc(content: Json): TocItem[] {
  if (!content || typeof content !== "object" || !("type" in content))
    return [];
  const doc = content as Record<string, any>;
  if (doc.type !== "doc" || !Array.isArray(doc.content)) return [];

  const items: TocItem[] = [];
  let headingIndex = 0;

  for (const node of doc.content as TipTapNode[]) {
    if (node.type === "heading") {
      const level = (node.attrs?.level || 2) as 1 | 2 | 3;
      if (level <= 3) {
        const text = extractText(node.content);
        if (text.trim()) {
          items.push({
            id: slugify(text, headingIndex),
            text: text.trim(),
            level,
          });
          headingIndex++;
        }
      }
    }
  }
  return items;
}

// ── Component ──────────────────────────────────────────────────────────────
export function LessonViewer() {
  const { lessonId, moduleId } = useParams<{
    lessonId: string;
    moduleId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [readingProgress, setReadingProgress] = useState(0);
  const [showOptionalQuiz, setShowOptionalQuiz] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string>("");
  const [tocOpen, setTocOpen] = useState(false);

  const timeTrackerRef = useRef<NodeJS.Timeout>();
  const progressUpdateTimeoutRef = useRef<NodeJS.Timeout>();
  const progressPercentageRef = useRef<number>(0);
  const saveProgressRef = useRef<((scrollProgress: number) => void) | null>(
    null,
  );
  const autoCompleteAttemptedRef = useRef<string | null>(null);

  // Detect base path
  const basePath = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/ecp/learning-system"))
      return "/ecp/learning-system/training-kits";
    if (path.startsWith("/instructor/learning-system"))
      return "/instructor/learning-system/training-kits";
    return "/learning-system/training-kits";
  }, [location.pathname]);

  const getModuleUrl = (modId: string) => `${basePath}/module/${modId}`;

  const { data: lesson, isLoading: isLoadingLesson } = useLesson(lessonId);
  const { data: moduleData } = useModuleDetail(
    user?.id,
    lesson?.module_id || moduleId || "",
  );
  const { data: progress, isLoading: isLoadingProgress } =
    useLessonProgressById(user?.id, lessonId);
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
          status: scrollProgress === 100 ? "completed" : "in_progress",
          completed_at:
            scrollProgress === 100 ? new Date().toISOString() : undefined,
        },
      });
    };
  }, [user?.id, lessonId, updateProgress]);

  // Page-level scroll tracking + scroll-to-top button + active heading
  useEffect(() => {
    if (!lessonId || !user?.id) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const scrollProgress =
        docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      const clamped = Math.min(scrollProgress, 100);

      setReadingProgress(clamped);
      setShowScrollTop(scrollTop > 400);

      if (progressUpdateTimeoutRef.current)
        clearTimeout(progressUpdateTimeoutRef.current);

      if (clamped > progressPercentageRef.current) {
        progressUpdateTimeoutRef.current = setTimeout(() => {
          saveProgressRef.current?.(clamped);
          progressPercentageRef.current = clamped;
        }, 1000);
      }

      // Update active heading in TOC
      const headingEls = document.querySelectorAll("[data-toc-id]");
      let currentId = "";
      headingEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) {
          currentId = el.getAttribute("data-toc-id") || "";
        }
      });
      if (currentId) setActiveHeadingId(currentId);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (progressUpdateTimeoutRef.current)
        clearTimeout(progressUpdateTimeoutRef.current);
    };
  }, [lessonId, user?.id]);

  // Auto-complete for short content
  useEffect(() => {
    if (!user?.id || !lessonId) return;
    if (progress?.status === "completed") return;
    if (autoCompleteAttemptedRef.current === lessonId) return;

    const checkAndAutoComplete = () => {
      const docHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      if (docHeight <= 10) {
        autoCompleteAttemptedRef.current = lessonId;
        setReadingProgress(100);
        updateProgress.mutate({
          userId: user.id,
          lessonId,
          updates: {
            progress_percentage: 100,
            status: "completed",
            completed_at: new Date().toISOString(),
          },
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
    return () => {
      if (timeTrackerRef.current) clearInterval(timeTrackerRef.current);
    };
  }, [user, lessonId]);

  // Scroll to heading
  const scrollToHeading = (id: string) => {
    const el = document.querySelector(`[data-toc-id="${id}"]`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
      setActiveHeadingId(id);
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          <p className="text-muted-foreground mb-6">
            This lesson does not exist or has been deleted.
          </p>
          <Button onClick={() => navigate(getModuleUrl(moduleId || ""))}>
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
        <LessonQuizGate
          lesson={lesson}
          progress={progress}
          onBack={() => setShowOptionalQuiz(false)}
          basePath={basePath}
        />
      </div>
    );
  }

  const isCompleted =
    readingProgress >= 100 || progress?.status === "completed";
  const hasToc = tocItems.length >= 3;
  const competencyName = (
    moduleData?.module?.competency_name || "BDA Competency"
  ).replace(/^Module\s+\d+:\s*/i, "");

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
              <span className="truncate font-medium text-gray-800">
                {lesson.title}
              </span>
              <span className="shrink-0 text-gray-400">
                · Lesson {lesson.order_index}
              </span>
            </div>
          </div>

          {/* Right: TOC toggle + progress tracker */}
          <div className="flex items-center gap-3 shrink-0">
            {hasToc && (
              <button
                onClick={() => setTocOpen((v) => !v)}
                title={tocOpen ? "Hide contents" : "Show contents"}
                aria-expanded={tocOpen}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm transition-all ${
                  tocOpen
                    ? "border-[#0d1f4e] bg-gradient-to-r from-[#0d1f4e] to-[#0f91e0] text-white"
                    : "border-[#b9ddf6] bg-white text-[#1c4a8b] hover:border-[#0f91e0] hover:bg-[#f0f6ff]"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Contents
              </button>
            )}
            <LessonProgressTracker
              progress={progress}
              readingProgress={readingProgress}
            />
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

      <section className="relative overflow-hidden bg-gradient-to-r from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0] py-9 text-white sm:py-11">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_8%,rgba(255,255,255,0.18),transparent_24%),radial-gradient(circle_at_70%_100%,rgba(15,145,224,0.42),transparent_38%)]" />
        <div className="relative mx-auto max-w-[1640px] px-6 sm:px-10 lg:px-16 xl:px-24">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/75">
            {competencyName}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
            Lesson {lesson.order_index}: {lesson.title}
          </h1>
        </div>
      </section>

      <div
        className={`mx-auto max-w-[1640px] px-6 py-12 sm:px-10 sm:py-14 lg:px-16 lg:py-16 xl:px-24 ${hasToc && tocOpen ? "lg:grid lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start lg:gap-8" : ""}`}
      >
        {/* ── Main content column ──────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {/* Description / intro card */}
          {lesson.description && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-6 py-4 mb-8">
              <p className="text-gray-700 leading-relaxed text-[1.02rem]">
                {lesson.description}
              </p>
            </div>
          )}

          {/* Learning Objectives */}
          {lesson.learning_objectives &&
            lesson.learning_objectives.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 mb-8 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-blue-600" />
                  Learning Objectives
                </h2>
                <ul className="space-y-2">
                  {lesson.learning_objectives.map((obj, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-gray-700 text-sm leading-relaxed"
                    >
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
              <LessonContent
                content={lesson.content}
                contentAr={undefined}
                tocItems={tocItems}
              />
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
                Great work. Use the navigation below to continue to the next
                lesson.
              </p>
              {lesson.lesson_quiz_id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-green-300 text-green-700 hover:bg-green-100"
                  onClick={() => setShowOptionalQuiz(true)}
                >
                  <Award className="mr-2 h-4 w-4" />
                  Practice Quiz
                </Button>
              )}
            </div>
          )}

          {/* Reserve space whether completed or not to prevent layout shift */}
          {!isCompleted && (
            <div className="mb-6" style={{ minHeight: "24px" }}>
              <p className="text-center text-sm text-gray-400">
                Scroll to the bottom to mark this lesson as complete.
              </p>
            </div>
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

        {/* ── Optional Contents Panel: in layout flow, never over lesson text ── */}
        {hasToc && tocOpen && (
          <aside className="mt-8 lg:sticky lg:top-24 lg:mt-0 lg:max-h-[calc(100vh-128px)] lg:overflow-y-auto">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0] p-[1px] shadow-[0_16px_32px_rgba(13,31,78,0.22)]">
              <div className="rounded-[15px] bg-gradient-to-br from-[#12326b]/95 via-[#1c4a8b]/92 to-[#0f91e0]/90 p-5 text-white">
                <div className="flex items-center justify-between gap-3 border-b border-white/20 pb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">
                      Lesson navigation
                    </p>
                    <h2 className="mt-1 text-base font-bold">Contents</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTocOpen(false)}
                    className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                  >
                    Hide
                  </button>
                </div>
                <nav className="mt-4 space-y-1">
                  {tocItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToHeading(item.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm leading-snug transition-colors ${
                        item.level === 1
                          ? "font-semibold"
                          : item.level === 2
                            ? "pl-5"
                            : "pl-7 text-xs"
                      } ${
                        activeHeadingId === item.id
                          ? "bg-white/25 font-semibold text-white shadow-sm"
                          : "text-white/85 hover:bg-white/15 hover:text-white"
                      }`}
                    >
                      {item.level === 2 && (
                        <span className="mr-1 text-white/55">–</span>
                      )}
                      {item.level === 3 && (
                        <span className="mr-1 text-white/55">·</span>
                      )}
                      {item.text}
                    </button>
                  ))}
                </nav>
                <div className="mt-4 border-t border-white/20 pt-3">
                  <button
                    type="button"
                    onClick={scrollToTop}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/15 hover:text-white"
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
