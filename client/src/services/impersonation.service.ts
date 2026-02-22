import { supabase } from '@/shared/config/supabase.config';

const IMPERSONATION_BACKUP_KEY = 'bda-portal-impersonation-backup';
const IMPERSONATION_META_KEY = 'bda-portal-impersonation-meta';

interface ImpersonationBackup {
  access_token: string;
  refresh_token: string;
}

export interface ImpersonationMeta {
  admin_user_id: string;
  admin_email: string;
  admin_name: string;
  target_user_id: string;
  target_email: string;
  target_name: string;
  started_at: string;
}

interface TargetUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface AdminUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

class ImpersonationService {
  isImpersonating(): boolean {
    return localStorage.getItem(IMPERSONATION_META_KEY) !== null;
  }

  getImpersonationMeta(): ImpersonationMeta | null {
    const raw = localStorage.getItem(IMPERSONATION_META_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async startImpersonation(targetUser: TargetUser, adminUser: AdminUser): Promise<void> {
    // 1. Get current admin session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session to backup');
    }

    // 2. Save admin session for later restore
    const backup: ImpersonationBackup = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    };
    localStorage.setItem(IMPERSONATION_BACKUP_KEY, JSON.stringify(backup));

    // 3. Call Edge Function to get magiclink token
    const { data, error } = await supabase.functions.invoke('impersonate-user', {
      body: { target_user_id: targetUser.id },
    });

    if (error || !data?.hashed_token) {
      // Clean up backup on failure
      localStorage.removeItem(IMPERSONATION_BACKUP_KEY);
      throw new Error(data?.error || error?.message || 'Failed to start impersonation');
    }

    // 4. Save impersonation metadata before session swap
    const meta: ImpersonationMeta = {
      admin_user_id: adminUser.id,
      admin_email: adminUser.email,
      admin_name: `${adminUser.first_name || ''} ${adminUser.last_name || ''}`.trim(),
      target_user_id: targetUser.id,
      target_email: targetUser.email,
      target_name: `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim(),
      started_at: new Date().toISOString(),
    };
    localStorage.setItem(IMPERSONATION_META_KEY, JSON.stringify(meta));

    // 5. Sign in as target user using the magiclink token
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: data.hashed_token,
      type: 'magiclink',
    });

    if (otpError) {
      // Clean up on failure
      localStorage.removeItem(IMPERSONATION_BACKUP_KEY);
      localStorage.removeItem(IMPERSONATION_META_KEY);
      throw new Error(`Failed to sign in as user: ${otpError.message}`);
    }

    // Auth state change listener will handle the rest (profile reload, routing)
  }

  async endImpersonation(): Promise<void> {
    const raw = localStorage.getItem(IMPERSONATION_BACKUP_KEY);
    if (!raw) {
      throw new Error('No impersonation session to restore');
    }

    let backup: ImpersonationBackup;
    try {
      backup = JSON.parse(raw);
    } catch {
      throw new Error('Corrupted impersonation backup');
    }

    // Clear impersonation data first
    localStorage.removeItem(IMPERSONATION_META_KEY);
    localStorage.removeItem(IMPERSONATION_BACKUP_KEY);

    // Restore admin session
    const { error } = await supabase.auth.setSession({
      access_token: backup.access_token,
      refresh_token: backup.refresh_token,
    });

    if (error) {
      throw new Error(`Failed to restore admin session: ${error.message}`);
    }
  }
}

export const impersonationService = new ImpersonationService();
