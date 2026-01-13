/**
 * Flashcard Hooks
 * React Query hooks for flashcard operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashcardService } from './flashcard.service';
import type {
  FlashcardDeck,
  FlashcardDeckInsert,
  FlashcardDeckUpdate,
  FlashcardDeckWithProgress,
  FlashcardDeckWithCompetency,
  Flashcard,
  FlashcardInsert,
  FlashcardUpdate,
  FlashcardWithProgress,
  UserFlashcardProgress,
  UserFlashcardDeckProgress,
  UserFlashcardStudySession,
  FlashcardDeckFilters,
  FlashcardFilters,
  FlashcardStats,
  StudyRating,
  StudySessionResult,
} from './flashcard.types';
import type { CertificationType } from '../curriculum/curriculum.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const flashcardKeys = {
  all: ['flashcards'] as const,

  // Decks
  decks: () => [...flashcardKeys.all, 'decks'] as const,
  decksList: (filters?: FlashcardDeckFilters) =>
    [...flashcardKeys.decks(), { filters }] as const,
  decksWithProgress: (userId: string, certType: CertificationType, examLanguage?: 'en' | 'ar') =>
    [...flashcardKeys.decks(), 'progress', userId, certType, examLanguage] as const,
  decksWithCompetency: (filters?: FlashcardDeckFilters) =>
    [...flashcardKeys.decks(), 'competency', { filters }] as const,
  deck: (id: string) => [...flashcardKeys.decks(), id] as const,

  // Cards
  cards: () => [...flashcardKeys.all, 'cards'] as const,
  cardsList: (deckId: string, filters?: FlashcardFilters) =>
    [...flashcardKeys.cards(), deckId, { filters }] as const,
  cardsWithProgress: (userId: string, deckId: string) =>
    [...flashcardKeys.cards(), 'progress', userId, deckId] as const,
  cardsDue: (userId: string, deckId: string) =>
    [...flashcardKeys.cards(), 'due', userId, deckId] as const,
  card: (id: string) => [...flashcardKeys.cards(), id] as const,

  // Progress
  progress: (userId: string) =>
    [...flashcardKeys.all, 'progress', userId] as const,
  deckProgress: (userId: string, deckId: string) =>
    [...flashcardKeys.progress(userId), deckId] as const,

  // Stats
  stats: (userId: string, certType?: CertificationType, examLanguage?: 'en' | 'ar') =>
    [...flashcardKeys.all, 'stats', userId, certType, examLanguage] as const,
  adminStats: (certType?: CertificationType) =>
    [...flashcardKeys.all, 'admin-stats', certType] as const,

  // Favorites
  favorites: (userId: string) =>
    [...flashcardKeys.all, 'favorites', userId] as const,

  // Sessions
  sessions: (userId: string) =>
    [...flashcardKeys.all, 'sessions', userId] as const,
};

// =============================================================================
// DECK HOOKS
// =============================================================================

/**
 * Get all flashcard decks
 */
export function useFlashcardDecks(filters?: FlashcardDeckFilters) {
  return useQuery({
    queryKey: flashcardKeys.decksList(filters),
    queryFn: async () => {
      const result = await FlashcardService.getDecks(filters);
      if (result.error) throw result.error;
      return result.data!;
    },
  });
}

/**
 * Get decks with user progress
 * @param examLanguage - Optional language filter ('en' or 'ar' lowercase)
 */
export function useDecksWithProgress(
  userId: string | undefined,
  certificationType: CertificationType,
  examLanguage?: 'en' | 'ar'
) {
  return useQuery({
    queryKey: flashcardKeys.decksWithProgress(userId || '', certificationType, examLanguage),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const result = await FlashcardService.getDecksWithProgress(
        userId,
        certificationType,
        examLanguage
      );
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!userId,
  });
}

/**
 * Get decks with competency info (admin)
 */
export function useDecksWithCompetency(filters?: FlashcardDeckFilters) {
  return useQuery({
    queryKey: flashcardKeys.decksWithCompetency(filters),
    queryFn: async () => {
      const result = await FlashcardService.getDecksWithCompetency(filters);
      if (result.error) throw result.error;
      return result.data!;
    },
  });
}

