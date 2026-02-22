/**
 * Admin Dashboard Types
 * Types for dashboard statistics and widgets
 */

// Partner Statistics
export interface PartnerStats {
  activeECP: number;
  activePDP: number;
  totalActive: number;
}

// System Issues (items requiring attention)
export interface SystemIssues {
  pdpProgramsPending: number;
  systemErrors24h: number;
  accessIssuesOpen: number;
  total: number;
}

// Exams & Certificates Snapshot (last 7 days)
export interface ExamCertStats {
  examsCompletedLast7Days: number;
  certificatesIssuedLast7Days: number;
  certificatesPending: number;
}

// Voucher Activity
export interface VoucherStats {
  vouchersIssuedToday: number;
  voucherRequestsPending: number;
}

// Learning System Usage
export interface LearningSystemStats {
  activeLearnersLast7Days: number;
  enUsagePercent: number;
  arUsagePercent: number;
  totalActiveAccess: number;
}

// Admin Action Required Items
export interface AdminActionItems {
  pdpProgramsPending: number;
  ecpVoucherRequestsPending: number;
  accessIssuesReported: number;
}

// Combined Dashboard Stats
export interface AdminDashboardStats {
  partners: PartnerStats;
  systemIssues: SystemIssues;
  examCerts: ExamCertStats;
  vouchers: VoucherStats;
  learning: LearningSystemStats;
  actionItems: AdminActionItems;
}

// API Result wrapper
export interface DashboardResult<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
}
