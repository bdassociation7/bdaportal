/**
 * Flashcards Dashboard — English Only
 * - BDA Brand Colors: #0d1f4e, #1C4A8B, #0f91e0
 */

import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  useDecksWithProgress,
  useFlashcardStats,
} from '@/entities/flashcards';
import {
  useFlashcardsAccess,
  useUserAccesses,
  useLanguageAccess,
} from '@/entities/curriculum';
import type { FlashcardDeckWithProgress } from '@/entities/flashcards';
import {
  ArrowRight,
  Layers,
  CheckCircle,
  Clock,
  Flame,
  Star,
  ChevronLeft,
  Brain,
  Calendar,
  TrendingUp,
  Lock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
} from 'lucide-react';

// ─── Translations ─────────────────────────────────────────────────────────────
function t(key: string, isAR: boolean): string {
  const ar: Record<string, string> = {
    backToLearning: 'العودة لنظام التعلم',
    flashcards: 'بطاقات الفلاش',
    flashcardsSub: 'التكرار المتباعد لحفظ فعّال ودائم',
    dueToday: 'مستحقة اليوم',
    cardsToReview: 'بطاقة للمراجعة',
    mastered: 'محفوظة',
    ofTotal: 'من',
    cards: 'بطاقة',
    learning: 'قيد التعلم',
    inProgress: 'جارٍ التعلم',
    studyStreak: 'سلسلة الدراسة',
    best: 'الأفضل',
    days: 'أيام',
    studyTime: 'وقت الدراسة',
    totalTime: 'إجمالي الوقت',
    dueAlert: 'بطاقات مستحقة للمراجعة',
    dueAlertSub: 'لديك {n} بطاقة تحتاج مراجعة اليوم. انقر على أي مجموعة للبدء والحفاظ على سلسلتك!',
    introduction: 'مقدمة',
    introSub: 'بطاقات تأسيسية للبدء',
    behavioral: 'الكفاءات السلوكية',
    behavioralSub: 'المهارات الناعمة والسلوكيات المهنية',
    knowledge: 'الكفاءات المعرفية',
    knowledgeSub: 'المعرفة التقنية والخبرة',
    additional: 'بطاقات إضافية',
    decksAvailable: 'مجموعة متاحة',
    startStudy: 'ابدأ الدراسة',
    continueStudy: 'تابع الدراسة',
    mastery: 'إتقان',
    min: 'دقيقة',
    noDecks: 'لا توجد مجموعات بطاقات',
    noDecksSub: 'ستظهر مجموعات البطاقات هنا بعد نشرها من قِبل الإدارة.',
    accessRequired: 'الوصول مطلوب',
    accessRequiredSub: 'تحتاج إلى شراء حزمة نظام التعلم التي تتضمن بطاقات الفلاش للوصول إلى هذا المحتوى.',
    visitShop: 'زيارة المتجر',
    loading: 'جاري تحميل البطاقات...',
    subLessons: 'دروس فرعية',
    decks: 'مجموعات',
    new: 'جديدة',
    reviewing: 'مراجعة',
    h: 'س',
  };
  const en: Record<string, string> = {
    backToLearning: 'Back to Learning System',
    flashcards: 'Flashcards',
    flashcardsSub: 'Spaced repetition for effective memorization',
    dueToday: 'Due Today',
    cardsToReview: 'cards to review',
    mastered: 'Mastered',
    ofTotal: 'of',
    cards: 'cards',
    learning: 'Learning',
    inProgress: 'in progress',
    studyStreak: 'Study Streak',
    best: 'best',
    days: 'days',
    studyTime: 'Study Time',
    totalTime: 'total time',
    dueAlert: 'Cards Due for Review',
    dueAlertSub: 'You have {n} cards that need review today. Click on any deck to start studying!',
    introduction: 'Introduction',
    introSub: 'Foundation cards to get started',
    behavioral: 'Behavioural Competencies',
    behavioralSub: 'Soft skills and professional behaviours',
    knowledge: 'Knowledge-Based Competencies',
    knowledgeSub: 'Technical knowledge and expertise',
    additional: 'Additional Flashcards',
    decksAvailable: 'decks available',
    startStudy: 'Start Learning',
    continueStudy: 'Continue Studying',
    mastery: 'mastered',
    min: 'min',
    noDecks: 'No Flashcard Decks Available',
    noDecksSub: 'Flashcard decks will appear here once they are published by the admin.',
    accessRequired: 'Flashcards Access Required',
    accessRequiredSub: 'You need to purchase the Learning System package that includes Flashcards access.',
    visitShop: 'Visit Shop',
    loading: 'Loading flashcards...',
    subLessons: 'Sub-lessons',
    decks: 'Decks',
    new: 'New',
    reviewing: 'Reviewing',
    h: 'h',
  };
  return isAR ? (ar[key] ?? key) : (en[key] ?? key);
}

