/**
 * Schedule Exam Page
 *
 * Improved UX with visual calendar, exam window status, and quick date selection
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  MapPin,
  ArrowLeft,
  CalendarCheck,
  CalendarX,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/shared/config/supabase.config';
import { format, addDays, isWithinInterval, startOfDay, isBefore, isAfter } from 'date-fns';

// Common timezones
const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (NZDT)' },
  { value: 'Australia/Sydney', label: 'Australia Eastern (AEDT)' },
  { value: 'Australia/Perth', label: 'Australia Western (AWST)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Riyadh', label: 'Saudi Arabia (AST)' },
  { value: 'Africa/Cairo', label: 'Eastern European Time (EET)' },
  { value: 'Africa/Lagos', label: 'West Africa Time (WAT)' },
  { value: 'Europe/Istanbul', label: 'Turkey Time (TRT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'America/Sao_Paulo', label: 'Brasilia Time (BRT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
];

// Get UTC offset for a timezone in minutes
function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return (tzDate.getTime() - utcDate.getTime()) / 60000;
}

// Format a UTC date in the user's selected timezone
function formatInTimezone(utcDate: Date, timezone: string, formatStr: string): string {
  // Use Intl to format in the target timezone
  if (formatStr === 'EEEE, MMMM d, yyyy') {
    return utcDate.toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  if (formatStr === 'h:mm a') {
    return utcDate.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  return utcDate.toLocaleString('en-US', { timeZone: timezone });
}

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

  // Detect user's timezone
  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const match = COMMON_TIMEZONES.find(tz => tz.value === detectedTimezone);
    setSelectedTimezone(match ? detectedTimezone : 'UTC');
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

      // Fetch only the NEXT upcoming exam window (not all future windows)
      // Candidates can only schedule for the next window to avoid content changes between windows
      const today = new Date().toISOString().split('T')[0];

      let windowsQuery = supabase
        .from('certification_exam_windows')
        .select('id, name, start_date, end_date')
        .eq('is_active', true)
        .gte('end_date', today) // Window must not have ended
        .order('start_date', { ascending: true })
        .limit(1); // Only the next upcoming window

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
        let { data: voucher, error: voucherError } = await supabase
          .from('exam_vouchers')
          .select('id, code, certification_type, exam_language, expires_at, status')
          .eq('id', voucherId)
          .single();

        if (voucherError || !voucher) {
          const { data: ecpVoucher } = await supabase
            .from('ecp_vouchers')
            .select('id, code, certification_type, exam_language, valid_until, status')
            .eq('id', voucherId)
            .single();

          if (ecpVoucher) {
            voucher = {
              id: ecpVoucher.id,
              code: ecpVoucher.code,
              certification_type: ecpVoucher.certification_type,
              exam_language: ecpVoucher.exam_language || 'en',
              expires_at: ecpVoucher.valid_until,
              status: ecpVoucher.status === 'assigned' ? 'available' : ecpVoucher.status,
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
            setVoucherInfo(voucher);
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

    // Build the date-time in the selected timezone, then convert to UTC
    // User selected a date + time meaning "this time in the selected timezone"
    const localDateStr = `${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`;
    const naiveDate = new Date(localDateStr); // interpreted as browser-local
    // Calculate the offset difference between browser timezone and selected timezone
    const browserOffsetMin = -naiveDate.getTimezoneOffset(); // browser offset from UTC in minutes
    const selectedOffsetMin = getTimezoneOffsetMinutes(selectedTimezone, naiveDate);
    const offsetDiffMs = (browserOffsetMin - selectedOffsetMin) * 60000;
    // Adjust so the stored UTC corresponds to the selected timezone's time
    const selectedDateTime = new Date(naiveDate.getTime() + offsetDiffMs);

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

      const { data: booking, error: bookingError } = await supabase
        .from('exam_bookings')
        .insert({
          user_id: authUser.id,
          quiz_id: quizId,
          voucher_id: voucherId || null,
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

      if (voucherId && voucherInfo) {
        const { error: voucherUpdateError } = await supabase
          .from('exam_vouchers')
          .update({ status: 'assigned' })
          .eq('id', voucherId);

        if (voucherUpdateError) {
          await supabase
            .from('ecp_vouchers')
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
        description: error instanceof Error ? error.message : 'Failed to schedule exam',
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
                      {formatInTimezone(scheduledDate, selectedTimezone, 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatInTimezone(scheduledDate, selectedTimezone, 'h:mm a')} ({COMMON_TIMEZONES.find(tz => tz.value === selectedTimezone)?.label || selectedTimezone})
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

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-blue-200 shadow-lg">
            <CardHeader className="text-center bg-blue-50 rounded-t-lg">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-blue-100 rounded-full">
                  <CalendarCheck className="h-12 w-12 text-blue-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-blue-800">Exam Already Scheduled</CardTitle>
              <CardDescription className="text-blue-600">
                You already have an upcoming exam scheduled
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
                      {formatInTimezone(scheduledDate, bookingTimezone, 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatInTimezone(scheduledDate, bookingTimezone, 'h:mm a')} ({COMMON_TIMEZONES.find(tz => tz.value === bookingTimezone)?.label || bookingTimezone})
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
                <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                        {COMMON_TIMEZONES.find(tz => tz.value === selectedTimezone)?.label}
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
