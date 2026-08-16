/**
 * LearningShell — Shared navigation shell for the BDA Learning System.
 *
 * The learning experience uses a full-width BDA-gradient top bar. The circular
 * menu expands horizontally within the header and preserves every existing route.
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
    <header
      className="sticky top-0 z-50 w-full shadow-[0_8px_24px_rgba(13,31,78,0.18)]"
      style={{ background: 'linear-gradient(108deg, #0f91e0 0%, #1d67b1 44%, #0d1f4e 100%)' }}
    >
      <div ref={menuRef} className="relative flex min-h-[82px] w-full items-center justify-between px-4 sm:min-h-[92px] sm:px-7 lg:px-10">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg px-1 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:px-2"
            aria-label="Back to Portal"
            title="Back to Portal"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Portal</span>
          </button>

          <div className="h-9 w-px shrink-0 bg-white/25" />

          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <img
              src="/bda-logo.png"
              alt="Business Development Association"
              className="h-12 w-[108px] shrink-0 object-contain sm:h-14 sm:w-[132px]"
            />
            <div className="min-w-0 border-l border-white/25 pl-3 sm:pl-4">
              <p className="truncate text-lg font-bold tracking-[-0.02em] text-white sm:text-2xl">BDA Learning System</p>
              <p className="hidden text-xs font-medium tracking-wide text-white/75 sm:block">Business Development Association</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onMenuChange(!menuOpen)}
          className="relative z-20 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#0d1f4e] shadow-[0_5px_18px_rgba(0,0,0,0.18)] transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/30"
          aria-label={menuOpen ? 'Close learning navigation' : 'Open learning navigation'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <nav
          className={`absolute right-[68px] top-1/2 z-10 flex -translate-y-1/2 items-stretch gap-1.5 rounded-xl border border-white/20 bg-[#0d1f4e]/25 p-1.5 shadow-[0_8px_22px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-all duration-200 sm:right-[82px] sm:gap-2 sm:p-2 ${
            menuOpen ? 'pointer-events-auto translate-x-0 opacity-100' : 'pointer-events-none translate-x-4 opacity-0'
          }`}
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
                className={`group flex min-w-[52px] flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition-all sm:min-w-[66px] sm:px-2.5 sm:py-2.5 ${
                  active
                    ? 'bg-white text-[#0d1f4e] shadow-[0_3px_10px_rgba(0,0,0,0.15)]'
                    : 'text-white hover:bg-white/15'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-md ${active ? 'bg-[#f0f6ff] text-[#0f91e0]' : 'bg-white/10 text-white'}`}>
                  {item.icon}
                </span>
                <span className="max-w-[62px] truncate text-[9px] font-semibold leading-tight sm:text-[10px]">{item.label}</span>
              </button>
            );
          })}
        </nav>
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
        <main className="min-h-[calc(100vh-82px)] sm:min-h-[calc(100vh-92px)]">
          <Outlet />
        </main>
      </div>
    </ShellContext.Provider>
  );
}
