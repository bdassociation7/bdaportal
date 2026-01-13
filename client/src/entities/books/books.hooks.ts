import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BooksService } from './books.service';
import type { BookFilters, UserBook, RedeemCreditRequest, GrantBookRequest, RevokeBookRequest } from './books.types';

/**
 * React hooks for Books operations
 */

// Query keys
export const booksKeys = {
  all: ['books'] as const,
  lists: () => [...booksKeys.all, 'list'] as const,
  list: (email: string, filters?: BookFilters) =>
    [...booksKeys.lists(), email, filters] as const,
  credits: (email: string) => [...booksKeys.all, 'credits', email] as const,
  bookOptions: (bookGroup: string) => [...booksKeys.all, 'options', bookGroup] as const,
  grantedBooks: (userId: string) => [...booksKeys.all, 'granted', userId] as const,
};

/**
 * Hook to fetch user's books
 */
export const useUserBooks = (userEmail: string, filters?: BookFilters) => {
  return useQuery({
    queryKey: booksKeys.list(userEmail, filters),
    queryFn: async () => {
      if (!userEmail) {
        throw new Error('User email is required');
      }
      const result = await BooksService.getUserBooks(userEmail, filters);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    enabled: !!userEmail,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get book download URL
 */
export const useBookDownload = () => {
  return useMutation({
    mutationFn: async ({
      productId,
      orderId,
      userEmail,
    }: {
      productId: number;
      orderId: number;
      userEmail?: string;
    }) => {
      const result = await BooksService.getBookDownloadUrl(productId, orderId, userEmail);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
  });
};

/**
 * Hook to fetch user's book credits
 */
export const useUserBookCredits = (userEmail: string) => {
  return useQuery({
    queryKey: booksKeys.credits(userEmail),
    queryFn: async () => {
      if (!userEmail) {
        throw new Error('User email is required');
      }
      const result = await BooksService.getUserBookCredits(userEmail);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    enabled: !!userEmail,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch book options for a credit
 */
export const useBookOptions = (bookProductGroup: string) => {
  return useQuery({
    queryKey: booksKeys.bookOptions(bookProductGroup),
    queryFn: async () => {
      if (!bookProductGroup) {
        throw new Error('Book product group is required');
      }
      const result = await BooksService.getBookOptions(bookProductGroup);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    enabled: !!bookProductGroup,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to redeem a book credit
 */
export const useRedeemBookCredit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: RedeemCreditRequest) => {
      const result = await BooksService.redeemBookCredit(request);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: () => {
      // Invalidate credits and books queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: booksKeys.all });
    },
  });
};

/**
 * Hook to fetch granted books for a user (admin view)
 */
export const useUserGrantedBooks = (userId: string) => {
  return useQuery({
    queryKey: booksKeys.grantedBooks(userId),
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      const result = await BooksService.getUserGrantedBooks(userId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to grant book access to a user (admin only)
 */
export const useGrantBookAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: GrantBookRequest) => {
      const result = await BooksService.grantBookToUser(request);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: () => {
      // Invalidate all books queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: booksKeys.all });
    },
  });
};

/**
 * Hook to revoke granted book access (admin only)
 */
export const useRevokeBookAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: RevokeBookRequest) => {
      const result = await BooksService.revokeGrantedBook(request);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data!;
    },
    onSuccess: () => {
      // Invalidate all books queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: booksKeys.all });
    },
  });
};
