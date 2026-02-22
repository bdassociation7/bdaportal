import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MembershipBenefitBooksService } from './membershipBenefitBooks.service';
import type {
  MembershipBenefitBookFilters,
  CreateMembershipBenefitBookDTO,
  UpdateMembershipBenefitBookDTO,
} from './membershipBenefitBooks.types';
import { supabase } from '@/shared/config/supabase.config';

// Re-export WooCommerce products hook from woocommerce entity
export { useWooCommerceProducts } from '@/entities/woocommerce';

/**
 * Query Keys
 */
export const membershipBenefitBooksKeys = {
  all: ['membership-benefit-books'] as const,
  lists: () => [...membershipBenefitBooksKeys.all, 'list'] as const,
  list: (filters?: MembershipBenefitBookFilters) =>
    [...membershipBenefitBooksKeys.lists(), filters] as const,
  details: () => [...membershipBenefitBooksKeys.all, 'detail'] as const,
  detail: (id: string) => [...membershipBenefitBooksKeys.details(), id] as const,
  wooProducts: () => ['woocommerce-products'] as const,
  wooProduct: (search?: string) => [...membershipBenefitBooksKeys.wooProducts(), search] as const,
};

/**
 * Fetch all membership benefit books
 */
export function useMembershipBenefitBooks(filters?: MembershipBenefitBookFilters) {
  return useQuery({
    queryKey: membershipBenefitBooksKeys.list(filters),
    queryFn: async () => {
      const result = await MembershipBenefitBooksService.getAll(filters);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

/**
 * Fetch a single membership benefit book
 */
export function useMembershipBenefitBook(id: string) {
  return useQuery({
    queryKey: membershipBenefitBooksKeys.detail(id),
    queryFn: async () => {
      const result = await MembershipBenefitBooksService.getById(id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: !!id,
  });
}

// Note: useWooCommerceProducts is re-exported from @/entities/woocommerce above

/**
 * Create membership benefit book mutation
 */
export function useCreateMembershipBenefitBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateMembershipBenefitBookDTO) => {
      const result = await MembershipBenefitBooksService.create(dto);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipBenefitBooksKeys.lists() });
    },
  });
}

/**
 * Update membership benefit book mutation
 */
export function useUpdateMembershipBenefitBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateMembershipBenefitBookDTO }) => {
      const result = await MembershipBenefitBooksService.update(id, dto);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: membershipBenefitBooksKeys.lists() });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: membershipBenefitBooksKeys.detail(data.id) });
      }
    },
  });
}

/**
 * Delete membership benefit book mutation
 */
export function useDeleteMembershipBenefitBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await MembershipBenefitBooksService.delete(id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipBenefitBooksKeys.lists() });
    },
  });
}

/**
 * Grant book credits to all active memberships (Admin only)
 */
export function useGrantAllBookCredits() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('admin_grant_all_book_credits');

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to grant book credits');
      }

      return data;
    },
  });
}
