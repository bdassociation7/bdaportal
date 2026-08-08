/**
 * Trainer Dashboard — BDA Certified Instructor
 * Route: /trainer/dashboard
 *
 * Shows:
 * - Instructor Status Card (BDA-CI-XXXXXX | Status | Valid Until)
 * - Trainer Learning Centre (6 modules)
 * - Learning System (Instructor View)
 * - Mock Exams
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
  CheckCircle,
  Award,
  Clock,
  ShieldCheck,
  ChevronRight,
  BookMarked,
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

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TrainerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [ctx, setCtx] = useState<TrainerContext | null>(null);
  const [cert, setCert] = useState<InstructorCert | null>(null);
  const [modules, setModules] = useState<CurriculumModule[]>([]);
  const [loading, setLoading] = useState(true);

  const displayName = user?.profile
    ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
    : 'Instructor';

  useEffect(() => {
    async function load() {
      if (!user?.id) return;

      // Load trainer context (partner info + active status)
      const { data: ctxData } = await supabase.rpc('get_trainer_context', { p_user_id: user.id });
      if (ctxData && !ctxData.error) setCtx(ctxData as TrainerContext);

      // Load instructor certification
      const { data: certData } = await supabase
        .from('instructor_certifications')
        .select('id, instructor_id, level, certified_at, expires_at, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (certData) setCert(certData as InstructorCert);

      // Load Trainer Learning Centre modules (published only)
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

  // ── Suspended screen ──────────────────────────────────────────────────────
  if (!loading && ctx && !ctx.is_active) {
    return (
      <div className="min-h-screen bg-[#f0f6ff] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <AlertTriangle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#0d1f4e] mb-2">Account Suspended</h2>
          <p className="text-slate-500 text-sm mb-4">
            Your instructor account has been suspended by{' '}
            <strong>{ctx.partner_name || 'BDA'}</strong>.
            Please contact your partner organisation for more information.
          </p>
          {ctx.partner_name && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Partner Organisation</p>
              <p className="text-sm font-semibold text-[#0d1f4e]">{ctx.partner_name}</p>
              {ctx.partner_city && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {ctx.partner_city}{ctx.partner_country ? `, ${ctx.partner_country}` : ''}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const expiryDays = cert ? daysUntil(cert.expires_at) : null;
  const expiryWarning = expiryDays !== null && expiryDays <= 90;

  return (
    <div className="min-h-screen bg-[#f0f6ff]">
      {/* ── Header ── */}
      <div className="bg-white border-b border-[#dbeafe] shadow-sm">
        <div className="container mx-auto px-6 py-4 max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/bda-logo.png"
              alt="BDA"
              className="h-9 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="border-l border-[#dbeafe] pl-3">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Instructor Portal</p>
              <p className="text-sm font-bold text-[#0d1f4e]">{displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ctx?.partner_name && (
              <div className="flex items-center gap-2 bg-[#f0f6ff] border border-[#dbeafe] text-[#1C4A8B] text-xs font-semibold px-3 py-1.5 rounded-lg">
                <Building2 className="w-3.5 h-3.5" />
                {ctx.partner_name}
              </div>
            )}
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
              <KeyRound className="w-3.5 h-3.5" />
              Instructor Access
            </div>
          </div>
        </div>
      </div>

      {/* Partner attribution */}
      {ctx?.partner_name && (
        <div className="bg-[#0d1f4e] text-white text-xs text-center py-2 px-4">
          <span className="opacity-60">Authorised Instructor under </span>
          <span className="font-semibold">{ctx.partner_name}</span>
          {ctx.partner_city && (
            <span className="opacity-60"> — {ctx.partner_city}{ctx.partner_country ? `, ${ctx.partner_country}` : ''}</span>
          )}
        </div>
      )}

      <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0d1f4e]">Welcome, {displayName}</h1>
          {ctx?.is_active && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
              <CheckCircle className="w-4 h-4" />
              Account Active
            </div>
          )}
        </div>

        {/* ── Instructor Status Card ── */}
        {cert ? (
          <div
            className="rounded-2xl p-6 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-amber-300" />
                  <span className="text-xs font-bold uppercase tracking-widest text-white/70">
                    BDA Official Credential
                  </span>
                </div>
                <h2 className="text-xl font-bold mb-1">{cert.level}</h2>
                <p className="text-white/60 text-sm font-mono">{cert.instructor_id}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center justify-end gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">Active</span>
                </div>
                <p className="text-xs text-white/50">Certified</p>
                <p className="text-sm font-semibold">{formatDate(cert.certified_at)}</p>
              </div>
            </div>

            <div className="relative mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
              <div>
                <p className="text-xs text-white/50">Valid Until</p>
                <p className={`text-sm font-bold ${expiryWarning ? 'text-amber-300' : 'text-white'}`}>
                  {formatDate(cert.expires_at)}
                </p>
              </div>
              {expiryWarning && expiryDays !== null && (
                <div className="flex items-center gap-1.5 bg-amber-400/20 border border-amber-300/30 text-amber-200 text-xs font-semibold px-3 py-1.5 rounded-lg">
                  <Clock className="w-3.5 h-3.5" />
                  Expires in {expiryDays} days
                </div>
              )}
              {!expiryWarning && (
                <div className="text-xs text-white/40">
                  {expiryDays} days remaining
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-dashed border-[#dbeafe] p-6 text-center">
            <Award className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">No active instructor certification</p>
            <p className="text-xs text-slate-300 mt-1">Contact BDA administration to grant your certification.</p>
          </div>
        )}

        {/* ── Trainer Learning Centre ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookMarked className="w-5 h-5 text-[#0f91e0]" />
            <h2 className="text-base font-bold text-[#0d1f4e]">Trainer Learning Centre</h2>
            <span className="text-xs text-slate-400 ml-1">— Exclusive instructor content</span>
          </div>

          {modules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#dbeafe] p-6 text-center">
              <BookMarked className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Trainer Learning Centre content is being prepared.</p>
              <p className="text-xs text-slate-300 mt-1">Check back soon — modules will appear here once published.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {modules.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => navigate(`/instructor/learning-centre/module/${mod.id}`)}
                  className="bg-white rounded-xl border border-[#dbeafe] p-4 text-left hover:border-[#0f91e0] hover:shadow-sm transition-all group flex items-center gap-4"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#f0f6ff] border border-[#dbeafe] flex items-center justify-center flex-shrink-0 text-[#1C4A8B] font-bold text-sm group-hover:bg-[#0f91e0] group-hover:text-white group-hover:border-[#0f91e0] transition-colors">
                    {mod.order_index}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0d1f4e] truncate">{mod.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{mod.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#0f91e0] flex-shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick Access ── */}
        <div>
          <h2 className="text-base font-bold text-[#0d1f4e] mb-3">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Instructor View */}
            <button
              onClick={() => navigate('/instructor/learning-system/question-bank')}
              className="bg-white rounded-2xl border-2 border-[#dbeafe] p-5 text-left hover:border-[#0f91e0] hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                <KeyRound className="w-5 h-5 text-amber-600" />
              </div>
              <p className="font-bold text-[#0d1f4e] text-sm">Instructor View</p>
              <p className="text-xs text-slate-400 mt-1">Answer keys visible</p>
              <div className="mt-3 text-[#0f91e0] text-xs font-semibold group-hover:underline">Open →</div>
            </button>

            {/* Presentation Mode */}
            <button
              onClick={() => navigate('/instructor/learning-system/question-bank?mode=presentation')}
              className="bg-white rounded-2xl border-2 border-[#dbeafe] p-5 text-left hover:border-[#0f91e0] hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                <Monitor className="w-5 h-5 text-[#0f91e0]" />
              </div>
              <p className="font-bold text-[#0d1f4e] text-sm">Presentation Mode</p>
              <p className="text-xs text-slate-400 mt-1">Safe to share screen</p>
              <div className="mt-3 text-[#0f91e0] text-xs font-semibold group-hover:underline">Open →</div>
            </button>

            {/* Mock Exams */}
            <button
              onClick={() => navigate('/instructor/mock-exams')}
              className="bg-white rounded-2xl border-2 border-[#dbeafe] p-5 text-left hover:border-[#0f91e0] hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="font-bold text-[#0d1f4e] text-sm">Mock Exams</p>
              <p className="text-xs text-slate-400 mt-1">Practice simulations</p>
              <div className="mt-3 text-[#0f91e0] text-xs font-semibold group-hover:underline">Open →</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
