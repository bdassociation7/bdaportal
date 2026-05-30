/**
 * Structured Error Code System
 * Machine-readable error codes with user-friendly messages
 * for better debugging, monitoring, and localization
 */

import type { AuthError } from '@/shared/types/auth.types';

// Error code categories
export const AUTH_ERROR_CODES = {
  // Network errors (1000-1099)
  NETWORK_TIMEOUT: 'AUTH_1001',
  NETWORK_UNAVAILABLE: 'AUTH_1002',
  API_UNREACHABLE: 'AUTH_1003',
  CONNECTION_REFUSED: 'AUTH_1004',

  // Authentication errors (2000-2099)
  INVALID_CREDENTIALS: 'AUTH_2001',
  ACCOUNT_NOT_FOUND: 'AUTH_2002',
  ACCOUNT_LOCKED: 'AUTH_2003',
  EMAIL_NOT_VERIFIED: 'AUTH_2004',
  PASSWORD_EXPIRED: 'AUTH_2005',
  SESSION_INVALID: 'AUTH_2006',
  TOKEN_EXPIRED: 'AUTH_2007',

  // WordPress-specific errors (3000-3099)
  WP_API_DOWN: 'AUTH_3001',
  WP_SESSION_FAILED: 'AUTH_3002',
  WP_SYNC_FAILED: 'AUTH_3003',
  WP_USER_NOT_FOUND: 'AUTH_3004',
  WP_CREDENTIALS_INVALID: 'AUTH_3005',

  // Account creation errors (4000-4099)
  PORTAL_CREATION_FAILED: 'AUTH_4001',
  STORE_CREATION_FAILED: 'AUTH_4002',
  ACCOUNT_LINKING_FAILED: 'AUTH_4003',
  PROFILE_UPDATE_FAILED: 'AUTH_4004',
  EMAIL_ALREADY_EXISTS: 'AUTH_4005',

  // Rate limiting (5000-5099)
  RATE_LIMIT_EXCEEDED: 'AUTH_5001',
  TOO_MANY_ATTEMPTS: 'AUTH_5002',

  // Unknown/fallback (9000-9099)
  UNKNOWN_ERROR: 'AUTH_9999',
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

/**
 * Enhanced error interface with structured data
 */
export interface StructuredAuthError extends AuthError {
  code: AuthErrorCode;
  message: string;
  userMessage: string; // Localized, user-friendly message
  debugInfo?: {
    timestamp: string;
    endpoint?: string;
    statusCode?: number;
    originalError?: any;
    stackTrace?: string;
  };
  recoverable: boolean; // Can user retry?
  suggestedAction?: string; // e.g., "Check internet connection"
}

/**
 * Error code metadata with user messages and recovery info
 */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, {
  user: string;
  debug: string;
  recoverable: boolean;
  action?: string;
}> = {
  // Network errors
  [AUTH_ERROR_CODES.NETWORK_TIMEOUT]: {
    user: "Connection timed out. Please check your internet connection.",
    debug: "Network request exceeded timeout limit",
    recoverable: true,
    action: "Check your connection and try again"
  },
  [AUTH_ERROR_CODES.NETWORK_UNAVAILABLE]: {
    user: "Unable to connect to the server. Please try again.",
    debug: "Network unavailable or connection refused",
    recoverable: true,
    action: "Check your internet connection"
  },
  [AUTH_ERROR_CODES.API_UNREACHABLE]: {
    user: "Service temporarily unavailable. Please try again later.",
    debug: "API endpoint unreachable",
    recoverable: true,
    action: "Wait a moment and retry"
  },
  [AUTH_ERROR_CODES.CONNECTION_REFUSED]: {
    user: "Connection refused. Please check your internet connection.",
    debug: "Server refused connection",
    recoverable: true,
    action: "Check firewall and network settings"
  },

  // Authentication errors
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: {
    user: "Invalid email or password. Please try again.",
    debug: "Authentication credentials rejected",
    recoverable: true,
    action: "Verify your email and password"
  },
  [AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND]: {
    user: "No account found with this email.",
    debug: "User account does not exist",
    recoverable: true,
    action: "Check your email or create an account"
  },
  [AUTH_ERROR_CODES.ACCOUNT_LOCKED]: {
    user: "Your account has been locked. Please contact support.",
    debug: "Account is locked or suspended",
    recoverable: false,
    action: "Contact support for assistance"
  },
  [AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED]: {
    user: "Please verify your email before signing in.",
    debug: "Email verification required",
    recoverable: true,
    action: "Check your email for verification link"
  },
  [AUTH_ERROR_CODES.PASSWORD_EXPIRED]: {
    user: "Your password has expired. Please reset it.",
    debug: "Password expiration policy enforced",
    recoverable: true,
    action: "Reset your password"
  },
  [AUTH_ERROR_CODES.SESSION_INVALID]: {
    user: "Your session is invalid. Please sign in again.",
    debug: "Session token is invalid or corrupted",
    recoverable: true,
    action: "Sign in again"
  },
  [AUTH_ERROR_CODES.TOKEN_EXPIRED]: {
    user: "Your session has expired. Please sign in again.",
    debug: "Authentication token has expired",
    recoverable: true,
    action: "Sign in to continue"
  },

  // WordPress errors
  [AUTH_ERROR_CODES.WP_API_DOWN]: {
    user: "Some features may be unavailable. You can still access Portal features.",
    debug: "WordPress API is down or unreachable",
    recoverable: true,
    action: "Portal will continue in limited mode"
  },
  [AUTH_ERROR_CODES.WP_SESSION_FAILED]: {
    user: "Failed to sync with Store. Portal features are still available.",
    debug: "WordPress session creation failed",
    recoverable: true,
    action: "Continue using Portal features"
  },
  [AUTH_ERROR_CODES.WP_SYNC_FAILED]: {
    user: "Account sync incomplete. Data will be synchronised later.",
    debug: "WordPress profile sync failed",
    recoverable: true,
    action: "Automatic retry will occur"
  },
  [AUTH_ERROR_CODES.WP_USER_NOT_FOUND]: {
    user: "Store account not found.",
    debug: "WordPress user does not exist",
    recoverable: true,
    action: "Create a Store account if needed"
  },
  [AUTH_ERROR_CODES.WP_CREDENTIALS_INVALID]: {
    user: "Invalid Store credentials.",
    debug: "WordPress credentials verification failed",
    recoverable: true,
    action: "Check your Store password"
  },

  // Account creation errors
  [AUTH_ERROR_CODES.PORTAL_CREATION_FAILED]: {
    user: "Failed to create Portal account. Please try again.",
    debug: "Supabase account creation failed",
    recoverable: true,
    action: "Retry account creation"
  },
  [AUTH_ERROR_CODES.STORE_CREATION_FAILED]: {
    user: "Portal account created, but Store account creation failed.",
    debug: "WordPress account creation failed",
    recoverable: true,
    action: "Continue with Portal-only access"
  },
  [AUTH_ERROR_CODES.ACCOUNT_LINKING_FAILED]: {
    user: "Accounts created but linking failed. Please contact support.",
    debug: "Account linking operation failed",
    recoverable: false,
    action: "Contact support to link accounts"
  },
  [AUTH_ERROR_CODES.PROFILE_UPDATE_FAILED]: {
    user: "Failed to update profile. Please try again.",
    debug: "Profile update operation failed",
    recoverable: true,
    action: "Retry profile update"
  },
  [AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS]: {
    user: "An account with this email already exists.",
    debug: "Email address already registered",
    recoverable: true,
    action: "Sign in or use a different email"
  },

  // Rate limiting
  [AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED]: {
    user: "Too many requests. Please wait a moment and try again.",
    debug: "Rate limit exceeded",
    recoverable: true,
    action: "Wait before retrying"
  },
  [AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS]: {
    user: "Too many failed attempts. Please try again in a few minutes.",
    debug: "Login attempt rate limit exceeded",
    recoverable: true,
    action: "Wait 5 minutes before retrying"
  },

  // Unknown
  [AUTH_ERROR_CODES.UNKNOWN_ERROR]: {
    user: "An unexpected error occurred. Please try again.",
    debug: "Unhandled error occurred",
    recoverable: true,
    action: "Retry or contact support if persists"
  },
};

/**
 * Create a structured error from a code
 */
export function createStructuredError(
  code: AuthErrorCode,
  originalError?: any,
  additionalContext?: Partial<StructuredAuthError['debugInfo']>
): StructuredAuthError {
  const metadata = AUTH_ERROR_MESSAGES[code] || AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.UNKNOWN_ERROR];

  return {
    code,
    message: metadata.debug,
    userMessage: metadata.user,
    recoverable: metadata.recoverable,
    suggestedAction: metadata.action,
    debugInfo: {
      timestamp: new Date().toISOString(),
      originalError: originalError ? {
        message: originalError.message,
        name: originalError.name,
      } : undefined,
      stackTrace: originalError?.stack,
      ...additionalContext,
    },
  };
}

