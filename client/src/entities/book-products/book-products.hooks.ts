/**
 * Book Products Hooks
 * React Query hooks for book products management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookProductsService } from './book-products.service';
import type { CreateBookProductDTO, UpdateBookProductDTO } from './book-products.types';

export const bookProductsKeys = {
  all: ['book-products'] as const,
  lists: () => [...bookProductsKeys.all, 'list'] as const,
  list: (filters?: string) => [...bookProductsKeys.lists(), filters] as const,
  details: () => [...bookProductsKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookProductsKeys.details(), id] as const,
  stats: () => [...bookProductsKeys.all, 'stats'] as const,
  ids: () => [...bookProductsKeys.all, 'ids'] as const,
};

/**
 * Get all book products
 */
export function useBookProducts() {
  return useQuery({
    queryKey: bookProductsKeys.lists(),
    queryFn: () => BookProductsService.getBookProducts(),
  });
}

/**
 * Get a single book product by ID
 */
export function useBookProduct(id: string) {
  return useQuery({
    queryKey: bookProductsKeys.detail(id),
    queryFn: () => BookProductsService.getBookProductById(id),
    enabled: !!id,
  });
}

/**
 * Get book products statistics
 */
export function useBookProductsStats() {
  return useQuery({
    queryKey: bookProductsKeys.stats(),
    queryFn: () => BookProductsService.getBookProductsStats(),
  });
}

/**
 * Get all book product IDs
 */
export function useBookProductIds() {
  return useQuery({
    queryKey: bookProductsKeys.ids(),
    queryFn: () => BookProductsService.getBookProductIds(),
  });
}

/**
 * Create a book product
 */
export function useCreateBookProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateBookProductDTO) => BookProductsService.createBookProduct(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookProductsKeys.all });
    },
  });
}

/**
 * Update a book product
 */
export function useUpdateBookProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateBookProductDTO }) =>
      BookProductsService.updateBookProduct(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookProductsKeys.all });
    },
  });
}

/**
 * Delete a book product
 */
export function useDeleteBookProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => BookProductsService.deleteBookProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookProductsKeys.all });
    },
  });
}
