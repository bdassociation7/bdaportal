/**
 * Partner Management Service
 * ECP and PDP partner management (subset of users with partner roles)
 */

import { supabase } from '@/lib/supabase';
import type { Partner, PartnerFilters, UpdatePartnerDTO, PartnerStats, PartnerResult } from './partners.types';

export class PartnersService {
  /**
   * Get all partners from partners table
   */
  static async getPartners(filters: PartnerFilters = {}): Promise<PartnerResult<Partner[]>> {
    try {
      let query = supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.partner_type) {
        query = query.eq('partner_type', filters.partner_type);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters.country) {
        query = query.eq('country', filters.country);
      }

      if (filters.search) {
        query = query.or(
          `company_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%,city.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data as Partner[], error: null };
    } catch (error) {
      console.error('Error fetching partners:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get single partner by ID
   */
  static async getPartnerById(id: string): Promise<PartnerResult<Partner>> {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data: data as Partner, error: null };
    } catch (error) {
      console.error('Error fetching partner:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update partner
   */
  static async updatePartner(id: string, dto: UpdatePartnerDTO): Promise<PartnerResult<Partner>> {
    try {
      const { data, error } = await supabase
        .from('partners')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as Partner, error: null };
    } catch (error) {
      console.error('Error updating partner:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Toggle partner active status
   */
  static async togglePartnerStatus(id: string, is_active: boolean): Promise<PartnerResult<Partner>> {
    try {
      const { data, error } = await supabase
        .from('partners')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as Partner, error: null };
    } catch (error) {
      console.error('Error toggling partner status:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get detailed stats for a specific ECP partner
   */
  static async getECPPartnerStats(partnerId: string): Promise<PartnerResult<{
    total_batches: number;
    active_batches: number;
    completed_batches: number;
    total_trainees: number;
    certified_trainees: number;
    trainers: number;
    vouchers_allocated: number;
    vouchers_used: number;
    pass_rate: number;
  }>> {
    try {
      // Get batch stats
      const { data: batches, error: batchError } = await supabase
        .from('ecp_training_batches')
        .select('id, status')
        .eq('partner_id', partnerId);

      if (batchError) throw batchError;

      // Get trainee stats
      const { data: trainees, error: traineeError } = await supabase
        .from('ecp_trainees')
        .select('id, status, batch_id')
        .in('batch_id', batches?.map(b => b.id) || []);

      // Get trainer count
      const { count: trainerCount, error: trainerError } = await supabase
        .from('ecp_trainers')
        .select('id', { count: 'exact', head: true })
        .eq('partner_id', partnerId);

      // Get voucher stats
      const { data: vouchers, error: voucherError } = await supabase
        .from('ecp_voucher_allocations')
        .select('quantity, vouchers_used')
        .eq('partner_id', partnerId);

      if (voucherError) throw voucherError;

      const totalVouchersAllocated = vouchers?.reduce((sum, v) => sum + (v.quantity || 0), 0) || 0;
      const totalVouchersUsed = vouchers?.reduce((sum, v) => sum + (v.vouchers_used || 0), 0) || 0;

      const totalBatches = batches?.length || 0;
      const activeBatches = batches?.filter(b => b.status === 'in_progress').length || 0;
      const completedBatches = batches?.filter(b => b.status === 'completed').length || 0;
      const totalTrainees = trainees?.length || 0;
      const certifiedTrainees = trainees?.filter(t => t.status === 'certified').length || 0;
      const passRate = totalTrainees > 0 ? Math.round((certifiedTrainees / totalTrainees) * 100) : 0;

      return {
        data: {
          total_batches: totalBatches,
          active_batches: activeBatches,
          completed_batches: completedBatches,
          total_trainees: totalTrainees,
          certified_trainees: certifiedTrainees,
          trainers: trainerCount || 0,
          vouchers_allocated: totalVouchersAllocated,
          vouchers_used: totalVouchersUsed,
          pass_rate: passRate,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error fetching ECP partner stats:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get detailed stats for a specific PDP partner
   */
  static async getPDPPartnerStats(partnerId: string): Promise<PartnerResult<{
    total_programs: number;
    active_programs: number;
    pending_programs: number;
    approved_programs: number;
    total_enrollments: number;
    completions: number;
    pdc_credits_issued: number;
    completion_rate: number;
  }>> {
    try {
      // Get program stats
      const { data: programs, error: programError } = await supabase
        .from('pdp_programs')
        .select('id, status, is_active, max_pdc_credits')
        .eq('provider_id', partnerId);

      if (programError) throw programError;

      // Get enrollment stats if programs exist
      let totalEnrollments = 0;
      let completions = 0;
      let pdcCreditsIssued = 0;

      if (programs && programs.length > 0) {
        const programIds = programs.map(p => p.id);

        const { data: enrollments, error: enrollmentError } = await supabase
          .from('pdp_program_enrolments')
          .select('id, status, pdc_credits_earned')
          .in('program_id', programIds);

        if (!enrollmentError && enrollments) {
          totalEnrollments = enrollments.length;
          completions = enrollments.filter(e => e.status === 'completed').length;
          pdcCreditsIssued = enrollments.reduce((sum, e) => sum + (e.pdc_credits_earned || 0), 0);
        }
      }

      const totalPrograms = programs?.length || 0;
      const activePrograms = programs?.filter(p => p.is_active && p.status === 'approved').length || 0;
      const pendingPrograms = programs?.filter(p => p.status === 'pending' || p.status === 'under_review').length || 0;
      const approvedPrograms = programs?.filter(p => p.status === 'approved').length || 0;
      const completionRate = totalEnrollments > 0 ? Math.round((completions / totalEnrollments) * 100) : 0;

      return {
        data: {
          total_programs: totalPrograms,
          active_programs: activePrograms,
          pending_programs: pendingPrograms,
          approved_programs: approvedPrograms,
          total_enrollments: totalEnrollments,
          completions: completions,
          pdc_credits_issued: pdcCreditsIssued,
          completion_rate: completionRate,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error fetching PDP partner stats:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get partner statistics
   */
  static async getPartnerStats(): Promise<PartnerResult<PartnerStats>> {
    try {
      const { data: partners, error } = await supabase
        .from('partners')
        .select('partner_type, is_active, created_at');

      if (error) throw error;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats: PartnerStats = {
        total_partners: partners.length,
        active_partners: partners.filter((p) => p.is_active).length,
        ecp_partners: partners.filter((p) => p.partner_type === 'ecp').length,
        pdp_partners: partners.filter((p) => p.partner_type === 'pdp').length,
        dual_partners: partners.filter((p) => p.partner_type === 'dual_partner').length,
        profile_completion_rate: 0, // Partners table doesn't have profile_completed field
        new_partners_this_month: partners.filter(
          (p) => new Date(p.created_at) >= firstDayOfMonth
        ).length,
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error fetching partner stats:', error);
      return { data: null, error: error as Error };
    }
  }
}
