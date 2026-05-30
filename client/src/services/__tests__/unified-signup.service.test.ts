/**
 * Tests for UnifiedSignupService - Conflict Resolution
 * Covers resolveConflictsAndLink functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnifiedSignupService } from '../unified-signup.service';
import { AuthService } from '@/entities/auth/auth.service';
import { WordPressAPIService } from '../wordpress-api.service';

// Mock dependencies
vi.mock('@/entities/auth/auth.service');
vi.mock('../wordpress-api.service');

describe('UnifiedSignupService - Conflict Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveConflictsAndLink', () => {
    const mockRequest = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      accessType: 'both' as const,
      role: 'individual' as const,
      organization: 'Test Org',
    };

    it('should successfully resolve conflicts and link accounts', async () => {
      // Mock Portal sign in
      (AuthService.signIn as any).mockResolvedValue({
        user: { id: 'portal-user-id', email: 'test@example.com' },
      });

      // Mock WordPress credentials verification
      (WordPressAPIService.verifyCredentials as any).mockResolvedValue({
        success: true,
        user: { id: 123, email: 'test@example.com' },
      });

      // Mock Portal profile update
      (AuthService.updateUserProfile as any).mockResolvedValue({
        success: true,
      });

      // Mock Store profile sync
      (WordPressAPIService.syncProfile as any).mockResolvedValue({
        success: true,
      });

      // Mock account linking
      (AuthService.linkWordPressAccount as any).mockResolvedValue({
        success: true,
      });

      const result = await UnifiedSignupService.resolveConflictsAndLink(mockRequest);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully updated');
      expect(AuthService.signIn).toHaveBeenCalledWith(
        mockRequest.email,
        mockRequest.password
      );
      expect(WordPressAPIService.verifyCredentials).toHaveBeenCalled();
      expect(AuthService.updateUserProfile).toHaveBeenCalled();
      expect(WordPressAPIService.syncProfile).toHaveBeenCalled();
    });

    it('should fail if Portal credentials are invalid', async () => {
      (AuthService.signIn as any).mockRejectedValue(
        new Error('Invalid credentials')
      );

      const result = await UnifiedSignupService.resolveConflictsAndLink(mockRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Portal credentials');
      expect(WordPressAPIService.verifyCredentials).not.toHaveBeenCalled();
    });

    it('should fail if Store credentials are invalid', async () => {
      (AuthService.signIn as any).mockResolvedValue({
        user: { id: 'portal-user-id' },
      });

      (WordPressAPIService.verifyCredentials as any).mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const result = await UnifiedSignupService.resolveConflictsAndLink(mockRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Store credentials');
      expect(AuthService.updateUserProfile).not.toHaveBeenCalled();
    });

    it('should fail if Portal update fails', async () => {
      (AuthService.signIn as any).mockResolvedValue({
        user: { id: 'portal-user-id' },
      });

      (WordPressAPIService.verifyCredentials as any).mockResolvedValue({
        success: true,
        user: { id: 123 },
      });

      (AuthService.updateUserProfile as any).mockRejectedValue(
        new Error('Update failed')
      );

      const result = await UnifiedSignupService.resolveConflictsAndLink(mockRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Portal account');
      expect(WordPressAPIService.syncProfile).not.toHaveBeenCalled();
    });

    it('should continue with degraded mode if Store update fails', async () => {
      (AuthService.signIn as any).mockResolvedValue({
        user: { id: 'portal-user-id' },
      });

      (WordPressAPIService.verifyCredentials as any).mockResolvedValue({
        success: true,
        user: { id: 123 },
      });

      (AuthService.updateUserProfile as any).mockResolvedValue({
        success: true,
      });

      (WordPressAPIService.syncProfile as any).mockRejectedValue(
        new Error('Sync failed')
      );

      (AuthService.linkWordPressAccount as any).mockResolvedValue({
        success: true,
      });

      const result = await UnifiedSignupService.resolveConflictsAndLink(mockRequest);

      expect(result.success).toBe(true);
      expect(result.message).toContain('degraded mode');
      expect(AuthService.linkWordPressAccount).toHaveBeenCalled();
    });

    it('should continue if account linking fails', async () => {
      (AuthService.signIn as any).mockResolvedValue({
        user: { id: 'portal-user-id' },
      });

      (WordPressAPIService.verifyCredentials as any).mockResolvedValue({
        success: true,
        user: { id: 123 },
      });

      (AuthService.updateUserProfile as any).mockResolvedValue({
        success: true,
      });

      (WordPressAPIService.syncProfile as any).mockResolvedValue({
        success: true,
      });

      (AuthService.linkWordPressAccount as any).mockRejectedValue(
        new Error('Linking failed')
      );

      const result = await UnifiedSignupService.resolveConflictsAndLink(mockRequest);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully updated');
    });

    it('should return detailed message with updated fields', async () => {
      (AuthService.signIn as any).mockResolvedValue({
        user: { id: 'portal-user-id' },
      });

      (WordPressAPIService.verifyCredentials as any).mockResolvedValue({
        success: true,
        user: { id: 123 },
      });

      (AuthService.updateUserProfile as any).mockResolvedValue({
        success: true,
      });

      (WordPressAPIService.syncProfile as any).mockResolvedValue({
        success: true,
      });

      (AuthService.linkWordPressAccount as any).mockResolvedValue({
        success: true,
      });

      const result = await UnifiedSignupService.resolveConflictsAndLink(mockRequest);

      expect(result.message).toContain('first name');
      expect(result.message).toContain('last name');
      expect(result.message).toContain('organisation');
    });

    it('should handle missing optional fields', async () => {
      const minimalRequest = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        accessType: 'both' as const,
        role: 'individual' as const,
      };

      (AuthService.signIn as any).mockResolvedValue({
        user: { id: 'portal-user-id' },
      });

      (WordPressAPIService.verifyCredentials as any).mockResolvedValue({
        success: true,
        user: { id: 123 },
      });

      (AuthService.updateUserProfile as any).mockResolvedValue({
        success: true,
      });

      (WordPressAPIService.syncProfile as any).mockResolvedValue({
        success: true,
      });

      const result = await UnifiedSignupService.resolveConflictsAndLink(minimalRequest);

      expect(result.success).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      (AuthService.signIn as any).mockRejectedValue(
        new Error('Network error')
      );

      const result = await UnifiedSignupService.resolveConflictsAndLink(mockRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
    });
  });
});
