/**
 * Settings Service
 * API calls for user settings, preferences, and profile management
 */

import { supabase } from '@/shared/config/supabase.config';
import type { NotificationSettings, UserPreferences, UpdateProfileDTO } from './settings.types';

export class SettingsService {
  /**
   * Get user's notification settings
   * Creates default settings if none exist
   */
  static async getNotificationSettings(userId: string): Promise<{
    data: NotificationSettings | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no settings exist, create defaults
        if (error.code === 'PGRST116') {
          return this.createDefaultNotificationSettings(userId);
        }
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Create default notification settings for user
   */
  private static async createDefaultNotificationSettings(
    userId: string
  ): Promise<{ data: NotificationSettings | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .insert({
          user_id: userId,
          membership_updates: true,
          certification_updates: true,
          new_resources: true,
          exam_reminders: true,
          pdc_reminders: true,
          system_alerts: true,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update user's notification settings
   */
  static async updateNotificationSettings(
    userId: string,
    settings: Partial<NotificationSettings>
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Get user preferences (theme, language, timezone)
   */
  static async getUserPreferences(userId: string): Promise<{
    data: UserPreferences | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no preferences exist, create defaults
        if (error.code === 'PGRST116') {
          return this.createDefaultPreferences(userId);
        }
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Create default preferences for user
   */
  private static async createDefaultPreferences(
    userId: string
  ): Promise<{ data: UserPreferences | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          theme: 'light',
          language: 'en',
          timezone: 'UTC',
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Update user profile (name, phone, etc.)
   */
  static async updateProfile(
    userId: string,
    updates: UpdateProfileDTO
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('id')
        .single();

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Change user password
   * Uses Supabase Auth to update password
   */
  static async changePassword(
    newPassword: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
