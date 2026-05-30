/**
 * Bulk Upload Service
 * Service for bulk user upload via Excel/CSV (US6)
 */

import { supabase } from '@/lib/supabase';
import { createAdminClient, isAdminAvailable } from '@/shared/config/supabase-admin.config';
import type {
  BulkUserRow,
  ValidatedRow,
  BulkValidationResult,
  BulkUploadResult,
  UploadProgress,
  BulkUploadJob,
  BulkUploadItem,
} from './bulk-upload.types';
import { VALID_COUNTRY_CODES } from './bulk-upload.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Email validation regex - RFC 5322 compliant (simplified)
// Accepts: letters, numbers, dots, underscores, percent, plus, hyphens
// Domain: letters, numbers, dots, hyphens
// TLD: 2+ letters
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}$/;

export class BulkUploadService {
  /**
   * Parse CSV content to rows
   */
  static parseCSV(content: string): BulkUserRow[] {
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return []; // Need header + at least 1 row

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const rows: BulkUserRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const row: Partial<BulkUserRow> = {};
      header.forEach((key, idx) => {
        const value = values[idx]?.trim() || '';
        switch (key) {
          case 'full_name':
          case 'name':
            row.full_name = value;
            break;
          case 'email':
            // Trim, normalize whitespace, remove BOM, convert to lowercase
            row.email = value.trim().replace(/\s+/g, '').replace(/^\uFEFF/, '').toLowerCase();
            break;
          case 'phone':
            row.phone = value;
            break;
          case 'country':
          case 'country_code':
            row.country = value.toUpperCase();
            break;
          case 'certification_track':
          case 'track':
          case 'certification':
            if (value) {
              const normalized = value.toUpperCase().replace(/[^A-Z-]/g, '');
              if (normalized.includes('SCP')) {
                row.certification_track = 'BDA-SCP';
              } else if (normalized.includes('CP')) {
                row.certification_track = 'BDA-CP';
              }
            }
            break;
          case 'language':
          case 'lang':
            row.language = value.toUpperCase() === 'AR' ? 'AR' : 'EN';
            break;
        }
      });

      // Set defaults
      if (!row.language) row.language = 'EN';

      if (row.full_name && row.email) {
        rows.push(row as BulkUserRow);
      }
    }

