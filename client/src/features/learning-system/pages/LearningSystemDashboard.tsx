/**
 * BDA Learning System Dashboard — English Only
 * - EN only (AR removed from learning system)
 * - Hero section with progress ring + stats
 * - Tool cards: Training Kits, Question Bank, Flashcards
 * - Recommended Learning Path
 * - BDA Brand Colors only (#0d1f4e, #1C4A8B, #0f91e0)
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

// ─── Circular Progress Ring ──────────────────────────────────────────────────
function ProgressRing({ pct, size = 110 }: { pct: number; size?: number }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={9} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#ffffff"
        strokeWidth={9}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size / 4.5}
        fontWeight="bold"
        fill="#ffffff"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%' }}
      >
        {pct}%
      </text>
    </svg>
  );
}

// ─── Hero Stat Card ──────────────────────────────────────────────────────────
function HeroStat({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/20 min-w-[100px]">
      <div className="text-white/70">{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/60 text-center leading-tight">{label}</p>
    </div>
  );
}

// ─── Tool Card ───────────────────────────────────────────────────────────────
interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  stats: { label: string; value: string | number }[];
  cta: string;
  onClick: () => void;
  badge?: string;
  highlight?: boolean;
}

function ToolCard({ icon, title, description, stats, cta, onClick, badge, highlight }: ToolCardProps) {
  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col gap-5 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer ${
        highlight
          ? 'bg-gradient-to-br from-[#1C4A8B] to-[#0d1f4e] text-white border-transparent shadow-lg'
          : 'bg-white border-[#dbeafe] hover:border-[#bfdbfe]'
      }`}
      onClick={onClick}
    >
      {badge && (
        <span className="absolute -top-3 right-5 bg-[#0f91e0] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
          {badge}
        </span>
      )}

      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${highlight ? 'bg-white/15' : 'bg-[#f0f6ff]'}`}>
          <div className={highlight ? 'text-white' : 'text-[#1C4A8B]'}>{icon}</div>
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-bold leading-tight ${highlight ? 'text-white' : 'text-[#0d1f4e]'}`}>
            {title}
          </h3>
          <p className={`text-sm mt-1.5 leading-relaxed ${highlight ? 'text-white/70' : 'text-slate-500'}`}>
            {description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <div key={i} className={`text-center rounded-xl py-3 ${highlight ? 'bg-white/10' : 'bg-[#f8faff]'}`}>
            <p className={`text-xl font-bold ${highlight ? 'text-white' : 'text-[#1C4A8B]'}`}>{s.value}</p>
            <p className={`text-xs mt-0.5 ${highlight ? 'text-white/55' : 'text-slate-400'}`}>{s.label}</p>
          </div>
        ))}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`w-full flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-xl transition-colors ${
          highlight
            ? 'bg-white text-[#1C4A8B] hover:bg-[#f0f6ff]'
            : 'bg-[#1C4A8B] text-white hover:bg-[#0d1f4e]'
        }`}
      >
        {cta}
        <ChevronRight className="w-4 h-4" />
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

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoadingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f6ff]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-4 border-[#dbeafe] border-t-[#1C4A8B] animate-spin mx-auto mb-5" />
          <p className="text-slate-500 font-medium">Loading your learning system...</p>
        </div>
      </div>
    );
  }

  // ── No Access ─────────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f6ff] px-4">
        <div className="max-w-md w-full text-center bg-white p-10 rounded-3xl shadow-xl border border-[#dbeafe]">
          <div className="w-20 h-20 bg-gradient-to-br from-[#1C4A8B] to-[#0d1f4e] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#0d1f4e] mb-3">Access Required</h2>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed">
            You need to purchase the BDA Learning System to access Training Kits, Question Bank, and Flashcards.
          </p>
          <button
            onClick={() => window.open('https://bda-global.org/en/store/bda-learning-system/', '_blank')}
            className="w-full bg-gradient-to-r from-[#1C4A8B] to-[#0d1f4e] text-white font-semibold py-3.5 px-6 rounded-xl hover:opacity-90 transition-opacity shadow-md"
          >
            Purchase Now
          </button>
        </div>
      </div>
    );
  }

  // ── Main Dashboard ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f0f6ff]">

      {/* ══════════════════════════════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #0d1f4e 0%, #1C4A8B 55%, #0f91e0 100%)' }}
      >
        {/* Background decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative container mx-auto px-6 py-12 max-w-6xl">
          {/* Program label */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5">
              <Award className="w-4 h-4 text-white/80" />
              <span className="text-xs font-semibold text-white/90 tracking-wide uppercase">
                BDA Learning System
              </span>
            </div>
            <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs text-white/70">
              English
            </span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10">
            {/* Left: Title + CTA */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
                Welcome to Your Learning System
              </h1>
              <p className="text-white/70 text-base leading-relaxed max-w-xl mb-8">
                A complete curriculum covering all BDA competencies — Training Kits, Question Bank, and Flashcards.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(`${basePath}/training-kits`)}
                  className="flex items-center gap-2 bg-white text-[#1C4A8B] font-bold py-3 px-7 rounded-xl hover:bg-[#f0f6ff] transition-colors shadow-lg text-sm"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {pct > 0 ? 'Continue Learning' : 'Start Learning'}
                </button>
                <button
                  onClick={() => navigate(`${basePath}/competency-analytics`)}
                  className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 font-medium py-3 px-6 rounded-xl transition-colors text-sm"
                >
                  <BarChart2 className="w-4 h-4" />
                  My Analytics
                </button>
              </div>
            </div>

            {/* Right: Progress Ring + Stats */}
            <div className="flex flex-col items-center gap-6">
              {/* Progress Ring */}
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-inner">
                  <ProgressRing pct={pct} size={130} />
                </div>
                <p className="text-white/60 text-sm font-medium">Overall Progress</p>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap justify-center gap-3">
                <HeroStat
                  icon={<BookOpen className="w-5 h-5" />}
                  value={`${completedModules}/${totalModules}`}
                  label="Modules Done"
                />
                <HeroStat
                  icon={<HelpCircle className="w-5 h-5" />}
                  value={questionBankStats?.questionsAttempted || 0}
                  label="Questions Practiced"
                />
                <HeroStat
                  icon={<Layers className="w-5 h-5" />}
                  value={flashcardStats?.cardsMastered || 0}
                  label="Cards Mastered"
                />
                <HeroStat
                  icon={<Clock className="w-5 h-5" />}
                  value={`${Math.floor(((trainingProgress?.totalTimeSpent || 0) + (flashcardStats?.totalStudyTimeMinutes || 0)) / 60)}h`}
                  label="Study Time"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BODY
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="container mx-auto px-6 py-8 max-w-6xl space-y-6">

        {/* Exam Goal Widget */}
        {hasAccess && (
          <ExamGoalWidget
            certType={displayAccess?.certification_type ?? 'CP'}
            totalModules={totalModules}
            completedModules={completedModules}
          />
        )}

        {/* Access Expiry Banner */}
        {expiryDate && (
          <div
            className={`flex items-center justify-between p-4 rounded-2xl border ${
              isExpiringSoon
                ? 'bg-amber-50 border-amber-200'
                : 'bg-white border-[#dbeafe]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isExpiringSoon ? 'bg-amber-100' : 'bg-[#f0f6ff]'}`}>
                <Calendar className={`w-5 h-5 ${isExpiringSoon ? 'text-amber-500' : 'text-[#1C4A8B]'}`} />
              </div>
              <div>
                <p className="font-semibold text-[#0d1f4e] text-sm">
                  Access valid until {format(expiryDate, 'MMMM d, yyyy')}
                </p>
                <p className={`text-xs mt-0.5 ${isExpiringSoon ? 'text-amber-600' : 'text-slate-400'}`}>
                  {daysUntilExpiry} days remaining
                  {isExpiringSoon && ' — Consider renewing soon'}
                </p>
              </div>
            </div>
            {isExpiringSoon && (
              <button
                onClick={() => window.open('https://bda-global.org/en/store/bda-learning-system/', '_blank')}
                className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-4 py-2 rounded-xl transition-colors"
              >
                Renew Access
              </button>
            )}
          </div>
        )}

        {/* Today's Focus */}
        <div className="bg-white rounded-2xl border border-[#dbeafe] p-6 flex flex-col md:flex-row items-start md:items-center gap-5 shadow-sm">
          <div className="p-3 bg-[#f0f6ff] rounded-xl flex-shrink-0">
            <Target className="w-6 h-6 text-[#1C4A8B]" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-[#0d1f4e] text-base mb-1">Today's Focus</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              {pct === 0
                ? 'Start with Module 0: Program Introduction — get familiar with the BDA Learning Journey and the 14 Competencies.'
                : `You're ${pct}% through the curriculum. Keep going — consistency is the key to certification readiness.`}
            </p>
          </div>
          <button
            onClick={() => navigate(`${basePath}/training-kits`)}
            className="flex items-center gap-2 bg-[#1C4A8B] text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-[#0d1f4e] transition-colors whitespace-nowrap shadow-sm"
          >
            <Zap className="w-4 h-4" />
            Go to Curriculum
          </button>
        </div>

        {/* Tool Cards — 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ToolCard
            highlight
            icon={<BookOpen className="w-6 h-6" />}
            title="Training Kits"
            description="Complete curriculum organized by the 14 BDA competencies. Build your knowledge foundation."
            stats={[
              { label: 'Modules', value: totalModules },
              { label: 'Lessons', value: totalLessons },
              { label: 'Completed', value: `${pct}%` },
            ]}
            cta={pct > 0 ? 'Continue Learning' : 'Start Learning'}
            onClick={() => navigate(`${basePath}/training-kits`)}
          />

          <ToolCard
            badge="NEW"
            icon={<HelpCircle className="w-6 h-6" />}
            title="Question Bank"
            description="Practice with multiple-choice questions. Get instant feedback across all competencies."
            stats={[
              { label: 'Total Questions', value: questionBankStats?.totalQuestions || 0 },
              { label: 'Attempted', value: questionBankStats?.questionsAttempted || 0 },
              { label: 'Avg Score', value: `${Math.round(questionBankStats?.averageScore || 0)}%` },
            ]}
            cta="Practice Now"
            onClick={() => navigate(`${basePath}/question-bank`)}
          />

          <ToolCard
            icon={<Layers className="w-6 h-6" />}
            title="Flashcards"
            description="Spaced repetition cards for rapid recall. Master key concepts efficiently."
            stats={[
              { label: 'Total Cards', value: flashcardStats?.totalCards || 0 },
              { label: 'Due Today', value: flashcardStats?.cardsDueToday || 0 },
              { label: 'Mastered', value: flashcardStats?.cardsMastered || 0 },
            ]}
            cta="Study Flashcards"
            onClick={() => navigate(`${basePath}/flashcards`)}
          />
        </div>

        {/* Recommended Learning Path */}
        <div className="bg-white rounded-2xl border border-[#dbeafe] p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#0d1f4e] mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#0f91e0]" />
            Recommended Learning Path
          </h2>
          <div className="flex flex-col md:flex-row items-stretch gap-0">
            {[
              {
                step: 1,
                title: 'Training Kits',
                sub: 'Read the content first',
                icon: <BookOpen className="w-5 h-5" />,
                action: () => navigate(`${basePath}/training-kits`),
              },
              {
                step: 2,
                title: 'Flashcards',
                sub: 'Memorize key concepts',
                icon: <Layers className="w-5 h-5" />,
                action: () => navigate(`${basePath}/flashcards`),
              },
              {
                step: 3,
                title: 'Question Bank',
                sub: 'Test your knowledge',
                icon: <HelpCircle className="w-5 h-5" />,
                action: () => navigate(`${basePath}/question-bank`),
              },
            ].map((item, idx, arr) => (
              <div key={item.step} className="flex flex-col md:flex-row items-center flex-1">
                <button
                  onClick={item.action}
                  className="flex-1 w-full flex items-center gap-4 p-4 rounded-xl hover:bg-[#f0f6ff] transition-colors group text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1C4A8B] to-[#0d1f4e] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 group-hover:opacity-90 transition-opacity shadow-sm">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-semibold text-[#0d1f4e]">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                  </div>
                </button>
                {idx < arr.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-slate-300 hidden md:block flex-shrink-0 mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Program Overview Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <BookOpen className="w-5 h-5" />, value: '16', label: 'Learning Modules' },
            { icon: <Layers className="w-5 h-5" />, value: '52', label: 'Lessons' },
            { icon: <Users className="w-5 h-5" />, value: '14', label: 'BDA Competencies' },
            { icon: <Award className="w-5 h-5" />, value: 'BoCK', label: 'Body of Knowledge' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#dbeafe] p-5 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-2.5 bg-[#f0f6ff] rounded-xl text-[#1C4A8B]">{item.icon}</div>
              <p className="text-2xl font-bold text-[#0d1f4e]">{item.value}</p>
              <p className="text-xs text-slate-400 text-center">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Analytics CTA */}
        <div className="flex justify-center pb-6">
          <button
            onClick={() => navigate(`${basePath}/competency-analytics`)}
            className="inline-flex items-center gap-2 bg-white border border-[#dbeafe] text-[#1C4A8B] px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-[#f0f6ff] transition-colors shadow-sm"
          >
            <TrendingUp className="w-4 h-4" />
            View My Competency Analytics
          </button>
        </div>
      </div>
    </div>
  );
}
