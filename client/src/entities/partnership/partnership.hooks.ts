/**
 * Partnership Product Mapping Hooks
 * React Query hooks for partnership product mapping operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PartnershipService } from './partnership.service';
import type { CreatePartnershipMappingDTO, UpdatePartnershipMappingDTO } from './partnership.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const partnershipKeys = {
  all: ['partnership'] as const,
  mappings: () => [...partnershipKeys.all, 'mappings'] as const,
  mapping: (id: string) => [...partnershipKeys.mappings(), id] as const,
  mappingByProduct: (productId: number) => [...partnershipKeys.mappings(), 'product', productId] as const,
  activeLogs: () => [...partnershipKeys.all, 'activation-logs'] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Hook to fetch all partnership product mappings
 */
export function usePartnershipMappings() {
  return useQuery({
    queryKey: partnershipKeys.mappings(),
    queryFn: async () => {
      const result = await PartnershipService.getAllMappings();
      if (PartnershipService.isError(result)) {
        throw new Error(result.message);
      }
      return result.data;
    },
  });
}

/**
 * Hook to fetch only active partnership mappings
 */
export function useActivePartnershipMappings() {
  return useQuery({
    queryKey: [...partnershipKeys.mappings(), 'active'],
    queryFn: async () => {
      const result = await PartnershipService.getActiveMappings();
      if (PartnershipService.isError(result)) {
        throw new Error(result.message);
      }
      return result.data;
    },
  });
}

/**
 * Hook to fetch a single mapping by ID
 */
export function usePartnershipMapping(id: string) {
  return useQuery({
    queryKey: partnershipKeys.mapping(id),
    queryFn: async () => {
      const result = await PartnershipService.getMappingById(id);
      if (PartnershipService.isError(result)) {
        throw new Error(result.message);
      }
      return result.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch partnership activation logs
 */
export function usePartnershipActivationLogs(limit: number = 50) {
  return useQuery({
    queryKey: partnershipKeys.activeLogs(),
    queryFn: async () => {
      const result = await PartnershipService.getActivationLogs(limit);
      if (PartnershipService.isError(result)) {
        throw new Error(result.message);
      }
      return result.data;
    },
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Hook to create a new partnership mapping
 */
export function useCreatePartnershipMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreatePartnershipMappingDTO) => {
      const result = await PartnershipService.createMapping(dto);
      if (PartnershipService.isError(result)) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnershipKeys.mappings() });
    },
  });
}

/**
 * Hook to update an existing partnership mapping
 */
export function useUpdatePartnershipMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdatePartnershipMappingDTO }) => {
      const result = await PartnershipService.updateMapping(id, dto);
      if (PartnershipService.isError(result)) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: partnershipKeys.mappings() });
      queryClient.invalidateQueries({ queryKey: partnershipKeys.mapping(data.id) });
    },
  });
}

/**
 * Hook to delete a partnership mapping
 */
export function useDeletePartnershipMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await PartnershipService.deleteMapping(id);
      if (PartnershipService.isError(result)) {
        throw new Error(result.message);
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnershipKeys.mappings() });
    },
  });
}

/**
 * Hook to toggle mapping active status
 */
export function useTogglePartnershipMappingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const result = await PartnershipService.toggleMappingStatus(id, isActive);
      if (PartnershipService.isError(result)) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: partnershipKeys.mappings() });
      queryClient.invalidateQueries({ queryKey: partnershipKeys.mapping(data.id) });
    },
  });
}
