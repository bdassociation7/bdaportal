/**
 * Exam Launch Page
 *
 * Pre-launch checklist and exam access workflow
 * Uses database functions for proper voucher consumption and eligibility checks
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  PlayCircle,
  ArrowLeft,
  Monitor,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/shared/config/supabase.config';
import TechCheckWidget, { TechCheckResult } from '@/components/TechCheckWidget';

// DEV MODE: Set to true to bypass all pre-launch checks for testing
// WARNING: Set to false for production!
const DEV_MODE_SKIP_ALL_CHECKS = false;

// Time window constants for exam scheduling enforcement
const EARLY_ACCESS_MINUTES = 15; // Can start 15 minutes before scheduled time
const LATE_ACCESS_HOURS = 2; // Can start up to 2 hours after scheduled time

interface SchedulingStatus {
  canLaunch: boolean;
  reason: string;
  scheduledTime?: Date;
  availableFrom?: Date;
  availableUntil?: Date;
  minutesUntilAvailable?: number;
  isExpired?: boolean;
}

interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  voucher_id?: string;
  voucher_source?: string;
  has_existing_attempt?: boolean;
  existing_attempt_id?: string;
  existing_attempt_status?: string;
  window_open?: boolean;
  next_window_date?: string;
  next_window_name?: string;
  // Aliases for backward compatibility
  has_active_attempt?: boolean;
  attempt_id?: string;
}

export default function ExamLaunch() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const bookingId = searchParams.get('booking_id');
  const quizId = searchParams.get('quiz_id');
  const voucherIdFromUrl = searchParams.get('voucher_id');

  const [isLoading, setIsLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [voucher, setVoucher] = useState<any>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [techCheckPassed, setTechCheckPassed] = useState(DEV_MODE_SKIP_ALL_CHECKS);
  const [techCheckCompleted, setTechCheckCompleted] = useState(DEV_MODE_SKIP_ALL_CHECKS);
  const [techCheckExpanded, setTechCheckExpanded] = useState(!DEV_MODE_SKIP_ALL_CHECKS);
  const [techCheckResults, setTechCheckResults] = useState<TechCheckResult[]>([]);
  const [schedulingStatus, setSchedulingStatus] = useState<SchedulingStatus | null>(null);
  const [integrityAccepted, setIntegrityAccepted] = useState(false);

  // Check if current time is within the allowed scheduling window
  const checkSchedulingWindow = (bookingData: any): SchedulingStatus => {
    // If DEV MODE is enabled, allow any time
    if (DEV_MODE_SKIP_ALL_CHECKS) {
      return { canLaunch: true, reason: 'DEV MODE - scheduling checks bypassed' };
    }

    // If no booking or booking has no scheduled time, allow launch (direct access)
    if (!bookingData || !bookingData.scheduled_start_time) {
      return { canLaunch: true, reason: 'No scheduling restrictions' };
    }

    const now = new Date();
    const scheduledTime = new Date(bookingData.scheduled_start_time);
    const scheduledEndTime = new Date(bookingData.scheduled_end_time || scheduledTime.getTime() + 2 * 60 * 60 * 1000);

    // Calculate available window
    const availableFrom = new Date(scheduledTime.getTime() - EARLY_ACCESS_MINUTES * 60 * 1000);
    const availableUntil = new Date(scheduledTime.getTime() + LATE_ACCESS_HOURS * 60 * 60 * 1000);

    // Check if too early
    if (now < availableFrom) {
      const minutesUntilAvailable = Math.ceil((availableFrom.getTime() - now.getTime()) / (60 * 1000));
      return {
        canLaunch: false,
        reason: `Your exam is not available yet. You can start ${EARLY_ACCESS_MINUTES} minutes before your scheduled time.`,
        scheduledTime,
        availableFrom,
        availableUntil,
        minutesUntilAvailable,
        isExpired: false,
      };
    }

    // Check if too late (window expired)
    if (now > availableUntil) {
      return {
        canLaunch: false,
        reason: `Your exam window has expired. The launch window was from ${availableFrom.toLocaleTimeString()} to ${availableUntil.toLocaleTimeString()}.`,
        scheduledTime,
        availableFrom,
        availableUntil,
        isExpired: true,
      };
    }

    // Within the valid window
    return {
      canLaunch: true,
      reason: 'Within scheduled window',
      scheduledTime,
      availableFrom,
      availableUntil,
    };
  };

  useEffect(() => {
    loadData();
  }, [bookingId, quizId]);

  const handleTechCheckComplete = (results: TechCheckResult[], allPassed: boolean) => {
    setTechCheckPassed(allPassed);
    setTechCheckCompleted(true);
    setTechCheckResults(results);

    // Auto-collapse after 3.5 seconds to show compact view
    setTimeout(() => {
      setTechCheckExpanded(false);
    }, 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setIsLoading(false);
        return;
      }

      let targetQuizId = quizId;

      // Load booking if provided
      if (bookingId) {
        const { data: bookingData, error: bookingError } = await supabase
          .from('exam_bookings')
          .select('*, quiz:quizzes(*)')
          .eq('id', bookingId)
          .single();

        if (!bookingError && bookingData) {
          setBooking(bookingData);
          setQuiz(bookingData.quiz);
          targetQuizId = bookingData.quiz_id;

          // Check scheduling window
          const scheduleCheck = checkSchedulingWindow(bookingData);
          setSchedulingStatus(scheduleCheck);

          // Get voucher info for display (check both tables)
          if (bookingData.voucher_id) {
            // Try exam_vouchers first
            let { data: voucherData } = await supabase
              .from('exam_vouchers')
              .select('*')
              .eq('id', bookingData.voucher_id)
              .single();

            if (!voucherData) {
              // Try ecp_vouchers
              const { data: ecpVoucher } = await supabase
                .from('ecp_vouchers')
                .select('*')
                .eq('id', bookingData.voucher_id)
                .single();
              if (ecpVoucher) {
                voucherData = { ...ecpVoucher, source: 'ecp' };
              }
            }

            if (voucherData) setVoucher(voucherData);
          }
        }
      }

      // Load quiz if provided directly (no booking_id)
      if (quizId && !booking) {
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();

        if (!quizError && quizData) {
          setQuiz(quizData);
          targetQuizId = quizData.id;

          // ENFORCEMENT: Check if user has an existing booking for this quiz
          // This prevents bypassing scheduled windows by going directly to exam-launch
          const { data: existingBookings } = await supabase
            .from('exam_bookings')
            .select('*, quiz:quizzes(*)')
            .eq('user_id', authUser.id)
            .eq('quiz_id', quizId)
            .in('status', ['scheduled', 'rescheduled'])
            .gte('scheduled_start_time', new Date().toISOString())
            .order('scheduled_start_time', { ascending: true });

          if (existingBookings && existingBookings.length > 0) {
            // User has existing booking(s) - enforce the scheduled window
            const activeBooking = existingBookings[0];
            setBooking(activeBooking);

            // Check scheduling window for the existing booking
            const scheduleCheck = checkSchedulingWindow(activeBooking);
            setSchedulingStatus(scheduleCheck);

            // Load voucher info if available
            if (activeBooking.voucher_id) {
              let { data: voucherData } = await supabase
                .from('exam_vouchers')
                .select('*')
                .eq('id', activeBooking.voucher_id)
                .single();

              if (!voucherData) {
                const { data: ecpVoucher } = await supabase
                  .from('ecp_vouchers')
                  .select('*')
                  .eq('id', activeBooking.voucher_id)
                  .single();
                if (ecpVoucher) {
                  voucherData = { ...ecpVoucher, source: 'ecp' };
                }
              }
              if (voucherData) setVoucher(voucherData);
            }
          } else {
            // No existing booking - user must schedule first
            // Set a status that blocks launch and prompts scheduling
            setSchedulingStatus({
              canLaunch: false,
              reason: 'You must schedule your exam before taking it. Please book an exam time slot.',
              isExpired: false,
            });
          }
        }
      }

      // Check eligibility using database function
      if (targetQuizId) {
        const { data: eligibilityData, error: eligibilityError } = await supabase
          .rpc('check_exam_eligibility', {
            p_user_id: authUser.id,
            p_quiz_id: targetQuizId,
          });

        if (!eligibilityError && eligibilityData) {
          // RPC returns a TABLE (array), extract first row
          const result = Array.isArray(eligibilityData) ? eligibilityData[0] : eligibilityData;
          setEligibility(result as EligibilityResult);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunchExam = async () => {
    const targetQuizId = booking?.quiz_id || quizId;

    if (!targetQuizId) {
      toast({
        title: 'Error',
        description: 'No exam found to launch',
        variant: 'destructive',
      });
      return;
    }

    if (!eligibility?.has_existing_attempt && !integrityAccepted) {
      toast({
        title: 'Integrity acknowledgement required',
        description: 'Please confirm the BDA Secure Exam requirements before starting your attempt.',
        variant: 'destructive',
      });
      return;
    }

    // Check scheduling window before allowing launch
    if (booking && schedulingStatus && !schedulingStatus.canLaunch) {
      toast({
        title: schedulingStatus.isExpired ? 'Exam Window Expired' : 'Too Early',
        description: schedulingStatus.reason,
        variant: 'destructive',
      });
      return;
    }

    setIsLaunching(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        toast({
          title: 'Error',
          description: 'You must be logged in to take the exam',
          variant: 'destructive',
        });
        setIsLaunching(false);
        return;
      }

      // If user has an active attempt, resume it
      if (eligibility?.has_existing_attempt && eligibility.existing_attempt_id) {
        toast({
          title: 'Resuming Exam',
          description: 'Continuing your previous exam session...',
        });
        navigate(`/certification/exam/${targetQuizId}/attempt/${eligibility.existing_attempt_id}`);
        return;
      }

      // Check eligibility before starting
      if (!eligibility?.eligible) {
        toast({
          title: 'Cannot Start Exam',
          description: eligibility?.reason || 'You are not eligible to take this exam',
          variant: 'destructive',
        });
        setIsLaunching(false);
        return;
      }

      // Determine voucher ID - use from eligibility, booking, or URL
      const voucherId = eligibility?.voucher_id || booking?.voucher_id || voucherIdFromUrl;

      if (!voucherId) {
        toast({
          title: 'No Valid Voucher',
          description: 'A valid voucher is required to take the certification exam',
          variant: 'destructive',
        });
        setIsLaunching(false);
        return;
      }

      // Use the database function to properly start the exam and consume voucher
      const { data: attempt, error: attemptError } = await supabase.rpc('start_certification_exam', {
        p_user_id: authUser.id,
        p_quiz_id: targetQuizId,
        p_voucher_id: voucherId,
        p_booking_id: bookingId || null,
        p_ip_address: null, // Could capture if needed
        p_user_agent: navigator.userAgent,
        p_browser_info: {
          platform: navigator.platform,
          language: navigator.language,
          screen: { width: screen.width, height: screen.height },
          integrity_policy_version: '2026-08-19',
          integrity_acknowledged_at: new Date().toISOString(),
        },
      });

      if (attemptError) {
        console.error('Error starting exam:', attemptError);
        toast({
          title: 'Failed to Start Exam',
          description: attemptError.message || 'An error occurred while starting the exam',
          variant: 'destructive',
        });
        setIsLaunching(false);
        return;
      }

      // Transition to in_progress state
      await supabase.rpc('transition_exam_state', {
        p_attempt_id: attempt.id,
        p_new_status: 'in_progress',
        p_event_data: { launched_from: 'exam_launch_page' },
      });

      toast({
        title: 'Exam Started',
        description: 'Good luck on your certification exam!',
      });

      // Navigate to the actual exam taking page
      navigate(`/certification/exam/${targetQuizId}/attempt/${attempt.id}`);
    } catch (error) {
      console.error('Error starting exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to start exam. Please try again.',
        variant: 'destructive',
      });
      setIsLaunching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Exam Not Found</AlertTitle>
            <AlertDescription>
              The exam you're trying to launch could not be found.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/certification-exams')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Certification Exams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Ready to Launch</h1>
          <p className="text-lg text-gray-600">
            Your certification exam is ready to begin
          </p>
        </div>

        {/* Exam Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{quiz.title}</CardTitle>
            <CardDescription>
              BDA-{quiz.certification_type} Certification Exam
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500">Duration</p>
                <p className="font-semibold">{quiz.time_limit_minutes} minutes</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500">Passing Score</p>
                <p className="font-semibold">{quiz.passing_score_percentage}%</p>
              </div>
            </div>

            {booking && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600">Confirmation Code</p>
                <p className="font-mono font-bold text-blue-800">{booking.confirmation_code}</p>
              </div>
            )}

            {voucher && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-sm text-green-600">Voucher</p>
                <p className="font-mono font-bold text-green-800">{voucher.code}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DEV MODE Notice */}
        {DEV_MODE_SKIP_ALL_CHECKS && (
          <Alert className="mb-6 bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">DEV MODE</AlertTitle>
            <AlertDescription className="text-yellow-700">
              All pre-launch checks are bypassed for testing purposes.
            </AlertDescription>
          </Alert>
        )}

        {/* Tech Check - Collapsible */}
        {!DEV_MODE_SKIP_ALL_CHECKS && (
          <Card className="mb-6 animate-in fade-in-0 slide-in-from-top-4 duration-500">
            {/* Header - Always Visible */}
            <div
              className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                techCheckCompleted ? 'border-b' : ''
              }`}
              onClick={() => setTechCheckExpanded(!techCheckExpanded)}
            >
              <div className="flex items-center gap-3">
                {!techCheckCompleted ? (
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                ) : techCheckPassed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">System Compatibility Check</h3>
                  <p className="text-sm text-gray-600">
                    {!techCheckCompleted
                      ? 'Running checks...'
                      : techCheckPassed
                      ? `All checks passed (${techCheckResults.filter(r => r.status === 'pass').length}/${techCheckResults.length})`
                      : 'Some checks failed - please review'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                {techCheckExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Expandable Content */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                techCheckExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <CardContent className="pt-4 pb-4">
                <TechCheckWidget
                  onComplete={handleTechCheckComplete}
                  autoStart={!techCheckCompleted}
                />
                {!techCheckPassed && techCheckCompleted && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTechCheckExpanded(false);
                        setTechCheckPassed(true);
                      }}
                      className="text-gray-600"
                    >
                      Skip System Check (Not Recommended)
                    </Button>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        )}

        {/* Eligibility Status */}
        {eligibility && !eligibility.eligible && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cannot Take Exam</AlertTitle>
            <AlertDescription>
              {eligibility.reason || 'You are not eligible to take this exam. Please ensure you have a valid voucher.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Scheduling Window - Too Early */}
        {booking && schedulingStatus && !schedulingStatus.canLaunch && !schedulingStatus.isExpired && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Exam Not Available Yet</AlertTitle>
            <AlertDescription className="text-blue-700">
              <p>{schedulingStatus.reason}</p>
              {schedulingStatus.scheduledTime && (
                <div className="mt-2 p-3 bg-white rounded-lg border border-blue-100">
                  <p className="font-semibold">
                    Scheduled: {schedulingStatus.scheduledTime.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })} at {schedulingStatus.scheduledTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-sm mt-1">
                    Available from: {schedulingStatus.availableFrom?.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {schedulingStatus.minutesUntilAvailable && (
                    <p className="text-sm font-medium mt-2 text-blue-600">
                      {schedulingStatus.minutesUntilAvailable >= 60
                        ? `${Math.floor(schedulingStatus.minutesUntilAvailable / 60)} hours ${schedulingStatus.minutesUntilAvailable % 60} minutes until available`
                        : `${schedulingStatus.minutesUntilAvailable} minutes until available`}
                    </p>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Scheduling Window - Expired */}
        {booking && schedulingStatus && !schedulingStatus.canLaunch && schedulingStatus.isExpired && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Exam Window Expired</AlertTitle>
            <AlertDescription>
              <p>{schedulingStatus.reason}</p>
              <p className="mt-2">
                Please contact support or reschedule your exam to select a new time slot.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => navigate(`/schedule-exam?quiz_id=${quiz?.id}&voucher_id=${booking?.voucher_id}`)}
              >
                Reschedule Exam
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* No Booking - Must Schedule First */}
        {!booking && schedulingStatus && !schedulingStatus.canLaunch && (
          <Alert className="mb-6 bg-orange-50 border-orange-200">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Scheduling Required</AlertTitle>
            <AlertDescription className="text-orange-700">
              <p>{schedulingStatus.reason}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-100"
                onClick={() => navigate(`/schedule-exam?quiz_id=${quiz?.id}${voucherIdFromUrl ? `&voucher_id=${voucherIdFromUrl}` : ''}`)}
              >
                Schedule Your Exam
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Active Attempt - Resume Option */}
        {eligibility?.has_existing_attempt && (
          <Alert className="mb-6 bg-yellow-50 border-yellow-200">
            <RotateCcw className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Exam In Progress</AlertTitle>
            <AlertDescription className="text-yellow-700">
              You have an active exam session. Click the button below to resume your exam.
            </AlertDescription>
          </Alert>
        )}

        {/* Ready Alert - Only show if eligible, no active attempt, and scheduling window is valid */}
        {eligibility?.eligible && !eligibility?.has_existing_attempt && schedulingStatus?.canLaunch && (
          <Alert className="mb-6">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Ready to Begin</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Ensure you have a stable internet connection</li>
                <li>Find a quiet place free from distractions</li>
                <li>The timer will start once you click "Launch Exam"</li>
                <li>Your voucher will be consumed when you start the exam</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {!eligibility?.has_existing_attempt && eligibility?.eligible && (!schedulingStatus || schedulingStatus.canLaunch) && (
          <Card className="mb-6 border-[#bfdbfe] bg-[#f0f6ff]">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0d1f4e]" />
                <div className="flex-1">
                  <h3 className="font-semibold text-[#0d1f4e]">BDA Secure Exam Requirements</h3>
                  <p className="mt-1 text-sm text-slate-700">This official examination runs in a monitored secure session. Leaving the examination, changing tabs or windows, attempting to copy, paste, print, or opening another active session may be recorded for integrity review.</p>
                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-[#bfdbfe] bg-white p-3 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      checked={integrityAccepted}
                      onChange={(event) => setIntegrityAccepted(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0f91e0] focus:ring-[#0f91e0]"
                    />
                    <span>I understand and agree to comply with the BDA examination integrity requirements. I understand that a high-risk attempt may be reviewed before any certification is issued.</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {eligibility?.has_existing_attempt ? (
            <Button
              onClick={handleLaunchExam}
              className="w-full bg-yellow-600 hover:bg-yellow-700"
              size="lg"
              disabled={isLaunching}
            >
              {isLaunching ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-5 w-5" />
              )}
              Resume Exam
            </Button>
          ) : eligibility?.eligible ? (
            <Button
              onClick={handleLaunchExam}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
              disabled={isLaunching || !integrityAccepted || (schedulingStatus && !schedulingStatus.canLaunch)}
            >
              {isLaunching ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <PlayCircle className="mr-2 h-5 w-5" />
              )}
              {isLaunching
                ? 'Starting Exam...'
                : schedulingStatus && !schedulingStatus.canLaunch
                  ? !booking
                    ? 'Schedule Required'
                    : schedulingStatus.isExpired
                      ? 'Exam Window Expired'
                      : 'Exam Not Available Yet'
                  : !integrityAccepted
                    ? 'Accept Integrity Requirements'
                    : 'Launch Exam Now'}
            </Button>
          ) : (
            <Button
              onClick={() => navigate('/exam-applications')}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Select a Valid Voucher
            </Button>
          )}

          <Button
            onClick={() => navigate('/certification-exams')}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Certification Exams
          </Button>
        </div>
      </div>
    </div>
  );
}
