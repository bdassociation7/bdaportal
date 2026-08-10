/**
 * InstructorShell — Instructor Portal Layout
 *
 * Mirrors the ECP Portal design:
 * - Dark navy sidebar (#0d1f4e) with collapsible sections
 * - Expandable nav groups (Trainer Learning Centre, Official Learning System)
 * - Top bar with page title
 * - BDA brand colors throughout
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
  ClipboardCheck,
  FileText,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Users,
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

// ─── Nav Structure ────────────────────────────────────────────────────────────
interface NavLeaf {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  children: NavLeaf[];
}

interface NavFlat {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  section?: string;
}

type NavEntry = NavFlat | NavGroup;

const isGroup = (e: NavEntry): e is NavGroup => 'children' in e;

const NAV: NavEntry[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/instructor/dashboard',
    icon: LayoutDashboard,
  } as NavFlat,

  // ── Trainer Learning Centre ──────────────────────────────────────────────
  {
    id: 'learning-centre',
    label: 'Trainer Learning Centre',
    icon: GraduationCap,
    children: [
      { id: 'm1', label: 'Module 1 — BDA Orientation',              path: '/instructor/learning-centre/module/1', icon: BookOpen },
      { id: 'm2', label: 'Module 2 — Understanding BDA BoCK',       path: '/instructor/learning-centre/module/2', icon: BookOpen },
      { id: 'm3', label: 'Module 3 — Teaching the BDA Methodology', path: '/instructor/learning-centre/module/3', icon: BookOpen },
      { id: 'm4', label: 'Module 4 — Trainer Delivery Standards',   path: '/instructor/learning-centre/module/4', icon: BookOpen },
      { id: 'm5', label: 'Module 5 — Trainer Assessment',           path: '/instructor/learning-centre/module/5', icon: BookOpen },
    ],
  } as NavGroup,

  // ── The Official Learning System ─────────────────────────────────────────
  {
    id: 'learning-system',
    label: 'The Official Learning System',
    icon: BookOpen,
    children: [
      {
        id: 'ls-candidate',
        label: 'BDA Learning System (Candidate View)',
        path: '/instructor/learning-system',
        icon: Users,
      },
      {
        id: 'ls-instructor',
        label: 'BDA Learning System (Instructor View)',
        path: '/instructor/learning-system/question-bank',
        icon: KeyRound,
      },
    ],
  } as NavGroup,

  // ── Flat items ───────────────────────────────────────────────────────────
  {
    id: 'mock-exams',
    label: 'Mock Exams',
    path: '/instructor/mock-exams',
    icon: ClipboardCheck,
  } as NavFlat,

  {
    id: 'code-of-conduct',
    label: 'Trainer Code of Conduct',
    path: '/instructor/code-of-conduct',
    icon: FileText,
  } as NavFlat,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isPathActive(path: string, current: string): boolean {
  if (path === '/instructor/dashboard') return current === path;
  return current === path || current.startsWith(path + '/') || current.startsWith(path + '?');
}

function groupHasActiveChild(group: NavGroup, current: string): boolean {
  return group.children.some(c => isPathActive(c.path, current));
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();

  const displayName = user?.profile
    ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
    : 'Instructor';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'IN';

  // Track which groups are expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'learning-centre': true,
    'learning-system': false,
  });

  const toggleGroup = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleLogout = async () => {
    try { await AuthService.signOut(); } catch {}
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 z-40 flex flex-col transition-all duration-300 ease-in-out',
        open ? 'w-64' : 'w-14'
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
            <p className="text-white font-bold text-sm leading-tight truncate">BDA Portal</p>
            <div
              className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-0.5"
              style={{ background: 'rgba(15,145,224,0.25)', color: '#0f91e0' }}
            >
              Instructor
            </div>
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
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden space-y-0.5 px-2">
        {NAV.map(entry => {
          if (isGroup(entry)) {
            const groupActive = groupHasActiveChild(entry, location.pathname);
            const isExpanded = expanded[entry.id];
            const Icon = entry.icon;

            return (
              <div key={entry.id}>
                {/* Group header button */}
                <button
                  onClick={() => open && toggleGroup(entry.id)}
                  title={!open ? entry.label : undefined}
                  className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors relative group"
                  style={{
                    background: groupActive && !isExpanded ? BDA.sidebarActive : 'transparent',
                    color: groupActive ? BDA.sidebarTextActive : BDA.sidebarText,
                  }}
                  onMouseEnter={e => { if (!groupActive) (e.currentTarget as HTMLElement).style.background = BDA.sidebarHover; }}
                  onMouseLeave={e => { if (!groupActive || isExpanded) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {groupActive && !isExpanded && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full" style={{ background: BDA.blue }} />
                  )}
                  <span className="shrink-0" style={{ color: groupActive ? BDA.sidebarIconActive : BDA.sidebarIcon }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {open && (
                    <>
                      <span className="truncate flex-1 text-left text-xs font-semibold">{entry.label}</span>
                      {isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: BDA.sidebarIcon }} />
                        : <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: BDA.sidebarIcon }} />
                      }
                    </>
                  )}
                  {!open && (
                    <span className="absolute left-full ml-2 px-2 py-1 text-xs bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {entry.label}
                    </span>
                  )}
                </button>

                {/* Children */}
                {open && isExpanded && (
                  <div className="ml-3 mt-0.5 space-y-0.5" style={{ borderLeft: `1px solid ${BDA.sidebarBorder}`, paddingLeft: '10px' }}>
                    {entry.children.map(child => {
                      const childActive = isPathActive(child.path, location.pathname);
                      const ChildIcon = child.icon;
                      return (
                        <button
                          key={child.id}
                          onClick={() => navigate(child.path)}
                          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium transition-colors relative"
                          style={{
                            background: childActive ? BDA.sidebarActive : 'transparent',
                            color: childActive ? BDA.sidebarTextActive : BDA.sidebarText,
                          }}
                          onMouseEnter={e => { if (!childActive) (e.currentTarget as HTMLElement).style.background = BDA.sidebarHover; }}
                          onMouseLeave={e => { if (!childActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          {childActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: BDA.blue }} />
                          )}
                          <span className="shrink-0" style={{ color: childActive ? BDA.sidebarIconActive : BDA.sidebarIcon }}>
                            <ChildIcon className="h-3.5 w-3.5" />
                          </span>
                          <span className="truncate text-left">{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Flat item
          const flat = entry as NavFlat;
          const active = isPathActive(flat.path, location.pathname);
          const Icon = flat.icon;

          return (
            <button
              key={flat.id}
              onClick={() => navigate(flat.path)}
              title={!open ? flat.label : undefined}
              className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors relative group"
              style={{
                background: active ? BDA.sidebarActive : 'transparent',
                color: active ? BDA.sidebarTextActive : BDA.sidebarText,
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = BDA.sidebarHover; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full" style={{ background: BDA.blue }} />
              )}
              <span className="shrink-0" style={{ color: active ? BDA.sidebarIconActive : BDA.sidebarIcon }}>
                <Icon className="h-4 w-4" />
              </span>
              {open && <span className="truncate flex-1 text-left">{flat.label}</span>}
              {!open && (
                <span className="absolute left-full ml-2 px-2 py-1 text-xs bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {flat.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Logout ───────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${BDA.sidebarBorder}` }}>
        <button
          onClick={handleLogout}
          title={!open ? 'Sign out' : undefined}
          className="w-full flex items-center gap-3 px-3.5 py-3 text-sm font-medium transition-colors group relative"
          style={{ color: 'rgba(255,100,100,0.7)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,50,50,0.08)'; (e.currentTarget as HTMLElement).style.color = '#ff6b6b'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,100,100,0.7)'; }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {open && <span className="truncate">Log Out</span>}
          {!open && (
            <span className="absolute left-full ml-2 px-2 py-1 text-xs bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Log Out
            </span>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full h-9 transition-colors"
          style={{ borderTop: `1px solid ${BDA.sidebarBorder}`, color: BDA.sidebarIcon }}
          title={open ? 'Collapse sidebar' : 'Expand sidebar'}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = BDA.sidebarHover; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = BDA.sidebarIcon; }}
        >
          {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
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

  // Derive page title from current path
  const getTitle = () => {
    const p = location.pathname;
    if (p === '/instructor/dashboard') return 'Instructor Dashboard';
    if (p.includes('/learning-centre/module/1')) return 'Module 1 — BDA Orientation';
    if (p.includes('/learning-centre/module/2')) return 'Module 2 — Understanding BDA BoCK';
    if (p.includes('/learning-centre/module/3')) return 'Module 3 — Teaching the BDA Methodology';
    if (p.includes('/learning-centre/module/4')) return 'Module 4 — Trainer Delivery Standards';
    if (p.includes('/learning-centre/module/5')) return 'Module 5 — Trainer Assessment';
    if (p.includes('/mock-exams')) return 'Mock Exams';
    if (p.includes('/code-of-conduct')) return 'Trainer Code of Conduct';
    if (p.includes('/learning-system')) return 'BDA Learning System';
    return 'Instructor Portal';
  };

  return (
    <div
      className={cn(
        'fixed top-0 right-0 z-30 h-16 flex items-center justify-between px-6 transition-all duration-300',
        sidebarOpen ? 'left-64' : 'left-14'
      )}
      style={{ background: 'white', borderBottom: '1px solid #e5e7eb' }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Instructor Portal</p>
        <p className="text-base font-bold leading-tight" style={{ color: BDA.navy }}>{getTitle()}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden md:block">
          <p className="text-sm font-semibold" style={{ color: BDA.navy }}>{displayName}</p>
          <p className="text-[11px] text-slate-400">BDA Certified Instructor</p>
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ background: BDA.gradient }}
        >
          {displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'IN'}
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
          className={cn(
            'transition-all duration-300 ease-in-out min-h-screen pt-16',
            sidebarOpen ? 'pl-64' : 'pl-14'
          )}
        >
          <Outlet />
        </div>
      </div>
    </ShellContext.Provider>
  );
}
