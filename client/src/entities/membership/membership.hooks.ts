/**
 * Membership Hooks
 * React Query hooks for membership management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MembershipService } from './membership.service';
import type {
  MembershipFilters,
  CreateMembershipParams,
  ExtendMembershipParams,
  DeactivateMembershipParams,
  BulkActivateMembershipsParams,
  CreateMembershipProductMappingDTO,
  UpdateMembershipProductMappingDTO,
} from './membership.types';

// ============================================
// USER HOOKS
// ============================================

/**
 * Get user's active membership
 */
export const useUserActiveMembership = (userId: string) => {
  return useQuery({
    queryKey: ['user-membership', userId],
    queryFn: () => MembershipService.getUserActiveMembership(userId),
    enabled: !!userId,
  });
};

/**
 * Get user's full membership status
 * US1: View Membership Status
 */
export const useUserMembershipStatus = (userId: string) => {
  return useQuery({
    queryKey: ['user-membership-status', userId],
    queryFn: () => MembershipService.getUserMembershipStatus(userId),
    enabled: !!userId,
  });
};

/**
 * Get all user's memberships (history)
 */
export const useUserMemberships = (userId: string) => {
  return useQuery({
    queryKey: ['user-memberships', userId],
    queryFn: () => MembershipService.getUserMemberships(userId),
    enabled: !!userId,
  });
};

/**
 * Get membership benefits
 * US5: Display Membership Benefits
 */
export const useMembershipBenefits = (membershipType?: 'basic' | 'professional') => {
  return useQuery({
    queryKey: ['membership-benefits', membershipType],
    queryFn: () => MembershipService.getMembershipBenefits(membershipType),
  });
};

/**
 * Check if user has BDA BoCK access
 * US4: Access Control to Books
 */
export const useHasBookAccess = (userId: string) => {
  return useQuery({
    queryKey: ['book-access', userId],
    queryFn: () => MembershipService.hasBookAccess(userId),
    enabled: !!userId,
  });
};

/**
 * Get membership certificate URL
 * US3: Display Membership Certificate
 */
export const useMembershipCertificate = (membershipId: string, enabled = false) => {
  return useQuery({
    queryKey: ['membership-certificate', membershipId],
    queryFn: () => MembershipService.getMembershipCertificateUrl(membershipId),
    enabled: !!membershipId && enabled,
  });
};

// ============================================
// ADMIN HOOKS
// ============================================

/**
 * Get all memberships with filters
 * US7: Admin Panel
 */
export const useAllMemberships = (filters?: MembershipFilters) => {
  return useQuery({
    queryKey: ['all-memberships', filters],
    queryFn: () => MembershipService.getAllMemberships(filters),
  });
};

/**
 * Get membership statistics
 * US7: Admin dashboard
 */
export const useMembershipStats = () => {
  return useQuery({
    queryKey: ['membership-stats'],
    queryFn: () => MembershipService.getMembershipStats(),
  });
};

/**
 * Get membership activation logs
 */
export const useMembershipLogs = (membershipId?: string, userId?: string) => {
  return useQuery({
    queryKey: ['membership-logs', membershipId, userId],
    queryFn: () => MembershipService.getMembershipLogs(membershipId, userId),
    enabled: !!membershipId || !!userId,
  });
};

/**
 * Create membership mutation
 * US7: Admin can create membership manually
 */
export const useCreateMembership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ params, adminId }: { params: CreateMembershipParams; adminId: string }) =>
      MembershipService.createMembership(params, adminId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['membership-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-membership', variables.params.user_id] });
      queryClient.invalidateQueries({ queryKey: ['user-membership-status', variables.params.user_id] });
    },
  });
};

/**
 * Extend membership mutation
 * US7: Admin can extend membership
 */
export const useExtendMembership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ params, adminId }: { params: ExtendMembershipParams; adminId: string }) =>
      MembershipService.extendMembership(params, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['membership-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-membership'] });
      queryClient.invalidateQueries({ queryKey: ['user-membership-status'] });
    },
  });
};

/**
 * Deactivate membership mutation
 * US7: Admin can deactivate membership
 */
export const useDeactivateMembership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ params, adminId }: { params: DeactivateMembershipParams; adminId: string }) =>
      MembershipService.deactivateMembership(params, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['membership-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-membership'] });
      queryClient.invalidateQueries({ queryKey: ['user-membership-status'] });
    },
  });
};

/**
 * Reactivate membership mutation
 */
export const useReactivateMembership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ membershipId, adminId }: { membershipId: string; adminId: string }) =>
      MembershipService.reactivateMembership(membershipId, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['membership-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-membership'] });
      queryClient.invalidateQueries({ queryKey: ['user-membership-status'] });
    },
  });
};

/**
 * Re-issue certificate mutation
 * US7: Admin can re-issue certificate
 */
export const useReissueCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ membershipId, adminId }: { membershipId: string; adminId: string }) =>
      MembershipService.reissueCertificate(membershipId, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-certificate'] });
      queryClient.invalidateQueries({ queryKey: ['membership-logs'] });
    },
  });
};

/**
 * Bulk activate memberships mutation
 * US2: Bulk Membership Activation
 */
export const useBulkActivateMemberships = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ params, adminId }: { params: BulkActivateMembershipsParams; adminId: string }) =>
      MembershipService.bulkActivateMemberships(params, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['membership-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-membership'] });
      queryClient.invalidateQueries({ queryKey: ['user-membership-status'] });
    },
  });
};

// ============================================
// PRODUCT MAPPING HOOKS
// ============================================

export const useMembershipProductMappings = () => {
  return useQuery({
    queryKey: ['membership-product-mappings'],
    queryFn: async () => {
      const result = await MembershipService.getAllProductMappings();
      if (result.error) throw result.error;
      return result.data!;
    },
  });
};

export const useCreateMembershipProductMapping = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateMembershipProductMappingDTO) => {
      const result = await MembershipService.createProductMapping(dto);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-product-mappings'] });
    },
  });
};

export const useUpdateMembershipProductMapping = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateMembershipProductMappingDTO }) => {
      const result = await MembershipService.updateProductMapping(id, dto);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-product-mappings'] });
    },
  });
};

export const useDeleteMembershipProductMapping = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await MembershipService.deleteProductMapping(id);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-product-mappings'] });
    },
  });
};
