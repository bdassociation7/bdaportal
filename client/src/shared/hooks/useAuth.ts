import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '@/entities/auth/auth.service';
import type { AuthUser, AuthState, AuthError } from '@/shared/types/auth.types';
import type { User, Session } from '@supabase/supabase-js';
import { sessionManager } from '@/services/session-manager.service';

/**
 * Hook personnalisé pour la gestion de l'authentification
 * Centralise toute la logique d'auth et expose une API simple
 */
export function useAuth() {
  // État d'authentification avec initialisation optimisée
  const [state, setState] = useState<AuthState>(() => {
    // Vérifier rapidement si une session existe dans le localStorage
    const hasSession = !!localStorage.getItem('bda-portal-auth.access_token');
    return {
      user: null,
      isLoading: true,
      isAuthenticated: false,
      hasInitialCheck: hasSession, // Flag pour indiquer qu'on doit vérifier la session
    };
  });

  // Charger le profil utilisateur
  const loadUserProfile = useCallback(async (authUser: User): Promise<AuthUser> => {
    const { profile, error } = await AuthService.loadUserProfile(authUser.id);

    if (error) {
      console.error('Failed to load user profile:', error);
      return authUser; // Retourner l'utilisateur sans profil
    }

    return { ...authUser, profile };
  }, []);

  // Connexion
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { user, error } = await AuthService.signIn(email, password);

      if (error || !user) {
        throw new Error(error?.message || 'Login failed');
      }

      const userWithProfile = await loadUserProfile(user);

      setState({
        user: userWithProfile,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [loadUserProfile]);

  // Déconnexion
  const logout = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));

    // Mark this as a manual logout to prevent "session expired" message
    sessionManager.markManualLogout();

    try {
      const { error } = await AuthService.signOut();

      if (error) {
        console.error('Logout error:', error);
      }

      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Unexpected logout error:', error);
      // Force logout même en cas d'erreur
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  // Vérifier l'authentification
  const checkAuth = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { user, error } = await AuthService.getCurrentUser();

      if (error || !user) {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
        return false;
      }

      const userWithProfile = await loadUserProfile(user);

      setState({
        user: userWithProfile,
        isLoading: false,
        isAuthenticated: true,
      });

      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return false;
    }
  }, [loadUserProfile]);

  // Mettre à jour le profil
  const updateProfile = useCallback(async (updates: Partial<any>): Promise<void> => {
    if (!state.user?.id) {
      throw new Error('No authenticated user');
    }

    const { profile, error } = await AuthService.updateUserProfile(state.user.id, updates);

    if (error) {
      throw new Error(error.message);
    }

    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, profile } : null,
    }));
  }, [state.user?.id]);

  // Initialiser l'authentification au montage
  useEffect(() => {
    let mounted = true;

    // Vérifier l'état initial
    checkAuth();

    // Enhanced auth state change handler with event types and session monitoring
    const { data: { subscription } } = AuthService.onAuthStateChange(
      async (authUser: User | null, event?: string, session?: Session | null) => {
        if (!mounted) return;

        console.log('🔐 [useAuth] Auth state change:', event, authUser ? 'User present' : 'No user');

        // Handle different event types
        switch (event) {
          case 'SIGNED_IN':
            if (authUser) {
              const userWithProfile = await loadUserProfile(authUser);
              setState({
                user: userWithProfile,
                isLoading: false,
                isAuthenticated: true,
              });

              // Start session monitoring
              if (session) {
                sessionManager.startMonitoring(session);
              }
            }
            break;

          case 'SIGNED_OUT':
            // Don't reset state during impersonation session swap
            if (localStorage.getItem('bda-portal-impersonation-backup')) break;
            setState({
              user: null,
              isLoading: false,
              isAuthenticated: false,
            });
            // Session manager will handle notification if needed
            break;

          case 'TOKEN_REFRESHED':
            // Session was refreshed successfully
            if (session) {
              console.log('✅ [useAuth] Token refreshed successfully');
              sessionManager.startMonitoring(session);
            } else {
              // Refresh failed
              console.error('❌ [useAuth] Token refresh returned null session');
              sessionManager.handleRefreshFailure(new Error('Token refresh returned null session'));
            }
            break;

          case 'USER_UPDATED':
            // User metadata updated, reload profile
            if (authUser) {
              const userWithProfile = await loadUserProfile(authUser);
              setState(prev => ({
                ...prev,
                user: userWithProfile,
              }));
            }
            break;

          default:
            // Handle any other events or initial state
            if (authUser) {
              const userWithProfile = await loadUserProfile(authUser);
              setState({
                user: userWithProfile,
                isLoading: false,
                isAuthenticated: true,
              });
            } else {
              setState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
              });
            }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkAuth, loadUserProfile]);

  return {
    // État
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,

    // Actions
    login,
    logout,
    checkAuth,
    updateProfile,

    // Helpers
    hasRole: (role: string) => state.user?.profile?.role === role,
    isRole: (roles: string[]) => roles.includes(state.user?.profile?.role || ''),
  };
}