import { supabase } from '@/shared/config/supabase.config';
import type { AuthUser, UserProfile, AuthError } from '@/shared/types/auth.types';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Service d'authentification - Gère toutes les opérations d'auth
 */
export class AuthService {
  /**
   * Connexion avec email/password
   */
  static async signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          user: null,
          error: {
            code: error.message,
            message: this.formatErrorMessage(error.message),
          },
        };
      }

      return { user: data.user, error: null };
    } catch (err) {
      return {
        user: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred during sign in',
          details: err,
        },
      };
    }
  }

  /**
   * Déconnexion
   */
  static async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          error: {
            code: error.message,
            message: 'Failed to sign out',
          },
        };
      }

      return { error: null };
    } catch (err) {
      return {
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred during sign out',
          details: err,
        },
      };
    }
  }

  /**
   * Récupérer l'utilisateur actuel
   */
  static async getCurrentUser(): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        return {
          user: null,
          error: {
            code: error.message,
            message: 'Failed to get current user',
          },
        };
      }

      return { user: data.user, error: null };
    } catch (err) {
      return {
        user: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while getting user',
          details: err,
        },
      };
    }
  }

  /**
   * Charger le profil utilisateur avec informations enrichies
   */
  static async loadUserProfile(userId: string): Promise<{ profile: UserProfile | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase
        .from('users_with_details')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Fallback vers la table users si la vue échoue
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (fallbackError) {
          return {
            profile: null,
            error: {
              code: fallbackError.code,
              message: 'Failed to load user profile',
              details: fallbackError,
            },
          };
        }

        return { profile: fallbackData, error: null };
      }

      return { profile: data, error: null };
    } catch (err) {
      return {
        profile: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while loading profile',
          details: err,
        },
      };
    }
  }

  /**
   * Vérifier les permissions utilisateur
   */
  static async checkPermission(permission: string): Promise<{ hasPermission: boolean; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.rpc('check_permission', {
        required_permission: permission
      });

      if (error) {
        return {
          hasPermission: false,
          error: {
            code: error.code,
            message: 'Failed to check permissions',
            details: error,
          },
        };
      }

      return { hasPermission: data?.hasPermission || false, error: null };
    } catch (err) {
      return {
        hasPermission: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while checking permissions',
          details: err,
        },
      };
    }
  }

  /**
   * Promouvoir un utilisateur (super admin seulement)
   */
  static async promoteUser(
    targetUserId: string,
    newRole: string
  ): Promise<{ success: boolean; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.rpc('promote_user', {
        target_user_id: targetUserId,
        new_role: newRole
      });

      if (error) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error,
          },
        };
      }

      return { success: data || false, error: null };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while promoting user',
          details: err,
        },
      };
    }
  }

  /**
   * Mettre à jour le profil utilisateur
   */
  static async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<{ profile: UserProfile | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return {
          profile: null,
          error: {
            code: error.code,
            message: 'Failed to update user profile',
            details: error,
          },
        };
      }

      return { profile: data, error: null };
    } catch (err) {
      return {
        profile: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while updating profile',
          details: err,
        },
      };
    }
  }

  /**
   * Écouter les changements d'état d'authentification avec gestion des événements
   * Enhanced to pass event type and session for better session management
   */
  static onAuthStateChange(callback: (user: User | null, event?: string, session?: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      // Pass event type and session to callback for better handling
      callback(session?.user || null, event, session);
    });
  }

  /**
   * Vérifier si un utilisateur existe dans public.users
   * This checks the public.users table which is accessible without authentication
   */
  static async checkUserExists(email: string): Promise<{ exists: boolean; userData?: any }> {
    try {
      // Check if user exists in public.users table
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, wp_user_id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (error) {
        // RLS might block this query for anonymous users - that's OK
        // We'll handle it during signup attempt
        console.log('[checkUserExists] Query error (might be RLS):', error.code);
        return { exists: false };
      }

      if (data) {
        return { exists: true, userData: data };
      }

      return { exists: false };
    } catch (error) {
      console.error('[checkUserExists] Error:', error);
      return { exists: false };
    }
  }

  /**
   * Inscription avec données étendues
   */
  static async signUp(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    wpUserId?: number;
    signupType: string;
    organisation?: string;
  }): Promise<any> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: userData.role,
            wp_user_id: userData.wpUserId,
            signup_type: userData.signupType,
            organisation: userData.organisation
          }
        }
      });

      if (error) {
        throw error;
      }

      return data.user;
    } catch (error) {
      console.error('Error during signup:', error);
      throw error;
    }
  }

  /**
   * Connexion avec retour de résultat structuré
   */
  static async signInWithEmailAndPassword(email: string, password: string): Promise<{ success: boolean; user?: any; error?: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error };
      }

      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Lier un compte WordPress à un compte Portal
   */
  static async linkWordPressAccount(portalUserId: string, wpUserId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          wp_user_id: wpUserId,
          wp_sync_status: 'synced',
          updated_at: new Date().toISOString()
        })
        .eq('id', portalUserId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error linking WordPress account:', error);
      throw error;
    }
  }

  /**
   * Formater les messages d'erreur pour l'utilisateur
   */
  private static formatErrorMessage(errorMessage: string): string {
    // Return original English message - translation handled by i18n
    return errorMessage;
  }
}