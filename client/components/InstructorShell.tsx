/**
 * InstructorShell — App Shell layout for the BDA Instructor Portal
 *
 * Layout:
 * ┌──────────┬──────────────────────────────────────────┐
 * │ Sidebar  │  Top Bar                                 │
 * │ 240px    │  ─────────────────────────────────────── │
 * │ (navy    │  <Outlet /> (page content)               │
 * │ gradient)│                                          │
 * └──────────┴──────────────────────────────────────────┘
 *
 * BDA Brand Colors:
 * - Primary Blue:  #0f91e0
 * - Navy:          #0d1f4e
 * - Gradient:      linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)
 */

import React, { useState, createContext, useContext } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  KeyRound,
  Monitor,
  Layers,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  LogOut,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { AuthService } from '@/entities/auth/auth.service';

// ─── Brand ────────────────────────────────────────────────────────────────────
const BDA = {
  navy:              '#0d1f4e',
  blue:              '#0f91e0',
  gradient:          'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)',
  sidebarBg:         '#0d1f4e',
  sidebarActive:     'rgba(15, 145, 224, 0.22)',
  sidebarHover:      'rgba(255,255,255,0.07)',
  sidebarText:       'rgba(255,255,255,0.70)',
  sidebarTextActive: '#ffffff',
  sidebarBorder:     'rgba(255,255,255,0.10)',
  sidebarIcon:       'rgba(255,255,255,0.50)',
  sidebarIconActive: '#0f91e0',
};

// ─── Context ──────────────────────────────────────────────────────────────────
interface ShellCtx { sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void; }
const ShellContext = createContext<ShellCtx>({ sidebarOpen: true, setSidebarOpen: () => {} });
export function useInstructorShell() { return useContext(ShellContext); }

