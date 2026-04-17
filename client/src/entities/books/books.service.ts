import type { UserBook, BookFilters, BookResult, BookCredit, BookOption, RedeemCreditRequest, RedeemCreditResponse, AdminGrantedBook, GrantBookRequest, GrantBookResponse, RevokeBookRequest, RevokeBookResponse } from './books.types';
import { supabase } from '@/shared/config/supabase.config';

/**
 * Books Service
 * Fetches user's purchased books from WordPress/WooCommerce
 * Plus membership benefit books (e.g., BDA BoCK for Professional members)
 */

const WP_API_BASE_URL = import.meta.env.VITE_WP_API_BASE_URL || 'http://localhost:8080/wp-json';

// Cache for product covers to avoid repeated API calls
const coverImageCache: Map<number, string | null> = new Map();

export class BooksService {
  /**
   * Fetch cover image from WooCommerce for a product
   */
  private static async fetchCoverFromStore(productId: number): Promise<string | null> {
    // Check cache first
    if (coverImageCache.has(productId)) {
      return coverImageCache.get(productId) || null;
    }

    try {
      const response = await fetch(
        `${WP_API_BASE_URL}/bda-portal/v1/woocommerce/product-cover/${productId}`
      );

      if (!response.ok) {
        coverImageCache.set(productId, null);
        return null;
      }

      const result = await response.json();
      const coverImage = result.success ? result.cover_image : null;
      coverImageCache.set(productId, coverImage);
      return coverImage;
    } catch (error) {
      console.warn(`Failed to fetch cover for product ${productId}:`, error);
      coverImageCache.set(productId, null);
      return null;
    }
  }

  /**
   * Fetch cover images for multiple products from WooCommerce
   */
  private static async fetchCoversFromStore(productIds: number[]): Promise<Map<number, string>> {
    const covers = new Map<number, string>();

    // Filter out products we already have cached
    const uncachedIds = productIds.filter(id => !coverImageCache.has(id));

    if (uncachedIds.length === 0) {
      // Return from cache
      productIds.forEach(id => {
        const cached = coverImageCache.get(id);
        if (cached) covers.set(id, cached);
      });
      return covers;
    }

    try {
      const response = await fetch(
        `${WP_API_BASE_URL}/bda-portal/v1/woocommerce/product-covers?product_ids=${uncachedIds.join(',')}`
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          result.data.forEach((item: { product_id: number; cover_image: string | null }) => {
            coverImageCache.set(item.product_id, item.cover_image);
            if (item.cover_image) {
              covers.set(item.product_id, item.cover_image);
            }
          });
        }
      }
    } catch (error) {
      console.warn('Failed to fetch covers from store:', error);
    }

    // Return all covers (from cache and newly fetched)
    productIds.forEach(id => {
      const cached = coverImageCache.get(id);
      if (cached) covers.set(id, cached);
    });

