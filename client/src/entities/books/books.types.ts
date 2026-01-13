/**
 * Books Entity - Types
 * Manages digital books purchased from WooCommerce and membership benefit books
 */

export interface UserBook {
  id: string;
  product_id: number;
  product_name: string;
  sku: string;
  cover_image?: string;
  download_url?: string;
  purchased_at: string;
  expires_at?: string;
  order_id: number;
  order_status?: string; // Optional for membership benefit books
  format?: 'pdf' | 'epub' | 'mobi';
  pages?: number;
  description?: string;
  access_type?: 'purchase' | 'membership_benefit' | 'admin_grant'; // How user got access
}

export interface BookFilters {
  search?: string;
  format?: 'pdf' | 'epub' | 'mobi';
  expired?: boolean;
}

export interface BookDownloadRequest {
  product_id: number;
  order_id: number;
}

export interface BookError {
  code: string;
  message: string;
  details?: any;
}

export interface BookResult<T> {
  data: T | null;
  error: BookError | null;
}

// Book Credits - New system for language selection
export interface BookCredit {
  id: string;
  user_id: string;
  source_type: string;  // 'membership', 'promotion', etc.
  source_id?: string;
  book_product_group: string;
  book_product_group_name: string;
  available_languages: string[];  // ['en', 'ar']
  is_redeemed: boolean;
  redeemed_language?: string;
  redeemed_product_id?: number;
  redeemed_at?: string;
  valid_from: string;
  valid_until?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BookOption {
  product_id: number;
  product_name: string;
  language: string;
  cover_image_url?: string;
  description?: string;
  pages?: number;
}

export interface RedeemCreditRequest {
  credit_id: string;
  language: string;
}

export interface RedeemCreditResponse {
  success: boolean;
  message?: string;
  error?: string;
  book?: {
    product_id: number;
    product_name: string;
    language: string;
    download_url?: string;
  };
}

// Admin Granted Books - New system for manual book access granting
export type GrantReason = 'complimentary' | 'partnership' | 'refund' | 'correction' | 'demo' | 'other';

export interface AdminGrantedBook {
  id: string;
  user_id: string;
  product_id: number;
  product_name: string;
  granted_at: string;
  access_from: string;
  access_until?: string;
  grant_reason: GrantReason;
  grant_notes?: string;
  granted_by: string;
  language?: string;
  format?: 'pdf' | 'epub' | 'mobi';
  category?: string;
  cover_image_url?: string;
  description?: string;
  pages?: number;
  download_url?: string;
  created_at: string;
  updated_at: string;
  revoked_at?: string;
  revoked_by?: string;
  revoke_reason?: string;
}

export interface GrantBookRequest {
  user_id: string;
  product_id: number;
  grant_reason: GrantReason;
  grant_notes?: string;
  access_until?: string;  // ISO date string or null for lifetime
}

export interface GrantBookResponse {
  success: boolean;
  grant_id?: string;
  message?: string;
  error?: string;
  user_id?: string;
  product_id?: number;
  product_name?: string;
}

export interface RevokeBookRequest {
  grant_id: string;
  revoke_reason?: string;
}

export interface RevokeBookResponse {
  success: boolean;
  grant_id?: string;
  message?: string;
  error?: string;
}
