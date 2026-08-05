/**
 * Trainer Dashboard
 * Landing page for trainers (role = 'trainer').
 * Shows quick access to Learning System (Instructor View) and Presentation Mode.
 */

import { useNavigate } from 'react-router-dom';
import { BookOpen, Monitor, GraduationCap, KeyRound } from 'lucide-react';
import { useAuthContext } from '@/app/providers/AuthProvider';

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const name = user?.profile
    ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
    : 'Trainer';

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
              <p className="text-sm font-bold text-[#0d1f4e]">{name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
            <KeyRound className="w-3.5 h-3.5" />
            Instructor Access
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <h1 className="text-2xl font-bold text-[#0d1f4e] mb-2">Welcome, {name}</h1>
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
