/**
 * Certifications Service
 * User certifications management
 */

import { supabase } from '@/lib/supabase';
import type {
  UserCertification,
  CertificationFilters,
  CertificationStats,
  CertificationResult,
} from './certifications.types';

export class CertificationsService {
  /**
   * Get user's certifications with filters
   */
  static async getUserCertifications(
    userId: string,
    filters?: CertificationFilters
  ): Promise<CertificationResult<UserCertification[]>> {
    try {
      let query = supabase
        .from('user_certifications')
        .select('*')
        .eq('user_id', userId)
        .order('issued_date', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.certification_type) {
        query = query.eq('certification_type', filters.certification_type);
      }

      if (filters?.search) {
        query = query.or(
          `credential_id.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data as UserCertification[], error: null };
    } catch (error) {
      console.error('Error fetching certifications:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get single certification by ID
   */
  static async getCertificationById(id: string): Promise<CertificationResult<UserCertification>> {
    try {
      const { data, error } = await supabase
        .from('user_certifications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data: data as UserCertification, error: null };
    } catch (error) {
      console.error('Error fetching certification:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get certification by credential ID
   */
  static async getCertificationByCredentialId(
    credentialId: string
  ): Promise<CertificationResult<UserCertification>> {
    try {
      const { data, error } = await supabase
        .from('user_certifications')
        .select('*')
        .eq('credential_id', credentialId)
        .single();

      if (error) throw error;
      return { data: data as UserCertification, error: null };
    } catch (error) {
      console.error('Error fetching certification:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get certification statistics for a user
   */
  static async getCertificationStats(userId: string): Promise<CertificationResult<CertificationStats>> {
    try {
      const { data: certifications, error } = await supabase
        .from('user_certifications')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const now = new Date();
      const sixtyDaysFromNow = new Date();
      sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

      const stats: CertificationStats = {
        total_certifications: certifications.length,
        active_certifications: certifications.filter((c) => c.status === 'active').length,
        expired_certifications: certifications.filter((c) => c.status === 'expired').length,
        cp_certifications: certifications.filter((c) => c.certification_type === 'CP').length,
        scp_certifications: certifications.filter((c) => c.certification_type === 'SCP').length,
        expiring_soon: certifications.filter((c) => {
          const expiryDate = new Date(c.expiry_date);
          return c.status === 'active' && expiryDate > now && expiryDate <= sixtyDaysFromNow;
        }).length,
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error fetching certification stats:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Download certificate PDF
   */
  static async getCertificateUrl(certificationId: string): Promise<CertificationResult<string>> {
    try {
      const { data: certification, error: certError } = await supabase
        .from('user_certifications')
        .select('certificate_url, credential_id')
        .eq('id', certificationId)
        .single();

      if (certError) throw certError;

      if (!certification.certificate_url) {
        throw new Error('Certificate not yet generated. Please contact support.');
      }

      // The certificate_url stores the file path within the certificates bucket
      // Get public URL since bucket is public
      const { data } = supabase.storage
        .from('certificates')
        .getPublicUrl(certification.certificate_url);

      if (!data?.publicUrl) {
        throw new Error('Failed to generate download link. Please try again.');
      }

      return { data: data.publicUrl, error: null };
    } catch (error) {
      console.error('Error getting certificate URL:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Check if certification is expiring soon (within 60 days)
   */
  static isExpiringSoon(certification: UserCertification): boolean {
    if (certification.status !== 'active') return false;

    const now = new Date();
    const expiryDate = new Date(certification.expiry_date);
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    return expiryDate > now && expiryDate <= sixtyDaysFromNow;
  }

  /**
   * Get days until expiry
   */
  static getDaysUntilExpiry(certification: UserCertification): number {
    const now = new Date();
    const expiryDate = new Date(certification.expiry_date);
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Verify certification by credential ID
   * Public verification - returns certification with user info
   */
  static async verifyCertificationByCredentialId(
    credentialId: string
  ): Promise<CertificationResult<UserCertification & { user_name: string; user_email: string }>> {
    try {
      const { data, error } = await supabase
        .from('user_certifications')
        .select(`
          *,
          users!user_certifications_user_id_fkey(first_name, last_name, email)
        `)
        .eq('credential_id', credentialId)
        .single();

      if (error) throw error;

      // Transform the data
      const result = {
        ...data,
        user_name: `${data.users.first_name || ''} ${data.users.last_name || ''}`.trim(),
        user_email: data.users.email,
      };

      return { data: result as any, error: null };
    } catch (error) {
      console.error('Error verifying certification:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Search certifications by holder name
   * Returns all certifications matching the name
   * Uses RPC function for proper name search across joined tables
   */
  static async searchCertificationsByName(
    name: string
  ): Promise<CertificationResult<Array<UserCertification & { user_name: string; user_email: string }>>> {
    try {
      const { data, error } = await supabase.rpc('search_certifications_by_name', {
        p_search_name: name.trim(),
      });

      if (error) throw error;

      // The RPC already returns properly formatted data
      return { data: data as any, error: null };
    } catch (error) {
      console.error('Error searching certifications:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Unified search for certifications by credential ID OR name
   * Returns all certifications matching either the credential ID or holder name
   * Smart search that automatically detects and prioritizes credential ID matches
   */
  static async searchCertificationsUnified(
    query: string
  ): Promise<CertificationResult<Array<UserCertification & { user_name: string; user_email: string }>>> {
    try {
      const { data, error } = await supabase.rpc('search_certifications_unified', {
        p_search_query: query.trim(),
      });

      if (error) throw error;

      // The RPC already returns properly formatted data
      return { data: data as any, error: null };
    } catch (error) {
      console.error('Error searching certifications:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get exam score for a certification
   */
  static async getCertificationExamScore(
    certificationId: string
  ): Promise<CertificationResult<number>> {
    try {
      const { data: cert, error: certError } = await supabase
        .from('user_certifications')
        .select('quiz_attempt_id')
        .eq('id', certificationId)
        .single();

      if (certError) throw certError;

      if (!cert.quiz_attempt_id) {
        return { data: null, error: null };
      }

      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('score')
        .eq('id', cert.quiz_attempt_id)
        .single();

      if (attemptError) throw attemptError;

      return { data: attempt.score, error: null };
    } catch (error) {
      console.error('Error fetching exam score:', error);
      return { data: null, error: error as Error };
    }
  }

  // ============================================
  // ADMIN METHODS (US24: Certification Management)
  // ============================================

  /**
   * Get all certifications with filters (Admin)
   */
  static async getAllCertifications(
    filters?: CertificationFilters & { expiring_soon?: boolean }
  ): Promise<CertificationResult<Array<UserCertification & { user_name: string; user_email: string }>>> {
    try {
      let query = supabase
        .from('user_certifications')
        .select(`
          *,
          users!user_certifications_user_id_fkey(first_name, last_name, email)
        `)
        .order('issued_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.certification_type) {
        query = query.eq('certification_type', filters.certification_type);
      }

      if (filters?.expiring_soon) {
        const sixtyDaysFromNow = new Date();
        sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
        query = query
          .eq('status', 'active')
          .lte('expiry_date', sixtyDaysFromNow.toISOString())
          .gte('expiry_date', new Date().toISOString());
      }

      if (filters?.search) {
        query = query.or(
          `credential_id.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      const results = data.map((item: any) => ({
        ...item,
        user_name: `${item.users?.first_name || ''} ${item.users?.last_name || ''}`.trim(),
        user_email: item.users?.email || '',
      }));

      return { data: results as any, error: null };
    } catch (error) {
      console.error('Error fetching all certifications:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get global certification statistics (Admin)
   */
  static async getGlobalCertificationStats(): Promise<CertificationResult<CertificationStats & {
    revoked_certifications: number;
    suspended_certifications: number;
  }>> {
    try {
      const { data: certifications, error } = await supabase
        .from('user_certifications')
        .select('*');

      if (error) throw error;

      const now = new Date();
      const sixtyDaysFromNow = new Date();
      sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

      const stats = {
        total_certifications: certifications.length,
        active_certifications: certifications.filter((c) => c.status === 'active').length,
        expired_certifications: certifications.filter((c) => c.status === 'expired').length,
        revoked_certifications: certifications.filter((c) => c.status === 'revoked').length,
        suspended_certifications: certifications.filter((c) => c.status === 'suspended').length,
        cp_certifications: certifications.filter((c) => c.certification_type === 'CP').length,
        scp_certifications: certifications.filter((c) => c.certification_type === 'SCP').length,
        expiring_soon: certifications.filter((c) => {
          const expiryDate = new Date(c.expiry_date);
          return c.status === 'active' && expiryDate > now && expiryDate <= sixtyDaysFromNow;
        }).length,
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error fetching global certification stats:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Revoke a certification (Admin)
   * US24: Admin can revoke certification
   */
  static async revokeCertification(
    certificationId: string,
    reason: string,
    adminId: string
  ): Promise<CertificationResult<UserCertification>> {
    try {
      const { data, error } = await supabase
        .from('user_certifications')
        .update({
          status: 'revoked',
          revocation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', certificationId)
        .select()
        .single();

      if (error) throw error;

      // Log the action (if audit log exists)
      // This can be extended to use an audit_logs table

      return { data: data as UserCertification, error: null };
    } catch (error) {
      console.error('Error revoking certification:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Suspend a certification (Admin)
   */
  static async suspendCertification(
    certificationId: string,
    reason: string,
    adminId: string
  ): Promise<CertificationResult<UserCertification>> {
    try {
      const { data, error } = await supabase
        .from('user_certifications')
        .update({
          status: 'suspended',
          notes: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', certificationId)
        .select()
        .single();

      if (error) throw error;

      return { data: data as UserCertification, error: null };
    } catch (error) {
      console.error('Error suspending certification:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Reinstate a revoked/suspended certification (Admin)
   */
  static async reinstateCertification(
    certificationId: string,
    adminId: string
  ): Promise<CertificationResult<UserCertification>> {
    try {
      // Get current certification to check expiry
      const { data: current, error: fetchError } = await supabase
        .from('user_certifications')
        .select('*')
        .eq('id', certificationId)
        .single();

      if (fetchError) throw fetchError;

      const expiryDate = new Date(current.expiry_date);
      const now = new Date();

      // Determine new status based on expiry
      const newStatus = expiryDate < now ? 'expired' : 'active';

      const { data, error } = await supabase
        .from('user_certifications')
        .update({
          status: newStatus,
          revocation_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', certificationId)
        .select()
        .single();

      if (error) throw error;

      return { data: data as UserCertification, error: null };
    } catch (error) {
      console.error('Error reinstating certification:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Extend certification expiry (Admin)
   * US24: Admin can extend certification
   */
  static async extendCertification(
    certificationId: string,
    additionalMonths: number,
    adminId: string
  ): Promise<CertificationResult<UserCertification>> {
    try {
      // Get current certification
      const { data: current, error: fetchError } = await supabase
        .from('user_certifications')
        .select('*')
        .eq('id', certificationId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new expiry date
      const currentExpiry = new Date(current.expiry_date);
      const now = new Date();
      const baseDate = currentExpiry > now ? currentExpiry : now;
      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + additionalMonths);

      const { data, error } = await supabase
        .from('user_certifications')
        .update({
          expiry_date: newExpiry.toISOString(),
          status: 'active', // Reactivate if expired
          renewal_count: current.renewal_count + 1,
          last_renewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', certificationId)
        .select()
        .single();

      if (error) throw error;

      return { data: data as UserCertification, error: null };
    } catch (error) {
      console.error('Error extending certification:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Reassign certification to different user (Admin)
   * US24: Admin can reassign certification
   */
  static async reassignCertification(
    certificationId: string,
    newUserId: string,
    reason: string,
    adminId: string
  ): Promise<CertificationResult<UserCertification>> {
    try {
      // Check if new user already has same type of certification
      const { data: current, error: fetchError } = await supabase
        .from('user_certifications')
        .select('certification_type')
        .eq('id', certificationId)
        .single();

      if (fetchError) throw fetchError;

      const { data: existing, error: existingError } = await supabase
        .from('user_certifications')
        .select('id')
        .eq('user_id', newUserId)
        .eq('certification_type', current.certification_type)
        .eq('status', 'active')
        .maybeSingle();

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError;
      }

      if (existing) {
        throw new Error(`User already has an active ${current.certification_type} certification`);
      }

      const { data, error } = await supabase
        .from('user_certifications')
        .update({
          user_id: newUserId,
          notes: `Reassigned: ${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', certificationId)
        .select()
        .single();

      if (error) throw error;

      return { data: data as UserCertification, error: null };
    } catch (error) {
      console.error('Error reassigning certification:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Re-issue certificate (Admin)
   * Triggers regeneration of the PDF certificate
   */
  static async reissueCertificate(
    certificationId: string,
    adminId: string
  ): Promise<CertificationResult<boolean>> {
    try {
      // Clear existing certificate to trigger regeneration
      const { error } = await supabase
        .from('user_certifications')
        .update({
          certificate_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', certificationId);

      if (error) throw error;

      // TODO: Trigger actual certificate regeneration via background job

      return { data: true, error: null };
    } catch (error) {
      console.error('Error re-issuing certificate:', error);
      return { data: null, error: error as Error };
    }
  }
}
