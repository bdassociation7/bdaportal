/**
 * Trainer Dashboard
 * Route: /instructor/dashboard
 *
 * Matches ECP Portal design:
 * - Hero banner with gradient (sky → navy)
 * - White cards below for quick access tools
 * - Trainer Learning Centre modules list
 */

import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/app/providers/AuthProvider';
import {
  KeyRound,
  Monitor,
  Layers,
  ClipboardCheck,
  BookOpen,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const firstName = user?.profile?.first_name || 'Instructor';

  const tools = [
    {
      id: 'instructor-view',
      icon: KeyRound,
      title: 'Instructor View',
      description: 'Browse questions with answer keys and rationale visible. Use in your private tab while preparing for sessions.',
      action: 'Open Question Bank',
      path: '/instructor/learning-system/question-bank',
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
    },
    {
      id: 'presentation-mode',
      icon: Monitor,
      title: 'Presentation Mode',
      description: 'Answer keys are hidden. Share your screen with trainees safely — they see exactly what an individual trainee sees.',
      action: 'Open in Presentation Mode',
      path: '/instructor/learning-system/question-bank?mode=presentation',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      id: 'flashcards',
      icon: Layers,
      title: 'Flashcards',
      description: 'Access all 14 competency flashcard decks to support your training sessions and help trainees review key concepts.',
      action: 'Open Flashcards',
      path: '/instructor/learning-system/flashcards',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'mock-exams',
      icon: ClipboardCheck,
      title: 'Mock Exams',
      description: 'Run full mock exam simulations to help trainees practise under realistic exam conditions before the official assessment.',
      action: 'Open Mock Exams',
      path: '/instructor/mock-exams',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
    },
  ];

  const modules = [
    { id: '1', title: 'BDA Orientation' },
    { id: '2', title: 'Understanding BDA BoCK' },
    { id: '3', title: 'Teaching the BDA Methodology' },
    { id: '4', title: 'Trainer Delivery Standards' },
    { id: '5', title: 'Trainer Assessment' },
  ];

  return (
    <div>
      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div
        className="px-6 py-8"
        style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #1a4fa0 50%, #0d1f4e 100%)' }}
      >
        <h1 className="text-2xl font-bold text-white mb-1">Instructor Dashboard</h1>
        <p className="text-white/80 text-sm mb-6">
          Welcome back, {firstName}. Access your training resources and prepare for your sessions.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/instructor/learning-system/question-bank')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors border border-white/20"
          >
            <KeyRound className="h-4 w-4" />
            Instructor View
          </button>
          <button
            onClick={() => navigate('/instructor/learning-system')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors border border-white/20"
          >
            <BookOpen className="h-4 w-4" />
            Learning System
          </button>
          <button
            onClick={() => navigate('/instructor/mock-exams')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors border border-white/20"
          >
            <ClipboardCheck className="h-4 w-4" />
            Mock Exams
          </button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="p-6 space-y-8">

        {/* Instructor Tools */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Instructor Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tools.map(tool => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate(tool.path)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg ${tool.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-5 w-5 ${tool.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1">{tool.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed mb-3">{tool.description}</p>
                      <span className="text-sm font-medium text-sky-600 group-hover:text-sky-700 flex items-center gap-1">
                        {tool.action}
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Trainer Learning Centre */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Trainer Learning Centre
            </h2>
            <span className="text-xs text-gray-400">5 Modules</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {modules.map(mod => (
              <button
                key={mod.id}
                onClick={() => navigate(`/instructor/learning-centre/module/${mod.id}`)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-sky-50 transition-colors group text-left"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}
                >
                  {mod.id.padStart(2, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 group-hover:text-sky-700 truncate">
                    {mod.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Content coming soon</p>
                </div>
                <GraduationCap className="h-4 w-4 text-gray-300 group-hover:text-sky-400 shrink-0" />
              </button>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
