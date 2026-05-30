/**
 * Lesson Types
 * Sub-competencies (3 per main competency = 42 total)
 */

import type { Database } from '@/shared/database.types';

// Database row type
export type LessonRow = Database['public']['Tables']['curriculum_lessons']['Row'];
export type LessonInsert = Database['public']['Tables']['curriculum_lessons']['Insert'];
export type LessonUpdate = Database['public']['Tables']['curriculum_lessons']['Update'];

// Lesson with module details
export interface Lesson extends LessonRow {
  module?: {
    id: string;
    competency_name: string;
    competency_name_ar?: string | null;
    section_type: 'knowledge_based' | 'behavioural';
    certification_type: 'CP' | 'SCP';
    order_index?: number;
    exam_language?: 'en' | 'ar';
  };
  quiz?: {
    id: string;
    title: string;
    title_ar?: string | null;
  };
}

// Create lesson DTO
export interface CreateLessonDTO {
  module_id: string;
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  content: Record<string, any>; // TipTap JSON
  content_ar?: Record<string, any>;
  learning_objectives?: string[];
  learning_objectives_ar?: string[];
  estimated_duration_hours?: number;
  order_index: 1 | 2 | 3; // Must be 1, 2, or 3
  lesson_quiz_id?: string;
  quiz_required?: boolean;
  quiz_passing_score?: number;
  is_published?: boolean;
  exam_language?: 'en' | 'ar';
}

// Update lesson DTO
export interface UpdateLessonDTO {
  title?: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  content?: Record<string, any>;
  content_ar?: Record<string, any>;
  learning_objectives?: string[];
  learning_objectives_ar?: string[];
  estimated_duration_hours?: number;
  order_index?: 1 | 2 | 3;
  lesson_quiz_id?: string;
  quiz_required?: boolean;
  quiz_passing_score?: number;
  is_published?: boolean;
}

// Exam language type
export type ExamLanguage = 'en' | 'ar';

// Lesson filters
export interface LessonFilters {
  module_id?: string;
  certification_type?: 'CP' | 'SCP';
  section_type?: 'knowledge_based' | 'behavioural';
  is_published?: boolean;
  order_index?: 1 | 2 | 3;
  has_quiz?: boolean;
  exam_language?: ExamLanguage;
}

// Lesson with progress (for user-facing)
export interface LessonWithProgress extends Lesson {
  progress?: {
    status: 'locked' | 'in_progress' | 'quiz_pending' | 'completed';
    progress_percentage: number;
    best_quiz_score?: number | null;
    is_unlocked: boolean;
  };
}

// Lesson summary for admin
export interface LessonSummary {
  total_lessons: number;
  published_lessons: number;
  draft_lessons: number;
  lessons_with_quiz: number;
  lessons_without_quiz: number;
}
