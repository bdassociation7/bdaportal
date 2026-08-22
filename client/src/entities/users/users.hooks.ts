/**
 * User Management Hooks
 * React Query hooks for user management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UsersService } from './users.service';
import type { UserFilters, UpdateUserDTO } from './users.types';

// Query keys
export const usersKeys = {
  all: ['users'] as const,
  lists: () => [...usersKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...usersKeys.lists(), filters] as const,
  details: () => [...usersKeys.all, 'detail'] as const,
  detail: (id: string) => [...usersKeys.details(), id] as const,
  stats: () => [...usersKeys.all, 'stats'] as const,
  countryCodes: () => [...usersKeys.all, 'country-codes'] as const,
};

/**
 * Get all users
 */
export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: usersKeys.list(filters),
    queryFn: async () => {
      const result = await UsersService.getUsers(filters);
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

/**
 * Get single user
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: usersKeys.detail(id),
    queryFn: async () => {
      const result = await UsersService.getUserById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!id,
  });
}

/**
 * Get user statistics
 */
export function useUserStats() {
  return useQuery({
    queryKey: usersKeys.stats(),
    queryFn: async () => {
      const result = await UsersService.getUserStats();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

/**
 * Get country codes
 */
export function useCountryCodes() {
  return useQuery({
    queryKey: usersKeys.countryCodes(),
    queryFn: async () => {
      const result = await UsersService.getCountryCodes();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

/**
 * Update user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateUserDTO }) => {
      const result = await UsersService.updateUser(id, dto);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
      toast.success('User updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
  });
}

/**
 * Toggle user active status
 */
export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const result = await UsersService.toggleUserStatus(id, is_active);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
      toast.success(variables.is_active ? 'User activated' : 'User deactivated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to toggle user status: ${error.message}`);
    },
  });
}
