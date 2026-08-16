/**
 * Question Bank Dashboard — English Only
 * - CP / SCP separated
 * - BDA Brand Colors: #0d1f4e, #1C4A8B, #0f91e0
 */

import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  useQuestionSetsWithProgress,
  useQuestionBankStats,
} from '@/entities/question-bank';
import {
  useQuestionBankAccess,
  useUserAccesses,
  useLanguageAccess,
} from '@/entities/curriculum';
import {
  ArrowRight,
  HelpCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Star,
  ChevronLeft,
  Brain,
  Target,
  BookOpen,
  Award,
  BarChart2,
  Layers,
  ChevronDown,
  ChevronUp,
  Lock,
  Play,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BDAAbstractHero } from '@/components/BDAAbstractHero';
import type { QuestionSetWithProgress } from '@/entities/question-bank';

// ─── BDA Brand Palette ────────────────────────────────────────────────────────
const BDA = {
  navy: '#0d1f4e',
  blue: '#1C4A8B',
  accent: '#0f91e0',
  light: '#f0f6ff',
  lightBorder: '#dbeafe',
};

// ─── Translations ─────────────────────────────────────────────────────────────
function t(key: string, isAR: boolean): string {
  const ar: Record<string, string> = {
    backToLearning: 'العودة لنظام التعلم',
    questionBank: 'بنك الأسئلة',
    questionBankSub: 'تدرب على أسئلة الاختيار من متعدد وتتبع أداءك',
    certSelect: 'اختر نوع الشهادة',
    certCP: 'محترف معتمد في تطوير الأعمال',
    certCPShort: 'BDA-CP',
    certSCP: 'محترف أول معتمد في تطوير الأعمال',
    certSCPShort: 'BDA-SCP',
    certCPDesc: 'مستوى التطبيق والفهم',
    certSCPDesc: 'مستوى الاستراتيجية والقيادة',
    questionsAttempted: 'أسئلة مُجاوَبة',
    correctAnswers: 'إجابات صحيحة',
    avgScore: 'متوسط الدرجة',
    setsCompleted: 'مجموعات مكتملة',
    ofTotal: 'من',
    accuracy: 'دقة',
    introduction: 'مقدمة',
    introSub: 'أسئلة تأسيسية للبدء',
    behavioral: 'الكفاءات السلوكية',
    knowledge: 'الكفاءات المعرفية',
    subLessons: 'دروس فرعية',
    sets: 'مجموعات',
    set: 'مجموعة',
    subLesson: 'الدرس الفرعي',
    practiceSets: 'مجموعات التدريب',
    practiceSetsSub: 'مجموعات تدريب إضافية',
    questions: 'أسئلة',
    attempts: 'محاولات',
    bestScore: 'أفضل درجة',
    lastScore: 'آخر درجة',
    passingScore: 'درجة النجاح',
    passed: 'ناجح',
    finalTest: 'اختبار نهائي',
    min: 'دقيقة',
    startPractice: 'ابدأ التدريب',
    practiceAgain: 'تدرب مجدداً',
    noSets: 'لا توجد مجموعات أسئلة',
    noSetsSub: 'ستظهر مجموعات الأسئلة هنا بعد نشرها من قِبل الإدارة.',
    accessRequired: 'الوصول مطلوب',
    accessRequiredSub: 'تحتاج إلى شراء حزمة نظام التعلم التي تتضمن بنك الأسئلة للوصول إلى هذا المحتوى.',
    visitShop: 'زيارة المتجر',
    loading: 'جاري تحميل بنك الأسئلة...',
    competencies: 'كفاءة',
  };
  const en: Record<string, string> = {
    backToLearning: 'Back to Learning System',
    questionBank: 'Question Bank',
    questionBankSub: 'Practice with MCQs and track your performance',
    certSelect: 'Select Certification Level',
    certCP: 'BDA Certified Professional',
    certCPShort: 'BDA-CP',
    certSCP: 'BDA Senior Certified Professional',
    certSCPShort: 'BDA-SCP',
    certCPDesc: 'Application & Understanding Level',
    certSCPDesc: 'Strategic & Leadership Level',
    questionsAttempted: 'Questions Attempted',
    correctAnswers: 'Correct Answers',
    avgScore: 'Average Score',
    setsCompleted: 'Sets Completed',
    ofTotal: 'of',
    accuracy: 'accuracy',
    introduction: 'Introduction',
    introSub: 'Foundation questions to get started',
    behavioral: 'Behavioural Competencies',
    knowledge: 'Knowledge-Based Competencies',
    subLessons: 'Sub-lessons',
    sets: 'Sets',
    set: 'Set',
    subLesson: 'Sub-lesson',
    practiceSets: 'Practice Sets',
    practiceSetsSub: 'Additional practice question sets',
    questions: 'Questions',
    attempts: 'Attempts',
    bestScore: 'Best Score',
    lastScore: 'Last Score',
    passingScore: 'Passing score',
    passed: 'Passed',
    finalTest: 'Final Test',
    min: 'min',
    startPractice: 'Start Practice',
    practiceAgain: 'Practice Again',
    noSets: 'No Question Sets Available',
    noSetsSub: 'Question sets will appear here once they are published by the admin.',
    accessRequired: 'Question Bank Access Required',
    accessRequiredSub: 'You need to purchase the Learning System package that includes Question Bank access to view this content.',
    visitShop: 'Visit Shop',
    loading: 'Loading question bank...',
    competencies: 'Competencies',
  };
  return isAR ? (ar[key] ?? key) : (en[key] ?? key);
}

