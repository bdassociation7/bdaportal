/**
 * Trainer Dashboard — Simple
 * Route: /instructor/dashboard
 *
 * A trainer account has access to the full BDA Learning System
 * with Instructor View (answer keys visible).
 * Trainers are added by ECP Partners or by Admin — no public registration.
 */

import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Monitor,
  GraduationCap,
  KeyRound,
  Layers,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { AuthService } from '@/entities/auth/auth.service';

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const displayName = user?.profile
    ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
    : 'Instructor';

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    try { await AuthService.signOut(); } catch {}
    navigate('/login');
  };

  const tools = [
    {
      icon: KeyRound,
      title: 'Instructor View',
      desc: 'Browse questions with answer keys and rationale visible. Use in your private tab while preparing.',
      path: '/instructor/learning-system/question-bank',
      cta: 'Open Question Bank →',
    },
    {
      icon: Monitor,
      title: 'Presentation Mode',
      desc: 'Answer keys are hidden. Share your screen with trainees safely — they see exactly what an individual trainee sees.',
      path: '/instructor/learning-system/question-bank?mode=presentation',
      cta: 'Open in Presentation Mode →',
    },
    {
      icon: Layers,
      title: 'Flashcards',
      desc: 'Access all 14 competency flashcard decks to support your training sessions.',
      path: '/instructor/learning-system/flashcards',
      cta: 'Open Flashcards →',
    },
    {
      icon: ShieldCheck,
      title: 'Mock Exams',
      desc: 'Run full mock exam simulations to help trainees practise under realistic exam conditions.',
      path: '/instructor/mock-exams',
      cta: 'Open Mock Exams →',
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}>
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center text-white text-xs font-extrabold">
            BDA
          </div>
          <div>
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Business Development Association</p>
            <p className="text-white text-sm font-bold">Instructor Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-white text-sm font-semibold">{displayName}</p>
            <p className="text-white/50 text-xs">BDA Instructor</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold flex items-center justify-center">
            {initials}
          </div>
          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-white/80 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="px-8 pt-8 pb-12 text-center">
        <h1 className="text-3xl font-extrabold text-white mb-2">Welcome back, {displayName.split(' ')[0]}</h1>
        <p className="text-white/60 text-sm">Access your training resources and prepare for your sessions.</p>
      </div>

      {/* ── Cards ── */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        {/* Instructor Tools */}
        <h2 className="text-white/70 text-xs font-bold uppercase tracking-widest mb-4">Instructor Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {tools.map(({ icon: Icon, title, desc, path, cta }) => (
            <button
              key={title}
              onClick={() => navigate(path)}
              className="group bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/35 rounded-2xl p-6 text-left transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="font-bold text-white text-base mb-1">{title}</p>
              <p className="text-white/55 text-sm leading-relaxed mb-4">{desc}</p>
              <p className="text-[#0f91e0] text-sm font-semibold group-hover:text-white transition-colors">{cta}</p>
            </button>
          ))}
        </div>

        {/* Full Learning System CTA */}
        <button
          onClick={() => navigate('/instructor/learning-system')}
          className="w-full bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/35 rounded-2xl p-6 text-left transition-all duration-200 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-base">BDA Learning System</p>
              <p className="text-white/55 text-sm">Access the full curriculum — training kits, question banks, flashcards and competency resources.</p>
            </div>
          </div>
          <p className="text-[#0f91e0] text-sm font-semibold whitespace-nowrap hidden md:block">Open Learning System →</p>
        </button>
      </div>
    </div>
  );
}