// ─── Deck Card ────────────────────────────────────────────────────────────────
interface DeckCardProps {
  deck: FlashcardDeckWithProgress;
  onClick: () => void;
}

function DeckCard({ deck, onClick }: DeckCardProps) {
  const progress = deck.progress;
  const totalProgress = progress
    ? progress.cards_new + progress.cards_learning + progress.cards_reviewing + progress.cards_mastered
    : 0;
  const masteryPct = totalProgress > 0 && deck.card_count > 0
    ? Math.round((progress!.cards_mastered / deck.card_count) * 100)
    : 0;
  const hasProgress = totalProgress > 0;
  const title = deck.title;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-[#dbeafe] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden group"
    >
      {/* Cover */}
      <div
        className="h-20 relative"
        style={
          deck.cover_image_url
            ? { backgroundImage: `url(${deck.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: 'linear-gradient(135deg, #1C4A8B 0%, #0d1f4e 100%)' }
        }
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-3 inset-x-4 flex items-end justify-between">
          <div className="text-white">
            <p className="text-2xl font-bold">{deck.card_count}</p>
            <p className="text-xs opacity-80">{t('cards', false)}</p>
          </div>
          {progress && progress.study_streak_days > 0 && (
            <div className="flex items-center gap-1 bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
              <Flame className="w-3 h-3" />
              {progress.study_streak_days}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-[#0d1f4e] text-sm line-clamp-2 mb-3 leading-snug">{title}</h3>

        {hasProgress && (
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{masteryPct}% {t('mastery', false)}</span>
              <span>{progress!.cards_mastered}/{deck.card_count}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="bg-green-500 h-full" style={{ width: `${(progress!.cards_mastered / deck.card_count) * 100}%` }} />
              <div className="bg-[#0f91e0] h-full" style={{ width: `${(progress!.cards_reviewing / deck.card_count) * 100}%` }} />
              <div className="bg-amber-400 h-full" style={{ width: `${(progress!.cards_learning / deck.card_count) * 100}%` }} />
            </div>
          </div>
        )}

        {deck.estimated_study_time_minutes && (
          <div className="flex items-center gap-1 text-slate-400 text-xs mt-2">
            <Clock className="w-3 h-3" />
            {deck.estimated_study_time_minutes} {t('min', false)}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-4 py-3 border-t border-[#f0f6ff] flex items-center justify-between group-hover:bg-[#f0f6ff] transition-colors">
        <span className="text-sm font-semibold text-[#1C4A8B] flex items-center gap-1.5">
          {hasProgress
            ? <><RotateCcw className="w-3.5 h-3.5" />{t('continueStudy', false)}</>
            : <><Play className="w-3.5 h-3.5 fill-current" />{t('startStudy', false)}</>
          }
        </span>
        <ChevronLeft className="w-4 h-4 text-slate-300 rotate-180" />
      </div>
    </div>
  );
}

// ─── Accordion Section ────────────────────────────────────────────────────────
function AccordionSection({
  title, subtitle, icon, color, count, children, defaultOpen = false,
}: {
  title: string; subtitle: string; icon: React.ReactNode; color: string;
  count: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-[#dbeafe] shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-[#f8faff] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
          <div className="text-right">
            <h2 className="font-bold text-[#0d1f4e] text-base">{title}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#1C4A8B] bg-[#f0f6ff] border border-[#dbeafe] px-3 py-1 rounded-full">{count}</span>
          {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ─── Competency Sub-Accordion ─────────────────────────────────────────────────
function CompetencyAccordion({
  competencyName, subUnits, basePath,
}: {
  competencyName: string;
  subUnits: Record<string, FlashcardDeckWithProgress[]>;
  basePath: string;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const totalDecks = Object.values(subUnits).reduce((s, arr) => s + arr.length, 0);

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
          <span className="text-xs text-slate-400">{Object.keys(subUnits).length} {t('subLessons', false)} · {totalDecks} {t('decks', false)}</span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="p-4 space-y-4">
          {Object.entries(subUnits).map(([subUnitId, decks]) => {
            const subUnit = decks[0]?.sub_unit;
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
                  {decks.map((deck) => (
                    <DeckCard
                      key={deck.id}
                      deck={deck}
                      onClick={() => navigate(`${basePath}/flashcards/${deck.id}`)}
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
export function FlashcardsDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const basePath = useMemo(() => {
    return location.pathname.startsWith('/ecp/') ? '/ecp/learning-system' : '/learning-system';
  }, [location.pathname]);

  const { data: accessSummary, isLoading: accessSummaryLoading } = useUserAccesses(user?.id);
  const { data: hasFlashcardsAccess, isLoading: accessLoading } = useFlashcardsAccess(user?.id, 'EN');
  const { data: languageAccess, isLoading: languageAccessLoading } = useLanguageAccess(user?.id, 'EN');

  const certificationType = languageAccess?.certification_type || 'CP';

  const { data: decks, isLoading: isLoadingDecks } = useDecksWithProgress(user?.id, certificationType, 'en');
  const { data: stats } = useFlashcardStats(user?.id, certificationType, 'en');

  const groupedDecks = useMemo(() => {
    if (!decks) return { introduction: [], knowledge: {}, behavioural: {}, standalone: [] };
    const introDecks: FlashcardDeckWithProgress[] = [];
    const knowledge: Record<string, Record<string, FlashcardDeckWithProgress[]>> = {};
    const behavioural: Record<string, Record<string, FlashcardDeckWithProgress[]>> = {};
    const standalone: FlashcardDeckWithProgress[] = [];

    decks.forEach((deck) => {
      if (deck.section_type === 'introduction') { introDecks.push(deck); return; }
      if (deck.competency && deck.sub_unit) {
        const cId = deck.competency.id;
        const sId = deck.sub_unit.id;
        if (deck.section_type === 'knowledge') {
          if (!knowledge[cId]) knowledge[cId] = {};
          if (!knowledge[cId][sId]) knowledge[cId][sId] = [];
          knowledge[cId][sId].push(deck);
        } else {
          if (!behavioural[cId]) behavioural[cId] = {};
          if (!behavioural[cId][sId]) behavioural[cId][sId] = [];
          behavioural[cId][sId].push(deck);
        }
      } else {
        standalone.push(deck);
      }
    });
    return { introduction: introDecks, knowledge, behavioural, standalone };
  }, [decks]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (accessSummaryLoading || accessLoading || languageAccessLoading || isLoadingDecks) {
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
  if (!hasFlashcardsAccess) {
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
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <span className="text-white/70 text-sm font-medium">BDA Learning System</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-2">{t('flashcards', false)}</h1>
              <p className="text-white/70 text-base">{t('flashcardsSub', false)}</p>
            </div>

            {/* Stats */}
            {stats && (
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: <Calendar className="w-4 h-4" />, value: stats.cardsDueToday, label: t('dueToday', false) },
                  { icon: <CheckCircle className="w-4 h-4" />, value: stats.cardsMastered, label: t('mastered', false) },
                  { icon: <TrendingUp className="w-4 h-4" />, value: stats.cardsLearning + stats.cardsReviewing, label: t('learning', false) },
                  { icon: <Flame className="w-4 h-4" />, value: stats.studyStreak, label: t('studyStreak', false) },
                  { icon: <Clock className="w-4 h-4" />, value: `${Math.floor(stats.totalStudyTimeMinutes / 60)}${t('h', false)}`, label: t('studyTime', false) },
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20 min-w-[80px]">
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

        {/* Due Today Alert */}
        {stats && stats.cardsDueToday > 0 && (
          <div className="rounded-2xl p-5 text-white flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)' }}>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
            <h2 className="font-bold text-lg">{t('dueAlert', false)}</h2>
            <p className="text-white/80 text-sm mt-0.5">
              {t('dueAlertSub', false).replace('{n}', String(stats.cardsDueToday))}
              </p>
            </div>
          </div>
        )}

        {/* Introduction */}
        {groupedDecks.introduction.length > 0 && (
          <AccordionSection
            title={t('introduction', false)}
            subtitle={t('introSub', false)}
            icon={<BookOpen className="w-5 h-5 text-slate-600" />}
            color="bg-slate-100"
            count={groupedDecks.introduction.length}
            defaultOpen
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {groupedDecks.introduction.map((deck) => (
                <DeckCard key={deck.id} deck={deck}
                  onClick={() => navigate(`${basePath}/flashcards/${deck.id}`)} />
              ))}
            </div>
          </AccordionSection>
        )}

        {/* Behavioural */}
        {Object.keys(groupedDecks.behavioural).length > 0 && (
          <AccordionSection
            title={t('behavioral', false)}
            subtitle={`${Object.keys(groupedDecks.behavioural).length} Competencies`}
            icon={<Layers className="w-5 h-5 text-purple-600" />}
            color="bg-purple-50"
            count={Object.values(groupedDecks.behavioural).reduce((s, sub) => s + Object.values(sub).reduce((ss, arr) => ss + arr.length, 0), 0)}
            defaultOpen
          >
            <div className="mt-2 space-y-2">
              {Object.entries(groupedDecks.behavioural).map(([cId, subUnits]) => {
                const firstDeck = Object.values(subUnits)[0]?.[0];
                const competency = firstDeck?.competency;
                if (!competency) return null;
                const name = competency.competency_name;
                return <CompetencyAccordion key={cId} competencyName={name} subUnits={subUnits} basePath={basePath} />;
              })}
            </div>
          </AccordionSection>
        )}

        {/* Knowledge */}
        {Object.keys(groupedDecks.knowledge).length > 0 && (
          <AccordionSection
            title={t('knowledge', false)}
            subtitle={`${Object.keys(groupedDecks.knowledge).length} Competencies`}
            icon={<Brain className="w-5 h-5 text-blue-600" />}
            color="bg-blue-50"
            count={Object.values(groupedDecks.knowledge).reduce((s, sub) => s + Object.values(sub).reduce((ss, arr) => ss + arr.length, 0), 0)}
            defaultOpen
          >
            <div className="mt-2 space-y-2">
              {Object.entries(groupedDecks.knowledge).map(([cId, subUnits]) => {
                const firstDeck = Object.values(subUnits)[0]?.[0];
                const competency = firstDeck?.competency;
                if (!competency) return null;
                const name = competency.competency_name;
                return <CompetencyAccordion key={cId} competencyName={name} subUnits={subUnits} basePath={basePath} />;
              })}
            </div>
          </AccordionSection>
        )}

        {/* Standalone */}
        {groupedDecks.standalone.length > 0 && (
          <AccordionSection
            title={t('additional', false)}
            subtitle={`${groupedDecks.standalone.length} ${t('decksAvailable', false)}`}
            icon={<Star className="w-5 h-5 text-amber-600" />}
            color="bg-amber-50"
            count={groupedDecks.standalone.length}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {groupedDecks.standalone.map((deck) => (
                <DeckCard key={deck.id} deck={deck}
                  onClick={() => navigate(`${basePath}/flashcards/${deck.id}`)} />
              ))}
            </div>
          </AccordionSection>
        )}

        {/* Empty State */}
        {decks?.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#dbeafe]">
            <Layers className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#0d1f4e] mb-2">{t('noDecks', false)}</h2>
            <p className="text-slate-400 mb-6 text-sm">{t('noDecksSub', false)}</p>
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
