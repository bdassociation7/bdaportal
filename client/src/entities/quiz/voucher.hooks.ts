import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { VoucherService } from './voucher.service';
import {
  mergeVouchers,
  getActiveVouchers,
  getVoucherCounts,
  type MergedVoucher,
  type ECPVoucherRaw,
} from './voucher.utils';
import type {
  CertificationProduct,
  ExamVoucher,
  ExamVoucherWithQuiz,
  ExamVoucherComplete,
  CertificationProductWithQuiz,
  CreateCertificationProductDTO,
  UpdateCertificationProductDTO,
  CreateExamVoucherDTO,
  UpdateExamVoucherDTO,
  UseVoucherDTO,
  CertificationProductFilters,
  ExamVoucherFilters,
  QueryOptions,
} from './quiz.types';

/**
 * React hooks for Voucher operations
 * Uses React Query for data fetching and caching
 */

// =============================================================================
// QUERY KEYS
// =============================================================================

export const voucherKeys = {
  all: ['vouchers'] as const,
  lists: () => [...voucherKeys.all, 'list'] as const,
  list: (filters?: ExamVoucherFilters, options?: QueryOptions) =>
    [...voucherKeys.lists(), { filters, options }] as const,
  details: () => [...voucherKeys.all, 'detail'] as const,
  detail: (id: string) => [...voucherKeys.details(), id] as const,
  userVouchers: () => [...voucherKeys.all, 'user'] as const,
  ecpAssignedVouchers: () => [...voucherKeys.all, 'ecp-assigned'] as const,
  voucherCheck: (quizId: string) => [...voucherKeys.all, 'check', quizId] as const,
  stats: () => [...voucherKeys.all, 'stats'] as const,
};

export const certProductKeys = {
  all: ['certification-products'] as const,
  lists: () => [...certProductKeys.all, 'list'] as const,
  list: (filters?: CertificationProductFilters, options?: QueryOptions) =>
    [...certProductKeys.lists(), { filters, options }] as const,
  details: () => [...certProductKeys.all, 'detail'] as const,
  detail: (id: string) => [...certProductKeys.details(), id] as const,
};

// =============================================================================
// PUBLIC VOUCHER HOOKS (User-facing)
// =============================================================================

/**
 * Hook to fetch user's vouchers (from exam_vouchers table)
 */
