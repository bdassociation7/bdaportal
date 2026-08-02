/**
 * LearningShell — App Shell layout for the BDA Learning System
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────┐
 * │  Top Bar (56px, sticky)                             │
 * ├──────────┬──────────────────────────────────────────┤
 * │ Sidebar  │  <Outlet /> (page content)               │
 * │ 240px    │                                          │
 * │ (or 56px │                                          │
 * │ collapsed│                                          │
 * └──────────┴──────────────────────────────────────────┘
 *
 * Sidebar auto-collapses when entering lesson/flashcard/practice routes.
 * User can manually toggle at any time.
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  HelpCircle,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { useOverallProgress, useUserAccesses } from '@/entities/curriculum';

// ─── Context ────────────────────────────────────────────────────────────────

interface ShellContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  isLessonMode: boolean;
}

const ShellContext = createContext<ShellContextValue>({
  sidebarOpen: true,
  setSidebarOpen: () => {},
  isLessonMode: false,
});

export function useLearningShell() {
  return useContext(ShellContext);
}

// ─── Nav items ───────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  labelAr: string;
  icon: React.ReactNode;
  path: string;
  matchPaths?: string[];
  badge?: string;
}

function getNavItems(base: string): NavItem[] {
  return [
    {
      label: 'Dashboard',
      labelAr: 'لوحة التحكم',
      icon: <LayoutDashboard className="h-4 w-4" />,
      path: `${base}`,
      matchPaths: [`${base}`],
    },
    {
      label: 'Training Kits',
      labelAr: 'مواد التدريب',
      icon: <BookOpen className="h-4 w-4" />,
      path: `${base}/training-kits`,
      matchPaths: [`${base}/training-kits`],
    },
    {
      label: 'Flashcards',
      labelAr: 'البطاقات التعليمية',
      icon: <Layers className="h-4 w-4" />,
      path: `${base}/flashcards`,
      matchPaths: [`${base}/flashcards`],
    },
    {
      label: 'Question Bank',
      labelAr: 'بنك الأسئلة',
      icon: <HelpCircle className="h-4 w-4" />,
      path: `${base}/question-bank`,
      matchPaths: [`${base}/question-bank`],
      badge: 'NEW',
    },
    {
      label: 'My Analytics',
      labelAr: 'تحليلاتي',
      icon: <BarChart2 className="h-4 w-4" />,
      path: `${base}/competency-analytics`,
      matchPaths: [`${base}/competency-analytics`],
    },
  ];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Routes where sidebar should auto-collapse (lesson/practice/study) */
const IMMERSIVE_PATTERNS = [
  /\/training-kits\/modules?\//,
  /\/flashcards\/.+/,
  /\/question-bank\/.+/,
];

function isImmersiveRoute(pathname: string): boolean {
  return IMMERSIVE_PATTERNS.some((re) => re.test(pathname));
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  open: boolean;
  isArabic: boolean;
  navItems: NavItem[];
  overallProgress: number;
  onToggle: () => void;
}

