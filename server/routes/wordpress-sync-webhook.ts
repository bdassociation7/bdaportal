/**
 * WordPress Sync Webhook Handler
 * Handles user sync events from WordPress Store
 *
 * Events:
 * - user_created: New user registered in WordPress store
 * - profile_updated: User profile updated in WordPress
 * - user_login: User logged into WordPress (tracking only)
 * - role_changed: User role changed in WordPress
 */

import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

// Valid portal roles
type PortalRole = 'individual' | 'ecp' | 'pdp' | 'admin' | 'super_admin';

const VALID_PORTAL_ROLES: PortalRole[] = ['individual', 'ecp', 'pdp', 'admin', 'super_admin'];

interface WordPressSyncPayload {
  event_type: 'user_created' | 'profile_updated' | 'user_login' | 'role_changed';
  data: {
    wp_user_id: number;
    email: string;
    username?: string;
    user_registered?: string;
    first_name?: string;
    last_name?: string;
    bda_role?: string;
    wp_role?: string; // WordPress role (subscriber, customer, etc.)
    bda_organization?: string;
    old_role?: string;
    new_role?: string;
    login_time?: string;
    changed_at?: string;
  };
  timestamp: string;
  source: string;
  site_url: string;
}

/**
 * Verify WordPress webhook key
 */
function verifyWebhookKey(providedKey: string): boolean {
  const expectedKey = process.env.BDA_PORTAL_WEBHOOK_KEY;
  if (!expectedKey) {
    console.warn('BDA_PORTAL_WEBHOOK_KEY not configured - skipping verification');
    return true; // Allow if not configured (development)
  }
  return providedKey === expectedKey;
}

/**
 * Resolve portal role from WordPress data
 * Priority:
 * 1. bda_role if it's a valid portal role (direct mapping)
 * 2. Lookup from roles_mapping table using wp_role
 * 3. Default to 'individual'
 */
async function resolvePortalRole(data: WordPressSyncPayload['data']): Promise<PortalRole> {
  // Priority 1: Check if bda_role is a valid portal role
  if (data.bda_role && VALID_PORTAL_ROLES.includes(data.bda_role as PortalRole)) {
    console.log(`[WordPress Sync] Using bda_role directly: ${data.bda_role}`);
    return data.bda_role as PortalRole;
  }

  // Priority 2: Lookup from wordpress_role_mappings table
  if (data.wp_role) {
    try {
      const { data: mapping, error } = await supabase
        .from('wordpress_role_mappings')
        .select('supabase_role')
        .eq('wordpress_role', data.wp_role)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && mapping) {
        console.log(`[WordPress Sync] Mapped wp_role '${data.wp_role}' to '${mapping.supabase_role}'`);
        return mapping.supabase_role as PortalRole;
      }
    } catch (err) {
      console.error('[WordPress Sync] Error looking up role mapping:', err);
    }
  }

  // Priority 3: Default to individual
  console.log(`[WordPress Sync] Using default role 'individual'`);
  return 'individual';
}

/**
 * Handle WordPress sync webhook events
 */
export async function handleWordPressSyncWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Verify webhook key
    const webhookKey = req.headers['x-bda-webhook-key'] as string;
    if (!verifyWebhookKey(webhookKey)) {
      console.error('Invalid WordPress webhook key');
      res.status(401).json({ error: 'Invalid webhook key' });
      return;
    }

    const payload: WordPressSyncPayload = req.body;

    console.log(`[WordPress Sync] Received event: ${payload.event_type}`, {
      email: payload.data?.email,
      wp_user_id: payload.data?.wp_user_id,
      source: payload.source,
    });

    // Route to appropriate handler based on event type
    switch (payload.event_type) {
      case 'user_created':
        await handleUserCreated(payload.data);
        break;
      case 'profile_updated':
        await handleProfileUpdated(payload.data);
        break;
      case 'user_login':
        // Just log, no action needed
        console.log(`[WordPress Sync] User login: ${payload.data.email}`);
        break;
      case 'role_changed':
        await handleRoleChanged(payload.data);
        break;
      default:
        console.warn(`[WordPress Sync] Unknown event type: ${payload.event_type}`);
    }

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error: any) {
    console.error('[WordPress Sync] Webhook processing error:', error);
    // Return 200 to prevent WordPress from retrying
    res.status(200).json({
      success: false,
      error: 'Processing error',
      message: error.message,
    });
  }
}

/**
 * Handle user_created event - Create portal account for new WordPress user
 */