// ─── Question Set Card ────────────────────────────────────────────────────────
interface QuestionSetCardProps {
  questionSet: QuestionSetWithProgress;
  onClick: () => void;
}

function QuestionSetCard({ questionSet, onClick }: QuestionSetCardProps) {
  const progress = questionSet.progress;
  const isCompleted = progress?.completed_at !== null && progress?.completed_at !== undefined;
  const hasAttempted = (progress?.attempts_count || 0) > 0;
  const lastScore = progress?.last_score_percentage || 0;
  const bestScore = progress?.best_score_percentage || 0;
  const passingScore = questionSet.passing_score || 70;

  const title = questionSet.title;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-[#dbeafe] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden group"
    >
      {/* Header */}
      <div
        className="p-4 border-b"
        style={{ background: 'linear-gradient(135deg, #f0f6ff 0%, #e8f2ff 100%)' }}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[#0d1f4e] text-sm leading-snug line-clamp-2 flex-1">
            {title}
          </h3>
          {isCompleted && (
            <span className="flex items-center gap-1 bg-[#e8f4fd] text-[#0f91e0] px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0">
              <CheckCircle className="w-3 h-3" />
              {t('passed', false)}
            </span>
          )}
        </div>
        {questionSet.is_final_test && (
          <div className="flex items-center gap-1 mt-2 text-[#1C4A8B] text-xs font-medium">
            <Target className="w-3 h-3" />
            {t('finalTest', false)}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <p className="text-lg font-bold text-[#1C4A8B]">{questionSet.question_count}</p>
            <p className="text-xs text-slate-400">{t('questions', false)}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#0f91e0]">{progress?.attempts_count || 0}</p>
            <p className="text-xs text-slate-400">{t('attempts', false)}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#0d1f4e]">{bestScore}%</p>
            <p className="text-xs text-slate-400">{t('bestScore', false)}</p>
          </div>
        </div>

        {hasAttempted && (
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{t('lastScore', false)}</span>
              <span className={lastScore >= passingScore ? 'text-[#0f91e0] font-semibold' : 'text-amber-600 font-semibold'}>
                {lastScore}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${lastScore >= passingScore ? 'bg-[#0f91e0]' : 'bg-amber-400'}`}
                style={{ width: `${lastScore}%` }}
              />
            </div>
            <p className="text-xs text-slate-300 mt-1">{t('passingScore', false)}: {passingScore}%</p>
          </div>
        )}

        {questionSet.time_limit_minutes && (
          <div className="flex items-center gap-1 text-slate-400 text-xs mt-2">
            <Clock className="w-3 h-3" />
            {questionSet.time_limit_minutes} {t('min', false)}
          </div>
        )}
      </div>

      {/* CTA */}
      <div
        className="px-4 py-3 border-t flex items-center justify-between group-hover:bg-[#f0f6ff] transition-colors"
        style={{ borderColor: '#dbeafe' }}
      >
        <span className="text-sm font-semibold text-[#0f91e0] flex items-center gap-1.5">
          {hasAttempted ? (
            <><RefreshCw className="w-3.5 h-3.5" />{t('practiceAgain', false)}</>
          ) : (
            <><Play className="w-3.5 h-3.5 fill-current" />{t('startPractice', false)}</>
          )}
        </span>
        <ChevronLeft className="w-4 h-4 text-slate-300 rotate-180" />
      </div>
    </div>
  );
}

// ─── Accordion Section ────────────────────────────────────────────────────────
function AccordionSection({
  title,
  subtitle,
  icon,
  color,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-[#dbeafe] shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-[#f8faff] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <div className="text-right">
            <h2 className="font-bold text-[#0d1f4e] text-base">{title}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#0f91e0] bg-[#f0f6ff] border border-[#dbeafe] px-3 py-1 rounded-full">
            {count}
          </span>
          {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ─── Competency Sub-Accordion ─────────────────────────────────────────────────
function CompetencyAccordion({
  competencyName,
  subUnits,
  basePath,
  certType,
}: {
  competencyName: string;
  subUnits: Record<string, QuestionSetWithProgress[]>;
  basePath: string;
  certType: 'CP' | 'SCP';
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Flatten all sets sorted by sub_unit order_index, then set order within sub_unit
  const allSets = Object.entries(subUnits)
    .sort(([keyA, a], [keyB, b]) => {
      if (keyA === '__no_sub__') return -1;
      if (keyB === '__no_sub__') return 1;
      return (a[0]?.sub_unit?.order_index || 0) - (b[0]?.sub_unit?.order_index || 0);
    })
    .flatMap(([, sets]) => sets);

  const totalSets = allSets.length;
  const subLessonCount = Object.keys(subUnits).filter(k => k !== '__no_sub__').length;

  return (
    <div className="border border-[#dbeafe] rounded-xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#f8faff] hover:bg-[#f0f6ff] transition-colors"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-[#0f91e0]" />
          <span className="font-semibold text-[#0d1f4e] text-sm">{competencyName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {subLessonCount > 0 ? `${subLessonCount} ${t('subLessons', false)} · ` : ''}{totalSets} {t('sets', false)}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="p-4">
          {/* All sets in a single responsive grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allSets.map((set) => (
              <QuestionSetCard
                key={set.id}
                questionSet={set}
                onClick={() => navigate(`${basePath}/question-bank/${set.id}`, { state: { certType } })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function QuestionBankDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const basePath = useMemo(() => {
    if (location.pathname.startsWith('/ecp/')) return '/ecp/learning-system';
    if (location.pathname.startsWith('/instructor/')) return '/instructor/learning-system';
    return '/learning-system';
  }, [location.pathname]);

  // CP / SCP tab
  const [certType, setCertType] = useState<'CP' | 'SCP'>('CP');

  const { data: accessSummary, isLoading: accessSummaryLoading } = useUserAccesses(user?.id);
  const { data: hasQuestionBankAccess, isLoading: accessLoading } = useQuestionBankAccess(user?.id, 'EN');
  const { data: languageAccess, isLoading: languageAccessLoading } = useLanguageAccess(user?.id, 'EN');

  // All content is stored under 'CP' — use CP for fetching regardless of selected cert type
  const { data: questionSets, isLoading: isLoadingSets } = useQuestionSetsWithProgress(user?.id, 'CP', 'EN');
  const { data: stats } = useQuestionBankStats(user?.id, 'CP', 'en');

  // Group hierarchically
  const groupedSets = useMemo(() => {
    if (!questionSets) return { knowledge: {}, behavioural: {}, standalone: [] };

    const knowledge: Record<string, Record<string, QuestionSetWithProgress[]>> = {};
    const behavioural: Record<string, Record<string, QuestionSetWithProgress[]>> = {};
    const standalone: QuestionSetWithProgress[] = [];

    questionSets.forEach((set) => {
      if (set.section_type === 'introduction') { return; } // skip introduction
      if (set.competency) {
        const cId = set.competency.id;
        // Use sub_unit id if available, otherwise use a placeholder key '__no_sub__'
        const sId = set.sub_unit ? set.sub_unit.id : '__no_sub__';
        if (set.section_type === 'knowledge_based' || set.section_type === 'knowledge') {
          if (!knowledge[cId]) knowledge[cId] = {};
          if (!knowledge[cId][sId]) knowledge[cId][sId] = [];
          knowledge[cId][sId].push(set);
        } else if (set.section_type === 'behavioral' || set.section_type === 'behavioural') {
          if (!behavioural[cId]) behavioural[cId] = {};
          if (!behavioural[cId][sId]) behavioural[cId][sId] = [];
          behavioural[cId][sId].push(set);
        } else {
          standalone.push(set);
        }
      } else {
        standalone.push(set);
      }
    });

    return { knowledge, behavioural, standalone };
  }, [questionSets]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (accessSummaryLoading || accessLoading || languageAccessLoading || isLoadingSets) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f6ff]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-4 border-[#dbeafe] border-t-[#0f91e0] animate-spin mx-auto mb-5" />
          <p className="text-slate-500 font-medium">{t('loading', false)}</p>
        </div>
      </div>
    );
  }

  // ── Access Denied ─────────────────────────────────────────────────────────
  if (!hasQuestionBankAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f6ff] px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-[#dbeafe] p-10 text-center">
          <div className="w-16 h-16 bg-[#0f91e0] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#0d1f4e] mb-3">{t('accessRequired', false)}</h2>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed">{t('accessRequiredSub', false)}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate(basePath)}
              className="w-full bg-[#0f91e0] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#1C4A8B] transition-colors"
            >
              {t('backToLearning', false)}
            </button>
            <button
              onClick={() => window.location.href = 'https://bda-global.org/shop'}
              className="w-full border border-[#dbeafe] text-[#0f91e0] font-semibold py-3 px-6 rounded-xl hover:bg-[#f0f6ff] transition-colors"
            >
              {t('visitShop', false)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Dashboard ────────────────────────────────────────────────────────
  return (
    <div className="bg-[#f8f9fb]">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0] py-12 text-white sm:py-14">
        <BDAAbstractHero />
        <div className="relative mx-auto max-w-[1640px] px-6 sm:px-10 lg:px-16 xl:px-24">
          <button
            type="button"
            onClick={() => navigate(basePath)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/85 transition-colors hover:text-white"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            {t('backToLearning', false)}
          </button>

          <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm">
                <HelpCircle className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('questionBank', false)}</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">{t('questionBankSub', false)}</p>
            </div>

            {stats && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[610px]">
                <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm">
                  <HelpCircle className="mb-2 h-4 w-4 text-white/80" />
                  <p className="text-lg font-bold leading-none">{stats.questionsAttempted}</p>
                  <p className="mt-1 text-[11px] font-medium text-white/70">{t('questionsAttempted', false)}</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm">
                  <CheckCircle className="mb-2 h-4 w-4 text-white/80" />
                  <p className="text-lg font-bold leading-none">{stats.questionsAttempted > 0 ? Math.round((stats.questionsCorrect / stats.questionsAttempted) * 100) : 0}%</p>
                  <p className="mt-1 text-[11px] font-medium text-white/70">{t('accuracy', false)}</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm">
                  <TrendingUp className="mb-2 h-4 w-4 text-white/80" />
                  <p className="text-lg font-bold leading-none">{Math.round(stats.averageScore)}%</p>
                  <p className="mt-1 text-[11px] font-medium text-white/70">{t('avgScore', false)}</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm">
                  <Star className="mb-2 h-4 w-4 text-white/80" />
                  <p className="text-lg font-bold leading-none">{stats.setsCompleted}/{stats.totalQuestionSets}</p>
                  <p className="mt-1 text-[11px] font-medium text-white/70">{t('setsCompleted', false)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-6 py-6 max-w-6xl space-y-6">

        {/* ── CP / SCP Selector ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#dbeafe] p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 mb-4">{t('certSelect', false)}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['CP', 'SCP'] as const).map((type) => {
              const isSelected = certType === type;
              const isCP = type === 'CP';
              return (
                <button
                  key={type}
                  onClick={() => setCertType(type)}
                  className={`relative flex items-center gap-5 p-5 rounded-2xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-[#0f91e0] bg-[#0f91e0] text-white shadow-xl scale-[1.01]'
                      : 'border-[#dbeafe] bg-[#f8faff] hover:border-[#0f91e0]/50 hover:shadow-md text-[#0d1f4e]'
                  }`}
                >
                  {/* Badge Image */}
                  <div className="w-20 h-20 flex-shrink-0 drop-shadow-md">
                    <img
                      src={isCP ? '/bda-cp-badge.webp' : '/bda-scp-badge.webp'}
                      alt={isCP ? 'BDA-CP Badge' : 'BDA-SCP Badge'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mb-1.5 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#0f91e0]/10 text-[#0f91e0]'
                    }`}>
                      {isCP ? t('certCPShort', false) : t('certSCPShort', false)}
                    </span>
                    <p className={`font-bold text-base leading-tight mb-1 ${
                      isSelected ? 'text-white' : 'text-[#0d1f4e]'
                    }`}>
                      {isCP ? t('certCP', false) : t('certSCP', false)}
                    </p>
                    <p className={`text-xs leading-relaxed ${
                      isSelected ? 'text-white/70' : 'text-slate-400'
                    }`}>
                      {isCP ? t('certCPDesc', false) : t('certSCPDesc', false)}
                    </p>
                  </div>
                  {/* Selected check */}
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-white/80 absolute top-3 right-3" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Introduction section hidden — competencies only */}

        {/* ── Behavioural Competencies ───────────────────────────────────── */}
        {Object.keys(groupedSets.behavioural).length > 0 && (
          <AccordionSection
            title={t('behavioral', false)}
            subtitle={`${Object.keys(groupedSets.behavioural).length} ${t('competencies', false)}`}
            icon={<Layers className="w-5 h-5 text-[#0f91e0]" />}
            color="bg-[#e8f4fd]"
            count={Object.values(groupedSets.behavioural).reduce((s, sub) => s + Object.values(sub).reduce((ss, arr) => ss + arr.length, 0), 0)}
            defaultOpen
          >
            <div className="mt-2 space-y-2">
              {Object.entries(groupedSets.behavioural)
                .sort(([, aUnits], [, bUnits]) => {
                  const aOrder = (Object.values(aUnits)[0]?.[0] as any)?.competency?.order_index ?? 999;
                  const bOrder = (Object.values(bUnits)[0]?.[0] as any)?.competency?.order_index ?? 999;
                  return aOrder - bOrder;
                })
                .map(([cId, subUnits]) => {
                const firstSet = Object.values(subUnits)[0]?.[0];
                const competency = firstSet?.competency;
                if (!competency) return null;
                const name = competency.competency_name;
                return (
                  <CompetencyAccordion
                    key={cId}
                    competencyName={name}
                    subUnits={subUnits}
                    basePath={basePath}
                    certType={certType}
                  />
                );
              })}
            </div>
          </AccordionSection>
        )}

        {/* ── Knowledge Competencies ────────────────────────────────────── */}
        {Object.keys(groupedSets.knowledge).length > 0 && (
          <AccordionSection
            title={t('knowledge', false)}
            subtitle={`${Object.keys(groupedSets.knowledge).length} ${t('competencies', false)}`}
            icon={<Brain className="w-5 h-5 text-[#1C4A8B]" />}
            color="bg-[#f0f6ff]"
            count={Object.values(groupedSets.knowledge).reduce((s, sub) => s + Object.values(sub).reduce((ss, arr) => ss + arr.length, 0), 0)}
            defaultOpen
          >
            <div className="mt-2 space-y-2">
              {Object.entries(groupedSets.knowledge)
                .sort(([, aUnits], [, bUnits]) => {
                  const aOrder = (Object.values(aUnits)[0]?.[0] as any)?.competency?.order_index ?? 999;
                  const bOrder = (Object.values(bUnits)[0]?.[0] as any)?.competency?.order_index ?? 999;
                  return aOrder - bOrder;
                })
                .map(([cId, subUnits]) => {
                const firstSet = Object.values(subUnits)[0]?.[0];
                const competency = firstSet?.competency;
                if (!competency) return null;
                const name = competency.competency_name;
                return (
                  <CompetencyAccordion
                    key={cId}
                    competencyName={name}
                    subUnits={subUnits}
                    basePath={basePath}
                    certType={certType}
                  />
                );
              })}
            </div>
          </AccordionSection>
        )}

        {/* ── Standalone Sets ───────────────────────────────────────────── */}
        {groupedSets.standalone.length > 0 && (
          <AccordionSection
            title={t('practiceSets', false)}
            subtitle={t('practiceSetsSub', false)}
            icon={<Target className="w-5 h-5 text-[#0f91e0]" />}
            color="bg-[#e8f4fd]"
            count={groupedSets.standalone.length}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {groupedSets.standalone.map((set) => (
                <QuestionSetCard
                  key={set.id}
                  questionSet={set}
                  onClick={() => navigate(`${basePath}/question-bank/${set.id}`, { state: { certType } })}
                />
              ))}
            </div>
          </AccordionSection>
        )}

        {/* ── Empty State ───────────────────────────────────────────────── */}
        {questionSets?.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#dbeafe]">
            <HelpCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#0d1f4e] mb-2">{t('noSets', false)}</h2>
            <p className="text-slate-400 mb-6 text-sm">{t('noSetsSub', false)}</p>
            <button
              onClick={() => navigate(basePath)}
              className="bg-[#0f91e0] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#1C4A8B] transition-colors"
            >
              {t('backToLearning', false)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
