import { supabase } from '@/shared/config/supabase.config';
import type {
  MembershipBenefitBook,
  CreateMembershipBenefitBookDTO,
  UpdateMembershipBenefitBookDTO,
  MembershipBenefitBookFilters,
  MembershipBenefitBookResult,
} from './membershipBenefitBooks.types';

export class MembershipBenefitBooksService {
  /**
   * Get all membership benefit books with optional filters
   */
  static async getAll(
    filters?: MembershipBenefitBookFilters
  ): Promise<MembershipBenefitBookResult<MembershipBenefitBook[]>> {
    try {
      let query = supabase
        .from('membership_benefit_books')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.membership_type) {
        query = query.eq('membership_type', filters.membership_type);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        query = query.or(
          `product_name.ilike.%${filters.search}%,product_sku.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        return {
          data: null,
          error: {
            code: 'FETCH_ERROR',
            message: error.message,
            details: error,
          },
        };
      }

      return { data: data || [], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Failed to fetch membership benefit books',
          details: err,
        },
      };
    }
  }

  /**
   * Get a single membership benefit book by ID
   */
  static async getById(
    id: string
  ): Promise<MembershipBenefitBookResult<MembershipBenefitBook>> {
    try {
      const { data, error } = await supabase
        .from('membership_benefit_books')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: 'FETCH_ERROR',
            message: error.message,
            details: error,
          },
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Failed to fetch membership benefit book',
          details: err,
        },
      };
    }
  }

  /**
   * Create a new membership benefit book
   */
  static async create(
    dto: CreateMembershipBenefitBookDTO
  ): Promise<MembershipBenefitBookResult<MembershipBenefitBook>> {
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('membership_benefit_books')
        .insert({
          ...dto,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code || 'CREATE_ERROR',
            message: error.message,
            details: error,
          },
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Failed to create membership benefit book',
          details: err,
        },
      };
    }
  }

  /**
   * Update an existing membership benefit book
   */
  static async update(
    id: string,
    dto: UpdateMembershipBenefitBookDTO
  ): Promise<MembershipBenefitBookResult<MembershipBenefitBook>> {
    try {
      const { data, error } = await supabase
        .from('membership_benefit_books')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code || 'UPDATE_ERROR',
            message: error.message,
            details: error,
          },
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Failed to update membership benefit book',
          details: err,
        },
      };
    }
  }

  /**
   * Delete a membership benefit book
   */
  static async delete(id: string): Promise<MembershipBenefitBookResult<void>> {
    try {
      const { error } = await supabase
        .from('membership_benefit_books')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          data: null,
          error: {
            code: error.code || 'DELETE_ERROR',
            message: error.message,
            details: error,
          },
        };
      }

      return { data: null, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Failed to delete membership benefit book',
          details: err,
        },
      };
    }
  }

  /**
   * Get active membership benefit books for a specific membership type
   * Used by books service to auto-include books for users
   */
  static async getActiveBooksForMembership(
    membershipType: string
  ): Promise<MembershipBenefitBookResult<MembershipBenefitBook[]>> {
    try {
      const { data, error } = await supabase
        .from('membership_benefit_books')
        .select('*')
        .eq('membership_type', membershipType)
        .eq('is_active', true);

      if (error) {
        return {
          data: null,
          error: {
            code: 'FETCH_ERROR',
            message: error.message,
            details: error,
          },
        };
      }

      return { data: data || [], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Failed to fetch active membership benefit books',
          details: err,
        },
      };
    }
  }

}
