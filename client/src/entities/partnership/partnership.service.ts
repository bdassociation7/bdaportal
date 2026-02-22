/**
 * Partnership Product Mapping Service
 * Handles CRUD operations for WooCommerce to Partnership mappings
 */

import { supabase } from '@/lib/supabase';
import type {
  PartnershipProductMapping,
  CreatePartnershipMappingDTO,
  UpdatePartnershipMappingDTO,
  PartnershipActivationLog,
} from './partnership.types';

export type ServiceResult<T> = { success: true; data: T } | { success: false; message: string };

export class PartnershipService {
  /**
   * Get all partnership product mappings
   */
  static async getAllMappings(): Promise<ServiceResult<PartnershipProductMapping[]>> {
    const { data, error } = await supabase
      .from('partnership_product_mapping')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching partnership mappings:', error);
      return { success: false, message: error.message };
    }

    return { success: true, data: data || [] };
  }

  /**
   * Get active partnership product mappings only
   */
  static async getActiveMappings(): Promise<ServiceResult<PartnershipProductMapping[]>> {
    const { data, error } = await supabase
      .from('partnership_product_mapping')
      .select('*')
      .eq('is_active', true)
      .order('partnership_type', { ascending: true });

    if (error) {
      console.error('Error fetching active partnership mappings:', error);
      return { success: false, message: error.message };
    }

    return { success: true, data: data || [] };
  }

  /**
   * Get a single mapping by ID
   */
  static async getMappingById(id: string): Promise<ServiceResult<PartnershipProductMapping>> {
    const { data, error } = await supabase
      .from('partnership_product_mapping')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching partnership mapping:', error);
      return { success: false, message: error.message };
    }

    return { success: true, data };
  }

  /**
   * Get mapping by WooCommerce product ID
   */
  static async getMappingByProductId(productId: number): Promise<ServiceResult<PartnershipProductMapping | null>> {
    const { data, error } = await supabase
      .from('partnership_product_mapping')
      .select('*')
      .eq('woocommerce_product_id', productId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching partnership mapping by product ID:', error);
      return { success: false, message: error.message };
    }

    return { success: true, data };
  }

  /**
   * Create a new partnership product mapping
   */
  static async createMapping(dto: CreatePartnershipMappingDTO): Promise<ServiceResult<PartnershipProductMapping>> {
    const { data, error } = await supabase
      .from('partnership_product_mapping')
      .insert({
        woocommerce_product_id: dto.woocommerce_product_id,
        product_name: dto.product_name,
        partnership_type: dto.partnership_type,
        license_duration_months: dto.license_duration_months ?? 12,
        max_programs: dto.partnership_type === 'pdp' ? (dto.max_programs ?? 5) : null,
        tier: dto.tier ?? 'standard',
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating partnership mapping:', error);
      return { success: false, message: error.message };
    }

    return { success: true, data };
  }

  /**
   * Update an existing partnership product mapping
   */
  static async updateMapping(id: string, dto: UpdatePartnershipMappingDTO): Promise<ServiceResult<PartnershipProductMapping>> {
    const { data, error } = await supabase
      .from('partnership_product_mapping')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating partnership mapping:', error);
      return { success: false, message: error.message };
    }

    return { success: true, data };
  }

  /**
   * Delete a partnership product mapping
   */
  static async deleteMapping(id: string): Promise<ServiceResult<void>> {
    const { error } = await supabase
      .from('partnership_product_mapping')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting partnership mapping:', error);
      return { success: false, message: error.message };
    }

    return { success: true, data: undefined };
  }

  /**
   * Toggle mapping active status
   */
  static async toggleMappingStatus(id: string, isActive: boolean): Promise<ServiceResult<PartnershipProductMapping>> {
    return this.updateMapping(id, { is_active: isActive });
  }

  /**
   * Get partnership activation logs
   */
  static async getActivationLogs(limit: number = 50): Promise<ServiceResult<PartnershipActivationLog[]>> {
    const { data, error } = await supabase
      .from('partnership_activation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activation logs:', error);
      return { success: false, message: error.message };
    }

    return { success: true, data: data || [] };
  }

  /**
   * Check if result is an error
   */
  static isError<T>(result: ServiceResult<T>): result is { success: false; message: string } {
    return !result.success;
  }
}