// ─── Nav Items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/instructor/dashboard',
    match: (p: string) => p === '/instructor/dashboard',
  },
  {
    label: 'Learning Centre',
    icon: BookOpen,
    path: '/instructor/learning-centre',
    match: (p: string) => p.includes('/learning-centre'),
    section: 'TRAINER ACCREDITATION',
  },
  {
    label: 'BDA Learning System',
    icon: GraduationCap,
    path: '/instructor/learning-system',
    match: (p: string) => p.includes('/learning-system'),
  },
  {
    label: 'Mock Exams',
    icon: ShieldCheck,
    path: '/instructor/mock-exams',
    match: (p: string) => p.includes('/mock-exams'),
    section: 'INSTRUCTOR TOOLS',
  },
  {
    label: 'Instructor View',
    icon: KeyRound,
    path: '/instructor/learning-system/question-bank',
    match: (p: string) => false,
  },
  {
    label: 'Presentation Mode',
    icon: Monitor,
    path: '/instructor/learning-system/question-bank?mode=presentation',
    match: (p: string) => false,
  },
  {
    label: 'Flashcards',
    icon: Layers,
    path: '/instructor/learning-system/flashcards',
    match: (p: string) => p.includes('/flashcards'),
  },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();

  const displayName = user?.profile
    ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
    : 'Instructor';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = async () => {
    try { await AuthService.signOut(); } catch {}
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 z-40 flex flex-col transition-all duration-300 ease-in-out',
        open ? 'w-60' : 'w-14'
      )}
      style={{ background: BDA.sidebarBg }}
    >
      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center h-16 shrink-0 px-3.5 gap-3"
        style={{ borderBottom: `1px solid ${BDA.sidebarBorder}` }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-xs font-extrabold"
          style={{ background: BDA.gradient }}
        >
          BDA
        </div>
        {open && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight truncate">Instructor Portal</p>
            <p className="text-[10px] leading-tight truncate" style={{ color: BDA.sidebarText }}>
              Business Development Association
            </p>
          </div>
        )}
      </div>

      {/* ── User badge ───────────────────────────────────────────── */}
      {open && (
        <div
          className="px-3.5 py-3 flex items-center gap-2.5"
          style={{ borderBottom: `1px solid ${BDA.sidebarBorder}` }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{ background: BDA.blue }}
          >
            {initials}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-white text-xs font-semibold truncate">{displayName}</p>
            <p className="text-[10px] truncate" style={{ color: BDA.sidebarText }}>BDA Certified Instructor</p>
          </div>
        </div>
      )}

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const active = item.match(location.pathname);
          const Icon = item.icon;
          return (
            <React.Fragment key={item.path}>
              {item.section && open && (
                <div className="px-3.5 pt-4 pb-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: BDA.sidebarText }}>
                    {item.section}
                  </p>
                </div>
              )}
              <button
                onClick={() => navigate(item.path)}
                title={!open ? item.label : undefined}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-colors relative group"
                style={{
                  background: active ? BDA.sidebarActive : 'transparent',
                  color: active ? BDA.sidebarTextActive : BDA.sidebarText,
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = BDA.sidebarHover; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                    style={{ background: BDA.blue }}
                  />
                )}
                <span className="shrink-0" style={{ color: active ? BDA.sidebarIconActive : BDA.sidebarIcon }}>
                  <Icon className="h-4 w-4" />
                </span>
                {open && <span className="truncate flex-1 text-left">{item.label}</span>}
                {!open && (
                  <span className="absolute left-full ml-2 px-2 py-1 text-xs bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {item.label}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* ── Back to Portal ───────────────────────────────────────── */}
      <button
        onClick={() => navigate('/instructor/dashboard')}
        title={!open ? 'Dashboard' : undefined}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-sm font-medium transition-colors group relative"
        style={{ borderTop: `1px solid ${BDA.sidebarBorder}`, color: BDA.sidebarText }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = BDA.sidebarHover; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = BDA.sidebarText; }}
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        {open && <span className="truncate">Back to Dashboard</span>}
      </button>

      {/* ── Logout ───────────────────────────────────────────────── */}
      <button
        onClick={handleLogout}
        title={!open ? 'Sign out' : undefined}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-sm font-medium transition-colors group relative"
        style={{ borderTop: `1px solid ${BDA.sidebarBorder}`, color: 'rgba(255,100,100,0.7)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,50,50,0.08)'; (e.currentTarget as HTMLElement).style.color = '#ff6b6b'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,100,100,0.7)'; }}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {open && <span className="truncate">Sign Out</span>}
      </button>

      {/* ── Collapse toggle ──────────────────────────────────────── */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-9 transition-colors"
        style={{ borderTop: `1px solid ${BDA.sidebarBorder}`, color: BDA.sidebarIcon }}
        title={open ? 'Collapse' : 'Expand'}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = BDA.sidebarHover; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = BDA.sidebarIcon; }}
      >
        {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </aside>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────
function TopBar({ sidebarOpen }: { sidebarOpen: boolean }) {
  const location = useLocation();
  const { user } = useAuthContext();

  const displayName = user?.profile
    ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
    : 'Instructor';

  // Page title from current route
  const pageTitle = NAV_ITEMS.find(n => n.match(location.pathname))?.label || 'Instructor Portal';

  return (
    <div
      className={cn(
        'fixed top-0 right-0 z-30 h-16 flex items-center justify-between px-6 transition-all duration-300',
        sidebarOpen ? 'left-60' : 'left-14'
      )}
      style={{ background: 'white', borderBottom: '1px solid #e5e7eb' }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Instructor Portal</p>
        <p className="text-base font-bold text-[#0d1f4e] leading-tight">{pageTitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden md:block">
          <p className="text-sm font-semibold text-[#0d1f4e]">{displayName}</p>
          <p className="text-[11px] text-slate-400">BDA Certified Instructor</p>
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ background: BDA.gradient }}
        >
          {displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
        </div>
      </div>
    </div>
  );
}

// ─── Main Shell ───────────────────────────────────────────────────────────────
export function InstructorShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <ShellContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <div className="min-h-screen bg-[#f0f4f8]">
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />
        <TopBar sidebarOpen={sidebarOpen} />
        <div
          className={cn('transition-all duration-300 ease-in-out min-h-screen pt-16', sidebarOpen ? 'pl-60' : 'pl-14')}
        >
          <Outlet />
        </div>
      </div>
    </ShellContext.Provider>
  );
}
