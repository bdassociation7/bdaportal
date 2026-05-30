/**
 * Quiz System Constants
 *
 * Centralized constants for Quiz/Mock Exams feature
 */

import type { CertificationType, DifficultyLevel, QuestionType } from '@/entities/quiz';

// =============================================================================
// LABELS & DISPLAY TEXT
// =============================================================================

/**
 * Certification type labels (English)
 */
export const CERTIFICATION_TYPE_LABELS: Record<CertificationType, string> = {
  CP: 'BDA Certified Professional (BDA-CP™)',
  SCP: 'BDA Senior Certified Professional (BDA-SCP™)',
} as const;

/**
 * Certification type labels (Arabic)
 */
export const CERTIFICATION_TYPE_LABELS_AR: Record<CertificationType, string> = {
  CP: 'محترف معتمد (BDA-CP™)',
  SCP: 'محترف معتمد أول (BDA-SCP™)',
} as const;

/**
 * Difficulty level labels
 */
export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
} as const;

/**
 * Difficulty level labels (Arabic)
 */
export const DIFFICULTY_LABELS_AR: Record<DifficultyLevel, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
} as const;

/**
 * Question type labels
 */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Single Choice',
  true_false: 'True/False',
  multi_select: 'Multiple Answers',
} as const;

/**
 * Question type labels (Arabic)
 */
export const QUESTION_TYPE_LABELS_AR: Record<QuestionType, string> = {
  multiple_choice: 'اختيار واحد',
  true_false: 'صح/خطأ',
  multi_select: 'إجابات متعددة',
} as const;

// =============================================================================
// COLORS & STYLING
// =============================================================================

/**
 * Difficulty level colors (Tailwind classes)
 */
export const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  easy: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  hard: 'text-red-600 bg-red-50 border-red-200',
} as const;

/**
 * Difficulty level icons
 */
export const DIFFICULTY_ICONS: Record<DifficultyLevel, string> = {
  easy: '⭐',
  medium: '⭐⭐',
  hard: '⭐⭐⭐',
} as const;

/**
 * Certification type colors
 */
export const CERTIFICATION_COLORS: Record<CertificationType, string> = {
  CP: 'text-blue-600 bg-blue-50 border-blue-200',
  SCP: 'text-purple-600 bg-purple-50 border-purple-200',
} as const;

/**
 * Quiz result colors based on score percentage
 */
export const QUIZ_RESULT_COLORS = {
  excellent: 'text-green-600 bg-green-50 border-green-200', // >= 90%
  good: 'text-blue-600 bg-blue-50 border-blue-200', // >= 70%
  fair: 'text-yellow-600 bg-yellow-50 border-yellow-200', // >= 50%
  poor: 'text-red-600 bg-red-50 border-red-200', // < 50%
} as const;

// =============================================================================
// CONFIGURATION & LIMITS
// =============================================================================

/**
 * Default quiz settings
 */
export const QUIZ_DEFAULTS = {
  TIME_LIMIT_MINUTES: 60,
  PASSING_SCORE_PERCENTAGE: 70,
  DEFAULT_POINTS: 1,
  PAGE_SIZE: 20,
} as const;

/**
 * Quiz validation constraints
 */
export const QUIZ_CONSTRAINTS = {
  // Quiz settings
  MIN_TIME_LIMIT: 1,
  MAX_TIME_LIMIT: 240,
  MIN_PASSING_SCORE: 0,
  MAX_PASSING_SCORE: 100,

  // Questions
  MIN_QUESTIONS_PER_QUIZ: 1,
  MAX_QUESTIONS_PER_QUIZ: 200,
  MIN_POINTS: 1,
  MAX_POINTS: 10,

  // Answers
  MIN_ANSWERS_PER_QUESTION: 2,
  MAX_ANSWERS_PER_QUESTION: 10,
  MIN_CORRECT_ANSWERS: 1,

  // Text lengths
  MAX_QUIZ_TITLE_LENGTH: 200,
  MAX_QUIZ_DESCRIPTION_LENGTH: 1000,
  MAX_QUESTION_TEXT_LENGTH: 1000,
  MAX_ANSWER_TEXT_LENGTH: 500,
  MAX_EXPLANATION_LENGTH: 500,
} as const;

/**
 * Score thresholds for result evaluation
 */
export const SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  FAIR: 50,
  POOR: 0,
} as const;

// =============================================================================
// BOCK DOMAINS (Business Capability Knowledge)
// =============================================================================

/**
 * BoCK™ domains for CP certification
 */
