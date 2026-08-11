// InstructorShell v3 - White sidebar matching ECP Portal
import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, BookOpen, GraduationCap, KeyRound,
  Monitor, ClipboardCheck, FileText, ChevronDown, ChevronRight,
  LogOut, Users, Menu, X,
} from 'lucide-react';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { AuthService } from '@/entities/auth/auth.service';
import { Badge } from '@/components/ui/badge';

interface NavLeaf { id: string; label: string; path: string; icon: React.ElementType; }
interface NavGroup { id: string; label: string; icon: React.ElementType; children: NavLeaf[]; }
interface NavFlat { id: string; label: string; path: string; icon: React.ElementType; }
type NavEntry = NavFlat | NavGroup;
const isGroup = (e: NavEntry): e is NavGroup => 'children' in e;

const NAV: NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/instructor/dashboard', icon: LayoutDashboard },
  {
    id: 'learning-centre', label: 'Trainer Learning Centre', icon: GraduationCap,
    children: [
      { id: 'm1', label: 'Module 1 — BDA Orientation', path: '/instructor/learning-centre/module/1', icon: BookOpen },
      { id: 'm2', label: 'Module 2 — Understanding BDA BoCK', path: '/instructor/learning-centre/module/2', icon: BookOpen },
      { id: 'm3', label: 'Module 3 — Teaching the BDA Methodology', path: '/instructor/learning-centre/module/3', icon: BookOpen },
      { id: 'm4', label: 'Module 4 — Using the Official Learning System', path: '/instructor/learning-centre/module/4', icon: BookOpen },
      { id: 'm5', label: 'Module 5 — Instructor Delivery Standards', path: '/instructor/learning-centre/module/5', icon: BookOpen },
      { id: 'instructor-assessment', label: 'Instructor Assessment', path: '/instructor/assessment', icon: ClipboardCheck },
    ],
  },
  {
    id: 'learning-system', label: 'The Official Learning System', icon: BookOpen,
    children: [
      { id: 'ls-candidate', label: 'BDA Learning System (Candidate View)', path: '/instructor/learning-system?mode=candidate', icon: Users },
      { id: 'ls-instructor', label: 'BDA Learning System (Instructor View)', path: '/instructor/learning-system', icon: KeyRound },
    ],
  },
  { id: 'mock-exams', label: 'Mock Exams', path: '/instructor/mock-exams', icon: ClipboardCheck },
  { id: 'code-of-conduct', label: 'Trainer Code of Conduct', path: '/instructor/code-of-conduct', icon: FileText },
];

