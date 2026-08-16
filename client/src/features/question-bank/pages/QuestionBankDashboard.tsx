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
  TrendingUp,
  Star,
  Brain,
  Target,
  BookOpen,
  Layers,
  Lock,
  Play,
  RefreshCw,
} from 'lucide-react';
import { BDAAbstractHero } from '@/components/BDAAbstractHero';
import type { QuestionSetWithProgress } from '@/entities/question-bank';

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
    chooseCertification: 'اختر الشهادة التي تستعد لها',
    changeCertification: 'تغيير الشهادة',
    exploreQuestionBank: 'استكشف بنك الأسئلة',
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
    chooseCertification: 'Choose the certification you are preparing for',
    changeCertification: 'Change certification',
    exploreQuestionBank: 'Explore Question Bank',
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

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[226px] w-full flex-col overflow-hidden rounded-2xl border border-[#dbeafe] bg-white p-5 text-left shadow-[0_3px_12px_rgba(13,31,78,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-[#0f91e0]/60 hover:shadow-[0_14px_28px_rgba(13,31,78,0.12)] focus:outline-none focus:ring-2 focus:ring-[#0f91e0]/50"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0]" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f6ff] text-[#0f91e0]">
            {questionSet.is_final_test ? <Target className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.11em] text-[#0f91e0]">
            {questionSet.is_final_test ? t('finalTest', false) : 'Practice set'}
          </span>
        </div>
        {isCompleted && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e8f4fd] px-2 py-1 text-[11px] font-bold text-[#0f91e0]">
            <CheckCircle className="h-3 w-3" />
            {t('passed', false)}
          </span>
        )}
      </div>

      <h3 className="mt-4 line-clamp-2 text-[15px] font-bold leading-snug text-[#0d1f4e]">
        {questionSet.title}
      </h3>

      <div className="mt-5 grid grid-cols-3 divide-x divide-[#e6effb] rounded-xl bg-[#f8faff] py-3">
        <div className="px-2 text-center">
          <p className="text-base font-bold text-[#0d1f4e]">{questionSet.question_count}</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-400">{t('questions', false)}</p>
        </div>
        <div className="px-2 text-center">
          <p className="text-base font-bold text-[#0f91e0]">{progress?.attempts_count || 0}</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-400">{t('attempts', false)}</p>
        </div>
        <div className="px-2 text-center">
          <p className="text-base font-bold text-[#0d1f4e]">{bestScore}%</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-400">{t('bestScore', false)}</p>
        </div>
      </div>

      {hasAttempted && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-slate-400">
            <span>{t('lastScore', false)}</span>
            <span className={lastScore >= passingScore ? 'font-bold text-[#0f91e0]' : 'font-bold text-slate-500'}>{lastScore}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#e6effb]">
            <div className="h-full rounded-full bg-[#0f91e0] transition-all" style={{ width: `${lastScore}%` }} />
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-5 text-sm font-bold text-[#0f91e0]">
        <span className="inline-flex items-center gap-2">
          {hasAttempted ? <RefreshCw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          {hasAttempted ? t('practiceAgain', false) : t('startPractice', false)}
        </span>
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
      </div>
    </button>
  );
}

// ─── Competency Directory ─────────────────────────────────────────────────────
type CompetencyGroups = Record<string, Record<string, QuestionSetWithProgress[]>>;

function CompetencyDirectory({
  title,
  description,
  icon,
  groups,
  basePath,
  certType,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  groups: CompetencyGroups;
  basePath: string;
  certType: 'CP' | 'SCP';
}) {
  const navigate = useNavigate();
  const [activeCompetencyId, setActiveCompetencyId] = useState<string | null>(null);

  const competencies = Object.entries(groups)
    .map(([id, subUnits]) => {
      const firstSet = Object.values(subUnits)[0]?.[0];
      const competency = firstSet?.competency;
      const sets = Object.entries(subUnits)
        .sort(([keyA, a], [keyB, b]) => {
          if (keyA === '__no_sub__') return -1;
          if (keyB === '__no_sub__') return 1;
          return (a[0]?.sub_unit?.order_index || 0) - (b[0]?.sub_unit?.order_index || 0);
        })
        .flatMap(([, value]) => value);
      return competency ? { id, name: competency.competency_name, order: competency.order_index ?? 999, sets } : null;
    })
    .filter((entry): entry is { id: string; name: string; order: number; sets: QuestionSetWithProgress[] } => entry !== null)
    .sort((a, b) => a.order - b.order);

  const activeCompetency = competencies.find((competency) => competency.id === activeCompetencyId) || competencies[0];

  if (!activeCompetency) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-[#dbeafe] bg-white shadow-[0_6px_20px_rgba(13,31,78,0.05)]">
      <div className="flex flex-col gap-4 border-b border-[#e6effb] px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f0f6ff] text-[#0f91e0]">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0d1f4e]">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <span className="self-start rounded-full border border-[#dbeafe] bg-[#f8faff] px-3 py-1.5 text-xs font-bold text-[#1c4a8b] sm:self-auto">
          {competencies.length} {t('competencies', false)}
        </span>
      </div>

      <div className="grid lg:grid-cols-[minmax(250px,0.75fr)_minmax(0,2fr)]">
        <div className="border-b border-[#e6effb] bg-[#f8faff] p-3 lg:border-b-0 lg:border-r">
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {competencies.map((competency, index) => {
              const active = activeCompetency.id === competency.id;
              return (
                <button
                  key={competency.id}
                  type="button"
                  onClick={() => setActiveCompetencyId(competency.id)}
                  className={`min-w-[220px] rounded-xl px-4 py-3 text-left transition-all lg:min-w-0 ${
                    active
                      ? 'bg-white text-[#0d1f4e] shadow-[0_4px_14px_rgba(13,31,78,0.10)] ring-1 ring-[#0f91e0]/20'
                      : 'text-slate-500 hover:bg-white/80 hover:text-[#1c4a8b]'
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${active ? 'bg-[#0f91e0] text-white' : 'bg-white text-[#1c4a8b]'}`}>{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug">{competency.name}</span>
                      <span className="mt-1 block text-[11px] font-medium text-slate-400">{competency.sets.length} {t('sets', false)}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#0f91e0]">Selected competency</p>
              <h3 className="mt-1 text-lg font-bold text-[#0d1f4e]">{activeCompetency.name}</h3>
            </div>
            <p className="text-xs font-semibold text-slate-400">{activeCompetency.sets.length} {t('practiceSets', false)}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeCompetency.sets.map((set) => (
              <QuestionSetCard
                key={set.id}
                questionSet={set}
                onClick={() => navigate(`${basePath}/question-bank/${set.id}`, { state: { certType } })}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
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

  // A certification must be selected before its question sets are shown.
  const [certType, setCertType] = useState<'CP' | 'SCP' | null>(null);

  const { data: accessSummary, isLoading: accessSummaryLoading } = useUserAccesses(user?.id);
  const { data: hasQuestionBankAccess, isLoading: accessLoading } = useQuestionBankAccess(user?.id, 'EN');
  const { data: languageAccess, isLoading: languageAccessLoading } = useLanguageAccess(user?.id, 'EN');

  // Question sets are shared structurally, while the service filters each set by
  // its CP or SCP question count. Use the selected certification for the data query.
  const selectedCertification = certType ?? 'CP';
  const { data: questionSets, isLoading: isLoadingSets } = useQuestionSetsWithProgress(user?.id, selectedCertification, 'EN');
  const { data: stats } = useQuestionBankStats(user?.id, selectedCertification, 'en');

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

            {certType && stats && (
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

      {/* ── Certification Selection & Content ───────────────────────────── */}
      <div className="container mx-auto max-w-6xl px-6 py-8 sm:py-10">
        {!certType ? (
          <section className="mx-auto grid min-h-[calc(100vh-25rem)] max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            {(['CP', 'SCP'] as const).map((type) => {
              const isCP = type === 'CP';
              return (
                <button
                  type="button"
                  key={type}
                  onClick={() => setCertType(type)}
                  className="group relative flex min-h-[340px] flex-col overflow-hidden rounded-3xl border border-[#dbeafe] bg-white p-8 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#0f91e0]/60 hover:shadow-xl sm:min-h-[420px] sm:p-10"
                >
                  <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0]" />
                  <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#0f91e0]/[0.06] transition-transform duration-300 group-hover:scale-110" />
                  <div className="relative flex h-32 items-center justify-center sm:h-40">
                    <img
                      src={isCP ? '/bda-cp-badge.webp' : '/bda-scp-badge.webp'}
                      alt={isCP ? 'BDA-CP Badge' : 'BDA-SCP Badge'}
                      className="h-full w-auto object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="relative mt-auto pt-10">
                    <span className="inline-flex rounded-full bg-[#f0f6ff] px-3 py-1 text-xs font-bold text-[#0f91e0]">
                      {isCP ? t('certCPShort', false) : t('certSCPShort', false)}
                    </span>
                    <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#0d1f4e] sm:text-3xl">
                      {isCP ? t('certCP', false) : t('certSCP', false)}
                    </h2>
                    <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
                      {isCP ? t('certCPDesc', false) : t('certSCPDesc', false)}
                    </p>
                    <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#0f91e0]">
                      {t('exploreQuestionBank', false)}
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </div>
                </button>
              );
            })}
          </section>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-2xl border border-[#dbeafe] bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0f91e0]">{certType === 'CP' ? t('certCPShort', false) : t('certSCPShort', false)}</p>
                <p className="mt-1 text-sm font-semibold text-[#0d1f4e]">{certType === 'CP' ? t('certCP', false) : t('certSCP', false)}</p>
              </div>
              <button
                type="button"
                onClick={() => setCertType(null)}
                className="inline-flex items-center gap-2 self-start rounded-lg border border-[#dbeafe] px-3 py-2 text-xs font-bold text-[#1c4a8b] transition-colors hover:bg-[#f0f6ff] sm:self-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t('changeCertification', false)}
              </button>
            </div>

        {/* ── Competency directories ───────────────────────────────────── */}
        {Object.keys(groupedSets.behavioural).length > 0 && (
          <CompetencyDirectory
            title={t('behavioral', false)}
            description="Select a competency to explore its focused practice sets."
            icon={<Layers className="h-6 w-6" />}
            groups={groupedSets.behavioural}
            basePath={basePath}
            certType={certType}
          />
        )}

        {Object.keys(groupedSets.knowledge).length > 0 && (
          <CompetencyDirectory
            title={t('knowledge', false)}
            description="Build applied knowledge across the BDA business development framework."
            icon={<Brain className="h-6 w-6" />}
            groups={groupedSets.knowledge}
            basePath={basePath}
            certType={certType}
          />
        )}

        {/* ── Standalone Practice Sets ──────────────────────────────────── */}
        {groupedSets.standalone.length > 0 && (
          <section className="overflow-hidden rounded-3xl border border-[#dbeafe] bg-white shadow-[0_6px_20px_rgba(13,31,78,0.05)]">
            <div className="flex flex-col gap-4 border-b border-[#e6effb] bg-gradient-to-r from-[#f8faff] via-white to-[#f0f6ff] px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0d1f4e] text-white shadow-sm">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0d1f4e]">{t('practiceSets', false)}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t('practiceSetsSub', false)}</p>
                </div>
              </div>
              <span className="self-start rounded-full border border-[#dbeafe] bg-white px-3 py-1.5 text-xs font-bold text-[#1c4a8b] shadow-sm sm:self-auto">
                {groupedSets.standalone.length} {t('sets', false)}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              {groupedSets.standalone.map((set) => (
                <QuestionSetCard
                  key={set.id}
                  questionSet={set}
                  onClick={() => navigate(`${basePath}/question-bank/${set.id}`, { state: { certType } })}
                />
              ))}
            </div>
          </section>
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
        )}
      </div>
    </div>
  );
}
