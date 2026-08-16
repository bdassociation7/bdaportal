/**
 * LearningShell — Shared navigation shell for the BDA Learning System.
 *
 * The learning experience uses a compact BDA-gradient top bar rather than
 * a persistent sidebar. The circular menu expands horizontally to the left
 * and preserves the current routes and learning-system functionality.
 */

import React, { useEffect, useRef, useState, createContext, useContext } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  HelpCircle,
  BarChart2,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react';

interface ShellContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  isLessonMode: boolean;
}

const ShellContext = createContext<ShellContextValue>({
  sidebarOpen: false,
  setSidebarOpen: () => {},
  isLessonMode: false,
});

export function useLearningShell() {
  return useContext(ShellContext);
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  matchFn: (pathname: string) => boolean;
}

function getNavItems(basePath: string): NavItem[] {
  return [
    {
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
      path: basePath,
      matchFn: (pathname) => pathname === basePath || pathname === `${basePath}/`,
    },
    {
      label: 'Competencies',
      icon: <BookOpen className="h-4 w-4" />,
      path: `${basePath}/training-kits`,
      matchFn: (pathname) => pathname.includes('/training-kits'),
    },
    {
      label: 'Questions',
      icon: <HelpCircle className="h-4 w-4" />,
      path: `${basePath}/question-bank`,
      matchFn: (pathname) => pathname.includes('/question-bank') && !pathname.includes('/admin'),
    },
    {
      label: 'Flashcards',
      icon: <Layers className="h-4 w-4" />,
      path: `${basePath}/flashcards`,
      matchFn: (pathname) => pathname.includes('/flashcards') && !pathname.includes('/admin'),
    },
    {
      label: 'Analytics',
      icon: <BarChart2 className="h-4 w-4" />,
      path: `${basePath}/competency-analytics`,
      matchFn: (pathname) => pathname.includes('/competency-analytics'),
    },
  ];
}

const IMMERSIVE_PATTERNS = [
  /\/training-kits\/modules?\//,
  /\/flashcards\/.+/,
  /\/question-bank\/.+/,
  /\/learning-centre\//,
  /\/mock-exams/,
];

function isImmersiveRoute(pathname: string): boolean {
  return IMMERSIVE_PATTERNS.some((pattern) => pattern.test(pathname));
}

interface LearningTopBarProps {
  navItems: NavItem[];
  backPath: string;
  menuOpen: boolean;
  onMenuChange: (open: boolean) => void;
}

function LearningTopBar({ navItems, backPath, menuOpen, onMenuChange }: LearningTopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onMenuChange(false);
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) onMenuChange(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, [onMenuChange]);

  return (
    <header className="sticky top-0 z-50 px-3 py-3 sm:px-5 sm:py-4" style={{ background: '#f8f9fb' }}>
      <div
        className="mx-auto flex min-h-[64px] max-w-[1440px] items-center justify-between rounded-2xl px-3 shadow-[0_10px_30px_rgba(13,31,78,0.16)] sm:min-h-[72px] sm:px-5"
        style={{ background: 'linear-gradient(112deg, #0f91e0 0%, #1c62ad 45%, #0d1f4e 100%)' }}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 sm:px-3.5 sm:text-sm"
            aria-label="Back to Portal"
            title="Back to Portal"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Portal</span>
          </button>

          <div className="h-8 w-px shrink-0 bg-white/20" />

          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="flex h-10 w-[76px] shrink-0 items-center rounded-lg bg-white px-1.5 shadow-sm sm:h-11 sm:w-[96px]">
              <img
                src="/bda-logo.png"
                alt="Business Development Association"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-[-0.01em] text-white sm:text-base">BDA Learning System</p>
              <p className="hidden text-[11px] font-medium text-white/70 sm:block">Business Development Association</p>
            </div>
          </div>
        </div>

        <div ref={menuRef} className="relative ml-3 shrink-0">
          <button
            type="button"
            onClick={() => onMenuChange(!menuOpen)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#0d1f4e] shadow-[0_4px_14px_rgba(0,0,0,0.16)] transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/30"
            aria-label={menuOpen ? 'Close learning navigation' : 'Open learning navigation'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div
            className={`absolute right-0 top-[calc(100%+12px)] origin-top-right transition-all duration-200 ${
              menuOpen ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
            }`}
          >
            <nav
              className="flex w-[min(360px,calc(100vw-2rem))] items-stretch justify-between gap-1 rounded-2xl border border-[#dbeafe] bg-white p-2 shadow-[0_18px_45px_rgba(13,31,78,0.18)] sm:w-[440px] sm:gap-2 sm:p-2.5"
              aria-label="Learning system navigation"
            >
              {navItems.map((item) => {
                const active = item.matchFn(location.pathname);
                return (
                  <button
                    type="button"
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      onMenuChange(false);
                    }}
                    className={`group flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-xl px-1.5 py-2.5 text-center transition-all sm:px-2.5 sm:py-3 ${
                      active
                        ? 'bg-[#0f91e0] text-white shadow-[0_5px_12px_rgba(15,145,224,0.28)]'
                        : 'text-[#1c4a8b] hover:bg-[#f0f6ff]'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-white/15' : 'bg-[#f0f6ff] group-hover:bg-white'}`}>
                      {item.icon}
                    </span>
                    <span className="max-w-full truncate text-[10px] font-semibold leading-tight sm:text-[11px]">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

export function LearningShell() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const isArabic = (searchParams.get('lang') || 'EN') === 'AR';
  const isECP = location.pathname.startsWith('/ecp/');
  const isInstructor = location.pathname.startsWith('/instructor/');

  const basePath = isECP
    ? '/ecp/learning-system'
    : isInstructor
      ? '/instructor/learning-system'
      : '/learning-system';
  const backPath = isECP
    ? '/ecp/dashboard'
    : isInstructor
      ? '/instructor/dashboard'
      : '/individual/dashboard';
  const navItems = getNavItems(basePath);
  const immersive = isImmersiveRoute(location.pathname);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <ShellContext.Provider value={{ sidebarOpen: menuOpen, setSidebarOpen: setMenuOpen, isLessonMode: immersive }}>
      <div className={`min-h-screen bg-[#f8f9fb] ${isArabic ? 'font-arabic' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
        <LearningTopBar
          navItems={navItems}
          backPath={backPath}
          menuOpen={menuOpen}
          onMenuChange={setMenuOpen}
        />
        <main className="min-h-[calc(100vh-96px)]">
          <Outlet />
        </main>
      </div>
    </ShellContext.Provider>
  );
}
