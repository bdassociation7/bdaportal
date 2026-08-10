/**
 * InstructorShell — Instructor Portal Layout
 *
 * Matches ECP Portal design exactly:
 * - White sidebar with gradient header (sky → navy)
 * - BDA logo in header
 * - Active nav item: gradient from-sky-500 to-blue-800
 * - Gray text for inactive items
 * - Expandable nav groups for Learning Centre & Learning System
 */

import React, { useState } from 'react';
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
  LogOut,
  Users,
  Menu,
  X,
} from 'lucide-react';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { AuthService } from '@/entities/auth/auth.service';
import { Badge } from '@/components/ui/badge';

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
  isLogout?: boolean;
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

// ─── Sidebar Content ──────────────────────────────────────────────────────────
function SidebarContent({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();

  const displayName = user?.profile
    ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
    : 'Instructor';

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'learning-centre': true,
    'learning-system': false,
  });

  const toggleGroup = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleNav = (path: string) => {
    navigate(path);
    onClose?.();
  };

  const handleLogout = async () => {
    try { await AuthService.signOut(); } catch {}
    navigate('/login');
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* ── Logo / Header ─────────────────────────────────────────── */}
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-gray-200 px-4 bg-gradient-to-r from-sky-500 via-blue-600 to-[#0d1f4e]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
              <span className="text-sm font-extrabold bg-gradient-to-r from-sky-500 to-[#0d1f4e] bg-clip-text text-transparent">BDA</span>
            </div>
            <span className="text-lg font-bold text-white">Portal</span>
          </div>
          <Badge variant="outline" className="text-xs px-2 py-0.5 w-fit border-white/30 text-white bg-white/10">
            Instructor
          </Badge>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-white/80 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ── User info ─────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">{displayName}</p>
        <p className="text-xs text-gray-500">BDA Certified Instructor</p>
      </div>

      {/* ── Navigation ────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-0.5 px-2 py-3 overflow-y-auto">
        {NAV.map(entry => {
          if (isGroup(entry)) {
            const groupActive = groupHasActiveChild(entry, location.pathname);
            const isExpanded = expanded[entry.id];
            const Icon = entry.icon;

            return (
              <div key={entry.id}>
                <button
                  onClick={() => toggleGroup(entry.id)}
                  className={cn(
                    'group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    groupActive && !isExpanded
                      ? 'bg-gradient-to-r from-sky-500 to-blue-800 text-white'
                      : 'text-gray-700 hover:bg-sky-50 hover:text-blue-700'
                  )}
                >
                  <Icon className={cn('h-5 w-5 shrink-0 mr-3', groupActive && !isExpanded ? 'text-white' : 'text-gray-400 group-hover:text-blue-500')} />
                  <span className="flex-1 text-left">{entry.label}</span>
                  {isExpanded
                    ? <ChevronDown className="h-4 w-4 text-gray-400" />
                    : <ChevronRight className="h-4 w-4 text-gray-400" />
                  }
                </button>

                {isExpanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3">
                    {entry.children.map(child => {
                      const childActive = isPathActive(child.path, location.pathname);
                      const ChildIcon = child.icon;
                      return (
                        <button
                          key={child.id}
                          onClick={() => handleNav(child.path)}
                          className={cn(
                            'group flex w-full items-center rounded-md px-2 py-2 text-xs font-medium transition-colors',
                            childActive
                              ? 'bg-gradient-to-r from-sky-500 to-blue-800 text-white'
                              : 'text-gray-600 hover:bg-sky-50 hover:text-blue-700'
                          )}
                        >
                          <ChildIcon className={cn('h-4 w-4 shrink-0 mr-2.5', childActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-500')} />
                          <span className="text-left leading-snug">{child.label}</span>
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
              onClick={() => handleNav(flat.path)}
              className={cn(
                'group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-gradient-to-r from-sky-500 to-blue-800 text-white'
                  : 'text-gray-700 hover:bg-sky-50 hover:text-blue-700'
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0 mr-3', active ? 'text-white' : 'text-gray-400 group-hover:text-blue-500')} />
              {flat.label}
            </button>
          );
        })}
      </nav>

      {/* ── Logout ────────────────────────────────────────────────── */}
      <div className="border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0 mr-3 text-red-400 group-hover:text-red-500" />
          Log Out
        </button>
      </div>
    </div>
  );
}

// ─── Main Shell ───────────────────────────────────────────────────────────────
export function InstructorShell() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuthContext();

  const displayName = user?.profile
    ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
    : 'Instructor';

  // Page title from path
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)}>
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar — fixed on desktop, slide-in on mobile */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <SidebarContent onClose={() => setMobileSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white border-b border-gray-200 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Instructor Portal</p>
              <p className="text-base font-bold text-[#0d1f4e] leading-tight">{getTitle()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-[#0d1f4e]">{displayName}</p>
              <p className="text-[11px] text-gray-400">BDA Certified Instructor</p>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}
            >
              {displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'IN'}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
