/**
 * PDP (Professional Development Provider) Service
 * API calls for PDP partner management
 */

import { supabase } from '@/lib/supabase';
import type {
  PDPProgram,
  PdpProgram,
  ProgramFilters,
  PdpProgramFilters,
  PdpProgramStats,
  PdpProgramResult,
  PDPDashboardStats,
  BockCompetency,
  CreateProgramDTO,
  UpdateProgramDTO,
  AnnualReport,
  CreateReportDTO,
  UpdateReportDTO,
  PDPLicenseInfo,
  ProgramSlotStatus,
  CreateLicenseRequestDTO,
  PDPLicenseRequest,
  PDPToolkitItem,
  ToolkitCategory,
  CreateToolkitItemDTO,
  UpdateToolkitItemDTO,
  PDPPartnerProfile,
  UpdatePDPPartnerProfileDTO,
  PDPGuideline,
  GuidelineCategory,
  CreatePDPGuidelineDTO,
  UpdatePDPGuidelineDTO,
} from './pdp.types';

interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

export class PDPService {
  // ==========================================================================
  // Dashboard
  // ==========================================================================

  static async getDashboardStats(): Promise<ServiceResult<PDPDashboardStats>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('get_pdp_dashboard_stats', {
        p_partner_id: user.id,
      });

