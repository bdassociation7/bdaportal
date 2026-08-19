import { useCallback, useEffect, useRef, useState } from 'react';
import { CertificationExamService } from '@/entities/quiz';

interface SecureExamSessionState {
  ready: boolean;
  sessionToken: string | null;
  error: string | null;
  violations: number;
  flaggedForReview: boolean;
  enterFullscreen: () => Promise<void>;
}

function buildDeviceFingerprint(): string {
  const source = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    `${window.screen.width}x${window.screen.height}`,
    String(window.screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency || 0),
  ].join('|');

  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }
  return `bda-secure-${Math.abs(hash).toString(16)}-${source.length}`;
}

export function useSecureCertificationExamSession(
  attemptId: string | undefined,
  isActive: boolean,
  isCompleted: boolean,
): SecureExamSessionState {
  const [ready, setReady] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [violations, setViolations] = useState(0);
  const [flaggedForReview, setFlaggedForReview] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const fullscreenWasEnteredRef = useRef(false);

  const recordEvent = useCallback(async (eventType: string, eventData: Record<string, unknown> = {}) => {
    if (!attemptId || !tokenRef.current) return;
    const result = await CertificationExamService.recordSecureEvent(attemptId, tokenRef.current, eventType, eventData);
    if (result.data) {
      setViolations(result.data.suspicious_activity_count);
      setFlaggedForReview(result.data.flagged_for_review);
    }
  }, [attemptId]);

  useEffect(() => {
    if (!attemptId || !isActive || isCompleted) return;

    let cancelled = false;
    const sessionStorageKey = `bda-secure-exam-session:${attemptId}`;
    const initialise = async () => {
      setReady(false);
      setError(null);
      const result = await CertificationExamService.beginSecureSession(
        attemptId,
        buildDeviceFingerprint(),
        CertificationExamService.getBrowserInfo(),
      );

      if (cancelled) return;
      if (result.error || !result.data?.session_token) {
        setError(result.error?.message || 'Secure Exam Mode could not be started.');
        return;
      }

      tokenRef.current = result.data.session_token;
      setSessionToken(result.data.session_token);
      sessionStorage.setItem(sessionStorageKey, result.data.session_token);
      setReady(true);
      await recordEvent('secure_mode_ready', { fullscreen_supported: Boolean(document.documentElement.requestFullscreen) });
    };

    void initialise();
    return () => {
      cancelled = true;
    };
  }, [attemptId, isActive, isCompleted, recordEvent]);

  useEffect(() => {
    if (!attemptId || !isActive || isCompleted || !tokenRef.current) return;

    const heartbeat = async () => {
      if (!tokenRef.current) return;
      const result = await CertificationExamService.secureHeartbeat(attemptId, tokenRef.current);
      if (result.error) {
        setError(result.error.message || 'The secure exam session could not be verified.');
      } else if (result.data) {
        setFlaggedForReview(result.data.flagged_for_review);
      }
    };

    const intervalId = window.setInterval(() => void heartbeat(), 30_000);
    return () => window.clearInterval(intervalId);
  }, [attemptId, isActive, isCompleted, ready]);

  useEffect(() => {
    if (!ready || !isActive || isCompleted) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void recordEvent('visibility_hidden');
    };
    const onWindowBlur = () => void recordEvent('window_blur');
    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        fullscreenWasEnteredRef.current = true;
        void recordEvent('fullscreen_entered');
      } else if (fullscreenWasEnteredRef.current) {
        void recordEvent('fullscreen_exited');
      }
    };
    const onClipboard = (event: ClipboardEvent) => {
      event.preventDefault();
      const type = event.type === 'copy' ? 'copy_blocked' : event.type === 'cut' ? 'cut_blocked' : 'paste_blocked';
      void recordEvent(type);
    };
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      void recordEvent('context_menu_blocked');
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ['c', 'x', 'v', 'p'].includes(key)) {
        event.preventDefault();
        const type = key === 'c' ? 'copy_blocked' : key === 'x' ? 'cut_blocked' : key === 'v' ? 'paste_blocked' : 'print_blocked';
        void recordEvent(type);
      }
      if (event.key === 'F12') {
        event.preventDefault();
        void recordEvent('context_menu_blocked', { source: 'keyboard' });
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('copy', onClipboard);
    document.addEventListener('cut', onClipboard);
    document.addEventListener('paste', onClipboard);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('copy', onClipboard);
      document.removeEventListener('cut', onClipboard);
      document.removeEventListener('paste', onClipboard);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ready, isActive, isCompleted, recordEvent]);

  useEffect(() => {
    if (!attemptId || !isCompleted || !tokenRef.current) return;
    void CertificationExamService.endSecureSession(attemptId, tokenRef.current, 'exam_completed');
    tokenRef.current = null;
    setSessionToken(null);
  }, [attemptId, isCompleted]);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      await recordEvent('fullscreen_exited', { reason: 'request_rejected' });
    }
  }, [recordEvent]);

  return { ready, sessionToken, error, violations, flaggedForReview, enterFullscreen };
}
