/**
 * BDA Instructor Portal — Dashboard
 * Route: /instructor/dashboard
 *
 * Design principles (per brief):
 * - Institutional, professional, premium, calm, credible
 * - NOT a SaaS/LMS dashboard — a certification body portal
 * - Hierarchy: Status → Learning Centre → Tools → Learning System
 * - Gradients used selectively (CTAs, status badges, icon backgrounds only)
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
  ShieldCheck,
  ChevronRight,
  BookMarked,
  ClipboardCheck,
  Layers,
  FileText,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/shared/config/supabase.config';
import { useAuthContext } from '@/app/providers/AuthProvider';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

const MODULE_ICONS = [BookOpen, BookMarked, FileText, Monitor, ShieldCheck, ClipboardCheck];

// Module state — placeholder until progress tracking is implemented
type ModuleState = 'completed' | 'in_progress' | 'not_started' | 'locked';
function getModuleState(index: number): ModuleState {
  // All unlocked, not started — will be driven by real progress data later
  return 'not_started';
}

const MODULE_STATE_CONFIG: Record<ModuleState, { label: string; labelClass: string; dotClass: string }> = {
  completed:   { label: 'Completed',   labelClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',  dotClass: 'bg-emerald-500' },
  in_progress: { label: 'In Progress', labelClass: 'text-[#0B75C9] bg-blue-50 border-blue-200',          dotClass: 'bg-[#0B75C9]' },
  not_started: { label: 'Not Started', labelClass: 'text-slate-500 bg-slate-50 border-slate-200',         dotClass: 'bg-slate-300' },
  locked:      { label: 'Locked',      labelClass: 'text-slate-400 bg-slate-50 border-slate-200',         dotClass: 'bg-slate-200' },
};

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
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f7f9fc]">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#082B63] mb-2">Account Suspended</h2>
          <p className="text-slate-500 text-sm">
            Your instructor account has been suspended by <strong>{ctx.partner_name || 'BDA'}</strong>.
            Please contact your partner organisation.
          </p>
        </div>
      </div>
    );
  }

  const expiryDays = cert ? daysUntil(cert.expires_at) : null;
  const accreditationStatus = cert ? 'Active' : 'In Progress';

  return (
    <div className="bg-[#f0f4f8] min-h-screen">
      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── A. Trainer Status ── */}
        <section>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Status bar */}
            <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl bg-[#082B63] text-white font-bold text-base flex items-center justify-center flex-shrink-0">
                  {initials}
                </div>
                <div>
                  <p className="font-bold text-[#082B63] text-base">{displayName}</p>
                  {ctx?.partner_name && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3" />
                      {ctx.partner_name}{ctx.partner_city ? ` · ${ctx.partner_city}` : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${cert ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-[#0B75C9] bg-blue-50 border-blue-200'}`}>
                  {cert ? '● Active' : '● In Progress'}
                </span>
                {cert && (
                  <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-mono">
                    {cert.instructor_id}
                  </span>
                )}
              </div>
            </div>

            {/* Status details */}
            <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Accreditation</p>
                <p className="text-sm font-semibold text-[#082B63]">{cert ? 'BDA Certified Instructor' : 'In Progress'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Learning Progress</p>
                <p className="text-sm font-semibold text-[#082B63]">0 of {modules.length} modules</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Assessment</p>
                <p className="text-sm font-semibold text-slate-400">Not yet started</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  {cert ? 'Valid Until' : 'Validity'}
                </p>
                <p className="text-sm font-semibold text-[#082B63]">
                  {cert
                    ? <>
                        {formatDate(cert.expires_at)}
                        {expiryDays !== null && expiryDays <= 90 && (
                          <span className="text-amber-500 text-xs ml-1">({expiryDays}d)</span>
                        )}
                      </>
                    : '—'
                  }
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── B. Trainer Learning Centre ── */}
        <section>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#082B63]">Trainer Learning Centre</h2>
              <p className="text-xs text-slate-400 mt-0.5">Your required learning pathway for BDA trainer accreditation</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex-shrink-0">
              <span className="font-semibold text-[#082B63]">{modules.length} Modules</span>
              <span>·</span>
              <span>Required</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500">0 of {modules.length} modules completed</span>
                <span className="text-xs font-bold text-[#082B63]">0%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#0B75C9] rounded-full" style={{ width: '0%' }} />
              </div>
            </div>
          </div>

          {/* Module grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-28" />
              ))}
            </div>
          ) : modules.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <BookMarked className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Curriculum content is being prepared</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.map((mod, idx) => {
                const Icon = MODULE_ICONS[idx % MODULE_ICONS.length];
                const isFinal = mod.order_index === modules.length;
                const state = getModuleState(idx);
                const stateConf = MODULE_STATE_CONFIG[state];

                return (
                  <button
                    key={mod.id}
                    onClick={() => navigate(`/instructor/learning-centre/module/${mod.id}`)}
                    className="group bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-[#0B75C9] hover:shadow-sm transition-all duration-200 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Icon */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #0B75C9 0%, #082B63 100%)' }}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      {/* State badge */}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex-shrink-0 ${stateConf.labelClass}`}>
                        {isFinal ? 'Final Assessment' : stateConf.label}
                      </span>
                    </div>

                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Module {mod.order_index}
                      </p>
                      <p className="font-bold text-[#082B63] text-sm leading-snug">{mod.title}</p>
                      {isFinal && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Knowledge Test · Teaching Demonstration · Practical Evaluation
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[#0B75C9] opacity-0 group-hover:opacity-100 transition-opacity">
                      Open module <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Accreditation Pathway ── */}
        <section>
          <h2 className="text-base font-bold text-[#082B63] mb-4">Accreditation Pathway</h2>
          <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { num: '01', label: 'Complete Trainer Curriculum', done: false },
                { num: '02', label: 'Pass Methodology Assessment', done: false },
                { num: '03', label: 'Complete Teaching Demonstration', done: false },
                { num: '04', label: 'Receive BDA Trainer Accreditation', done: !!cert },
              ].map((step, i, arr) => (
                <div key={step.num} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${step.done ? 'text-emerald-600' : 'text-slate-300'}`}>
                      {step.num}
                    </span>
                    {i < arr.length - 1 && (
                      <div className="flex-1 h-px bg-slate-100 hidden md:block" />
                    )}
                  </div>
                  <p className={`text-xs font-semibold leading-snug ${step.done ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {step.label}
                  </p>
                  {step.done && (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Completed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── C. Instructor Tools ── */}
        <section>
          <h2 className="text-base font-bold text-[#082B63] mb-1">Instructor Tools</h2>
          <p className="text-xs text-slate-400 mb-4">Supporting resources for your training sessions</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                icon: KeyRound,
                title: 'Instructor View',
                desc: 'Answer keys visible',
                path: '/instructor/learning-system/question-bank',
              },
              {
                icon: Monitor,
                title: 'Presentation Mode',
                desc: 'Safe to share screen',
                path: '/instructor/learning-system/question-bank?mode=presentation',
              },
              {
                icon: Layers,
                title: 'Flashcards',
                desc: 'All 14 competencies',
                path: '/instructor/learning-system/flashcards',
              },
              {
                icon: GraduationCap,
                title: 'Mock Exams',
                desc: 'CP & SCP simulations',
                path: '/instructor/mock-exams',
              },
            ].map(({ icon: Icon, title, desc, path }) => (
              <button
                key={title}
                onClick={() => navigate(path)}
                className="group bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-[#0B75C9] hover:shadow-sm transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-lg bg-[#f0f6ff] flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-[#0B75C9]" />
                </div>
                <p className="font-semibold text-[#082B63] text-sm">{title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* ── D. BDA Learning System ── */}
        <section>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#f0f6ff] flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-[#0B75C9]" />
              </div>
              <div>
                <p className="font-bold text-[#082B63] text-sm">BDA Learning System</p>
                <p className="text-xs text-slate-400 mt-0.5 max-w-sm">
                  Access the official BDA Learning System, including training kits, question banks and competency resources.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/instructor/learning-system')}
              className="flex items-center gap-2 text-sm font-semibold text-[#0B75C9] border border-[#0B75C9] px-4 py-2 rounded-xl hover:bg-[#0B75C9] hover:text-white transition-colors flex-shrink-0"
            >
              Open BDA Learning System
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

      </main>


    </div>
  );
}
