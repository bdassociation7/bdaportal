import { supabase } from '@/shared/config/supabase.config';
import { queueVoucherCreatedEmail } from '@/entities/email';
import type {
  CertificationProduct,
  CertificationProductWithQuiz,
  ExamVoucher,
  ExamVoucherWithUser,
  ExamVoucherWithQuiz,
  ExamVoucherComplete,
  CreateCertificationProductDTO,
  UpdateCertificationProductDTO,
  CreateExamVoucherDTO,
  UpdateExamVoucherDTO,
  UseVoucherDTO,
  CertificationProductFilters,
  ExamVoucherFilters,
  QueryOptions,
  QuizError,
  QuizResult,
} from './quiz.types';

/**
 * Service for Voucher operations - Handles certification products and exam vouchers
 */
export class VoucherService {
  // ==========================================================================
  // PUBLIC VOUCHER OPERATIONS (User-facing)
  // ==========================================================================

  /**
   * Get user's vouchers
   */
  static async getUserVouchers(
    filters?: ExamVoucherFilters
  ): Promise<QuizResult<ExamVoucherWithQuiz[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated',
          },
        };
      }

      let query = supabase
        .from('exam_vouchers')
        .select(`
          *,
          quiz:quizzes(*)
        `)
        .eq('user_id', user.id);

      // Apply filters
      if (filters?.certification_type) {
        query = query.eq('certification_type', filters.certification_type);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.quiz_id) {
        query = query.eq('quiz_id', filters.quiz_id);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to fetch user vouchers',
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
          message: 'An unexpected error occurred while fetching vouchers',
          details: err,
        },
      };
    }
  }

  /**
   * Get ECP vouchers assigned to the current user (via assigned_to_email)
   * These are vouchers that ECP partners have assigned to the individual
   */
  static async getECPAssignedVouchers(): Promise<QuizResult<any[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated',
          },
        };
      }

      // Get user's email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.email) {
        return {
          data: [],
          error: null,
        };
      }

      // Fetch ECP vouchers assigned to this user's email
      // RLS policy should now allow this after the migration
      const { data, error } = await supabase
        .from('ecp_vouchers')
        .select(`
          id,
          voucher_code,
          certification_type,
          status,
          valid_until,
          assigned_at,
          assigned_to_name,
          assigned_to_email
        `)
        .ilike('assigned_to_email', userData.email)
        .in('status', ['assigned', 'available'])
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Error fetching ECP assigned vouchers:', error);
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to fetch ECP assigned vouchers',
            details: error,
          },
        };
      }

      // Transform to match expected voucher format
      // Note: ecp_vouchers table doesn't have exam_language column, default to 'en'
      const transformedVouchers = (data || []).map((v) => ({
        id: v.id,
        code: v.voucher_code,
        certification_type: v.certification_type,
        exam_language: 'en', // Default - ecp_vouchers doesn't track language
        status: v.status === 'assigned' ? 'available' : v.status, // Treat 'assigned' as 'available' for individuals
        expires_at: v.valid_until,
        source: 'ecp' as const, // Mark as ECP voucher
        assigned_at: v.assigned_at,
      }));

      return { data: transformedVouchers, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while fetching ECP vouchers',
          details: err,
        },
      };
    }
  }

  /**
   * Check if user has valid voucher for a quiz
   */
  static async checkVoucherForQuiz(quizId: string): Promise<QuizResult<ExamVoucher | null>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated',
          },
        };
      }

      // First get the quiz to know its certification_type
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('certification_type')
        .eq('id', quizId)
        .single();

      if (quizError || !quiz) {
        return {
          data: null,
          error: {
            code: 'QUIZ_NOT_FOUND',
            message: 'Quiz not found',
            details: quizError,
          },
        };
      }

      // Find voucher that matches:
      // 1. User ID
      // 2. Certification type matches quiz
      // 3. Either specific quiz_id OR quiz_id is NULL (wildcard)
      // 4. Status is available
      // 5. Not expired
      const { data, error } = await supabase
        .from('exam_vouchers')
        .select('*')
        .eq('user_id', user.id)
        .eq('certification_type', quiz.certification_type)
        .or(`quiz_id.eq.${quizId},quiz_id.is.null`)
        .eq('status', 'available')
        .gte('expires_at', new Date().toISOString())
        .order('quiz_id', { ascending: false, nullsLast: true }) // Prefer specific quiz vouchers
        .limit(1)
        .maybeSingle();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to check voucher',
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
          message: 'An unexpected error occurred while checking voucher',
          details: err,
        },
      };
    }
  }

  /**
   * Validate and use a voucher for a quiz attempt
   */
  static async useVoucher(dto: UseVoucherDTO): Promise<QuizResult<ExamVoucher>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated',
          },
        };
      }

      // First get the quiz to know its certification_type
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('certification_type')
        .eq('id', dto.quiz_id)
        .single();

      if (quizError || !quiz) {
        return {
          data: null,
          error: {
            code: 'QUIZ_NOT_FOUND',
            message: 'Quiz not found',
            details: quizError,
          },
        };
      }

      // Verify voucher matches:
      // 1. Voucher code
      // 2. User ID
      // 3. Certification type matches quiz
      // 4. Either specific quiz_id OR quiz_id is NULL (wildcard)
      // 5. Status is unused
      // 6. Not expired
      const { data: voucher, error: voucherError } = await supabase
        .from('exam_vouchers')
        .select('*')
        .eq('code', dto.voucher_code)
        .eq('user_id', user.id)
        .eq('certification_type', quiz.certification_type)
        .or(`quiz_id.eq.${dto.quiz_id},quiz_id.is.null`)
        .eq('status', 'available')
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();

      if (voucherError || !voucher) {
        return {
          data: null,
          error: {
            code: 'INVALID_VOUCHER',
            message: 'Invalid, expired, or already used voucher',
            details: voucherError,
          },
        };
      }

      // Validate attempt_id is provided (required by database constraint)
      if (!dto.attempt_id) {
        return {
          data: null,
          error: {
            code: 'MISSING_ATTEMPT_ID',
            message: 'Attempt ID is required to mark voucher as used',
          },
        };
      }

      // Mark voucher as used
      const { data, error } = await supabase
        .from('exam_vouchers')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
          attempt_id: dto.attempt_id,
        })
        .eq('id', voucher.id)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to mark voucher as used',
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
          message: 'An unexpected error occurred while using voucher',
          details: err,
        },
      };
    }
  }

  // ==========================================================================
  // ADMIN OPERATIONS - CERTIFICATION PRODUCTS
  // ==========================================================================

  /**
   * Get all certification products (admin only)
   */
  static async getAllCertificationProducts(
    filters?: CertificationProductFilters,
    options?: QueryOptions
  ): Promise<QuizResult<CertificationProductWithQuiz[]>> {
    try {
      let query = supabase
        .from('certification_products')
        .select(`
          *,
          quiz:quizzes(*)
        `);

      // Apply filters
      if (filters?.certification_type) {
        query = query.eq('certification_type', filters.certification_type);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        query = query.or(
          `woocommerce_product_name.ilike.%${filters.search}%,woocommerce_product_sku.ilike.%${filters.search}%`
        );
      }

      // Apply sorting
      const sortBy = options?.sort_by || 'created_at';
      const sortOrder = options?.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      if (options?.page && options?.limit) {
        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to fetch certification products',
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
          message: 'An unexpected error occurred while fetching certification products',
          details: err,
        },
      };
    }
  }

  /**
   * Get a single certification product by ID (admin only)
   */
  static async getCertificationProductById(
    id: string
  ): Promise<QuizResult<CertificationProductWithQuiz>> {
    try {
      const { data, error } = await supabase
        .from('certification_products')
        .select(`
          *,
          quiz:quizzes(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Certification product not found',
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
          message: 'An unexpected error occurred while fetching certification product',
          details: err,
        },
      };
    }
  }

  /**
   * Create a new certification product (admin only)
   */
  static async createCertificationProduct(
    dto: CreateCertificationProductDTO
  ): Promise<QuizResult<CertificationProduct>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated',
          },
        };
      }

      const { data, error } = await supabase
        .from('certification_products')
        .insert({
          ...dto,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to create certification product',
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
          message: 'An unexpected error occurred while creating certification product',
          details: err,
        },
      };
    }
  }

  /**
   * Update a certification product (admin only)
   */
  static async updateCertificationProduct(
    id: string,
    dto: UpdateCertificationProductDTO
  ): Promise<QuizResult<CertificationProduct>> {
    try {
      const { data, error } = await supabase
        .from('certification_products')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to update certification product',
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
          message: 'An unexpected error occurred while updating certification product',
          details: err,
        },
      };
    }
  }

  /**
   * Delete a certification product (admin only)
   */
  static async deleteCertificationProduct(id: string): Promise<QuizResult<void>> {
    try {
      const { error } = await supabase
        .from('certification_products')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to delete certification product',
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
          message: 'An unexpected error occurred while deleting certification product',
          details: err,
        },
      };
    }
  }

  /**
   * Toggle certification product active status (admin only)
   */
  static async toggleCertificationProductActive(
    id: string,
    isActive: boolean
  ): Promise<QuizResult<CertificationProduct>> {
    try {
      const { data, error } = await supabase
        .from('certification_products')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to toggle certification product status',
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
          message: 'An unexpected error occurred while toggling certification product status',
          details: err,
        },
      };
    }
  }

  // ==========================================================================
  // ADMIN OPERATIONS - EXAM VOUCHERS
  // ==========================================================================

  /**
   * Get all exam vouchers (admin only)
   */
  static async getAllVouchers(
    filters?: ExamVoucherFilters,
    options?: QueryOptions
  ): Promise<QuizResult<ExamVoucherComplete[]>> {
    try {
      let query = supabase
        .from('exam_vouchers')
        .select(`
          *,
          user:users!user_id(
            id,
            email,
            first_name,
            last_name
          ),
          quiz:quizzes(*),
          certification_product:certification_products(*),
          attempt:quiz_attempts(*)
        `);

      // Apply filters
      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters?.certification_type) {
        query = query.eq('certification_type', filters.certification_type);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.quiz_id) {
        query = query.eq('quiz_id', filters.quiz_id);
      }

      if (filters?.search) {
        query = query.or(`code.ilike.%${filters.search}%,admin_notes.ilike.%${filters.search}%`);
      }

      // Apply sorting
      const sortBy = options?.sort_by || 'created_at';
      const sortOrder = options?.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      if (options?.page && options?.limit) {
        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to fetch vouchers',
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
          message: 'An unexpected error occurred while fetching vouchers',
          details: err,
        },
      };
    }
  }

  /**
   * Get a single voucher by ID (admin only)
   */
  static async getVoucherById(id: string): Promise<QuizResult<ExamVoucherComplete>> {
    try {
      const { data, error } = await supabase
        .from('exam_vouchers')
        .select(`
          *,
          user:users!user_id(
            id,
            email,
            first_name,
            last_name
          ),
          quiz:quizzes(*),
          certification_product:certification_products(*),
          attempt:quiz_attempts(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Voucher not found',
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
          message: 'An unexpected error occurred while fetching voucher',
          details: err,
        },
      };
    }
  }

  /**
   * Create a new exam voucher (admin only)
   * Uses the database function to generate unique code
   */
  static async createVoucher(dto: CreateExamVoucherDTO): Promise<QuizResult<ExamVoucher>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated',
          },
        };
      }

      // Generate voucher code using database function
      const { data: codeData, error: codeError } = await supabase.rpc(
        'generate_voucher_code',
        { cert_type: dto.certification_type, lang: dto.exam_language || 'en' }
      );

      if (codeError || !codeData) {
        return {
          data: null,
          error: {
            code: codeError?.code || 'CODE_GENERATION_FAILED',
            message: 'Failed to generate voucher code',
            details: codeError,
          },
        };
      }

      // Create voucher
      const { data, error } = await supabase
        .from('exam_vouchers')
        .insert({
          code: codeData,
          user_id: dto.user_id,
          certification_type: dto.certification_type,
          exam_language: dto.exam_language || 'en',
          quiz_id: dto.quiz_id,
          expires_at: dto.expires_at,
          woocommerce_order_id: dto.woocommerce_order_id,
          certification_product_id: dto.certification_product_id,
          admin_notes: dto.admin_notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to create voucher',
            details: error,
          },
        };
      }

      // Queue voucher notification email to the user
      try {
        // Get user and quiz details for email
        const { data: userData } = await supabase
          .from('users')
          .select('email, first_name, last_name')
          .eq('id', dto.user_id)
          .single();

        if (userData?.email) {
          const examType = dto.certification_type === 'CP'
            ? 'BDA-CP Certification Exam'
            : 'BDA-SCP Certification Exam';

          await queueVoucherCreatedEmail(userData.email, {
            partnerName: userData.first_name || 'User',
            voucherCode: codeData,
            examType,
            validUntil: new Date(dto.expires_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            bookingUrl: 'https://portal.bda-global.org/individual/exams',
            partnerDashboardUrl: 'https://portal.bda-global.org/individual/dashboard',
          });
          console.log('Voucher created email queued for:', userData.email);
        }
      } catch (emailError) {
        console.error('Failed to queue voucher email:', emailError);
        // Don't fail voucher creation if email fails
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while creating voucher',
          details: err,
        },
      };
    }
  }

  /**
   * Create multiple vouchers in bulk (admin only)
   * Supports comma or newline separated email list
   */
  static async createVouchersBulk(params: {
    emails: string;
    certification_type: string;
    exam_language: string;
    quiz_id?: string | null;
    expires_at: string;
    admin_notes?: string | null;
    certification_product_id?: string | null;
  }): Promise<QuizResult<{ created: number; failed: { email: string; error: string }[] }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated',
          },
        };
      }

      // Parse emails (comma or newline separated) and normalize to lowercase
      const emailList = params.emails
        .split(/[,\n]/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e && e.includes('@'));

      if (emailList.length === 0) {
        return {
          data: null,
          error: {
            code: 'INVALID_INPUT',
            message: 'Please enter at least one valid email address',
          },
        };
      }

      // Create vouchers for each email
      const results: { created: number; failed: { email: string; error: string }[] } = {
        created: 0,
        failed: [],
      };

      // Ensure expires_at is a valid ISO string
      let expiresAtISO: string;
      try {
        // Handle datetime-local input format (YYYY-MM-DDTHH:mm)
        const expiresDate = new Date(params.expires_at);
        if (isNaN(expiresDate.getTime())) {
          throw new Error('Invalid date');
        }
        expiresAtISO = expiresDate.toISOString();
      } catch {
        return {
          data: null,
          error: {
            code: 'INVALID_DATE',
            message: 'Invalid expiration date format',
          },
        };
      }

      // Process each email individually to provide detailed feedback
      for (const email of emailList) {
        // Find user by email (case-insensitive using ilike)
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('id, email')
          .ilike('email', email)
          .limit(1);

        if (userError) {
          results.failed.push({
            email,
            error: 'Database error while looking up user',
          });
          continue;
        }

        if (!users || users.length === 0) {
          results.failed.push({
            email,
            error: 'User not found - must create account first',
          });
          continue;
        }

        const usr = users[0];

        // Generate voucher code
        const { data: codeData, error: codeError } = await supabase.rpc(
          'generate_voucher_code',
          { cert_type: params.certification_type, lang: params.exam_language || 'en' }
        );

        if (codeError || !codeData) {
          results.failed.push({
            email: usr.email,
            error: 'Failed to generate voucher code',
          });
          continue;
        }

        // Create voucher
        const { error: createError } = await supabase
          .from('exam_vouchers')
          .insert({
            code: codeData,
            user_id: usr.id,
            certification_type: params.certification_type as any,
            exam_language: params.exam_language || 'en',
            quiz_id: params.quiz_id,
            expires_at: expiresAtISO,
            certification_product_id: params.certification_product_id,
            admin_notes: params.admin_notes,
            created_by: user.id,
          });

        if (createError) {
          results.failed.push({
            email: usr.email,
            error: createError.message || 'Failed to create voucher',
          });
        } else {
          results.created++;
        }
      }

      return { data: results, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while creating bulk vouchers',
          details: err,
        },
      };
    }
  }

  /**
   * Update a voucher (admin only)
   */
  static async updateVoucher(
    id: string,
    dto: UpdateExamVoucherDTO
  ): Promise<QuizResult<ExamVoucher>> {
    try {
      // Validate: If setting status to 'used', ensure used_at and attempt_id are provided
      if (dto.status === 'used') {
        if (!dto.used_at || !dto.attempt_id) {
          return {
            data: null,
            error: {
              code: 'INVALID_UPDATE',
              message: 'When marking voucher as used, both used_at and attempt_id are required',
            },
          };
        }
      }

      const { data, error } = await supabase
        .from('exam_vouchers')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to update voucher',
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
          message: 'An unexpected error occurred while updating voucher',
          details: err,
        },
      };
    }
  }

  /**
   * Revoke a voucher (admin only)
   */
  static async revokeVoucher(id: string): Promise<QuizResult<ExamVoucher>> {
    try {
      const { data, error } = await supabase
        .from('exam_vouchers')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to revoke voucher',
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
          message: 'An unexpected error occurred while revoking voucher',
          details: err,
        },
      };
    }
  }

  /**
   * Delete a voucher (admin only)
   */
  static async deleteVoucher(id: string): Promise<QuizResult<void>> {
    try {
      const { error } = await supabase
        .from('exam_vouchers')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to delete voucher',
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
          message: 'An unexpected error occurred while deleting voucher',
          details: err,
        },
      };
    }
  }

  /**
   * Batch update expired vouchers (admin only)
   * Marks all available vouchers past their expiration date as 'expired'
   */
  static async batchExpireVouchers(): Promise<QuizResult<{ updated_count: number }>> {
    try {
      // Find all available vouchers that are past expiration
      const { data: expiredVouchers, error: findError } = await supabase
        .from('exam_vouchers')
        .select('id')
        .eq('status', 'available')
        .lt('expires_at', new Date().toISOString());

      if (findError) {
        return {
          data: null,
          error: {
            code: findError.code,
            message: 'Failed to find expired vouchers',
            details: findError,
          },
        };
      }

      if (!expiredVouchers || expiredVouchers.length === 0) {
        return {
          data: { updated_count: 0 },
          error: null,
        };
      }

      // Batch update all expired vouchers
      const voucherIds = expiredVouchers.map((v) => v.id);

      const { error: updateError } = await supabase
        .from('exam_vouchers')
        .update({ status: 'expired' })
        .in('id', voucherIds);

      if (updateError) {
        return {
          data: null,
          error: {
            code: updateError.code,
            message: 'Failed to update expired vouchers',
            details: updateError,
          },
        };
      }

      return {
        data: { updated_count: voucherIds.length },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while expiring vouchers',
          details: err,
        },
      };
    }
  }

  /**
   * Get voucher statistics (admin only)
   */
  static async getVoucherStats(): Promise<
    QuizResult<{
      total: number;
      available: number;
      assigned: number;
      used: number;
      expired: number;
      cancelled: number;
    }>
  > {
    try {
      const { data, error } = await supabase
        .from('exam_vouchers')
        .select('status');

      if (error) {
        return {
          data: null,
          error: {
            code: error.code,
            message: 'Failed to fetch voucher statistics',
            details: error,
          },
        };
      }

      // Type assertion for status field
      type StatusRow = { status: 'available' | 'assigned' | 'used' | 'expired' | 'cancelled' };
      const vouchers = (data || []) as StatusRow[];

      const stats = {
        total: vouchers.length,
        available: vouchers.filter((v) => v.status === 'available').length,
        assigned: vouchers.filter((v) => v.status === 'assigned').length,
        used: vouchers.filter((v) => v.status === 'used').length,
        expired: vouchers.filter((v) => v.status === 'expired').length,
        cancelled: vouchers.filter((v) => v.status === 'cancelled').length,
      };

      return { data: stats, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while fetching statistics',
          details: err,
        },
      };
    }
  }
}
