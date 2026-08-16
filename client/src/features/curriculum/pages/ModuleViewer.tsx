/**
 * Module Viewer Page — SHRM-style with BDA Branding
 * Layout: Main content (left) + Lessons Sidebar (right)
 * Features: Full-screen mode, BDA brand colors, unlocked lessons, Mark as Complete
 */
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import {
  useModuleDetail,
  useUpdateProgress,
  useIncrementTimeSpent,
} from "@/entities/curriculum";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  BookOpen,
  ChevronRight,
  Circle,
  LayoutList,
  Target,
  Award,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentRenderer } from "../components/ContentRenderer";
import { ModuleLessons } from "../components/ModuleLessons";

// BDA Brand Colors
const BDA = {
  navy: "#1C4A8B",
  navyDark: "#0d1f4e",
  blue: "#0f91e0",
  bluePale: "#f0f6ff",
  blueMid: "#e8f0fb",
  border: "#d0e4f7",
};

export function ModuleViewer() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [readingProgress, setReadingProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const timeTrackerRef = useRef<NodeJS.Timeout>();

  // Detect base path
  const basePath = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/ecp/learning-system"))
      return "/ecp/learning-system/training-kits";
    if (path.startsWith("/instructor/learning-system"))
      return "/instructor/learning-system/training-kits";
    return "/learning-system/training-kits";
  }, [location.pathname]);

  const getBackUrl = () => basePath;

  const withLang = (path: string) => path;

  const {
    data: moduleData,
    isLoading,
    error,
  } = useModuleDetail(user?.id, moduleId!);

  // Reading progress tracker
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight <= clientHeight) {
        setReadingProgress(100);
        return;
      }
      const pct = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
      setReadingProgress(Math.min(pct, 100));
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [moduleData]);

  // Time tracking
  const { mutate: incrementTime } = useIncrementTimeSpent();
  useEffect(() => {
    if (!user?.id || !moduleId) return;
    timeTrackerRef.current = setInterval(() => {
      incrementTime({ userId: user.id, moduleId, minutes: 1 });
    }, 60000);
    return () => {
      if (timeTrackerRef.current) clearInterval(timeTrackerRef.current);
    };
  }, [user?.id, moduleId, incrementTime]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: BDA.bluePale }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: BDA.navy }}
          />
          <p className="text-sm font-medium" style={{ color: BDA.navy }}>
            Loading module...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !moduleData) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: BDA.bluePale }}
      >
        <div className="text-center">
          <BookOpen
            className="h-12 w-12 mx-auto mb-4"
            style={{ color: BDA.blue }}
          />
          <p className="text-muted-foreground mb-4">Module not found.</p>
          <Button variant="outline" onClick={() => navigate(basePath)}>
            Back to Curriculum
          </Button>
        </div>
      </div>
    );
  }

  const { module, progress, nextModule } = moduleData;
  // Strip "Module N: " prefix from title if present
  const stripModulePrefix = (title: string) =>
    title.replace(/^Module\s+\d+:\s*/i, "");

  const moduleTitle = stripModulePrefix(module.competency_name);
  const moduleDesc = module.description;
  const progressPct = progress?.progress_percentage || 0;
  const isCompleted = progress?.status === "completed";

  // Section badge
  const sectionLabel =
    module.section_type === "intro"
      ? "Program Introduction"
      : module.section_type === "outro"
        ? "Program Wrap-Up"
        : module.section_type === "behavioral"
          ? "Behavioural Competency"
          : "Knowledge-Based Competency";

  const nextModuleTitle = nextModule
    ? stripModulePrefix(nextModule.competency_name)
    : null;

  return (
    <div
      className={`min-h-screen ${isFullscreen ? "fixed inset-0 z-50 overflow-auto" : ""}`}
      style={{
        background: BDA.bluePale,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0] py-12 text-white sm:py-14 lg:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(255,255,255,0.18),transparent_24%),radial-gradient(circle_at_70%_100%,rgba(15,145,224,0.42),transparent_38%)]" />
        <div className="relative mx-auto max-w-[1640px] px-6 sm:px-10 lg:px-16 xl:px-24">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate(getBackUrl())}
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Curriculum
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              title={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </span>
            </button>
          </div>
          <div className="mt-9 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/90">
                {sectionLabel}
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-4xl lg:text-5xl">
                Module {module.order_index}: {moduleTitle}
              </h1>
              {moduleDesc && (
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/80 sm:text-base">
                  {moduleDesc}
                </p>
              )}
            </div>
            <div className="grid min-w-[235px] grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs font-semibold text-white/75">
                  Your progress
                </p>
                <p className="mt-1 text-2xl font-bold">{progressPct}%</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs font-semibold text-white/75">Duration</p>
                <p className="mt-1 text-2xl font-bold">
                  {module.estimated_duration_hours ||
                    Math.ceil((module.estimated_minutes || 60) / 60)}
                  h
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAIN LAYOUT: Content (left) + Sidebar (right) ─── */}
      <div className="mx-auto flex max-w-[1640px] gap-6 px-6 py-10 sm:px-10 lg:px-16 xl:px-24">
        {/* ── LEFT: Main Content ── */}
        <main className="flex-1 min-w-0" ref={contentRef}>
          {module.learning_objectives &&
            module.learning_objectives.length > 0 && (
              <section
                className="mb-6 rounded-2xl border bg-white p-6 shadow-[0_7px_20px_rgba(13,31,78,0.05)]"
                style={{ borderColor: BDA.border }}
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" style={{ color: BDA.blue }} />
                  <h2
                    className="text-base font-bold"
                    style={{ color: BDA.navyDark }}
                  >
                    Learning Objectives
                  </h2>
                </div>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {module.learning_objectives.map((obj: string, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm leading-relaxed text-slate-600"
                    >
                      <CheckCircle
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: BDA.blue }}
                      />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

          {/* Module Content */}
          {module.content &&
          module.content.content &&
          module.content.content.length > 0 ? (
            <div
              className="rounded-2xl border p-6 mb-5"
              style={{
                background: "#fff",
                borderColor: BDA.border,
                boxShadow: "0 1px 4px rgba(28,74,139,0.06)",
              }}
            >
              <div className="prose prose-gray max-w-none">
                <ContentRenderer content={module.content} />
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl border p-10 mb-5 text-center"
              style={{ background: "#fff", borderColor: BDA.border }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: BDA.bluePale }}
              >
                <BookOpen className="h-8 w-8" style={{ color: BDA.blue }} />
              </div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: BDA.navyDark }}
              >
                Content Coming Soon
              </h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                The detailed content for this module is being prepared. In the
                meantime, explore the lessons from the sidebar to start your
                learning journey.
              </p>
            </div>
          )}

          {/* Mobile Lessons List (hidden on desktop) */}
          <div
            className="lg:hidden rounded-2xl border p-5 mb-5"
            style={{ background: "#fff", borderColor: BDA.border }}
          >
            <div className="flex items-center gap-2 mb-4">
              <LayoutList className="h-4 w-4" style={{ color: BDA.navy }} />
              <h3 className="font-semibold text-sm" style={{ color: BDA.navy }}>
                Lessons
              </h3>
            </div>
            <ModuleLessons
              moduleId={moduleId!}
              userId={user?.id}
              basePath={basePath}
              examLanguage={module.exam_language}
            />
          </div>

          {/* CTA — Completion or Start */}
          {isCompleted ? (
            <div
              className="rounded-2xl border p-6 text-center"
              style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}
            >
              <Award
                className="h-12 w-12 mx-auto mb-3"
                style={{ color: "#16a34a" }}
              />
              <h3
                className="text-lg font-bold mb-1"
                style={{ color: "#14532d" }}
              >
                Module Completed!
              </h3>
              <p className="text-sm mb-4" style={{ color: "#166534" }}>
                Great work! You've completed all lessons in this module.
              </p>
              {nextModule && (
                <Button
                  onClick={() =>
                    navigate(withLang(`${basePath}/module/${nextModule.id}`))
                  }
                  style={{ background: BDA.navy, color: "#fff" }}
                  className="gap-2 hover:opacity-90"
                >
                  Continue to {nextModuleTitle}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div
              className="rounded-2xl border p-5 flex items-center justify-between gap-4"
              style={{ background: BDA.bluePale, borderColor: BDA.border }}
            >
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: BDA.navyDark }}
                >
                  Ready to start?
                </p>
                <p className="text-xs mt-0.5 text-gray-500">
                  Select a lesson from the sidebar to begin learning.
                </p>
              </div>
              <div
                className="flex items-center gap-2"
                style={{ color: BDA.navy }}
              >
                <Circle className="h-5 w-5" />
                <span className="text-sm font-semibold">
                  {progressPct}% done
                </span>
              </div>
            </div>
          )}
        </main>

        {/* ── RIGHT SIDEBAR: Lessons Navigation (SHRM style) ── */}
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-24 space-y-4">
            {/* Lessons Card */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                background: "#fff",
                borderColor: BDA.border,
                boxShadow: "0 1px 4px rgba(28,74,139,0.06)",
              }}
            >
              {/* Sidebar Header */}
              <div
                className="px-4 py-3 border-b flex items-center justify-between"
                style={{ background: BDA.bluePale, borderColor: BDA.border }}
              >
                <div className="flex items-center gap-2">
                  <LayoutList className="h-4 w-4" style={{ color: BDA.navy }} />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: BDA.navy }}
                  >
                    Lessons
                  </span>
                </div>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: BDA.blueMid, color: BDA.navy }}
                >
                  {progressPct}% done
                </span>
              </div>

              {/* Lessons List */}
              <div className="p-3">
                <ModuleLessons
                  moduleId={moduleId!}
                  userId={user?.id}
                  basePath={basePath}
                  examLanguage={module.exam_language}
                />
              </div>
            </div>

            {/* Up Next Card */}
            {nextModule && (
              <div
                className="rounded-2xl border p-4"
                style={{
                  background: "#fff",
                  borderColor: BDA.border,
                  boxShadow: "0 1px 4px rgba(28,74,139,0.06)",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-2"
                  style={{ color: BDA.blue }}
                >
                  Up Next
                </p>
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: BDA.navyDark }}
                >
                  Module {nextModule.order_index}
                </p>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {nextModuleTitle}
                </p>
                <Button
                  size="sm"
                  className="w-full gap-1.5 font-medium"
                  style={{
                    background: BDA.bluePale,
                    color: BDA.navy,
                    border: `1px solid ${BDA.border}`,
                  }}
                  onClick={() =>
                    navigate(withLang(`${basePath}/module/${nextModule.id}`))
                  }
                >
                  Go to Next Module
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
