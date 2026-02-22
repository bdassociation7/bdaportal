/**
 * Admin Dashboard Service
 * Fetches statistics for the admin dashboard widgets
 */

import { supabase } from '@/shared/config/supabase.config';
import type {
  PartnerStats,
  SystemIssues,
  ExamCertStats,
  VoucherStats,
  LearningSystemStats,
  AdminActionItems,
  DashboardResult,
} from './admin-dashboard.types';

export class AdminDashboardService {
  /**
   * Get active partner counts (ECP and PDP)
   */
  static async getPartnerStats(): Promise<DashboardResult<PartnerStats>> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Count active ECP partners from ecp_licenses
      // Must have status 'active' AND license not expired AND agreement signed
      const { count: ecpCount, error: ecpError } = await supabase
        .from('ecp_licenses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('expiry_date', today)
        .not('agreement_signed_date', 'is', null);

      if (ecpError) {
        console.warn('Error fetching ECP partners:', ecpError);
      }

      // Count active PDP partners (users with role 'pdp' who have approved programs)
      const { data: pdpWithPrograms, error: pdpError } = await supabase
        .from('pdp_programs')
        .select('provider_id')
        .eq('is_active', true);

      if (pdpError) {
        console.warn('Error fetching PDP partners:', pdpError);
      }

      // Get unique partner IDs with approved programs
      const uniquePdpPartners = pdpWithPrograms
        ? new Set(pdpWithPrograms.map(p => p.provider_id)).size
        : 0;

      const activeECP = ecpCount || 0;
      const activePDP = uniquePdpPartners;

      return {
        data: {
          activeECP,
          activePDP,
          totalActive: activeECP + activePDP,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'PARTNER_STATS_ERROR',
          message: 'Failed to fetch partner statistics',
          details: err,
        },
      };
    }
  }

  /**
   * Get system issues requiring attention
   */
  static async getSystemIssues(): Promise<DashboardResult<SystemIssues>> {
    try {
      // 1. PDP Programs pending review
      const { count: pdpPending, error: pdpError } = await supabase
        .from('pdp_programs')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'under_review', 'revision_requested']);

      if (pdpError) {
        console.warn('Error fetching PDP pending:', pdpError);
      }

      // 2. System errors in last 24 hours from audit_logs
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: systemErrors, error: auditError } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'system_error')
        .gte('event_timestamp', twentyFourHoursAgo);

      if (auditError) {
        console.warn('Error fetching system errors:', auditError);
      }

      // 3. Access issues from support tickets
      const { count: accessIssues, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('category', ['account', 'technical'])
        .in('status', ['new', 'in_progress']);

      if (ticketError) {
        console.warn('Error fetching access issues:', ticketError);
      }

      const pdpCount = pdpPending || 0;
      const errorsCount = systemErrors || 0;
      const accessCount = accessIssues || 0;

      return {
        data: {
          pdpProgramsPending: pdpCount,
          systemErrors24h: errorsCount,
          accessIssuesOpen: accessCount,
          total: pdpCount + errorsCount + accessCount,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'SYSTEM_ISSUES_ERROR',
          message: 'Failed to fetch system issues',
          details: err,
        },
      };
    }
  }

  /**
   * Get exam and certificate statistics (last 7 days)
   */
  static async getExamCertStats(): Promise<DashboardResult<ExamCertStats>> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // 1. Quiz attempts completed in last 7 days
      const { count: quizAttempts, error: quizError } = await supabase
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .gte('completed_at', sevenDaysAgo)
        .not('completed_at', 'is', null);

      if (quizError) {
        console.warn('Error fetching quiz attempts:', quizError);
      }

      // 2. Mock exam attempts completed in last 7 days
      const { count: mockAttempts, error: mockError } = await supabase
        .from('mock_exam_attempts')
        .select('*', { count: 'exact', head: true })
        .gte('completed_at', sevenDaysAgo)
        .not('completed_at', 'is', null);

      if (mockError) {
        console.warn('Error fetching mock attempts:', mockError);
      }

      // 3. Certificates issued in last 7 days
      const { count: certsIssued, error: certIssuedError } = await supabase
        .from('user_certifications')
        .select('*', { count: 'exact', head: true })
        .gte('issued_date', sevenDaysAgoDate);

      if (certIssuedError) {
        console.warn('Error fetching certificates issued:', certIssuedError);
      }

      // 4. Certificates pending (active but no PDF URL)
      const { count: certsPending, error: certPendingError } = await supabase
        .from('user_certifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .is('certificate_url', null);

      if (certPendingError) {
        console.warn('Error fetching pending certificates:', certPendingError);
      }

      return {
        data: {
          examsCompletedLast7Days: (quizAttempts || 0) + (mockAttempts || 0),
          certificatesIssuedLast7Days: certsIssued || 0,
          certificatesPending: certsPending || 0,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'EXAM_CERT_STATS_ERROR',
          message: 'Failed to fetch exam and certificate statistics',
          details: err,
        },
      };
    }
  }

  /**
   * Get voucher activity statistics
   */
  static async getVoucherStats(): Promise<DashboardResult<VoucherStats>> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayStart = `${today}T00:00:00.000Z`;
      const todayEnd = `${today}T23:59:59.999Z`;

      // 1. Exam vouchers created today
      const { count: examVouchersToday, error: examVoucherError } = await supabase
        .from('exam_vouchers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      if (examVoucherError) {
        console.warn('Error fetching exam vouchers:', examVoucherError);
      }

      // 2. ECP vouchers created today
      const { count: ecpVouchersToday, error: ecpVoucherError } = await supabase
        .from('ecp_vouchers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      if (ecpVoucherError) {
        console.warn('Error fetching ECP vouchers:', ecpVoucherError);
      }

      // 3. ECP voucher requests pending
      const { count: requestsPending, error: requestError } = await supabase
        .from('ecp_voucher_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (requestError) {
        console.warn('Error fetching voucher requests:', requestError);
      }

      return {
        data: {
          vouchersIssuedToday: (examVouchersToday || 0) + (ecpVouchersToday || 0),
          voucherRequestsPending: requestsPending || 0,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'VOUCHER_STATS_ERROR',
          message: 'Failed to fetch voucher statistics',
          details: err,
        },
      };
    }
  }

  /**
   * Get learning system usage statistics
   */
  static async getLearningSystemStats(): Promise<DashboardResult<LearningSystemStats>> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Active learners in last 7 days (unique users with curriculum progress updates)
      const { data: activeUsers, error: activeError } = await supabase
        .from('user_curriculum_progress')
        .select('user_id')
        .gte('updated_at', sevenDaysAgo);

      if (activeError) {
        console.warn('Error fetching active learners:', activeError);
      }

      // Get unique user count
      const uniqueActiveUsers = activeUsers
        ? new Set(activeUsers.map((u) => u.user_id)).size
        : 0;

      // 2. Total active access by language
      const { data: accessByLanguage, error: langError } = await supabase
        .from('user_curriculum_access')
        .select('language')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      if (langError) {
        console.warn('Error fetching access by language:', langError);
      }

      const totalAccess = accessByLanguage?.length || 0;
      const enCount = accessByLanguage?.filter((a) => a.language === 'EN').length || 0;
      const arCount = accessByLanguage?.filter((a) => a.language === 'AR').length || 0;

      return {
        data: {
          activeLearnersLast7Days: uniqueActiveUsers,
          enUsagePercent: totalAccess > 0 ? Math.round((enCount / totalAccess) * 100) : 0,
          arUsagePercent: totalAccess > 0 ? Math.round((arCount / totalAccess) * 100) : 0,
          totalActiveAccess: totalAccess,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'LEARNING_STATS_ERROR',
          message: 'Failed to fetch learning system statistics',
          details: err,
        },
      };
    }
  }

  /**
   * Get admin action items (pending items requiring admin attention)
   */
  static async getAdminActionItems(): Promise<DashboardResult<AdminActionItems>> {
    try {
      // 1. PDP Programs pending
      const { count: pdpPending, error: pdpError } = await supabase
        .from('pdp_programs')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'under_review', 'revision_requested']);

      if (pdpError) {
        console.warn('Error fetching PDP pending:', pdpError);
      }

      // 2. ECP Voucher requests pending
      const { count: voucherRequests, error: voucherError } = await supabase
        .from('ecp_voucher_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (voucherError) {
        console.warn('Error fetching voucher requests:', voucherError);
      }

      // 3. Access issues reported (open support tickets)
      const { count: accessIssues, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('category', ['account', 'technical'])
        .in('status', ['new', 'in_progress']);

      if (ticketError) {
        console.warn('Error fetching access issues:', ticketError);
      }

      return {
        data: {
          pdpProgramsPending: pdpPending || 0,
          ecpVoucherRequestsPending: voucherRequests || 0,
          accessIssuesReported: accessIssues || 0,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'ACTION_ITEMS_ERROR',
          message: 'Failed to fetch admin action items',
          details: err,
        },
      };
    }
  }
}
