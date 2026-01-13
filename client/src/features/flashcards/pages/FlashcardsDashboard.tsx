/**
 * Flashcards Dashboard
 * Shows all flashcard decks organized by competency with user progress
 * Requires language-based access (EN or AR)
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  useDecksWithProgress,
  useFlashcardStats,
} from '@/entities/flashcards';
import {
  useFlashcardsAccess,
  useUserAccesses,
  useLanguageAccess,
  type Language,
} from '@/entities/curriculum';
import type { FlashcardDeckWithProgress } from '@/entities/flashcards';
import {
  ArrowLeft,
  Layers,
  CheckCircle,
  Clock,
  Flame,
  Star,
  ChevronRight,
  Brain,
  Calendar,
  TrendingUp,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeckCardProps {
  deck: FlashcardDeckWithProgress;
  onClick: () => void;
}

function DeckCard({ deck, onClick }: DeckCardProps) {
  const progress = deck.progress;
  const totalProgress = progress
    ? progress.cards_new +
      progress.cards_learning +
      progress.cards_reviewing +
      progress.cards_mastered
    : 0;
  const masteryPercentage =
    totalProgress > 0
      ? Math.round((progress!.cards_mastered / deck.card_count) * 100)
      : 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
    >
      {/* Header with cover image or gradient */}
      <div
        className="h-24 bg-gradient-to-br from-purple-500 to-indigo-600 relative"
        style={
          deck.cover_image_url
            ? {
                backgroundImage: `url(${deck.cover_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <div className="text-white">
            <p className="text-2xl font-bold">{deck.card_count}</p>
            <p className="text-xs opacity-90">cards</p>
          </div>
          {progress && progress.study_streak_days > 0 && (
            <div className="flex items-center gap-1 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              <Flame className="w-3 h-3" />
              {progress.study_streak_days} day streak
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
          {deck.title}
        </h3>
        {deck.title_ar && (
          <p className="text-sm text-gray-500 line-clamp-1" dir="rtl">
            {deck.title_ar}
          </p>
        )}

        {/* Progress Bars */}
        {progress && totalProgress > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{masteryPercentage}% mastered</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
              <div
                className="bg-green-500"
                style={{
                  width: `${(progress.cards_mastered / deck.card_count) * 100}%`,
                }}
              />
              <div
                className="bg-blue-500"
                style={{
                  width: `${(progress.cards_reviewing / deck.card_count) * 100}%`,
                }}
              />
              <div
                className="bg-yellow-500"
                style={{
                  width: `${(progress.cards_learning / deck.card_count) * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-500">
                  Mastered: {progress.cards_mastered}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-gray-500">
                  Reviewing: {progress.cards_reviewing}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-gray-500">
                  Learning: {progress.cards_learning}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm">
          {deck.estimated_study_time_minutes && (
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{deck.estimated_study_time_minutes} min</span>
            </div>
          )}
          {progress?.last_studied_at && (
            <div className="flex items-center gap-1 text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(progress.last_studied_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
        <span className="text-sm font-medium text-purple-600">
          {progress ? 'Continue Studying' : 'Start Learning'}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}

export function FlashcardsDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Get language from URL params (passed from main Learning System dashboard)
  // This ensures isolation - once user enters EN or AR system, they stay in that language
  const langFromUrl = searchParams.get('lang') as Language | null;
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(langFromUrl || 'EN');

  // Sync with URL param changes
  useEffect(() => {
    if (langFromUrl && langFromUrl !== selectedLanguage) {
      setSelectedLanguage(langFromUrl);
    }
  }, [langFromUrl]);

  // Detect base path for navigation (ECP vs Individual learning system)
  const basePath = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/ecp/learning-system')) {
      return '/ecp/learning-system';
    }
    return '/learning-system';
  }, [location.pathname]);

  // Get all user accesses to determine available languages
  const { data: accessSummary, isLoading: accessSummaryLoading } = useUserAccesses(
    user?.id
  );

  // Check Flashcards access for selected language
  const {
    data: hasFlashcardsAccess,
    isLoading: accessLoading,
  } = useFlashcardsAccess(user?.id, selectedLanguage);

  // Get language access to determine certification type
  const {
    data: languageAccess,
    isLoading: languageAccessLoading,
  } = useLanguageAccess(user?.id, selectedLanguage);

  // Determine certification type from language access (or default to CP)
  const certificationType = languageAccess?.certification_type || 'CP';

  // Convert uppercase language to lowercase for database query
  const dbLanguage = selectedLanguage.toLowerCase() as 'en' | 'ar';

  // Get decks with progress (filtered by language)
  const { data: decks, isLoading: isLoadingDecks } = useDecksWithProgress(
    user?.id,
    certificationType,
    dbLanguage
  );

  // Get user stats (filtered by language)
  const { data: stats } = useFlashcardStats(user?.id, certificationType, dbLanguage);

  // Group decks hierarchically: Section → Competency → Sub-lesson → Decks
  // Also includes standalone decks that don't have full hierarchy linkage
  const groupedDecks = useMemo(() => {
    if (!decks) return { introduction: [], knowledge: {}, behavioral: {}, standalone: [] };

    const introDecks: FlashcardDeckWithProgress[] = [];
    const knowledge: Record<string, Record<string, FlashcardDeckWithProgress[]>> = {};
    const behavioral: Record<string, Record<string, FlashcardDeckWithProgress[]>> = {};
    const standalone: FlashcardDeckWithProgress[] = [];

    decks.forEach((deck) => {
      // Introduction decks (no hierarchy required)
      if (deck.section_type === 'introduction') {
        introDecks.push(deck);
        return;
      }

      // Decks with competency and sub-lesson hierarchy
      if (deck.competency && deck.sub_unit) {
        const competencyId = deck.competency.id;
        const subUnitId = deck.sub_unit.id;
        const sectionType = deck.section_type;

        if (sectionType === 'knowledge') {
          if (!knowledge[competencyId]) knowledge[competencyId] = {};
          if (!knowledge[competencyId][subUnitId]) knowledge[competencyId][subUnitId] = [];
          knowledge[competencyId][subUnitId].push(deck);
        } else if (sectionType === 'behavioral') {
          if (!behavioral[competencyId]) behavioral[competencyId] = {};
          if (!behavioral[competencyId][subUnitId]) behavioral[competencyId][subUnitId] = [];
          behavioral[competencyId][subUnitId].push(deck);
        }
      } else {
        // Decks without full hierarchy linkage go to standalone section
        standalone.push(deck);
      }
    });

    return { introduction: introDecks, knowledge, behavioral, standalone };
  }, [decks]);

  // Loading states
  if (accessSummaryLoading || accessLoading || languageAccessLoading || isLoadingDecks) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  // Access denied state
  if (!hasFlashcardsAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Flashcards Access Required
            </h2>
            <p className="text-gray-600 mb-6">
              You need to purchase the Learning System ({selectedLanguage}) package that
              includes Flashcards access to view this content.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate(basePath)}
                className="w-full"
              >
                Back to Learning System
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = 'https://bda-global.org/shop'}
                className="w-full"
              >
                Visit Shop
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(basePath)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Learning System
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Layers className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Flashcards</h1>
              <p className="text-gray-600">
                Spaced repetition for effective memorization
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-4 border">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">
                  Due Today
                </span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {stats.cardsDueToday}
              </p>
              <p className="text-xs text-gray-500">cards to review</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  Mastered
                </span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {stats.cardsMastered}
              </p>
              <p className="text-xs text-gray-500">of {stats.totalCards} cards</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  Learning
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {stats.cardsLearning + stats.cardsReviewing}
              </p>
              <p className="text-xs text-gray-500">in progress</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border">
              <div className="flex items-center gap-3 mb-2">
                <Flame className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-gray-700">
                  Study Streak
                </span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {stats.studyStreak}
              </p>
              <p className="text-xs text-gray-500">
                best: {stats.longestStreak} days
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">
                  Study Time
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {Math.floor(stats.totalStudyTimeMinutes / 60)}h
              </p>
              <p className="text-xs text-gray-500">total time</p>
            </div>
          </div>
        )}

        {/* Cards Due Today Alert */}
        {stats && stats.cardsDueToday > 0 && (
          <div className="mb-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-6 h-6" />
              <h2 className="text-xl font-bold">Cards Due for Review</h2>
            </div>
            <p className="opacity-90">
              You have {stats.cardsDueToday} cards that need review today.
              Click on any deck below to start studying and keep your streak going!
            </p>
          </div>
        )}

        {/* Introduction Section */}
        {groupedDecks.introduction.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">📖</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Introduction</h2>
                <p className="text-sm text-gray-600">
                  Foundation cards to get started
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedDecks.introduction.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onClick={() =>
                    navigate(`${basePath}/flashcards/${deck.id}`)
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Behavioral Competencies FIRST (per BDA BoCK structure) */}
        {Object.keys(groupedDecks.behavioral).length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">💼</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Behavioral Competencies
                </h2>
                <p className="text-sm text-gray-600">
                  Soft skills and professional behaviors
                </p>
              </div>
            </div>

            {/* Render each competency as an accordion group */}
            <div className="space-y-6">
              {Object.entries(groupedDecks.behavioral).map(([competencyId, subUnits]) => {
                // Get competency name from any deck in this group
                const sampleDeck = Object.values(subUnits)[0]?.[0];
                const competencyName = selectedLanguage === 'AR'
                  ? sampleDeck?.competency?.competency_name_ar || sampleDeck?.competency?.competency_name
                  : sampleDeck?.competency?.competency_name;

                return (
                  <div key={competencyId} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <div className="bg-purple-50 px-4 py-3 border-b">
                      <h3 className="font-semibold text-purple-900" dir={selectedLanguage === 'AR' ? 'rtl' : 'ltr'}>
                        {competencyName}
                      </h3>
                    </div>

                    {/* Sub-lessons within competency */}
                    <div className="divide-y">
                      {Object.entries(subUnits).map(([subUnitId, subUnitDecks]) => {
                        const subUnitTitle = selectedLanguage === 'AR'
                          ? subUnitDecks[0]?.sub_unit?.title_ar || subUnitDecks[0]?.sub_unit?.title
                          : subUnitDecks[0]?.sub_unit?.title;

                        return (
                          <div key={subUnitId} className="p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3" dir={selectedLanguage === 'AR' ? 'rtl' : 'ltr'}>
                              {subUnitTitle}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {subUnitDecks.map((deck) => (
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Knowledge-Based Competencies SECOND */}
        {Object.keys(groupedDecks.knowledge).length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Knowledge-Based Competencies
                </h2>
                <p className="text-sm text-gray-600">
                  Technical knowledge and expertise
                </p>
              </div>
            </div>

            {/* Render each competency as an accordion group */}
            <div className="space-y-6">
              {Object.entries(groupedDecks.knowledge).map(([competencyId, subUnits]) => {
                // Get competency name from any deck in this group
                const sampleDeck = Object.values(subUnits)[0]?.[0];
                const competencyName = selectedLanguage === 'AR'
                  ? sampleDeck?.competency?.competency_name_ar || sampleDeck?.competency?.competency_name
                  : sampleDeck?.competency?.competency_name;

                return (
                  <div key={competencyId} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <div className="bg-blue-50 px-4 py-3 border-b">
                      <h3 className="font-semibold text-blue-900" dir={selectedLanguage === 'AR' ? 'rtl' : 'ltr'}>
                        {competencyName}
                      </h3>
                    </div>

                    {/* Sub-lessons within competency */}
                    <div className="divide-y">
                      {Object.entries(subUnits).map(([subUnitId, subUnitDecks]) => {
                        const subUnitTitle = selectedLanguage === 'AR'
                          ? subUnitDecks[0]?.sub_unit?.title_ar || subUnitDecks[0]?.sub_unit?.title
                          : subUnitDecks[0]?.sub_unit?.title;

                        return (
                          <div key={subUnitId} className="p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3" dir={selectedLanguage === 'AR' ? 'rtl' : 'ltr'}>
                              {subUnitTitle}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {subUnitDecks.map((deck) => (
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Standalone Decks (not linked to competency hierarchy) */}
        {groupedDecks.standalone.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Additional Flashcards
                </h2>
                <p className="text-sm text-gray-600">
                  {groupedDecks.standalone.length} deck{groupedDecks.standalone.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedDecks.standalone.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onClick={() => navigate(`${basePath}/flashcards/${deck.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {decks?.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Flashcard Decks Available
            </h2>
            <p className="text-gray-600 mb-6">
              Flashcard decks will appear here once they are published by the
              admin.
            </p>
            <Button onClick={() => navigate(basePath)}>
              Back to Learning System
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
