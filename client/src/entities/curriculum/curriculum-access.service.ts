import { supabase } from '@/shared/config/supabase.config';
import { WooCommerceService } from '@/entities/woocommerce/woocommerce.service';
import type {
  UserCurriculumAccess,
  GrantAccessDTO,
  AccessCheckResult,
  ServiceResponse,
  CertificationType,
} from './curriculum.types';

/**
 * Curriculum Access Service
 * Manages user access to curriculum (1 year from purchase)
 * Auto-grants access based on WooCommerce purchases
 */
export class CurriculumAccessService {
  // ==========================================================================
  // ACCESS CHECK & AUTO-GRANT
  // ==========================================================================

  /**
   * Check if user has active curriculum access
   * If not, checks WooCommerce for certification purchase and auto-grants
   */
  static async checkAndGrantAccess(
    userId: string,
    userEmail: string,
    certificationType: CertificationType
  ): Promise<ServiceResponse<AccessCheckResult>> {
    try {
      // ECP is granted the shared Learning System as part of the partner workspace.
      // This is role-based so access ends automatically if the account is no longer an ECP.
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.role === 'ecp') {
        // The curriculum dashboard still expects an access object for expiry/status
        // presentation. ECP entitlement is role-based, so return a synthetic,
        // non-persisted record rather than requiring a purchase or licence row.
        const now = new Date().toISOString();
        const access: UserCurriculumAccess = {
          id: `ecp-role-${userId}`,
          user_id: userId,
          certification_type: 'CP',
          is_active: true,
          purchased_at: now,
          expires_at: '9999-12-31T23:59:59.999Z',
          woocommerce_order_id: null,
          woocommerce_product_id: null,
          last_checked_at: now,
          created_at: now,
          updated_at: now,
        };

        return {
          data: {
            hasAccess: true,
            access,
            expiresAt: access.expires_at,
          },
        };
      }

      // 1. Check if user already has access record in Supabase
      // Note: All content is stored under 'CP', but users may have SCP or CP access records.
      // We accept any active access (CP or SCP) since they share the same content.
      const { data: existingAccessList } = await supabase
        .from('user_curriculum_access')
        .select('*')
        .eq('user_id', userId)
        .in('certification_type', ['CP', 'SCP'])
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1);

      const existingAccess = existingAccessList?.[0] || null;

      // If access exists (already filtered for active and non-expired), return it
      if (existingAccess) {
        return {
          data: {
            hasAccess: true,
            access: existingAccess,
            expiresAt: existingAccess.expires_at,
          },
        };
      }

      // 2. No access record found, check WooCommerce for certification purchases
      console.log(`[CurriculumAccess] No access found for user ${userId}, checking WooCommerce...`);

      const purchaseCheck = await this.checkWooCommercePurchase(
        userEmail,
        certificationType
      );

      if (!purchaseCheck.data?.hasPurchase) {
        return {
          data: {
            hasAccess: false,
            reason: 'no_purchase',
          },
        };
      }

      // 3. User has purchased! Auto-grant curriculum access
      console.log(`[CurriculumAccess] Purchase found, auto-granting access...`);

      const grantResult = await this.grantAccess({
        user_id: userId,
        certification_type: certificationType,
        woocommerce_order_id: purchaseCheck.data.orderId,
        woocommerce_product_id: purchaseCheck.data.productId,
        purchased_at: purchaseCheck.data.purchaseDate,
        expires_at: this.calculateExpiryDate(purchaseCheck.data.purchaseDate),
      });

      if (grantResult.error) {
        throw grantResult.error;
      }

      // 4. Initialize user progress for all modules
      await this.initializeUserProgress(userId, certificationType);

