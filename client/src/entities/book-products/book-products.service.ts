/**
 * Book Products Service
 * Manages WooCommerce products that are classified as books
 */

import { supabase } from '@/shared/config/supabase.config';
import type { BookProduct, CreateBookProductDTO, UpdateBookProductDTO, BookProductsStats } from './book-products.types';

export class BookProductsService {
  /**
   * Get all book products
   */
  static async getBookProducts(): Promise<BookProduct[]> {
    const { data, error } = await supabase
      .from('book_products')
      .select('*')
      .order('product_name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a single book product by ID
   */
  static async getBookProductById(id: string): Promise<BookProduct | null> {
    const { data, error } = await supabase
      .from('book_products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get book product by WooCommerce product ID
   */
  static async getBookProductByWooId(wooProductId: number): Promise<BookProduct | null> {
    const { data, error } = await supabase
      .from('book_products')
      .select('*')
      .eq('woocommerce_product_id', wooProductId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Create a new book product
   */
  static async createBookProduct(dto: CreateBookProductDTO): Promise<BookProduct> {
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('book_products')
      .insert({
        ...dto,
        created_by: user.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update a book product
   */
  static async updateBookProduct(id: string, dto: UpdateBookProductDTO): Promise<BookProduct> {
    const { data, error } = await supabase
      .from('book_products')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a book product
   */
  static async deleteBookProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('book_products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get book products statistics
   */
  static async getBookProductsStats(): Promise<BookProductsStats> {
    const products = await this.getBookProducts();

    const stats: BookProductsStats = {
      total: products.length,
      active: products.filter(p => p.is_active).length,
      by_language: {
        en: products.filter(p => p.language === 'en').length,
        ar: products.filter(p => p.language === 'ar').length,
      },
      by_format: {
        pdf: products.filter(p => p.format === 'pdf').length,
        epub: products.filter(p => p.format === 'epub').length,
        mobi: products.filter(p => p.format === 'mobi').length,
      },
    };

    return stats;
  }

  /**
   * Check if a WooCommerce product ID is a book
   */
  static async isBookProduct(wooProductId: number): Promise<boolean> {
    const product = await this.getBookProductByWooId(wooProductId);
    return product !== null && product.is_active;
  }

  /**
   * Get all WooCommerce product IDs that are books
   */
  static async getBookProductIds(): Promise<number[]> {
    const { data, error } = await supabase
      .from('book_products')
      .select('woocommerce_product_id')
      .eq('is_active', true);

    if (error) throw error;
    return (data || []).map(p => p.woocommerce_product_id);
  }
}
