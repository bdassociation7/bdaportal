/**
 * Tests for Auth Error Codes
 * Covers error code mapping, structured errors, and user messages
 */

import { describe, it, expect } from 'vitest';
import {
  AUTH_ERROR_CODES,
  createStructuredError,
  mapErrorToCode,
  isRecoverableError,
  getUserMessage,
  AUTH_ERROR_MESSAGES,
} from '../auth-error-codes';

describe('Auth Error Codes', () => {
  describe('Error Code Constants', () => {
    it('should have unique error codes', () => {
      const codes = Object.values(AUTH_ERROR_CODES);
      const uniqueCodes = new Set(codes);

      expect(codes.length).toBe(uniqueCodes.size);
    });

    it('should have codes in correct ranges', () => {
      expect(AUTH_ERROR_CODES.NETWORK_TIMEOUT).toMatch(/AUTH_10\d{2}/);
      expect(AUTH_ERROR_CODES.INVALID_CREDENTIALS).toMatch(/AUTH_20\d{2}/);
      expect(AUTH_ERROR_CODES.WP_API_DOWN).toMatch(/AUTH_30\d{2}/);
      expect(AUTH_ERROR_CODES.PORTAL_CREATION_FAILED).toMatch(/AUTH_40\d{2}/);
      expect(AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED).toMatch(/AUTH_50\d{2}/);
      expect(AUTH_ERROR_CODES.UNKNOWN_ERROR).toBe('AUTH_9999');
    });
  });

  describe('createStructuredError', () => {
    it('should create error with all fields', () => {
      const error = createStructuredError(
        AUTH_ERROR_CODES.NETWORK_TIMEOUT,
        new Error('Request timeout'),
        { endpoint: '/api/auth', statusCode: 408 }
      );

      expect(error.code).toBe(AUTH_ERROR_CODES.NETWORK_TIMEOUT);
      expect(error.message).toBeTruthy();
      expect(error.userMessage).toBeTruthy();
      expect(error.recoverable).toBe(true);
      expect(error.suggestedAction).toBeTruthy();
      expect(error.debugInfo).toBeDefined();
      expect(error.debugInfo?.timestamp).toBeTruthy();
      expect(error.debugInfo?.endpoint).toBe('/api/auth');
      expect(error.debugInfo?.statusCode).toBe(408);
    });

    it('should create error without original error', () => {
      const error = createStructuredError(AUTH_ERROR_CODES.INVALID_CREDENTIALS);

      expect(error.code).toBe(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      expect(error.debugInfo?.originalError).toBeUndefined();
    });

    it('should create error without additional context', () => {
      const error = createStructuredError(
        AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND,
        new Error('User not found')
      );

      expect(error.code).toBe(AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND);
      expect(error.debugInfo?.originalError).toBeDefined();
    });

    it('should handle unknown error codes gracefully', () => {
      const error = createStructuredError('INVALID_CODE' as any);

      expect(error.code).toBe('INVALID_CODE');
      expect(error.message).toBeTruthy();
    });
  });

  describe('mapErrorToCode', () => {
    it('should map network timeout errors', () => {
      expect(mapErrorToCode('Request timeout')).toBe(AUTH_ERROR_CODES.NETWORK_TIMEOUT);
      expect(mapErrorToCode('Connection timed out')).toBe(AUTH_ERROR_CODES.NETWORK_TIMEOUT);
    });

    it('should map network unavailable errors', () => {
      expect(mapErrorToCode('Network unavailable')).toBe(
        AUTH_ERROR_CODES.NETWORK_UNAVAILABLE
      );
      expect(mapErrorToCode('You are offline')).toBe(
        AUTH_ERROR_CODES.NETWORK_UNAVAILABLE
      );
    });

    it('should map connection refused errors', () => {
      expect(mapErrorToCode('ECONNREFUSED')).toBe(AUTH_ERROR_CODES.CONNECTION_REFUSED);
      expect(mapErrorToCode('Connection refused by server')).toBe(
        AUTH_ERROR_CODES.CONNECTION_REFUSED
      );
    });

    it('should map invalid credentials errors', () => {
      expect(mapErrorToCode('Invalid login credentials')).toBe(
        AUTH_ERROR_CODES.INVALID_CREDENTIALS
      );
      expect(mapErrorToCode('Invalid credentials provided')).toBe(
        AUTH_ERROR_CODES.INVALID_CREDENTIALS
      );
    });

    it('should map user not found errors', () => {
      expect(mapErrorToCode('User not found')).toBe(
        AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND
      );
      expect(mapErrorToCode('Account not found in database')).toBe(
        AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND
      );
    });

    it('should map email verification errors', () => {
      expect(mapErrorToCode('Email not confirmed')).toBe(
        AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED
      );
      expect(mapErrorToCode('Please verify your email')).toBe(
        AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED
      );
    });

    it('should map token expired errors', () => {
      expect(mapErrorToCode('Session has expired')).toBe(
        AUTH_ERROR_CODES.TOKEN_EXPIRED
      );
    });

    it('should map email already exists errors', () => {
      expect(mapErrorToCode('Email already exists')).toBe(
        AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS
      );
      expect(mapErrorToCode('Email already registered')).toBe(
        AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS
      );
    });

    it('should map rate limit errors', () => {
      expect(mapErrorToCode('Too many requests')).toBe(
        AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS
      );
      expect(mapErrorToCode('Rate limit exceeded')).toBe(
        AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS
      );
    });

    it('should return UNKNOWN_ERROR for unrecognised messages', () => {
      expect(mapErrorToCode('Something went wrong')).toBe(
        AUTH_ERROR_CODES.UNKNOWN_ERROR
      );
      expect(mapErrorToCode('Random error message')).toBe(
        AUTH_ERROR_CODES.UNKNOWN_ERROR
      );
    });

    it('should be case-insensitive', () => {
      expect(mapErrorToCode('INVALID LOGIN CREDENTIALS')).toBe(
        AUTH_ERROR_CODES.INVALID_CREDENTIALS
      );
      expect(mapErrorToCode('Network Unavailable')).toBe(
        AUTH_ERROR_CODES.NETWORK_UNAVAILABLE
      );
    });
  });

  describe('isRecoverableError', () => {
    it('should return true for recoverable errors', () => {
      const error = createStructuredError(AUTH_ERROR_CODES.NETWORK_TIMEOUT);
      expect(isRecoverableError(error)).toBe(true);
    });

    it('should return false for non-recoverable errors', () => {
      const error = createStructuredError(AUTH_ERROR_CODES.ACCOUNT_LOCKED);
      expect(isRecoverableError(error)).toBe(false);
    });

    it('should return false for account linking failures', () => {
      const error = createStructuredError(AUTH_ERROR_CODES.ACCOUNT_LINKING_FAILED);
      expect(isRecoverableError(error)).toBe(false);
    });
  });

  describe('getUserMessage', () => {
    it('should return user message from structured error', () => {
      const error = createStructuredError(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      const message = getUserMessage(error);

      expect(message).toBe(error.userMessage);
      expect(message).not.toBe(error.message);
    });

    it('should return message from regular error object', () => {
      const error = { message: 'Regular error' };
      const message = getUserMessage(error as any);

      expect(message).toBe('Regular error');
    });

    it('should return default message for empty error', () => {
      const error = {};
      const message = getUserMessage(error as any);

      expect(message).toBe('An error occurred');
    });
  });

  describe('AUTH_ERROR_MESSAGES', () => {
    it('should have messages for all error codes', () => {
      const codes = Object.values(AUTH_ERROR_CODES);

      codes.forEach((code) => {
        expect(AUTH_ERROR_MESSAGES[code]).toBeDefined();
        expect(AUTH_ERROR_MESSAGES[code].user).toBeTruthy();
        expect(AUTH_ERROR_MESSAGES[code].debug).toBeTruthy();
        expect(typeof AUTH_ERROR_MESSAGES[code].recoverable).toBe('boolean');
      });
    });

    it('should have user-friendly messages', () => {
      Object.values(AUTH_ERROR_MESSAGES).forEach((meta) => {
        // User messages should not contain technical terms
        expect(meta.user).not.toMatch(/AUTH_\d+/);
        expect(meta.user).not.toMatch(/\{.*\}/);
        expect(meta.user.length).toBeGreaterThan(10);
      });
    });

    it('should have suggested actions for recoverable errors', () => {
      Object.entries(AUTH_ERROR_MESSAGES).forEach(([code, meta]) => {
        if (meta.recoverable) {
          expect(meta.action).toBeTruthy();
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined error messages', () => {
      expect(mapErrorToCode('')).toBe(AUTH_ERROR_CODES.UNKNOWN_ERROR);
      expect(mapErrorToCode(null as any)).toBe(AUTH_ERROR_CODES.UNKNOWN_ERROR);
    });

    it('should handle very long error messages', () => {
      const longMessage = 'a'.repeat(10000) + 'timeout';
      expect(mapErrorToCode(longMessage)).toBe(AUTH_ERROR_CODES.NETWORK_TIMEOUT);
    });

    it('should handle special characters in error messages', () => {
      expect(mapErrorToCode('Invalid@#$%credentials!')).toBe(
        AUTH_ERROR_CODES.INVALID_CREDENTIALS
      );
    });
  });
});