/**
 * Get single deck
 */
export function useFlashcardDeck(deckId: string | undefined) {
  return useQuery({
    queryKey: flashcardKeys.deck(deckId || ''),
    queryFn: async () => {
      if (!deckId) throw new Error('Deck ID required');
      const result = await FlashcardService.getDeckById(deckId);
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!deckId,
  });
}

// =============================================================================
// CARD HOOKS
// =============================================================================

/**
 * Get flashcards for a deck
 */
export function useFlashcards(
  deckId: string | undefined,
  filters?: FlashcardFilters
) {
  return useQuery({
    queryKey: flashcardKeys.cardsList(deckId || '', filters),
    queryFn: async () => {
      if (!deckId) throw new Error('Deck ID required');
      const result = await FlashcardService.getFlashcards(deckId, filters);
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!deckId,
  });
}

/**
 * Get flashcards with user progress
 */
export function useFlashcardsWithProgress(
  userId: string | undefined,
  deckId: string | undefined
) {
  return useQuery({
    queryKey: flashcardKeys.cardsWithProgress(userId || '', deckId || ''),
    queryFn: async () => {
      if (!userId || !deckId) throw new Error('User ID and Deck ID required');
      const result = await FlashcardService.getFlashcardsWithProgress(
        userId,
        deckId
      );
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!userId && !!deckId,
  });
}

/**
 * Get cards due for review
 */
export function useCardsDueForReview(
  userId: string | undefined,
  deckId: string | undefined,
  limit: number = 20
) {
  return useQuery({
    queryKey: flashcardKeys.cardsDue(userId || '', deckId || ''),
    queryFn: async () => {
      if (!userId || !deckId) throw new Error('User ID and Deck ID required');
      const result = await FlashcardService.getCardsDueForReview(
        userId,
        deckId,
        limit
      );
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!userId && !!deckId,
  });
}

/**
 * Get single flashcard
 */
export function useFlashcard(cardId: string | undefined) {
  return useQuery({
    queryKey: flashcardKeys.card(cardId || ''),
    queryFn: async () => {
      if (!cardId) throw new Error('Card ID required');
      const result = await FlashcardService.getFlashcardById(cardId);
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!cardId,
  });
}

// =============================================================================
// STATS HOOKS
// =============================================================================

/**
 * Get user's flashcard stats
 * @param examLanguage - Optional language filter ('en' or 'ar' lowercase)
 */
export function useFlashcardStats(
  userId: string | undefined,
  certificationType?: CertificationType,
  examLanguage?: 'en' | 'ar'
) {
  return useQuery({
    queryKey: flashcardKeys.stats(userId || '', certificationType, examLanguage),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const result = await FlashcardService.getUserStats(
        userId,
        certificationType,
        examLanguage
      );
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!userId,
  });
}

/**
 * Get favorited flashcards
 */
export function useFavoritedCards(
  userId: string | undefined,
  certificationType?: string
) {
  return useQuery({
    queryKey: flashcardKeys.favorites(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const result = await FlashcardService.getFavoritedCards(
        userId,
        certificationType
      );
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!userId,
  });
}

// =============================================================================
// ADMIN HOOKS
// =============================================================================

/**
 * Get admin stats
 */
export function useAdminFlashcardStats(certificationType?: CertificationType) {
  return useQuery({
    queryKey: flashcardKeys.adminStats(certificationType),
    queryFn: async () => {
      const result = await FlashcardService.getAdminStats(certificationType);
      if (result.error) throw result.error;
      return result.data!;
    },
  });
}

// =============================================================================
// MUTATION HOOKS - ADMIN
// =============================================================================

/**
 * Create deck (Admin)
 */
export function useCreateDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deck: FlashcardDeckInsert) => {
      const result = await FlashcardService.createDeck(deck);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flashcardKeys.decks() });
    },
  });
}

/**
 * Update deck (Admin)
 */
export function useUpdateDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      deckId,
      updates,
    }: {
      deckId: string;
      updates: FlashcardDeckUpdate;
    }) => {
      const result = await FlashcardService.updateDeck(deckId, updates);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: flashcardKeys.deck(data.id) });
      queryClient.invalidateQueries({ queryKey: flashcardKeys.decks() });
    },
  });
}