    return rows;
  }

  /**
   * Parse a CSV line handling quoted values
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  /**
   * Validate parsed rows
   */
  static async validateRows(rows: BulkUserRow[]): Promise<BulkValidationResult> {
    const validatedRows: ValidatedRow[] = [];
    const emailsSeen = new Set<string>();

    // Get existing emails
    const emails = rows.map((r) => r.email.toLowerCase());
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email')
      .in('email', emails);

    const existingEmails = new Set(existingUsers?.map((u) => u.email.toLowerCase()) || []);

    let validCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    let existingCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const errors: string[] = [];
      let status: ValidatedRow['status'] = 'valid';

      // Validate full_name
      if (!row.full_name || row.full_name.trim().length < 2) {
        errors.push('Full name is required (min 2 characters)');
      }

      // Validate email
      if (!row.email) {
        errors.push('Email is required');
      } else if (!EMAIL_REGEX.test(row.email)) {
        errors.push(`Invalid email format: "${row.email}" (check for spaces, special characters, or encoding issues)`);
      } else if (existingEmails.has(row.email.toLowerCase())) {
        status = 'existing';
        existingCount++;
      } else if (emailsSeen.has(row.email.toLowerCase())) {
        status = 'duplicate';
        duplicateCount++;
      }

      // Validate country
      if (!row.country) {
        errors.push('Country code is required');
      } else if (row.country.length !== 2) {
        errors.push('Country code must be 2 letters (e.g., EG, AE, US)');
      } else if (!VALID_COUNTRY_CODES.includes(row.country)) {
        errors.push(`Invalid country code: ${row.country}`);
      }

      // Validate language
      if (!row.language || !['EN', 'AR'].includes(row.language)) {
        errors.push('Language must be EN or AR');
      }

      // Validate certification track if provided
      if (row.certification_track && !['BDA-CP', 'BDA-SCP'].includes(row.certification_track)) {
        errors.push('Certification track must be BDA-CP or BDA-SCP');
      }

      // Set final status
      if (errors.length > 0) {
        status = 'error';
        errorCount++;
      } else if (status === 'valid') {
        validCount++;
        emailsSeen.add(row.email.toLowerCase());
      }

      validatedRows.push({
        row_number: i + 2, // +2 for 1-indexed and header row
        data: row,
        status,
        errors,
      });
    }

    return {
      total_rows: rows.length,
      valid_count: validCount,
      error_count: errorCount,
      duplicate_count: duplicateCount,
      existing_count: existingCount,
      rows: validatedRows,
    };
  }

  /**
   * Create users from validated rows
   * Uses Edge Function in production, admin client in development
   */
  static async createUsers(
    validatedRows: ValidatedRow[],
    sendWelcomeEmail: boolean = true,
    activateContent: boolean = false,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<BulkUploadResult> {
    const validRows = validatedRows.filter((r) => r.status === 'valid');

    // In production, use Edge Function
    if (!isAdminAvailable()) {
      return this.createUsersViaEdgeFunction(validRows, sendWelcomeEmail, activateContent, onProgress);
    }

    // In development, use admin client directly
    return this.createUsersViaAdminClient(validRows, sendWelcomeEmail, activateContent, onProgress);
  }

  /**
   * Create users via Edge Function (production)
   */
  private static async createUsersViaEdgeFunction(
    validRows: ValidatedRow[],
    sendWelcomeEmail: boolean,
    activateContent: boolean,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<BulkUploadResult> {
    if (onProgress) {
      onProgress({
        stage: 'uploading',
        current: 0,
        total: validRows.length,
        message: `Creating ${validRows.length} users via secure server...`,
      });
    }

    // Prepare user data for the Edge Function
    const users = validRows.map((row) => ({
      email: row.data.email,
      full_name: row.data.full_name,
      phone: row.data.phone,
      country: row.data.country,
      language: row.data.language,
      certification_track: row.data.certification_track,
    }));

    // Get session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to create users');
    }

    // Call Edge Function
    console.log('Calling bulk-create-users Edge Function with', users.length, 'users');

    const { data, error } = await supabase.functions.invoke('bulk-create-users', {
      body: {
        users,
        send_welcome_email: sendWelcomeEmail,
        activate_content: activateContent,
      },
    });

    console.log('Edge Function response:', { data, error });

    if (error) {
      console.error('Edge Function error:', error);
      // Check if it's a FunctionsHttpError with more details
      const errorMessage = error.message || 'Failed to create users';
      throw new Error(errorMessage);
    }

    // Check if data contains an error
    if (data?.error) {
      throw new Error(data.error);
    }

    if (onProgress) {
      onProgress({
        stage: 'complete',
        current: validRows.length,
        total: validRows.length,
        message: `Completed: ${data.success_count} created, ${data.error_count} errors`,
      });
    }

    // Map errors to include row numbers
    const errorsWithRows = (data.errors || []).map((err: any, idx: number) => ({
      row_number: validRows.find(r => r.data.email === err.email)?.row_number || idx + 2,
      email: err.email,
      error: err.error,
    }));

    return {
      success_count: data.success_count || 0,
      error_count: data.error_count || 0,
      skipped_count: data.skipped_count || 0,
      created_users: data.created_users || [],
      errors: errorsWithRows,
    };
  }

  /**
   * Create users via Admin Client (development)
   */
  private static async createUsersViaAdminClient(
    validRows: ValidatedRow[],
    sendWelcomeEmail: boolean,
    activateContent: boolean,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<BulkUploadResult> {
    const adminClient = createAdminClient();
    const createdUsers: BulkUploadResult['created_users'] = [];
    const errors: BulkUploadResult['errors'] = [];
    let skippedCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];

      if (onProgress) {
        onProgress({
          stage: 'uploading',
          current: i + 1,
          total: validRows.length,
          message: `Creating user ${i + 1} of ${validRows.length}: ${row.data.email}`,
        });
      }

      try {
        // Split full name into first and last
        const nameParts = row.data.full_name.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        // Generate a random password for the new user
        const tempPassword = this.generateTempPassword();

        // Create user in Supabase Auth using admin client
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: row.data.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            source: 'bulk_upload',
          },
        });

        if (authError) {
          // If auth user creation fails, check if user already exists
          if (authError.message.includes('already registered')) {
            skippedCount++;
            continue;
          }
          throw authError;
        }

        const userId = authData.user?.id;
        if (!userId) throw new Error('User ID not returned');

        // Update user profile in public.users table
        const { error: profileError } = await supabase
          .from('users')
          .update({
            first_name: firstName,
            last_name: lastName,
            phone: row.data.phone || null,
            country_code: row.data.country,
            preferred_language: row.data.language.toLowerCase(),
            profile_completed: false, // User should complete profile on first login
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }

        // Grant curriculum access if certification track specified
        if (activateContent && row.data.certification_track) {
          try {
            const certType = row.data.certification_track === 'BDA-CP' ? 'cp' : 'scp';
            const { error: curriculumError } = await supabase
              .from('user_curriculum_access')
              .upsert({
                user_id: userId,
                certification_type: certType,
                granted_at: new Date().toISOString(),
                granted_by: null, // System
                source: 'bulk_upload',
              });

            if (curriculumError) {
              console.error('Curriculum access error:', curriculumError);
            }
          } catch (err) {
            console.error('Curriculum access exception:', err);
          }
        }

        // Send welcome email with temporary password
        if (sendWelcomeEmail) {
          // TODO: Integrate with email service
          // For now, we'll log and the password reset flow can be used
          console.log(`Welcome email would be sent to ${row.data.email} with temp password`);
        }

        createdUsers.push({
          id: userId,
          email: row.data.email,
          full_name: row.data.full_name,
        });
      } catch (error: any) {
        errors.push({
          row_number: row.row_number,
          email: row.data.email,
          error: error.message || 'Unknown error',
        });
      }
    }

    return {
      success_count: createdUsers.length,
      error_count: errors.length,
      skipped_count: skippedCount,
      created_users: createdUsers,
      errors,
    };
  }

  /**
   * Generate a temporary password
   */
  private static generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Generate a sample CSV template with 10 unique rows
   * Uses timestamp + random to ensure no duplicates across downloads
   */
  static generateTemplateCSV(): string {
    const headers = ['Full Name', 'Email', 'Phone', 'Country', 'Certification Track', 'Language'];

    // Sample data pools
    const firstNames = [
      'Ahmed', 'Sarah', 'Mohammed', 'Fatima', 'Omar',
      'Layla', 'Youssef', 'Nour', 'Hassan', 'Amira',
      'Khalid', 'Maryam', 'Ali', 'Hana', 'Tariq',
      'Zainab', 'Ibrahim', 'Salma', 'Faisal', 'Rania'
    ];

    const lastNames = [
      'Al-Hassan', 'Mohamed', 'Al-Rashid', 'Ibrahim', 'Al-Farsi',
      'Mahmoud', 'Al-Mansour', 'Abdallah', 'Al-Sharif', 'Khalil',
      'Al-Qasim', 'Saleh', 'Al-Bakri', 'Nasser', 'Al-Zahrani',
      'Youssef', 'Al-Ghamdi', 'Mustafa', 'Al-Otaibi', 'Hamad'
    ];

    const countries = ['AE', 'SA', 'EG', 'JO', 'KW', 'QA', 'BH', 'OM', 'US', 'GB'];
    const tracks = ['BDA-CP', 'BDA-SCP'];
    const languages = ['EN', 'AR'];
    const phonePrefixes: Record<string, string> = {
      'AE': '+971', 'SA': '+966', 'EG': '+20', 'JO': '+962', 'KW': '+965',
      'QA': '+974', 'BH': '+973', 'OM': '+968', 'US': '+1', 'GB': '+44'
    };

    // Generate unique identifier using timestamp + counter
    const timestamp = Date.now();
    const randomSeed = Math.floor(Math.random() * 1000);

    const sampleRows: string[][] = [];
    const usedEmails = new Set<string>();

    for (let i = 0; i < 10; i++) {
      // Pick random names (shuffle to avoid patterns)
      const firstName = firstNames[(i + randomSeed) % firstNames.length];
      const lastName = lastNames[(i * 3 + randomSeed) % lastNames.length];
      const fullName = `${firstName} ${lastName}`;

      // Generate unique email using timestamp + index
      const emailId = `${timestamp}${i}`.slice(-8); // Last 8 digits for readability
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace('al-', '')}.${emailId}@example.com`;

      // Ensure no duplicate emails
      if (usedEmails.has(email)) continue;
      usedEmails.add(email);

      // Random country and matching phone
      const country = countries[(i + randomSeed) % countries.length];
      const phoneNumber = this.generateRandomPhone(phonePrefixes[country] || '+1');

      // Alternate between tracks and languages
      const track = tracks[i % 2];
      const language = languages[i % 2];

      sampleRows.push([fullName, email, phoneNumber, country, track, language]);
    }

    return [
      headers.join(','),
      ...sampleRows.map((row) => row.join(',')),
    ].join('\n');
  }

  /**
   * Generate a random phone number with given prefix
   */
  private static generateRandomPhone(prefix: string): string {
    const digits = [];
    // Generate 9 random digits
    for (let i = 0; i < 9; i++) {
      digits.push(Math.floor(Math.random() * 10));
    }
    return `${prefix}${digits.join('')}`;
  }

  /**
   * Download template with unique sample data
   */
  static downloadTemplate(): void {
    const csv = this.generateTemplateCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Include timestamp in filename to show it's freshly generated
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `bda_user_upload_template_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export results to CSV
   */
  static exportResultsCSV(result: BulkUploadResult): void {
    const rows = [
      ['Status', 'Email', 'Full Name', 'Error'],
      ...result.created_users.map((u) => ['Created', u.email, u.full_name, '']),
      ...result.errors.map((e) => ['Error', e.email, `Row ${e.row_number}`, e.error]),
    ];

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bulk_upload_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ============================================================================
  // Job-Based Upload (with real-time progress tracking)
  // ============================================================================

  /**
   * Start a new bulk upload job with real-time tracking
   * Returns job_id immediately, processing happens server-side
   */
  static async startJobUpload(
    validatedRows: ValidatedRow[],
    sendWelcomeEmail: boolean = true,
    activateContent: boolean = false,
    userRole: 'individual' | 'ecp' | 'pdp' = 'individual',
    resendToExisting: boolean = false
  ): Promise<{ job_id: string; error?: string }> {
    const validRows = validatedRows.filter((r) => r.status === 'valid');
    const existingRows = validatedRows.filter((r) => r.status === 'existing');

    // Check if there are rows to process (valid rows, or existing rows when resend is enabled)
    const hasRowsToProcess = validRows.length > 0 || (resendToExisting && existingRows.length > 0);

    if (!hasRowsToProcess) {
      return { job_id: '', error: 'No valid rows to process' };
    }

    // Get session for authorisation
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { job_id: '', error: 'You must be logged in to create users' };
    }

    // Prepare items for the Edge Function
    // Include both valid rows (new users) and existing rows (when resend is enabled)
    const rowsToProcess = resendToExisting ? [...validRows, ...existingRows] : validRows;
    const items = rowsToProcess.map((row) => ({
      row_number: row.row_number,
      email: row.data.email,
      full_name: row.data.full_name,
      phone: row.data.phone,
      country_code: row.data.country,
      language: row.data.language,
      certification_track: row.data.certification_track,
    }));

    console.log('[BulkUpload] Starting job upload with', items.length, 'items (valid:', validRows.length, ', existing to resend:', resendToExisting ? existingRows.length : 0, ')');

    // Call Edge Function with new items format
    const { data, error } = await supabase.functions.invoke('bulk-create-users', {
      body: {
        items,
        send_welcome_email: sendWelcomeEmail,
        activate_content: activateContent,
        user_role: userRole,
        resend_to_existing: resendToExisting,
      },
    });

    if (error) {
      console.error('[BulkUpload] Edge Function error:', error);
      return { job_id: '', error: error.message };
    }

    if (data?.error) {
      return { job_id: '', error: data.error };
    }

    return { job_id: data.job_id };
  }

  /**
   * Get a job by ID
   */
  static async getJob(jobId: string): Promise<BulkUploadJob | null> {
    const { data, error } = await supabase
      .from('bulk_upload_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('[BulkUpload] Error fetching job:', error);
      return null;
    }

    return data;
  }

  /**
   * Get items for a job
   */
  static async getJobItems(jobId: string): Promise<BulkUploadItem[]> {
    const { data, error } = await supabase
      .from('bulk_upload_items')
      .select('*')
      .eq('job_id', jobId)
      .order('row_number');

    if (error) {
      console.error('[BulkUpload] Error fetching job items:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Subscribe to job progress updates via Realtime
   * Returns a cleanup function to unsubscribe
   */
  static subscribeToJob(
    jobId: string,
    onJobUpdate: (job: BulkUploadJob) => void,
    onItemUpdate?: (item: BulkUploadItem) => void
  ): () => void {
    console.log('[BulkUpload] Subscribing to job:', jobId);

    // Subscribe to job updates
    const jobChannel = supabase
      .channel(`bulk_job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bulk_upload_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          console.log('[BulkUpload] Job update:', payload.new);
          onJobUpdate(payload.new as BulkUploadJob);
        }
      )
      .subscribe();

    // Subscribe to item updates if callback provided
    let itemChannel: RealtimeChannel | null = null;
    if (onItemUpdate) {
      itemChannel = supabase
        .channel(`bulk_items_${jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bulk_upload_items',
            filter: `job_id=eq.${jobId}`,
          },
          (payload) => {
            console.log('[BulkUpload] Item update:', payload.new);
            onItemUpdate(payload.new as BulkUploadItem);
          }
        )
        .subscribe();
    }

    // Return cleanup function
    return () => {
      console.log('[BulkUpload] Unsubscribing from job:', jobId);
      supabase.removeChannel(jobChannel);
      if (itemChannel) {
        supabase.removeChannel(itemChannel);
      }
    };
  }

  /**
   * Export job results to CSV with full details
   */
  static async exportJobResultsCSV(jobId: string): Promise<void> {
    const items = await this.getJobItems(jobId);

    const rows = [
      ['Row', 'Status', 'Email', 'Full Name', 'Country', 'Language', 'Email Sent', 'Error'],
      ...items.map((item) => [
        String(item.row_number),
        item.status,
        item.email,
        item.full_name,
        item.country_code || '',
        item.language,
        item.email_queued ? 'Yes' : 'No',
        item.error_message || '',
      ]),
    ];

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bulk_upload_${jobId.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Get recent upload jobs for the current user
   */
  static async getRecentJobs(limit: number = 10): Promise<BulkUploadJob[]> {
    const { data, error } = await supabase
      .from('bulk_upload_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[BulkUpload] Error fetching recent jobs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Resend invite email for a specific item
   * Returns success status and optional error message
   */
  static async resendInvite(itemId: string): Promise<{ success: boolean; error?: string }> {
    console.log('[BulkUpload] Resending invite for item:', itemId);

    // Get session for authorisation
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'You must be logged in' };
    }

    // Call resend-invite Edge Function
    const { data, error } = await supabase.functions.invoke('resend-invite', {
      body: { item_id: itemId },
    });

    if (error) {
      console.error('[BulkUpload] Resend error:', error);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true };
  }
}
