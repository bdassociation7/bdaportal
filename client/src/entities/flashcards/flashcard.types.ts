/**
 * Flashcard Types
 * Types for the Flashcard feature with spaced repetition
 */

import type { CertificationType, ModuleSectionType } from '../curriculum/curriculum.types';

// ============================================================================
// Database Row Types
// ============================================================================

export interface FlashcardDeck {
  id: string;
  certification_type: CertificationType;
  section_type: ModuleSectionType;
  competency_id: string | null;
  sub_unit_id: string | null;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  cover_image_url: string | null;
  card_count: number;
  order_index: number;
  estimated_study_time_minutes: number;
  is_published: boolean;
  exam_language: 'en' | 'ar';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front_text: string;
  front_text_ar: string | null;
  back_text: string;
  back_text_ar: string | null;
  hint: string | null;
  hint_ar: string | null;
  front_image_url: string | null;
  back_image_url: string | null;
  order_index: number;
  tags: string[];
  difficulty_level: 'easy' | 'medium' | 'hard';
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type FlashcardStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

export interface UserFlashcardProgress {
  id: string;
  user_id: string;
  flashcard_id: string;
  deck_id: string;
  status: FlashcardStatus;
  ease_factor: number;
  interval_days: number;
  repetition_count: number;
  next_review_date: string | null;
  is_favorited: boolean;
  last_reviewed_at: string | null;
  mastered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserFlashcardDeckProgress {
  id: string;
  user_id: string;
  deck_id: string;
  cards_new: number;
  cards_learning: number;
  cards_reviewing: number;
  cards_mastered: number;
  study_streak_days: number;
  longest_streak_days: number;
  last_studied_at: string | null;
  total_study_time_minutes: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

export interface UserFlashcardStudySession {
  id: string;
  user_id: string;
  deck_id: string;
  cards_studied: number;
  cards_correct: number;
  cards_incorrect: number;
  duration_minutes: number;
  started_at: string;
  ended_at: string | null;
}

// ============================================================================
// Extended Types (with relations)
// ============================================================================

export interface FlashcardDeckWithCompetency extends FlashcardDeck {
  competency?: {
    id: string;
    competency_name: string;
    competency_name_ar: string | null;
    section_type: ModuleSectionType;
  };
  sub_unit?: {
    id: string;
    title: string;
    title_ar: string | null;
  };
}

export interface FlashcardDeckWithProgress extends FlashcardDeck {
  progress?: UserFlashcardDeckProgress | null;
  // Joined competency and sub-unit data for hierarchical display
  competency?: {
    id: string;
    competency_name: string;
    competency_name_ar: string | null;
    section_type: ModuleSectionType;
  } | null;
  sub_unit?: {
    id: string;
    title: string;
    title_ar: string | null;
    order_index: number;
  } | null;
}

export interface FlashcardWithProgress extends Flashcard {
  progress?: UserFlashcardProgress | null;
}

// ============================================================================
// Insert/Update Types
// ============================================================================

export interface FlashcardDeckInsert {
  certification_type: CertificationType;
  section_type: ModuleSectionType;
  competency_id?: string | null;
  sub_unit_id?: string | null;
  title: string;
  title_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  cover_image_url?: string | null;
  order_index: number;
  estimated_study_time_minutes?: number;
  is_published?: boolean;
  exam_language?: 'en' | 'ar';
}

export interface FlashcardDeckUpdate {
  title?: string;
  title_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  cover_image_url?: string | null;
  order_index?: number;
  estimated_study_time_minutes?: number;
  is_published?: boolean;
}

export interface FlashcardInsert {
  deck_id: string;
  front_text: string;
  front_text_ar?: string | null;
  back_text: string;
  back_text_ar?: string | null;
  hint?: string | null;
  hint_ar?: string | null;
  front_image_url?: string | null;
  back_image_url?: string | null;
  order_index: number;
  tags?: string[];
  difficulty_level?: 'easy' | 'medium' | 'hard';
  is_published?: boolean;
}

export interface FlashcardUpdate {
  front_text?: string;
  front_text_ar?: string | null;
  back_text?: string;
  back_text_ar?: string | null;
  hint?: string | null;
  hint_ar?: string | null;
  front_image_url?: string | null;
  back_image_url?: string | null;
  order_index?: number;
  tags?: string[];
  difficulty_level?: 'easy' | 'medium' | 'hard';
  is_published?: boolean;
}

// ============================================================================
// Study Session Types
// ============================================================================

export interface StudySessionState {
  deckId: string;
  cards: FlashcardWithProgress[];
  currentIndex: number;
  showingBack: boolean;
  cardsStudied: number;
  cardsCorrect: number;
  cardsIncorrect: number;
  startedAt: Date;
}

export interface StudySessionResult {
  deckId: string;
  totalCards: number;
  cardsStudied: number;
  cardsCorrect: number;
  cardsIncorrect: number;
  durationMinutes: number;
  newMastered: number;
}

// SM-2 Algorithm Types
export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;
// 0 = complete blackout
// 1 = incorrect; correct answer remembered
// 2 = incorrect; correct answer seemed easy to recall
// 3 = correct; recalled with serious difficulty
// 4 = correct; recalled with hesitation
// 5 = correct; recalled with perfect response

export interface SM2Result {
  ease_factor: number;
  interval: number;
  repetition: number;
}

// Simplified quality ratings for UI
export type StudyRating = 'again' | 'hard' | 'good' | 'easy';

// ============================================================================
// Filter Types
// ============================================================================

export type ExamLanguage = 'en' | 'ar';

export interface FlashcardDeckFilters {
  certification_type?: CertificationType;
  section_type?: ModuleSectionType;
  competency_id?: string;
  is_published?: boolean;
  exam_language?: ExamLanguage;
}

export interface FlashcardFilters {
  deck_id?: string;
  difficulty_level?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  is_published?: boolean;
  status?: FlashcardStatus;
  is_favorited?: boolean;
  due_for_review?: boolean;
}

// ============================================================================
// Dashboard Stats Types
// ============================================================================

export interface FlashcardStats {
  totalDecks: number;
  totalCards: number;
  cardsNew: number;
  cardsLearning: number;
  cardsReviewing: number;
  cardsMastered: number;
  cardsDueToday: number;
  studyStreak: number;
  longestStreak: number;
  totalStudyTimeMinutes: number;
  favoritedCards: number;
}

export interface DeckProgress {
  deckId: string;
  deckTitle: string;
  deckTitleAr: string | null;
  totalCards: number;
  cardsNew: number;
  cardsLearning: number;
  cardsReviewing: number;
  cardsMastered: number;
  masteryPercentage: number;
  lastStudiedAt: string | null;
}

export interface TodayReviewSummary {
  cardsDue: number;
  decksWithDueCards: DeckWithDueCards[];
}

export interface DeckWithDueCards {
  deck: FlashcardDeck;
  cardsDue: number;
}
