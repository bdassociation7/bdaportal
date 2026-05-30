/**
 * Tests for useSessionExpiry Hook
 * Covers session expiry handling, toast notifications, and navigation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSessionExpiry } from '../useSessionExpiry';
import { SessionManager, SessionEvent } from '@/services/session-manager.service';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(),
}));

vi.mock('@/services/session-manager.service', () => ({
  SessionManager: {
    getInstance: vi.fn(),
  },
  SessionEvent: {
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    SESSION_WARNING: 'SESSION_WARNING',
    TOKEN_REFRESH_FAILED: 'TOKEN_REFRESH_FAILED',
    MANUAL_LOGOUT: 'MANUAL_LOGOUT',
  },
}));

describe('useSessionExpiry', () => {
  let mockNavigate: ReturnType<typeof vi.fn>;
  let mockToast: ReturnType<typeof vi.fn>;
  let mockSubscribe: ReturnType<typeof vi.fn>;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;
  let mockSessionManager: any;

  beforeEach(() => {
    mockNavigate = vi.fn();
    mockToast = vi.fn();
    mockUnsubscribe = vi.fn();
    mockSubscribe = vi.fn(() => mockUnsubscribe);

    mockSessionManager = {
      subscribe: mockSubscribe,
    };

    (useNavigate as any).mockReturnValue(mockNavigate);
    (useToast as any).mockReturnValue({ toast: mockToast });
    (SessionManager.getInstance as any).mockReturnValue(mockSessionManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialisation', () => {
    it('should subscribe to session manager on mount', () => {
      renderHook(() => useSessionExpiry());

      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('should unsubscribe on unmount', () => {
      const { unmount } = renderHook(() => useSessionExpiry());

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Session Expired Handling', () => {
    it('should show toast notification on session expiry', async () => {
      const { rerender } = renderHook(() => useSessionExpiry());

      // Get the event listener
      const listener = mockSubscribe.mock.calls[0][0];

      // Trigger session expired event
      listener({
        type: SessionEvent.SESSION_EXPIRED,
        payload: {},
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Session Expired'),
            variant: expect.any(String),
          })
        );
      });
    });

    it('should navigate to login on session expiry', async () => {
      renderHook(() => useSessionExpiry());

      const listener = mockSubscribe.mock.calls[0][0];

      listener({
        type: SessionEvent.SESSION_EXPIRED,
        payload: {},
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          '/login',
          expect.objectContaining({
            state: expect.objectContaining({
              sessionExpired: true,
            }),
          })
        );
      });
    });

    it('should call custom onSessionExpired callback if provided', async () => {
      const onSessionExpired = vi.fn();

      renderHook(() => useSessionExpiry({ onSessionExpired }));

      const listener = mockSubscribe.mock.calls[0][0];

      listener({
        type: SessionEvent.SESSION_EXPIRED,
        payload: {},
      });

      await waitFor(() => {
        expect(onSessionExpired).toHaveBeenCalled();
      });
    });
  });

  describe('Session Warning Handling', () => {
    it('should show warning toast when session expiring soon', async () => {
      renderHook(() => useSessionExpiry({ showWarningDialog: true }));

      const listener = mockSubscribe.mock.calls[0][0];

      listener({
        type: SessionEvent.SESSION_WARNING,
        payload: { minutesRemaining: 5 },
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Session Expiring'),
            variant: 'default',
          })
        );
      });
    });

    it('should not show warning if showWarningDialog is false', async () => {
      renderHook(() => useSessionExpiry({ showWarningDialog: false }));

      const listener = mockSubscribe.mock.calls[0][0];

      listener({
        type: SessionEvent.SESSION_WARNING,
        payload: { minutesRemaining: 5 },
      });

      // Wait a bit to ensure no call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockToast).not.toHaveBeenCalled();
    });

    it('should call custom onSessionWarning callback if provided', async () => {
      const onSessionWarning = vi.fn();

      renderHook(() =>
        useSessionExpiry({ showWarningDialog: true, onSessionWarning })
      );

      const listener = mockSubscribe.mock.calls[0][0];

      listener({
        type: SessionEvent.SESSION_WARNING,
        payload: { minutesRemaining: 5 },
      });

      await waitFor(() => {
        expect(onSessionWarning).toHaveBeenCalledWith(5);
      });
    });
  });

  describe('Token Refresh Failed Handling', () => {
    it('should show error toast on token refresh failure', async () => {
      renderHook(() => useSessionExpiry());

      const listener = mockSubscribe.mock.calls[0][0];

      listener({
        type: SessionEvent.TOKEN_REFRESH_FAILED,
        payload: { error: new Error('Refresh failed') },
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Session Error'),
            variant: 'destructive',
          })
        );
      });
    });

    it('should navigate to login on token refresh failure', async () => {
      renderHook(() => useSessionExpiry());

      const listener = mockSubscribe.mock.calls[0][0];

      listener({
        type: SessionEvent.TOKEN_REFRESH_FAILED,
        payload: { error: new Error('Refresh failed') },
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          '/login',
          expect.objectContaining({
            state: expect.objectContaining({
              tokenRefreshFailed: true,
            }),
          })
        );
      });
    });
  });

  describe('Manual Logout Handling', () => {
    it('should not show toast on manual logout', async () => {
      renderHook(() => useSessionExpiry());

      const listener = mockSubscribe.mock.calls[0][0];

      listener({
        type: SessionEvent.MANUAL_LOGOUT,
        payload: {},
      });

      // Wait a bit to ensure no call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockToast).not.toHaveBeenCalled();
    });

    it('should not navigate on manual logout', async () => {
      renderHook(() => useSessionExpiry());

      const listener = mockSubscribe.mock.calls[0][0];

      listener({
        type: SessionEvent.MANUAL_LOGOUT,
        payload: {},
      });

      // Wait a bit to ensure no call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown event types gracefully', async () => {
      renderHook(() => useSessionExpiry());

      const listener = mockSubscribe.mock.calls[0][0];

      expect(() => {
        listener({
          type: 'UNKNOWN_EVENT',
          payload: {},
        });
      }).not.toThrow();
    });

    it('should handle missing payload gracefully', async () => {
      renderHook(() => useSessionExpiry());

      const listener = mockSubscribe.mock.calls[0][0];

      expect(() => {
        listener({
          type: SessionEvent.SESSION_EXPIRED,
          payload: undefined,
        });
      }).not.toThrow();
    });

    it('should handle multiple rapid events', async () => {
      renderHook(() => useSessionExpiry());

      const listener = mockSubscribe.mock.calls[0][0];

      // Trigger multiple events rapidly
      for (let i = 0; i < 10; i++) {
        listener({
          type: SessionEvent.SESSION_WARNING,
          payload: { minutesRemaining: 5 },
        });
      }

      // Should handle without crashing
      expect(mockToast.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
