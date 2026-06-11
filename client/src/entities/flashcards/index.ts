/**
 * Flashcard Entity - Centralized exports
 *
 * Architecture: Spaced repetition flashcard system for BDA certifications
 * - Uses SM-2 algorithm for optimal review scheduling
 * - Decks organized by competency/sub-unit
 * - Progress tracking with mastery levels
 * - Study sessions with analytics
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Database types
  FlashcardDeck,
  Flashcard,
  FlashcardStatus,
  UserFlashcardProgress,
  UserFlashcardDeckProgress,
  UserFlashcardStudySession,

  // Extended types
  FlashcardDeckWithCompetency,
  FlashcardDeckWithProgress,
  FlashcardWithProgress,

  // Insert/Update types
  FlashcardDeckInsert,
  FlashcardDeckUpdate,
  FlashcardInsert,
  FlashcardUpdate,

  // Session types
  StudySessionState,
  StudySessionResult,

  // SM-2 types
  SM2Quality,
  SM2Result,
  StudyRating,

  // Filter types
  FlashcardDeckFilters,
  FlashcardFilters,

  // Stats types
  FlashcardStats,
  DeckProgress,
  TodayReviewSummary,
  DeckWithDueCards,
} from './flashcard.types';

// =============================================================================
// SERVICES
// =============================================================================

export { FlashcardService } from './flashcard.service';

// =============================================================================
// HOOKS
// =============================================================================

export {
  // Query keys
  flashcardKeys,

  // Deck hooks
  useFlashcardDecks,
  useDecksWithProgress,
  useDecksWithCompetency,
  useFlashcardDeck,

  // Card hooks
  useFlashcards,
  useFlashcardsWithProgress,
  useCardsDueForReview,
  useFlashcard,

  // Stats hooks
  useFlashcardStats,
  useFavouritedCards,

  // Admin hooks
  useAdminFlashcardStats,

  // Mutation hooks - Admin
  useCreateDeck,
  useUpdateDeck,
  useDeleteDeck,
  useCreateFlashcard,
  useUpdateFlashcard,
  useDeleteFlashcard,
  useBulkCreateFlashcards,

  // Mutation hooks - User Study
  useRecordReview,
  useToggleCardFavourite,
  useStartStudySession,
  useEndStudySession,
} from './flashcard.hooks';