      return {
        data: {
          hasAccess: true,
          access: grantResult.data!,
          expiresAt: grantResult.data!.expires_at,
        },
      };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'ACCESS_CHECK_ERROR',
          message: 'Failed to check curriculum access',
          details: error,
        },
      };
    }
  }

  /**
   * Check WooCommerce for certification product purchases
   */
  private static async checkWooCommercePurchase(
    userEmail: string,
    certificationType: CertificationType
  ): Promise<
    ServiceResponse<{
      hasPurchase: boolean;
      orderId?: number;
      productId?: number;
      purchaseDate?: string;
    }>
  > {
    try {
      // Get certification products from Supabase
      const { data: certProducts, error: certError } = await supabase
        .from('certification_products')
        .select('woocommerce_product_id, woocommerce_product_sku')
        .eq('certification_type', certificationType)
        .eq('is_active', true);

      if (certError || !certProducts || certProducts.length === 0) {
        return {
          data: {
            hasPurchase: false,
          },
        };
      }

      const productIds = certProducts.map((p) => p.woocommerce_product_id);

      // Check user's WooCommerce orders
      const ordersResponse = await WooCommerceService.getOrders({
        customer_email: userEmail,
        status: 'completed',
      });

      if (WooCommerceService.isError(ordersResponse)) {
        throw new Error('Failed to fetch WooCommerce orders');
      }

      // Find order with certification product
      for (const order of ordersResponse.data || []) {
        for (const item of order.items) {
          if (productIds.includes(item.product_id)) {
            return {
              data: {
                hasPurchase: true,
                orderId: order.id,
                productId: item.product_id,
                purchaseDate: order.date_completed || order.date_created,
              },
            };
          }
        }
      }

      return {
        data: {
          hasPurchase: false,
        },
      };
    } catch (error: any) {
      return {
        error: {
          code: 'WOOCOMMERCE_CHECK_ERROR',
          message: 'Failed to check WooCommerce purchases',
          details: error,
        },
      };
    }
  }

  /**
   * Calculate expiry date (1 year from purchase)
   */
  private static calculateExpiryDate(purchaseDate: string): string {
    const expiryDate = new Date(purchaseDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    return expiryDate.toISOString();
  }

  // ==========================================================================
  // ACCESS MANAGEMENT (Admin / Auto-grant)
  // ==========================================================================

  /**
   * Grant curriculum access to a user
   * Uses a SECURITY DEFINER function to bypass RLS
   */
  static async grantAccess(
    dto: GrantAccessDTO
  ): Promise<ServiceResponse<UserCurriculumAccess>> {
    try {
      // Use the auto_grant_curriculum_access function which bypasses RLS
      const { data, error } = await supabase.rpc('auto_grant_curriculum_access', {
        p_user_id: dto.user_id,
        p_certification_type: dto.certification_type,
        p_woocommerce_order_id: dto.woocommerce_order_id || null,
        p_woocommerce_product_id: dto.woocommerce_product_id || null,
        p_purchased_at: dto.purchased_at,
        p_expires_at: dto.expires_at,
      });

      if (error) throw error;

      // The function returns JSONB, convert to expected type
      return { data: data as UserCurriculumAccess };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'GRANT_ERROR',
          message: 'Failed to grant curriculum access',
          details: error,
        },
      };
    }
  }

  /**
   * Initialize user progress for all published modules
   */
  static async initializeUserProgress(
    userId: string,
    certificationType: CertificationType
  ): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase.rpc('initialize_user_progress', {
        p_user_id: userId,
        p_certification_type: certificationType,
      });

      if (error) throw error;

      return { data: undefined };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'INIT_ERROR',
          message: 'Failed to initialize user progress',
          details: error,
        },
      };
    }
  }

  /**
   * Revoke curriculum access (Admin only)
   */
  static async revokeAccess(
    userId: string,
    certificationType: CertificationType
  ): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('user_curriculum_access')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('certification_type', certificationType);

      if (error) throw error;

      return { data: undefined };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'REVOKE_ERROR',
          message: 'Failed to revoke access',
          details: error,
        },
      };
    }
  }

  /**
   * Extend curriculum access (Admin only)
   */
  static async extendAccess(
    userId: string,
    certificationType: CertificationType,
    additionalMonths: number
  ): Promise<ServiceResponse<UserCurriculumAccess>> {
    try {
      // Get current access
      const { data: currentAccess, error: fetchError } = await supabase
        .from('user_curriculum_access')
        .select('*')
        .eq('user_id', userId)
        .eq('certification_type', certificationType)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new expiry date
      const newExpiryDate = new Date(currentAccess.expires_at);
      newExpiryDate.setMonth(newExpiryDate.getMonth() + additionalMonths);

      // Update
      const { data, error } = await supabase
        .from('user_curriculum_access')
        .update({
          expires_at: newExpiryDate.toISOString(),
          is_active: true,
        })
        .eq('user_id', userId)
        .eq('certification_type', certificationType)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'EXTEND_ERROR',
          message: 'Failed to extend access',
          details: error,
        },
      };
    }
  }

  // ==========================================================================
  // QUERY OPERATIONS
  // ==========================================================================

  /**
   * Get user's curriculum access
   */
  static async getUserAccess(
    userId: string,
    certificationType: CertificationType
  ): Promise<ServiceResponse<UserCurriculumAccess | null>> {
    try {
      const { data, error } = await supabase
        .from('user_curriculum_access')
        .select('*')
        .eq('user_id', userId)
        .eq('certification_type', certificationType)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found
        throw error;
      }

      return { data: data || null };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch user access',
          details: error,
        },
      };
    }
  }

  /**
   * Get all users with curriculum access (Admin only)
   */
  static async getAllUsersWithAccess(): Promise<
    ServiceResponse<UserCurriculumAccess[]>
  > {
    try {
      const { data, error } = await supabase
        .from('user_curriculum_access')
        .select(`
          *,
          users (
            email,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch users with access',
          details: error,
        },
      };
    }
  }

  /**
   * Get users with expiring access (within X days)
   */
  static async getUsersWithExpiringAccess(
    daysUntilExpiry: number = 30
  ): Promise<ServiceResponse<UserCurriculumAccess[]>> {
    try {
      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + daysUntilExpiry);

      const { data, error } = await supabase
        .from('user_curriculum_access')
        .select(`
          *,
          users (
            email,
            first_name,
            last_name
          )
        `)
        .eq('is_active', true)
        .lt('expires_at', expiryThreshold.toISOString())
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return {
        error: {
          code: error.code || 'FETCH_ERROR',
          message: 'Failed to fetch expiring access',
          details: error,
        },
      };
    }
  }
}
