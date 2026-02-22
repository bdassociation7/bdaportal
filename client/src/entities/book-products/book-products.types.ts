/**
 * Book Products Types
 * Defines which WooCommerce products are books (vs memberships, learning system, etc.)
 */

export type BookLanguage = 'en' | 'ar';
export type BookFormat = 'pdf' | 'epub' | 'mobi';
export type BookCategory = 'bock' | 'glossary' | 'study-guide' | 'handbook' | 'other';

export interface BookProduct {
  id: string;
  woocommerce_product_id: number;
  product_name: string;
  product_sku?: string;
  language?: BookLanguage;
  format?: BookFormat;
  category?: BookCategory;
  cover_image_url?: string;
  description?: string;
  pages?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateBookProductDTO {
  woocommerce_product_id: number;
  product_name: string;
  product_sku?: string;
  language?: BookLanguage;
  format?: BookFormat;
  category?: BookCategory;
  cover_image_url?: string;
  description?: string;
  pages?: number;
  is_active?: boolean;
}

export interface UpdateBookProductDTO {
  product_name?: string;
  product_sku?: string;
  language?: BookLanguage;
  format?: BookFormat;
  category?: BookCategory;
  cover_image_url?: string;
  description?: string;
  pages?: number;
  is_active?: boolean;
}

export interface BookProductsStats {
  total: number;
  active: number;
  by_language: {
    en: number;
    ar: number;
  };
  by_format: {
    pdf: number;
    epub: number;
    mobi: number;
  };
}
