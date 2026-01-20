/**
 * Schedule Exam Page
 *
 * Simple scheduling - user picks date/time at least 2 days in advance
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  MapPin,
  ArrowLeft,
  CalendarCheck,
  CalendarX,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/shared/config/supabase.config';

// Common timezones
const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Riyadh', label: 'Saudi Arabia (AST)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
];

// Time slots (every hour from 8 AM to 8 PM)
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00',
];

// DEV MODE: Set to true to disable date restrictions for testing
// NOTE: This should be FALSE in production to enforce 2-day minimum scheduling requirement
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
  current_window_id: string | null;
  current_window_name: string | null;
  current_window_start: string | null;  // Window start date
  current_window_end: string | null;    // Window end date
  next_window_date: string | null;
  next_window_name: string | null;
  message: string;
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

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedTimezone, setSelectedTimezone] = useState<string>('UTC');

  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  // Calculate date constraints based on exam window
  const getDateConstraints = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Default min: 2 days from now (or today in DEV_MODE)
    let minDate = new Date(today);
    if (!DEV_MODE_SKIP_DATE_VALIDATION) {
      minDate.setDate(minDate.getDate() + 2);
    }

    // Default max: 6 months from now (fallback if no window)
    let maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + 6);

    // If exam window is open, constrain to window dates
    if (examWindowStatus?.is_open) {
      // Window start: use the later of (window start) or (today + 2 days)
      if (examWindowStatus.current_window_start) {
        const windowStart = new Date(examWindowStatus.current_window_start);
        if (windowStart > minDate) {
          minDate = windowStart;
        }
      }

      // Window end: use the window end date as max
      if (examWindowStatus.current_window_end) {
        maxDate = new Date(examWindowStatus.current_window_end);
      }
    }

    return {
      minDate,
      maxDate,
      minDateStr: minDate.toISOString().split('T')[0],
      maxDateStr: maxDate.toISOString().split('T')[0],
    };
  };

  const { minDate, maxDate, minDateStr, maxDateStr } = getDateConstraints();

  // Detect user's timezone
  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Find matching timezone or default to UTC
    const match = COMMON_TIMEZONES.find(tz => tz.value === detectedTimezone);
    setSelectedTimezone(match ? detectedTimezone : 'Asia/Riyadh');
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
        .select('id, title, title_ar, certification_type, time_limit_minutes, passing_score_percentage')
        .eq('id', quizId)
        .single();

      if (examError) throw examError;
      setExamInfo(exam);

      // Check exam window status
      const { data: windowStatus, error: windowError } = await supabase.rpc('check_exam_window_open', {
        p_certification_type: exam?.certification_type || null,
      });
      if (!windowError && windowStatus) {
        // RPC returns TABLE (array), extract first element
        const result = Array.isArray(windowStatus) ? windowStatus[0] : windowStatus;
        setExamWindowStatus(result as ExamWindowStatus);
      }

      // Check for existing scheduled booking for this quiz/voucher
      let bookingQuery = supabase
        .from('exam_bookings')
        .select('id, scheduled_start_time, scheduled_end_time, timezone, status, confirmation_code, created_at')
        .eq('user_id', authUser.id)
        .eq('quiz_id', quizId)
        .in('status', ['scheduled', 'rescheduled'])
        .gte('scheduled_start_time', new Date().toISOString())
        .order('scheduled_start_time', { ascending: true })
        .limit(1);

      const { data: existingBookings } = await bookingQuery;

      if (existingBookings && existingBookings.length > 0) {
        setExistingBooking(existingBookings[0]);
      }

      // Load voucher info if provided (check both exam_vouchers and ecp_vouchers)
      if (voucherId) {
        // Try exam_vouchers first
        let { data: voucher, error: voucherError } = await supabase
          .from('exam_vouchers')
          .select('id, code, certification_type, expires_at, status')
          .eq('id', voucherId)
          .single();

        // If not found in exam_vouchers, try ecp_vouchers
        if (voucherError || !voucher) {
          const { data: ecpVoucher } = await supabase
            .from('ecp_vouchers')
            .select('id, code, certification_type, valid_until, status')
            .eq('id', voucherId)
            .single();

          if (ecpVoucher) {
            // Normalize ECP voucher to match exam_vouchers structure
            voucher = {
              id: ecpVoucher.id,
              code: ecpVoucher.code,
              certification_type: ecpVoucher.certification_type,
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
          // Validate voucher status
          if (voucher.status !== 'available' && voucher.status !== 'assigned') {
            toast({
              title: 'Voucher Not Available',
              description: `This voucher is ${voucher.status}. Only available vouchers can be used.`,
              variant: 'destructive',
            });
          }
          // Validate voucher expiration
          else if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
            toast({
              title: 'Voucher Expired',
              description: 'This voucher has expired and cannot be used.',
              variant: 'destructive',
            });
          }
          // Validate certification type match
          else if (exam && voucher.certification_type !== exam.certification_type) {
            toast({
              title: 'Voucher Type Mismatch',
              description: `This is a ${voucher.certification_type} voucher but the exam requires ${exam.certification_type}.`,
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

    // If voucher_id was provided but voucher is invalid, prevent scheduling
    if (voucherId && !voucherInfo) {
      toast({
        title: 'Invalid Voucher',
        description: 'Cannot schedule exam with an invalid voucher. Please select a valid voucher.',
        variant: 'destructive',
      });
      return;
    }

    // Validate date is at least 2 days ahead (skipped in DEV_MODE)
    const selectedDateTime = new Date(`${selectedDate}T${selectedTime}:00`);

    if (!DEV_MODE_SKIP_DATE_VALIDATION) {
      const now = new Date();
      const minAllowed = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      if (selectedDateTime < minAllowed) {
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

      // Create the booking
      const scheduledStart = new Date(`${selectedDate}T${selectedTime}:00`);
      const scheduledEnd = new Date(scheduledStart.getTime() + (examInfo?.time_limit_minutes || 120) * 60 * 1000);

      // Generate confirmation code
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

      // Update voucher status to 'assigned' when scheduling (try both tables)
      if (voucherId && voucherInfo) {
        // Try exam_vouchers first
        const { error: voucherUpdateError } = await supabase
          .from('exam_vouchers')
          .update({ status: 'assigned' })
          .eq('id', voucherId);

        // If not found in exam_vouchers, try ecp_vouchers
        if (voucherUpdateError) {
          const { error: ecpUpdateError } = await supabase
            .from('ecp_vouchers')
            .update({ status: 'assigned' })
            .eq('id', voucherId);

          if (ecpUpdateError) {
            console.error('Error updating voucher status:', ecpUpdateError);
            // Don't fail the booking if voucher update fails, just log it
          }
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

  // Show confirmation screen after booking
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
              {/* Confirmation Code */}
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600 mb-1">Confirmation Code</p>
                <p className="text-2xl font-mono font-bold text-blue-700">
                  {bookingDetails.confirmationCode}
                </p>
              </div>

              {/* Exam Details */}
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-semibold">
                      {scheduledDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {scheduledDate.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} ({COMMON_TIMEZONES.find(tz => tz.value === selectedTimezone)?.label || selectedTimezone})
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

              {/* Important Notes */}
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

              {/* Actions */}
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
              {/* Confirmation Code */}
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600 mb-1">Confirmation Code</p>
                <p className="text-2xl font-mono font-bold text-green-700">
                  {existingBooking.confirmation_code}
                </p>
              </div>

              {/* Exam Details */}
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-semibold">
                      {scheduledDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {scheduledDate.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} ({COMMON_TIMEZONES.find(tz => tz.value === bookingTimezone)?.label || bookingTimezone})
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

              {/* Important Notes */}
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

              {/* Actions */}
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
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Calendar className="h-10 w-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Schedule Your Exam</h1>
          </div>
          <p className="text-gray-600">
            Choose a convenient date and time for your certification exam
          </p>
        </div>

        {/* Exam Info Card */}
        {examInfo && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">{examInfo.title}</CardTitle>
              <CardDescription>
                {examInfo.certification_type} Certification • {examInfo.time_limit_minutes} minutes • {examInfo.passing_score_percentage}% to pass
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Voucher Info */}
        {voucherInfo && (
          <Alert className="mb-6">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>Voucher Applied</AlertTitle>
            <AlertDescription>
              Code: <span className="font-mono font-semibold">{voucherInfo.code}</span>
              {' • '}Valid until {new Date(voucherInfo.expires_at).toLocaleDateString()}
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

        {/* Exam Window Info - Show warning if closed */}
        {examWindowStatus && !examWindowStatus.is_open && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <CalendarX className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Exam Window Information</AlertTitle>
            <AlertDescription className="text-orange-700">
              <p>You can schedule your exam, but please note: the exam can only be taken during open exam windows.</p>
              {examWindowStatus.next_window_date ? (
                <p className="mt-2 font-medium">
                  Next exam window opens:{' '}
                  {new Date(examWindowStatus.next_window_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  {examWindowStatus.next_window_name && (
                    <span className="font-normal"> ({examWindowStatus.next_window_name})</span>
                  )}
                </p>
              ) : (
                <p className="mt-2">Please contact support for information about upcoming exam windows.</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Scheduling Form - Always shown to allow scheduling */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Select Date & Time
            </CardTitle>
            <CardDescription>
              {examWindowStatus?.current_window_name ? (
                <>
                  <span className="font-medium text-blue-600">{examWindowStatus.current_window_name}</span>
                  {' • '}
                  Available: {new Date(examWindowStatus.current_window_start || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' - '}
                  {new Date(examWindowStatus.current_window_end || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </>
              ) : (
                'Exams must be scheduled at least 2 days in advance'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Timezone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Your Timezone
              </Label>
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
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Exam Date
              </Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={minDateStr}
                max={maxDateStr}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Available dates: {minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {examWindowStatus?.current_window_name && (
                  <span className="ml-1 text-blue-600">({examWindowStatus.current_window_name})</span>
                )}
              </p>
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Exam Time
              </Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time} ({selectedTimezone.split('/').pop()?.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {selectedDate && selectedTime && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600 mb-2">Your exam is scheduled for:</p>
                <p className="font-semibold text-lg">
                  {new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-gray-600">
                  at {selectedTime} ({COMMON_TIMEZONES.find(tz => tz.value === selectedTimezone)?.label})
                </p>
              </div>
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
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => navigate('/certification-exams')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Certification Exams
          </Button>
        </div>
      </div>
    </div>
  );
}