export const useUserVouchers = (filters?: ExamVoucherFilters) => {
  return useQuery({
    queryKey: voucherKeys.userVouchers(),
    queryFn: async () => {
      const result = await VoucherService.getUserVouchers(filters);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to fetch ECP vouchers assigned to the current user (via email)
 * These are vouchers that ECP partners have assigned to the individual
 */
export const useECPAssignedVouchers = () => {
  return useQuery({
    queryKey: voucherKeys.ecpAssignedVouchers(),
    queryFn: async () => {
      const result = await VoucherService.getECPAssignedVouchers();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to get available vouchers count by certification type
 * Returns { CP: 2, SCP: 0 }
 * Includes both direct vouchers and ECP-assigned vouchers
 */
export const useVoucherCountsByCertType = () => {
  const { data: vouchers } = useUserVouchers();
  const { data: ecpVouchers } = useECPAssignedVouchers();

  const counts = {
    CP: 0,
    SCP: 0,
  };

  // Count direct vouchers (from exam_vouchers table)
  if (vouchers) {
    vouchers.forEach((voucher) => {
      // Count available and assigned vouchers (both are usable)
      if (voucher.status === 'available' || voucher.status === 'assigned') {
        const now = new Date();
        const expiresAt = new Date(voucher.expires_at);
        if (expiresAt > now) {
          if (voucher.certification_type === 'CP') {
            counts.CP++;
          } else if (voucher.certification_type === 'SCP') {
            counts.SCP++;
          }
        }
      }
    });
  }

  // Count ECP-assigned vouchers
  if (ecpVouchers) {
    ecpVouchers.forEach((voucher) => {
      if (voucher.status === 'available') {
        const now = new Date();
        const expiresAt = voucher.expires_at ? new Date(voucher.expires_at) : null;
        if (!expiresAt || expiresAt > now) {
          if (voucher.certification_type === 'CP') {
            counts.CP++;
          } else if (voucher.certification_type === 'SCP') {
            counts.SCP++;
          }
        }
      }
    });
  }

  return counts;
};

/**
 * Hook to get merged vouchers from both direct and ECP sources
 * Provides unified MergedVoucher[] with display info
 */
export const useMergedVouchers = () => {
  const { data: directVouchers, isLoading: directLoading, error: directError } = useUserVouchers();
  const { data: ecpVouchers, isLoading: ecpLoading, error: ecpError } = useECPAssignedVouchers();

  const mergedData = useMemo(() => {
    const vouchers = mergeVouchers(directVouchers, ecpVouchers as ECPVoucherRaw[] | undefined);
    const activeVouchers = getActiveVouchers(vouchers);
    const counts = getVoucherCounts(vouchers);

    return {
      vouchers,
      activeVouchers,
      usedVouchers: vouchers.filter((v) => v.displayInfo.status === 'used'),
      expiredVouchers: vouchers.filter((v) => v.displayInfo.status === 'expired'),
      counts,
    };
  }, [directVouchers, ecpVouchers]);

  return {
    ...mergedData,
    isLoading: directLoading || ecpLoading,
    error: directError || ecpError,
  };
};

/**
 * Hook to get a specific voucher from merged sources by ID
 * Works with both direct and ECP vouchers
 */
export const useMergedVoucherById = (voucherId: string | null) => {
  const { vouchers, isLoading, error } = useMergedVouchers();

  const voucher = useMemo(() => {
    if (!voucherId || !vouchers) return null;
    return vouchers.find((v) => v.id === voucherId) || null;
  }, [voucherId, vouchers]);

  return {
    data: voucher,
    isLoading,
    error,
    isNotFound: !isLoading && !voucher && !!voucherId,
  };
};

/**
 * Hook to check if user has valid voucher for a quiz
 */
export const useCheckVoucherForQuiz = (quizId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: voucherKeys.voucherCheck(quizId),
    queryFn: async () => {
      const result = await VoucherService.checkVoucherForQuiz(quizId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Hook to use a voucher for a quiz attempt
 */
export const useVoucher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: UseVoucherDTO) => {
      const result = await VoucherService.useVoucher(dto);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: (_, variables) => {
      // Invalidate user vouchers and voucher check
      queryClient.invalidateQueries({ queryKey: voucherKeys.userVouchers() });
      queryClient.invalidateQueries({ queryKey: voucherKeys.voucherCheck(variables.quiz_id) });
    },
  });
};

// =============================================================================
// ADMIN HOOKS - CERTIFICATION PRODUCTS
// =============================================================================

/**
 * Hook to fetch all certification products (admin)
 */
export const useAllCertificationProducts = (
  filters?: CertificationProductFilters,
  options?: QueryOptions
) => {
  return useQuery({
    queryKey: certProductKeys.list(filters, options),
    queryFn: async () => {
      const result = await VoucherService.getAllCertificationProducts(filters, options);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to fetch a single certification product (admin)
 */
export const useCertificationProduct = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: certProductKeys.detail(id),
    queryFn: async () => {
      const result = await VoucherService.getCertificationProductById(id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to create a certification product (admin)
 */
export const useCreateCertificationProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateCertificationProductDTO) => {
      const result = await VoucherService.createCertificationProduct(dto);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: () => {
      // Invalidate certification products lists
      queryClient.invalidateQueries({ queryKey: certProductKeys.lists() });
    },
  });
};

/**
 * Hook to update a certification product (admin)
 */
export const useUpdateCertificationProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateCertificationProductDTO }) => {
      const result = await VoucherService.updateCertificationProduct(id, dto);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: (data) => {
      // Invalidate specific product and lists
      queryClient.invalidateQueries({ queryKey: certProductKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: certProductKeys.lists() });
    },
  });
};

/**
 * Hook to delete a certification product (admin)
 */
export const useDeleteCertificationProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await VoucherService.deleteCertificationProduct(id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return id;
    },
    onSuccess: (id) => {
      // Invalidate specific product and lists
      queryClient.invalidateQueries({ queryKey: certProductKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: certProductKeys.lists() });
    },
  });
};

/**
 * Hook to toggle certification product active status (admin)
 */
export const useToggleCertificationProductActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const result = await VoucherService.toggleCertificationProductActive(id, isActive);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: (data) => {
      // Invalidate specific product and lists
      queryClient.invalidateQueries({ queryKey: certProductKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: certProductKeys.lists() });
    },
  });
};

// =============================================================================
// ADMIN HOOKS - EXAM VOUCHERS
// =============================================================================

/**
 * Hook to fetch all vouchers (admin)
 */
export const useAllVouchers = (filters?: ExamVoucherFilters, options?: QueryOptions) => {
  return useQuery({
    queryKey: voucherKeys.list(filters, options),
    queryFn: async () => {
      const result = await VoucherService.getAllVouchers(filters, options);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to fetch a single voucher (admin)
 */
export const useVoucherById = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: voucherKeys.detail(id),
    queryFn: async () => {
      const result = await VoucherService.getVoucherById(id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to create a voucher (admin)
 */
export const useCreateVoucher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateExamVoucherDTO) => {
      const result = await VoucherService.createVoucher(dto);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: () => {
      // Invalidate voucher lists and stats
      queryClient.invalidateQueries({ queryKey: voucherKeys.lists() });
      queryClient.invalidateQueries({ queryKey: voucherKeys.stats() });
    },
  });
};

/**
 * Hook to create vouchers in bulk (admin)
 */
export const useCreateVouchersBulk = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      emails: string;
      certification_type: string;
      exam_language: string;
      quiz_id?: string | null;
      expires_at: string;
      admin_notes?: string | null;
      certification_product_id?: string | null;
    }) => {
      const result = await VoucherService.createVouchersBulk(params);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: () => {
      // Invalidate voucher lists and stats
      queryClient.invalidateQueries({ queryKey: voucherKeys.lists() });
      queryClient.invalidateQueries({ queryKey: voucherKeys.stats() });
    },
  });
};