function Sidebar({ open, isArabic, navItems, overallProgress, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (item: NavItem) => {
    const paths = item.matchPaths || [item.path];
    return paths.some((p) => location.pathname === p) ||
      (item.path.endsWith('/training-kits') && location.pathname.includes('/training-kits')) ||
      (item.path.endsWith('/flashcards') && location.pathname.includes('/flashcards') && !location.pathname.includes('/admin')) ||
      (item.path.endsWith('/question-bank') && location.pathname.includes('/question-bank') && !location.pathname.includes('/admin')) ||
      (item.path.endsWith('/competency-analytics') && location.pathname.includes('/competency-analytics'));
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-14 bottom-0 z-40 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out',
        open ? 'w-60' : 'w-14'
      )}
    >
      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={!open ? (isArabic ? item.labelAr : item.label) : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-colors relative group',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              {/* Active indicator */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-600 rounded-r-full" />
              )}

              <span className={cn('shrink-0', active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600')}>
                {item.icon}
              </span>

              {open && (
                <span className="truncate flex-1 text-left">
                  {isArabic ? item.labelAr : item.label}
                </span>
              )}

              {open && item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white shrink-0">
                  {item.badge}
                </span>
              )}

              {/* Tooltip when collapsed */}
              {!open && (
                <span className="absolute left-full ml-2 px-2 py-1 text-xs bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {isArabic ? item.labelAr : item.label}
                  {item.badge && <span className="ml-1 text-blue-300">{item.badge}</span>}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Progress bar at bottom */}
      {open && (
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span className="font-medium">Overall Progress</span>
            <span className="font-semibold text-gray-700">{overallProgress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-10 border-t border-gray-100 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
        title={open ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {open
          ? <ChevronLeft className="h-4 w-4" />
          : <ChevronRight className="h-4 w-4" />
        }
      </button>
    </aside>
  );
}

// ─── Main Shell ───────────────────────────────────────────────────────────────

export function LearningShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Detect language
  const searchParams = new URLSearchParams(location.search);
  const currentLang = searchParams.get('lang') || 'EN';
  const isArabic = currentLang === 'AR';

  // Detect base path (ECP vs individual)
  const isECP = location.pathname.startsWith('/ecp/');
  const basePath = isECP ? '/ecp/learning-system' : '/learning-system';
  const backPath = isECP ? '/ecp/dashboard' : '/individual/dashboard';

  // Detect immersive mode (lesson/practice/study)
  const immersive = isImmersiveRoute(location.pathname);

  // Sidebar state — auto-collapse on immersive routes
  const [sidebarOpen, setSidebarOpen] = useState(!immersive);

  useEffect(() => {
    if (immersive) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [immersive]);

  // Curriculum access for certification type
  const { data: accessSummary } = useUserAccesses(user?.id);
  const displayAccess = accessSummary?.accesses?.find((a: any) => a.language === (isArabic ? 'AR' : 'EN')) || accessSummary?.accesses?.[0];
  const certType = (displayAccess?.certification_type as 'CP' | 'SCP') || 'CP';
  const examLang = isArabic ? 'ar' : 'en';

  // Overall progress
  const { data: progressData } = useOverallProgress(user?.id, certType, examLang);
  const overallProgress = progressData?.percentage ?? 0;

  const navItems = getNavItems(basePath);

  return (
    <ShellContext.Provider value={{ sidebarOpen, setSidebarOpen, isLessonMode: immersive }}>
      <div className={cn('min-h-screen bg-[#f8f9fb]', isArabic && 'font-arabic')} dir={isArabic ? 'rtl' : 'ltr'}>

        {/* ── Top Bar ──────────────────────────────────────────────────────── */}
        <header
          className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 gap-4"
          style={{ background: 'linear-gradient(135deg, #0d1f4e 0%, #1C4A8B 55%, #0f91e0 100%)' }}
        >
          {/* Left: sidebar toggle + back */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Toggle sidebar"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <button
              onClick={() => navigate(backPath)}
              className="hidden sm:flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm group"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>{isArabic ? 'العودة' : 'Back to Portal'}</span>
            </button>
          </div>

          {/* Center: Branding */}
          <div className="flex items-center gap-2.5 absolute left-1/2 -translate-x-1/2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white shadow-sm">
              <GraduationCap className="h-4 w-4 text-blue-700" />
            </div>
            <span className="text-white font-semibold text-sm tracking-wide hidden sm:block">
              {isArabic ? 'نظام التعلم' : 'BDA Learning System'}
            </span>
            <span className="text-white font-semibold text-sm tracking-wide sm:hidden">
              {isArabic ? 'التعلم' : 'Learning'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium border border-white/30 text-white/80 bg-white/10">
              {isArabic ? 'عربي' : 'EN'}
            </span>
          </div>

          {/* Right: progress pill */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-white/80 text-xs">
              <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <span className="font-semibold text-white">{overallProgress}%</span>
            </div>
          </div>
        </header>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <Sidebar
          open={sidebarOpen}
          isArabic={isArabic}
          navItems={navItems}
          overallProgress={overallProgress}
          onToggle={() => setSidebarOpen((v) => !v)}
        />

        {/* ── Page Content ─────────────────────────────────────────────────── */}
        <div
          className={cn(
            'pt-14 transition-all duration-300 ease-in-out min-h-screen',
            sidebarOpen ? 'pl-60' : 'pl-14'
          )}
        >
          <Outlet />
        </div>

        {/* ── Mobile bottom nav (< sm) ─────────────────────────────────────── */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
          {navItems.map((item) => {
            const active = location.pathname === item.path ||
              (item.path.endsWith('/training-kits') && location.pathname.includes('/training-kits')) ||
              (item.path.endsWith('/flashcards') && location.pathname.includes('/flashcards')) ||
              (item.path.endsWith('/question-bank') && location.pathname.includes('/question-bank')) ||
              (item.path.endsWith('/competency-analytics') && location.pathname.includes('/competency-analytics'));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  active ? 'text-blue-600' : 'text-gray-400'
                )}
              >
                <span className={active ? 'text-blue-600' : 'text-gray-400'}>{item.icon}</span>
                <span className="truncate max-w-[56px]">{isArabic ? item.labelAr : item.label}</span>
              </button>
            );
          })}
        </nav>

      </div>
    </ShellContext.Provider>
  );
}
