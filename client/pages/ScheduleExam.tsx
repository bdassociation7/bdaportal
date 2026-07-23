/**
 * Schedule Exam Page
 *
 * Improved UX with visual calendar, exam window status, and quick date selection.
 * Candidates can reschedule their exam up to 2 hours before the scheduled start time.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { TimezoneCombobox } from '@/components/ui/timezone-combobox';
import { TIMEZONE_LIST, detectAndResolveTimezone, getTimezoneLabel } from '@/shared/constants/timezones';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Info,
  MapPin,
  ArrowLeft,
  CalendarCheck,
  CalendarX,
  CalendarDays,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/shared/config/supabase.config';
import { getUserFriendlyError } from '@/lib/error-handler';
import { format, addDays, isWithinInterval, startOfDay, isBefore, isAfter, differenceInHours } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

// Time slots (24h availability - online exam, any timezone)
const TIME_SLOTS = [
  { value: '00:00', label: '12:00 AM' },
  { value: '01:00', label: '1:00 AM' },
  { value: '02:00', label: '2:00 AM' },
  { value: '03:00', label: '3:00 AM' },
  { value: '04:00', label: '4:00 AM' },
  { value: '05:00', label: '5:00 AM' },
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '22:00', label: '10:00 PM' },
  { value: '23:00', label: '11:00 PM' },
];

// DEV MODE: Set to true to disable date restrictions for testing
const DEV_MODE_SKIP_DATE_VALIDATION = false;

interface ExistingBooking {
  id: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  timezone: string;
  status: string;
  confirmation_code: string;
  created_at: string;
}

interface ExamWindowStatus {
  is_open: boolean;
  can_schedule: boolean;
  current_window_id: string | null;
  current_window_name: string | null;
  current_window_start: string | null;
  current_window_end: string | null;
  next_window_date: string | null;
  next_window_name: string | null;
  message: string;
}

interface SchedulableWindow {
  window_id: string;
  window_name: string;
  start_date: string;
  end_date: string;
}

export default function ScheduleExam() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const quizId = searchParams.get('quiz_id');
  const voucherId = searchParams.get('voucher_id');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examInfo, setExamInfo] = useState<any>(null);
  const [voucherInfo, setVoucherInfo] = useState<any>(null);
  const [existingBooking, setExistingBooking] = useState<ExistingBooking | null>(null);
  const [examWindowStatus, setExamWindowStatus] = useState<ExamWindowStatus | null>(null);
  const [schedulableWindows, setSchedulableWindows] = useState<SchedulableWindow[]>([]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedTimezone, setSelectedTimezone] = useState<string>('UTC');

  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  // Reschedule state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleHour, setRescheduleHour] = useState('09');
  const [rescheduleMinute, setRescheduleMinute] = useState('00');
  const [rescheduleTimezone, setRescheduleTimezone] = useState('UTC');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleComplete, setRescheduleComplete] = useState(false);
  const [rescheduledDetails, setRescheduledDetails] = useState<any>(null);

  // Derived reschedule time string (HH:MM)
  const rescheduleTime = `${rescheduleHour}:${rescheduleMinute}`;

  // Calculate date constraints based on all schedulable windows (current + future)
  const dateConstraints = useMemo(() => {
    const today = startOfDay(new Date());

    // Default min: 2 days from now (or today in DEV_MODE)
    let minDate = DEV_MODE_SKIP_DATE_VALIDATION ? today : addDays(today, 2);

    // Default max: 6 months from now (fallback if no windows)
    let maxDate = addDays(today, 180);

    if (schedulableWindows.length > 0) {
      // Min date: earliest window start (but not before 2 days from now)
      const earliestStart = startOfDay(new Date(schedulableWindows[0].start_date));
      if (isAfter(earliestStart, minDate)) {
        minDate = earliestStart;
      }

      // Max date: latest window end
      const latestEnd = startOfDay(new Date(schedulableWindows[schedulableWindows.length - 1].end_date));
      maxDate = latestEnd;
    }

    return { minDate, maxDate };
  }, [schedulableWindows]);

  // Generate quick select dates (5 dates centered around selected date, or first 5 if none selected)
  const quickSelectDates = useMemo(() => {
    const dates: Date[] = [];

    // Determine starting point: if date selected, center around it; otherwise start from min
    let startDate: Date;
    if (selectedDate) {
      // Start 2 days before selected date, but not before minDate
      const twoBefore = addDays(selectedDate, -2);
      startDate = isBefore(twoBefore, dateConstraints.minDate)
        ? dateConstraints.minDate
        : twoBefore;
    } else {
      startDate = dateConstraints.minDate;
    }

    let currentDate = startDate;
    while (dates.length < 5 && !isAfter(currentDate, dateConstraints.maxDate)) {
      dates.push(currentDate);
      currentDate = addDays(currentDate, 1);
    }

    return dates;
  }, [dateConstraints, selectedDate]);

  // Check if a date is disabled: must be within at least one schedulable window
  const isDateDisabled = (date: Date) => {
    const dayStart = startOfDay(date);

    // Must be at least minDate
    if (isBefore(dayStart, dateConstraints.minDate)) return true;
    // Must not exceed maxDate
    if (isAfter(dayStart, dateConstraints.maxDate)) return true;

    // If we have windows, date must fall within at least one
    if (schedulableWindows.length > 0) {
      const inAnyWindow = schedulableWindows.some((w) => {
        const wStart = startOfDay(new Date(w.start_date));
        const wEnd = startOfDay(new Date(w.end_date));
        return isWithinInterval(dayStart, { start: wStart, end: wEnd });
      });
      return !inAnyWindow;
    }

    return false;
  };

  // Detect user's timezone (never falls back to UTC silently)
  useEffect(() => {
    const detected = detectAndResolveTimezone();
    setSelectedTimezone(detected.value);
    setRescheduleTimezone(detected.value);
  }, []);

  // Load exam and voucher info
  useEffect(() => {
    loadData();
  }, [quizId, voucherId]);

  const loadData = async () => {
    if (!quizId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setIsLoading(false);
        return;
      }

      // Load exam info
      const { data: exam, error: examError } = await supabase
        .from('quizzes')
        .select('id, title, title_ar, certification_type, exam_language, time_limit_minutes, passing_score_percentage')
        .eq('id', quizId)
        .single();

      if (examError) throw examError;
      setExamInfo(exam);

      // Check exam window status
      const { data: windowStatus, error: windowError } = await supabase.rpc('check_exam_window_open', {
        p_certification_type: exam?.certification_type || null,
      });
      if (!windowError && windowStatus) {
        const result = Array.isArray(windowStatus) ? windowStatus[0] : windowStatus;
        setExamWindowStatus(result as ExamWindowStatus);
      }

      // Fetch all upcoming exam windows within the current year
      // Candidates can reschedule to any available window during the year
      const today = new Date().toISOString().split('T')[0];
      const yearEnd = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0];

      let windowsQuery = supabase
        .from('certification_exam_windows')
        .select('id, name, start_date, end_date')
        .eq('is_active', true)
        .gte('end_date', today) // Window must not have ended
        .lte('start_date', yearEnd) // Within the current year
        .order('start_date', { ascending: true });

      if (exam?.certification_type) {
        // Include windows with no specific type OR matching type
        windowsQuery = windowsQuery.or(`certification_type.is.null,certification_type.ilike.${exam.certification_type}`);
      }

      const { data: windows } = await windowsQuery;
      if (windows && Array.isArray(windows)) {
        setSchedulableWindows(windows.map(w => ({
          window_id: w.id,
          window_name: w.name,
          start_date: w.start_date,
          end_date: w.end_date,
        })));
      }

      // Check for existing scheduled booking
      const { data: existingBookings } = await supabase
        .from('exam_bookings')
        .select('id, scheduled_start_time, scheduled_end_time, timezone, status, confirmation_code, created_at')
        .eq('user_id', authUser.id)
        .eq('quiz_id', quizId)
        .in('status', ['scheduled', 'rescheduled'])
        .gte('scheduled_start_time', new Date().toISOString())
        .order('scheduled_start_time', { ascending: true })
        .limit(1);

      if (existingBookings && existingBookings.length > 0) {
        setExistingBooking(existingBookings[0]);
      }

      // Load voucher info
      if (voucherId) {
        let isEcpVoucher = false;
        let { data: voucher, error: voucherError } = await supabase
          .from('exam_vouchers')
          .select('id, code, certification_type, exam_language, expires_at, status, no_show_count')
          .eq('id', voucherId)
          .single();

        if (voucherError || !voucher) {
          // Try ecp_vouchers table (voucher issued by ECP partner)
          const { data: ecpVoucher } = await supabase
            .from('ecp_vouchers')
            .select('id, voucher_code, certification_type, valid_until, status, trainee_id')
            .eq('id', voucherId)
            .single();

          if (ecpVoucher) {
            isEcpVoucher = true;
            voucher = {
              id: ecpVoucher.id,
              code: ecpVoucher.voucher_code,
              certification_type: ecpVoucher.certification_type,
              exam_language: 'en', // ECP vouchers default to English
              expires_at: ecpVoucher.valid_until,
              status: ecpVoucher.status === 'assigned' ? 'available' : ecpVoucher.status,
              no_show_count: 0,
            };
            voucherError = null;
          }
        }

        if (voucherError || !voucher) {
          toast({
            title: 'Invalid Voucher',
            description: 'The voucher ID provided is invalid.',
            variant: 'destructive',
          });
        } else if (voucher) {
          if (voucher.status !== 'available' && voucher.status !== 'assigned') {
            toast({
              title: 'Voucher Not Available',
              description: `This voucher is ${voucher.status}. Only available vouchers can be used.`,
              variant: 'destructive',
            });
          } else if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
            toast({
              title: 'Voucher Expired',
              description: 'This voucher has expired and cannot be used.',
              variant: 'destructive',
            });
          } else if (exam && voucher.certification_type !== exam.certification_type) {
            toast({
              title: 'Voucher Type Mismatch',
              description: `This is a ${voucher.certification_type} voucher but the exam requires ${exam.certification_type}.`,
              variant: 'destructive',
            });
          } else if (exam && voucher.exam_language && exam.exam_language && voucher.exam_language !== exam.exam_language) {
            // Language-specific validation: voucher language must match exam language
            const langLabels = { en: 'English', ar: 'Arabic' };
            toast({
              title: 'Voucher Language Mismatch',
              description: `This voucher is for ${langLabels[voucher.exam_language as 'en' | 'ar'] || voucher.exam_language} exams but the selected exam is in ${langLabels[exam.exam_language as 'en' | 'ar'] || exam.exam_language}.`,
              variant: 'destructive',
            });
          } else {
            // Check no-show eligibility if voucher has prior no-shows
            if ((voucher.no_show_count || 0) > 0) {
              const { data: rescheduleCheck } = await supabase.rpc('can_reschedule_exam', {
                p_voucher_id: voucher.id,
              });

              if (rescheduleCheck && !rescheduleCheck.can_reschedule) {
                toast({
                  title: 'Voucher Not Available',
                  description: rescheduleCheck.reason || 'This voucher cannot be used for scheduling.',
                  variant: 'destructive',
                });
              } else {
                setVoucherInfo({
                  ...voucher,
                  is_final_attempt: rescheduleCheck?.is_final_attempt || false,
                });
              }
            } else {
              setVoucherInfo({ ...voucher, _isEcp: isEcpVoucher });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load exam information',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // Reschedule handler (candidate self-service)
  // Rule: allowed any time up to 2 hours before scheduled start
  // ============================================================
  const canReschedule = useMemo(() => {
    if (!existingBooking) return false;
    const examStart = new Date(existingBooking.scheduled_start_time);
    const now = new Date();
    const hoursUntilExam = differenceInHours(examStart, now);
    return hoursUntilExam >= 2;
  }, [existingBooking]);

  const hoursUntilExam = useMemo(() => {
    if (!existingBooking) return null;
    return differenceInHours(new Date(existingBooking.scheduled_start_time), new Date());
  }, [existingBooking]);

  const handleReschedule = async () => {
    if (!rescheduleDate || !existingBooking) {
      toast({ title: 'Incomplete Selection', description: 'Please select a new date and time.', variant: 'destructive' });
      return;
    }
    // Re-check 2-hour rule at submit time
    const hoursLeft = differenceInHours(new Date(existingBooking.scheduled_start_time), new Date());
    if (hoursLeft < 2) {
      toast({
        title: 'Reschedule Window Closed',
        description: 'You can no longer reschedule — the exam starts in less than 2 hours.',
        variant: 'destructive',
      });
      return;
    }
    setIsRescheduling(true);
    try {
      const dateTimeStr = `${format(rescheduleDate, 'yyyy-MM-dd')}T${rescheduleTime}:00`;
      const newStart = fromZonedTime(dateTimeStr, rescheduleTimezone);
      const duration = examInfo?.time_limit_minutes || 120;
      const newEnd = new Date(newStart.getTime() + duration * 60 * 1000);

      const { error } = await supabase
        .from('exam_bookings')
        .update({
          scheduled_start_time: newStart.toISOString(),
          scheduled_end_time: newEnd.toISOString(),
          timezone: rescheduleTimezone,
          status: 'rescheduled',
          reschedule_count: (existingBooking as any).reschedule_count
            ? (existingBooking as any).reschedule_count + 1
            : 1,
          rescheduled_from_time: existingBooking.scheduled_start_time,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBooking.id);

      if (error) throw error;

      // Update local state to reflect new booking time
      setRescheduledDetails({
        newStart: newStart.toISOString(),
        timezone: rescheduleTimezone,
        confirmationCode: existingBooking.confirmation_code,
      });
      setRescheduleComplete(true);
      setShowRescheduleModal(false);

      // Update existingBooking in state
      setExistingBooking({
        ...existingBooking,
        scheduled_start_time: newStart.toISOString(),
        scheduled_end_time: newEnd.toISOString(),
        timezone: rescheduleTimezone,
        status: 'rescheduled',
      });

      const h = parseInt(rescheduleHour, 10);
      const ampm = h < 12 ? 'AM' : 'PM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const timeLabel = `${h12}:${rescheduleMinute} ${ampm}`;
      toast({
        title: 'Exam Rescheduled!',
        description: `Your exam has been moved to ${format(rescheduleDate, 'MMMM d, yyyy')} at ${timeLabel}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Reschedule Failed',
        description: err.message || 'Unable to reschedule. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime || !quizId) {
      toast({
        title: 'Incomplete Selection',
        description: 'Please select both date and time',
        variant: 'destructive',
      });
      return;
    }

    if (voucherId && !voucherInfo) {
      toast({
        title: 'Invalid Voucher',
        description: 'Cannot schedule exam with an invalid voucher.',
        variant: 'destructive',
      });
      return;
    }

    // Convert user-selected date+time in their chosen timezone directly to UTC
    const dateTimeStr = `${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`;
    const selectedDateTime = fromZonedTime(dateTimeStr, selectedTimezone);

    if (!DEV_MODE_SKIP_DATE_VALIDATION) {
      const minAllowed = addDays(new Date(), 2);
      if (isBefore(selectedDateTime, minAllowed)) {
        toast({
          title: 'Invalid Date',
          description: 'Exam must be scheduled at least 2 days in advance',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const scheduledStart = selectedDateTime;
      const scheduledEnd = new Date(scheduledStart.getTime() + (examInfo?.time_limit_minutes || 120) * 60 * 1000);
      const confirmationCode = `BDA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Determine if this is an ECP voucher
      const isEcp = voucherInfo?._isEcp === true;

      const { data: booking, error: bookingError } = await supabase
        .from('exam_bookings')
        .insert({
          user_id: authUser.id,
          quiz_id: quizId,
          // ECP vouchers use ecp_voucher_id; direct vouchers use voucher_id
          voucher_id: (voucherId && !isEcp) ? voucherId : null,
          ecp_voucher_id: (voucherId && isEcp) ? voucherId : null,
          scheduled_start_time: scheduledStart.toISOString(),
          scheduled_end_time: scheduledEnd.toISOString(),
          timezone: selectedTimezone,
          status: 'scheduled',
          confirmation_code: confirmationCode,
          confirmation_email_sent: false,
          reminder_48h_sent: false,
          reminder_24h_sent: false,
          reschedule_count: 0,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Mark voucher as assigned/reserved
      if (voucherId && voucherInfo) {
        if (isEcp) {
          await supabase
            .from('ecp_vouchers')
            .update({ status: 'assigned', updated_at: new Date().toISOString() })
            .eq('id', voucherId);
        } else {
          await supabase
            .from('exam_vouchers')
            .update({ status: 'assigned' })
            .eq('id', voucherId);
        }
      }

      toast({
        title: 'Exam Scheduled!',
        description: 'Your certification exam has been successfully scheduled.',
      });

      setBookingDetails({
        ...booking,
        exam: examInfo,
        confirmationCode,
      });
      setBookingComplete(true);

    } catch (error) {
      console.error('Error scheduling exam:', error);
      toast({
        title: 'Scheduling Failed',
        description: getUserFriendlyError(error, 'Unable to schedule your exam. Please try again or contact support.'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmation screen after booking
  if (bookingComplete && bookingDetails) {
    const scheduledDate = new Date(bookingDetails.scheduled_start_time);

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-200 shadow-lg">
            <CardHeader className="text-center bg-green-50 rounded-t-lg">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-green-800">Exam Scheduled Successfully!</CardTitle>
              <CardDescription className="text-green-600">
                Your certification exam has been confirmed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600 mb-1">Confirmation Code</p>
                <p className="text-2xl font-mono font-bold text-blue-700">
                  {bookingDetails.confirmationCode}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-semibold">
                      {formatInTimeZone(scheduledDate, selectedTimezone, 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatInTimeZone(scheduledDate, selectedTimezone, 'h:mm a')} ({getTimezoneLabel(selectedTimezone)})
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Info className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Exam</p>
                    <p className="font-semibold">{examInfo?.title}</p>
                    <p className="text-sm text-gray-600">
                      Duration: {examInfo?.time_limit_minutes} minutes
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription className="text-sm">
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>You will receive a confirmation email shortly</li>
                    <li>Reminders will be sent 48 hours and 24 hours before your exam</li>
                    <li>Please be ready 15 minutes before your scheduled time</li>
                    <li>Ensure you have a stable internet connection</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/certification-exams')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Exams
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => navigate('/individual/dashboard')}
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!quizId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Missing Exam Information</AlertTitle>
            <AlertDescription>
              No exam ID provided. Please return to the certification exams page and select an exam to schedule.
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

  // Show existing booking if already scheduled
  if (existingBooking) {
        const scheduledDate = new Date(existingBooking.scheduled_start_time);
    const bookingTimezone = existingBooking.timezone || 'UTC';
    // Reschedule date constraints: use same exam windows as new bookings
    const rescheduleMinDate = dateConstraints.minDate;
    const rescheduleMaxDate = dateConstraints.maxDate;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Reschedule success banner */}
          {rescheduleComplete && rescheduledDetails && (
            <Alert className="mb-4 border-green-300 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Exam Rescheduled Successfully</AlertTitle>
              <AlertDescription className="text-green-700">
                Your exam has been moved to{' '}
                <strong>
                  {formatInTimeZone(new Date(rescheduledDetails.newStart), rescheduledDetails.timezone, 'EEEE, MMMM d, yyyy')} at{' '}
                  {formatInTimeZone(new Date(rescheduledDetails.newStart), rescheduledDetails.timezone, 'h:mm a')}
                </strong>{' '}({getTimezoneLabel(rescheduledDetails.timezone)}).
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-blue-200 shadow-lg">
            <CardHeader className="text-center bg-blue-50 rounded-t-lg">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-blue-100 rounded-full">
                  <CalendarCheck className="h-12 w-12 text-blue-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-blue-800">Exam Scheduled</CardTitle>
              <CardDescription className="text-blue-600">
                You have an upcoming exam scheduled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600 mb-1">Confirmation Code</p>
                <p className="text-2xl font-mono font-bold text-green-700">
                  {existingBooking.confirmation_code}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-semibold">
                      {formatInTimeZone(scheduledDate, bookingTimezone, 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatInTimeZone(scheduledDate, bookingTimezone, 'h:mm a')} ({getTimezoneLabel(bookingTimezone)})
                    </p>
                  </div>
                </div>

                {examInfo && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Info className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Exam</p>
                      <p className="font-semibold">{examInfo.title}</p>
                      <p className="text-sm text-gray-600">
                        Duration: {examInfo.time_limit_minutes} minutes
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-semibold capitalize text-green-600">
                      {existingBooking.status}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reschedule availability notice */}
              {canReschedule ? (
                <Alert className="border-blue-200 bg-blue-50">
                  <RefreshCw className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Need to Reschedule?</AlertTitle>
                  <AlertDescription className="text-blue-700 text-sm">
                    You can reschedule your exam at any time up to <strong>2 hours before</strong> the scheduled start.
                    {hoursUntilExam !== null && (
                      <span className="block mt-1">
                        Time remaining to reschedule:{' '}
                        <strong>
                          {hoursUntilExam >= 48
                            ? `${Math.floor(hoursUntilExam / 24)} days`
                            : `${hoursUntilExam} hours`}
                        </strong>
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertTitle className="text-orange-800">Reschedule Window Closed</AlertTitle>
                  <AlertDescription className="text-orange-700 text-sm">
                    Rescheduling is no longer available — your exam starts in less than 2 hours. Please be ready at the scheduled time.
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Reminder</AlertTitle>
                <AlertDescription className="text-sm">
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>You will receive email reminders 48 and 24 hours before your exam</li>
                    <li>Please be ready 15 minutes before your scheduled time</li>
                    <li>Ensure you have a stable internet connection</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/certification-exams')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Exams
                </Button>
                {canReschedule && (
                  <Button
                    variant="outline"
                    className="flex-1 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                    onClick={() => setShowRescheduleModal(true)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reschedule Exam
                  </Button>
                )}
                <Button
                  className="flex-1"
                  onClick={() => navigate('/individual/dashboard')}
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reschedule Modal */}
        <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-yellow-600" />
                Reschedule Your Exam
              </DialogTitle>
              <DialogDescription>
                Select a new date and time. You can reschedule up to 2 hours before your current exam start.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Current booking reminder */}
              <div className="p-3 bg-gray-50 rounded-lg border text-sm">
                <p className="text-gray-500 mb-1">Current scheduled time:</p>
                <p className="font-semibold">
                  {formatInTimeZone(scheduledDate, bookingTimezone, 'EEEE, MMMM d, yyyy')} at{' '}
                  {formatInTimeZone(scheduledDate, bookingTimezone, 'h:mm a')} ({getTimezoneLabel(bookingTimezone)})
                </p>
              </div>

              {/* Date picker */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">New Date</Label>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={rescheduleDate}
                    onSelect={setRescheduleDate}
                    disabled={isDateDisabled}
                    fromDate={rescheduleMinDate}
                    toDate={rescheduleMaxDate}
                    className="rounded-md border"
                  />
                </div>
              </div>

              {/* Time picker - full 24h with hour + minute */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">New Time</Label>
                <div className="flex items-center gap-2">
                  {/* Hour selector */}
                  <Select value={rescheduleHour} onValueChange={setRescheduleHour}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {Array.from({ length: 24 }, (_, i) => {
                        const h = String(i).padStart(2, '0');
                        const ampm = i < 12 ? 'AM' : 'PM';
                        const h12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
                        return (
                          <SelectItem key={h} value={h}>
                            {String(h12).padStart(2, '0')} {ampm}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <span className="text-lg font-bold text-gray-500">:</span>
                  {/* Minute selector */}
                  <Select value={rescheduleMinute} onValueChange={setRescheduleMinute}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['00', '15', '30', '45'].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Timezone</Label>
                <TimezoneCombobox
                  value={rescheduleTimezone}
                  onValueChange={setRescheduleTimezone}
                />
              </div>

              {/* Summary */}
              {rescheduleDate && (() => {
                const h = parseInt(rescheduleHour, 10);
                const ampm = h < 12 ? 'AM' : 'PM';
                const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                const timeLabel = `${String(h12).padStart(2, '0')}:${rescheduleMinute} ${ampm}`;
                return (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-700 font-medium mb-1">New scheduled time:</p>
                    <p className="font-semibold text-yellow-900">
                      {format(rescheduleDate, 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-yellow-800">
                      {timeLabel} · {getTimezoneLabel(rescheduleTimezone)}
                    </p>
                  </div>
                );
              })()}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRescheduleModal(false)} disabled={isRescheduling}>
                Cancel
              </Button>
              <Button
                onClick={handleReschedule}
                disabled={isRescheduling || !rescheduleDate}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {isRescheduling
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rescheduling...</>
                  : <><RefreshCw className="h-4 w-4 mr-2" /> Confirm Reschedule</>
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Only block scheduling if there are NO schedulable windows at all
  // Use schedulableWindows (direct query) as primary check, fall back to can_schedule from RPC
  const noWindowsAvailable = examWindowStatus
    && schedulableWindows.length === 0
    && !examWindowStatus.is_open
    && (examWindowStatus.can_schedule === false || examWindowStatus.can_schedule === undefined);

  if (noWindowsAvailable) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-orange-200 shadow-lg">
            <CardHeader className="text-center bg-orange-50 rounded-t-lg">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-orange-100 rounded-full">
                  <CalendarX className="h-12 w-12 text-orange-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-orange-800">No Exam Windows Available</CardTitle>
              <CardDescription className="text-orange-600">
                Scheduling is currently not available
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-800">No Upcoming Exam Windows</AlertTitle>
                <AlertDescription className="text-orange-700">
                  <p>There are no active or upcoming exam windows available for scheduling.</p>
                  {examWindowStatus?.next_window_date ? (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-orange-200">
                      <p className="text-sm text-gray-600">Next exam window opens:</p>
                      <p className="text-lg font-semibold text-orange-800">
                        {format(new Date(examWindowStatus.next_window_date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      {examWindowStatus.next_window_name && (
                        <p className="text-sm text-gray-600">{examWindowStatus.next_window_name}</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2">Please contact support for information about upcoming exam windows.</p>
                  )}
                </AlertDescription>
              </Alert>

              {/* Exam Info */}
              {examInfo && (
                <Card className="bg-gray-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{examInfo.title}</CardTitle>
                    <CardDescription>
                      {examInfo.certification_type} Certification
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}

              {/* Voucher Info */}
              {voucherInfo && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>Voucher Ready</AlertTitle>
                  <AlertDescription>
                    Your voucher <span className="font-mono font-semibold">{voucherInfo.code}</span> is valid and will be used when scheduling becomes available.
                    {voucherInfo.expires_at && (
                      <span className="block mt-1 text-sm text-gray-500">
                        Valid until {format(new Date(voucherInfo.expires_at), 'MMMM d, yyyy')}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/certification-exams')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Exams
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => navigate('/individual/dashboard')}
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <CalendarDays className="h-10 w-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Schedule Your Exam</h1>
          </div>
          <p className="text-gray-600">
            Choose a convenient date and time for your certification exam
          </p>
        </div>

        {/* Exam Window Status Banner */}
        {schedulableWindows.length > 0 && (
          <Card className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="py-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CalendarCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-green-800">
                          {examWindowStatus?.is_open
                            ? (examWindowStatus.current_window_name || 'Current Exam Window')
                            : 'Exam Scheduling Available'}
                        </span>
                        {examWindowStatus?.is_open && <Badge className="bg-green-600">OPEN NOW</Badge>}
                      </div>
                      <p className="text-sm text-green-700">
                        {examWindowStatus?.is_open
                          ? `Schedule for any date within the current window`
                          : `Schedule your exam for the next available window`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <Sparkles className="h-4 w-4" />
                    <span>Select a date within an available window</span>
                  </div>
                </div>
                {/* Show available windows */}
                <div className="flex flex-wrap gap-2 ml-14">
                  {schedulableWindows.map((w) => (
                    <Badge
                      key={w.window_id}
                      variant="outline"
                      className="border-green-300 text-green-700 bg-white"
                    >
                      {w.window_name}: {format(new Date(w.start_date), 'MMM d')} - {format(new Date(w.end_date), 'MMM d, yyyy')}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exam Info Card */}
        {examInfo && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{examInfo.title}</CardTitle>
              <CardDescription>
                {examInfo.certification_type} Certification • {examInfo.time_limit_minutes} minutes • {examInfo.passing_score_percentage}% to pass
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Voucher Info */}
        {voucherInfo && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Voucher Applied</AlertTitle>
            <AlertDescription className="text-green-700">
              Code: <span className="font-mono font-semibold">{voucherInfo.code}</span>
              {voucherInfo.expires_at && (
                <span> • Valid until {format(new Date(voucherInfo.expires_at), 'MMMM d, yyyy')}</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Final Attempt Warning (after a no-show) */}
        {voucherInfo?.is_final_attempt && (
          <Alert className="mb-6 border-orange-300 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Final Attempt</AlertTitle>
            <AlertDescription className="text-orange-700">
              This is your last chance to take this exam. If you miss this appointment, your voucher will be <strong>permanently revoked</strong> and cannot be recovered.
            </AlertDescription>
          </Alert>
        )}

        {/* Invalid Voucher Warning */}
        {voucherId && !voucherInfo && !isLoading && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Invalid Voucher</AlertTitle>
            <AlertDescription>
              The voucher provided is not valid or has already been used. Please return to the certification exams page to select a valid voucher.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column: Calendar and Quick Select */}
          <div className="space-y-6">
            {/* Quick Select Dates */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Quick Select
                </CardTitle>
                <CardDescription>Choose from the next available dates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {quickSelectDates.map((date, index) => (
                    <Button
                      key={index}
                      variant={selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') ? 'default' : 'outline'}
                      className="flex flex-col h-auto py-3"
                      onClick={() => setSelectedDate(date)}
                    >
                      <span className="text-xs opacity-70">{format(date, 'EEE')}</span>
                      <span className="text-lg font-bold">{format(date, 'd')}</span>
                      <span className="text-xs opacity-70">{format(date, 'MMM')}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Calendar */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Select Date
                </CardTitle>
                <CardDescription>
                  Available: {format(dateConstraints.minDate, 'MMM d')} - {format(dateConstraints.maxDate, 'MMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={isDateDisabled}
                  fromDate={dateConstraints.minDate}
                  toDate={dateConstraints.maxDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Time Selection and Summary */}
          <div className="space-y-6">
            {/* Timezone */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Your Timezone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TimezoneCombobox
                  value={selectedTimezone}
                  onValueChange={setSelectedTimezone}
                />
              </CardContent>
            </Card>

            {/* Time Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Select Time
                </CardTitle>
                <CardDescription>Choose your preferred exam time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <Button
                      key={slot.value}
                      variant={selectedTime === slot.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTime(slot.value)}
                    >
                      {slot.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {selectedDate && selectedTime && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-blue-800">Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-semibold">
                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-semibold">
                        {TIME_SLOTS.find(s => s.value === selectedTime)?.label}
                      </p>
                      <p className="text-sm text-gray-600">
                        {getTimezoneLabel(selectedTimezone)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSchedule}
              disabled={isSubmitting || !selectedDate || !selectedTime}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirm Schedule
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => navigate('/certification-exams')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Certification Exams
          </Button>
        </div>
      </div>
    </div>
  );
}
