/**
 * BDA Learning System Dashboard — Compact version for App Shell
 * No hero section (Shell provides persistent navigation)
 * Focus: progress overview + quick actions + tool cards
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { useUserAccesses, useOverallProgress } from '@/entities/curriculum';
import { useQuestionBankStats } from '@/entities/question-bank';
import { useFlashcardStats } from '@/entities/flashcards';
import {
  BookOpen,
  HelpCircle,
  Layers,
  Calendar,
  TrendingUp,
  Clock,
  ChevronRight,
  Play,
  Target,
  Zap,
  BarChart2,
  CheckCircle2,
  Award,
  Users,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { ExamGoalWidget } from '@/features/learning-goals';

// ─── BDA Brand Palette ──────────────────────────────────────────────────────
const BDA = {
  navy: '#0d1f4e',
  blue: '#1C4A8B',
  accent: '#0f91e0',
  light: '#f0f6ff',
  lightBorder: '#dbeafe',
  muted: '#64748b',
};

// ─── Stat Pill ───────────────────────────────────────────────────────────────
function StatPill({ icon, value, label, color = BDA.blue }: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-[#dbeafe] px-4 py-3 shadow-sm">
      <div className="p-2 rounded-lg" style={{ background: BDA.light }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div>
        <p className="text-xl font-bold" style={{ color: BDA.navy }}>{value}</p>
        <p className="text-xs text-slate-400 leading-tight">{label}</p>
      </div>
    </div>
  );
}

// ─── Tool Card (compact) ─────────────────────────────────────────────────────
interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  stats: { label: string; value: string | number }[];
  cta: string;
  onClick: () => void;
  badge?: string;
  primary?: boolean;
}

function ToolCard({ icon, title, description, stats, cta, onClick, badge, primary }: ToolCardProps) {
  return (
    <div
      className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
        primary
          ? 'bg-[#0f91e0] text-white border-transparent shadow-md'
          : 'bg-white border-[#dbeafe] hover:border-[#bfdbfe]'
      }`}
      onClick={onClick}
    >
      {badge && (
        <span className="absolute -top-2.5 right-4 bg-[#0f91e0] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow">
          {badge}
        </span>
      )}

      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${primary ? 'bg-white/15' : 'bg-[#f0f6ff]'}`}>
          <div className={primary ? 'text-white' : 'text-[#1C4A8B]'}>{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-base font-bold leading-tight ${primary ? 'text-white' : 'text-[#0d1f4e]'}`}>
            {title}
          </h3>
          <p className={`text-xs mt-0.5 leading-relaxed line-clamp-2 ${primary ? 'text-white/70' : 'text-slate-500'}`}>
            {description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((s, i) => (
          <div key={i} className={`text-center rounded-lg py-2 ${primary ? 'bg-white/10' : 'bg-[#f8faff]'}`}>
            <p className={`text-lg font-bold ${primary ? 'text-white' : 'text-[#1C4A8B]'}`}>{s.value}</p>
            <p className={`text-[10px] mt-0.5 ${primary ? 'text-white/55' : 'text-slate-400'}`}>{s.label}</p>
          </div>
        ))}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`w-full flex items-center justify-center gap-2 font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm ${
          primary
            ? 'bg-white text-[#0f91e0] hover:bg-[#f0f6ff]'
            : 'bg-[#0f91e0] text-white hover:bg-[#1C4A8B]'
        }`}
      >
        {cta}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function LearningSystemDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const basePath = location.pathname.startsWith('/ecp/')
    ? '/ecp/learning-system'
    : location.pathname.startsWith('/instructor/')
    ? '/instructor/learning-system'
    : '/learning-system';

  const { data: accessSummary, isLoading: isLoadingAccess } = useUserAccesses(user?.id);
  const { data: trainingProgress } = useOverallProgress(user?.id, 'CP', 'en');
  const { data: questionBankStats } = useQuestionBankStats(user?.id, 'CP', 'en');
  const { data: flashcardStats } = useFlashcardStats(user?.id, 'CP', 'en');

  const hasAccess = accessSummary?.has_en;
  const displayAccess = accessSummary?.accesses?.find((a) => a.language === 'EN')
    || accessSummary?.accesses?.[0];
  const expiryDate = displayAccess?.expires_at ? new Date(displayAccess.expires_at) : null;
  const daysUntilExpiry = expiryDate
    ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;
  const isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 30;

  const pct = trainingProgress?.percentage || 0;
  const completedModules = trainingProgress?.completed || 0;
  const totalModules = trainingProgress?.total || 16;
  const totalLessons = trainingProgress?.totalLessons || 52;
  const studyHours = Math.floor(((trainingProgress?.totalTimeSpent || 0) + (flashcardStats?.totalStudyTimeMinutes || 0)) / 60);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoadingAccess) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-[#f8f9fb]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#dbeafe] border-t-[#1C4A8B] animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-medium">Loading your learning system...</p>
        </div>
      </div>
    );
  }

  // ── No Access ─────────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-[#f8f9fb] px-4">
        <div className="max-w-md w-full text-center bg-white p-10 rounded-3xl shadow-xl border border-[#dbeafe]">
          <div className="w-16 h-16 bg-[#0f91e0] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-[#0d1f4e] mb-2">Access Required</h2>
          <p className="text-slate-500 mb-7 text-sm leading-relaxed">
            You need to purchase the BDA Learning System to access Training Kits, Question Bank, and Flashcards.
          </p>
          <button
            onClick={() => window.open('https://bda-global.org/en/store/bda-learning-system/', '_blank')}
            className="w-full bg-[#0f91e0] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#1C4A8B] transition-colors shadow-md text-sm"
          >
            Purchase Now
          </button>
        </div>
      </div>
    );
  }

  // ── Main Dashboard ────────────────────────────────────────────────────────
  return (
    <div className="bg-[#f8f9fb] min-h-[calc(100vh-56px)]">
      <div className="max-w-5xl mx-auto px-6 py-7 space-y-5">

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#0d1f4e]">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {pct === 0
                ? 'Start your learning journey today'
                : `You're ${pct}% through the curriculum`}
            </p>
          </div>
          <button
            onClick={() => navigate(`${basePath}/training-kits`)}
            className="flex items-center gap-2 bg-[#0f91e0] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1C4A8B] transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {pct > 0 ? 'Continue Learning' : 'Start Learning'}
          </button>
        </div>

        {/* ── Progress Bar ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#dbeafe] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[#0d1f4e]">Overall Progress</span>
            <span className="text-2xl font-bold text-[#1C4A8B]">{pct}%</span>
          </div>
          <div className="h-3 bg-[#f0f6ff] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: '#0f91e0',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
            <span>{completedModules} of {totalModules} modules completed</span>
            <span>{totalLessons} total lessons</span>
          </div>
        </div>

        {/* ── Stats Row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatPill
            icon={<BookOpen className="w-4 h-4" />}
            value={`${completedModules}/${totalModules}`}
            label="Modules Done"
          />
          <StatPill
            icon={<HelpCircle className="w-4 h-4" />}
            value={questionBankStats?.questionsAttempted || 0}
            label="Questions Practiced"
          />
          <StatPill
            icon={<Layers className="w-4 h-4" />}
            value={flashcardStats?.cardsMastered || 0}
            label="Cards Mastered"
          />
          <StatPill
            icon={<Clock className="w-4 h-4" />}
            value={`${studyHours}h`}
            label="Study Time"
          />
        </div>

        {/* ── Exam Goal Widget ─────────────────────────────────────────── */}
        {hasAccess && (
          <ExamGoalWidget
            certType={'CP'}
            totalModules={totalModules}
            completedModules={completedModules}
            accessExpiresAt={displayAccess?.expires_at ?? null}
          />
        )}

        {/* ── Access Expiry Banner ─────────────────────────────────────── */}
        {expiryDate && (
          <div
            className={`flex items-center justify-between p-4 rounded-xl border ${
              isExpiringSoon
                ? 'bg-amber-50 border-amber-200'
                : 'bg-white border-[#dbeafe]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className={`w-4 h-4 ${isExpiringSoon ? 'text-amber-500' : 'text-[#1C4A8B]'}`} />
              <div>
                <p className="font-semibold text-[#0d1f4e] text-sm">
                  Access valid until {format(expiryDate, 'MMMM d, yyyy')}
                </p>
                <p className={`text-xs mt-0.5 ${isExpiringSoon ? 'text-amber-600' : 'text-slate-400'}`}>
                  {daysUntilExpiry} days remaining{isExpiringSoon && ' — Consider renewing soon'}
                </p>
              </div>
            </div>
            {isExpiringSoon && (
              <button
                onClick={() => window.open('https://bda-global.org/en/store/bda-learning-system/', '_blank')}
                className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                Renew
              </button>
            )}
          </div>
        )}

        {/* ── Today's Focus ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#dbeafe] p-5 flex items-center gap-4 shadow-sm">
          <div className="p-2.5 bg-[#f0f6ff] rounded-xl flex-shrink-0">
            <Target className="w-5 h-5 text-[#1C4A8B]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[#0d1f4e] text-sm mb-0.5">Today's Focus</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              {pct === 0
                ? 'Start with Module 0: Program Introduction — get familiar with the BDA Learning Journey and the 14 Competencies.'
                : `You're ${pct}% through the curriculum. Keep going — consistency is the key to certification readiness.`}
            </p>
          </div>
          <button
            onClick={() => navigate(`${basePath}/training-kits`)}
            className="flex items-center gap-1.5 bg-[#0f91e0] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#1C4A8B] transition-colors whitespace-nowrap shadow-sm flex-shrink-0"
          >
            <Zap className="w-3.5 h-3.5" />
            Go
          </button>
        </div>

        {/* ── Tool Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ToolCard
            primary
            icon={<BookOpen className="w-5 h-5" />}
            title="Training Kits"
            description="Complete curriculum organized by the 14 BDA competencies."
            stats={[
              { label: 'Modules', value: totalModules },
              { label: 'Lessons', value: totalLessons },
              { label: 'Done', value: `${pct}%` },
            ]}
            cta={pct > 0 ? 'Continue' : 'Start'}
            onClick={() => navigate(`${basePath}/training-kits`)}
          />

          <ToolCard
            badge="NEW"
            icon={<HelpCircle className="w-5 h-5" />}
            title="Question Bank"
            description="Practice with multiple-choice questions across all competencies."
            stats={[
              { label: 'Questions', value: questionBankStats?.totalQuestions || 0 },
              { label: 'Attempted', value: questionBankStats?.questionsAttempted || 0 },
              { label: 'Avg Score', value: `${Math.round(questionBankStats?.averageScore || 0)}%` },
            ]}
            cta="Practice Now"
            onClick={() => navigate(`${basePath}/question-bank`)}
          />

          <ToolCard
            icon={<Layers className="w-5 h-5" />}
            title="Flashcards"
            description="Spaced repetition cards for rapid recall of key concepts."
            stats={[
              { label: 'Total Cards', value: flashcardStats?.totalCards || 0 },
              { label: 'Due Today', value: flashcardStats?.cardsDueToday || 0 },
              { label: 'Mastered', value: flashcardStats?.cardsMastered || 0 },
            ]}
            cta="Study Now"
            onClick={() => navigate(`${basePath}/flashcards`)}
          />
        </div>

        {/* ── Learning Path ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#dbeafe] p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#0d1f4e] mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0f91e0]" />
            Recommended Learning Path
          </h2>
          <div className="flex flex-col md:flex-row items-stretch gap-0">
            {[
              { step: 1, title: 'Training Kits', sub: 'Read the content first', icon: <BookOpen className="w-4 h-4" />, action: () => navigate(`${basePath}/training-kits`) },
              { step: 2, title: 'Flashcards', sub: 'Memorize key concepts', icon: <Layers className="w-4 h-4" />, action: () => navigate(`${basePath}/flashcards`) },
              { step: 3, title: 'Question Bank', sub: 'Test your knowledge', icon: <HelpCircle className="w-4 h-4" />, action: () => navigate(`${basePath}/question-bank`) },
            ].map((item, idx, arr) => (
              <div key={item.step} className="flex flex-col md:flex-row items-center flex-1">
                <button
                  onClick={item.action}
                  className="flex-1 w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#f0f6ff] transition-colors group text-left"
                >
                  <div                   className="w-9 h-9 rounded-full bg-[#0f91e0] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-semibold text-[#0d1f4e] text-sm">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                  </div>
                </button>
                {idx < arr.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-300 hidden md:block flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Program Overview + Analytics ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4 pb-4">
          <div className="flex-1 grid grid-cols-2 gap-3">
            {[
              { icon: <BookOpen className="w-4 h-4" />, value: '16', label: 'Learning Modules' },
              { icon: <Layers className="w-4 h-4" />, value: '52', label: 'Lessons' },
              { icon: <Users className="w-4 h-4" />, value: '14', label: 'BDA Competencies' },
              { icon: <Award className="w-4 h-4" />, value: 'BoCK', label: 'Body of Knowledge' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#dbeafe] p-3 flex items-center gap-3 shadow-sm">
                <div className="p-2 bg-[#f0f6ff] rounded-lg text-[#1C4A8B] flex-shrink-0">{item.icon}</div>
                <div>
                  <p className="text-base font-bold text-[#0d1f4e]">{item.value}</p>
                  <p className="text-xs text-slate-400">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate(`${basePath}/competency-analytics`)}
            className="sm:w-44 flex flex-col items-center justify-center gap-2 bg-white border border-[#dbeafe] text-[#1C4A8B] p-5 rounded-2xl text-sm font-semibold hover:bg-[#f0f6ff] transition-colors shadow-sm"
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-center leading-tight">View My Competency Analytics</span>
          </button>
        </div>

      </div>
    </div>
  );
}
