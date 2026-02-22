/**
 * Admin Dashboard Entity
 * Exports for dashboard statistics and widgets
 */

// Types
export type {
  PartnerStats,
  SystemIssues,
  ExamCertStats,
  VoucherStats,
  LearningSystemStats,
  AdminActionItems,
  AdminDashboardStats,
  DashboardResult,
} from './admin-dashboard.types';

// Service
export { AdminDashboardService } from './admin-dashboard.service';

// Hooks
export {
  adminDashboardKeys,
  usePartnerStats,
  useSystemIssues,
  useExamCertStats,
  useVoucherStats,
  useLearningSystemStats,
  useAdminActionItems,
  useAdminDashboardStats,
} from './admin-dashboard.hooks';
