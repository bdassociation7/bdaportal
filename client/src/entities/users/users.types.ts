/**
 * User Management Types
 * Admin user management for BDA Portal (Supabase users, not WooCommerce)
 */

export type UserRole = 'individual' | 'ecp' | 'pdp' | 'admin' | 'super_admin';

export interface User {
  id: string;
  role: UserRole;

  // Personal Information
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  country_code: string | null;
  date_of_birth: string | null;

  // Professional Information
  job_title: string | null;
  company_name: string | null;
  industry: string | null;
  experience_years: number | null;

  // Preferences
  preferred_language: string | null;
  timezone: string | null;
  notifications_enabled: boolean | null;

  // Identity Verification
  identity_verified: boolean | null;
  identity_verified_at: string | null;
  identity_verified_by: string | null;
  identity_document_url: string | null;

  // WordPress Integration
  wp_user_id: number | null;
  wp_sync_status: string | null;

  // Metadata
  profile_completed: boolean | null;
  last_login_at: string | null;
  is_active: boolean | null;
  created_at: string | null;
  created_from: string | null;
  updated_at: string | null;
  signup_type: string | null;
  organization: string | null;
}

export interface UserFilters {
  role?: UserRole;
  is_active?: boolean;
  profile_completed?: boolean;
  search?: string; // Search in name, email
  country_code?: string;
}

export interface UpdateUserDTO {
  role?: UserRole;
  first_name?: string;
  last_name?: string;
  phone?: string;
  country_code?: string;
  job_title?: string;
  company_name?: string;
  industry?: string;
  experience_years?: number;
  preferred_language?: 'en' | 'ar';
  timezone?: string;
  notifications_enabled?: boolean;
  is_active?: boolean;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  by_role: Record<UserRole, number>;
  profile_completion_rate: number;
  new_users_this_month: number;
}

export interface UserResult<T> {
  data: T | null;
  error: Error | null;
}
