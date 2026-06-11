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
    certCP: 'Business Development Professional',
    certCPShort: 'BDA-CP',
    certSCP: 'Senior Business Development Professional',
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
            <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0">
              <CheckCircle className="w-3 h-3" />
              {t('passed', false)}
            </span>
          )}
        </div>
        {questionSet.is_final_test && (
          <div className="flex items-center gap-1 mt-2 text-orange-600 text-xs font-medium">
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
            <p className="text-lg font-bold text-purple-600">{bestScore}%</p>
            <p className="text-xs text-slate-400">{t('bestScore', false)}</p>
          </div>
        </div>

        {hasAttempted && (
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{t('lastScore', false)}</span>
              <span className={lastScore >= passingScore ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>
                {lastScore}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${lastScore >= passingScore ? 'bg-green-500' : 'bg-amber-400'}`}
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
        <span className="text-sm font-semibold text-[#1C4A8B] flex items-center gap-1.5">
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
          <span className="text-xs font-semibold text-[#1C4A8B] bg-[#f0f6ff] border border-[#dbeafe] px-3 py-1 rounded-full">
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
}: {
  competencyName: string;
  subUnits: Record<string, QuestionSetWithProgress[]>;
  basePath: string;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const totalSets = Object.values(subUnits).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="border border-[#dbeafe] rounded-xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#f8faff] hover:bg-[#f0f6ff] transition-colors"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-[#1C4A8B]" />
          <span className="font-semibold text-[#0d1f4e] text-sm">{competencyName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{Object.keys(subUnits).length} {t('subLessons', false)} · {totalSets} {t('sets', false)}</span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="p-4 space-y-4">
          {Object.entries(subUnits)
            .sort(([, a], [, b]) => (a[0]?.sub_unit?.order_index || 0) - (b[0]?.sub_unit?.order_index || 0))
            .map(([subUnitId, sets]) => {
              const subUnit = sets[0]?.sub_unit;
              if (!subUnit) return null;
              const subTitle = subUnit.title;
              return (
                <div key={subUnitId}>
                  <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#1C4A8B] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {subUnit.order_index}
                    </span>
                    {subTitle}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sets.map((set) => (
                      <QuestionSetCard
                        key={set.id}
                        questionSet={set}
                        onClick={() => navigate(`${basePath}/question-bank/${set.id}`)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
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
    return location.pathname.startsWith('/ecp/') ? '/ecp/learning-system' : '/learning-system';
  }, [location.pathname]);

  // CP / SCP tab
  const [certType, setCertType] = useState<'CP' | 'SCP'>('CP');

  const { data: accessSummary, isLoading: accessSummaryLoading } = useUserAccesses(user?.id);
  const { data: hasQuestionBankAccess, isLoading: accessLoading } = useQuestionBankAccess(user?.id, 'EN');
  const { data: languageAccess, isLoading: languageAccessLoading } = useLanguageAccess(user?.id, 'EN');

  const { data: questionSets, isLoading: isLoadingSets } = useQuestionSetsWithProgress(user?.id, certType, 'EN');
  const { data: stats } = useQuestionBankStats(user?.id, certType, 'en');

  // Group hierarchically
  const groupedSets = useMemo(() => {
    if (!questionSets) return { introduction: [], knowledge: {}, behavioural: {}, standalone: [] };

    const introSets: QuestionSetWithProgress[] = [];
    const knowledge: Record<string, Record<string, QuestionSetWithProgress[]>> = {};
    const behavioural: Record<string, Record<string, QuestionSetWithProgress[]>> = {};
    const standalone: QuestionSetWithProgress[] = [];

    questionSets.forEach((set) => {
      if (set.section_type === 'introduction') { introSets.push(set); return; }
      if (set.competency && set.sub_unit) {
        const cId = set.competency.id;
        const sId = set.sub_unit.id;
        if (set.section_type === 'knowledge_based' || set.section_type === 'knowledge') {
          if (!knowledge[cId]) knowledge[cId] = {};
          if (!knowledge[cId][sId]) knowledge[cId][sId] = [];
          knowledge[cId][sId].push(set);
        } else {
          if (!behavioural[cId]) behavioural[cId] = {};
          if (!behavioural[cId][sId]) behavioural[cId][sId] = [];
          behavioural[cId][sId].push(set);
        }
      } else {
        standalone.push(set);
      }
    });

    return { introduction: introSets, knowledge, behavioural, standalone };
  }, [questionSets]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (accessSummaryLoading || accessLoading || languageAccessLoading || isLoadingSets) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f6ff]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-4 border-[#dbeafe] border-t-[#1C4A8B] animate-spin mx-auto mb-5" />
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
          <div className="w-16 h-16 bg-gradient-to-br from-[#1C4A8B] to-[#0d1f4e] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#0d1f4e] mb-3">{t('accessRequired', false)}</h2>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed">{t('accessRequiredSub', false)}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate(basePath)}
              className="w-full bg-gradient-to-r from-[#1C4A8B] to-[#0d1f4e] text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity"
            >
              {t('backToLearning', false)}
            </button>
            <button
              onClick={() => window.location.href = 'https://bda-global.org/shop'}
              className="w-full border border-[#dbeafe] text-[#1C4A8B] font-semibold py-3 px-6 rounded-xl hover:bg-[#f0f6ff] transition-colors"
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
    <div className="min-h-screen bg-[#f0f6ff]">

      {/* ── Hero Header ──────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #0d1f4e 0%, #1C4A8B 55%, #0f91e0 100%)' }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative container mx-auto px-6 py-10 max-w-6xl">
          {/* Back */}
          <button
            onClick={() => navigate(basePath)}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm mb-6 group"
          >
            <ArrowRight className="w-4 h-4 transition-transform rotate-180 group-hover:-translate-x-1" />
            {t('backToLearning', false)}
          </button>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-white/70 text-sm font-medium">BDA Learning System</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-2">
                {t('questionBank', false)}
              </h1>
              <p className="text-white/70 text-base">{t('questionBankSub', false)}</p>
            </div>

            {/* Stats Row */}
            {stats && (
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: <HelpCircle className="w-4 h-4" />, value: stats.questionsAttempted, label: t('questionsAttempted', false) },
                  { icon: <CheckCircle className="w-4 h-4" />, value: `${stats.questionsAttempted > 0 ? Math.round((stats.questionsCorrect / stats.questionsAttempted) * 100) : 0}%`, label: t('accuracy', false) },
                  { icon: <TrendingUp className="w-4 h-4" />, value: `${Math.round(stats.averageScore)}%`, label: t('avgScore', false) },
                  { icon: <Star className="w-4 h-4" />, value: `${stats.setsCompleted}/${stats.totalQuestionSets}`, label: t('setsCompleted', false) },
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20 min-w-[90px]">
                    <div className="text-white/60">{s.icon}</div>
                    <p className="text-xl font-bold text-white">{s.value}</p>
                    <p className="text-xs text-white/55 text-center leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-6 py-8 max-w-6xl space-y-6">

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
                  className={`relative flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-right ${
                    isSelected
                      ? 'border-[#1C4A8B] bg-gradient-to-br from-[#1C4A8B] to-[#0d1f4e] text-white shadow-lg'
                      : 'border-[#dbeafe] bg-[#f8faff] hover:border-[#1C4A8B]/40 text-[#0d1f4e]'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/15' : 'bg-[#f0f6ff]'}`}>
                    {isCP
                      ? <Award className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-[#1C4A8B]'}`} />
                      : <BarChart2 className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-[#1C4A8B]'}`} />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-[#1C4A8B]/10 text-[#1C4A8B]'}`}>
                        {isCP ? t('certCPShort', false) : t('certSCPShort', false)}
                      </span>
                    </div>
                    <p className={`font-bold text-sm leading-snug ${isSelected ? 'text-white' : 'text-[#0d1f4e]'}`}>
                      {isCP ? t('certCP', false) : t('certSCP', false)}
                    </p>
                    <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                      {isCP ? t('certCPDesc', false) : t('certSCPDesc', false)}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-white/80 absolute top-3 left-3" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Introduction Sets ─────────────────────────────────────────── */}
        {groupedSets.introduction.length > 0 && (
          <AccordionSection
            title={t('introduction', false)}
            subtitle={t('introSub', false)}
            icon={<BookOpen className="w-5 h-5 text-slate-600" />}
            color="bg-slate-100"
            count={groupedSets.introduction.length}
            defaultOpen
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {groupedSets.introduction.map((set) => (
                <QuestionSetCard
                  key={set.id}
                  questionSet={set}
                  onClick={() => navigate(`${basePath}/question-bank/${set.id}`)}
                />
              ))}
            </div>
          </AccordionSection>
        )}

        {/* ── Behavioural Competencies ───────────────────────────────────── */}
        {Object.keys(groupedSets.behavioural).length > 0 && (
          <AccordionSection
            title={t('behavioural', false)}
            subtitle={`${Object.keys(groupedSets.behavioural).length} ${t('competencies', false)}`}
            icon={<Layers className="w-5 h-5 text-purple-600" />}
            color="bg-purple-50"
            count={Object.values(groupedSets.behavioural).reduce((s, sub) => s + Object.values(sub).reduce((ss, arr) => ss + arr.length, 0), 0)}
            defaultOpen
          >
            <div className="mt-2 space-y-2">
              {Object.entries(groupedSets.behavioural).map(([cId, subUnits]) => {
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
            icon={<Brain className="w-5 h-5 text-blue-600" />}
            color="bg-blue-50"
            count={Object.values(groupedSets.knowledge).reduce((s, sub) => s + Object.values(sub).reduce((ss, arr) => ss + arr.length, 0), 0)}
            defaultOpen
          >
            <div className="mt-2 space-y-2">
              {Object.entries(groupedSets.knowledge).map(([cId, subUnits]) => {
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
            icon={<Target className="w-5 h-5 text-amber-600" />}
            color="bg-amber-50"
            count={groupedSets.standalone.length}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {groupedSets.standalone.map((set) => (
                <QuestionSetCard
                  key={set.id}
                  questionSet={set}
                  onClick={() => navigate(`${basePath}/question-bank/${set.id}`)}
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
              className="bg-[#1C4A8B] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#0d1f4e] transition-colors"
            >
              {t('backToLearning', false)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
