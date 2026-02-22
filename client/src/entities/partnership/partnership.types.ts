/**
 * Partnership Product Mapping Types
 * Types for mapping WooCommerce products to PDP/ECP partnerships
 */

export type PartnershipType = 'pdp' | 'ecp';

export interface PartnershipProductMapping {
  id: string;
  woocommerce_product_id: number;
  product_name: string;
  partnership_type: PartnershipType;
  license_duration_months: number;
  max_programs: number | null;
  tier: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreatePartnershipMappingDTO {
  woocommerce_product_id: number;
  product_name: string;
  partnership_type: PartnershipType;
  license_duration_months?: number;
  max_programs?: number | null;
  tier?: string;
  is_active?: boolean;
}

export interface UpdatePartnershipMappingDTO {
  product_name?: string;
  partnership_type?: PartnershipType;
  license_duration_months?: number;
  max_programs?: number | null;
  tier?: string;
  is_active?: boolean;
}

export interface PartnershipActivationLog {
  id: string;
  user_id: string | null;
  partnership_type: string;
  license_id: string | null;
  action: string;
  triggered_by: string;
  woocommerce_order_id: number | null;
  woocommerce_product_id: number | null;
  previous_role: string | null;
  new_role: string | null;
  error_message: string | null;
  notes: string | null;
  created_at: string;
}
