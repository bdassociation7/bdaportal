/**
 * User Management Service
 * Admin user management for BDA Portal (Supabase users, not WooCommerce)
 */

import { supabase } from '@/lib/supabase';
import type { User, UserFilters, UpdateUserDTO, UserStats, UserResult } from './users.types';

export class UsersService {
  /**
   * Get all users with filters
   */
  static async getUsers(filters: UserFilters = {}): Promise<UserResult<User[]>> {
    try {
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.role) {
        query = query.eq('role', filters.role);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters.profile_completed !== undefined) {
        query = query.eq('profile_completed', filters.profile_completed);
      }

      if (filters.country_code) {
        query = query.eq('country_code', filters.country_code);
      }

      if (filters.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data as User[], error: null };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get single user by ID
   */
  static async getUserById(id: string): Promise<UserResult<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data: data as User, error: null };
    } catch (error) {
      console.error('Error fetching user:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update user
   */
  static async updateUser(id: string, dto: UpdateUserDTO): Promise<UserResult<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(dto)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('User not found or update failed');
      return { data: data as User, error: null };
    } catch (error) {
      console.error('Error updating user:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Toggle user active status
   */
  static async toggleUserStatus(id: string, is_active: boolean): Promise<UserResult<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('User not found or update failed');
      return { data: data as User, error: null };
    } catch (error) {
      console.error('Error toggling user status:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<UserResult<UserStats>> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('role, is_active, profile_completed, created_at');

      if (error) throw error;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats: UserStats = {
        total_users: users.length,
        active_users: users.filter((u) => u.is_active).length,
        by_role: {
          individual: users.filter((u) => u.role === 'individual').length,
          ecp: users.filter((u) => u.role === 'ecp').length,
          pdp: users.filter((u) => u.role === 'pdp').length,
          admin: users.filter((u) => u.role === 'admin').length,
          super_admin: users.filter((u) => u.role === 'super_admin').length,
        },
        profile_completion_rate: users.length > 0
          ? (users.filter((u) => u.profile_completed).length / users.length) * 100
          : 0,
        new_users_this_month: users.filter(
          (u) => new Date(u.created_at) >= firstDayOfMonth
        ).length,
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get unique country codes
   */
  static async getCountryCodes(): Promise<UserResult<string[]>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('country_code')
        .not('country_code', 'is', null);

      if (error) throw error;

      const uniqueCodes = [...new Set(data.map((u) => u.country_code))].filter(Boolean) as string[];
      return { data: uniqueCodes, error: null };
    } catch (error) {
      console.error('Error fetching country codes:', error);
      return { data: null, error: error as Error };
    }
  }
}
