/**
 * PDC Service
 * Professional Development Credits management
 */

import { supabase } from '@/lib/supabase';
import type {
  PdcEntry,
  PdpProgram,
  CreatePdcEntryDTO,
  UpdatePdcEntryDTO,
  ReviewPdcDTO,
  PdcFilters,
  PdcStats,
  UserPdcSummary,
  PdcResult,
} from './pdcs.types';

export class PdcsService {
  /**
   * Upload certificate to Supabase Storage
   */
  static async uploadCertificate(file: File, userId: string): Promise<PdcResult<string>> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `pdc-certificates/${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('resources') // Using same bucket as resources
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;
      return { data: data.path, error: null };
    } catch (error) {
      console.error('Error uploading certificate:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Create PDC entry
   */
  static async createPdcEntry(userId: string, dto: CreatePdcEntryDTO): Promise<PdcResult<PdcEntry>> {
    try {
      // Upload certificate if provided
      let certificateUrl: string | null = null;
      if (dto.certificate_file) {
        const uploadResult = await this.uploadCertificate(dto.certificate_file, userId);
        if (uploadResult.error) throw uploadResult.error;
        certificateUrl = uploadResult.data;
      }

      const { data, error } = await supabase
        .from('pdc_entries')
        .insert({
          user_id: userId,
          certification_type: dto.certification_type,
          program_id: dto.program_id || null,
          activity_type: dto.activity_type,
          activity_title: dto.activity_title,
          activity_title_ar: dto.activity_title_ar || null,
          activity_description: dto.activity_description || null,
          credits_claimed: dto.credits_claimed,
          activity_date: dto.activity_date,
          certificate_url: certificateUrl,
          notes: dto.notes || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return { data: data as PdcEntry, error: null };
    } catch (error) {
      console.error('Error creating PDC entry:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get PDC entries with filters
   */
  static async getPdcEntries(filters: PdcFilters = {}): Promise<PdcResult<PdcEntry[]>> {
    try {
      let query = supabase
        .from('pdc_entries')
        .select(`
          *,
          user:users!pdc_entries_user_id_fkey(first_name, last_name, email),
          reviewer:users!pdc_entries_reviewed_by_fkey(first_name, last_name)
        `)
        .order('submission_date', { ascending: false });

      // Apply filters
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.certification_type) {
        query = query.eq('certification_type', filters.certification_type);
      }

      if (filters.activity_type) {
        query = query.eq('activity_type', filters.activity_type);
      }

      if (filters.date_from) {
        query = query.gte('activity_date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('activity_date', filters.date_to);
      }

      if (filters.search) {
        query = query.or(
          `activity_title.ilike.%${filters.search}%,activity_description.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data as PdcEntry[], error: null };
    } catch (error) {
      console.error('Error fetching PDC entries:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get single PDC entry
   */
  static async getPdcEntryById(id: string): Promise<PdcResult<PdcEntry>> {
    try {
      const { data, error } = await supabase
        .from('pdc_entries')
        .select(`
          *,
          user:users!pdc_entries_user_id_fkey(first_name, last_name, email),
          reviewer:users!pdc_entries_reviewed_by_fkey(first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data: data as PdcEntry, error: null };
    } catch (error) {
      console.error('Error fetching PDC entry:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update PDC entry (user can only update pending entries)
   */
  static async updatePdcEntry(id: string, dto: UpdatePdcEntryDTO): Promise<PdcResult<PdcEntry>> {
    try {
      const { data, error } = await supabase
        .from('pdc_entries')
        .update(dto)
        .eq('id', id)
        .eq('status', 'pending') // Only pending can be updated by user
        .select()
        .single();

      if (error) throw error;
      return { data: data as PdcEntry, error: null };
    } catch (error) {
      console.error('Error updating PDC entry:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Delete PDC entry (only pending)
   */
  static async deletePdcEntry(id: string): Promise<PdcResult<void>> {
    try {
      const { error } = await supabase
        .from('pdc_entries')
        .delete()
        .eq('id', id)
        .eq('status', 'pending');

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      console.error('Error deleting PDC entry:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Review PDC entry (Admin only)
   */
  static async reviewPdcEntry(
    id: string,
    reviewerId: string,
    dto: ReviewPdcDTO
  ): Promise<PdcResult<PdcEntry>> {
    try {
      const updateData: any = {
        status: dto.status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      };

      if (dto.status === 'approved') {
        // For approved entries, credits_approved is required
        updateData.credits_approved = dto.credits_approved ?? 0;
      } else if (dto.status === 'rejected') {
        // For rejected entries, set credits_approved to null and add rejection reason
        updateData.credits_approved = null;
        updateData.rejection_reason = dto.rejection_reason || 'No reason provided';
      }

      const { data, error } = await supabase
        .from('pdc_entries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as PdcEntry, error: null };
    } catch (error) {
      console.error('Error reviewing PDC entry:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get PDC statistics
   */
  static async getPdcStats(): Promise<PdcResult<PdcStats>> {
    try {
      const { data: entries, error } = await supabase
        .from('pdc_entries')
        .select('status, certification_type, credits_claimed, credits_approved');

      if (error) throw error;

      const stats: PdcStats = {
        total_entries: entries.length,
        pending_entries: entries.filter((e) => e.status === 'pending').length,
        approved_entries: entries.filter((e) => e.status === 'approved').length,
        rejected_entries: entries.filter((e) => e.status === 'rejected').length,
        total_credits_claimed: entries.reduce((sum, e) => sum + e.credits_claimed, 0),
        total_credits_approved: entries
          .filter((e) => e.status === 'approved')
          .reduce((sum, e) => sum + (e.credits_approved || 0), 0),
        by_certification_type: {
          CP: entries.filter((e) => e.certification_type === 'CP').length,
          SCP: entries.filter((e) => e.certification_type === 'SCP').length,
        },
        by_status: {
          pending: entries.filter((e) => e.status === 'pending').length,
          approved: entries.filter((e) => e.status === 'approved').length,
          rejected: entries.filter((e) => e.status === 'rejected').length,
          expired: entries.filter((e) => e.status === 'expired').length,
        },
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error fetching PDC stats:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get user's PDC summary
   */
  static async getUserPdcSummary(
    userId: string,
    certificationType: 'CP' | 'SCP'
  ): Promise<PdcResult<UserPdcSummary>> {
    try {
      const { data: total, error: totalError } = await supabase.rpc('get_user_pdc_total', {
        p_user_id: userId,
        p_certification_type: certificationType,
      });

      if (totalError) throw totalError;

      const { data: entries, error: entriesError } = await supabase
        .from('pdc_entries')
        .select('status, credits_claimed')
        .eq('user_id', userId)
        .eq('certification_type', certificationType);

      if (entriesError) throw entriesError;

      const summary: UserPdcSummary = {
        user_id: userId,
        certification_type: certificationType,
        total_approved_credits: total || 0,
        pending_credits: entries
          .filter((e) => e.status === 'pending')
          .reduce((sum, e) => sum + e.credits_claimed, 0),
        total_entries: entries.length,
      };

      return { data: summary, error: null };
    } catch (error) {
      console.error('Error fetching user PDC summary:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get PDC cycle totals for a specific certification
   * Returns current cycle credits, reserved credits for next cycle, and total entries
   */
  static async getCycleTotals(certificationId: string): Promise<PdcResult<{
    current_cycle_credits: number;
    reserved_next_cycle_credits: number;
    total_entries: number;
  }>> {
    try {
      const { data, error } = await supabase.rpc('get_cycle_pdc_totals', {
        p_certification_id: certificationId,
      });

      if (error) throw error;

      return {
        data: data?.[0] || {
          current_cycle_credits: 0,
          reserved_next_cycle_credits: 0,
          total_entries: 0,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error fetching cycle totals:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get active PDP programs
   */
  static async getActivePrograms(): Promise<PdcResult<PdpProgram[]>> {
    try {
      const { data, error } = await supabase
        .from('pdp_programs')
        .select('*')
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString().split('T')[0])
        .order('program_name');

      if (error) throw error;
      return { data: data as PdpProgram[], error: null };
    } catch (error) {
      console.error('Error fetching active programs:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Validate program ID
   */
  static async validateProgramId(programId: string): Promise<PdcResult<{
    is_valid: boolean;
    max_credits: number | null;
    program_name: string | null;
  }>> {
    try {
      const { data, error } = await supabase.rpc('validate_program_id', {
        p_program_id: programId,
      });

      if (error) throw error;
      return { data: data[0] || { is_valid: false, max_credits: null, program_name: null }, error: null };
    } catch (error) {
      console.error('Error validating program ID:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get detailed program information for auto-fill
   */
  static async getProgramDetails(programId: string): Promise<PdcResult<{
    is_valid: boolean;
    program_id: string | null;
    program_name: string | null;
    program_name_ar: string | null;
    max_pdc_credits: number | null;
    activity_type: string | null;
    provider_name: string | null;
    valid_until: string | null;
    message: string;
  }>> {
    try {
      const { data, error } = await supabase.rpc('get_pdp_program_details', {
        p_program_id: programId,
      });

      if (error) throw error;
      return {
        data: data?.[0] || {
          is_valid: false,
          program_id: null,
          program_name: null,
          program_name_ar: null,
          max_pdc_credits: null,
          activity_type: null,
          provider_name: null,
          valid_until: null,
          message: 'Program not found',
        },
        error: null,
      };
    } catch (error) {
      console.error('Error getting program details:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Check if user has already used a program ID
   */
  static async checkProgramAlreadyUsed(userId: string, programId: string): Promise<PdcResult<boolean>> {
    try {
      const { data, error } = await supabase.rpc('check_program_already_used', {
        p_user_id: userId,
        p_program_id: programId,
      });

      if (error) throw error;
      return { data: data as boolean, error: null };
    } catch (error) {
      console.error('Error checking program usage:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Create PDC entry with auto-approval for valid programs
   */
  static async createPdcEntryWithAutoApprove(
    userId: string,
    dto: CreatePdcEntryDTO
  ): Promise<PdcResult<{
    entry_id: string;
    final_status: string;
    credits_approved: number | null;
    auto_approved: boolean;
    program_name: string | null;
    message: string;
  }>> {
    try {
      // Upload certificate if provided
      let certificateUrl: string | null = null;
      if (dto.certificate_file) {
        const uploadResult = await this.uploadCertificate(dto.certificate_file, userId);
        if (uploadResult.error) throw uploadResult.error;
        certificateUrl = uploadResult.data;
      }

      const { data, error } = await supabase.rpc('submit_pdc_with_auto_approve', {
        p_user_id: userId,
        p_certification_type: dto.certification_type,
        p_program_id: dto.program_id || '',
        p_activity_type: dto.activity_type,
        p_activity_title: dto.activity_title,
        p_activity_title_ar: dto.activity_title_ar || null,
        p_activity_description: dto.activity_description || null,
        p_credits_claimed: dto.credits_claimed,
        p_activity_date: dto.activity_date,
        p_certificate_url: certificateUrl,
        p_notes: dto.notes || null,
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result) {
        throw new Error('No response from auto-approve function');
      }

      // Check if it's a duplicate submission
      if (result.final_status === 'duplicate') {
        return {
          data: null,
          error: new Error(result.message || 'This Program ID has already been used'),
        };
      }

      return { data: result, error: null };
    } catch (error) {
      console.error('Error creating PDC entry with auto-approve:', error);
      return { data: null, error: error as Error };
    }
  }
}
