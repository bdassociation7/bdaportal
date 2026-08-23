/**
 * Settings Types
 * TypeScript interfaces for user settings and preferences
 */

export interface NotificationSettings {
  user_id?: string;
  membership_updates: boolean;
  certification_updates: boolean;
  new_resources: boolean;
  exam_reminders: boolean;
  pdc_reminders: boolean;
  system_alerts: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserPreferences {
  user_id?: string;
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'ar';
  timezone: string;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateProfileDTO {
  // Personal Information
  first_name?: string;
  last_name?: string;
  phone?: string;
  country_code?: string;
  date_of_birth?: string;

  // Professional Information
  job_title?: string;
  industry?: string;
  experience_years?: number;
  organization?: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type ThemeOption = 'light' | 'dark' | 'system';
export type LanguageOption = 'en' | 'ar';
