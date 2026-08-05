/**
 * Trainer Dashboard
 * Landing page for trainers (role = 'trainer').
 * - Shows partner organisation name (from ecp_trainers → partners)
 * - Shows account status (active / suspended)
 * - ECP partner and admin can suspend / reactivate the trainer account
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Monitor, GraduationCap, KeyRound, Building2, AlertTriangle, CheckCircle } from 'lucide-react';
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

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [ctx, setCtx] = useState<TrainerContext | null>(null);
  const [loading, setLoading] = useState(true);

  const displayName = user?.profile
    ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
    : 'Trainer';

  useEffect(() => {
    async function loadContext() {
      if (!user?.id) return;
      const { data, error } = await supabase.rpc('get_trainer_context', { p_user_id: user.id });
      if (!error && data && !data.error) {
        setCtx(data as TrainerContext);
      }
      setLoading(false);
    }
    loadContext();
  }, [user?.id]);

  // If account is suspended, show a locked screen
  if (!loading && ctx && !ctx.is_active) {
    return (
      <div className="min-h-screen bg-[#f0f6ff] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <AlertTriangle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#0d1f4e] mb-2">Account Suspended</h2>
          <p className="text-slate-500 text-sm mb-4">
            Your trainer account has been suspended by <strong>{ctx.partner_name}</strong>.
            Please contact your partner organisation for more information.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Partner Organisation</p>
            <p className="text-sm font-semibold text-[#0d1f4e]">{ctx.partner_name}</p>
            {ctx.partner_city && (
              <p className="text-xs text-slate-400 mt-0.5">{ctx.partner_city}{ctx.partner_country ? `, ${ctx.partner_country}` : ''}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f6ff]">
      {/* Header */}
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
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Trainer Portal</p>
              <p className="text-sm font-bold text-[#0d1f4e]">{displayName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Partner badge */}
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

      {/* Partner attribution banner */}
      {ctx?.partner_name && (
        <div className="bg-[#0d1f4e] text-white text-xs text-center py-2 px-4">
          <span className="opacity-60">Authorised Trainer under </span>
          <span className="font-semibold">{ctx.partner_name}</span>
          {ctx.partner_city && (
            <span className="opacity-60"> — {ctx.partner_city}{ctx.partner_country ? `, ${ctx.partner_country}` : ''}</span>
          )}
        </div>
      )}

      {/* Main */}
      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-[#0d1f4e]">Welcome, {displayName}</h1>
          {ctx?.is_active && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
              <CheckCircle className="w-4 h-4" />
              Account Active
            </div>
          )}
        </div>
        <p className="text-slate-500 text-sm mb-8">
          Access the learning materials and prepare for your training sessions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Instructor View Card */}
          <button
            onClick={() => navigate('/trainer/learning-system/question-bank')}
            className="bg-white rounded-2xl border-2 border-[#dbeafe] p-6 text-left hover:border-[#0f91e0] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-[#0d1f4e] text-sm">Instructor View</p>
                <p className="text-xs text-slate-400">Answer keys visible</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm">
              Browse all question sets with correct answers and rationale visible.
              Use this in your private tab while preparing.
            </p>
            <div className="mt-4 text-[#0f91e0] text-xs font-semibold group-hover:underline">
              Open Question Bank →
            </div>
          </button>

          {/* Presentation Mode Card */}
          <button
            onClick={() => navigate('/trainer/learning-system/question-bank?mode=presentation')}
            className="bg-white rounded-2xl border-2 border-[#dbeafe] p-6 text-left hover:border-[#0f91e0] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                <Monitor className="w-5 h-5 text-[#0f91e0]" />
              </div>
              <div>
                <p className="font-bold text-[#0d1f4e] text-sm">Presentation Mode</p>
                <p className="text-xs text-slate-400">Safe to share screen</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm">
              Answer keys are hidden. Share your screen with trainees safely —
              they see exactly what an individual trainee sees.
            </p>
            <div className="mt-4 text-[#0f91e0] text-xs font-semibold group-hover:underline">
              Open in Presentation Mode →
            </div>
          </button>

          {/* Learning System Card */}
          <button
            onClick={() => navigate('/trainer/learning-system')}
            className="bg-white rounded-2xl border-2 border-[#dbeafe] p-6 text-left hover:border-[#0f91e0] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-bold text-[#0d1f4e] text-sm">Learning System</p>
                <p className="text-xs text-slate-400">Full curriculum access</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm">
              Access training kits, flashcards, and mock exams to prepare
              your training sessions thoroughly.
            </p>
            <div className="mt-4 text-[#0f91e0] text-xs font-semibold group-hover:underline">
              Open Learning System →
            </div>
          </button>

          {/* Mock Exams Card */}
          <button
            onClick={() => navigate('/trainer/mock-exams')}
            className="bg-white rounded-2xl border-2 border-[#dbeafe] p-6 text-left hover:border-[#0f91e0] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-[#0d1f4e] text-sm">Mock Exams</p>
                <p className="text-xs text-slate-400">Practice exam simulations</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm">
              Run full mock exam simulations to help trainees practise
              under realistic exam conditions.
            </p>
            <div className="mt-4 text-[#0f91e0] text-xs font-semibold group-hover:underline">
              Open Mock Exams →
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
