/**
 * Flashcards Dashboard — BDA Learning System
 * Shared flashcard experience for BDA-CP and BDA-SCP learning paths.
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
import { BDAAbstractHero } from '@/components/BDAAbstractHero';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle,
  Clock,
  Flame,
  Layers,
  Lock,
  Play,
  RotateCcw,
  Star,
  TrendingUp,
} from 'lucide-react';

interface DeckCardProps {
  deck: FlashcardDeckWithProgress;
  onClick: () => void;
}

function DeckCard({ deck, onClick }: DeckCardProps) {
  const progress = deck.progress;
  const masteryPct = deck.card_count > 0 && progress
    ? Math.round((progress.cards_mastered / deck.card_count) * 100)
    : 0;
  const hasProgress = progress
    ? progress.cards_new + progress.cards_learning + progress.cards_reviewing + progress.cards_mastered > 0
    : false;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[226px] w-full flex-col overflow-hidden rounded-2xl border border-[#dbeafe] bg-white p-5 text-left shadow-[0_3px_12px_rgba(13,31,78,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-[#0f91e0]/60 hover:shadow-[0_14px_28px_rgba(13,31,78,0.12)] focus:outline-none focus:ring-2 focus:ring-[#0f91e0]/50"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0]" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f0f6ff] text-[#0f91e0]"
            style={deck.cover_image_url ? { backgroundImage: `url(${deck.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          >
            {!deck.cover_image_url && <Layers className="h-4 w-4" />}
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.11em] text-[#0f91e0]">Flashcard deck</span>
        </div>
        {masteryPct === 100 && deck.card_count > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e8f4fd] px-2 py-1 text-[11px] font-bold text-[#0f91e0]">
            <CheckCircle className="h-3 w-3" />
            Mastered
          </span>
        )}
      </div>

      <h3 className="mt-4 line-clamp-2 text-[15px] font-bold leading-snug text-[#0d1f4e]">{deck.title}</h3>

      <div className="mt-5 grid grid-cols-3 divide-x divide-[#e6effb] rounded-xl bg-[#f8faff] py-3">
        <div className="px-2 text-center">
          <p className="text-base font-bold text-[#0d1f4e]">{deck.card_count}</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-400">Cards</p>
        </div>
        <div className="px-2 text-center">
          <p className="text-base font-bold text-[#0f91e0]">{masteryPct}%</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-400">Mastered</p>
        </div>
        <div className="px-2 text-center">
          <p className="text-base font-bold text-[#0d1f4e]">{progress?.cards_learning || 0}</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-400">Learning</p>
        </div>
      </div>

      {hasProgress && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-slate-400">
            <span>Study progress</span>
            <span className="font-bold text-[#0f91e0]">{progress!.cards_mastered}/{deck.card_count}</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-[#e6effb]">
            <div className="h-full bg-[#0f91e0]" style={{ width: `${(progress!.cards_mastered / deck.card_count) * 100}%` }} />
            <div className="h-full bg-[#7cb9e8]" style={{ width: `${(progress!.cards_reviewing / deck.card_count) * 100}%` }} />
            <div className="h-full bg-[#c6e4fb]" style={{ width: `${(progress!.cards_learning / deck.card_count) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-5 text-sm font-bold text-[#0f91e0]">
        <span className="inline-flex items-center gap-2">
          {hasProgress ? <RotateCcw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          {hasProgress ? 'Continue' : 'Start Learning'}
        </span>
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
      </div>
    </button>
  );
}

type DeckGroups = Record<string, Record<string, FlashcardDeckWithProgress[]>>;

function ModuleDirectory({
  title,
  description,
  icon,
  groups,
  basePath,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  groups: DeckGroups;
  basePath: string;
}) {
  const navigate = useNavigate();
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  const modules = Object.entries(groups)
    .map(([id, subUnits]) => {
      const firstDeck = Object.values(subUnits)[0]?.[0];
      const competency = firstDeck?.competency;
      const decks = Object.entries(subUnits)
        .sort(([keyA, a], [keyB, b]) => {
          if (keyA === '__no_sub__') return -1;
          if (keyB === '__no_sub__') return 1;
          return (a[0]?.sub_unit?.order_index || 0) - (b[0]?.sub_unit?.order_index || 0);
        })
        .flatMap(([, value]) => value);
      return competency ? { id, name: competency.competency_name, order: competency.order_index ?? 999, decks } : null;
    })
    .filter((entry): entry is { id: string; name: string; order: number; decks: FlashcardDeckWithProgress[] } => entry !== null)
    .sort((a, b) => a.order - b.order);

  const activeModule = modules.find((module) => module.id === activeModuleId) || modules[0];

  if (!activeModule) return null;

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
          {modules.length} Modules
        </span>
      </div>

      <div className="grid lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,2.1fr)]">
        <div className="border-b border-white/15 bg-gradient-to-br from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0] p-3 lg:border-b-0 lg:border-r lg:border-white/15">
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {modules.map((module, index) => {
              const active = activeModule.id === module.id;
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setActiveModuleId(module.id)}
                  className={`min-w-[240px] rounded-xl px-4 py-3.5 text-left transition-all lg:min-w-0 ${
                    active
                      ? 'bg-white text-[#0d1f4e] shadow-[0_6px_18px_rgba(0,0,0,0.18)] ring-1 ring-white/60'
                      : 'text-white/85 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${active ? 'bg-[#0f91e0] text-white' : 'bg-white/15 text-white'}`}>{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug">{module.name}</span>
                      <span className={`mt-1 block text-[11px] font-medium ${active ? 'text-slate-400' : 'text-white/65'}`}>{module.decks.length} decks</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 p-6 sm:p-8">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#0f91e0]">Selected module</p>
              <h3 className="mt-1 text-lg font-bold text-[#0d1f4e]">{activeModule.name}</h3>
            </div>
            <p className="text-xs font-semibold text-slate-400">{activeModule.decks.length} Flashcard decks</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeModule.decks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} onClick={() => navigate(`${basePath}/flashcards/${deck.id}`)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DeckCollection({
  title,
  description,
  icon,
  decks,
  basePath,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  decks: FlashcardDeckWithProgress[];
  basePath: string;
}) {
  const navigate = useNavigate();
  if (decks.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-[#dbeafe] bg-white shadow-[0_6px_20px_rgba(13,31,78,0.05)]">
      <div className="flex flex-col gap-4 border-b border-[#e6effb] bg-gradient-to-r from-[#f8faff] via-white to-[#f0f6ff] px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0d1f4e] text-white shadow-sm">{icon}</div>
          <div>
            <h2 className="text-lg font-bold text-[#0d1f4e]">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <span className="self-start rounded-full border border-[#dbeafe] bg-white px-3 py-1.5 text-xs font-bold text-[#1c4a8b] shadow-sm sm:self-auto">{decks.length} decks</span>
      </div>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
        {decks.map((deck) => (
          <DeckCard key={deck.id} deck={deck} onClick={() => navigate(`${basePath}/flashcards/${deck.id}`)} />
        ))}
      </div>
    </section>
  );
}

export function FlashcardsDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const basePath = useMemo(() => {
    if (location.pathname.startsWith('/ecp/')) return '/ecp/learning-system';
    if (location.pathname.startsWith('/instructor/')) return '/instructor/learning-system';
    return '/learning-system';
  }, [location.pathname]);

  const { data: _accessSummary, isLoading: accessSummaryLoading } = useUserAccesses(user?.id);
  const { data: hasFlashcardsAccess, isLoading: accessLoading } = useFlashcardsAccess(user?.id, 'EN');
  const { data: languageAccess, isLoading: languageAccessLoading } = useLanguageAccess(user?.id, 'EN');

  // Flashcards are shared learning content for both BDA certification levels.
  const certificationType = 'CP';
  const { data: decks, isLoading: isLoadingDecks } = useDecksWithProgress(user?.id, certificationType, 'en');
  const { data: stats } = useFlashcardStats(user?.id, certificationType, 'en');

  const groupedDecks = useMemo(() => {
    if (!decks) return { introduction: [], knowledge: {}, behavioural: {}, standalone: [] };

    const introduction: FlashcardDeckWithProgress[] = [];
    const knowledge: DeckGroups = {};
    const behavioural: DeckGroups = {};
    const standalone: FlashcardDeckWithProgress[] = [];

    decks.forEach((deck) => {
      if (deck.section_type === 'introduction') {
        introduction.push(deck);
        return;
      }
      if (deck.competency && deck.sub_unit) {
        const competencyId = deck.competency.id;
        const subUnitId = deck.sub_unit.id;
        const target = deck.section_type === 'knowledge' ? knowledge : behavioural;
        if (!target[competencyId]) target[competencyId] = {};
        if (!target[competencyId][subUnitId]) target[competencyId][subUnitId] = [];
        target[competencyId][subUnitId].push(deck);
        return;
      }
      standalone.push(deck);
    });

    return { introduction, knowledge, behavioural, standalone };
  }, [decks]);

  if (accessSummaryLoading || accessLoading || languageAccessLoading || isLoadingDecks) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb]">
        <div className="text-center">
          <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-[#dbeafe] border-t-[#0f91e0]" />
          <p className="font-medium text-slate-500">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  if (!hasFlashcardsAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] px-4">
        <div className="w-full max-w-md rounded-3xl border border-[#dbeafe] bg-white p-10 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f91e0] shadow-lg"><Lock className="h-8 w-8 text-white" /></div>
          <h2 className="mb-3 text-2xl font-bold text-[#0d1f4e]">Flashcards Access Required</h2>
          <p className="mb-8 text-sm leading-relaxed text-slate-500">You need to purchase the Learning System package that includes Flashcards access.</p>
          <div className="space-y-3">
            <button onClick={() => navigate(basePath)} className="w-full rounded-xl bg-[#0f91e0] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#1C4A8B]">Back to Learning System</button>
            <button onClick={() => (window.location.href = 'https://bda-global.org/shop')} className="w-full rounded-xl border border-[#dbeafe] px-6 py-3 font-semibold text-[#0f91e0] transition-colors hover:bg-[#f0f6ff]">Visit Shop</button>
          </div>
        </div>
      </div>
    );
  }

  const heroStats = stats ? [
    { icon: <Calendar className="mb-2 h-4 w-4 text-white/80" />, value: stats.cardsDueToday, label: 'Due Today' },
    { icon: <CheckCircle className="mb-2 h-4 w-4 text-white/80" />, value: stats.cardsMastered, label: 'Mastered' },
    { icon: <TrendingUp className="mb-2 h-4 w-4 text-white/80" />, value: stats.cardsLearning + stats.cardsReviewing, label: 'In Progress' },
    { icon: <Flame className="mb-2 h-4 w-4 text-white/80" />, value: stats.studyStreak, label: 'Day Streak' },
  ] : [];

  return (
    <div className="min-h-full bg-[#f8f9fb]">
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0] py-12 text-white sm:py-14">
        <BDAAbstractHero />
        <div className="relative mx-auto max-w-[1640px] px-6 sm:px-10 lg:px-16 xl:px-24">
          <button
            type="button"
            onClick={() => navigate(basePath)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/85 transition-colors hover:text-white"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Back to Learning System
          </button>

          <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm"><Layers className="h-6 w-6 text-white" /></div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Flashcards</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">Reinforce each BDA competency through focused, self-paced flashcard practice.</p>
            </div>

            {heroStats.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[610px]">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm">
                    {stat.icon}
                    <p className="text-lg font-bold leading-none">{stat.value}</p>
                    <p className="mt-1 text-[11px] font-medium text-white/70">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1640px] px-6 py-8 sm:px-10 sm:py-10 lg:px-16 xl:px-24">
        <div className="space-y-6">
          <DeckCollection
            title="Introduction"
            description="Foundation flashcards to help you get started."
            icon={<BookOpen className="h-5 w-5" />}
            decks={groupedDecks.introduction}
            basePath={basePath}
          />

          {Object.keys(groupedDecks.behavioural).length > 0 && (
            <ModuleDirectory
              title="Behavioural Competencies"
              description="Select a module to explore its focused flashcard decks."
              icon={<Layers className="h-6 w-6" />}
              groups={groupedDecks.behavioural}
              basePath={basePath}
            />
          )}

          {Object.keys(groupedDecks.knowledge).length > 0 && (
            <ModuleDirectory
              title="Knowledge-Based Competencies"
              description="Build applied knowledge across the BDA business development framework."
              icon={<Brain className="h-6 w-6" />}
              groups={groupedDecks.knowledge}
              basePath={basePath}
            />
          )}

          <DeckCollection
            title="Additional Flashcards"
            description="Explore supplementary decks to strengthen your preparation."
            icon={<Star className="h-5 w-5" />}
            decks={groupedDecks.standalone}
            basePath={basePath}
          />

          {decks?.length === 0 && (
            <div className="rounded-2xl border border-[#dbeafe] bg-white py-16 text-center">
              <Layers className="mx-auto mb-4 h-16 w-16 text-slate-200" />
              <h2 className="mb-2 text-xl font-bold text-[#0d1f4e]">No Flashcard Decks Available</h2>
              <p className="mb-6 text-sm text-slate-400">Flashcard decks will appear here once they are published by the admin.</p>
              <button onClick={() => navigate(basePath)} className="rounded-xl bg-[#0f91e0] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#1C4A8B]">Back to Learning System</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
