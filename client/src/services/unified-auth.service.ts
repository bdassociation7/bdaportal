/**
 * Unified Authentication Service
 * Transparent authentication between Portal (Supabase) and Store (WordPress)
 * Handles all authentication flows without user knowing about dual systems
 */

import { AuthService } from '@/entities/auth/auth.service';
import { WordPressAPIService } from './wordpress-api.service';
import { RoleMappingService } from './role-mapping.service';
import { supabase } from '@/shared/config/supabase.config';
import type { AuthError } from '@/shared/types/auth.types';
import type { User } from '@supabase/supabase-js';

export interface UnifiedUser {
  // Supabase data
  supabase_user?: User;
  // WordPress data
  wp_user_id?: number;
  // Unified data
  email: string;
  first_name?: string;
  last_name?: string;
  bda_role: string;
  organization?: string;
  // System flags
  has_portal_access: boolean;
  has_store_access: boolean;
  sync_status: 'synced' | 'pending' | 'failed';
}

export interface AuthResult {
  success: boolean;
  user?: UnifiedUser;
  error?: AuthError;
  action_taken?: 'login' | 'created_portal' | 'recovered_portal' | 'created_store' | 'linked_accounts';
}

export class UnifiedAuthService {

  /**
   * TRANSPARENT LOGIN - Main entry point
   * User provides email/password, system handles everything behind scenes
   *
   * CAS COUVERTS:
   * - Cas 6: Login avec compte Portal seulement → Connexion normale
   * - Cas 7: Login avec compte Store seulement → Création Portal automatique + liaison
   * - Cas 8: Login avec comptes liés → Connexion immédiate
   * - Cas 9/10: Email inexistant ou mauvais mot de passe → Message générique
   */
  static async signIn(email: string, password: string): Promise<AuthResult> {
    console.log('🔐 [UnifiedAuthService] Starting login process:', { email });

    try {
      // 1. Try Portal login first (Case 6 & 8)
      console.log('🚪 [UnifiedAuthService] Attempting Portal login...');
      const portalResult = await AuthService.signIn(email, password);

      // Case 6 & 8: Portal login successful (with or without Store link)
      if (portalResult.user && !portalResult.error) {
        console.log('✅ [UnifiedAuthService] Portal login successful');

        // Get full profile
        const profile = await AuthService.loadUserProfile(portalResult.user.id);
        const unifiedUser = await this.buildUnifiedUser(portalResult.user, profile.profile);

        // Sync Store session if account is linked (wp_user_id present)
        if (unifiedUser.wp_user_id) {
          console.log('🔄 [UnifiedAuthService] Syncing Store session for wp_user_id:', unifiedUser.wp_user_id);
          await this.syncStoreSession(unifiedUser.wp_user_id);
        }

        // Sync book credits (auto-heal missing credits)
        try {
          console.log('📚 [UnifiedAuthService] Syncing book credits...');
          const { supabase } = await import('@/shared/config/supabase.config');
          const { data: creditSync } = await supabase.rpc('sync_user_book_credits');
          if (creditSync?.granted > 0) {
            console.log(`✅ [UnifiedAuthService] Granted ${creditSync.granted} book credits`);
          }
        } catch (error) {
          // Don't fail login if credit sync fails
          console.warn('⚠️ [UnifiedAuthService] Book credit sync failed (non-critical):', error);
        }

        return {
          success: true,
          user: unifiedUser,
          action_taken: 'login'
        };
      }

      // 2. Login Portal failed - Check if it's a credentials error or something else
      if (portalResult.error) {
        const errorCode = portalResult.error.code || '';

        // If it's NOT an invalid credentials error, it's a real error
        if (!errorCode.includes('Invalid login credentials') &&
            !errorCode.includes('Invalid email or password') &&
            !errorCode.includes('User not found')) {
          console.error('❌ [UnifiedAuthService] Portal error (not credentials):', errorCode);
          return {
            success: false,
            error: {
              code: 'AUTH_ERROR',
              message: 'An error occurred. Please try again.'
            }
          };
        }
      }

      // 3. Invalid Portal credentials - Check if Store account exists (Case 7)
      console.log('🔍 [UnifiedAuthService] Portal login failed, checking Store account...');

      let storeCheckResult: Awaited<ReturnType<typeof WordPressAPIService.checkUserExists>>;
      try {
        storeCheckResult = await WordPressAPIService.checkUserExists(email);
      } catch (storeError) {
        // Case 15: WordPress API down - Degraded mode
        console.warn('⚠️ [UnifiedAuthService] WordPress API unavailable during login, fallback to Portal-only');
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        };
      }

      if (!storeCheckResult.success || !storeCheckResult.data) {
        // Case 9: Email doesn't exist in Portal or Store
        console.log('❌ [UnifiedAuthService] Email not found in any system');
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        };
      }

