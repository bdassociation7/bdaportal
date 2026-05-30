// BDA Portal Authentication System
// DEVELOPMENT MODE: Authentication disabled for local testing

export interface User {
  id: number;
  email: string;
  username: string;
  displayName: string;
  roles: string[];
}

export interface AuthResponse {
  token: string;
  user_email: string;
  user_nicename: string;
  user_display_name: string;
  user_roles?: string[];
}

export interface AuthError {
  code: string;
  message: string;
  data?: {
    status: number;
  };
}

class AuthTokenManager {
  private accessToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  private tokenExpiry: number | null = null;

  // DEVELOPMENT MODE: Skip real authentication
  private readonly DEV_MODE = true;

  // WordPress JWT API endpoints
  private readonly WP_BASE_URL = 'https://bda-global.org';
  private readonly TOKEN_ENDPOINT = '/wp-json/jwt-auth/v1/token';
  private readonly VALIDATE_ENDPOINT = '/wp-json/jwt-auth/v1/token/validate';

  // Store access token with persistence for page reloads
  setAccessToken(token: string, expiryMinutes: number = 24 * 60) {
    this.accessToken = token;
    this.tokenExpiry = Date.now() + (expiryMinutes * 60 * 1000);
    
    // Store in sessionStorage for page reload persistence
    const tokenData = {
      token,
      expiry: this.tokenExpiry
    };
    sessionStorage.setItem('bda_token', JSON.stringify(tokenData));
    
    // Auto-clear token after expiry
    setTimeout(() => {
      this.clearToken();
    }, expiryMinutes * 60 * 1000);
  }

  getAccessToken(): string | null {
    // If no token in memory, try to restore from sessionStorage
    if (!this.accessToken) {
      this.restoreTokenFromStorage();
    }
    
    // Check if token is expired
    if (this.tokenExpiry && Date.now() > this.tokenExpiry) {
      this.clearToken();
      return null;
    }
    
    return this.accessToken;
  }

  // Restore token from sessionStorage after page reload
  private restoreTokenFromStorage() {
    try {
      const tokenData = sessionStorage.getItem('bda_token');
      if (tokenData) {
        const { token, expiry } = JSON.parse(tokenData);
        
        // Check if stored token is still valid
        if (expiry && Date.now() < expiry) {
          this.accessToken = token;
          this.tokenExpiry = expiry;
        } else {
          // Remove expired token
          sessionStorage.removeItem('bda_token');
        }
      }
    } catch (error) {
      console.error('Failed to restore token from storage:', error);
      sessionStorage.removeItem('bda_token');
    }
  }

  isTokenValid(): boolean {
    // DEVELOPMENT MODE: Always return true
    if (this.DEV_MODE) return true;
    return this.getAccessToken() !== null;
  }

  clearToken() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.refreshPromise = null;
    sessionStorage.removeItem('bda_token');
  }

  // Authenticate with WordPress
  async login(username: string, password: string): Promise<User> {
    // DEVELOPMENT MODE: Return mock user without real authentication
    if (this.DEV_MODE) {
      const mockUser: User = {
        id: 1,
        email: 'developer@bda-global.org',
        username: 'developer',
        displayName: 'BDA Developer',
        roles: ['member', 'developer'],
      };

      // Store mock token
      this.setAccessToken('dev-token-123');

      // Store user data in sessionStorage
      sessionStorage.setItem('bda_user', JSON.stringify(mockUser));

      return mockUser;
    }

    try {
      const response = await fetch(`${this.WP_BASE_URL}${this.TOKEN_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        const error: AuthError = await response.json();

        // Decode HTML entities and clean up the error message
        let cleanMessage = error.message || 'Authentication failed';

        // Decode HTML entities
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanMessage;
        cleanMessage = tempDiv.textContent || tempDiv.innerText || cleanMessage;

        // Extract clean message from WordPress error format
        if (cleanMessage.includes('The username') && cleanMessage.includes('is not registered')) {
          cleanMessage = 'Username not found. Try your email address instead.';
        } else if (cleanMessage.includes('incorrect password')) {
          cleanMessage = 'Incorrect password. Please try again.';
        } else if (cleanMessage.includes('empty username') || cleanMessage.includes('empty password')) {
          cleanMessage = 'Please enter both username and password.';
        }

        throw new Error(cleanMessage);
      }

      const authData: AuthResponse = await response.json();

      // Store token securely in memory
      this.setAccessToken(authData.token);

      // Get full user data from WordPress API
      let user: User = {
        id: 0,
        email: authData.user_email,
        username: authData.user_nicename,
        displayName: authData.user_display_name,
        roles: authData.user_roles || [],
      };

      // Try to get additional user data from WordPress API
      try {
        const userResponse = await fetch(`${this.WP_BASE_URL}/wp-json/wp/v2/users/me`, {
          headers: {
            'Authorisation': `Bearer ${authData.token}`,
            'Content-Type': 'application/json',
          },
        });

        if (userResponse.ok) {
          const wpUser = await userResponse.json();
          user = {
            id: wpUser.id,
            email: wpUser.email || authData.user_email,
            username: wpUser.username || authData.user_nicename,
            displayName: wpUser.name || authData.user_display_name,
            roles: wpUser.roles || authData.user_roles || [],
          };
        }
      } catch (error) {
        console.warn('Could not fetch extended user data:', error);
        // Continue with basic user data from JWT
      }

      // Store user data in sessionStorage for persistence across tabs
      sessionStorage.setItem('bda_user', JSON.stringify(user));

      return user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Validate current token with WordPress
  async validateToken(): Promise<boolean> {
    // DEVELOPMENT MODE: Always return true
    if (this.DEV_MODE) return true;

    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const response = await fetch(`${this.WP_BASE_URL}${this.VALIDATE_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorisation': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  // Get current user from session
  getCurrentUser(): User | null {
    // DEVELOPMENT MODE: Return mock user if no user in storage
    if (this.DEV_MODE) {
      try {
        const userData = sessionStorage.getItem('bda_user');
        if (userData) {
          return JSON.parse(userData);
        }
        // Return mock user for development
        const mockUser: User = {
          id: 1,
          email: 'developer@bda-global.org',
          username: 'developer',
          displayName: 'BDA Developer',
          roles: ['member', 'developer'],
        };
        sessionStorage.setItem('bda_user', JSON.stringify(mockUser));
        return mockUser;
      } catch {
        return null;
      }
    }

    try {
      const userData = sessionStorage.getItem('bda_user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  // Logout and clear all data
  logout() {
    this.clearToken();
    sessionStorage.removeItem('bda_user');
    
    // Redirect to login
    window.location.href = '/login';
  }

  // Clear token without redirect (for internal use)
  clearSession() {
    this.clearToken();
    sessionStorage.removeItem('bda_user');
  }

  // Get authorization headers for API calls
  getAuthHeaders(): Record<string, string> {
    const token = this.getAccessToken();
    return token
      ? {
          'Authorisation': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      : {
          'Content-Type': 'application/json',
        };
  }

  // Make authenticated request to WordPress API
  async authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getAccessToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`${this.WP_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      credentials: 'include',
    });

    // Handle token expiry
    if (response.status === 401) {
      this.logout();
      throw new Error('Authentication expired');
    }

    return response;
  }
}

// Export singleton instance
export const authManager = new AuthTokenManager();

// Utility functions
export const isAuthenticated = () => authManager.isTokenValid();
export const getCurrentUser = () => authManager.getCurrentUser();
export const logout = () => authManager.logout();