/**
 * Map common error messages to error codes
 */
export function mapErrorToCode(errorMessage: string): AuthErrorCode {
  // Handle null/undefined
  if (!errorMessage || typeof errorMessage !== 'string') {
    return AUTH_ERROR_CODES.UNKNOWN_ERROR;
  }

  const message = errorMessage.toLowerCase();

  // Network errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return AUTH_ERROR_CODES.NETWORK_TIMEOUT;
  }
  if (message.includes('network') || message.includes('offline')) {
    return AUTH_ERROR_CODES.NETWORK_UNAVAILABLE;
  }
  if (message.includes('econnrefused') || message.includes('connection refused')) {
    return AUTH_ERROR_CODES.CONNECTION_REFUSED;
  }

  // Auth errors
  if (message.includes('invalid login') || message.includes('invalid') && message.includes('credential')) {
    return AUTH_ERROR_CODES.INVALID_CREDENTIALS;
  }
  if (message.includes('user not found') || message.includes('account not found')) {
    return AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND;
  }
  if (message.includes('email not confirmed') || message.includes('verify your email')) {
    return AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED;
  }
  if (message.includes('session') && message.includes('expired')) {
    return AUTH_ERROR_CODES.TOKEN_EXPIRED;
  }
  if (message.includes('already exists') || message.includes('email already registered')) {
    return AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS;
  }

  // Rate limiting
  if (message.includes('too many') || message.includes('rate limit')) {
    return AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS;
  }

  // Default
  return AUTH_ERROR_CODES.UNKNOWN_ERROR;
}

/**
 * Check if an error is recoverable (user can retry)
 */
export function isRecoverableError(error: StructuredAuthError): boolean {
  return error.recoverable;
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: StructuredAuthError | AuthError): string {
  if ('userMessage' in error) {
    return error.userMessage;
  }
  return error.message || 'An error occurred';
}
