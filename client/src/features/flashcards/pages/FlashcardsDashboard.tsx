/**
 * Flashcards Dashboard — Redesigned 2026
 * - No hero section (Shell provides navigation)
 * - Page header: compact title + stats bar
 * - Competencies open by default with 3-column deck grid
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
  Layers,
  CheckCircle,
  Clock,
  Flame,
  Calendar,
  TrendingUp,
  Lock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  Brain,
  Star,
} from 'lucide-react';

// ─── Deck Card ────────────────────────────────────────────────────────────────
interface DeckCardProps {
  deck: FlashcardDeckWithProgress;
  onClick: () => void;
}

function DeckCard({ deck, onClick }: DeckCardProps) {
  const progress = deck.progress;
  const masteryPct =
    deck.card_count > 0 && progress
      ? Math.round((progress.cards_mastered / deck.card_count) * 100)
      : 0;
  const hasProgress = progress
    ? progress.cards_new + progress.cards_learning + progress.cards_reviewing + progress.cards_mastered > 0
    : false;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-[#dbeafe] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden group flex flex-col"
    >
      {/* Cover strip */}
      <div
        className="h-16 relative flex-shrink-0"
        style={
          deck.cover_image_url
            ? { backgroundImage: `url(${deck.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: '#0f91e0' }
        }
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute bottom-2 left-3 flex items-end gap-2">
          <span className="text-white font-bold text-xl leading-none">{deck.card_count}</span>
          <span className="text-white/70 text-xs mb-0.5">cards</span>
        </div>
        {progress && progress.study_streak_days > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-orange-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
            <Flame className="w-2.5 h-2.5" />
            {progress.study_streak_days}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-[#0d1f4e] text-sm line-clamp-2 leading-snug flex-1">
          {deck.title}
        </h3>

        {hasProgress && (
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>{masteryPct}% mastered</span>
              <span>{progress!.cards_mastered}/{deck.card_count}</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="bg-[#0f91e0] h-full" style={{ width: `${(progress!.cards_mastered / deck.card_count) * 100}%` }} />
              <div className="bg-[#0f91e0] h-full" style={{ width: `${(progress!.cards_reviewing / deck.card_count) * 100}%` }} />
              <div className="bg-[#7cb9e8] h-full" style={{ width: `${(progress!.cards_learning / deck.card_count) * 100}%` }} />
            </div>
          </div>
        )}

        {deck.estimated_study_time_minutes && (
          <div className="flex items-center gap-1 text-slate-400 text-[10px] mt-1.5">
            <Clock className="w-3 h-3" />
            {deck.estimated_study_time_minutes} min
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-3 py-2 border-t border-[#f0f6ff] flex items-center gap-1.5 group-hover:bg-[#f0f6ff] transition-colors">
        {hasProgress
          ? <><RotateCcw className="w-3 h-3 text-[#0f91e0]" /><span className="text-xs font-semibold text-[#0f91e0]">Continue</span></>
          : <><Play className="w-3 h-3 fill-[#0f91e0] text-[#0f91e0]" /><span className="text-xs font-semibold text-[#0f91e0]">Start Learning</span></>
        }
      </div>
    </div>
  );
}

// ─── Competency Row ────────────────────────────────────────────────────────────
function CompetencyRow({
  competencyName,
  subUnits,
  basePath,
  defaultOpen = false,
}: {
  competencyName: string;
  subUnits: Record<string, FlashcardDeckWithProgress[]>;
  basePath: string;
  defaultOpen?: boolean;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(defaultOpen);
  const totalDecks = Object.values(subUnits).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="border border-[#dbeafe] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-[#f8faff] hover:bg-[#f0f6ff] transition-colors"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-[#1C4A8B] flex-shrink-0" />
          <span className="font-semibold text-[#0d1f4e] text-sm text-left">{competencyName}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-400 hidden sm:block">{totalDecks} decks</span>
          {open
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />
          }
        </div>
      </button>

      {open && (
        <div className="p-4 bg-white">
          {/* All decks for this competency in a single 3-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(subUnits).flatMap(([subUnitId, decks]) =>
              decks.map((deck) => {
                const subUnit = deck.sub_unit;
                return (
                  <div key={deck.id} className="flex flex-col gap-1">
                    {/* Lesson label above each deck card */}
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="w-4 h-4 rounded-full bg-[#0f91e0] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                        {subUnit?.order_index ?? ''}
                      </span>
                      <p className="text-[10px] font-semibold text-slate-400 truncate">{subUnit?.title ?? ''}</p>
                    </div>
                    <DeckCard
                      deck={deck}
                      onClick={() => navigate(`${basePath}/flashcards/${deck.id}`)}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Category Section ──────────────────────────────────────────────────────────
function CategorySection({
  title,
  subtitle,
  icon,
  accentColor,
  count,
  children,
  defaultOpen = true,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-[#dbeafe] shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#f8faff] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: accentColor + '18' }}
          >
            {icon}
          </div>
          <div className="text-left">
            <h2 className="font-bold text-[#0d1f4e] text-base">{title}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-bold px-3 py-1 rounded-full border"
            style={{ color: accentColor, borderColor: accentColor + '40', background: accentColor + '10' }}
          >
            {count}
          </span>
          {open
            ? <ChevronUp className="w-5 h-5 text-slate-400" />
            : <ChevronDown className="w-5 h-5 text-slate-400" />
          }
        </div>
      </button>
      {open && <div className="px-6 pb-6 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function FlashcardsDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const basePath = useMemo(
    () => (location.pathname.startsWith('/ecp/') ? '/ecp/learning-system' : '/learning-system'),
    [location.pathname]
  );

  const { data: _accessSummary, isLoading: accessSummaryLoading } = useUserAccesses(user?.id);
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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (accessSummaryLoading || accessLoading || languageAccessLoading || isLoadingDecks) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#dbeafe] border-t-[#1C4A8B] animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium text-sm">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  // ── Access Denied ──────────────────────────────────────────────────────────
  if (!hasFlashcardsAccess) {
    return (
      <div className="flex items-center justify-center py-20 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-[#dbeafe] p-10 text-center">
          <div className="w-16 h-16 bg-[#0f91e0] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#0d1f4e] mb-3">Flashcards Access Required</h2>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed">
            You need to purchase the Learning System package that includes Flashcards access.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate(basePath)}
              className="w-full bg-[#0f91e0] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#1C4A8B] transition-colors"
            >
              Back to Learning System
            </button>
            <button
              onClick={() => (window.location.href = 'https://bda-global.org/shop')}
              className="w-full border border-[#0f91e0] text-[#0f91e0] font-semibold py-3 px-6 rounded-xl hover:bg-[#f0f6ff] transition-colors"
            >
              Visit Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#f8f9fb] min-h-full">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[#0f91e0] flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-[#0d1f4e]">Flashcards</h1>
            </div>
            <p className="text-sm text-slate-400 ml-10">Spaced repetition for effective memorization</p>
          </div>

          {/* Stats pills */}
          {stats && (
            <div className="flex flex-wrap gap-2">
              {[
                { icon: <Calendar className="w-3.5 h-3.5" />, value: stats.cardsDueToday, label: 'Due Today', highlight: stats.cardsDueToday > 0 },
                { icon: <CheckCircle className="w-3.5 h-3.5" />, value: stats.cardsMastered, label: 'Mastered', highlight: false },
                { icon: <TrendingUp className="w-3.5 h-3.5" />, value: stats.cardsLearning + stats.cardsReviewing, label: 'In Progress', highlight: false },
                { icon: <Flame className="w-3.5 h-3.5" />, value: stats.studyStreak, label: 'Streak', highlight: false },
                { icon: <Clock className="w-3.5 h-3.5" />, value: `${Math.floor(stats.totalStudyTimeMinutes / 60)}h`, label: 'Study Time', highlight: false },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
                    s.highlight
                      ? 'bg-[#0f91e0] text-white border-[#0f91e0]'
                      : 'bg-white text-[#0d1f4e] border-[#dbeafe]'
                  }`}
                >
                  <span className={s.highlight ? 'text-white' : 'text-[#0f91e0]'}>{s.icon}</span>
                  <span className="font-bold">{s.value}</span>
                  <span className={s.highlight ? 'text-white/80' : 'text-slate-400'}>{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Due Today Alert ───────────────────────────────────────────── */}
        {stats && stats.cardsDueToday > 0 && (
          <div className="rounded-xl p-4 flex items-center gap-3 border border-[#0f91e0]/30 bg-[#0f91e0]/5">
            <div className="w-9 h-9 rounded-lg bg-[#0f91e0] flex items-center justify-center flex-shrink-0">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-[#0d1f4e] text-sm">Cards Due for Review</p>
              <p className="text-slate-500 text-xs mt-0.5">
                You have {stats.cardsDueToday} cards that need review today. Click on any deck to start studying!
              </p>
            </div>
          </div>
        )}

        {/* ── Introduction ──────────────────────────────────────────────── */}
        {groupedDecks.introduction.length > 0 && (
          <CategorySection
            title="Introduction"
            subtitle="Foundation cards to get started"
            icon={<BookOpen className="w-5 h-5 text-slate-500" />}
            accentColor="#64748b"
            count={groupedDecks.introduction.length}
            defaultOpen
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {groupedDecks.introduction.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onClick={() => navigate(`${basePath}/flashcards/${deck.id}`)}
                />
              ))}
            </div>
          </CategorySection>
        )}

        {/* ── Behavioural Competencies ───────────────────────────────────── */}
        {Object.keys(groupedDecks.behavioural).length > 0 && (
          <CategorySection
            title="Behavioural Competencies"
            subtitle={`${Object.keys(groupedDecks.behavioural).length} Competencies · Soft skills and professional behaviours`}
            icon={<Layers className="w-5 h-5 text-[#1C4A8B]" />}
            accentColor="#1C4A8B"
            count={Object.values(groupedDecks.behavioural).reduce(
              (s, sub) => s + Object.values(sub).reduce((ss, arr) => ss + arr.length, 0), 0
            )}
            defaultOpen
          >
            {Object.entries(groupedDecks.behavioural).map(([cId, subUnits], idx) => {
              const firstDeck = Object.values(subUnits)[0]?.[0];
              const competency = firstDeck?.competency;
              if (!competency) return null;
              return (
                <CompetencyRow
                  key={cId}
                  competencyName={competency.competency_name}
                  subUnits={subUnits}
                  basePath={basePath}
                  defaultOpen={idx === 0}
                />
              );
            })}
          </CategorySection>
        )}

        {/* ── Knowledge-Based Competencies ──────────────────────────────── */}
        {Object.keys(groupedDecks.knowledge).length > 0 && (
          <CategorySection
            title="Knowledge-Based Competencies"
            subtitle={`${Object.keys(groupedDecks.knowledge).length} Competencies · Technical knowledge and expertise`}
            icon={<Brain className="w-5 h-5 text-[#0f91e0]" />}
            accentColor="#0f91e0"
            count={Object.values(groupedDecks.knowledge).reduce(
              (s, sub) => s + Object.values(sub).reduce((ss, arr) => ss + arr.length, 0), 0
            )}
            defaultOpen
          >
            {Object.entries(groupedDecks.knowledge).map(([cId, subUnits], idx) => {
              const firstDeck = Object.values(subUnits)[0]?.[0];
              const competency = firstDeck?.competency;
              if (!competency) return null;
              return (
                <CompetencyRow
                  key={cId}
                  competencyName={competency.competency_name}
                  subUnits={subUnits}
                  basePath={basePath}
                  defaultOpen={idx === 0}
                />
              );
            })}
          </CategorySection>
        )}

        {/* ── Standalone ────────────────────────────────────────────────── */}
        {groupedDecks.standalone.length > 0 && (
          <CategorySection
            title="Additional Flashcards"
            subtitle={`${groupedDecks.standalone.length} decks available`}
            icon={<Star className="w-5 h-5 text-[#0f91e0]" />}
            accentColor="#0f91e0"
            count={groupedDecks.standalone.length}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {groupedDecks.standalone.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onClick={() => navigate(`${basePath}/flashcards/${deck.id}`)}
                />
              ))}
            </div>
          </CategorySection>
        )}

        {/* ── Empty State ────────────────────────────────────────────────── */}
        {decks?.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#dbeafe]">
            <Layers className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#0d1f4e] mb-2">No Flashcard Decks Available</h2>
            <p className="text-slate-400 mb-6 text-sm">
              Flashcard decks will appear here once they are published by the admin.
            </p>
            <button
              onClick={() => navigate(basePath)}
              className="bg-[#0f91e0] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#1C4A8B] transition-colors"
            >
              Back to Learning System
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
