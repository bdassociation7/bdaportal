/**
 * Role Mapping Service
 * Manages WordPress to Supabase role mappings
 */

import { supabase } from '@/shared/config/supabase.config';

export interface WordPressRoleMapping {
  id: string;
  wordpress_role: string;
  wordpress_role_display: string;
  supabase_role: 'individual' | 'admin' | 'ecp' | 'pdp' | 'super_admin';
  priority: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WordPressRoleInfo {
  role: string;
  display_name: string;
  description?: string;
}

export interface SupabaseRoleInfo {
  role: 'individual' | 'admin' | 'ecp' | 'pdp' | 'super_admin';
  display_name: string;
  description: string;
}

export class RoleMappingService {

  /**
   * Get all role mappings
   */
  static async getAllMappings(): Promise<{ data: WordPressRoleMapping[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('wordpress_role_mappings')
        .select('*')
        .order('priority', { ascending: false })
        .order('wordpress_role');

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Create or update a role mapping
   */
  static async upsertMapping(mapping: {
    wordpress_role: string;
    wordpress_role_display: string;
    supabase_role: SupabaseRoleInfo['role'];
    priority?: number;
  }): Promise<{ success: boolean; error?: any }> {
    try {
      const { data, error } = await supabase.rpc('upsert_role_mapping', {
        p_wordpress_role: mapping.wordpress_role,
        p_wordpress_role_display: mapping.wordpress_role_display,
        p_supabase_role: mapping.supabase_role,
        p_priority: mapping.priority || 0
      });

      if (error) {
        return { success: false, error };
      }

      return { success: data?.success || true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Delete a role mapping
   */
  static async deleteMapping(mappingId: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase
        .from('wordpress_role_mappings')
        .delete()
        .eq('id', mappingId);

      if (error) {
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Toggle mapping active status
   */
  static async toggleMappingStatus(mappingId: string, isActive: boolean): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase
        .from('wordpress_role_mappings')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', mappingId);

      if (error) {
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Get Supabase role from WordPress role
   */
  static async getSupabaseRole(wpRole: string): Promise<{ role: SupabaseRoleInfo['role'] | null; error?: any }> {
    try {
      const { data, error } = await supabase.rpc('get_supabase_role_from_wp', {
        wp_role: wpRole
      });

      if (error) {
        return { role: null, error };
      }

      return { role: data };
    } catch (error) {
      return { role: null, error };
    }
  }

  /**
   * Get available WordPress roles (mock data - in real app, fetch from WordPress API)
   */
  static getWordPressRoles(): WordPressRoleInfo[] {
    return [
      { role: 'super_admin', display_name: 'Super Admin', description: 'Network administrator with full access' },
      { role: 'administrator', display_name: 'Administrator', description: 'Site administrator with full access' },
      { role: 'editor', display_name: 'Editor', description: 'Can publish and manage posts' },
      { role: 'author', display_name: 'Author', description: 'Can publish and manage own posts' },
      { role: 'contributor', display_name: 'Contributor', description: 'Can write and manage own posts but cannot publish' },
      { role: 'subscriber', display_name: 'Subscriber', description: 'Can only manage their profile' },
      { role: 'customer', display_name: 'Customer', description: 'WooCommerce customer role' },
      { role: 'shop_manager', display_name: 'Shop Manager', description: 'Can manage WooCommerce store' },
    ];
  }

  /**
   * Get available Supabase roles
   */
  static getSupabaseRoles(): SupabaseRoleInfo[] {
    return [
      {
        role: 'individual',
        display_name: 'Individual Professional',
        description: 'Individual business analyst or professional'
      },
      {
        role: 'ecp',
        display_name: 'ECP Partner',
        description: 'Examination and Certification Partner'
      },
      {
        role: 'pdp',
        display_name: 'PDP Partner',
        description: 'Professional Development Partner'
      },
      {
        role: 'admin',
        display_name: 'BDA Administrator',
        description: 'BDA organisation administrator'
      },
      {
        role: 'super_admin',
        display_name: 'Super Administrator',
        description: 'System super administrator with full access'
      },
    ];
  }

  /**
   * Get role mapping statistics
   */
  static async getMappingStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    by_supabase_role: Record<string, number>;
    error?: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('wordpress_role_mappings')
        .select('supabase_role, is_active');

      if (error) {
        return { total: 0, active: 0, inactive: 0, by_supabase_role: {}, error };
      }

      const total = data.length;
      const active = data.filter(m => m.is_active).length;
      const inactive = total - active;

      const by_supabase_role = data.reduce((acc, mapping) => {
        acc[mapping.supabase_role] = (acc[mapping.supabase_role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return { total, active, inactive, by_supabase_role };
    } catch (error) {
      return { total: 0, active: 0, inactive: 0, by_supabase_role: {}, error };
    }
  }

  /**
   * Bulk update mapping priorities
   */
  static async updateMappingPriorities(updates: Array<{ id: string; priority: number }>): Promise<{ success: boolean; error?: any }> {
    try {
      const promises = updates.map(update =>
        supabase
          .from('wordpress_role_mappings')
          .update({
            priority: update.priority,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id)
      );

      const results = await Promise.all(promises);
      const hasError = results.some(result => result.error);

      if (hasError) {
        return { success: false, error: 'Some updates failed' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Import default mappings
   */
  static async importDefaultMappings(): Promise<{ success: boolean; imported: number; error?: any }> {
    try {
      const defaultMappings = [
        { wp: 'administrator', display: 'Administrator', supabase: 'admin', priority: 100 },
        { wp: 'super_admin', display: 'Super Admin', supabase: 'super_admin', priority: 100 },
        { wp: 'editor', display: 'Editor', supabase: 'admin', priority: 80 },
        { wp: 'author', display: 'Author', supabase: 'ecp', priority: 60 },
        { wp: 'contributor', display: 'Contributor', supabase: 'pdp', priority: 50 },
        { wp: 'subscriber', display: 'Subscriber', supabase: 'individual', priority: 40 },
        { wp: 'customer', display: 'Customer', supabase: 'individual', priority: 30 },
        { wp: 'shop_manager', display: 'Shop Manager', supabase: 'admin', priority: 70 },
      ];

      let imported = 0;
      for (const mapping of defaultMappings) {
        const result = await this.upsertMapping({
          wordpress_role: mapping.wp,
          wordpress_role_display: mapping.display,
          supabase_role: mapping.supabase as SupabaseRoleInfo['role'],
          priority: mapping.priority
        });

        if (result.success) {
          imported++;
        }
      }

      return { success: true, imported };
    } catch (error) {
      return { success: false, imported: 0, error };
    }
  }
}