      if (error) throw error;
      return { data: data as PDPDashboardStats, error: null };
    } catch (error) {
      console.error('Error fetching PDP dashboard stats:', error);
      return { data: null, error: error as Error };
    }
  }

  // ==========================================================================
  // BoCK Competencies
  // ==========================================================================

  static async getBockCompetencies(): Promise<ServiceResult<BockCompetency[]>> {
    try {
      const { data, error } = await supabase
        .from('bock_competencies')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return { data: data as BockCompetency[], error: null };
    } catch (error) {
      console.error('Error fetching BoCK competencies:', error);
      return { data: null, error: error as Error };
    }
  }

  // ==========================================================================
  // Programs (Partner)
  // ==========================================================================

  static async getMyPrograms(filters: ProgramFilters = {}): Promise<ServiceResult<PDPProgram[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use RPC function to get programs with enrollment counts
      const { data: programs, error: rpcError } = await supabase
        .rpc('get_my_pdp_programs_with_stats');

      if (rpcError) throw rpcError;
      if (!programs) return { data: [], error: null };

      // Apply client-side filtering (since RPC doesn't support dynamic filters)
      let filteredPrograms = programs;

      if (filters.status) {
        filteredPrograms = filteredPrograms.filter(p => p.status === filters.status);
      }
      if (filters.activity_type) {
        filteredPrograms = filteredPrograms.filter(p => p.activity_type === filters.activity_type);
      }
      if (filters.is_active !== undefined) {
        filteredPrograms = filteredPrograms.filter(p => p.is_active === filters.is_active);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredPrograms = filteredPrograms.filter(p =>
          p.program_name.toLowerCase().includes(searchLower) ||
          p.program_id.toLowerCase().includes(searchLower)
        );
      }

      return { data: filteredPrograms as PDPProgram[], error: null };
    } catch (error) {
      console.error('Error fetching programs:', error);
      return { data: null, error: error as Error };
    }
  }

  static async getProgram(id: string): Promise<ServiceResult<PDPProgram>> {
    try {
      // Get program with enrolment stats using RPC
      const { data: programsWithStats, error: rpcError } = await supabase
        .rpc('get_pdp_program_with_stats', { p_program_id: id });

      if (rpcError) throw rpcError;
      if (!programsWithStats || programsWithStats.length === 0) {
        throw new Error('Program not found');
      }

      const programWithStats = programsWithStats[0];

      // Also fetch competencies separately (can't do this in RPC easily)
      const { data: competencies, error: compError } = await supabase
        .from('pdp_program_competencies')
        .select(`
          id,
          competency_id,
          relevance_level,
          competency:bock_competencies(*)
        `)
        .eq('program_id', id);

      if (compError) throw compError;

      // Merge competencies into program data
      const programData = {
        ...programWithStats,
        competencies: competencies || [],
      };

      return { data: programData as PDPProgram, error: null };
    } catch (error) {
      console.error('Error fetching program:', error);
      return { data: null, error: error as Error };
    }
  }

  static async createProgram(dto: CreateProgramDTO): Promise<ServiceResult<PDPProgram>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's company name for provider_name
      const { data: userData } = await supabase
        .from('users')
        .select('company_name')
        .eq('id', user.id)
        .single();

      // Get partner license dates (valid_from/until = partnership period)
      const { data: partnerData } = await supabase
        .from('partners')
        .select('license_valid_from, license_valid_until')
        .eq('id', user.id)
        .single();

      // Generate program ID
      const { data: programIdData } = await supabase.rpc('generate_pdp_program_id', {
        p_provider_id: user.id,
      });

      const { competency_ids, ...programData } = dto;

      // Fallback ID generation if RPC fails
      const fallbackId = `ID-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      const { data, error } = await supabase
        .from('pdp_programs')
        .insert({
          ...programData,
          provider_id: user.id,
          provider_name: userData?.company_name || 'Unknown Provider',
          program_id: programIdData || fallbackId,
          created_by: user.id,
          status: 'draft',
          // Override valid dates with partnership period automatically
          valid_from: partnerData?.license_valid_from || programData.valid_from,
          valid_until: partnerData?.license_valid_until || programData.valid_until,
        })
        .select()
        .single();

      if (error) throw error;

      // Add competencies if provided
      if (competency_ids && competency_ids.length > 0) {
        await supabase.from('pdp_program_competencies').insert(
          competency_ids.map((c) => ({
            program_id: data.id,
            competency_id: c.id,
            relevance_level: c.level,
          }))
        );
      }

      return { data: data as PDPProgram, error: null };
    } catch (error) {
      console.error('Error creating program:', error);
      return { data: null, error: error as Error };
    }
  }

  static async updateProgram(id: string, dto: UpdateProgramDTO): Promise<ServiceResult<PDPProgram>> {
    try {
      const { competency_ids, ...programData } = dto;

      const { data, error } = await supabase
        .from('pdp_programs')
        .update(programData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update competencies if provided
      if (competency_ids) {
        // Delete existing
        await supabase.from('pdp_program_competencies').delete().eq('program_id', id);

        // Add new ones
        if (competency_ids.length > 0) {
          await supabase.from('pdp_program_competencies').insert(
            competency_ids.map((c) => ({
              program_id: id,
              competency_id: c.id,
              relevance_level: c.level,
            }))
          );
        }
      }

      return { data: data as PDPProgram, error: null };
    } catch (error) {
      console.error('Error updating program:', error);
      return { data: null, error: error as Error };
    }
  }

  static async submitProgramForReview(id: string): Promise<ServiceResult<PDPProgram>> {
    // Auto-approve programs on submission - admin can view for visibility only
    const now = new Date().toISOString();

    // Get the program's existing valid_from/until (already set from partnership period)
    const { data: program } = await supabase
      .from('pdp_programs')
      .select('valid_from, valid_until, provider_id')
      .eq('id', id)
      .single();

    // Try to get partner license dates as fallback
    let validFrom = program?.valid_from || now.split('T')[0];
    let validUntil = program?.valid_until || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (program?.provider_id && (!program.valid_from || !program.valid_until)) {
      const { data: partnerData } = await supabase
        .from('partners')
        .select('license_valid_from, license_valid_until')
        .eq('id', program.provider_id)
        .single();
      if (partnerData?.license_valid_from) validFrom = partnerData.license_valid_from;
      if (partnerData?.license_valid_until) validUntil = partnerData.license_valid_until;
    }

    return this.updateProgram(id, {
      status: 'approved',
      is_active: true,
      reviewed_at: now,
      valid_from: validFrom,
      valid_until: validUntil,
    });
  }

  static async deleteProgram(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase.from('pdp_programs').delete().eq('id', id);
      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      console.error('Error deleting program:', error);
      return { data: null, error: error as Error };
    }
  }

  // ==========================================================================
  // Annual Reports
  // ==========================================================================

  static async getAnnualReports(): Promise<ServiceResult<AnnualReport[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('pdp_annual_reports')
        .select('*')
        .eq('partner_id', user.id)
        .order('report_year', { ascending: false });

      if (error) throw error;
      return { data: data as AnnualReport[], error: null };
    } catch (error) {
      console.error('Error fetching annual reports:', error);
      return { data: null, error: error as Error };
    }
  }

  static async createAnnualReport(dto: CreateReportDTO): Promise<ServiceResult<AnnualReport>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get stats for the report year
      const { data: programs } = await supabase
        .from('pdp_programs')
        .select('id')
        .eq('provider_id', user.id);

      const programIds = programs?.map((p) => p.id) || [];
      let enrolmentCount = 0;
      let completionCount = 0;
      let pdcCredits = 0;

      if (programIds.length > 0) {
        const { data: enrolments } = await supabase
          .from('pdp_program_enrollments')
          .select('status, pdc_credits_earned')
          .in('program_id', programIds);

        enrolmentCount = enrolments?.length || 0;
        completionCount = enrolments?.filter((e) => e.status === 'completed').length || 0;
        pdcCredits = enrolments?.reduce((sum, e) => sum + (e.pdc_credits_earned || 0), 0) || 0;
      }

      const { data, error } = await supabase
        .from('pdp_annual_reports')
        .insert({
          ...dto,
          partner_id: user.id,
          total_programs: programs?.length || 0,
          total_enrolments: enrolmentCount,
          total_completions: completionCount,
          total_pdc_credits_issued: pdcCredits,
          completion_rate: enrolmentCount > 0 ? (completionCount / enrolmentCount) * 100 : null,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return { data: data as AnnualReport, error: null };
    } catch (error) {
      console.error('Error creating annual report:', error);
      return { data: null, error: error as Error };
    }
  }

  static async updateAnnualReport(id: string, dto: UpdateReportDTO): Promise<ServiceResult<AnnualReport>> {
    try {
      const updateData: any = { ...dto };
      if (dto.status === 'submitted') {
        updateData.submitted_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('pdp_annual_reports')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as AnnualReport, error: null };
    } catch (error) {
      console.error('Error updating annual report:', error);
      return { data: null, error: error as Error };
    }
  }

  // ==========================================================================
  // License Management
  // ==========================================================================

  static async getLicenseInfo(): Promise<ServiceResult<PDPLicenseInfo>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('get_pdp_license_info', {
        p_partner_id: user.id,
      });

      if (error) throw error;
      return { data: data as PDPLicenseInfo, error: null };
    } catch (error) {
      console.error('Error fetching PDP license info:', error);
      return { data: null, error: error as Error };
    }
  }

  static async getProgramSlotStatus(): Promise<ServiceResult<ProgramSlotStatus>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('can_pdp_submit_program', {
        p_partner_id: user.id,
      });

      if (error) throw error;
      return { data: data as ProgramSlotStatus, error: null };
    } catch (error) {
      console.error('Error checking program slot status:', error);
      return { data: null, error: error as Error };
    }
  }

  static async submitLicenseRequest(dto: CreateLicenseRequestDTO): Promise<ServiceResult<PDPLicenseRequest>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get license ID
      const { data: license } = await supabase
        .from('pdp_licenses')
        .select('id, max_programs')
        .eq('partner_id', user.id)
        .single();

      if (!license) throw new Error('No license found');

      const { data, error } = await supabase
        .from('pdp_license_requests')
        .insert({
          license_id: license.id,
          partner_id: user.id,
          request_type: dto.request_type,
          requested_slots: dto.requested_slots,
          current_slots: license.max_programs,
          justification: dto.justification,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Update renewal_requested flag if it's a renewal
      if (dto.request_type === 'renewal') {
        await supabase
          .from('pdp_licenses')
          .update({
            renewal_requested: true,
            renewal_requested_at: new Date().toISOString(),
          })
          .eq('id', license.id);
      }

      return { data: data as PDPLicenseRequest, error: null };
    } catch (error) {
      console.error('Error submitting license request:', error);
      return { data: null, error: error as Error };
    }
  }

  static async cancelLicenseRequest(requestId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('pdp_license_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('status', 'pending');

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      console.error('Error cancelling license request:', error);
      return { data: null, error: error as Error };
    }
  }

  // ==========================================================================
  // Toolkit
  // ==========================================================================

  static async getToolkitItems(category?: ToolkitCategory): Promise<ServiceResult<PDPToolkitItem[]>> {
    try {
      let query = supabase
        .from('pdp_toolkit_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data: data as PDPToolkitItem[], error: null };
    } catch (error) {
      console.error('Error fetching toolkit items:', error);
      return { data: null, error: error as Error };
    }
  }

  // Admin: Get all toolkit items (including inactive)
  static async getAllToolkitItems(): Promise<ServiceResult<PDPToolkitItem[]>> {
    try {
      const { data, error } = await supabase
        .from('pdp_toolkit_items')
        .select('*')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return { data: data as PDPToolkitItem[], error: null };
    } catch (error) {
      console.error('Error fetching all toolkit items:', error);
      return { data: null, error: error as Error };
    }
  }

  // Admin: Create toolkit item
  static async createToolkitItem(dto: CreateToolkitItemDTO): Promise<ServiceResult<PDPToolkitItem>> {
    try {
      const { data, error } = await supabase
        .from('pdp_toolkit_items')
        .insert({
          ...dto,
          sort_order: dto.sort_order ?? 0,
          is_active: dto.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return { data: data as PDPToolkitItem, error: null };
    } catch (error) {
      console.error('Error creating toolkit item:', error);
      return { data: null, error: error as Error };
    }
  }

  // Admin: Update toolkit item
  static async updateToolkitItem(id: string, dto: UpdateToolkitItemDTO): Promise<ServiceResult<PDPToolkitItem>> {
    try {
      const { data, error } = await supabase
        .from('pdp_toolkit_items')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as PDPToolkitItem, error: null };
    } catch (error) {
      console.error('Error updating toolkit item:', error);
      return { data: null, error: error as Error };
    }
  }

  // Admin: Delete toolkit item
  static async deleteToolkitItem(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('pdp_toolkit_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      console.error('Error deleting toolkit item:', error);
      return { data: null, error: error as Error };
    }
  }

  // Admin: Upload toolkit file
  static async uploadToolkitFile(file: File, category: ToolkitCategory): Promise<ServiceResult<{ url: string; fileType: string; fileSize: number }>> {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const fileName = `${category}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      const { error: uploadError } = await supabase.storage
        .from('pdp-toolkit')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pdp-toolkit')
        .getPublicUrl(fileName);

      return {
        data: {
          url: publicUrl,
          fileType: fileExt,
          fileSize: file.size,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error uploading toolkit file:', error);
      return { data: null, error: error as Error };
    }
  }

  // ==========================================================================
  // Partner Profile
  // ==========================================================================

  static async getPartnerProfile(): Promise<ServiceResult<PDPPartnerProfile>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use the database function that auto-creates profile if missing
      const { data, error } = await supabase.rpc('get_pdp_partner_profile', {
        p_partner_id: user.id,
      });

      if (error) throw error;
      return { data: data as PDPPartnerProfile, error: null };
    } catch (error) {
      console.error('Error fetching partner profile:', error);
      return { data: null, error: error as Error };
    }
  }

  static async updatePartnerProfile(dto: UpdatePDPPartnerProfileDTO): Promise<ServiceResult<PDPPartnerProfile>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Ensure profile exists first
      await supabase.rpc('get_pdp_partner_profile', {
        p_partner_id: user.id,
      });

      const { data, error } = await supabase
        .from('pdp_partner_profiles')
        .update(dto)
        .eq('partner_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as PDPPartnerProfile, error: null };
    } catch (error) {
      console.error('Error updating partner profile:', error);
      return { data: null, error: error as Error };
    }
  }

  static async uploadPartnerLogo(file: File): Promise<ServiceResult<string>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('partner-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('partner-logos')
        .getPublicUrl(fileName);

      // Update profile with logo URL
      await supabase
        .from('pdp_partner_profiles')
        .update({ logo_url: publicUrl })
        .eq('partner_id', user.id);

      return { data: publicUrl, error: null };
    } catch (error) {
      console.error('Error uploading partner logo:', error);
      return { data: null, error: error as Error };
    }
  }

  static async removePartnerLogo(): Promise<ServiceResult<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Remove logo from storage (try common extensions)
      const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
      for (const ext of extensions) {
        await supabase.storage
          .from('partner-logos')
          .remove([`${user.id}/logo.${ext}`]);
      }

      // Clear logo URL from profile
      await supabase
        .from('pdp_partner_profiles')
        .update({ logo_url: null })
        .eq('partner_id', user.id);

      return { data: null, error: null };
    } catch (error) {
      console.error('Error removing partner logo:', error);
      return { data: null, error: error as Error };
    }
  }

  static async uploadPartnerBadge(file: File): Promise<ServiceResult<string>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/badge.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('partner-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('partner-logos')
        .getPublicUrl(fileName);

      // Update profile with badge URL
      await supabase
        .from('pdp_partner_profiles')
        .update({ badge_url: publicUrl })
        .eq('partner_id', user.id);

      return { data: publicUrl, error: null };
    } catch (error) {
      console.error('Error uploading partner badge:', error);
      return { data: null, error: error as Error };
    }
  }

  static async removePartnerBadge(): Promise<ServiceResult<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Remove badge from storage
      const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
      for (const ext of extensions) {
        await supabase.storage
          .from('partner-logos')
          .remove([`${user.id}/badge.${ext}`]);
      }

      // Clear badge URL from profile
      await supabase
        .from('pdp_partner_profiles')
        .update({ badge_url: null })
        .eq('partner_id', user.id);

      return { data: null, error: null };
    } catch (error) {
      console.error('Error removing partner badge:', error);
      return { data: null, error: error as Error };
    }
  }

  // ==========================================================================
  // Guidelines / Downloadable Resources
  // ==========================================================================

  static async getGuidelines(category?: GuidelineCategory): Promise<ServiceResult<PDPGuideline[]>> {
    try {
      let query = supabase
        .from('pdp_guidelines')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data: data as PDPGuideline[], error: null };
    } catch (error) {
      console.error('Error fetching guidelines:', error);
      return { data: null, error: error as Error };
    }
  }

  static async trackGuidelineDownload(guidelineId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase.rpc('increment_guideline_download', {
        p_guideline_id: guidelineId,
      });

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      console.error('Error tracking download:', error);
      return { data: null, error: error as Error };
    }
  }

  // Admin methods for managing guidelines
  static async getAllGuidelines(): Promise<ServiceResult<PDPGuideline[]>> {
    try {
      const { data, error } = await supabase
        .from('pdp_guidelines')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data as PDPGuideline[], error: null };
    } catch (error) {
      console.error('Error fetching all guidelines:', error);
      return { data: null, error: error as Error };
    }
  }

  static async createGuideline(dto: CreatePDPGuidelineDTO): Promise<ServiceResult<PDPGuideline>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('pdp_guidelines')
        .insert({
          ...dto,
          last_updated_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { data: data as PDPGuideline, error: null };
    } catch (error) {
      console.error('Error creating guideline:', error);
      return { data: null, error: error as Error };
    }
  }

  static async updateGuideline(id: string, dto: UpdatePDPGuidelineDTO): Promise<ServiceResult<PDPGuideline>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('pdp_guidelines')
        .update({
          ...dto,
          last_updated_by: user.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as PDPGuideline, error: null };
    } catch (error) {
      console.error('Error updating guideline:', error);
      return { data: null, error: error as Error };
    }
  }

  static async deleteGuideline(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('pdp_guidelines')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      console.error('Error deleting guideline:', error);
      return { data: null, error: error as Error };
    }
  }

  static async uploadGuidelineFile(file: File, category: GuidelineCategory): Promise<ServiceResult<{ url: string; fileName: string; fileSize: number }>> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${category}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('pdp-guidelines')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pdp-guidelines')
        .getPublicUrl(fileName);

      return {
        data: {
          url: publicUrl,
          fileName: file.name,
          fileSize: file.size,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error uploading guideline file:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Upload or replace the agenda/syllabus PDF for a program.
   * Stores under pdp-programs/{programId}/agenda_{timestamp}.pdf
   * and updates the agenda_url column on the program row.
   */
  static async uploadAgendaPDF(
    programId: string,
    file: File,
  ): Promise<ServiceResult<string>> {
    try {
      const fileName = `${programId}/agenda_${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('pdp-programs')
        .upload(fileName, file, { upsert: true, contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pdp-programs')
        .getPublicUrl(fileName);

      // Persist the URL on the program row
      const { error: updateError } = await supabase
        .from('pdp_programs')
        .update({ agenda_url: publicUrl })
        .eq('id', programId);

      if (updateError) throw updateError;

      return { data: publicUrl, error: null };
    } catch (error) {
      console.error('Error uploading agenda PDF:', error);
      return { data: null, error: error as Error };
    }
  }
}

// =============================================================================
// Legacy Service for backward compatibility
// =============================================================================

export class PdpProgramsService {
  /**
   * Get all active PDP programs with optional filters
   */
  static async getActivePdpPrograms(
    filters?: PdpProgramFilters
  ): Promise<PdpProgramResult<PdpProgram[]>> {
    try {
      let query = supabase
        .from('pdp_programs')
        .select('*')
        .eq('is_active', filters?.is_active ?? true)
        .order('program_name', { ascending: true });

      // Apply filters
      if (filters?.activity_type) {
        query = query.eq('activity_type', filters.activity_type);
      }

      if (filters?.bock_domain) {
        query = query.contains('bock_domain', [filters.bock_domain]);
      }

      if (filters?.search) {
        query = query.or(
          `program_name.ilike.%${filters.search}%,provider_name.ilike.%${filters.search}%,program_id.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data as PdpProgram[], error: null };
    } catch (error) {
      console.error('Error fetching PDP programs:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get single PDP program by ID
   */
  static async getPdpProgramById(id: string): Promise<PdpProgramResult<PdpProgram>> {
    try {
      const { data, error } = await supabase
        .from('pdp_programs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data: data as PdpProgram, error: null };
    } catch (error) {
      console.error('Error fetching PDP program:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get PDP program by program_id
   */
  static async getPdpProgramByProgramId(
    programId: string
  ): Promise<PdpProgramResult<PdpProgram>> {
    try {
      const { data, error } = await supabase
        .from('pdp_programs')
        .select('*')
        .eq('program_id', programId)
        .single();

      if (error) throw error;
      return { data: data as PdpProgram, error: null };
    } catch (error) {
      console.error('Error fetching PDP program:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get PDP program statistics
   */
  static async getPdpProgramStats(): Promise<PdpProgramResult<PdpProgramStats>> {
    try {
      const { data: programs, error } = await supabase
        .from('pdp_programs')
        .select('*');

      if (error) throw error;

      const activePrograms = programs.filter((p) => p.is_active);

      // Count unique providers
      const uniqueProviders = new Set(programs.map((p) => p.provider_name));

      // Count programs by type
      const programsByType = programs.reduce((acc, program) => {
        const type = program.activity_type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const stats: PdpProgramStats = {
        total_programs: programs.length,
        active_programs: activePrograms.length,
        programs_by_type: programsByType as any,
        total_providers: uniqueProviders.size,
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error fetching PDP program stats:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Check if a program is currently valid
   */
  static isProgramValid(program: PdpProgram): boolean {
    const now = new Date();
    const validFrom = new Date(program.valid_from);
    const validUntil = new Date(program.valid_until);

    return program.is_active && now >= validFrom && now <= validUntil;
  }

  /**
   * Get days until program expires
   */
  static getDaysUntilExpiry(program: PdpProgram): number {
    const now = new Date();
    const validUntil = new Date(program.valid_until);
    const diffTime = validUntil.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}
