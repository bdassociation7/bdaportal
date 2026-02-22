/**
 * Membership Benefit Books Entity - Types
 * Maps WooCommerce products to membership types for auto-granting access
 */

export type MembershipType = 'basic' | 'professional';
export type BookFormat = 'pdf' | 'epub' | 'mobi';
export type BookLanguage = 'en' | 'ar';

export interface MembershipBenefitBook {
  id: string;
  woocommerce_product_id: number;
  product_name: string;
  product_sku?: string;
  membership_type: MembershipType;
  book_product_group?: string;  // Groups language versions together (e.g., 'bda-bock')
  language?: BookLanguage;  // Language of this book version (en, ar)
  cover_image_url?: string;
  download_url?: string;
  format?: BookFormat;
  description?: string;
  pages?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateMembershipBenefitBookDTO {
  woocommerce_product_id: number;
  product_name: string;
  product_sku?: string;
  membership_type: MembershipType;
  book_product_group?: string;
  language?: BookLanguage;
  cover_image_url?: string;
  download_url?: string;
  format?: BookFormat;
  description?: string;
  pages?: number;
  is_active?: boolean;
}

export interface UpdateMembershipBenefitBookDTO {
  product_name?: string;
  product_sku?: string;
  membership_type?: MembershipType;
  book_product_group?: string;
  language?: BookLanguage;
  cover_image_url?: string;
  download_url?: string;
  format?: BookFormat;
  description?: string;
  pages?: number;
  is_active?: boolean;
}

export interface MembershipBenefitBookFilters {
  membership_type?: MembershipType;
  is_active?: boolean;
  search?: string;
}

export interface MembershipBenefitBookError {
  code: string;
  message: string;
  details?: any;
}

export interface MembershipBenefitBookResult<T> {
  data: T | null;
  error: MembershipBenefitBookError | null;
}

// Re-export WooCommerce types from woocommerce entity
export type { WooCommerceProduct } from '@/entities/woocommerce';