function isActive(path: string, current: string) {
  if (path === '/instructor/dashboard') return current === path;
  return current === path || current.startsWith(path + '/');
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const name = user?.profile ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim() : 'Instructor';
  const [open, setOpen] = useState<Record<string, boolean>>({ 'learning-centre': true, 'learning-system': false });

  const go = (path: string) => { navigate(path); onClose?.(); };
  const logout = async () => { try { await AuthService.signOut(); } catch {} navigate('/login'); };

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: '#ffffff' }}>
      {/* Header */}
      <div className="flex h-[72px] shrink-0 items-center justify-between px-4" style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #1a4fa0 60%, #0d1f4e 100%)' }}>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow">
              <span className="text-xs font-black" style={{ background: 'linear-gradient(135deg,#0f91e0,#0d1f4e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BDA</span>
            </div>
            <span className="text-base font-bold text-white">Portal</span>
          </div>
          <Badge className="text-[10px] px-2 py-0 w-fit border-white/30 text-white bg-white/15 border">Instructor</Badge>
        </div>
        {onClose && <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white"><X className="h-5 w-5" /></button>}
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">{name}</p>
        <p className="text-xs text-gray-400">BDA Certified Instructor</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV.map(entry => {
          if (isGroup(entry)) {
            const groupActive = entry.children.some(c => isActive(c.path, location.pathname));
            const expanded = open[entry.id];
            const Icon = entry.icon;
            return (
              <div key={entry.id}>
                <button
                  onClick={() => setOpen(p => ({ ...p, [entry.id]: !p[entry.id] }))}
                  className={cn(
                    'group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    groupActive && !expanded
                      ? 'text-white'
                      : 'text-gray-700 hover:bg-sky-50 hover:text-blue-700'
                  )}
                  style={groupActive && !expanded ? { background: 'linear-gradient(135deg,#0f91e0,#1e40af)' } : {}}
                >
                  <Icon className={cn('h-5 w-5 shrink-0 mr-3', groupActive && !expanded ? 'text-white' : 'text-gray-400 group-hover:text-blue-500')} />
                  <span className="flex-1 text-left">{entry.label}</span>
                  {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                </button>
                {expanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-3">
                    {entry.children.map(child => {
                      const active = isActive(child.path, location.pathname);
                      const CIcon = child.icon;
                      return (
                        <button
                          key={child.id}
                          onClick={() => go(child.path)}
                          className={cn('group flex w-full items-center rounded-lg px-2 py-2 text-xs font-medium transition-all', active ? 'text-white' : 'text-gray-600 hover:bg-sky-50 hover:text-blue-700')}
                          style={active ? { background: 'linear-gradient(135deg,#0f91e0,#1e40af)' } : {}}
                        >
                          <CIcon className={cn('h-4 w-4 shrink-0 mr-2', active ? 'text-white' : 'text-gray-400 group-hover:text-blue-500')} />
                          <span className="text-left leading-snug">{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          const flat = entry as NavFlat;
          const active = isActive(flat.path, location.pathname);
          const Icon = flat.icon;
          return (
            <button
              key={flat.id}
              onClick={() => go(flat.path)}
              className={cn('group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all', active ? 'text-white' : 'text-gray-700 hover:bg-sky-50 hover:text-blue-700')}
              style={active ? { background: 'linear-gradient(135deg,#0f91e0,#1e40af)' } : {}}
            >
              <Icon className={cn('h-5 w-5 shrink-0 mr-3', active ? 'text-white' : 'text-gray-400 group-hover:text-blue-500')} />
              {flat.label}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-200">
        <button onClick={logout} className="group flex w-full items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
          <LogOut className="h-5 w-5 shrink-0 mr-3 text-red-400 group-hover:text-red-500" />
          Log Out
        </button>
      </div>
    </div>
  );
}

export function InstructorPortalShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuthContext();
  const name = user?.profile ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim() : 'Instructor';
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'IN';

  const getTitle = () => {
    const p = location.pathname;
    if (p === '/instructor/dashboard') return 'Instructor Dashboard';
    if (p.includes('/learning-centre/module/1')) return 'Module 1 — BDA Orientation';
    if (p.includes('/learning-centre/module/2')) return 'Module 2 — Understanding BDA BoCK';
    if (p.includes('/learning-centre/module/3')) return 'Module 3 — Teaching the BDA Methodology';
    if (p.includes('/learning-centre/module/4')) return 'Module 4 — Using the Official Learning System';
    if (p.includes('/learning-centre/module/5')) return 'Module 5 — Instructor Delivery Standards';
    if (p.includes('/instructor/assessment')) return 'Instructor Assessment';
    if (p.includes('/mock-exams')) return 'Mock Exams';
    if (p.includes('/code-of-conduct')) return 'Trainer Code of Conduct';
    if (p.includes('/learning-system')) return 'BDA Learning System';
    return 'Instructor Portal';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="fixed inset-0 bg-black/50" />
        </div>
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 shadow-xl transform transition-transform duration-300 lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </div>

      {/* Main */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white border-b border-gray-200 px-4 lg:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Instructor Portal</p>
              <p className="text-sm font-bold text-[#0d1f4e] leading-tight">{getTitle()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-[#0d1f4e]">{name}</p>
              <p className="text-[11px] text-gray-400">BDA Certified Instructor</p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg,#0f91e0,#0d1f4e)' }}>
              {initials}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1"><Outlet /></main>
      </div>
    </div>
  );
}
