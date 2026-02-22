/**
 * Membership Types
 * User membership management (Basic / Professional)
 */

export type MembershipType = 'basic' | 'professional';
export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'suspended';

export interface UserMembership {
  id: string;
  user_id: string;
  membership_id: string; // e.g., BDA-MEM-2024-0001
  membership_type: MembershipType;
  status: MembershipStatus;
  start_date: string;
  expiry_date: string;
  woocommerce_order_id?: string;
  woocommerce_product_id?: string;
  certificate_url?: string;
  auto_renew: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined user data (optional)
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface MembershipBenefit {
  id: string;
  membership_type: MembershipType;
  benefit_key: string;
  benefit_name: string;
  benefit_name_ar: string;
  benefit_description?: string;
  benefit_description_ar?: string;
  is_active: boolean;
  display_order: number;
}

export interface MembershipProductMapping {
  id: string;
  woocommerce_product_id: number;
  membership_type: MembershipType;
  duration_months: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMembershipProductMappingDTO {
  woocommerce_product_id: number;
  membership_type: MembershipType;
  duration_months?: number;
  is_active?: boolean;
}

export interface UpdateMembershipProductMappingDTO {
  membership_type?: MembershipType;
  duration_months?: number;
  is_active?: boolean;
}

export interface MembershipActivationLog {
  id: string;
  user_id?: string;
  membership_id?: string;
  action: 'activated' | 'renewed' | 'expired' | 'cancelled' | 'suspended' | 'reactivated' | 'certificate_generated' | 'certificate_reissued';
  action_source: 'webhook' | 'admin' | 'system' | 'user';
  woocommerce_order_id?: string;
  details?: Record<string, unknown>;
  performed_by?: string;
  created_at: string;
}

export interface MembershipFilters {
  status?: MembershipStatus;
  membership_type?: MembershipType;
  search?: string;
  expiring_soon?: boolean; // Within 30 days
}

export interface MembershipStats {
  total_members: number;
  active_members: number;
  basic_members: number;
  professional_members: number;
  expired_members: number;
  expiring_soon: number; // Within 30 days
}

export interface MembershipResult<T> {
  data: T | null;
  error: Error | null;
}

export interface MembershipStatusInfo {
  hasActiveMembership: boolean;
  membership: UserMembership | null;
  daysRemaining: number;
  isExpiringSoon: boolean; // < 30 days
  isExpired: boolean;
  membershipLevel: MembershipType | 'none';
}

// Admin actions
export interface CreateMembershipParams {
  user_id: string;
  membership_type: MembershipType;
  duration_months?: number; // Default 12
  notes?: string;
  start_date?: string; // Optional: YYYY-MM-DD format for backdating (admin only)
}

export interface ExtendMembershipParams {
  membership_id: string;
  additional_months: number;
  notes?: string;
}

export interface DeactivateMembershipParams {
  membership_id: string;
  reason?: string;
}

export interface BulkActivateMembershipsParams {
  emails: string[]; // Array of user emails
  membership_type: MembershipType;
  duration_months?: number; // Default 12
  notes?: string;
}

export interface BulkActivationResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    email: string;
    success: boolean;
    membership_id?: string;
    error?: string;
  }>;
}