/**
 * Delete deck (Admin)
 */
export function useDeleteDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deckId: string) => {
      const result = await FlashcardService.deleteDeck(deckId);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flashcardKeys.decks() });
    },
  });
}

/**
 * Create flashcard (Admin)
 */
export function useCreateFlashcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (card: FlashcardInsert) => {
      const result = await FlashcardService.createFlashcard(card);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.cardsList(data.deck_id),
      });
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.deck(data.deck_id),
      });
    },
  });
}

/**
 * Update flashcard (Admin)
 */
export function useUpdateFlashcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cardId,
      updates,
    }: {
      cardId: string;
      updates: FlashcardUpdate;
    }) => {
      const result = await FlashcardService.updateFlashcard(cardId, updates);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: flashcardKeys.card(data.id) });
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.cardsList(data.deck_id),
      });
    },
  });
}

/**
 * Delete flashcard (Admin)
 */
export function useDeleteFlashcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cardId,
      deckId,
    }: {
      cardId: string;
      deckId: string;
    }) => {
      const result = await FlashcardService.deleteFlashcard(cardId);
      if (result.error) throw result.error;
      return { deckId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.cardsList(data.deckId),
      });
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.deck(data.deckId),
      });
    },
  });
}

/**
 * Bulk create flashcards (Admin)
 */
export function useBulkCreateFlashcards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cards: FlashcardInsert[]) => {
      const result = await FlashcardService.bulkCreateFlashcards(cards);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({
          queryKey: flashcardKeys.cardsList(data[0].deck_id),
        });
        queryClient.invalidateQueries({
          queryKey: flashcardKeys.deck(data[0].deck_id),
        });
      }
    },
  });
}

// =============================================================================
// MUTATION HOOKS - USER STUDY
// =============================================================================

/**
 * Record a card review
 */
export function useRecordReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      cardId,
      deckId,
      rating,
    }: {
      userId: string;
      cardId: string;
      deckId: string;
      rating: StudyRating;
    }) => {
      const result = await FlashcardService.recordReview(
        userId,
        cardId,
        deckId,
        rating
      );
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.cardsWithProgress(
          variables.userId,
          variables.deckId
        ),
      });
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.cardsDue(variables.userId, variables.deckId),
      });
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.deckProgress(variables.userId, variables.deckId),
      });
    },
  });
}

/**
 * Toggle favorite
 */
export function useToggleCardFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      cardId,
      deckId,
      isFavorited,
    }: {
      userId: string;
      cardId: string;
      deckId: string;
      isFavorited: boolean;
    }) => {
      const result = await FlashcardService.toggleFavorite(
        userId,
        cardId,
        deckId,
        isFavorited
      );
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.favorites(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.cardsWithProgress(
          variables.userId,
          variables.deckId
        ),
      });
    },
  });
}

/**
 * Start study session
 */
export function useStartStudySession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      deckId,
    }: {
      userId: string;
      deckId: string;
    }) => {
      const result = await FlashcardService.startStudySession(userId, deckId);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.sessions(variables.userId),
      });
    },
  });
}

/**
 * End study session
 */
export function useEndStudySession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      userId,
      deckId,
      result,
    }: {
      sessionId: string;
      userId: string;
      deckId: string;
      result: StudySessionResult;
    }) => {
      const response = await FlashcardService.endStudySession(sessionId, result);
      if (response.error) throw response.error;
      return { session: response.data!, userId, deckId };
    },
    onSuccess: async (data) => {
      // Also update deck progress
      await FlashcardService.updateDeckProgress(
        data.userId,
        data.deckId,
        data.session.duration_minutes
      );

      queryClient.invalidateQueries({
        queryKey: flashcardKeys.sessions(data.userId),
      });
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.deckProgress(data.userId, data.deckId),
      });
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.stats(data.userId),
      });
      queryClient.invalidateQueries({
        queryKey: flashcardKeys.decksWithProgress(data.userId, 'CP'),
      });
    },
  });
}