      // 4. Store account exists - Verify Store credentials (Case 7)
      console.log('🔐 [UnifiedAuthService] Store account found, verifying credentials...');

      let storeAuthResult: Awaited<ReturnType<typeof WordPressAPIService.verifyCredentials>>;
      try {
        storeAuthResult = await WordPressAPIService.verifyCredentials(email, password);
      } catch (storeError) {
        // WordPress API down during credential verification
        console.warn('⚠️ [UnifiedAuthService] WordPress API unavailable during credential verification');
        return {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Service temporarily unavailable. Please try again in a few moments.'
          }
        };
      }

      if (!storeAuthResult.success) {
        // Case 10: Invalid Store password
        console.log('❌ [UnifiedAuthService] Invalid Store credentials');
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        };
      }

      // Case 7: Valid Store credentials - Create Portal account and link automatically
      console.log('🎯 [UnifiedAuthService] Case 7 detected: Store-only user, migrating to Portal...');
      const migrationResult = await this.createPortalFromStore(
        email,
        password,
        storeAuthResult.data.user_data
      );

      if (migrationResult.success && migrationResult.user) {
        // Sync Store session after migration
        if (migrationResult.user.wp_user_id) {
          await this.syncStoreSession(migrationResult.user.wp_user_id);
        }

        return {
          success: true,
          user: migrationResult.user,
          action_taken: 'created_portal'
        };
      }

      // Échec de migration
      return {
        success: false,
        error: {
          code: 'MIGRATION_FAILED',
          message: 'Unable to create your account. Please contact support.'
        }
      };

    } catch (error) {
      console.error('❌ [UnifiedAuthService] Unexpected error:', error);
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred. Please try again.',
          details: error
        }
      };
    }
  }

  /**
   * Sync WordPress session after Portal login
   * Creates necessary cookies for seamless Store access
   */
  private static async syncStoreSession(wpUserId: number): Promise<void> {
    try {
      console.log('🔄 [UnifiedAuthService] Syncing Store session for wp_user_id:', wpUserId);

      // Create WordPress session via API
      const sessionResult = await WordPressAPIService.createSession(wpUserId);

      if (sessionResult.success) {
        console.log('✅ [UnifiedAuthService] Store session synced successfully');
      } else {
        console.warn('⚠️ [UnifiedAuthService] Store session sync failed (non-blocking):', sessionResult.error);
      }

    } catch (error) {
      // Non-blocking error - user can still use the Portal
      console.warn('⚠️ [UnifiedAuthService] Store session sync error (non-blocking):', error);
    }
  }

  /**
   * TRANSPARENT SIGNUP - Creates accounts in both systems
   */
  static async signUp(userData: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    bda_role?: string;
    organisation?: string;
    signup_type?: 'portal-only' | 'store-only' | 'both';
  }): Promise<AuthResult> {
    const signupType = userData.signup_type || 'both';

    try {
      // Check if user already exists
      const existingCheck = await this.checkExistingUser(userData.email);
      if (existingCheck.exists) {
        return {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'An account with this email already exists'
          }
        };
      }

      let supabaseUser: User | null = null;
      let wpUserId: number | null = null;

      // Create in Supabase if needed
      if (['portal-only', 'both'].includes(signupType)) {
        const supabaseResult = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              first_name: userData.first_name,
              last_name: userData.last_name,
              bda_role: userData.bda_role || 'individual',
              organisation: userData.organisation,
              signup_type: signupType
            }
          }
        });

        if (supabaseResult.error) {
          return {
            success: false,
            error: {
              code: supabaseResult.error.message,
              message: 'Error creating account'
            }
          };
        }

        supabaseUser = supabaseResult.data.user;
      }

      // Create in WordPress if needed (Case 15: degraded mode if WordPress down)
      if (['store-only', 'both'].includes(signupType)) {
        try {
          const wpResult = await WordPressAPIService.createUser({
            email: userData.email,
            password: userData.password,
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
          });

          if (!wpResult.success) {
            // Check if it's a network error or business logic error
            const isNetworkIssue = wpResult.error?.includes('connection') ||
                                   wpResult.error?.includes('server');

            if (isNetworkIssue && supabaseUser && signupType === 'both') {
              // Degraded mode: Portal created, Store failed (non-blocking)
              console.warn('⚠️ [UnifiedAuthService] WordPress unavailable, Portal-only account created');
              wpUserId = null; // No Store linking for now

              // Continue with Portal-only
            } else {
              // Business logic error (e.g., email already used)
              if (supabaseUser) {
                await this.rollbackSupabaseUser(supabaseUser.id);
              }

              return {
                success: false,
                error: {
                  code: 'STORE_CREATION_FAILED',
                  message: wpResult.error || 'Error creating store account'
                }
              };
            }
          } else {
            wpUserId = wpResult.data?.wp_user_id || null;
          }
        } catch (wpError) {
          // WordPress completely inaccessible
          console.warn('⚠️ [UnifiedAuthService] WordPress API unavailable during signup');

          if (signupType === 'store-only') {
            // Store-only required but WordPress down
            return {
              success: false,
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Store service is temporarily unavailable. Please try again.'
              }
            };
          }

          // Mode 'both': continue with Portal-only
          console.log('✅ [UnifiedAuthService] Fallback to Portal-only account (Store unavailable)');
          wpUserId = null;
        }
      }

      // Create unified profile
      if (supabaseUser) {
        await this.createUnifiedProfile(supabaseUser.id, {
          wp_user_id: wpUserId,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          bda_role: userData.bda_role || 'individual',
          organization: userData.organization,
          signup_type: signupType
        });
      }

      const user = await this.buildUnifiedUser(supabaseUser, {
        wp_user_id: wpUserId,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.bda_role || 'individual',
        organization: userData.organization
      });

      return {
        success: true,
        user,
        action_taken: 'created_portal'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SIGNUP_FAILED',
          message: 'Error creating account',
          details: error
        }
      };
    }
  }

  /**
   * Create Portal account from existing Store user
   * Uses Edge Function to bypass email confirmation (user already verified in WordPress)
   */
  private static async createPortalFromStore(
    email: string,
    password: string,
    wpUserData: any
  ): Promise<AuthResult> {
    try {
      // Get mapped Portal role from WordPress role
      let portalRole = 'individual'; // Default fallback

      if (wpUserData.wordpress_role) {
        console.log('🔄 [UnifiedAuthService] Querying role mapping for WordPress role:', wpUserData.wordpress_role);

        const { role: mappedRole } = await RoleMappingService.getSupabaseRole(wpUserData.wordpress_role);

        if (mappedRole) {
          portalRole = mappedRole;
          console.log('✅ [UnifiedAuthService] Found role mapping:', wpUserData.wordpress_role, '→', portalRole);
        } else {
          console.log('⚠️ [UnifiedAuthService] No mapping found, using default:', portalRole);
        }
      } else {
        // Fallback to bda_role if wordpress_role not provided (backward compatibility)
        portalRole = wpUserData.bda_role || 'individual';
        console.log('⚠️ [UnifiedAuthService] No WordPress role provided, using bda_role:', portalRole);
      }

      // Call Edge Function to create user with auto-confirmed email
      // This bypasses email confirmation since user is already verified in WordPress
      console.log('🚀 [UnifiedAuthService] Calling migrate-store-user Edge Function...');

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/migrate-store-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            password,
            wp_user_id: wpUserData.wp_user_id,
            first_name: wpUserData.first_name,
            last_name: wpUserData.last_name,
            wordpress_role: wpUserData.wordpress_role,
            bda_role: portalRole,
            organization: wpUserData.bda_organization,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('❌ [UnifiedAuthService] Edge Function failed:', result.error);

        // Recovery strategy: Try to sign in (user might already exist)
        if (result.action === 'linked_existing' || response.status === 409) {
          console.log('🔄 [UnifiedAuthService] User already exists, attempting sign in...');
        }

        // Try to sign in with the credentials (user may already exist in auth.users)
        const recoverySignIn = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (recoverySignIn.data.user) {
          console.log('✅ [UnifiedAuthService] Recovery successful - signed in existing user');

          // Update metadata to ensure linking with WordPress
          await supabase.auth.updateUser({
            data: {
              wp_user_id: wpUserData.wp_user_id,
              first_name: wpUserData.first_name,
              last_name: wpUserData.last_name,
              bda_role: portalRole,
              organization: wpUserData.bda_organization,
              created_from: 'store'
            }
          });

          // Ensure public.users is linked with wp_user_id
          const { error: upsertError } = await supabase
            .from('users')
            .upsert({
              id: recoverySignIn.data.user.id,
              email: email.toLowerCase().trim(),
              first_name: wpUserData.first_name,
              last_name: wpUserData.last_name,
              role: portalRole,
              wp_user_id: wpUserData.wp_user_id,
              wp_sync_status: 'synced',
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            });

          if (upsertError) {
            console.warn('⚠️ [UnifiedAuthService] Failed to upsert public.users (non-blocking):', upsertError);
          }

          // Build and return unified user
          const profile = await AuthService.loadUserProfile(recoverySignIn.data.user.id);
          const user = await this.buildUnifiedUser(recoverySignIn.data.user, profile.profile);

          return {
            success: true,
            user,
            action_taken: 'recovered_portal'
          };
        }

        return {
          success: false,
          error: {
            code: result.error || 'EDGE_FUNCTION_FAILED',
            message: 'Error creating portal account'
          }
        };
      }

      console.log('✅ [UnifiedAuthService] Edge Function success:', result.action);

      // Sign in the newly created/linked user
      const signInResult = await AuthService.signIn(email, password);

      if (signInResult.user) {
        const profile = await AuthService.loadUserProfile(signInResult.user.id);
        const user = await this.buildUnifiedUser(signInResult.user, profile.profile);

        return {
          success: true,
          user,
          action_taken: 'created_portal'
        };
      }

      return {
        success: false,
        error: {
          code: 'LOGIN_AFTER_CREATION_FAILED',
          message: 'Account created but login failed'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PORTAL_CREATION_FAILED',
          message: 'Error creating portal account',
          details: error
        }
      };
    }
  }

  /**
   * Build unified user object from different sources
   */
  private static async buildUnifiedUser(
    supabaseUser: User | null,
    profile: any
  ): Promise<UnifiedUser> {
    return {
      supabase_user: supabaseUser || undefined,
      wp_user_id: profile?.wp_user_id,
      email: supabaseUser?.email || profile?.email || '',
      first_name: profile?.first_name,
      last_name: profile?.last_name,
      bda_role: profile?.role || profile?.bda_role || 'individual',
      organization: profile?.organization,
      has_portal_access: !!supabaseUser,
      has_store_access: !!profile?.wp_user_id,
      sync_status: 'synced'
    };
  }

  /**
   * Check if user exists in any system
   * Uses database queries instead of failed login attempts to avoid console errors
   */
  private static async checkExistingUser(email: string): Promise<{ exists: boolean; where?: string[] }> {
    const exists: string[] = [];

    try {
      // Check Supabase public.users table
      const { data: portalUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (portalUser) {
        exists.push('supabase');
      }

      // Check WordPress using the checkUserExists method
      try {
        const wpCheck = await WordPressAPIService.checkUserExists(email);
        if (wpCheck.success && wpCheck.data) {
          exists.push('wordpress');
        }
      } catch {
        // WordPress check failed - user likely doesn't exist there
      }
    } catch (error) {
      console.log('[checkExistingUser] Error checking user existence:', error);
    }

    return {
      exists: exists.length > 0,
      where: exists
    };
  }

  /**
   * Create unified profile in Supabase
   */
  private static async createUnifiedProfile(userId: string, profileData: any) {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: userId,
          wp_user_id: profileData.wp_user_id,
          email: profileData.email,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          role: profileData.bda_role || profileData.role,
          organisation: profileData.organisation,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to create unified profile:', error);
      }
    } catch (error) {
      console.error('Error creating unified profile:', error);
    }
  }

  /**
   * Rollback Supabase user creation
   */
  private static async rollbackSupabaseUser(userId: string) {
    try {
      // Note: Supabase doesn't allow user deletion from client
      // This would need to be handled by admin or server-side
      console.warn('Supabase user rollback needed for:', userId);
    } catch (error) {
      console.error('Rollback failed:', error);
    }
  }

  /**
   * Sign out from both systems (Case 12)
   */
  static async signOut(): Promise<{ error: AuthError | null }> {
    try {
      console.log('🚪 [UnifiedAuthService] Starting logout process...');

      // Get current user before signing out
      const { user } = await this.getCurrentUser();

      // Sign out from Supabase (Portal)
      const result = await AuthService.signOut();

      // Explicit WordPress Store logout if user is linked
      if (user?.wp_user_id) {
        console.log('🔄 [UnifiedAuthService] Logging out from Store (wp_user_id:', user.wp_user_id, ')');
        const wpLogoutResult = await WordPressAPIService.logout(user.wp_user_id);

        if (!wpLogoutResult.success) {
          console.warn('⚠️ [UnifiedAuthService] Store logout failed (non-blocking):', wpLogoutResult.error);
        } else {
          console.log('✅ [UnifiedAuthService] Store logout successful');
        }
      }

      console.log('✅ [UnifiedAuthService] Logout completed');
      return result;
    } catch (error) {
      console.error('❌ [UnifiedAuthService] Logout error:', error);
      return {
        error: {
          code: 'LOGOUT_ERROR',
          message: 'Error during logout',
          details: error
        }
      };
    }
  }

  /**
   * Get current unified user
   */
  static async getCurrentUser(): Promise<{ user: UnifiedUser | null; error: AuthError | null }> {
    try {
      const { user, error } = await AuthService.getCurrentUser();

      if (error || !user) {
        return { user: null, error };
      }

      const { profile } = await AuthService.loadUserProfile(user.id);
      const unifiedUser = await this.buildUnifiedUser(user, profile);

      return { user: unifiedUser, error: null };
    } catch (error) {
      return {
        user: null,
        error: {
          code: 'GET_USER_ERROR',
          message: 'Error retrieving user',
          details: error
        }
      };
    }
  }
}