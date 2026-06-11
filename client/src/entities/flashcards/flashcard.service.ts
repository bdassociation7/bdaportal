/**
 * Flashcard Service
 * Handles all flashcard operations including SM-2 spaced repetition
 */

import { supabase } from '@/shared/config/supabase.config';
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
  SM2Quality,
  StudySessionResult,
} from './flashcard.types';

interface ServiceResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Map user ratings to SM-2 quality values
const ratingToQuality: Record<StudyRating, SM2Quality> = {
  again: 0,
  hard: 2,
  good: 3,
  easy: 5,
};

/**
 * Flashcard Service
 */
export class FlashcardService {
  // ==========================================================================
  // DECK OPERATIONS
  // ==========================================================================

  /**
   * Get all flashcard decks with optional filters
   */
  static async getDecks(
    filters?: FlashcardDeckFilters
  ): Promise<ServiceResponse<FlashcardDeck[]>> {
    try {
      let query = supabase
        .from('curriculum_flashcard_decks')
        .select('*')
        .order('order_index', { ascending: true });

      if (filters?.certification_type) {
        query = query.eq('certification_type', filters.certification_type);
      }

      if (filters?.section_type) {
        query = query.eq('section_type', filters.section_type);
      }

      if (filters?.competency_id) {
        query = query.eq('competency_id', filters.competency_id);
      }

      if (filters?.is_published !== undefined) {
        query = query.eq('is_published', filters.is_published);
      }

      if (filters?.exam_language) {
        query = query.eq('exam_language', filters.exam_language);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch flashcard decks',
          details: error,
        },
      };
    }
  }

  /**
   * Get decks with user progress
   * @param examLanguage - Optional language filter ('en' or 'ar' lowercase)
   */
  static async getDecksWithProgress(
    userId: string,
    certificationType: string,
    examLanguage?: 'en' | 'ar'
  ): Promise<ServiceResponse<FlashcardDeckWithProgress[]>> {
    try {
      // Get all published decks WITH competency and sub-lesson info for hierarchy
      let query = supabase
        .from('curriculum_flashcard_decks')
        .select(`
          *,
          competency:curriculum_modules!competency_id(
            id,
            competency_name,
            competency_name_ar,
            section_type
          ),
          sub_unit:curriculum_lessons!sub_unit_id(
            id,
            title,
            title_ar,
            order_index
          )
        `)
        .eq('certification_type', certificationType)
        .eq('is_published', true);

      // Filter by exam_language if provided
      if (examLanguage) {
        query = query.eq('exam_language', examLanguage);
      }

      const { data: decks, error: decksError } = await query.order('order_index', { ascending: true });

      if (decksError) throw decksError;

      // Get user progress for all decks
      const { data: progress, error: progressError } = await supabase
        .from('user_flashcard_deck_progress')
        .select('*')
        .eq('user_id', userId);

      if (progressError) throw progressError;

      // Create progress map
      const progressMap = new Map(
        progress?.map((p) => [p.deck_id, p]) || []
      );

      // Combine decks with progress
      const decksWithProgress: FlashcardDeckWithProgress[] = (decks || []).map(
        (deck) => ({
          ...deck,
          progress: progressMap.get(deck.id) || null,
        })
      );

      return { data: decksWithProgress };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch decks with progress',
          details: error,
        },
      };
    }
  }

  /**
   * Get decks with competency info (for admin)
   */
  static async getDecksWithCompetency(
    filters?: FlashcardDeckFilters
  ): Promise<ServiceResponse<FlashcardDeckWithCompetency[]>> {
    try {
      let query = supabase
        .from('curriculum_flashcard_decks')
        .select(
          `
          *,
          competency:curriculum_modules!competency_id(
            id,
            competency_name,
            competency_name_ar,
            section_type
          ),
          sub_unit:curriculum_lessons!sub_unit_id(
            id,
            title,
            title_ar
          )
        `
        )
        .order('order_index', { ascending: true });

      if (filters?.certification_type) {
        query = query.eq('certification_type', filters.certification_type);
      }

      if (filters?.is_published !== undefined) {
        query = query.eq('is_published', filters.is_published);
      }

      if (filters?.exam_language) {
        query = query.eq('exam_language', filters.exam_language);
      }

      if (filters?.section_type) {
        query = query.eq('section_type', filters.section_type);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch decks with competency',
          details: error,
        },
      };
    }
  }

  /**
   * Get single deck by ID
   */
  static async getDeckById(
    deckId: string
  ): Promise<ServiceResponse<FlashcardDeck>> {
    try {
      const { data, error } = await supabase
        .from('curriculum_flashcard_decks')
        .select('*')
        .eq('id', deckId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return {
          error: {
            code: 'NOT_FOUND',
            message: 'Flashcard deck not found',
          },
        };
      }

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch deck',
          details: error,
        },
      };
    }
  }

  /**
   * Create deck (Admin)
   */
  static async createDeck(
    deck: FlashcardDeckInsert
  ): Promise<ServiceResponse<FlashcardDeck>> {
    try {
      const { data, error } = await supabase
        .from('curriculum_flashcard_decks')
        .insert(deck)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'CREATE_ERROR',
          message: 'Failed to create deck',
          details: error,
        },
      };
    }
  }

  /**
   * Update deck (Admin)
   */
  static async updateDeck(
    deckId: string,
    updates: FlashcardDeckUpdate
  ): Promise<ServiceResponse<FlashcardDeck>> {
    try {
      const { data, error } = await supabase
        .from('curriculum_flashcard_decks')
        .update(updates)
        .eq('id', deckId)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'UPDATE_ERROR',
          message: 'Failed to update deck',
          details: error,
        },
      };
    }
  }

  /**
   * Delete deck (Admin)
   */
  static async deleteDeck(deckId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('curriculum_flashcard_decks')
        .delete()
        .eq('id', deckId);

      if (error) throw error;

      return { data: undefined };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'DELETE_ERROR',
          message: 'Failed to delete deck',
          details: error,
        },
      };
    }
  }

  // ==========================================================================
  // FLASHCARD OPERATIONS
  // ==========================================================================

  /**
   * Get flashcards for a deck
   */
  static async getFlashcards(
    deckId: string,
    filters?: FlashcardFilters
  ): Promise<ServiceResponse<Flashcard[]>> {
    try {
      let query = supabase
        .from('curriculum_flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .order('order_index', { ascending: true });

      if (filters?.difficulty_level) {
        query = query.eq('difficulty_level', filters.difficulty_level);
      }

      if (filters?.is_published !== undefined) {
        query = query.eq('is_published', filters.is_published);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch flashcards',
          details: error,
        },
      };
    }
  }

  /**
   * Get flashcards with user progress
   */
  static async getFlashcardsWithProgress(
    userId: string,
    deckId: string
  ): Promise<ServiceResponse<FlashcardWithProgress[]>> {
    try {
      // Get all published flashcards
      const { data: cards, error: cardsError } = await supabase
        .from('curriculum_flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .eq('is_published', true)
        .order('order_index', { ascending: true });

      if (cardsError) throw cardsError;

      // Get user progress for this deck's cards
      const { data: progress, error: progressError } = await supabase
        .from('user_flashcard_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('deck_id', deckId);

      if (progressError) throw progressError;

      // Create progress map
      const progressMap = new Map(
        progress?.map((p) => [p.flashcard_id, p]) || []
      );

      // Combine cards with progress
      const cardsWithProgress: FlashcardWithProgress[] = (cards || []).map(
        (card) => ({
          ...card,
          progress: progressMap.get(card.id) || null,
        })
      );

      return { data: cardsWithProgress };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch flashcards with progress',
          details: error,
        },
      };
    }
  }

  /**
   * Get cards due for review using the database function
   */
  static async getCardsDueForReview(
    userId: string,
    deckId: string,
    limit: number = 20
  ): Promise<ServiceResponse<FlashcardWithProgress[]>> {
    try {
      const { data, error } = await supabase.rpc('get_cards_due_for_review', {
        p_user_id: userId,
        p_deck_id: deckId,
        p_limit: limit,
      });

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to get cards due for review',
          details: error,
        },
      };
    }
  }

  /**
   * Get single flashcard by ID
   */
  static async getFlashcardById(
    cardId: string
  ): Promise<ServiceResponse<Flashcard>> {
    try {
      const { data, error } = await supabase
        .from('curriculum_flashcards')
        .select('*')
        .eq('id', cardId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return {
          error: {
            code: 'NOT_FOUND',
            message: 'Flashcard not found',
          },
        };
      }

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch flashcard',
          details: error,
        },
      };
    }
  }

  /**
   * Create flashcard (Admin)
   */
  static async createFlashcard(
    card: FlashcardInsert
  ): Promise<ServiceResponse<Flashcard>> {
    try {
      const { data, error } = await supabase
        .from('curriculum_flashcards')
        .insert(card)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'CREATE_ERROR',
          message: 'Failed to create flashcard',
          details: error,
        },
      };
    }
  }

  /**
   * Update flashcard (Admin)
   */
  static async updateFlashcard(
    cardId: string,
    updates: FlashcardUpdate
  ): Promise<ServiceResponse<Flashcard>> {
    try {
      const { data, error } = await supabase
        .from('curriculum_flashcards')
        .update(updates)
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'UPDATE_ERROR',
          message: 'Failed to update flashcard',
          details: error,
        },
      };
    }
  }

  /**
   * Delete flashcard (Admin)
   */
  static async deleteFlashcard(cardId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('curriculum_flashcards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      return { data: undefined };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'DELETE_ERROR',
          message: 'Failed to delete flashcard',
          details: error,
        },
      };
    }
  }

  /**
   * Bulk create flashcards (Admin - for import)
   */
  static async bulkCreateFlashcards(
    cards: FlashcardInsert[]
  ): Promise<ServiceResponse<Flashcard[]>> {
    try {
      const { data, error } = await supabase
        .from('curriculum_flashcards')
        .insert(cards)
        .select();

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'CREATE_ERROR',
          message: 'Failed to bulk create flashcards',
          details: error,
        },
      };
    }
  }

  // ==========================================================================
  // STUDY SESSION OPERATIONS
  // ==========================================================================

  /**
   * Record a card review using SM-2 algorithm
   */
  static async recordReview(
    userId: string,
    cardId: string,
    deckId: string,
    rating: StudyRating
  ): Promise<ServiceResponse<UserFlashcardProgress>> {
    try {
      const quality = ratingToQuality[rating];

      // Call the SM-2 function and upsert progress
      const { data: sm2Result, error: sm2Error } = await supabase.rpc(
        'calculate_sm2',
        {
          p_quality: quality,
          p_ease_factor: 2.5, // Will be overridden if existing
          p_interval: 0,
          p_repetition: 0,
        }
      );

      if (sm2Error) throw sm2Error;

      // Determine new status based on interval
      let newStatus: 'new' | 'learning' | 'reviewing' | 'mastered' = 'learning';
      if (sm2Result.interval >= 21) {
        newStatus = 'mastered';
      } else if (sm2Result.interval >= 1) {
        newStatus = 'reviewing';
      }

      // Calculate next review date
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + sm2Result.interval);

      // Upsert progress
      const { data, error } = await supabase
        .from('user_flashcard_progress')
        .upsert(
          {
            user_id: userId,
            flashcard_id: cardId,
            deck_id: deckId,
            status: newStatus,
            ease_factor: sm2Result.ease_factor,
            interval_days: sm2Result.interval,
            repetition_count: sm2Result.repetition,
            next_review_date: nextReviewDate.toISOString(),
            last_reviewed_at: new Date().toISOString(),
            mastered_at: newStatus === 'mastered' ? new Date().toISOString() : null,
          },
          {
            onConflict: 'user_id,flashcard_id',
          }
        )
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'UPDATE_ERROR',
          message: 'Failed to record review',
          details: error,
        },
      };
    }
  }

  /**
   * Toggle favourite status for a card
   */
  static async toggleFavourite(
    userId: string,
    cardId: string,
    deckId: string,
    isFavourited: boolean
  ): Promise<ServiceResponse<UserFlashcardProgress>> {
    try {
      const { data, error } = await supabase
        .from('user_flashcard_progress')
        .upsert(
          {
            user_id: userId,
            flashcard_id: cardId,
            deck_id: deckId,
            is_favorited: isFavourited,
          },
          {
            onConflict: 'user_id,flashcard_id',
          }
        )
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'UPDATE_ERROR',
          message: 'Failed to toggle favorite',
          details: error,
        },
      };
    }
  }

  /**
   * Start a study session
   */
  static async startStudySession(
    userId: string,
    deckId: string
  ): Promise<ServiceResponse<UserFlashcardStudySession>> {
    try {
      const { data, error } = await supabase
        .from('user_flashcard_study_sessions')
        .insert({
          user_id: userId,
          deck_id: deckId,
          cards_studied: 0,
          cards_correct: 0,
          cards_incorrect: 0,
          duration_minutes: 0,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'CREATE_ERROR',
          message: 'Failed to start study session',
          details: error,
        },
      };
    }
  }

  /**
   * End a study session
   */
  static async endStudySession(
    sessionId: string,
    result: StudySessionResult
  ): Promise<ServiceResponse<UserFlashcardStudySession>> {
    try {
      const { data, error } = await supabase
        .from('user_flashcard_study_sessions')
        .update({
          cards_studied: result.cardsStudied,
          cards_correct: result.cardsCorrect,
          cards_incorrect: result.cardsIncorrect,
          duration_minutes: result.durationMinutes,
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'UPDATE_ERROR',
          message: 'Failed to end study session',
          details: error,
        },
      };
    }
  }

  /**
   * Update deck progress after a session
   */
  static async updateDeckProgress(
    userId: string,
    deckId: string,
    studyTimeMinutes: number
  ): Promise<ServiceResponse<UserFlashcardDeckProgress>> {
    try {
      // Get current card counts
      const { data: cardProgress, error: countError } = await supabase
        .from('user_flashcard_progress')
        .select('status')
        .eq('user_id', userId)
        .eq('deck_id', deckId);

      if (countError) throw countError;

      const counts = {
        new: 0,
        learning: 0,
        reviewing: 0,
        mastered: 0,
      };

      cardProgress?.forEach((p) => {
        counts[p.status as keyof typeof counts]++;
      });

      // Upsert deck progress
      const { data, error } = await supabase
        .from('user_flashcard_deck_progress')
        .upsert(
          {
            user_id: userId,
            deck_id: deckId,
            cards_new: counts.new,
            cards_learning: counts.learning,
            cards_reviewing: counts.reviewing,
            cards_mastered: counts.mastered,
            last_studied_at: new Date().toISOString(),
            total_study_time_minutes: studyTimeMinutes, // Will be incremented
            total_reviews: 1, // Will be incremented
          },
          {
            onConflict: 'user_id,deck_id',
          }
        )
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'UPDATE_ERROR',
          message: 'Failed to update deck progress',
          details: error,
        },
      };
    }
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get user's flashcard statistics
   * @param examLanguage - Optional language filter ('en' or 'ar' lowercase)
   */
  static async getUserStats(
    userId: string,
    certificationType?: string,
    examLanguage?: 'en' | 'ar'
  ): Promise<ServiceResponse<FlashcardStats>> {
    try {
      // Get all decks, filtered by language if specified
      let decksQuery = supabase
        .from('curriculum_flashcard_decks')
        .select('id, card_count')
        .eq('is_published', true);

      if (certificationType) {
        decksQuery = decksQuery.eq('certification_type', certificationType);
      }

      if (examLanguage) {
        decksQuery = decksQuery.eq('exam_language', examLanguage);
      }

      const { data: decks, error: decksError } = await decksQuery;
      if (decksError) throw decksError;

      const deckIds = decks?.map((d) => d.id) || [];
      const totalCards = decks?.reduce((sum, d) => sum + d.card_count, 0) || 0;

      // If no decks found, return empty stats
      if (deckIds.length === 0) {
        return {
          data: {
            totalDecks: 0,
            totalCards: 0,
            cardsNew: 0,
            cardsLearning: 0,
            cardsReviewing: 0,
            cardsMastered: 0,
            cardsDueToday: 0,
            studyStreak: 0,
            longestStreak: 0,
            totalStudyTimeMinutes: 0,
            favoritedCards: 0,
          },
        };
      }

      // Get deck progress
      const { data: deckProgress, error: deckProgressError } = await supabase
        .from('user_flashcard_deck_progress')
        .select('*')
        .eq('user_id', userId)
        .in('deck_id', deckIds);

      if (deckProgressError) throw deckProgressError;

      // Get card progress counts
      const { data: cardProgress, error: cardProgressError } = await supabase
        .from('user_flashcard_progress')
        .select('status, is_favorited')
        .eq('user_id', userId)
        .in('deck_id', deckIds);

      if (cardProgressError) throw cardProgressError;

      // Calculate counts
      const counts = {
        new: 0,
        learning: 0,
        reviewing: 0,
        mastered: 0,
        favorited: 0,
      };

      cardProgress?.forEach((p) => {
        counts[p.status as keyof typeof counts]++;
        if ((p as any).is_favorited) counts.favorited++
      });

      // Get cards due today
      const today = new Date().toISOString().split('T')[0];
      const { count: cardsDue, error: dueError } = await supabase
        .from('user_flashcard_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('deck_id', deckIds)
        .lte('next_review_date', today);

      if (dueError) throw dueError;

      // Calculate streaks and study time
      const studyStreak = deckProgress?.reduce(
        (max, p) => Math.max(max, p.study_streak_days),
        0
      ) || 0;
      const longestStreak = deckProgress?.reduce(
        (max, p) => Math.max(max, p.longest_streak_days),
        0
      ) || 0;
      const totalStudyTime = deckProgress?.reduce(
        (sum, p) => sum + p.total_study_time_minutes,
        0
      ) || 0;

      return {
        data: {
          totalDecks: decks?.length || 0,
          totalCards,
          cardsNew: counts.new,
          cardsLearning: counts.learning,
          cardsReviewing: counts.reviewing,
          cardsMastered: counts.mastered,
          cardsDueToday: cardsDue || 0,
          studyStreak,
          longestStreak,
          totalStudyTimeMinutes: totalStudyTime,
          favoritedCards: counts.favorited,
        },
      };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch user stats',
          details: error,
        },
      };
    }
  }

  /**
   * Get favorited flashcards
   */
  static async getFavoritedCards(
    userId: string,
    certificationType?: string
  ): Promise<ServiceResponse<Flashcard[]>> {
    try {
      // Get favorited card IDs
      const { data: progress, error: progressError } = await supabase
        .from('user_flashcard_progress')
        .select('flashcard_id')
        .eq('user_id', userId)
        .eq('is_favorited', true);

      if (progressError) throw progressError;

      if (!progress || progress.length === 0) {
        return { data: [] };
      }

      const cardIds = progress.map((p) => p.flashcard_id);

      // Get the cards
      const { data: cards, error: cardsError } = await supabase
        .from('curriculum_flashcards')
        .select('*')
        .in('id', cardIds);

      if (cardsError) throw cardsError;

      return { data: cards || [] };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch favourited cards',
          details: error,
        },
      };
    }
  }

  // ==========================================================================
  // ADMIN STATISTICS
  // ==========================================================================

  /**
   * Get admin statistics for flashcards
   */
  static async getAdminStats(
    certificationType?: string
  ): Promise<ServiceResponse<{
    totalDecks: number;
    totalCards: number;
    publishedDecks: number;
    unpublishedDecks: number;
    cardsByDifficulty: { easy: number; medium: number; hard: number };
  }>> {
    try {
      // Get decks count
      let decksQuery = supabase
        .from('curriculum_flashcard_decks')
        .select('id, is_published', { count: 'exact' });

      if (certificationType) {
        decksQuery = decksQuery.eq('certification_type', certificationType);
      }

      const { data: decks, error: decksError } = await decksQuery;
      if (decksError) throw decksError;

      // Get cards by difficulty
      const { data: cards, error: cardsError } = await supabase
        .from('curriculum_flashcards')
        .select('difficulty_level');

      if (cardsError) throw cardsError;

      const difficultyCount = {
        easy: cards?.filter((c) => c.difficulty_level === 'easy').length || 0,
        medium: cards?.filter((c) => c.difficulty_level === 'medium').length || 0,
        hard: cards?.filter((c) => c.difficulty_level === 'hard').length || 0,
      };

      return {
        data: {
          totalDecks: decks?.length || 0,
          totalCards: cards?.length || 0,
          publishedDecks: decks?.filter((d) => d.is_published).length || 0,
          unpublishedDecks: decks?.filter((d) => !d.is_published).length || 0,
          cardsByDifficulty: difficultyCount,
        },
      };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch admin stats',
          details: error,
        },
      };
    }
  }
}
