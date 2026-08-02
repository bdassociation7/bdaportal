/**
 * Flashcard Study Session
 * Interactive flashcard study with spaced repetition
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  useFlashcardDeck,
  useFlashcardsWithProgress,
  useRecordReview,
  useStartStudySession,
  useEndStudySession,
  useToggleCardFavourite,
} from '@/entities/flashcards';
import type {
  FlashcardWithProgress,
  StudyRating,
  StudySessionResult,
} from '@/entities/flashcards';
import {
  ArrowLeft,
  RotateCcw,
  Star,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  X,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FlashcardDisplayProps {
  card: FlashcardWithProgress;
  isFlipped: boolean;
  onFlip: () => void;
  isFavourite: boolean;
  onToggleFavourite: () => void;
}

function FlashcardDisplay({
  card,
  isFlipped,
  onFlip,
  isFavourite,
  onToggleFavourite,
}: FlashcardDisplayProps) {
  return (
    <div
      className="relative perspective-1000"
      style={{ minHeight: '300px' }}
    >
      <div
        onClick={onFlip}
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front of card */}
        <div
          className="absolute w-full bg-white rounded-2xl shadow-lg border-2 border-[#dbeafe] p-8 backface-hidden"
          style={{
            minHeight: '300px',
            backfaceVisibility: 'hidden',
          }}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavourite();
              }}
              className={`p-2 rounded-full transition-colors ${
                isFavourite
                  ? 'bg-yellow-100 text-yellow-500'
                  : 'bg-gray-100 text-gray-400 hover:text-yellow-500'
              }`}
            >
              <Star className="w-5 h-5" fill={isFavourite ? 'currentColor' : 'none'} />
            </button>
            <div
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                card.difficulty_level === 'easy'
                  ? 'bg-green-100 text-green-700'
                  : card.difficulty_level === 'hard'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {card.difficulty_level}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
            <p className="text-xl font-medium text-gray-900 text-center">
              {card.front_text}
            </p>
            {card.front_text_ar && (
              <p className="text-lg text-gray-600 text-center mt-4" dir="rtl">
                {card.front_text_ar}
              </p>
            )}
            {card.front_image_url && (
              <img
                src={card.front_image_url}
                alt=""
                className="mt-4 max-h-32 rounded-lg"
              />
            )}
          </div>

          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-sm text-gray-400">Click to flip</p>
          </div>
        </div>

        {/* Back of card */}
        <div
          className="absolute w-full bg-gradient-to-br from-[#f0f6ff] to-[#e8f2ff] rounded-2xl shadow-lg border-2 border-[#dbeafe] p-8 backface-hidden"
          style={{
            minHeight: '300px',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="absolute top-4 left-4">
            <span className="text-xs font-medium text-[#0f91e0] bg-[#e8f4fd] px-2 py-1 rounded-full">
              Answer
            </span>
          </div>

          <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
            <p className="text-xl font-medium text-gray-900 text-center">
              {card.back_text}
            </p>
            {card.back_text_ar && (
              <p className="text-lg text-gray-600 text-center mt-4" dir="rtl">
                {card.back_text_ar}
              </p>
            )}
            {card.back_image_url && (
              <img
                src={card.back_image_url}
                alt=""
                className="mt-4 max-h-32 rounded-lg"
              />
            )}
            {card.hint && (
              <p className="mt-4 text-sm text-gray-500 italic">
                Hint: {card.hint}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface RatingButtonProps {
  rating: StudyRating;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

function RatingButton({
  rating,
  label,
  sublabel,
  icon,
  color,
  onClick,
}: RatingButtonProps) {
  const colorClasses: Record<string, string> = {
    red: 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300',
    orange: 'bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300',
    green: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300',
    blue: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300',
  };

  return (
    <button
      onClick={onClick}
      className={`flex-1 py-4 px-3 rounded-xl border-2 transition-all ${colorClasses[color]}`}
    >
      <div className="flex flex-col items-center gap-1">
        {icon}
        <span className="font-semibold text-sm">{label}</span>
        <span className="text-xs opacity-70">{sublabel}</span>
      </div>
    </button>
  );
}

export function FlashcardStudySession() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Detect base path for navigation (ECP vs Individual learning system)
  const basePath = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/ecp/learning-system')) {
      return '/ecp/learning-system';
    }
    return '/learning-system';
  }, [location.pathname]);

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studiedCards, setStudiedCards] = useState<Set<string>>(new Set());
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [startTime] = useState(new Date());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Data fetching
  const { data: deck, isLoading: isLoadingDeck } = useFlashcardDeck(deckId);
  const { data: cards, isLoading: isLoadingCards } = useFlashcardsWithProgress(
    user?.id,
    deckId
  );

  // Mutations
  const recordReview = useRecordReview();
  const startSession = useStartStudySession();
  const endSession = useEndStudySession();
  const toggleFavorite = useToggleCardFavourite();

  const currentCard = cards?.[currentIndex];
  const totalCards = cards?.length || 0;

  // Start session on mount
  useEffect(() => {
    if (user && deckId) {
      startSession
        .mutateAsync({ userId: user.id, deckId })
        .then((session) => setSessionId(session.id))
        .catch((err) => console.error('Failed to start study session:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, deckId]);

  // Handle rating selection
  const handleRating = async (rating: StudyRating) => {
    if (!currentCard || !user || !deckId) return;

    // Record the review
    await recordReview.mutateAsync({
      userId: user.id,
      cardId: currentCard.id,
      deckId,
      rating,
    });

    // Update counts
    if (rating === 'again' || rating === 'hard') {
      setIncorrectCount((prev) => prev + 1);
    } else {
      setCorrectCount((prev) => prev + 1);
    }

    setStudiedCards((prev) => new Set(prev).add(currentCard.id));
    setIsFlipped(false);

    // Move to next card or finish
    if (currentIndex < totalCards - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleCompleteSession();
    }
  };

  // Handle favorite toggle
  const handleToggleFavourite = async () => {
    if (!currentCard || !user || !deckId) return;

    const currentFavorite = currentCard.progress?.is_favorited || false;
    await toggleFavorite.mutateAsync({
      userId: user.id,
      cardId: currentCard.id,
      deckId,
      isFavourited: !currentFavorite,
    });
  };

  // Handle session completion
  const handleCompleteSession = useCallback(async () => {
    if (!user || !sessionId || !deckId) return;

    const endTime = new Date();
    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000
    );

    const result: StudySessionResult = {
      deckId,
      totalCards,
      cardsStudied: studiedCards.size,
      cardsCorrect: correctCount,
      cardsIncorrect: incorrectCount,
      durationMinutes,
      newMastered: 0, // This would need to be calculated based on progress updates
    };

    await endSession.mutateAsync({
      sessionId,
      userId: user.id,
      deckId,
      result,
    });

    setIsCompleted(true);
  }, [
    user,
    sessionId,
    deckId,
    startTime,
    totalCards,
    studiedCards,
    correctCount,
    incorrectCount,
    endSession,
  ]);

  // Loading state
  if (isLoadingDeck || isLoadingCards) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0f91e0] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  // No cards state
  if (!cards || cards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md bg-white p-8 rounded-xl shadow-lg">
          <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Flashcards Available
          </h2>
          <p className="text-gray-600 mb-6">
            This deck doesn't have any published flashcards yet.
          </p>
          <Button onClick={() => navigate(`${basePath}/flashcards`)}>
            Back to Flashcards
          </Button>
        </div>
      </div>
    );
  }

  // Completion screen
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[#e8f4fd] flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-[#0f91e0]" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Session Complete!
            </h1>
            <p className="text-gray-600 mb-8">
              Great job studying {deck?.title}!
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-[#f0f6ff] rounded-lg p-4">
                <p className="text-3xl font-bold text-[#0f91e0]">
                  {studiedCards.size}
                </p>
                <p className="text-sm text-[#1C4A8B]">Cards Studied</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-3xl font-bold text-green-600">
                  {correctCount}
                </p>
                <p className="text-sm text-green-700">Good/Easy</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-3xl font-bold text-orange-600">
                  {incorrectCount}
                </p>
                <p className="text-sm text-orange-700">Again/Hard</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`${basePath}/flashcards`)}
              >
                Back to Flashcards
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setIsCompleted(false);
                  setCurrentIndex(0);
                  setStudiedCards(new Set());
                  setCorrectCount(0);
                  setIncorrectCount(0);
                  setIsFlipped(false);
                  setSessionId(null);
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Study Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f9ff]">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`${basePath}/flashcards`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit
              </Button>
              <div className="border-l pl-4">
                <h1 className="font-semibold text-gray-900">{deck?.title}</h1>
                <p className="text-sm text-gray-500">
                  Card {currentIndex + 1} of {totalCards}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-[#0f91e0]">
                  {studiedCards.size}
                </span>
                <span className="text-gray-400"> studied</span>
              </div>
              <Button variant="outline" onClick={handleCompleteSession}>
                Finish
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0f91e0] transition-all"
              style={{
                width: `${((currentIndex + 1) / totalCards) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {currentCard && (
          <>
            <FlashcardDisplay
              card={currentCard}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped(!isFlipped)}
              isFavourite={currentCard.progress?.is_favorited || false}
              onToggleFavourite={handleToggleFavourite}
            />

            {/* Rating Buttons - show only when flipped */}
            {isFlipped && (
              <div className="mt-8">
                <p className="text-center text-gray-600 mb-4">
                  How well did you know this?
                </p>
                <div className="flex gap-3">
                  <RatingButton
                    rating="again"
                    label="Again"
                    sublabel="< 1 min"
                    icon={<X className="w-6 h-6" />}
                    color="red"
                    onClick={() => handleRating('again')}
                  />
                  <RatingButton
                    rating="hard"
                    label="Hard"
                    sublabel="< 10 min"
                    icon={<ThumbsDown className="w-6 h-6" />}
                    color="orange"
                    onClick={() => handleRating('hard')}
                  />
                  <RatingButton
                    rating="good"
                    label="Good"
                    sublabel="1 day"
                    icon={<ThumbsUp className="w-6 h-6" />}
                    color="green"
                    onClick={() => handleRating('good')}
                  />
                  <RatingButton
                    rating="easy"
                    label="Easy"
                    sublabel="4 days"
                    icon={<Zap className="w-6 h-6" />}
                    color="blue"
                    onClick={() => handleRating('easy')}
                  />
                </div>
              </div>
            )}

            {/* Navigation hint when not flipped */}
            {!isFlipped && (
              <div className="mt-8 text-center">
                <p className="text-gray-500">
                  Click the card or press Space to reveal the answer
                </p>
              </div>
            )}
          </>
        )}

        {/* Card navigation */}
        <div className="mt-8 flex justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (currentIndex > 0) {
                setCurrentIndex((prev) => prev - 1);
                setIsFlipped(false);
              }
            }}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (currentIndex < totalCards - 1) {
                setCurrentIndex((prev) => prev + 1);
                setIsFlipped(false);
              }
            }}
            disabled={currentIndex === totalCards - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