/**
 * Hook to update a voucher (admin)
 */
export const useUpdateVoucher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateExamVoucherDTO }) => {
      const result = await VoucherService.updateVoucher(id, dto);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: (data) => {
      // Invalidate specific voucher, lists, and stats
      queryClient.invalidateQueries({ queryKey: voucherKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: voucherKeys.lists() });
      queryClient.invalidateQueries({ queryKey: voucherKeys.stats() });
    },
  });
};

/**
 * Hook to revoke a voucher (admin)
 */
export const useRevokeVoucher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await VoucherService.revokeVoucher(id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: (data) => {
      // Invalidate specific voucher, lists, and stats
      queryClient.invalidateQueries({ queryKey: voucherKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: voucherKeys.lists() });
      queryClient.invalidateQueries({ queryKey: voucherKeys.stats() });
    },
  });
};

/**
 * Hook to delete a voucher (admin)
 */
export const useDeleteVoucher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await VoucherService.deleteVoucher(id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return id;
    },
    onSuccess: (id) => {
      // Invalidate specific voucher, lists, and stats
      queryClient.invalidateQueries({ queryKey: voucherKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: voucherKeys.lists() });
      queryClient.invalidateQueries({ queryKey: voucherKeys.stats() });
    },
  });
};

/**
 * Hook to fetch voucher statistics (admin)
 */
export const useVoucherStats = () => {
  return useQuery({
    queryKey: voucherKeys.stats(),
    queryFn: async () => {
      const result = await VoucherService.getVoucherStats();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to batch expire vouchers (admin)
 */
export const useBatchExpireVouchers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await VoucherService.batchExpireVouchers();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: () => {
      // Invalidate all voucher queries to refresh data
      queryClient.invalidateQueries({ queryKey: voucherKeys.all });
    },
  });
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook to prefetch a certification product (for optimistic loading)
 */
export const usePrefetchCertificationProduct = () => {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: certProductKeys.detail(id),
      queryFn: async () => {
        const result = await VoucherService.getCertificationProductById(id);
        if (result.error) {
          throw new Error(result.error.message);
        }
        return result.data!;
      },
      staleTime: 2 * 60 * 1000,
    });
  };
};

/**
 * Hook to prefetch a voucher (for optimistic loading)
 */
export const usePrefetchVoucher = () => {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: voucherKeys.detail(id),
      queryFn: async () => {
        const result = await VoucherService.getVoucherById(id);
        if (result.error) {
          throw new Error(result.error.message);
        }
        return result.data!;
      },
      staleTime: 2 * 60 * 1000,
    });
  };
};
