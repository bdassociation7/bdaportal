/**
 * Admin Training Batch Service
 * Service for admin management of ECP training batches (US12-13)
 */

import { supabase } from '@/lib/supabase';
import type {
  AdminTrainingBatch,
  AdminTrainee,
  AdminBatchFilters,
  AdminTraineeFilters,
  AdminBatchStats,
  BatchReviewAction,
  BatchApprovalResult,
  BulkCreateAccountsDTO,
  BulkCreateAccountsResult,
} from './admin-training-batches.types';

interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

// Type-safe wrapper for Supabase queries to tables not yet in generated types
const getTable = (tableName: string) => {
  return (supabase as any).from(tableName);
};

export class AdminTrainingBatchService {
  // ==========================================================================
  // Batch Management
  // ==========================================================================

  /**
   * Get all training batches (admin view)
   */
  static async getAllBatches(filters: AdminBatchFilters = {}): Promise<ServiceResult<AdminTrainingBatch[]>> {
    try {
      let query = getTable('ecp_training_batches')
        .select(`
          *,
          partners!ecp_training_batches_partner_id_fkey(id, company_name, contact_email, contact_person),
          ecp_trainers!ecp_training_batches_trainer_id_fkey(id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.certification_type) {
        query = query.eq('certification_type', filters.certification_type);
      }
      if (filters.partner_id) {
        query = query.eq('partner_id', filters.partner_id);
      }
      if (filters.search) {
        query = query.or(`batch_name.ilike.%${filters.search}%,batch_code.ilike.%${filters.search}%`);
      }
      if (filters.date_from) {
        query = query.gte('training_start_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('training_start_date', filters.date_to);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map all batches first
      (data || []).forEach((batch: any) => {
        // Map partners object to partner for compatibility
        if (batch.partners) {
          batch.partner = {
            id: batch.partners.id,
            company_name: batch.partners.company_name,
            first_name: batch.partners.contact_person || '',
            last_name: '',
            email: batch.partners.contact_email,
          };
        }

        // Map ecp_trainers to trainer for compatibility
        if (batch.ecp_trainers) {
          batch.trainer = batch.ecp_trainers;
        }
      });

      // Get trainee counts for each batch
      const batchIds = (data || []).map((b: any) => b.id);
      if (batchIds.length > 0) {
        const { data: traineeCounts } = await getTable('ecp_trainees')
          .select('batch_id, certified')
          .in('batch_id', batchIds);

        const countMap: Record<string, { total: number; certified: number }> = {};
        ((traineeCounts || []) as any[]).forEach((t: any) => {
          if (!countMap[t.batch_id]) {
            countMap[t.batch_id] = { total: 0, certified: 0 };
          }
          countMap[t.batch_id].total++;
          if (t.certified) countMap[t.batch_id].certified++;
        });

        (data || []).forEach((batch: any) => {
          batch.trainee_count = countMap[batch.id]?.total || 0;
          batch.certified_count = countMap[batch.id]?.certified || 0;
        });
      }

      return { data: data as AdminTrainingBatch[], error: null };
    } catch (error) {
      console.error('Error fetching all batches:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get a single batch by ID (admin view)
   */
  static async getBatchById(id: string): Promise<ServiceResult<AdminTrainingBatch>> {
    try {
      const { data, error } = await getTable('ecp_training_batches')
        .select(`
          *,
          partners!ecp_training_batches_partner_id_fkey(id, company_name, contact_email, contact_person),
          ecp_trainers!ecp_training_batches_trainer_id_fkey(id, first_name, last_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get trainee count
      const { data: trainees } = await getTable('ecp_trainees')
        .select('id, certified')
        .eq('batch_id', id);

      const traineeCount = (trainees || []).length;
      const certifiedCount = ((trainees || []) as any[]).filter((t: any) => t.certified).length;

      // Map partners object to partner for compatibility
      if (data.partners) {
        data.partner = {
          id: data.partners.id,
          company_name: data.partners.company_name,
          first_name: data.partners.contact_person || '',
          last_name: '',
          email: data.partners.contact_email,
        };
      }

      // Map ecp_trainers to trainer for compatibility
      if (data.ecp_trainers) {
        data.trainer = data.ecp_trainers;
      }

      return {
        data: {
          ...data,
          trainee_count: traineeCount,
          certified_count: certifiedCount,
        } as AdminTrainingBatch,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching batch:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update batch status (admin action)
   */
  static async updateBatchStatus(id: string, status: string): Promise<ServiceResult<AdminTrainingBatch>> {
    try {
      const { data, error } = await getTable('ecp_training_batches')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as AdminTrainingBatch, error: null };
    } catch (error) {
      console.error('Error updating batch status:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Review a batch (approve/reject/request revision)
   */
  static async reviewBatch(action: BatchReviewAction): Promise<ServiceResult<BatchApprovalResult>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let newStatus: string;
      switch (action.action) {
        case 'approve':
          newStatus = 'scheduled';
          break;
        case 'reject':
          newStatus = 'cancelled';
          break;
        case 'request_revision':
          newStatus = 'draft';
          break;
        default:
          throw new Error('Invalid action');
      }

      // Update batch status
      const { error: updateError } = await getTable('ecp_training_batches')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', action.batch_id);

      if (updateError) throw updateError;

      let accountsCreated = 0;
      const errors: string[] = [];

      // Create trainee accounts if approved and requested
      if (action.action === 'approve' && action.create_trainee_accounts) {
        const result = await this.createTraineeAccounts({
          batch_id: action.batch_id,
          send_welcome_email: true,
          activate_membership: false,
          grant_curriculum_access: true,
        });

        if (result.data) {
          accountsCreated = result.data.success_count;
          errors.push(...result.data.errors.map(e => `${e.email}: ${e.error}`));
        }
      }

      return {
        data: {
          success: true,
          batch_id: action.batch_id,
          accounts_created: accountsCreated,
          errors: errors.length > 0 ? errors : undefined,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error reviewing batch:', error);
      return { data: null, error: error as Error };
    }
  }

  // ==========================================================================
  // Trainee Management
  // ==========================================================================

  /**
   * Get trainees for a batch (admin view)
   */
  static async getBatchTrainees(batchId: string): Promise<ServiceResult<AdminTrainee[]>> {
    try {
      const { data, error } = await getTable('ecp_trainees')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add computed fields
      const trainees = ((data || []) as any[]).map((t: any) => ({
        ...t,
        full_name: `${t.first_name} ${t.last_name}`,
        account_created: !!t.user_id,
      }));

      return { data: trainees as AdminTrainee[], error: null };
    } catch (error) {
      console.error('Error fetching batch trainees:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get all trainees (admin view)
   */
  static async getAllTrainees(filters: AdminTraineeFilters = {}): Promise<ServiceResult<AdminTrainee[]>> {
    try {
      let query = getTable('ecp_trainees')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.batch_id) {
        query = query.eq('batch_id', filters.batch_id);
      }
      if (filters.partner_id) {
        query = query.eq('partner_id', filters.partner_id);
      }
      if (filters.certification_type) {
        query = query.eq('certification_type', filters.certification_type);
      }
      if (filters.enrolment_status) {
        query = query.eq('enrolment_status', filters.enrolment_status);
      }
      if (filters.has_account !== undefined) {
        if (filters.has_account) {
          query = query.not('user_id', 'is', null);
        } else {
          query = query.is('user_id', null);
        }
      }
      if (filters.certified !== undefined) {
        query = query.eq('certified', filters.certified);
      }
      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Add computed fields
      const trainees = ((data || []) as any[]).map((t: any) => ({
        ...t,
        full_name: `${t.first_name} ${t.last_name}`,
        account_created: !!t.user_id,
      }));

      return { data: trainees as AdminTrainee[], error: null };
    } catch (error) {
      console.error('Error fetching all trainees:', error);
      return { data: null, error: error as Error };
    }
  }

  // ==========================================================================
  // Account Creation
  // ==========================================================================

  /**
   * Create user accounts for batch trainees (US13)
   */
  static async createTraineeAccounts(dto: BulkCreateAccountsDTO): Promise<ServiceResult<BulkCreateAccountsResult>> {
    try {
      // Get trainees for the batch
      let query = getTable('ecp_trainees')
        .select('*')
        .eq('batch_id', dto.batch_id)
        .is('user_id', null); // Only those without accounts

      if (dto.trainee_ids && dto.trainee_ids.length > 0) {
        query = query.in('id', dto.trainee_ids);
      }

      const { data: trainees, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (!trainees || trainees.length === 0) {
        return {
          data: {
            success_count: 0,
            error_count: 0,
            skipped_count: 0,
            created_accounts: [],
            errors: [],
          },
          error: null,
        };
      }

      const result: BulkCreateAccountsResult = {
        success_count: 0,
        error_count: 0,
        skipped_count: 0,
        created_accounts: [],
        errors: [],
      };

      for (const trainee of trainees) {
        try {
          // Call Edge Function to create user securely with individual role
          const { data: createResult, error: createError } = await supabase.functions.invoke('create-user', {
            body: {
              email: trainee.email,
              first_name: trainee.first_name,
              last_name: trainee.last_name,
              phone: trainee.phone,
              company_name: trainee.company_name,
              job_title: trainee.job_title,
              role: 'individual',
              trainee_id: trainee.id,
              source: 'ecp_training',
              metadata: { trainee_id: trainee.id },
            },
          });

          // Handle errors from Edge Function
          if (createError) {
            throw new Error(createError.message || 'Failed to create user');
          }

          // Handle user already exists
          if (createResult?.already_exists) {
            const existingUserId = createResult.existing_user_id;
            if (existingUserId) {
              // Link existing user to trainee
              await getTable('ecp_trainees')
                .update({ user_id: existingUserId })
                .eq('id', trainee.id);
            }
            result.skipped_count++;
            continue;
          }

          if (createResult?.error) {
            throw new Error(createResult.error);
          }

          const userId = createResult?.user_id;
          if (!userId) throw new Error('User ID not returned');

          // Update user profile
          await supabase
            .from('users')
            .update({
              first_name: trainee.first_name,
              last_name: trainee.last_name,
              phone: trainee.phone || null,
              company_name: trainee.company_name || null,
              job_title: trainee.job_title || null,
              profile_completed: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          // Link user to trainee record
          await getTable('ecp_trainees')
            .update({ user_id: userId })
            .eq('id', trainee.id);

          // Activate membership if requested
          if (dto.activate_membership && dto.membership_type) {
            await supabase.rpc('activate_membership', {
              p_user_id: userId,
              p_membership_type: dto.membership_type,
              p_duration_months: 12,
              p_order_id: null,
              p_wc_product_id: null,
              p_notes: 'Activated via ECP training batch',
            }).catch(err => console.error('Membership activation error:', err));
          }

          // Grant curriculum access if requested
          if (dto.grant_curriculum_access) {
            const certType = trainee.certification_type === 'CP' ? 'cp' : 'scp';
            await supabase
              .from('user_curriculum_access')
              .upsert({
                user_id: userId,
                certification_type: certType,
                granted_at: new Date().toISOString(),
                granted_by: null,
                source: 'ecp_training',
              })
              .catch(err => console.error('Curriculum access error:', err));
          }

          // TODO: Send welcome email with temporary password if requested
          if (dto.send_welcome_email) {
            console.log(`Welcome email would be sent to ${trainee.email}`);
          }

          result.success_count++;
          result.created_accounts.push({
            trainee_id: trainee.id,
            user_id: userId,
            email: trainee.email,
          });
        } catch (error: any) {
          result.error_count++;
          result.errors.push({
            trainee_id: trainee.id,
            email: trainee.email,
            error: error.message || 'Unknown error',
          });
        }
      }

      // Update batch timestamp when accounts are created
      if (result.success_count > 0) {
        await getTable('ecp_training_batches')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', dto.batch_id);
      }

      return { data: result, error: null };
    } catch (error) {
      console.error('Error creating trainee accounts:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Create account for a single trainee
   */
  static async createSingleTraineeAccount(
    traineeId: string,
    options: {
      send_welcome_email?: boolean;
      activate_membership?: boolean;
      membership_type?: 'basic' | 'professional';
      grant_curriculum_access?: boolean;
    } = {}
  ): Promise<ServiceResult<{ user_id: string; email: string }>> {
    try {
      const { data: trainee, error: fetchError } = await getTable('ecp_trainees')
        .select('*')
        .eq('id', traineeId)
        .single();

      if (fetchError) throw fetchError;
      if (trainee.user_id) {
        return { data: { user_id: trainee.user_id, email: trainee.email }, error: null };
      }

      // Call Edge Function to create user securely with individual role
      const { data: createResult, error: createError } = await supabase.functions.invoke('create-user', {
        body: {
          email: trainee.email,
          first_name: trainee.first_name,
          last_name: trainee.last_name,
          phone: trainee.phone,
          company_name: trainee.company_name,
          job_title: trainee.job_title,
          role: 'individual',
          trainee_id: trainee.id,
          source: 'ecp_training',
          metadata: { trainee_id: trainee.id },
        },
      });

      if (createError) throw new Error(createError.message || 'Failed to create user');
      if (createResult?.error) throw new Error(createResult.error);

      const userId = createResult?.user_id;
      if (!userId) throw new Error('User ID not returned');

      // Update profile
      await supabase
        .from('users')
        .update({
          first_name: trainee.first_name,
          last_name: trainee.last_name,
          phone: trainee.phone || null,
          company_name: trainee.company_name || null,
          job_title: trainee.job_title || null,
          profile_completed: false,
        })
        .eq('id', userId);

      // Link to trainee
      await getTable('ecp_trainees')
        .update({ user_id: userId })
        .eq('id', traineeId);

      // Activate membership if requested
      if (options.activate_membership && options.membership_type) {
        await supabase.rpc('activate_membership', {
          p_user_id: userId,
          p_membership_type: options.membership_type,
          p_duration_months: 12,
          p_order_id: null,
          p_wc_product_id: null,
          p_notes: 'Activated via ECP training',
        }).catch(err => console.error('Membership error:', err));
      }

      // Grant curriculum access
      if (options.grant_curriculum_access) {
        const certType = trainee.certification_type === 'CP' ? 'cp' : 'scp';
        await supabase
          .from('user_curriculum_access')
          .upsert({
            user_id: userId,
            certification_type: certType,
            granted_at: new Date().toISOString(),
            source: 'ecp_training',
          })
          .catch(err => console.error('Curriculum access error:', err));
      }

      return { data: { user_id: userId, email: trainee.email }, error: null };
    } catch (error) {
      console.error('Error creating trainee account:', error);
      return { data: null, error: error as Error };
    }
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get admin batch statistics
   */
  static async getStats(): Promise<ServiceResult<AdminBatchStats>> {
    try {
      // Get batch counts by status
      const { data: batches } = await getTable('ecp_training_batches')
        .select('id, status');

      const batchCounts = ((batches || []) as any[]).reduce((acc: Record<string, number>, b: any) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get trainee stats
      const { data: trainees } = await getTable('ecp_trainees')
        .select('id, user_id, certified, exam_passed');

      const traineeList = (trainees || []) as any[];
      const totalTrainees = traineeList.length;
      const accountsCreated = traineeList.filter((t: any) => t.user_id).length;
      const certifiedTrainees = traineeList.filter((t: any) => t.certified).length;
      const examsTaken = traineeList.filter((t: any) => t.exam_passed !== null).length;
      const examsPassed = traineeList.filter((t: any) => t.exam_passed === true).length;

      return {
        data: {
          total_batches: (batches || []).length,
          pending_review: batchCounts['draft'] || 0,
          approved: batchCounts['scheduled'] || 0,
          in_progress: batchCounts['in_progress'] || 0,
          completed: batchCounts['completed'] || 0,
          total_trainees: totalTrainees,
          accounts_created: accountsCreated,
          certified_trainees: certifiedTrainees,
          average_pass_rate: examsTaken > 0 ? Math.round((examsPassed / examsTaken) * 100) : undefined,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error fetching admin batch stats:', error);
      return { data: null, error: error as Error };
    }
  }

  // ==========================================================================
  // ECP Partners List (for filters)
  // ==========================================================================

  /**
   * Get list of ECP partners (for filter dropdowns)
   */
  static async getECPPartners(): Promise<ServiceResult<{ id: string; name: string; company?: string }[]>> {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('id, company_name, contact_person, contact_email')
        .eq('partner_type', 'ecp')
        .order('company_name');

      if (error) throw error;

      const partners = (data || []).map(p => ({
        id: p.id,
        name: p.contact_person || 'Unknown',
        company: p.company_name,
      }));

      return { data: partners, error: null };
    } catch (error) {
      console.error('Error fetching ECP partners:', error);
      return { data: null, error: error as Error };
    }
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private static generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
