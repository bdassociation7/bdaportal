/**
 * BDA Instructor Dashboard
 * Route: /instructor/dashboard
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Monitor,
  GraduationCap,
  KeyRound,
  Building2,
  AlertTriangle,
  Award,
  Clock,
  ShieldCheck,
  ChevronRight,
  BookMarked,
  ClipboardCheck,
  Layers,
  FileText,
  CheckCircle,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/shared/config/supabase.config';
import { useAuthContext } from '@/app/providers/AuthProvider';

interface TrainerContext {
  trainer_id: string;
  trainer_name: string;
  is_active: boolean;
  partner_id: string;
  partner_name: string;
  partner_country: string;
  partner_city: string;
}

interface InstructorCert {
  id: string;
  instructor_id: string;
  level: string;
  certified_at: string;
  expires_at: string;
  status: 'active' | 'suspended' | 'expired' | 'revoked';
}

interface CurriculumModule {
  id: string;
  order_index: number;
  title: string;
  description: string;
  is_published: boolean;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

// ─── Module icon map ──────────────────────────────────────────────────────────
const MODULE_ICONS = [BookOpen, BookMarked, FileText, Monitor, ShieldCheck, ClipboardCheck];

// ─── Component ────────────────────────────────────────────────────────────────
export default function TrainerDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthContext();

  const [ctx, setCtx] = useState<TrainerContext | null>(null);
  const [cert, setCert] = useState<InstructorCert | null>(null);
  const [modules, setModules] = useState<CurriculumModule[]>([]);
  const [loading, setLoading] = useState(true);

  const displayName = user?.profile
    ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
    : 'Instructor';

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    async function load() {
      if (!user?.id) return;
      const { data: ctxData } = await supabase.rpc('get_trainer_context', { p_user_id: user.id });
      if (ctxData && !ctxData.error) setCtx(ctxData as TrainerContext);

      const { data: certData } = await supabase
        .from('instructor_certifications')
        .select('id, instructor_id, level, certified_at, expires_at, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (certData) setCert(certData as InstructorCert);

      const { data: modulesData } = await supabase
        .from('instructor_curriculum_modules')
        .select('id, order_index, title, description, is_published')
        .eq('is_published', true)
        .order('order_index');
      if (modulesData) setModules(modulesData as CurriculumModule[]);

      setLoading(false);
    }
    load();
  }, [user?.id]);

  // ── Suspended ─────────────────────────────────────────────────────────────
  if (!loading && ctx && !ctx.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#f0f6ff' }}>
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <AlertTriangle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#0d1f4e] mb-2">Account Suspended</h2>
          <p className="text-slate-500 text-sm mb-4">
            Your instructor account has been suspended by <strong>{ctx.partner_name || 'BDA'}</strong>.
          </p>
        </div>
      </div>
    );
  }

  const expiryDays = cert ? daysUntil(cert.expires_at) : null;

  return (
    <div className="min-h-screen" style={{ background: '#f0f6ff' }}>

      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-[#dbeafe] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo + Portal label */}
          <div className="flex items-center gap-3">
            <img src="/bda-logo.png" alt="BDA" className="h-9 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="border-l border-[#dbeafe] pl-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#0f91e0]">Instructor Portal</p>
              <p className="text-sm font-bold text-[#0d1f4e] leading-tight">{displayName}</p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {ctx?.partner_name && (
              <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-[#1C4A8B] bg-[#f0f6ff] border border-[#dbeafe] px-3 py-1.5 rounded-lg">
                <Building2 className="w-3.5 h-3.5" />
                {ctx.partner_name}
              </div>
            )}
            {cert && (
              <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-[#0f91e0] bg-[#f0f6ff] border border-[#dbeafe] px-3 py-1.5 rounded-lg">
                <Award className="w-3.5 h-3.5" />
                {cert.instructor_id}
              </div>
            )}
            <button
              onClick={() => signOut?.()}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero / Welcome Banner ──────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center text-white font-extrabold text-xl flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-white/60 text-sm font-medium mb-0.5">Welcome back,</p>
              <h1 className="text-2xl font-extrabold text-white">{displayName}</h1>
              {ctx?.partner_name && (
                <p className="text-white/50 text-xs mt-1 flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" />
                  Authorised Instructor · {ctx.partner_name}
                  {ctx.partner_city ? ` · ${ctx.partner_city}` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Cert badge in hero */}
          {cert && (
            <div className="bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white flex-shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-300" />
                <span className="text-xs font-bold uppercase tracking-wide text-emerald-300">Active Certification</span>
              </div>
              <p className="font-bold text-sm">{cert.level}</p>
              <p className="text-white/50 text-xs font-mono mt-0.5">{cert.instructor_id}</p>
              <p className="text-white/40 text-xs mt-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Valid until {formatDate(cert.expires_at)}
                {expiryDays !== null && expiryDays <= 90 && (
                  <span className="text-amber-300 font-semibold ml-1">({expiryDays}d left)</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        {/* ── Quick Tools ── */}
        <section>
          <h2 className="text-base font-bold text-[#0d1f4e] mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-[#0f91e0] inline-block" />
            Instructor Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: KeyRound,
                title: 'Instructor View',
                desc: 'Answer keys & rationale visible',
                sub: 'Use in your private tab',
                color: '#0f91e0',
                bg: '#f0f6ff',
                path: '/instructor/learning-system/question-bank',
              },
              {
                icon: Monitor,
                title: 'Presentation Mode',
                desc: 'Answer keys hidden',
                sub: 'Safe to share screen with trainees',
                color: '#0d1f4e',
                bg: '#f0f6ff',
                path: '/instructor/learning-system/question-bank?mode=presentation',
              },
              {
                icon: Layers,
                title: 'Flashcards',
                desc: 'Competency flashcard decks',
                sub: 'All 14 competencies',
                color: '#0f91e0',
                bg: '#f0f6ff',
                path: '/instructor/learning-system/flashcards',
              },
              {
                icon: GraduationCap,
                title: 'Mock Exams',
                desc: 'Full exam simulations',
                sub: 'CP & SCP practice tests',
                color: '#0d1f4e',
                bg: '#f0f6ff',
                path: '/instructor/mock-exams',
              },
            ].map(({ icon: Icon, title, desc, sub, color, bg, path }) => (
              <button
                key={title}
                onClick={() => navigate(path)}
                className="group bg-white rounded-2xl border border-[#dbeafe] p-5 text-left hover:border-[#0f91e0] hover:shadow-lg transition-all duration-200 flex flex-col"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: bg, border: `1.5px solid #dbeafe` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <p className="font-bold text-[#0d1f4e] text-sm mb-0.5">{title}</p>
                <p className="text-xs text-slate-500 mb-0.5">{desc}</p>
                <p className="text-xs text-slate-300">{sub}</p>
                <div className="mt-auto pt-3 flex items-center gap-1 text-xs font-semibold text-[#0f91e0] opacity-0 group-hover:opacity-100 transition-opacity">
                  Open <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Trainer Learning Centre ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#0d1f4e] flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-[#0f91e0] inline-block" />
              Trainer Learning Centre
              <span className="text-xs font-normal text-slate-400 ml-1">— Exclusive instructor curriculum</span>
            </h2>
            <span className="text-xs text-slate-400">{modules.length} modules</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#dbeafe] p-5 animate-pulse h-28" />
              ))}
            </div>
          ) : modules.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-[#dbeafe] p-10 text-center">
              <BookMarked className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">Curriculum content is being prepared</p>
              <p className="text-xs text-slate-300 mt-1">Check back soon — modules will appear here once published.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((mod, idx) => {
                const Icon = MODULE_ICONS[idx % MODULE_ICONS.length];
                return (
                  <button
                    key={mod.id}
                    onClick={() => navigate(`/instructor/learning-centre/module/${mod.id}`)}
                    className="group bg-white rounded-2xl border border-[#dbeafe] p-5 text-left hover:border-[#0f91e0] hover:shadow-lg transition-all duration-200 flex items-start gap-4"
                  >
                    {/* Module number + icon */}
                    <div className="flex-shrink-0">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-105"
                        style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#0f91e0]">
                          Module {mod.order_index}
                        </span>
                      </div>
                      <p className="font-bold text-[#0d1f4e] text-sm leading-snug">{mod.title}</p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{mod.description}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-[#0f91e0] opacity-0 group-hover:opacity-100 transition-opacity">
                        Open module <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Learning System Access ── */}
        <section>
          <h2 className="text-base font-bold text-[#0d1f4e] mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-[#0f91e0] inline-block" />
            Full Learning System
          </h2>
          <div
            className="rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:opacity-95 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #0d1f4e 0%, #1C4A8B 100%)' }}
            onClick={() => navigate('/instructor/learning-system')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-white">BDA Learning System</p>
                <p className="text-white/60 text-sm mt-0.5">
                  Full access to training kits, question bank, and flashcards
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-white/20 transition-colors flex-shrink-0">
              Open Learning System
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </section>

      </div>

      {/* ── Footer ── */}
      <div className="border-t border-[#dbeafe] bg-white mt-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-300">
            BDA Instructor Portal · {new Date().getFullYear()}
          </p>
          {cert && (
            <p className="text-xs text-slate-300 font-mono">{cert.instructor_id}</p>
          )}
        </div>
      </div>
    </div>
  );
}
