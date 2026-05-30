/**
 * Tests for useAuthProgress Hook
 * Covers progress step management and state transitions
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthProgress, AUTH_PROGRESS_STEPS } from '../useAuthProgress';

describe('useAuthProgress', () => {
  describe('Initialisation', () => {
    it('should initialize with default steps', () => {
      const { result } = renderHook(() => useAuthProgress());

      expect(result.current.steps).toHaveLength(3);
      expect(result.current.currentStep).toBe(0);
      expect(result.current.steps[0].status).toBe('pending');
    });

    it('should initialize with custom steps', () => {
      const customSteps = [
        { label: 'Step 1', status: 'pending' as const },
        { label: 'Step 2', status: 'pending' as const },
      ];

      const { result } = renderHook(() => useAuthProgress(customSteps));

      expect(result.current.steps).toEqual(customSteps);
      expect(result.current.steps).toHaveLength(2);
    });
  });

  describe('updateStep', () => {
    it('should update step status', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        result.current.updateStep(0, 'in_progress');
      });

      expect(result.current.steps[0].status).toBe('in_progress');
    });

    it('should update specific step without affecting others', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        result.current.updateStep(1, 'completed');
      });

      expect(result.current.steps[0].status).toBe('pending');
      expect(result.current.steps[1].status).toBe('completed');
      expect(result.current.steps[2].status).toBe('pending');
    });

    it('should handle multiple status updates', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        result.current.updateStep(0, 'in_progress');
      });

      act(() => {
        result.current.updateStep(0, 'completed');
      });

      expect(result.current.steps[0].status).toBe('completed');
    });
  });

  describe('updateStepLabel', () => {
    it('should update step label', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        result.current.updateStepLabel(0, 'New label');
      });

      expect(result.current.steps[0].label).toBe('New label');
    });

    it('should update both label and status', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        result.current.updateStepLabel(0, 'New label', 'in_progress');
      });

      expect(result.current.steps[0].label).toBe('New label');
      expect(result.current.steps[0].status).toBe('in_progress');
    });

    it('should update label without changing status if not provided', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        result.current.updateStep(0, 'in_progress');
        result.current.updateStepLabel(0, 'Updated label');
      });

      expect(result.current.steps[0].label).toBe('Updated label');
      expect(result.current.steps[0].status).toBe('in_progress');
    });
  });

  describe('nextStep', () => {
    it('should move to next step', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(1);
    });

    it('should not go beyond last step', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        result.current.nextStep();
        result.current.nextStep();
        result.current.nextStep();
        result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(2);
    });
  });

  describe('goToStep', () => {
    it('should jump to specific step', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        result.current.goToStep(2);
      });

      expect(result.current.currentStep).toBe(2);
    });

    it('should allow going backwards', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        result.current.goToStep(2);
        result.current.goToStep(0);
      });

      expect(result.current.currentStep).toBe(0);
    });
  });

  describe('completeCurrentAndNext', () => {
    it('should mark current step as completed and move to next', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        result.current.completeCurrentAndNext();
      });

      expect(result.current.steps[0].status).toBe('completed');
      expect(result.current.currentStep).toBe(1);
    });

    it('should handle completion of last step', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        result.current.goToStep(2);
        result.current.completeCurrentAndNext();
      });

      expect(result.current.steps[2].status).toBe('completed');
      expect(result.current.currentStep).toBe(2);
    });
  });

  describe('failCurrentStep', () => {
    it('should mark current step as failed', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        result.current.failCurrentStep();
      });

      expect(result.current.steps[0].status).toBe('failed');
    });

    it('should not move to next step', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        result.current.failCurrentStep();
      });

      expect(result.current.currentStep).toBe(0);
    });
  });

  describe('resetProgress', () => {
    it('should reset all steps to pending', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        result.current.updateStep(0, 'completed');
        result.current.updateStep(1, 'in_progress');
        result.current.nextStep();
        result.current.resetProgress();
      });

      expect(result.current.steps.every((s) => s.status === 'pending')).toBe(true);
      expect(result.current.currentStep).toBe(0);
    });
  });

  describe('setNewSteps', () => {
    it('should replace all steps', () => {
      const { result } = renderHook(() => useAuthProgress());

      const newSteps = [
        { label: 'New Step 1', status: 'pending' as const },
        { label: 'New Step 2', status: 'pending' as const },
      ];

      act(() => {
        result.current.setNewSteps(newSteps);
      });

      expect(result.current.steps).toEqual(newSteps);
      expect(result.current.steps).toHaveLength(2);
      expect(result.current.currentStep).toBe(0);
    });
  });

  describe('Pre-configured Steps', () => {
    it('should have LOGIN steps', () => {
      expect(AUTH_PROGRESS_STEPS.LOGIN).toHaveLength(3);
      expect(AUTH_PROGRESS_STEPS.LOGIN[0].label).toContain('Verifying');
      expect(AUTH_PROGRESS_STEPS.LOGIN[1].label).toContain('Loading');
      expect(AUTH_PROGRESS_STEPS.LOGIN[2].label).toContain('Syncing');
    });

    it('should have SIGNUP steps', () => {
      expect(AUTH_PROGRESS_STEPS.SIGNUP).toHaveLength(3);
      expect(AUTH_PROGRESS_STEPS.SIGNUP[0].label).toContain('Creating');
    });

    it('should have SIGNUP_WITH_STORE steps', () => {
      expect(AUTH_PROGRESS_STEPS.SIGNUP_WITH_STORE).toHaveLength(4);
      expect(AUTH_PROGRESS_STEPS.SIGNUP_WITH_STORE[2].label).toContain('Linking');
    });

    it('should have CONFLICT_RESOLUTION steps', () => {
      expect(AUTH_PROGRESS_STEPS.CONFLICT_RESOLUTION).toHaveLength(4);
      expect(AUTH_PROGRESS_STEPS.CONFLICT_RESOLUTION[0].label).toContain('Verifying');
    });

    it('should initialize with pre-configured steps', () => {
      const { result } = renderHook(() =>
        useAuthProgress(AUTH_PROGRESS_STEPS.LOGIN)
      );

      expect(result.current.steps).toEqual(AUTH_PROGRESS_STEPS.LOGIN);
    });
  });

  describe('Complex Workflows', () => {
    it('should handle complete login flow', () => {
      const { result } = renderHook(() =>
        useAuthProgress(AUTH_PROGRESS_STEPS.LOGIN)
      );

      // Start verification
      act(() => {
        result.current.updateStep(0, 'in_progress');
      });
      expect(result.current.steps[0].status).toBe('in_progress');

      // Complete verification and move to loading
      act(() => {
        result.current.completeCurrentAndNext();
        result.current.updateStep(1, 'in_progress');
      });
      expect(result.current.steps[0].status).toBe('completed');
      expect(result.current.steps[1].status).toBe('in_progress');

      // Complete loading and move to syncing
      act(() => {
        result.current.completeCurrentAndNext();
        result.current.updateStep(2, 'in_progress');
      });
      expect(result.current.steps[1].status).toBe('completed');
      expect(result.current.steps[2].status).toBe('in_progress');

      // Complete syncing
      act(() => {
        result.current.completeCurrentAndNext();
      });
      expect(result.current.steps[2].status).toBe('completed');
    });

    it('should handle failure mid-flow', () => {
      const { result } = renderHook(() =>
        useAuthProgress(AUTH_PROGRESS_STEPS.SIGNUP)
      );

      act(() => {
        result.current.updateStep(0, 'in_progress');
        result.current.completeCurrentAndNext();
        result.current.updateStep(1, 'in_progress');
        result.current.failCurrentStep();
      });

      expect(result.current.steps[0].status).toBe('completed');
      expect(result.current.steps[1].status).toBe('failed');
      expect(result.current.steps[2].status).toBe('pending');
      expect(result.current.currentStep).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty steps array', () => {
      const { result } = renderHook(() => useAuthProgress([]));

      expect(result.current.steps).toHaveLength(0);
      expect(result.current.currentStep).toBe(0);
    });

    it('should handle single step', () => {
      const { result } = renderHook(() =>
        useAuthProgress([{ label: 'Only step', status: 'pending' }])
      );

      act(() => {
        result.current.completeCurrentAndNext();
      });

      expect(result.current.steps[0].status).toBe('completed');
      expect(result.current.currentStep).toBe(0);
    });

    it('should handle rapid status changes', () => {
      const { result } = renderHook(() => useAuthProgress());

      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.updateStep(0, i % 2 === 0 ? 'in_progress' : 'pending');
        }
      });

      expect(result.current.steps[0].status).toBe('pending');
    });
  });
});