export const BOCK_DOMAINS_CP = [
  'Strategic Thinking',
  'Business Acumen',
  'Problem Solving',
  'Leadership',
  'Communication',
  'Team Collabouration',
  'Innovation & Creativity',
  'Ethics & Professionalism',
] as const;

/**
 * BoCK™ domains for SCP certification
 */
export const BOCK_DOMAINS_SCP = [
  ...BOCK_DOMAINS_CP,
  'Strategic Planning',
  'Organisational Development',
  'Change Management',
  'Advanced Leadership',
  'Stakeholder Management',
] as const;

/**
 * Get BoCK domains by certification type
 */
export const getBockDomains = (certificationType: CertificationType): readonly string[] => {
  return certificationType === 'CP' ? BOCK_DOMAINS_CP : BOCK_DOMAINS_SCP;
};

// =============================================================================
// MESSAGES & NOTIFICATIONS
// =============================================================================

/**
 * Quiz notification messages
 */
export const QUIZ_MESSAGES = {
  // Success messages
  SUCCESS: {
    QUIZ_CREATED: 'Quiz created successfully',
    QUIZ_UPDATED: 'Quiz updated successfully',
    QUIZ_DELETED: 'Quiz deleted successfully',
    QUESTION_CREATED: 'Question added successfully',
    QUESTION_UPDATED: 'Question updated successfully',
    QUESTION_DELETED: 'Question deleted successfully',
    QUIZ_STARTED: 'Quiz started. Good luck!',
    QUIZ_COMPLETED: 'Quiz completed!',
  },

  // Error messages
  ERROR: {
    QUIZ_NOT_FOUND: 'Quiz not found',
    QUIZ_INACTIVE: 'This quiz is not currently available',
    INSUFFICIENT_QUESTIONS: 'Quiz must have at least one question',
    TIME_EXPIRED: 'Time has expired',
    INVALID_ANSWER: 'Please select an answer before proceeding',
    UNAUTHORIZED: 'You do not have permission to perform this action',
    NETWORK_ERROR: 'Network error. Please check your connection.',
  },

  // Warning messages
  WARNING: {
    TIME_RUNNING_OUT: 'Only 5 minutes remaining!',
    UNSAVED_CHANGES: 'You have unsaved changes. Are you sure you want to leave?',
    DELETE_CONFIRMATION: 'Are you sure you want to delete this item?',
    QUIZ_IN_PROGRESS: 'You have a quiz in progress. Do you want to continue?',
  },

  // Info messages
  INFO: {
    NO_QUIZZES_AVAILABLE: 'No quizzes available at the moment',
    QUIZ_NOT_SCORED: 'Note: This is a practice quiz. Your results will not be saved.',
    REVIEW_ANSWERS: 'Review your answers before submitting',
  },
} as const;

/**
 * Quiz notification messages (Arabic)
 */
export const QUIZ_MESSAGES_AR = {
  SUCCESS: {
    QUIZ_CREATED: 'تم إنشاء الاختبار بنجاح',
    QUIZ_UPDATED: 'تم تحديث الاختبار بنجاح',
    QUIZ_DELETED: 'تم حذف الاختبار بنجاح',
    QUESTION_CREATED: 'تم إضافة السؤال بنجاح',
    QUESTION_UPDATED: 'تم تحديث السؤال بنجاح',
    QUESTION_DELETED: 'تم حذف السؤال بنجاح',
    QUIZ_STARTED: 'بدأ الاختبار. حظاً موفقاً!',
    QUIZ_COMPLETED: 'اكتمل الاختبار!',
  },
  ERROR: {
    QUIZ_NOT_FOUND: 'الاختبار غير موجود',
    QUIZ_INACTIVE: 'هذا الاختبار غير متاح حالياً',
    INSUFFICIENT_QUESTIONS: 'يجب أن يحتوي الاختبار على سؤال واحد على الأقل',
    TIME_EXPIRED: 'انتهى الوقت',
    INVALID_ANSWER: 'الرجاء اختيار إجابة قبل المتابعة',
    UNAUTHORIZED: 'ليس لديك إذن لتنفيذ هذا الإجراء',
    NETWORK_ERROR: 'خطأ في الشبكة. يرجى التحقق من اتصالك.',
  },
  WARNING: {
    TIME_RUNNING_OUT: 'بقي 5 دقائق فقط!',
    UNSAVED_CHANGES: 'لديك تغييرات غير محفوظة. هل أنت متأكد أنك تريد المغادرة؟',
    DELETE_CONFIRMATION: 'هل أنت متأكد أنك تريد حذف هذا العنصر؟',
    QUIZ_IN_PROGRESS: 'لديك اختبار قيد التقدم. هل تريد المتابعة؟',
  },
  INFO: {
    NO_QUIZZES_AVAILABLE: 'لا توجد اختبارات متاحة في الوقت الحالي',
    QUIZ_NOT_SCORED: 'ملاحظة: هذا اختبار تدريبي. لن يتم حفظ نتائجك.',
    REVIEW_ANSWERS: 'راجع إجاباتك قبل الإرسال',
  },
} as const;

