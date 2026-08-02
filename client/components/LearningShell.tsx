/**
 * LearningShell — App Shell layout for the BDA Learning System
 *
 * Layout (no top bar):
 * ┌──────────┬──────────────────────────────────────────┐
 * │ Sidebar  │  <Outlet /> (page content)               │
 * │ 240px    │                                          │
 * │ (or 56px │                                          │
 * │ collapsed│                                          │
 * └──────────┴──────────────────────────────────────────┘
 *
 * Sidebar:
 *  - BDA navy (#1C4A8B) background, full height
 *  - Logo area at top
 *  - Nav items with active indicator
 *  - Progress bar
 *  - "Back to Portal" at bottom
 *  - Collapse toggle
 *  - Auto-collapses on immersive routes (lesson/flashcard/practice)
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
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { useOverallProgress, useUserAccesses } from '@/entities/curriculum';

// ─── Brand Colors ─────────────────────────────────────────────────────────────
const BDA = {
  navy: '#1C4A8B',
  navyDark: '#0d1f4e',
  blue: '#0f91e0',
  sidebarBg: '#1C4A8B',
  sidebarActive: 'rgba(15, 145, 224, 0.25)',
  sidebarHover: 'rgba(255,255,255,0.07)',
  sidebarText: 'rgba(255,255,255,0.75)',
  sidebarTextActive: '#ffffff',
  sidebarBorder: 'rgba(255,255,255,0.10)',
  sidebarIcon: 'rgba(255,255,255,0.55)',
  sidebarIconActive: '#0f91e0',
};

// ─── Context ──────────────────────────────────────────────────────────────────

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

// ─── Nav items ────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  matchFn?: (pathname: string) => boolean;
  badge?: string;
}

function getNavItems(base: string): NavItem[] {
  return [
    {
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
      path: `${base}`,
      matchFn: (p) => p === base || p === `${base}/`,
    },
    {
      label: 'Training Kits',
      icon: <BookOpen className="h-4 w-4" />,
      path: `${base}/training-kits`,
      matchFn: (p) => p.includes('/training-kits'),
    },
    {
      label: 'Flashcards',
      icon: <Layers className="h-4 w-4" />,
      path: `${base}/flashcards`,
      matchFn: (p) => p.includes('/flashcards') && !p.includes('/admin'),
    },
    {
      label: 'Question Bank',
      icon: <HelpCircle className="h-4 w-4" />,
      path: `${base}/question-bank`,
      matchFn: (p) => p.includes('/question-bank') && !p.includes('/admin'),
      badge: 'NEW',
    },
    {
      label: 'My Analytics',
      icon: <BarChart2 className="h-4 w-4" />,
      path: `${base}/competency-analytics`,
      matchFn: (p) => p.includes('/competency-analytics'),
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const IMMERSIVE_PATTERNS = [
  /\/training-kits\/modules?\//,
  /\/flashcards\/.+/,
  /\/question-bank\/.+/,
];

function isImmersiveRoute(pathname: string): boolean {
  return IMMERSIVE_PATTERNS.some((re) => re.test(pathname));
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  open: boolean;
  navItems: NavItem[];
  overallProgress: number;
  backPath: string;
  onToggle: () => void;
}

function Sidebar({ open, navItems, overallProgress, backPath, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (item: NavItem) =>
    item.matchFn ? item.matchFn(location.pathname) : location.pathname === item.path;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 z-40 flex flex-col transition-all duration-300 ease-in-out',
        open ? 'w-60' : 'w-14'
      )}
      style={{ background: BDA.sidebarBg }}
    >
      {/* ── Logo area ─────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center h-16 shrink-0 px-3.5 gap-3',
        )}
        style={{ borderBottom: `1px solid ${BDA.sidebarBorder}` }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: BDA.blue }}
        >
          <GraduationCap className="h-4 w-4 text-white" />
        </div>
        {open && (
          <div className="overflow-hidden">
            <p className="text-white font-semibold text-sm leading-tight truncate">BDA Learning</p>
            <p className="text-[11px] leading-tight truncate" style={{ color: BDA.sidebarText }}>
              System
            </p>
          </div>
        )}
      </div>

      {/* ── Nav items ─────────────────────────────────────────── */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={!open ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-colors relative group'
              )}
              style={{
                background: active ? BDA.sidebarActive : 'transparent',
                color: active ? BDA.sidebarTextActive : BDA.sidebarText,
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = BDA.sidebarHover;
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              {/* Active indicator */}
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                  style={{ background: BDA.blue }}
                />
              )}

              <span
                className="shrink-0"
                style={{ color: active ? BDA.sidebarIconActive : BDA.sidebarIcon }}
              >
                {item.icon}
              </span>

              {open && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}

              {open && item.badge && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: BDA.blue, color: '#fff' }}
                >
                  {item.badge}
                </span>
              )}

              {/* Tooltip when collapsed */}
              {!open && (
                <span className="absolute left-full ml-2 px-2 py-1 text-xs bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {item.label}
                  {item.badge && <span className="ml-1" style={{ color: BDA.blue }}>{item.badge}</span>}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Progress bar ──────────────────────────────────────── */}
      {open && (
        <div
          className="px-4 py-3"
          style={{ borderTop: `1px solid ${BDA.sidebarBorder}` }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium" style={{ color: BDA.sidebarText }}>
              Overall Progress
            </span>
            <span className="text-xs font-bold text-white">{overallProgress}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%`, background: BDA.blue }}
            />
          </div>
        </div>
      )}

      {/* ── Back to Portal ────────────────────────────────────── */}
      <button
        onClick={() => navigate(backPath)}
        title={!open ? 'Back to Portal' : undefined}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-sm font-medium transition-colors group relative"
        style={{
          borderTop: `1px solid ${BDA.sidebarBorder}`,
          color: BDA.sidebarText,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = BDA.sidebarHover;
          (e.currentTarget as HTMLElement).style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = BDA.sidebarText;
        }}
      >
        <ArrowLeft className="h-4 w-4 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
        {open && <span className="truncate">Back to Portal</span>}
        {!open && (
          <span className="absolute left-full ml-2 px-2 py-1 text-xs bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            Back to Portal
          </span>
        )}
      </button>

      {/* ── Collapse toggle ───────────────────────────────────── */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-9 transition-colors"
        style={{
          borderTop: `1px solid ${BDA.sidebarBorder}`,
          color: BDA.sidebarIcon,
        }}
        title={open ? 'Collapse sidebar' : 'Expand sidebar'}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = BDA.sidebarHover;
          (e.currentTarget as HTMLElement).style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = BDA.sidebarIcon;
        }}
      >
        {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </aside>
  );
}

// ─── Main Shell ───────────────────────────────────────────────────────────────

export function LearningShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Language detection
  const searchParams = new URLSearchParams(location.search);
  const currentLang = searchParams.get('lang') || 'EN';
  const isArabic = currentLang === 'AR';

  // Base path
  const isECP = location.pathname.startsWith('/ecp/');
  const basePath = isECP ? '/ecp/learning-system' : '/learning-system';
  const backPath = isECP ? '/ecp/dashboard' : '/individual/dashboard';

  // Immersive mode
  const immersive = isImmersiveRoute(location.pathname);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(!immersive);

  useEffect(() => {
    setSidebarOpen(!immersive);
  }, [immersive]);

  // Progress
  const { data: accessSummary } = useUserAccesses(user?.id);
  const displayAccess = accessSummary?.accesses?.find((a: any) => a.language === (isArabic ? 'AR' : 'EN')) || accessSummary?.accesses?.[0];
  // Always use 'CP' — all content is stored under CP
  const examLang = isArabic ? 'ar' : 'en';

  const { data: progressData } = useOverallProgress(user?.id, 'CP', examLang);
  const overallProgress = progressData?.percentage ?? 0;

  const navItems = getNavItems(basePath);

  return (
    <ShellContext.Provider value={{ sidebarOpen, setSidebarOpen, isLessonMode: immersive }}>
      <div
        className={cn('min-h-screen bg-[#f8f9fb]', isArabic && 'font-arabic')}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <Sidebar
          open={sidebarOpen}
          navItems={navItems}
          overallProgress={overallProgress}
          backPath={backPath}
          onToggle={() => setSidebarOpen((v) => !v)}
        />

        {/* ── Page Content ────────────────────────────────────── */}
        <div
          className={cn(
            'transition-all duration-300 ease-in-out min-h-screen',
            sidebarOpen ? 'pl-60' : 'pl-14'
          )}
        >
          <Outlet />
        </div>

        {/* ── Mobile bottom nav (< sm) ────────────────────────── */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex" style={{ background: BDA.sidebarBg, borderTop: `1px solid ${BDA.sidebarBorder}` }}>
          {navItems.map((item) => {
            const active = item.matchFn ? item.matchFn(location.pathname) : location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors"
                style={{ color: active ? BDA.blue : BDA.sidebarText }}
              >
                <span style={{ color: active ? BDA.blue : BDA.sidebarIcon }}>{item.icon}</span>
                <span className="truncate max-w-[56px]">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </ShellContext.Provider>
  );
}
