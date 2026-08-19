/**
 * Take Certification Exam Attempt
 *
 * Production-grade exam taking experience with:
 * - State persistence (survives page refresh)
 * - Auto-save answers to database
 * - Timer based on actual start time (server-side)
 * - Resume capability
 * - Prevents re-taking completed attempts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CertificationExamService, QuizService } from '@/entities/quiz';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/shared/config/supabase.config';
import {
  Clock,
  CheckCircle,
  CheckCircle2,
  Circle,
  AlertTriangle,
  FileCheck,
  Save,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Maximize2,
  Square,
  CheckSquare,
  Send,
  FlaskConical,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/shared/utils/cn';
import { useCommonConfirms } from '@/hooks/use-confirm';
import { useSecureCertificationExamSession } from '@/hooks/useSecureCertificationExamSession';

// Auto-save interval in milliseconds (every 30 seconds)
const AUTO_SAVE_INTERVAL = 30000;

// Storage key prefix for local backup
const STORAGE_KEY_PREFIX = 'exam_attempt_';

const examTexts = {
  en: {
    certificationExam: 'Certification Exam',
    saved: 'Saved',
    saving: 'Saving...',
    question: 'Question',
    submitExam: 'Submit Exam',
    submitting: 'Submitting...',
    singleChoice: 'Single Choice',
    multipleChoice: 'Select All That Apply',
    points: 'points',
    multipleChoiceHint: 'This question has multiple correct answers. Select all that apply.',
    previous: 'Previous',
    next: 'Next',
    answered: 'Answered',
    notAnswered: 'Not answered',
    save: 'Save',
    questionNavigator: 'Question Navigator',
  },
  ar: {
    certificationExam: 'الاختبار الرسمي للشهادة',
    saved: 'تم الحفظ',
    saving: 'جارٍ الحفظ...',
    question: 'السؤال',
    submitExam: 'تقديم الاختبار',
    submitting: 'جارٍ التقديم...',
    singleChoice: 'إجابة واحدة',
    multipleChoice: 'اختر جميع الإجابات الصحيحة',
    points: 'نقطة',
    multipleChoiceHint: 'يحتوي هذا السؤال على أكثر من إجابة صحيحة. اختر جميع الإجابات الصحيحة.',
    previous: 'السابق',
    next: 'التالي',
    answered: 'تمت الإجابة',
    notAnswered: 'غير مجاب',
    save: 'حفظ',
    questionNavigator: 'مستعرض الأسئلة',
  },
};

const stripOptionPrefix = (text: string) =>
  text.replace(/^\s*(?:\(\s*)?(?:[A-Da-d]|[أبجد])\s*[)\].:،-]\s*/, '');

interface AttemptState {
  answers: Record<string, string[]>;
  currentQuestionIndex: number;
  lastSavedAt: string;
}