// =============================================================================
// ROUTES
// =============================================================================

/**
 * Quiz routes
 */
export const QUIZ_ROUTES = {
  // User routes
  LIST: '/mock-exams',
  DETAIL: (id: string) => `/mock-exams/${id}`,
  PLAY: (id: string) => `/mock-exams/${id}/play`,
  RESULTS: (id: string) => `/mock-exams/${id}/results`,
  MY_ATTEMPTS: '/mock-exams/my-attempts',

  // Admin routes
  ADMIN_LIST: '/admin/quizzes',
  ADMIN_CREATE: '/admin/quizzes/new',
  ADMIN_EDIT: (id: string) => `/admin/quizzes/${id}/edit`,
  ADMIN_QUESTIONS: (id: string) => `/admin/quizzes/${id}/questions`,
  ADMIN_QUESTION_BANK: '/admin/question-bank',
} as const;

// =============================================================================
// KEYBOARD SHORTCUTS
// =============================================================================

/**
 * Keyboard shortcuts for quiz navigation
 */
export const QUIZ_KEYBOARD_SHORTCUTS = {
  NEXT_QUESTION: 'ArrowRight',
  PREV_QUESTION: 'ArrowLeft',
  SUBMIT_QUIZ: 'Enter',
  ANSWER_A: '1',
  ANSWER_B: '2',
  ANSWER_C: '3',
  ANSWER_D: '4',
  ANSWER_E: '5',
} as const;

// =============================================================================
// LOCAL STORAGE KEYS
// =============================================================================

/**
 * Local storage keys for quiz state persistence
 */
export const QUIZ_STORAGE_KEYS = {
  CURRENT_QUIZ: 'bda_current_quiz',
  QUIZ_PROGRESS: (quizId: string) => `bda_quiz_progress_${quizId}`,
  QUIZ_SETTINGS: 'bda_quiz_settings',
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get score color based on percentage
 */
export const getScoreColor = (scorePercentage: number): string => {
  if (scorePercentage >= SCORE_THRESHOLDS.EXCELLENT) {
    return QUIZ_RESULT_COLORS.excellent;
  }
  if (scorePercentage >= SCORE_THRESHOLDS.GOOD) {
    return QUIZ_RESULT_COLORS.good;
  }
  if (scorePercentage >= SCORE_THRESHOLDS.FAIR) {
    return QUIZ_RESULT_COLORS.fair;
  }
  return QUIZ_RESULT_COLORS.poor;
};

/**
 * Get score evaluation text
 */
export const getScoreEvaluation = (scorePercentage: number): string => {
  if (scorePercentage >= SCORE_THRESHOLDS.EXCELLENT) {
    return 'Excellent';
  }
  if (scorePercentage >= SCORE_THRESHOLDS.GOOD) {
    return 'Good';
  }
  if (scorePercentage >= SCORE_THRESHOLDS.FAIR) {
    return 'Fair';
  }
  return 'Needs Improvement';
};

/**
 * Get score evaluation text (Arabic)
 */
export const getScoreEvaluationAr = (scorePercentage: number): string => {
  if (scorePercentage >= SCORE_THRESHOLDS.EXCELLENT) {
    return 'ممتاز';
  }
  if (scorePercentage >= SCORE_THRESHOLDS.GOOD) {
    return 'جيد';
  }
  if (scorePercentage >= SCORE_THRESHOLDS.FAIR) {
    return 'مقبول';
  }
  return 'يحتاج تحسين';
};

/**
 * Format time remaining in MM:SS format
 */
export const formatTimeRemaining = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Check if time is running out (less than 5 minutes)
 */
export const isTimeRunningOut = (seconds: number): boolean => {
  return seconds <= 5 * 60 && seconds > 0;
};

/**
 * Calculate quiz duration in minutes
 */
export const calculateQuizDuration = (startTime: Date, endTime: Date): number => {
  const durationMs = endTime.getTime() - startTime.getTime();
  return Math.round(durationMs / 60000);
};