async function handleUserCreated(data: WordPressSyncPayload['data']): Promise<void> {
  const email = data.email?.toLowerCase().trim();

  if (!email) {
    console.error('[WordPress Sync] user_created: No email provided');
    return;
  }

  console.log(`[WordPress Sync] Creating portal account for: ${email}`);

  // Check if user already exists in portal
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('[WordPress Sync] Error checking existing user:', checkError);
    throw checkError;
  }

  if (existingUser) {
    console.log(`[WordPress Sync] User already exists in portal: ${email}`);
    return;
  }

  // Also check Supabase Auth
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const existingAuthUser = authUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email
  );

  if (existingAuthUser) {
    console.log(`[WordPress Sync] Auth user already exists: ${email}`);
    // User exists in auth but not in users table - create users record
    const { error: createUserError } = await supabase
      .from('users')
      .insert({
        id: existingAuthUser.id,
        email: email,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        role: 'individual',
        is_active: true,
        profile_completed: false,
        created_from: 'wordpress_sync',
      });

    if (createUserError) {
      console.error('[WordPress Sync] Error creating users record:', createUserError);
    } else {
      console.log(`[WordPress Sync] Created users record for existing auth user: ${email}`);
    }
    return;
  }

  // Resolve the portal role from WordPress data
  const portalRole = await resolvePortalRole(data);
  console.log(`[WordPress Sync] Resolved portal role: ${portalRole}`);

  // Create new user in Supabase Auth
  const tempPassword = crypto.randomBytes(16).toString('hex');

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      wp_user_id: data.wp_user_id,
      created_from: 'wordpress_sync',
    },
  });

  if (authError) {
    console.error('[WordPress Sync] Error creating auth user:', authError);
    throw authError;
  }

  const userId = authData.user.id;
  console.log(`[WordPress Sync] Created auth user: ${userId}`);

  // Create users table record with resolved role
  const { error: createError } = await supabase
    .from('users')
    .insert({
      id: userId,
      email: email,
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      role: portalRole,
      is_active: true,
      profile_completed: false,
      created_from: 'wordpress_sync',
    });

  if (createError) {
    console.error('[WordPress Sync] Error creating users record:', createError);
    // Don't throw - auth user was created, they can still use forgot password
  } else {
    console.log(`[WordPress Sync] Created users record: ${userId}`);
  }

  // Send password reset email
  try {
    const resetUrl = process.env.PORTAL_URL || 'https://portal.bda-global.org';
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${resetUrl}/auth/set-password` }
    );

    if (resetError) {
      console.error('[WordPress Sync] Failed to send password reset:', resetError);
    } else {
      console.log(`[WordPress Sync] Password reset email sent to: ${email}`);
    }
  } catch (resetError) {
    console.error('[WordPress Sync] Failed to send password reset:', resetError);
  }

  // Log the sync event
  await logSyncEvent(userId, 'user_created', {
    wp_user_id: data.wp_user_id,
    email: email,
  });
}

/**
 * Handle profile_updated event - Update portal user profile
 */
async function handleProfileUpdated(data: WordPressSyncPayload['data']): Promise<void> {
  const email = data.email?.toLowerCase().trim();

  if (!email) {
    console.error('[WordPress Sync] profile_updated: No email provided');
    return;
  }

  // Find user by email
  const { data: user, error: findError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (findError || !user) {
    console.log(`[WordPress Sync] User not found for profile update: ${email}`);
    return;
  }

  // Update profile fields that were provided
  const updates: Record<string, any> = {};

  if (data.first_name) updates.first_name = data.first_name;
  if (data.last_name) updates.last_name = data.last_name;
  if (data.bda_organization) updates.organization_name = data.bda_organization;

  if (Object.keys(updates).length === 0) {
    console.log(`[WordPress Sync] No profile fields to update for: ${email}`);
    return;
  }

  const { error: updateError } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id);

  if (updateError) {
    console.error('[WordPress Sync] Error updating profile:', updateError);
    throw updateError;
  }

  console.log(`[WordPress Sync] Updated profile for: ${email}`, updates);

  await logSyncEvent(user.id, 'profile_updated', {
    wp_user_id: data.wp_user_id,
    updates,
  });
}

/**
 * Handle role_changed event - Update portal user role
 */
async function handleRoleChanged(data: WordPressSyncPayload['data']): Promise<void> {
  const email = data.email?.toLowerCase().trim();

  if (!email) {
    // Role change events don't always include email, just log
    console.log(`[WordPress Sync] Role change: WP user ${data.wp_user_id} from ${data.old_role} to ${data.new_role}`);
    return;
  }

  // Find user by email
  const { data: user, error: findError } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', email)
    .maybeSingle();

  if (findError || !user) {
    console.log(`[WordPress Sync] User not found for role change: ${email}`);
    return;
  }

  // Map WordPress roles to portal roles if needed
  // For now, just log the event - role mapping can be customized
  console.log(`[WordPress Sync] Role changed for ${email}: ${data.old_role} -> ${data.new_role}`);

  await logSyncEvent(user.id, 'role_changed', {
    wp_user_id: data.wp_user_id,
    old_role: data.old_role,
    new_role: data.new_role,
  });
}

/**
 * Log sync events for audit trail
 */
async function logSyncEvent(
  userId: string,
  eventType: string,
  details: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('membership_activation_logs').insert({
      user_id: userId,
      action: `wp_sync_${eventType}`,
      triggered_by: 'wordpress_webhook',
      notes: JSON.stringify(details),
    });
  } catch (error) {
    console.error('[WordPress Sync] Failed to log sync event:', error);
  }
}

/**
 * Health check endpoint for WordPress sync webhook
 */
export function handleWordPressSyncHealth(_req: Request, res: Response): void {
  res.json({
    status: 'healthy',
    service: 'wordpress-sync-webhook',
    timestamp: new Date().toISOString(),
  });
}