export default function TakeCertificationExamAttempt() {
  const { examId, attemptId } = useParams<{ examId: string; attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { confirm } = useCommonConfirms();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [attemptLoaded, setAttemptLoaded] = useState(false);
  const [attemptCompleted, setAttemptCompleted] = useState(false);
  const [attemptError, setAttemptError] = useState<string | null>(null);

  // Admin test mode
  const isAdmin = ['admin', 'super_admin'].includes((user as any)?.profile?.role || '');
  const returnPath = (location.state as any)?.adminReturnPath as string | undefined;
  const [isDiscarding, setIsDiscarding] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Storage key for this specific attempt
  const storageKey = `${STORAGE_KEY_PREFIX}${attemptId}`;

  // Hide sidebar for full-screen exam mode
  useEffect(() => {
    document.body.classList.add('exam-fullscreen-mode');
    return () => {
      document.body.classList.remove('exam-fullscreen-mode');
    };
  }, []);

  // Fetch exam data
  const { data: exam, isLoading: examLoading } = useQuery({
    queryKey: ['certification-exam', examId],
    queryFn: async () => {
      if (!examId) throw new Error('Exam ID is required');
      const result = await QuizService.getQuiz(examId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!examId,
  });
  const isArabicExam = exam?.exam_language === 'ar';
  const texts = examTexts[isArabicExam ? 'ar' : 'en'];

  // Fetch attempt data to check status and get start time
  const { data: attempt, isLoading: attemptLoading } = useQuery({
    queryKey: ['quiz-attempt', attemptId],
    queryFn: async () => {
      if (!attemptId) throw new Error('Attempt ID is required');
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!attemptId,
  });

  const secureExam = useSecureCertificationExamSession(
    attemptId,
    attempt?.status === 'in_progress',
    attemptCompleted,
  );

  // Fetch the candidate-safe, attempt-specific question set. Correct answers never leave the server.
  const { data: attemptQuestionSet, isLoading: questionSetLoading } = useQuery({
    queryKey: ['secure-exam-attempt-question-set', attemptId],
    queryFn: async () => {
      if (!attemptId) return [];
      if (!secureExam.sessionToken) throw new Error('Secure exam session is not ready');
      const { data, error } = await supabase.rpc('get_certification_attempt_questions', {
        p_attempt_id: attemptId,
        p_session_token: secureExam.sessionToken,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!attemptId && secureExam.ready && !!secureExam.sessionToken,
  });

  // Load saved answers from database
  const loadSavedAnswers = useCallback(async () => {
    if (!attemptId) return;

    try {
      // Read only the candidate's own selections through the secure RPC.
      if (!secureExam.sessionToken) return;
      const { data: savedAnswers, error } = await supabase.rpc('get_certification_attempt_answers', {
        p_attempt_id: attemptId,
        p_session_token: secureExam.sessionToken,
      });

      if (!error && savedAnswers && savedAnswers.length > 0) {
        const answersMap: Record<string, string[]> = {};
        savedAnswers.forEach((ans) => {
          answersMap[ans.question_id] = ans.selected_answer_ids || [];
        });
        setAnswers(answersMap);
        setLastSaved(new Date());
        return;
      }

      // Fallback: try to load from localStorage
      const localData = localStorage.getItem(storageKey);
      if (localData) {
        const parsed: AttemptState = JSON.parse(localData);
        setAnswers(parsed.answers || {});
        setCurrentQuestionIndex(parsed.currentQuestionIndex || 0);
        if (parsed.lastSavedAt) {
          setLastSaved(new Date(parsed.lastSavedAt));
        }
      }
    } catch (err) {
      console.error('Error loading saved answers:', err);
    }
  }, [attemptId, storageKey, secureExam.sessionToken]);

  // Save answers to database
  const saveAnswers = useCallback(
    async (currentAnswers: Record<string, string[]>, showToast = false) => {
      if (!attemptId || !secureExam.sessionToken || Object.keys(currentAnswers).length === 0) return;

      setIsSaving(true);
      try {
        const saveResults = await Promise.all(
          Object.entries(currentAnswers).map(([questionId, selectedIds]) =>
            CertificationExamService.saveAnswer({
              attempt_id: attemptId,
              question_id: questionId,
              selected_answer_ids: selectedIds,
              session_token: secureExam.sessionToken,
            })
          )
        );
        const failedSave = saveResults.find((result) => result.error);
        if (failedSave?.error) throw failedSave.error;

        // Also save to localStorage as backup
        const localState: AttemptState = {
          answers: currentAnswers,
          currentQuestionIndex,
          lastSavedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(localState));

        setLastSaved(new Date());

        if (showToast) {
          toast({
            title: 'Progress Saved',
            description: 'Your answers have been saved.',
            duration: 2000,
          });
        }
      } catch (err) {
        console.error('Error saving answers:', err);
        // Still save to localStorage even if DB fails
        const localState: AttemptState = {
          answers: currentAnswers,
          currentQuestionIndex,
          lastSavedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(localState));
      } finally {
        setIsSaving(false);
      }
    },
    [attemptId, currentQuestionIndex, storageKey, toast, secureExam.sessionToken]
  );

  // Initialize attempt state
  useEffect(() => {
    if (attempt && secureExam.ready && !attemptLoaded) {
      // Check if attempt is already completed
      if (attempt.completed_at) {
        setAttemptCompleted(true);
        setAttemptError('This exam attempt has already been completed.');
        return;
      }

      // Load saved answers
      loadSavedAnswers();
      setAttemptLoaded(true);
    }
  }, [attempt, secureExam.ready, attemptLoaded, loadSavedAnswers]);

  // Calculate remaining time based on server start time
  useEffect(() => {
    if (!attempt?.started_at || !exam?.time_limit_minutes || attemptCompleted) return;

    const calculateRemainingTime = () => {
      const startTime = new Date(attempt.started_at).getTime();
      const totalTimeMs = exam.time_limit_minutes * 60 * 1000;
      const endTime = startTime + totalTimeMs;
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

      if (remaining <= 0) {
        // Time's up - auto submit
        handleSubmitExam(true);
        return 0;
      }

      return remaining;
    };

    // Set initial time
    setTimeRemaining(calculateRemainingTime());

    // Update every second
    timerRef.current = setInterval(() => {
      const remaining = calculateRemainingTime();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [attempt?.started_at, exam?.time_limit_minutes, attemptCompleted]);

  // Auto-save at intervals
  useEffect(() => {
    if (attemptCompleted || !attemptLoaded || !secureExam.ready) return;

    const autoSave = setInterval(() => {
      if (Object.keys(answers).length > 0) {
        saveAnswers(answers);
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(autoSave);
  }, [answers, attemptCompleted, attemptLoaded, saveAnswers, secureExam.ready]);

  // Save on answer change (debounced)
  useEffect(() => {
    if (!attemptLoaded || attemptCompleted || !secureExam.ready) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (Object.keys(answers).length > 0) {
        saveAnswers(answers);
      }
    }, 2000); // Save 2 seconds after last change

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [answers, attemptLoaded, attemptCompleted, saveAnswers, secureExam.ready]);

  // Warn before leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!attemptCompleted && Object.keys(answers).length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [answers, attemptCompleted]);

  // Certification questions are delivered only through the candidate-safe RPC.
  const questions: any[] = attemptQuestionSet || [];
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const isRTL = isArabicExam;

  // Determine if question allows multiple answers
  const isMultiSelect = (questionType: string | undefined) => {
    return questionType === 'multi_select';
  };

  const handleAnswerSelect = (answerId: string) => {
    if (!currentQuestion || attemptCompleted) return;

    setAnswers((prev) => {
      const questionId = currentQuestion.id;
      const currentAnswers = prev[questionId] || [];

      if (isMultiSelect(currentQuestion.question_type)) {
        // Multiple choice: toggle answer (checkbox behaviour)
        const newAnswers = currentAnswers.includes(answerId)
          ? currentAnswers.filter((id) => id !== answerId)
          : [...currentAnswers, answerId];
        return { ...prev, [questionId]: newAnswers };
      } else {
        // Single choice / true_false: replace answer (radio behaviour)
        return { ...prev, [questionId]: [answerId] };
      }
    });
  };

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmitExam = async (autoSubmit = false) => {
    if (isSubmitting || attemptCompleted) return;

    // Confirm submission (skip if auto-submit due to time)
    if (!autoSubmit) {
      const answeredCount = Object.keys(answers).length;
      const unansweredCount = questions.length - answeredCount;

      if (unansweredCount > 0) {
        const confirmed = await confirm({
          title: 'Finalise Exam Attempt',
          description: `You have ${unansweredCount} unanswered question(s). Submitting now will finalize your attempt and you cannot continue after submitting. Do you want to submit?`,
          confirmText: 'Submit Exam',
          cancelText: 'Review Questions',
          variant: 'destructive',
        });
        if (!confirmed) return;
      } else {
        // All questions answered, still confirm
        const confirmed = await confirm({
          title: 'Finalise Exam Attempt',
          description: 'You are about to submit your certification exam. This will finalise your attempt and you cannot continue after submitting. Do you want to proceed?',
          confirmText: 'Submit Exam',
          cancelText: 'Review Questions',
          variant: 'default',
        });
        if (!confirmed) return;
      }
    }

    setIsSubmitting(true);

    try {
      // Save the latest selections through the server, then let the server finalise,
      // score, and issue any eligible certification atomically.
      await saveAnswers(answers);
      if (!secureExam.sessionToken) throw new Error('Secure exam session is not ready');
      const { data: result, error: finaliseError } = await supabase.rpc('finalize_certification_exam_attempt', {
        p_attempt_id: attemptId,
        p_session_token: secureExam.sessionToken,
        p_auto_submit: autoSubmit,
      });
      if (finaliseError) throw finaliseError;

      localStorage.removeItem(storageKey);
      setAttemptCompleted(true);

      toast({
        title: autoSubmit ? 'Time Expired' : 'Exam Completed',
        description: `You scored ${Math.round(Number(result?.score || 0))}%. ${result?.passed ? 'Congratulations!' : `You need ${exam?.passing_score_percentage}% to pass.`}`,
        variant: result?.passed ? 'default' : 'destructive',
      });

      queryClient.invalidateQueries({ queryKey: ['certification-attempt-history'] });
      queryClient.invalidateQueries({ queryKey: ['user-certifications'] });

      // Navigate to results page after a short delay (let user see the success message)
      setTimeout(() => {
        navigate(`/exam-applications/results/${attemptId}`);
      }, 1500);
    } catch (error) {
      console.error('Error submitting exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit exam. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const handleDiscardAttempt = async () => {
    if (!attemptId || !isAdmin) return;
    if (!window.confirm('Discard this test attempt and return to the ECO Blueprint Manager?\n\nThe attempt and all its data will be permanently deleted.')) return;

    setIsDiscarding(true);
    try {
      const { error } = await supabase.rpc('discard_test_exam_attempt', { p_attempt_id: attemptId });
      if (error) throw error;
      localStorage.removeItem(storageKey);
      navigate(returnPath || '/admin/exams/eco-blueprint');
    } catch (err: any) {
      toast({ title: 'Failed to discard attempt', description: err.message, variant: 'destructive' });
      setIsDiscarding(false);
    }
  };

  const handleManualSave = () => {
    saveAnswers(answers, true);
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (secureExam.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-lg rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto mb-4 h-14 w-14 text-red-600" />
          <h2 className="text-2xl font-bold text-[#0d1f4e]">Secure Exam Mode Required</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{secureExam.error}</p>
          <Button className="mt-6" onClick={() => window.location.reload()}>Retry Secure Session</Button>
        </div>
      </div>
    );
  }

  if (examLoading || attemptLoading || questionSetLoading || !secureExam.ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  // Submitting state - show nice feedback while processing
  if (isSubmitting && attemptCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="inline-block h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Results</h2>
          <p className="text-gray-600 mb-4">
            Calculating your score and issuing your certification...
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Exam submitted successfully</span>
          </div>
        </div>
      </div>
    );
  }

  // Already completed (but not during submission to prevent flash before redirect)
  if ((attemptCompleted && !isSubmitting) || attemptError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-8">
          <ShieldAlert className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Already Completed</h2>
          <p className="text-gray-600 mb-6">
            {attemptError || 'This exam attempt has already been submitted.'}
          </p>
          {attempt?.score !== null && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-500">Your Score</p>
              <p className="text-3xl font-bold text-gray-900">{attempt.score}%</p>
              <p
                className={cn(
                  'text-sm font-medium',
                  attempt.passed ? 'text-green-600' : 'text-red-600'
                )}
              >
                {attempt.passed ? 'PASSED' : 'NOT PASSED'}
              </p>
            </div>
          )}
          <Button onClick={() => navigate('/certification-exams')}>Back to Certification Exams</Button>
        </div>
      </div>
    );
  }

  // No exam or questions
  if (!exam || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Not Available</h2>
          <p className="text-gray-600 mb-6">This exam is not available or has no questions.</p>
          <Button onClick={() => navigate('/certification-exams')}>Back to Certification Exams</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="notranslate min-h-screen bg-gray-50"
      dir={isRTL ? 'rtl' : 'ltr'}
      lang={isRTL ? 'ar' : 'en'}
      translate="no"
    >
      {/* Top Bar - Sticky */}
      <div
        className={`sticky top-0 z-50 shadow-md ${
          exam.certification_type === 'CP'
            ? 'bg-gradient-to-r from-green-600 to-green-800'
            : 'bg-gradient-to-r from-purple-600 to-purple-800'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <FileCheck className="h-6 w-6" />
              <div>
                <h1 className="text-lg font-bold">
                  {isRTL && exam.title_ar ? exam.title_ar : exam.title}
                </h1>
                <Badge variant="outline" className="border-white/30 text-white bg-white/10 mt-1">
                  BDA-{exam.certification_type} {texts.certificationExam}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {/* Save indicator */}
              <div className="flex items-center gap-2 text-sm">
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{texts.saving}</span>
                  </>
                ) : lastSaved ? (
                  <>
                    <Save className="h-4 w-4" />
                    <span className="hidden sm:inline">{texts.saved}</span>
                  </>
                ) : null}
              </div>

              {/* Timer */}
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span
                  className={cn(
                    'text-lg font-mono font-bold',
                    timeRemaining !== null && timeRemaining < 300 && 'text-red-300 animate-pulse'
                  )}
                >
                  {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
                </span>
              </div>

              {/* Question counter */}
              <div className="text-sm">
                {texts.question} {currentQuestionIndex + 1} / {questions.length}
              </div>

              {/* Submit Button - Always visible in header */}
              <Button
                onClick={() => handleSubmitExam(false)}
                disabled={isSubmitting}
                className="bg-white text-green-700 hover:bg-green-50 font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 mr-2 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
                    {texts.submitting}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {texts.submitExam}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/20 bg-slate-950/20 px-3 py-2 text-xs text-white/90">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span>{isRTL ? 'وضع الاختبار الآمن نشط' : 'Secure Exam Mode active'}</span>
              {secureExam.violations > 0 && (
                <Badge className="border-amber-200/30 bg-amber-300/15 text-amber-100 hover:bg-amber-300/15">
                  {isRTL ? `تنبيهات الجلسة: ${secureExam.violations}` : `Session alerts: ${secureExam.violations}`}
                </Badge>
              )}
              {secureExam.flaggedForReview && (
                <Badge className="border-red-200/30 bg-red-300/15 text-red-100 hover:bg-red-300/15">
                  {isRTL ? 'تتطلب مراجعة' : 'Review required'}
                </Badge>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void secureExam.enterFullscreen()}
              className="h-7 gap-1.5 text-white hover:bg-white/10 hover:text-white"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              {isRTL ? 'ملء الشاشة' : 'Full screen'}
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Admin test mode banner */}
      {isAdmin && !attemptCompleted && (
        <div className="bg-amber-50 border-b border-amber-300">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 text-sm">
              <FlaskConical className="h-4 w-4 shrink-0" />
              <span>
                <strong>Admin Test Mode</strong> — This attempt is for testing only.
                Discard it when done to keep the database clean.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscardAttempt}
              disabled={isDiscarding}
              className="text-amber-800 border-amber-400 hover:bg-amber-100 shrink-0 ml-4"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {isDiscarding ? 'Discarding…' : 'Discard & Exit'}
            </Button>
          </div>
        </div>
      )}

      {/* Low time warning */}
      {timeRemaining !== null && timeRemaining < 300 && timeRemaining > 0 && (
        <Alert className="mx-4 mt-4 max-w-4xl mx-auto border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Time Running Out!</AlertTitle>
          <AlertDescription className="text-red-700">
            You have less than 5 minutes remaining. Please review and submit your exam.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8">
            {/* Question */}
            <div className="mb-8">
              <div className="flex items-start gap-4 mb-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                  {currentQuestionIndex + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge
                      variant={isMultiSelect(currentQuestion?.question_type) ? 'secondary' : 'default'}
                    >
                      {isMultiSelect(currentQuestion?.question_type)
                        ? texts.multipleChoice
                        : texts.singleChoice}
                    </Badge>
                    <Badge variant="outline">{currentQuestion?.points || 1} {texts.points}</Badge>
                  </div>
                  {isMultiSelect(currentQuestion?.question_type) && (
                    <p className="text-sm text-amber-600 mt-2">
                      ⚠️ {texts.multipleChoiceHint}
                    </p>
                  )}
                  <h2 className={cn(
                    "text-xl font-semibold text-gray-900 leading-relaxed",
                    isRTL && "text-right"
                  )}>
                    {isRTL && currentQuestion?.question_text_ar
                      ? currentQuestion.question_text_ar
                      : currentQuestion?.question_text}
                  </h2>
                </div>
              </div>
            </div>

            {/* Answers */}
            <div className="space-y-3 mb-8">
              {(currentQuestion?.answers || []).map((answer: any, index: number) => {
                const isSelected = (answers[currentQuestion.id] || []).includes(answer.id);
                const letter = isRTL ? ['أ', 'ب', 'ج', 'د'][index] : String.fromCharCode(65 + index);
                const answerText = isRTL && answer.answer_text_ar
                  ? stripOptionPrefix(answer.answer_text_ar)
                  : answer.answer_text;
                const isMulti = isMultiSelect(currentQuestion?.question_type);

                return (
                  <button
                    key={answer.id}
                    onClick={() => handleAnswerSelect(answer.id)}
                    className={cn(
                      'w-full p-4 rounded-lg border-2 transition-all',
                      isRTL ? 'text-right' : 'text-left',
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex-shrink-0 w-8 h-8 flex items-center justify-center font-bold text-sm',
                            isMulti ? 'rounded-md' : 'rounded-full',
                            isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {letter}
                        </span>
                        {/* Show checkbox for multi-select, radio for single-select */}
                        {isMulti ? (
                          isSelected ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )
                        ) : isSelected ? (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900">
                          {answerText}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                {texts.previous}
              </Button>

              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  {answers[currentQuestion?.id]?.length > 0 ? (
                    <span className="text-green-600 font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      {texts.answered}
                    </span>
                  ) : (
                      <span className="text-gray-500">{texts.notAnswered}</span>
                  )}
                </div>

                <Button variant="outline" size="sm" onClick={handleManualSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-1" />
                  {texts.save}
                </Button>
              </div>

              {!isLastQuestion ? (
                <Button onClick={handleNext}>{texts.next}</Button>
              ) : (
                <Button
                  onClick={() => handleSubmitExam(false)}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {texts.submitting}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {texts.submitExam}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question Navigator */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700">{texts.questionNavigator}</h3>
              <span className="text-xs text-gray-500">
                {Object.keys(answers).length} / {questions.length} {texts.answered}
              </span>
            </div>
            <div className="grid grid-cols-10 gap-2">
              {questions.map((q: any, index: number) => {
                const isAnswered = answers[q.id]?.length > 0;
                const isCurrent = index === currentQuestionIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={cn(
                      'w-10 h-10 rounded-lg font-medium text-sm transition',
                      isCurrent && 'ring-2 ring-blue-500 ring-offset-2',
                      isAnswered
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    )}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Submit button always visible */}
        <div className="mt-4 text-center">
          <Button
            onClick={() => handleSubmitExam(false)}
            disabled={isSubmitting}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {texts.submitting}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {texts.submitExam}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

TakeCertificationExamAttempt.displayName = 'TakeCertificationExamAttempt';