    return covers;
  }

  /**
   * Get non-book product IDs (memberships, learning systems, partnerships)
   * These should be excluded from My Books display
   */
  private static async getNonBookProductIds(): Promise<number[]> {
    try {
      const [membershipData, learningData, partnershipData] = await Promise.all([
        supabase
          .from('membership_product_mapping')
          .select('woocommerce_product_id')
          .eq('is_active', true),
        supabase
          .from('learning_system_products')
          .select('woocommerce_product_id')
          .eq('is_active', true),
        supabase
          .from('partnership_product_mapping')
          .select('woocommerce_product_id')
          .eq('is_active', true),
      ]);

      const excludedIds: number[] = [];

      if (membershipData.data) {
        excludedIds.push(...membershipData.data.map(p => p.woocommerce_product_id));
      }
      if (learningData.data) {
        excludedIds.push(...learningData.data.map(p => p.woocommerce_product_id));
      }
      if (partnershipData.data) {
        excludedIds.push(...partnershipData.data.map(p => p.woocommerce_product_id));
      }

      return [...new Set(excludedIds)]; // Remove duplicates
    } catch (error) {
      console.error('Failed to fetch non-book product IDs:', error);
      return [];
    }
  }

  /**
   * Filter books to exclude non-book products (memberships, learning systems, etc.)
   * This is a client-side fallback in case the WordPress API doesn't filter
   */
  private static async filterNonBookProducts(books: UserBook[]): Promise<UserBook[]> {
    const excludedIds = await this.getNonBookProductIds();

    if (excludedIds.length === 0) {
      // If no excluded IDs, return all books
      return books;
    }

    // Filter out non-book products
    const filtered = books.filter(book => !excludedIds.includes(book.product_id));

    if (filtered.length < books.length) {
      console.log(`Filtered out ${books.length - filtered.length} non-book products from My Books`);
    }

    return filtered;
  }

  /**
   * Get user's purchased books + membership benefit books
   */
  static async getUserBooks(
    userEmail: string,
    filters?: BookFilters
  ): Promise<BookResult<UserBook[]>> {
    try {
      // Build query params
      const params = new URLSearchParams();
      params.append('customer_email', userEmail);
      params.append('status', 'completed'); // Only completed orders

      if (filters?.search) {
        params.append('search', filters.search);
      }

      const endpoint = `${WP_API_BASE_URL}/bda-portal/v1/woocommerce/user-books?${params}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Return empty array for 404 (endpoint not available yet)
        if (response.status === 404) {
          console.warn('WordPress endpoint not available. Please flush permalinks in WP Admin.');
          return { data: [], error: null };
        }
        return {
          data: null,
          error: {
            code: 'FETCH_ERROR',
            message: `Failed to fetch books: ${response.statusText}`,
          },
        };
      }

      const result = await response.json();

      if (!result.success) {
        return {
          data: null,
          error: {
            code: result.code || 'API_ERROR',
            message: result.message || 'Failed to fetch books',
          },
        };
      }

      // Start with purchased books
      let books = result.data || [];

      // CRITICAL: Filter out non-book products (memberships, learning systems, partnerships)
      // This ensures "BDA Professional Membership" doesn't appear in My Books
      books = await this.filterNonBookProducts(books);

      // Check for redeemed book credits (books user chose from their credits)
      try {
        const redeemedBooks = await this.getRedeemedBooks(userEmail);
        books = [...books, ...redeemedBooks];
      } catch (redeemedError) {
        console.warn('Failed to fetch redeemed books:', redeemedError);
        // Continue with purchased books only
      }
      // Check for admin-granted books (books granted by admins)
      try {
        const grantedBooks = await this.getAdminGrantedBooks(userEmail);
        books = [...books, ...grantedBooks];
      } catch (grantedError) {
        console.warn('Failed to fetch granted books:', grantedError);
        // Continue with existing books
      }

      // DEDUPLICATION: Remove duplicate books by product_id.
      // WooCommerce direct purchase takes priority (appears first in the array).
      const seenProductIds = new Set<number>();
      books = books.filter((book: UserBook) => {
        if (!book.product_id) return true;
        if (seenProductIds.has(book.product_id)) return false;
        seenProductIds.add(book.product_id);
        return true;
      });

      // Filter by format if specified
      if (filters?.format) {
        books = books.filter((book: UserBook) => book.format === filters.format);
      }

      // Filter expired if specified
      if (filters?.expired !== undefined) {
        const now = new Date();
        books = books.filter((book: UserBook) => {
          if (!book.expires_at) return !filters.expired; // No expiry = not expired
          const expiryDate = new Date(book.expires_at);
          const isExpired = expiryDate < now;
          return filters.expired ? isExpired : !isExpired;
        });
      }

      // Fetch missing cover images from WooCommerce store
      const booksWithoutCovers = books.filter((book: UserBook) => !book.cover_image && book.product_id);
      if (booksWithoutCovers.length > 0) {
        const productIds = booksWithoutCovers.map((book: UserBook) => book.product_id);
        const covers = await this.fetchCoversFromStore(productIds);

        // Update books with fetched covers
        books = books.map((book: UserBook) => {
          if (!book.cover_image && book.product_id && covers.has(book.product_id)) {
            return { ...book, cover_image: covers.get(book.product_id) };
          }
          return book;
        });
      }

      return { data: books, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while fetching books',
          details: err,
        },
      };
    }
  }

  /**
   * Get books that user has redeemed using book credits
   * These books appear in My Books section
   */
  private static async getRedeemedBooks(userEmail: string): Promise<UserBook[]> {
    // Get user ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (!user) return [];

    // Fetch redeemed books with their associated credit source_type
    const { data: redeemedBooks } = await supabase
      .from('user_redeemed_books')
      .select('*, user_book_credits!credit_id(source_type)')
      .eq('user_id', user.id);

    if (!redeemedBooks || redeemedBooks.length === 0) return [];

    // IMPORTANT: Only include books redeemed from MEMBERSHIP credits.
    // Books from 'woocommerce_order' source are direct purchases — they are
    // already fetched from WooCommerce and must NOT appear here again.
    // Only 'membership' source_type should produce a redeemed book entry here.
    const membershipBooks = redeemedBooks.filter((book) => {
      const sourceType = (book.user_book_credits as any)?.source_type;
      return sourceType === 'membership';
    });

    if (membershipBooks.length === 0) return [];

    // Transform to UserBook format
    return membershipBooks.map((book) => ({
      id: `redeemed-${book.id}`,
      product_id: book.product_id,
      order_id: 0,
      product_name: book.product_name,
      sku: '',
      format: book.format as 'pdf' | 'epub' | 'mobi' | undefined,
      cover_image: book.cover_image_url,
      description: book.description,
      pages: book.pages,
      purchased_at: book.access_from,
      expires_at: book.access_until,
      download_url: book.download_url,
      access_type: 'membership_benefit',
    }));
  }

  /**
   * Get books that have been granted to user by admins
   * These books appear in My Books section
   */
  private static async getAdminGrantedBooks(userEmail: string): Promise<UserBook[]> {
    // Get user ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (!user) return [];

    // Fetch granted books (non-revoked only)
    const { data: grantedBooks } = await supabase
      .from('admin_granted_books')
      .select('*')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    if (!grantedBooks || grantedBooks.length === 0) return [];

    // Filter by access period
    const now = new Date();
    const activeBooks = grantedBooks.filter((book) => {
      const accessFrom = new Date(book.access_from);
      const accessUntil = book.access_until ? new Date(book.access_until) : null;

      // Check if within access period
      if (accessFrom > now) return false; // Not started yet
      if (accessUntil && accessUntil < now) return false; // Expired
      return true;
    });

    // Transform to UserBook format
    return activeBooks.map((book) => ({
      id: `granted-${book.id}`,
      product_id: book.product_id,
      order_id: 0, // Not from an order
      product_name: book.product_name,
      sku: '', // Granted books don't have SKU
      format: book.format as 'pdf' | 'epub' | 'mobi' | undefined,
      cover_image: book.cover_image_url,
      description: book.description,
      pages: book.pages,
      purchased_at: book.granted_at,
      expires_at: book.access_until,
      download_url: book.download_url,
      access_type: 'admin_grant',
    }));
  }

  /**
   * Get user's available book credits
   */
  static async getUserBookCredits(userEmail: string): Promise<BookResult<BookCredit[]>> {
    try {
      // Get user ID
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (!user) {
        return { data: [], error: null };
      }

      // Fetch unredeemed credits
      const { data: credits, error } = await supabase
        .from('user_book_credits')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_redeemed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: credits as BookCredit[], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch book credits',
          details: err,
        },
      };
    }
  }

  /**
   * Get available book options for a credit
   * Returns all language versions available for the book product group
   */
  static async getBookOptions(bookProductGroup: string): Promise<BookResult<BookOption[]>> {
    try {
      const { data: books, error } = await supabase
        .from('membership_benefit_books')
        .select('woocommerce_product_id, product_name, language, cover_image_url, description, pages')
        .eq('book_product_group', bookProductGroup)
        .eq('is_active', true);

      if (error) throw error;

      const options: BookOption[] = (books || []).map((book: any) => ({
        product_id: book.woocommerce_product_id,
        product_name: book.product_name,
        language: book.language,
        cover_image_url: book.cover_image_url,
        description: book.description,
        pages: book.pages,
      }));

      return { data: options, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch book options',
          details: err,
        },
      };
    }
  }

  /**
   * Redeem a book credit by selecting a language
   */
  static async redeemBookCredit(
    request: RedeemCreditRequest
  ): Promise<BookResult<RedeemCreditResponse>> {
    try {
      const { data, error } = await supabase.rpc('redeem_book_credit', {
        p_credit_id: request.credit_id,
        p_language: request.language,
      });

      if (error) throw error;

      // RPC returns JSON, parse it
      const result = data as RedeemCreditResponse;

      if (!result.success) {
        return {
          data: null,
          error: {
            code: 'REDEMPTION_ERROR',
            message: result.error || 'Failed to redeem book credit',
          },
        };
      }

      return { data: result, error: null };
    } catch (err: any) {
      return {
        data: null,
        error: {
          code: 'REDEEM_ERROR',
          message: err.message || 'Failed to redeem book credit',
          details: err,
        },
      };
    }
  }

  /**
   * Get download URL for a book
   * Handles purchased books (via WooCommerce order), admin-granted books, and membership benefit books
   */
  static async getBookDownloadUrl(
    productId: number,
    orderId: number,
    userEmail?: string
  ): Promise<BookResult<string>> {
    try {
      // If productId is 0, this is a membership benefit book with direct download URL
      if (productId === 0) {
        // For membership benefit books, the download URL is stored directly
        // This would be handled by the caller passing the direct URL
        return {
          data: null,
          error: {
            code: 'DIRECT_DOWNLOAD',
            message: 'Membership benefit books use direct download URLs',
          },
        };
      }

      // If orderId is 0, this is an admin-granted book (no real order)
      // Fetch the product's downloadable file URL directly from WooCommerce
      if (orderId === 0) {
        if (!userEmail) {
          return {
            data: null,
            error: {
              code: 'MISSING_EMAIL',
              message: 'User email is required for admin-granted books',
            },
          };
        }

        const productEndpoint = `${WP_API_BASE_URL}/bda-portal/v1/woocommerce/product-download/${productId}?customer_email=${encodeURIComponent(userEmail)}`;

        const productResponse = await fetch(productEndpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!productResponse.ok) {
          return {
            data: null,
            error: {
              code: 'FETCH_ERROR',
              message: 'Failed to get product download URL from WooCommerce',
            },
          };
        }

        const productResult = await productResponse.json();

        if (!productResult.success || !productResult.data?.download_url) {
          return {
            data: null,
            error: {
              code: 'NO_DOWNLOAD_URL',
              message: 'Product has no downloadable files configured in WooCommerce',
            },
          };
        }

        return { data: productResult.data.download_url, error: null };
      }

      // Regular purchased book - use order-based download
      const endpoint = `${WP_API_BASE_URL}/bda-portal/v1/woocommerce/book-download`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          order_id: orderId,
        }),
      });

      if (!response.ok) {
        return {
          data: null,
          error: {
            code: 'FETCH_ERROR',
            message: 'Failed to get download URL',
          },
        };
      }

      const result = await response.json();

      if (!result.success || !result.data?.download_url) {
        return {
          data: null,
          error: {
            code: 'NO_DOWNLOAD_URL',
            message: 'Download URL not available',
          },
        };
      }

      return { data: result.data.download_url, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred',
          details: err,
        },
      };
    }
  }

  /**
   * Grant book access to a user (admin only)
   * Allows admins to manually grant books for complimentary access, partnerships, refunds, etc.
   */
  static async grantBookToUser(
    request: GrantBookRequest
  ): Promise<BookResult<GrantBookResponse>> {
    try {
      const { data, error } = await supabase.rpc('grant_book_access', {
        p_user_id: request.user_id,
        p_product_id: request.product_id,
        p_grant_reason: request.grant_reason,
        p_grant_notes: request.grant_notes || null,
        p_access_until: request.access_until || null,
      });

      if (error) throw error;

      // RPC returns JSON, parse it
      const result = data as GrantBookResponse;

      if (!result.success) {
        return {
          data: null,
          error: {
            code: 'GRANT_ERROR',
            message: result.error || 'Failed to grant book access',
          },
        };
      }

      return { data: result, error: null };
    } catch (err: any) {
      return {
        data: null,
        error: {
          code: 'GRANT_ERROR',
          message: err.message || 'Failed to grant book access',
          details: err,
        },
      };
    }
  }

  /**
   * Get all granted books for a user (admin view)
   * Returns both active and revoked grants for audit purposes
   */
  static async getUserGrantedBooks(userId: string): Promise<BookResult<AdminGrantedBook[]>> {
    try {
      const { data: grantedBooks, error } = await supabase
        .from('admin_granted_books')
        .select('*')
        .eq('user_id', userId)
        .order('granted_at', { ascending: false });

      if (error) throw error;

      return { data: (grantedBooks as AdminGrantedBook[]) || [], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch granted books',
          details: err,
        },
      };
    }
  }

  /**
   * Revoke a granted book (admin only)
   * Marks the grant as revoked without deleting for audit trail
   */
  static async revokeGrantedBook(
    request: RevokeBookRequest
  ): Promise<BookResult<RevokeBookResponse>> {
    try {
      const { data, error } = await supabase.rpc('revoke_book_access', {
        p_grant_id: request.grant_id,
        p_revoke_reason: request.revoke_reason || null,
      });

      if (error) throw error;

      // RPC returns JSON, parse it
      const result = data as RevokeBookResponse;

      if (!result.success) {
        return {
          data: null,
          error: {
            code: 'REVOKE_ERROR',
            message: result.error || 'Failed to revoke book access',
          },
        };
      }

      return { data: result, error: null };
    } catch (err: any) {
      return {
        data: null,
        error: {
          code: 'REVOKE_ERROR',
          message: err.message || 'Failed to revoke book access',
          details: err,
        },
      };
    }
  }
}
