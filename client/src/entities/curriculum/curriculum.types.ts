import type { Database } from '@/shared/database.types';

// =============================================================================
// DATABASE TYPES (from Supabase)
// =============================================================================

export type CurriculumModule = Database['public']['Tables']['curriculum_modules']['Row'];
export type CurriculumModuleInsert = Database['public']['Tables']['curriculum_modules']['Insert'];
export type CurriculumModuleUpdate = Database['public']['Tables']['curriculum_modules']['Update'];

export type UserCurriculumAccess = Database['public']['Tables']['user_curriculum_access']['Row'];
export type UserCurriculumAccessInsert = Database['public']['Tables']['user_curriculum_access']['Insert'];
export type UserCurriculumAccessUpdate = Database['public']['Tables']['user_curriculum_access']['Update'];

export type UserCurriculumProgress = Database['public']['Tables']['user_curriculum_progress']['Row'];
export type UserCurriculumProgressInsert = Database['public']['Tables']['user_curriculum_progress']['Insert'];
export type UserCurriculumProgressUpdate = Database['public']['Tables']['user_curriculum_progress']['Update'];

// =============================================================================
// ENUMS
// =============================================================================

export type SectionType = 'knowledge_based' | 'behavioural' | 'intro' | 'outro';
export type ModuleStatus = 'locked' | 'in_progress' | 'quiz_pending' | 'completed';
export type CertificationType = 'CP' | 'SCP';
export type ExamLanguage = 'en' | 'ar';

// =============================================================================
// RICH CONTENT TYPES (TipTap JSON format)
// =============================================================================

export interface ContentNode {
  type: string;
  attrs?: Record<string, any>;
  content?: ContentNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

export interface RichContent {
  type: 'doc';
  content: ContentNode[];
}

// =============================================================================
// BUSINESS LOGIC TYPES
// =============================================================================

/**
 * Module with computed unlock status
 */
export interface CurriculumModuleWithStatus extends CurriculumModule {
  is_unlocked: boolean;
  user_progress?: UserCurriculumProgress;
}

/**
 * BoCK Competency (7 knowledge + 7 behavioral)
 */
export interface BoCKCompetency {
  id: string;
  name: string;
  name_ar: string;
  section_type: SectionType;
  icon: string;
  description: string;
  order_index: number;
}

/**
 * Dashboard data with sections
 */
export interface CurriculumDashboard {
  access: UserCurriculumAccess;
  knowledgeModules: CurriculumModuleWithStatus[];
  behavioralModules: CurriculumModuleWithStatus[];
  overallProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  nextModule?: CurriculumModuleWithStatus;
}

/**
 * Module detail with full content
 */
export interface ModuleDetail {
  module: CurriculumModule;
  progress: UserCurriculumProgress;
  isUnlocked: boolean;
  prerequisiteModule?: CurriculumModule;
  nextModule?: CurriculumModule;
}

/**
 * Quiz completion result
 */
export interface QuizCompletionResult {
  passed: boolean;
  score: number;
  nextModuleUnlocked: boolean;
  nextModuleId?: string;
}

/**
 * Access check result
 */
export interface AccessCheckResult {
  hasAccess: boolean;
  access?: UserCurriculumAccess;
  reason?: 'no_purchase' | 'expired' | 'no_access_record';
  expiresAt?: string;
}

// =============================================================================
// DTO TYPES (for API calls)
// =============================================================================

/**
 * DTO for creating a new module (admin)
 */
export interface CreateModuleDTO {
  section_type: SectionType;
  competency_name: string;
  competency_name_ar?: string;
  order_index: number;
  icon?: string;
  content: RichContent;
  content_ar?: RichContent;
  description?: string;
  description_ar?: string;
  learning_objectives?: string[];
  learning_objectives_ar?: string[];
  estimated_duration_hours?: number;
  prerequisite_module_id?: string;
  quiz_id?: string;
  quiz_required?: boolean;
  quiz_passing_score?: number;
  certification_type: CertificationType;
  exam_language: ExamLanguage;
  is_published?: boolean;
}

/**
 * DTO for updating progress
 */
export interface UpdateProgressDTO {
  progress_percentage?: number;
  time_spent_minutes?: number;
  status?: ModuleStatus;
  last_accessed_at?: string;
}

/**
 * DTO for granting access
 */
export interface GrantAccessDTO {
  user_id: string;
  certification_type: CertificationType;
  woocommerce_order_id?: number;
  woocommerce_product_id?: number;
  purchased_at: string;
  expires_at: string;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

export interface ModuleFilters {
  section_type?: SectionType;
  certification_type?: CertificationType;
  exam_language?: ExamLanguage;
  is_published?: boolean;
  search?: string;
}

export interface ProgressFilters {
  user_id?: string;
  status?: ModuleStatus;
  certification_type?: CertificationType;
}

// =============================================================================
// SERVICE RESPONSE TYPES
// =============================================================================

export interface ServiceResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
