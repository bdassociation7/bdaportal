/**
 * Admin Dashboard Hooks
 * React Query hooks for fetching dashboard statistics
 */

import { useQuery } from '@tanstack/react-query';
import { AdminDashboardService } from './admin-dashboard.service';

// Query keys for cache management
export const adminDashboardKeys = {
  all: ['admin-dashboard'] as const,
  partners: () => [...adminDashboardKeys.all, 'partners'] as const,
  systemIssues: () => [...adminDashboardKeys.all, 'system-issues'] as const,
  examCerts: () => [...adminDashboardKeys.all, 'exam-certs'] as const,
  vouchers: () => [...adminDashboardKeys.all, 'vouchers'] as const,
  learning: () => [...adminDashboardKeys.all, 'learning'] as const,
  actionItems: () => [...adminDashboardKeys.all, 'action-items'] as const,
};

/**
 * Hook to fetch partner statistics
 */
export const usePartnerStats = () => {
  return useQuery({
    queryKey: adminDashboardKeys.partners(),
    queryFn: async () => {
      const result = await AdminDashboardService.getPartnerStats();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
};

/**
 * Hook to fetch system issues count
 */
export const useSystemIssues = () => {
  return useQuery({
    queryKey: adminDashboardKeys.systemIssues(),
    queryFn: async () => {
      const result = await AdminDashboardService.getSystemIssues();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    staleTime: 1 * 60 * 1000, // 1 minute (more frequent for issues)
    retry: 1,
  });
};

/**
 * Hook to fetch exam and certificate statistics
 */
export const useExamCertStats = () => {
  return useQuery({
    queryKey: adminDashboardKeys.examCerts(),
    queryFn: async () => {
      const result = await AdminDashboardService.getExamCertStats();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

/**
 * Hook to fetch voucher statistics
 */
export const useVoucherStats = () => {
  return useQuery({
    queryKey: adminDashboardKeys.vouchers(),
    queryFn: async () => {
      const result = await AdminDashboardService.getVoucherStats();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
};

/**
 * Hook to fetch learning system statistics
 */
export const useLearningSystemStats = () => {
  return useQuery({
    queryKey: adminDashboardKeys.learning(),
    queryFn: async () => {
      const result = await AdminDashboardService.getLearningSystemStats();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

/**
 * Hook to fetch admin action items
 */
export const useAdminActionItems = () => {
  return useQuery({
    queryKey: adminDashboardKeys.actionItems(),
    queryFn: async () => {
      const result = await AdminDashboardService.getAdminActionItems();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 1,
  });
};

/**
 * Combined hook for all dashboard stats
 * Each query runs independently for fault isolation
 */
export const useAdminDashboardStats = () => {
  const partners = usePartnerStats();
  const systemIssues = useSystemIssues();
  const examCerts = useExamCertStats();
  const vouchers = useVoucherStats();
  const learning = useLearningSystemStats();
  const actionItems = useAdminActionItems();

  return {
    partners,
    systemIssues,
    examCerts,
    vouchers,
    learning,
    actionItems,
    isLoading:
      partners.isLoading ||
      systemIssues.isLoading ||
      examCerts.isLoading ||
      vouchers.isLoading ||
      learning.isLoading ||
      actionItems.isLoading,
  };
};
