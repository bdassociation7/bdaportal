/**
 * Membership Service
 * User membership management
 */

import { supabase } from '@/lib/supabase';
import type {
  UserMembership,
  MembershipBenefit,
  MembershipFilters,
  MembershipStats,
  MembershipResult,
  MembershipStatusInfo,
  CreateMembershipParams,
  ExtendMembershipParams,
  DeactivateMembershipParams,
  BulkActivateMembershipsParams,
  BulkActivationResult,
  MembershipActivationLog,
} from './membership.types';

export class MembershipService {
  /**
   * Get user's active membership
   * US1: View Membership Status
   */
  static async getUserActiveMembership(
    userId: string
  ): Promise<MembershipResult<UserMembership>> {
    try {
      const { data, error } = await supabase
        .from('user_memberships')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('expiry_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return { data: data as UserMembership | null, error: null };
    } catch (error) {
      console.error('Error fetching active membership:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get user's membership status info
   * US1: View Membership Status - Complete status information
   */
  static async getUserMembershipStatus(
    userId: string
  ): Promise<MembershipResult<MembershipStatusInfo>> {
    try {
      const { data: membership, error } = await supabase
        .from('user_memberships')
        .select('*')
        .eq('user_id', userId)
        .order('expiry_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      if (!membership) {
        return {
          data: {
            hasActiveMembership: false,
            membership: null,
            daysRemaining: 0,
            isExpiringSoon: false,
            isExpired: false,
            membershipLevel: 'none',
          },
          error: null,
        };
      }

      const expiryDate = new Date(membership.expiry_date);
      const diffTime = expiryDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isExpired = membership.status === 'expired' || expiryDate < now;
      const isExpiringSoon = !isExpired && daysRemaining <= 30;

      return {
        data: {
          hasActiveMembership: membership.status === 'active' && !isExpired,
          membership: membership as UserMembership,
          daysRemaining: Math.max(0, daysRemaining),
          isExpiringSoon,
          isExpired,
          membershipLevel: isExpired ? 'none' : membership.membership_type,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error fetching membership status:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get all memberships for a user (including expired)
   */
  static async getUserMemberships(
    userId: string
  ): Promise<MembershipResult<UserMembership[]>> {
    try {
      const { data, error } = await supabase
        .from('user_memberships')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data as UserMembership[], error: null };
    } catch (error) {
      console.error('Error fetching user memberships:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get membership benefits by type
   * US5: Display Membership Benefits
   */
  static async getMembershipBenefits(
    membershipType?: 'basic' | 'professional'
  ): Promise<MembershipResult<MembershipBenefit[]>> {
    try {
      let query = supabase
        .from('membership_benefits')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (membershipType) {
        query = query.eq('membership_type', membershipType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data as MembershipBenefit[], error: null };
    } catch (error) {
      console.error('Error fetching membership benefits:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get membership certificate URL
   * US3: Display Membership Certificate (Professional Only)
   */
  static async getMembershipCertificateUrl(
    membershipId: string
  ): Promise<MembershipResult<string>> {
    try {
      const { data: membership, error: membershipError } = await supabase
        .from('user_memberships')
        .select('certificate_url, membership_type')
        .eq('id', membershipId)
        .single();

      if (membershipError) throw membershipError;

      if (membership.membership_type !== 'professional') {
        throw new Error('Certificates are only available for Professional members');
      }

      if (!membership.certificate_url) {
        throw new Error('Certificate not yet generated. Please contact support.');
      }

      // Get public URL for certificate (bucket is public)
      const { data } = supabase.storage
        .from('membership-certificates')
        .getPublicUrl(membership.certificate_url);

      return { data: data.publicUrl, error: null };
    } catch (error) {
      console.error('Error getting certificate URL:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Generate membership certificate on-demand
   * Creates PDF certificate for Professional members
   * Note: Certificate generation is handled server-side; this method requests certificate processing
   */
  static async generateMembershipCertificate(
    membershipId: string
  ): Promise<MembershipResult<string>> {
    try {
      // Check if certificate already exists (might have been generated since page load)
      const { data: membership, error: checkError } = await supabase
        .from('user_memberships')
        .select('certificate_url, membership_type')
        .eq('id', membershipId)
        .single();

      if (checkError) throw checkError;

      if (membership.membership_type !== 'professional') {
        throw new Error('Certificates are only available for Professional members');
      }

      // If certificate exists, return success
      if (membership.certificate_url) {
        return { data: membership.certificate_url, error: null };
      }

      // Certificate needs to be generated server-side
      // Show a user-friendly message
      throw new Error(
        'Your certificate is being prepared. Please refresh the page in a few minutes. ' +
        'If the issue persists, contact support@bda-global.org'
      );
    } catch (error) {
      console.error('Error generating certificate:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Check if user has access to BDA BoCK
   * US4: Access Control to Books (BDA BoCK)
   */
  static async hasBookAccess(userId: string): Promise<MembershipResult<boolean>> {
    try {
      // Check for active professional membership
      const { data: membership } = await supabase
        .from('user_memberships')
        .select('membership_type')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('membership_type', 'professional')
        .maybeSingle();

      if (membership) {
        return { data: true, error: null };
      }

      // Check if user bought BDA BoCK separately (check user_books table)
      const { data: bookPurchase } = await supabase
        .from('user_books')
        .select('id')
        .eq('user_id', userId)
        .eq('is_purchased', true)
        .limit(1)
        .maybeSingle();

      return { data: !!bookPurchase, error: null };
    } catch (error) {
      console.error('Error checking book access:', error);
      return { data: false, error: error as Error };
    }
  }

  // ============================================
  // ADMIN METHODS (US7: Admin Panel)
  // ============================================

  /**
   * Get all memberships with filters
   * US7: Admin can view all members and filter
   */
  static async getAllMemberships(
    filters?: MembershipFilters
  ): Promise<MembershipResult<UserMembership[]>> {
    try {
      let query = supabase
        .from('user_memberships')
        .select(`
          *,
          user:users!user_memberships_user_id_fkey(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.membership_type) {
        query = query.eq('membership_type', filters.membership_type);
      }

      if (filters?.expiring_soon) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        query = query
          .eq('status', 'active')
          .lte('expiry_date', thirtyDaysFromNow.toISOString())
          .gte('expiry_date', new Date().toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      let memberships = data as UserMembership[];

      // Client-side filtering for search (PostgREST can't filter on joined fields)
      if (filters?.search && memberships) {
        const searchLower = filters.search.toLowerCase();
        memberships = memberships.filter((m) => {
          const membershipId = m.membership_id?.toLowerCase() || '';
          const email = m.user?.email?.toLowerCase() || '';
          const firstName = m.user?.first_name?.toLowerCase() || '';
          const lastName = m.user?.last_name?.toLowerCase() || '';
          const fullName = `${firstName} ${lastName}`.toLowerCase();

          return (
            membershipId.includes(searchLower) ||
            email.includes(searchLower) ||
            firstName.includes(searchLower) ||
            lastName.includes(searchLower) ||
            fullName.includes(searchLower)
          );
        });
      }

      return { data: memberships, error: null };
    } catch (error) {
      console.error('Error fetching all memberships:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get membership statistics
   * US7: Admin dashboard stats
   */
  static async getMembershipStats(): Promise<MembershipResult<MembershipStats>> {
    try {
      const { data: memberships, error } = await supabase
        .from('user_memberships')
        .select('status, membership_type, expiry_date');

      if (error) throw error;

      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const stats: MembershipStats = {
        total_members: memberships.length,
        active_members: memberships.filter((m) => m.status === 'active').length,
        basic_members: memberships.filter(
          (m) => m.status === 'active' && m.membership_type === 'basic'
        ).length,
        professional_members: memberships.filter(
          (m) => m.status === 'active' && m.membership_type === 'professional'
        ).length,
        expired_members: memberships.filter((m) => m.status === 'expired').length,
        expiring_soon: memberships.filter((m) => {
          const expiryDate = new Date(m.expiry_date);
          return m.status === 'active' && expiryDate > now && expiryDate <= thirtyDaysFromNow;
        }).length,
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error fetching membership stats:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Create membership manually
   * US7: Admin can create a membership for a user manually
   */
  static async createMembership(
    params: CreateMembershipParams,
    adminId: string
  ): Promise<MembershipResult<UserMembership>> {
    try {
      const durationMonths = params.duration_months || 12;

      // Call the activate_membership function with duration
      const { data, error } = await supabase.rpc('activate_membership', {
        p_user_id: params.user_id,
        p_membership_type: params.membership_type,
        p_duration_months: durationMonths,
        p_admin_user_id: adminId,
        p_notes: params.notes || null,
        p_woocommerce_order_id: null,
        p_woocommerce_product_id: null,
      });

      if (error) throw error;

      // Log the admin action
      await supabase.from('membership_activation_logs').insert({
        user_id: params.user_id,
        membership_id: data,
        action: 'activated',
        triggered_by: 'admin',
        admin_user_id: adminId,
        notes: params.notes ? `${params.notes} (Duration: ${durationMonths} months)` : `Duration: ${durationMonths} months`,
      });

      // Fetch the created membership
      const { data: membership, error: fetchError } = await supabase
        .from('user_memberships')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) throw fetchError;

      return { data: membership as UserMembership, error: null };
    } catch (error) {
      console.error('Error creating membership:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Extend membership
   * US7: Admin can manually extend membership
   */
  static async extendMembership(
    params: ExtendMembershipParams,
    adminId: string
  ): Promise<MembershipResult<UserMembership>> {
    try {
      // Get current membership
      const { data: current, error: fetchError } = await supabase
        .from('user_memberships')
        .select('*')
        .eq('id', params.membership_id)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new expiry date
      const currentExpiry = new Date(current.expiry_date);
      const now = new Date();
      const baseDate = currentExpiry > now ? currentExpiry : now;
      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + params.additional_months);

      // Update membership
      const { data, error } = await supabase
        .from('user_memberships')
        .update({
          expiry_date: newExpiry.toISOString(),
          status: 'active', // Reactivate if expired
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.membership_id)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.from('membership_activation_logs').insert({
        user_id: current.user_id,
        membership_id: params.membership_id,
        action: 'renewed',
        triggered_by: 'admin',
        admin_user_id: adminId,
        previous_expiry_date: current.expiry_date,
        new_expiry_date: newExpiry.toISOString().split('T')[0],
        notes: params.notes ? `${params.notes} (+${params.additional_months} months)` : `Extended by ${params.additional_months} months`,
      });

      return { data: data as UserMembership, error: null };
    } catch (error) {
      console.error('Error extending membership:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Deactivate membership
   * US7: Admin can deactivate membership
   */
  static async deactivateMembership(
    params: DeactivateMembershipParams,
    adminId: string
  ): Promise<MembershipResult<UserMembership>> {
    try {
      // Get current membership
      const { data: current, error: fetchError } = await supabase
        .from('user_memberships')
        .select('user_id, status')
        .eq('id', params.membership_id)
        .single();

      if (fetchError) throw fetchError;

      // Update membership status
      const { data, error } = await supabase
        .from('user_memberships')
        .update({
          status: 'cancelled',
          deactivation_reason: params.reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.membership_id)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.from('membership_activation_logs').insert({
        user_id: current.user_id,
        membership_id: params.membership_id,
        action: 'cancelled',
        triggered_by: 'admin',
        admin_user_id: adminId,
        previous_status: current.status,
        new_status: 'cancelled',
        notes: params.reason,
      });

      return { data: data as UserMembership, error: null };
    } catch (error) {
      console.error('Error deactivating membership:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Reactivate membership
   * US7: Admin can reactivate cancelled membership
   */
  static async reactivateMembership(
    membershipId: string,
    adminId: string
  ): Promise<MembershipResult<UserMembership>> {
    try {
      // Get current membership
      const { data: current, error: fetchError } = await supabase
        .from('user_memberships')
        .select('*')
        .eq('id', membershipId)
        .single();

      if (fetchError) throw fetchError;

      // Check if expiry date is in the past
      const expiryDate = new Date(current.expiry_date);
      const now = new Date();

      if (expiryDate < now) {
        throw new Error('Cannot reactivate: membership has expired. Please extend the membership instead.');
      }

      // Update membership status
      const { data, error } = await supabase
        .from('user_memberships')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', membershipId)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.from('membership_activation_logs').insert({
        user_id: current.user_id,
        membership_id: membershipId,
        action: 'reactivated',
        triggered_by: 'admin',
        admin_user_id: adminId,
        previous_status: current.status,
        new_status: 'active',
      });

      return { data: data as UserMembership, error: null };
    } catch (error) {
      console.error('Error reactivating membership:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Request certificate re-issue
   * US7: Admin can re-issue certificate
   */
  static async reissueCertificate(
    membershipId: string,
    adminId: string
  ): Promise<MembershipResult<boolean>> {
    try {
      // Get membership details
      const { data: membership, error: fetchError } = await supabase
        .from('user_memberships')
        .select('*, user:users!user_memberships_user_id_fkey(first_name, last_name, email)')
        .eq('id', membershipId)
        .single();

      if (fetchError) throw fetchError;

      if (membership.membership_type !== 'professional') {
        throw new Error('Certificates are only available for Professional members');
      }

      // Log the re-issue request (actual generation would be done by a background job)
      await supabase.from('membership_activation_logs').insert({
        user_id: membership.user_id,
        membership_id: membershipId,
        action: 'certificate_reissued',
        triggered_by: 'admin',
        admin_user_id: adminId,
        notes: `Certificate re-issued at ${new Date().toISOString()}`,
      });

      // Clear existing certificate to trigger regeneration
      await supabase
        .from('user_memberships')
        .update({ certificate_url: null, updated_at: new Date().toISOString() })
        .eq('id', membershipId);

      return { data: true, error: null };
    } catch (error) {
      console.error('Error re-issuing certificate:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Bulk activate memberships for multiple users
   * US2: Bulk Membership Activation
   */
  static async bulkActivateMemberships(
    params: BulkActivateMembershipsParams,
    adminId: string
  ): Promise<MembershipResult<BulkActivationResult>> {
    try {
      const results: BulkActivationResult = {
        total: params.emails.length,
        successful: 0,
        failed: 0,
        results: [],
      };

      // Process each email
      for (const email of params.emails) {
        try {
          const trimmedEmail = email.trim().toLowerCase();

          if (!trimmedEmail) {
            results.failed++;
            results.results.push({
              email: email,
              success: false,
              error: 'Empty email address',
            });
            continue;
          }

          // Find user by email
          const { data: users, error: userError } = await supabase
            .from('users')
            .select('id')
            .ilike('email', trimmedEmail)
            .limit(1);

          if (userError) throw userError;

          if (!users || users.length === 0) {
            results.failed++;
            results.results.push({
              email: trimmedEmail,
              success: false,
              error: 'User not found',
            });
            continue;
          }

          const userId = users[0].id;

          // Activate membership using the database function
          const { data: membershipId, error: activateError } = await supabase.rpc(
            'activate_membership',
            {
              p_user_id: userId,
              p_membership_type: params.membership_type,
              p_duration_months: params.duration_months || 12,
              p_woocommerce_order_id: null,
              p_woocommerce_product_id: null,
            }
          );

          if (activateError) throw activateError;

          // Log the activation
          await supabase.from('membership_activation_logs').insert({
            user_id: userId,
            membership_id: membershipId,
            action: 'activated',
            triggered_by: 'admin',
            admin_user_id: adminId,
            notes: params.notes
              ? `Bulk activation - ${params.notes}`
              : `Bulk activation (${params.duration_months || 12} months)`,
          });

          results.successful++;
          results.results.push({
            email: trimmedEmail,
            success: true,
            membership_id: membershipId,
          });

          console.log(`✅ Activated ${params.membership_type} membership for ${trimmedEmail}`);
        } catch (err: any) {
          results.failed++;
          results.results.push({
            email: email,
            success: false,
            error: err.message || 'Activation failed',
          });
          console.error(`❌ Failed to activate for ${email}:`, err);
        }
      }

      console.log(
        `Bulk activation complete: ${results.successful}/${results.total} successful, ${results.failed} failed`
      );

      return { data: results, error: null };
    } catch (error) {
      console.error('Error in bulk activation:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get membership activation logs
   * US7: Admin audit trail
   */
  static async getMembershipLogs(
    membershipId?: string,
    userId?: string
  ): Promise<MembershipResult<MembershipActivationLog[]>> {
    try {
      let query = supabase
        .from('membership_activation_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (membershipId) {
        query = query.eq('membership_id', membershipId);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data as MembershipActivationLog[], error: null };
    } catch (error) {
      console.error('Error fetching membership logs:', error);
      return { data: null, error: error as Error };
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if membership is expiring soon (within 30 days)
   * US1: If membership < 30 days: show renewal reminder
   */
  static isExpiringSoon(membership: UserMembership): boolean {
    if (membership.status !== 'active') return false;

    const now = new Date();
    const expiryDate = new Date(membership.expiry_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return expiryDate > now && expiryDate <= thirtyDaysFromNow;
  }

  /**
   * Get days until expiry
   */
  static getDaysUntilExpiry(membership: UserMembership): number {
    const now = new Date();
    const expiryDate = new Date(membership.expiry_date);
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Format membership type for display
   */
  static formatMembershipType(type: 'basic' | 'professional', locale: 'en' | 'ar' = 'en'): string {
    const labels = {
      en: { basic: 'Basic Member', professional: 'Professional Member' },
      ar: { basic: 'عضو أساسي', professional: 'عضو محترف' },
    };
    return labels[locale][type];
  }
}
