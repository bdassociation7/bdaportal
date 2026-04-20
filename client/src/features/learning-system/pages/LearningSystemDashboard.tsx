/**
 * BDA Learning System Dashboard — SHRM-Inspired Design
 * - EN/AR fully separated (no switching within the page)
 * - No language switcher buttons
 * - Hero section with progress ring + stats
 * - Tool cards: Training Kits, Question Bank, Flashcards
 * - Recommended Learning Path
 * - BDA Brand Colors only (#0d1f4e, #1C4A8B, #0f91e0)
 */

import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { useUserAccesses, useOverallProgress, type Language } from '@/entities/curriculum';
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
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const basePath = location.pathname.startsWith('/ecp/')
    ? '/ecp/learning-system'
    : '/learning-system';

  // Determine language from URL param — default to EN
  const langParam = searchParams.get('lang') as Language | null;
  const effectiveLanguage: Language = langParam === 'AR' ? 'AR' : 'EN';
  const isAR = effectiveLanguage === 'AR';

  const { data: accessSummary, isLoading: isLoadingAccess } = useUserAccesses(user?.id);

  const statsLanguage = effectiveLanguage.toLowerCase() as 'en' | 'ar';

  const { data: trainingProgress } = useOverallProgress(user?.id, 'CP', statsLanguage);
  const { data: questionBankStats } = useQuestionBankStats(user?.id, 'CP', statsLanguage);
  const { data: flashcardStats } = useFlashcardStats(user?.id, 'CP', statsLanguage);

  const hasAccess = isAR ? accessSummary?.has_ar : accessSummary?.has_en;

  const displayAccess = accessSummary?.accesses?.find((a) => a.language === effectiveLanguage)
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
          <p className="text-slate-500 font-medium">
            {isAR ? 'جاري تحميل نظام التعلم...' : 'Loading your learning system...'}
          </p>
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
          <h2 className="text-2xl font-bold text-[#0d1f4e] mb-3">
            {isAR ? 'الوصول مطلوب' : 'Access Required'}
          </h2>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed">
            {isAR
              ? 'تحتاج إلى شراء نظام التعلم BDA للوصول إلى مجموعات التدريب وبنك الأسئلة والبطاقات التعليمية.'
              : 'You need to purchase the BDA Learning System to access Training Kits, Question Bank, and Flashcards.'}
          </p>
          <button
            onClick={() => window.open('https://bda-global.org/en/store/bda-learning-system/', '_blank')}
            className="w-full bg-gradient-to-r from-[#1C4A8B] to-[#0d1f4e] text-white font-semibold py-3.5 px-6 rounded-xl hover:opacity-90 transition-opacity shadow-md"
          >
            {isAR ? 'اشترِ الآن' : 'Purchase Now'}
          </button>
        </div>
      </div>
    );
  }

  // ── Main Dashboard ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f0f6ff]" dir={isAR ? 'rtl' : 'ltr'}>

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
                {isAR ? 'نظام التعلم BDA' : 'BDA Learning System'}
              </span>
            </div>
            {effectiveLanguage === 'EN' && (
              <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs text-white/70">
                English
              </span>
            )}
            {effectiveLanguage === 'AR' && (
              <span className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs text-white/70">
                العربية
              </span>
            )}
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10">
            {/* Left: Title + CTA */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
                {isAR ? 'مرحباً بك في نظام التعلم' : 'Welcome to Your Learning System'}
              </h1>
              <p className="text-white/70 text-base leading-relaxed max-w-xl mb-8">
                {isAR
                  ? 'منهج متكامل يغطي جميع كفاءات BDA — مجموعات التدريب وبنك الأسئلة والبطاقات التعليمية.'
                  : 'A complete curriculum covering all BDA competencies — Training Kits, Question Bank, and Flashcards.'}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(`${basePath}/training-kits?lang=${effectiveLanguage}`)}
                  className="flex items-center gap-2 bg-white text-[#1C4A8B] font-bold py-3 px-7 rounded-xl hover:bg-[#f0f6ff] transition-colors shadow-lg text-sm"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {pct > 0
                    ? (isAR ? 'متابعة التعلم' : 'Continue Learning')
                    : (isAR ? 'ابدأ التعلم' : 'Start Learning')}
                </button>
                <button
                  onClick={() => navigate(`${basePath}/competency-analytics?lang=${effectiveLanguage}`)}
                  className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 font-medium py-3 px-6 rounded-xl transition-colors text-sm"
                >
                  <BarChart2 className="w-4 h-4" />
                  {isAR ? 'تحليلاتي' : 'My Analytics'}
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
                <p className="text-white/60 text-sm font-medium">
                  {isAR ? 'التقدم الكلي' : 'Overall Progress'}
                </p>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap justify-center gap-3">
                <HeroStat
                  icon={<BookOpen className="w-5 h-5" />}
                  value={`${completedModules}/${totalModules}`}
                  label={isAR ? 'الوحدات المكتملة' : 'Modules Done'}
                />
                <HeroStat
                  icon={<HelpCircle className="w-5 h-5" />}
                  value={questionBankStats?.questionsAttempted || 0}
                  label={isAR ? 'أسئلة مُمارَسة' : 'Questions Practiced'}
                />
                <HeroStat
                  icon={<Layers className="w-5 h-5" />}
                  value={flashcardStats?.cardsMastered || 0}
                  label={isAR ? 'بطاقات محفوظة' : 'Cards Mastered'}
                />
                <HeroStat
                  icon={<Clock className="w-5 h-5" />}
                  value={`${Math.floor(((trainingProgress?.totalTimeSpent || 0) + (flashcardStats?.totalStudyTimeMinutes || 0)) / 60)}h`}
                  label={isAR ? 'وقت الدراسة' : 'Study Time'}
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
                  {isAR ? 'صالح حتى' : 'Access valid until'} {format(expiryDate, 'MMMM d, yyyy')}
                </p>
                <p className={`text-xs mt-0.5 ${isExpiringSoon ? 'text-amber-600' : 'text-slate-400'}`}>
                  {daysUntilExpiry} {isAR ? 'يوم متبقي' : 'days remaining'}
                  {isExpiringSoon && (isAR ? ' — يُنصح بالتجديد قريباً' : ' — Consider renewing soon')}
                </p>
              </div>
            </div>
            {isExpiringSoon && (
              <button
                onClick={() => window.open('https://bda-global.org/en/store/bda-learning-system/', '_blank')}
                className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-4 py-2 rounded-xl transition-colors"
              >
                {isAR ? 'تجديد الوصول' : 'Renew Access'}
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
            <h3 className="font-bold text-[#0d1f4e] text-base mb-1">
              {isAR ? 'تركيز اليوم' : "Today's Focus"}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              {pct === 0
                ? (isAR
                  ? 'ابدأ بالوحدة 0: مقدمة البرنامج — تعرف على رحلة التعلم في BDA و14 كفاءة.'
                  : 'Start with Module 0: Program Introduction — get familiar with the BDA Learning Journey and the 14 Competencies.')
                : (isAR
                  ? `أنت أتممت ${pct}% من المنهج. استمر — الاتساق هو مفتاح الاستعداد للشهادة.`
                  : `You're ${pct}% through the curriculum. Keep going — consistency is the key to certification readiness.`)}
            </p>
          </div>
          <button
            onClick={() => navigate(`${basePath}/training-kits?lang=${effectiveLanguage}`)}
            className="flex items-center gap-2 bg-[#1C4A8B] text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-[#0d1f4e] transition-colors whitespace-nowrap shadow-sm"
          >
            <Zap className="w-4 h-4" />
            {isAR ? 'الذهاب للمنهج' : 'Go to Curriculum'}
          </button>
        </div>

        {/* Tool Cards — 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ToolCard
            highlight
            icon={<BookOpen className="w-6 h-6" />}
            title={isAR ? 'مجموعات التدريب' : 'Training Kits'}
            description={
              isAR
                ? 'منهج متكامل منظم وفق 14 كفاءة BDA. ابنِ أساسك المعرفي.'
                : 'Complete curriculum organized by the 14 BDA competencies. Build your knowledge foundation.'
            }
            stats={[
              { label: isAR ? 'وحدات' : 'Modules', value: totalModules },
              { label: isAR ? 'دروس' : 'Lessons', value: totalLessons },
              { label: isAR ? 'مكتمل' : 'Completed', value: `${pct}%` },
            ]}
            cta={pct > 0 ? (isAR ? 'متابعة التعلم' : 'Continue Learning') : (isAR ? 'ابدأ التعلم' : 'Start Learning')}
            onClick={() => navigate(`${basePath}/training-kits?lang=${effectiveLanguage}`)}
          />

          <ToolCard
            badge={isAR ? 'جديد' : 'NEW'}
            icon={<HelpCircle className="w-6 h-6" />}
            title={isAR ? 'بنك الأسئلة' : 'Question Bank'}
            description={
              isAR
                ? 'تدرب على أسئلة الاختيار من متعدد. احصل على تغذية راجعة فورية عبر جميع الكفاءات.'
                : 'Practice with multiple-choice questions. Get instant feedback across all competencies.'
            }
            stats={[
              { label: isAR ? 'إجمالي الأسئلة' : 'Total Questions', value: questionBankStats?.totalQuestions || 0 },
              { label: isAR ? 'مُحاوَل' : 'Attempted', value: questionBankStats?.questionsAttempted || 0 },
              { label: isAR ? 'متوسط الدرجة' : 'Avg Score', value: `${Math.round(questionBankStats?.averageScore || 0)}%` },
            ]}
            cta={isAR ? 'تدرب الآن' : 'Practice Now'}
            onClick={() => navigate(`${basePath}/question-bank?lang=${effectiveLanguage}`)}
          />

          <ToolCard
            icon={<Layers className="w-6 h-6" />}
            title={isAR ? 'البطاقات التعليمية' : 'Flashcards'}
            description={
              isAR
                ? 'بطاقات التكرار المتباعد للحفظ السريع. أتقن المفاهيم الأساسية بكفاءة.'
                : 'Spaced repetition cards for rapid recall. Master key concepts efficiently.'
            }
            stats={[
              { label: isAR ? 'إجمالي البطاقات' : 'Total Cards', value: flashcardStats?.totalCards || 0 },
              { label: isAR ? 'مستحقة اليوم' : 'Due Today', value: flashcardStats?.cardsDueToday || 0 },
              { label: isAR ? 'محفوظة' : 'Mastered', value: flashcardStats?.cardsMastered || 0 },
            ]}
            cta={isAR ? 'ادرس البطاقات' : 'Study Flashcards'}
            onClick={() => navigate(`${basePath}/flashcards?lang=${effectiveLanguage}`)}
          />
        </div>

        {/* Recommended Learning Path */}
        <div className="bg-white rounded-2xl border border-[#dbeafe] p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#0d1f4e] mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#0f91e0]" />
            {isAR ? 'مسار التعلم الموصى به' : 'Recommended Learning Path'}
          </h2>
          <div className="flex flex-col md:flex-row items-stretch gap-0">
            {[
              {
                step: 1,
                title: isAR ? 'مجموعات التدريب' : 'Training Kits',
                sub: isAR ? 'اقرأ المحتوى أولاً' : 'Read the content first',
                icon: <BookOpen className="w-5 h-5" />,
                action: () => navigate(`${basePath}/training-kits?lang=${effectiveLanguage}`),
              },
              {
                step: 2,
                title: isAR ? 'البطاقات التعليمية' : 'Flashcards',
                sub: isAR ? 'احفظ المفاهيم الأساسية' : 'Memorize key concepts',
                icon: <Layers className="w-5 h-5" />,
                action: () => navigate(`${basePath}/flashcards?lang=${effectiveLanguage}`),
              },
              {
                step: 3,
                title: isAR ? 'بنك الأسئلة' : 'Question Bank',
                sub: isAR ? 'اختبر معرفتك' : 'Test your knowledge',
                icon: <HelpCircle className="w-5 h-5" />,
                action: () => navigate(`${basePath}/question-bank?lang=${effectiveLanguage}`),
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
            { icon: <BookOpen className="w-5 h-5" />, value: '16', label: isAR ? 'وحدة تعليمية' : 'Learning Modules' },
            { icon: <Layers className="w-5 h-5" />, value: '52', label: isAR ? 'درس' : 'Lessons' },
            { icon: <Users className="w-5 h-5" />, value: '14', label: isAR ? 'كفاءة BDA' : 'BDA Competencies' },
            { icon: <Award className="w-5 h-5" />, value: 'BoCK', label: isAR ? 'هيكل المعارف' : 'Body of Knowledge' },
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
            onClick={() => navigate(`${basePath}/competency-analytics?lang=${effectiveLanguage}`)}
            className="inline-flex items-center gap-2 bg-white border border-[#dbeafe] text-[#1C4A8B] px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-[#f0f6ff] transition-colors shadow-sm"
          >
            <TrendingUp className="w-4 h-4" />
            {isAR ? 'عرض تحليلات الكفاءات' : 'View My Competency Analytics'}
          </button>
        </div>
      </div>
    </div>
  );
}
