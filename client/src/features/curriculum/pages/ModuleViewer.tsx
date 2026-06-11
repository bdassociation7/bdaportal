/**
 * Module Viewer Page — SHRM-style with BDA Branding
 * Layout: Main content (left) + Lessons Sidebar (right)
 * Features: Full-screen mode, BDA brand colors, unlocked lessons, Mark as Complete
 */
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  useModuleDetail,
  useUpdateProgress,
  useIncrementTimeSpent,
} from '@/entities/curriculum';
import { useState, useEffect, useRef, useMemo } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ContentRenderer } from '../components/ContentRenderer';
import { ModuleLessons } from '../components/ModuleLessons';

// BDA Brand Colors
const BDA = {
  navy: '#1C4A8B',
  navyDark: '#0d1f4e',
  blue: '#0f91e0',
  bluePale: '#f0f6ff',
  blueMid: '#e8f0fb',
  border: '#d0e4f7',
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
    if (path.startsWith('/ecp/learning-system')) {
      return '/ecp/learning-system/training-kits';
    }
    return '/learning-system/training-kits';
  }, [location.pathname]);

  const getBackUrl = () => basePath;

  const withLang = (path: string) => path;

  const { data: moduleData, isLoading, error } = useModuleDetail(user?.id, moduleId!);

  // Reading progress tracker
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight <= clientHeight) { setReadingProgress(100); return; }
      const pct = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
      setReadingProgress(Math.min(pct, 100));
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [moduleData]);

  // Time tracking
  const { mutate: incrementTime } = useIncrementTimeSpent();
  useEffect(() => {
    if (!user?.id || !moduleId) return;
    timeTrackerRef.current = setInterval(() => {
      incrementTime({ userId: user.id, moduleId, minutes: 1 });
    }, 60000);
    return () => { if (timeTrackerRef.current) clearInterval(timeTrackerRef.current); };
  }, [user?.id, moduleId, incrementTime]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: BDA.bluePale }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: BDA.navy }} />
          <p className="text-sm font-medium" style={{ color: BDA.navy }}>Loading module...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !moduleData) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: BDA.bluePale }}>
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4" style={{ color: BDA.blue }} />
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
  const stripModulePrefix = (title: string) => title.replace(/^Module\s+\d+:\s*/i, '');

  const moduleTitle = stripModulePrefix(module.competency_name);
  const moduleDesc = module.description;
  const progressPct = progress?.progress_percentage || 0;
  const isCompleted = progress?.status === 'completed';

  // Section badge
  const sectionLabel =
    module.section_type === 'intro' ? 'Program Introduction'
    : module.section_type === 'outro' ? 'Program Wrap-Up'
    : module.section_type === 'behavioral' ? 'Behavioural Competency'
    : 'Knowledge-Based Competency';

  const sectionBadgeStyle =
    module.section_type === 'intro' || module.section_type === 'outro'
      ? { background: '#ede9fe', color: '#6d28d9' }
      : module.section_type === 'behavioral'
      ? { background: BDA.blueMid, color: BDA.navy }
      : { background: '#e0f2fe', color: '#0369a1' };

  const nextModuleTitle = nextModule
    ? stripModulePrefix(nextModule.competency_name)
    : null;

  return (
    <div
      className={`min-h-screen ${isFullscreen ? 'fixed inset-0 z-50 overflow-auto' : ''}`}
      style={{ background: BDA.bluePale, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}

    >
      {/* ─── TOP BAR ─── */}
      <div
        className="sticky top-0 z-30 border-b"
        style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.08)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Left: Back + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            {!isFullscreen && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 gap-1.5 font-medium"
                  style={{ color: BDA.navy }}
                  onClick={() => navigate(getBackUrl())}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Curriculum</span>
                </Button>
                <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
              </>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={sectionBadgeStyle}
                >
                  {sectionLabel}
                </span>
                {isCompleted && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: '#dcfce7', color: '#166534' }}>
                    <CheckCircle className="h-3 w-3" />
                    Completed
                  </span>
                )}
              </div>
              <h1 className="text-base font-bold truncate mt-0.5" style={{ color: BDA.navyDark }}>
                Module {module.order_index}: {moduleTitle}
              </h1>
            </div>
          </div>

          {/* Right: Progress + Fullscreen toggle */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-gray-400">Progress</div>
                <div className="text-sm font-bold" style={{ color: BDA.navy }}>{progressPct}%</div>
              </div>
              <div className="w-24">
                <Progress value={progressPct} className="h-2" style={{ '--progress-color': BDA.navy } as React.CSSProperties} />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="flex-shrink-0 gap-1.5"
              style={{ color: BDA.navy }}
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit fullscreen' : 'Expand to fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span className="hidden sm:inline text-xs font-medium">
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </span>
            </Button>
            {isFullscreen && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                style={{ borderColor: BDA.border, color: BDA.navy }}
                onClick={() => { setIsFullscreen(false); navigate(getBackUrl()); }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Curriculum
              </Button>
            )}
          </div>
        </div>

        {/* Reading progress bar */}
        <div className="h-0.5" style={{ background: BDA.blueMid }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${readingProgress}%`, background: BDA.blue }}
          />
        </div>
      </div>

      {/* ─── MAIN LAYOUT: Content (left) + Sidebar (right) ─── */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">

        {/* ── LEFT: Main Content ── */}
        <main className="flex-1 min-w-0" ref={contentRef}>

          {/* Module Header Card */}
          <div
            className="rounded-2xl border p-6 mb-5"
            style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.06)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2
                  className="text-2xl font-bold mb-2 leading-tight"
                  style={{ color: BDA.navyDark, fontFamily: "'Playfair Display', 'Georgia', serif" }}
                >
                  {moduleTitle}
                </h2>
                {moduleDesc && (
                  <p className="text-gray-600 leading-relaxed text-sm">{moduleDesc}</p>
                )}
              </div>
              {module.estimated_duration_hours && (
                <div
                  className="flex-shrink-0 flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border"
                  style={{ color: BDA.navy, borderColor: BDA.border, background: BDA.bluePale }}
                >
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{module.estimated_duration_hours}h</span>
                </div>
              )}
            </div>

            {/* Learning Objectives */}
            {module.learning_objectives && module.learning_objectives.length > 0 && (
              <div className="mt-5 pt-5 border-t" style={{ borderColor: BDA.border }}>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4" style={{ color: BDA.blue }} />
                  <h3 className="text-sm font-semibold" style={{ color: BDA.navy }}>Learning Objectives</h3>
                </div>
                <ul className="space-y-2">
                  {(false && module.learning_objectives_ar
                    ? module.learning_objectives_ar
                    : module.learning_objectives
                  ).map((obj: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: BDA.blue }} />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Module Content */}
          {module.content && module.content.content && module.content.content.length > 0 ? (
            <div
              className="rounded-2xl border p-6 mb-5"
              style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.06)' }}
            >
              <div className="prose prose-gray max-w-none">
                <ContentRenderer content={module.content} />
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl border p-10 mb-5 text-center"
              style={{ background: '#fff', borderColor: BDA.border }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: BDA.bluePale }}
              >
                <BookOpen className="h-8 w-8" style={{ color: BDA.blue }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: BDA.navyDark }}>Content Coming Soon</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                The detailed content for this module is being prepared. In the meantime, explore the lessons from the sidebar to start your learning journey.
              </p>
            </div>
          )}

          {/* Mobile Lessons List (hidden on desktop) */}
          <div
            className="lg:hidden rounded-2xl border p-5 mb-5"
            style={{ background: '#fff', borderColor: BDA.border }}
          >
            <div className="flex items-center gap-2 mb-4">
              <LayoutList className="h-4 w-4" style={{ color: BDA.navy }} />
              <h3 className="font-semibold text-sm" style={{ color: BDA.navy }}>Lessons</h3>
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
              style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}
            >
              <Award className="h-12 w-12 mx-auto mb-3" style={{ color: '#16a34a' }} />
              <h3 className="text-lg font-bold mb-1" style={{ color: '#14532d' }}>Module Completed!</h3>
              <p className="text-sm mb-4" style={{ color: '#166534' }}>
                Great work! You've completed all lessons in this module.
              </p>
              {nextModule && (
                <Button
                  onClick={() => navigate(withLang(`${basePath}/module/${nextModule.id}`))}
                  style={{ background: BDA.navy, color: '#fff' }}
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
                <p className="text-sm font-semibold" style={{ color: BDA.navyDark }}>Ready to start?</p>
                <p className="text-xs mt-0.5 text-gray-500">
                  Select a lesson from the sidebar to begin learning.
                </p>
              </div>
              <div className="flex items-center gap-2" style={{ color: BDA.navy }}>
                <Circle className="h-5 w-5" />
                <span className="text-sm font-semibold">{progressPct}% done</span>
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
              style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.06)' }}
            >
              {/* Sidebar Header */}
              <div
                className="px-4 py-3 border-b flex items-center justify-between"
                style={{ background: BDA.bluePale, borderColor: BDA.border }}
              >
                <div className="flex items-center gap-2">
                  <LayoutList className="h-4 w-4" style={{ color: BDA.navy }} />
                  <span className="text-sm font-semibold" style={{ color: BDA.navy }}>Lessons</span>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: BDA.blueMid, color: BDA.navy }}>
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
                style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.06)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: BDA.blue }}>
                  Up Next
                </p>
                <p className="text-sm font-semibold mb-1" style={{ color: BDA.navyDark }}>
                  Module {nextModule.order_index}
                </p>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {nextModuleTitle}
                </p>
                <Button
                  size="sm"
                  className="w-full gap-1.5 font-medium"
                  style={{ background: BDA.bluePale, color: BDA.navy, border: `1px solid ${BDA.border}` }}
                  onClick={() => navigate(withLang(`${basePath}/module/${nextModule.id}`))}
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
