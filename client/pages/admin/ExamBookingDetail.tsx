/**
 * Admin Exam Booking Detail Page
 *
 * Full page view for managing a single exam booking:
 * - View complete booking details
 * - Reschedule exam date/time
 * - Cancel booking with voucher restoration option
 * - Change booking status
 * - View audit trail
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/config/supabase.config';
import { format, isPast, addDays, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  CalendarCheck,
  CalendarX,
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  FileText,
  Ticket,
  History,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Save,
  RefreshCw,
  AlertTriangle,
  Award,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ExamBooking {
  id: string;
  user_id: string;
  quiz_id: string;
  voucher_id: string | null;
  timeslot_id: string | null;
  scheduled_start_time: string;
  scheduled_end_time: string;
  timezone: string;
  status: 'scheduled' | 'rescheduled' | 'cancelled' | 'no_show' | 'completed' | 'expired';
  confirmation_code: string;
  reschedule_count: number;
  reschedule_reason: string | null;
  rescheduled_from_time: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  booking_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  quiz?: {
    id: string;
    title: string;
    duration_minutes: number;
    certification_type?: string;
  };
  voucher?: {
    id: string;
    code: string;
    status: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: CalendarCheck },
  rescheduled: { label: 'Rescheduled', color: 'bg-yellow-100 text-yellow-800', icon: RefreshCw },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: CalendarX },
  no_show: { label: 'No Show', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
];

// ============================================================================
// Timezone Helpers
// ============================================================================

/** Format a UTC date in a specific timezone */
function formatInTz(utcDateStr: string, timezone: string, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Date(utcDateStr).toLocaleString('en-US', { timeZone: timezone, ...options });
  } catch {
    // Fallback if timezone is invalid
    return format(parseISO(utcDateStr), 'PPPp');
  }
}

/** Get full candidate date + time string in their timezone */
function candidateDateTime(utcDateStr: string, timezone: string): string {
  return formatInTz(utcDateStr, timezone, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

/** Get short candidate date string */
function candidateDate(utcDateStr: string, timezone: string): string {
  return formatInTz(utcDateStr, timezone, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

/** Get short candidate time string */
function candidateTime(utcDateStr: string, timezone: string): string {
  return formatInTz(utcDateStr, timezone, {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// ============================================================================
// Main Component
// ============================================================================

export default function ExamBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: adminUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine initial tab from URL param
  const initialAction = searchParams.get('action') || 'details';

  // State for reschedule form
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleTime, setRescheduleTime] = useState<string>('09:00');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [notifyOnReschedule, setNotifyOnReschedule] = useState(true);

  // State for cancel form
  const [cancelReason, setCancelReason] = useState('');
  const [restoreVoucher, setRestoreVoucher] = useState(true);
  const [notifyOnCancel, setNotifyOnCancel] = useState(true);

  // State for status change
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNote, setStatusNote] = useState('');

  // ============================================================================
  // Queries
  // ============================================================================

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['exam-booking', id],
    queryFn: async () => {
      // Fetch booking
      const { data, error } = await (supabase as any)
        .from('exam_bookings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch user separately
      if (data.user_id) {
        const { data: userData } = await (supabase as any)
          .from('users')
          .select('id, email, first_name, last_name')
          .eq('id', data.user_id)
          .single();

        if (userData) {
          data.user = userData;
        }
      }

      // Fetch quiz separately
      if (data.quiz_id) {
        try {
          const { data: quizData } = await (supabase as any)
            .from('quizzes')
            .select('id, title, time_limit_minutes, certification_type')
            .eq('id', data.quiz_id)
            .single();

          if (quizData) {
            data.quiz = {
              ...quizData,
              duration_minutes: quizData.time_limit_minutes, // Map to expected field
            };
          }
        } catch (e) {
          console.warn('Could not fetch quiz:', e);
        }
      }

      // Fetch voucher separately if exists
      if (data.voucher_id) {
        try {
          // Try exam_vouchers first (main voucher table)
          const { data: voucherData, error: vError } = await (supabase as any)
            .from('exam_vouchers')
            .select('id, code, status')
            .eq('id', data.voucher_id)
            .single();

          if (voucherData && !vError) {
            data.voucher = voucherData;
          } else {
            // Try ecp_vouchers as fallback
            const { data: ecpVoucherData } = await (supabase as any)
              .from('ecp_vouchers')
              .select('id, code, status')
              .eq('id', data.voucher_id)
              .single();

            if (ecpVoucherData) {
              data.voucher = ecpVoucherData;
            }
          }
        } catch (e) {
          console.warn('Could not fetch voucher:', e);
        }
      }

      return data as ExamBooking;
    },
    enabled: !!id,
  });

  // ============================================================================
  // Mutations
  // ============================================================================

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!booking || !rescheduleDate) throw new Error('Missing required data');

      const scheduledStart = new Date(rescheduleDate);
      const [hours, minutes] = rescheduleTime.split(':').map(Number);
      scheduledStart.setHours(hours, minutes, 0, 0);

      const duration = booking.quiz?.duration_minutes || 120;
      const scheduledEnd = new Date(scheduledStart.getTime() + duration * 60 * 1000);

      // Build audit trail
      const auditEntry = `[${format(new Date(), 'yyyy-MM-dd HH:mm')}] Admin ${adminUser?.email} rescheduled from ${format(parseISO(booking.scheduled_start_time), 'PPp')} to ${format(scheduledStart, 'PPp')}. Reason: ${rescheduleReason}`;
      const newAdminNotes = booking.booking_notes
        ? `${booking.booking_notes}\n${auditEntry}`
        : auditEntry;

      const { error } = await (supabase as any)
        .from('exam_bookings')
        .update({
          scheduled_start_time: scheduledStart.toISOString(),
          scheduled_end_time: scheduledEnd.toISOString(),
          status: 'rescheduled',
          reschedule_count: (booking.reschedule_count || 0) + 1,
          reschedule_reason: rescheduleReason,
          rescheduled_from_time: booking.scheduled_start_time,
          booking_notes: newAdminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (error) throw error;

      // Queue notification email if requested (non-blocking)
      if (notifyOnReschedule && booking.user?.email) {
        try {
          await (supabase as any).from('email_queue').insert({
            recipient_email: booking.user.email,
            recipient_name: `${booking.user.first_name} ${booking.user.last_name}`,
            subject: `Exam Rescheduled - ${booking.quiz?.title || 'Certification Exam'}`,
            template_name: 'booking_rescheduled',
            template_data: {
              candidate_name: booking.user.first_name,
              exam_title: booking.quiz?.title,
              old_date: format(parseISO(booking.scheduled_start_time), 'PPPp'),
              new_date: format(scheduledStart, 'PPPp'),
              confirmation_code: booking.confirmation_code,
              reason: rescheduleReason,
            },
            status: 'pending',
          });
        } catch (e) {
          console.warn('Could not queue notification email:', e);
        }
      }
    },
    onSuccess: () => {
      toast({
        title: 'Exam Rescheduled',
        description: 'The exam has been rescheduled successfully.',
      });
      // Navigate back to bookings list
      navigate('/admin/exam-bookings');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reschedule exam',
        variant: 'destructive',
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!booking) throw new Error('Missing booking data');

      // Build audit trail
      const auditEntry = `[${format(new Date(), 'yyyy-MM-dd HH:mm')}] Admin ${adminUser?.email} cancelled booking. Reason: ${cancelReason}. Voucher ${restoreVoucher ? 'restored' : 'not restored'}.`;
      const newAdminNotes = booking.booking_notes
        ? `${booking.booking_notes}\n${auditEntry}`
        : auditEntry;

      const { error } = await (supabase as any)
        .from('exam_bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: cancelReason,
          cancelled_at: new Date().toISOString(),
          cancelled_by: adminUser?.id,
          booking_notes: newAdminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (error) throw error;

      // Restore voucher if requested (non-blocking - don't fail if this errors)
      // voucher_status enum: ('available', 'assigned', 'used', 'expired', 'cancelled')
      if (restoreVoucher && booking.voucher_id) {
        try {
          // Try exam_vouchers first - clear used_at and attempt_id when restoring
          const { data: examData, error: examVoucherError } = await (supabase as any)
            .from('exam_vouchers')
            .update({
              status: 'available',
              used_at: null,
              attempt_id: null,
            })
            .eq('id', booking.voucher_id)
            .select('id');

          // If no rows updated (voucher not in exam_vouchers), try ecp_vouchers
          if (examVoucherError || !examData || examData.length === 0) {
            await (supabase as any)
              .from('ecp_vouchers')
              .update({
                status: 'available',
                used_at: null,
                exam_attempt_id: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', booking.voucher_id);
          }
        } catch (e) {
          console.warn('Could not restore voucher:', e);
        }
      }

      // Queue notification email if requested (non-blocking)
      if (notifyOnCancel && booking.user?.email) {
        try {
          await (supabase as any).from('email_queue').insert({
            recipient_email: booking.user.email,
            recipient_name: `${booking.user.first_name} ${booking.user.last_name}`,
            subject: `Exam Schedule Removed - ${booking.quiz?.title || 'Certification Exam'}`,
            template_name: 'booking_cancelled',
            template_data: {
              candidate_name: booking.user.first_name,
              exam_title: booking.quiz?.title,
              scheduled_date: format(parseISO(booking.scheduled_start_time), 'PPPp'),
              confirmation_code: booking.confirmation_code,
              reason: cancelReason,
              voucher_restored: restoreVoucher,
            },
            status: 'pending',
          });
        } catch (e) {
          console.warn('Could not queue notification email:', e);
        }
      }
    },
    onSuccess: () => {
      toast({
        title: 'Schedule Removed',
        description: restoreVoucher
          ? 'The schedule has been removed and the voucher has been restored.'
          : 'The schedule has been removed.',
      });
      // Navigate back to bookings list
      navigate('/admin/exam-bookings');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove schedule',
        variant: 'destructive',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!booking || !newStatus) throw new Error('Missing required data');

      // Build audit trail
      const auditEntry = `[${format(new Date(), 'yyyy-MM-dd HH:mm')}] Admin ${adminUser?.email} changed status from ${booking.status} to ${newStatus}. Note: ${statusNote || 'No note provided'}`;
      const newAdminNotes = booking.booking_notes
        ? `${booking.booking_notes}\n${auditEntry}`
        : auditEntry;

      const { error } = await (supabase as any)
        .from('exam_bookings')
        .update({
          status: newStatus,
          booking_notes: newAdminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Status Updated',
        description: `Booking status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}.`,
      });
      // Navigate back to bookings list
      navigate('/admin/exam-bookings');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    },
  });

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isExamPast = booking ? isPast(parseISO(booking.scheduled_start_time)) : false;
  const canReschedule = booking && ['scheduled', 'rescheduled'].includes(booking.status) && !isExamPast;
  const canCancel = booking && ['scheduled', 'rescheduled'].includes(booking.status);

  const dateConstraints = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      minDate: addDays(today, 1),
      maxDate: addDays(today, 90),
    };
  }, []);

  // Parse audit trail from booking_notes
  const auditTrail = useMemo(() => {
    if (!booking?.booking_notes) return [];
    return booking.booking_notes.split('\n').filter(line => line.trim()).reverse();
  }, [booking?.booking_notes]);

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message || 'Booking not found'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/exam-bookings')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bookings
        </Button>
      </div>
    );
  }

  const StatusIcon = STATUS_CONFIG[booking.status]?.icon || CalendarCheck;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/exam-bookings')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Exam Booking Details</h1>
            <p className="text-muted-foreground">
              Confirmation: <span className="font-mono font-medium">{booking.confirmation_code}</span>
            </p>
          </div>
        </div>
        <Badge className={STATUS_CONFIG[booking.status]?.color}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {STATUS_CONFIG[booking.status]?.label || booking.status}
        </Badge>
      </div>

      {/* Alerts for edge cases */}
      {isExamPast && booking.status === 'scheduled' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Past Exam</AlertTitle>
          <AlertDescription>
            This exam was scheduled for {candidateDateTime(booking.scheduled_start_time, booking.timezone)} ({booking.timezone}) and has passed.
            Consider marking as "No Show" or "Completed".
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Booking Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Candidate Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Candidate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">
                  {booking.user?.first_name} {booking.user?.last_name}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {booking.user?.email}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Exam Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5" />
                Exam
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{booking.quiz?.title}</p>
                {booking.quiz?.certification_type && (
                  <Badge variant="outline" className="mt-1">
                    {booking.quiz.certification_type}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Duration: {booking.quiz?.duration_minutes} minutes
              </div>
            </CardContent>
          </Card>

          {/* Schedule Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Candidate's Scheduled Time</p>
                <p className="font-medium">
                  {candidateDate(booking.scheduled_start_time, booking.timezone)}
                </p>
                <p className="font-semibold text-base">
                  {candidateTime(booking.scheduled_start_time, booking.timezone)} ({booking.timezone})
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  = {format(parseISO(booking.scheduled_start_time), 'h:mm a')} (Your local time)
                </p>
              </div>
              {booking.reschedule_count > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Reschedule Count</p>
                  <p className="font-medium">{booking.reschedule_count}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voucher Info */}
          {booking.voucher && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Voucher
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Code</p>
                  <p className="font-mono font-medium">{booking.voucher.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline">{booking.voucher.status}</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Actions */}
        <div className="lg:col-span-2">
          <Tabs defaultValue={initialAction} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="reschedule" disabled={!canReschedule}>
                Reschedule
              </TabsTrigger>
              <TabsTrigger value="cancel" disabled={!canCancel}>
                Remove
              </TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Booking Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Booking ID</p>
                      <p className="font-mono text-sm">{booking.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created At</p>
                      <p>{format(parseISO(booking.created_at), 'PPPp')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Updated</p>
                      <p>{format(parseISO(booking.updated_at), 'PPPp')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={STATUS_CONFIG[booking.status]?.color}>
                        {STATUS_CONFIG[booking.status]?.label}
                      </Badge>
                    </div>
                  </div>

                  {booking.rescheduled_from_time && (
                    <div>
                      <p className="text-sm text-muted-foreground">Originally Scheduled</p>
                      <p>{candidateDateTime(booking.rescheduled_from_time, booking.timezone)} ({booking.timezone})</p>
                      {booking.reschedule_reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Reason: {booking.reschedule_reason}
                        </p>
                      )}
                    </div>
                  )}

                  {booking.cancellation_reason && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cancellation Reason</p>
                      <p>{booking.cancellation_reason}</p>
                      {booking.cancelled_at && (
                        <p className="text-sm text-muted-foreground">
                          Cancelled at: {format(parseISO(booking.cancelled_at), 'PPPp')}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Audit Trail */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Audit Trail
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {auditTrail.length > 0 ? (
                    <div className="space-y-2">
                      {auditTrail.map((entry, index) => (
                        <div key={index} className="text-sm p-2 bg-muted rounded">
                          {entry}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No admin actions recorded</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reschedule Tab */}
            <TabsContent value="reschedule">
              <Card>
                <CardHeader>
                  <CardTitle>Reschedule Exam</CardTitle>
                  <CardDescription>
                    Select a new date and time for this exam booking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!canReschedule ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Cannot Reschedule</AlertTitle>
                      <AlertDescription>
                        {isExamPast
                          ? 'This exam has already passed and cannot be rescheduled.'
                          : 'This booking cannot be rescheduled in its current status.'}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="mb-2 block">Select New Date</Label>
                          <Calendar
                            mode="single"
                            selected={rescheduleDate}
                            onSelect={setRescheduleDate}
                            disabled={(date) =>
                              date < dateConstraints.minDate || date > dateConstraints.maxDate
                            }
                            className="rounded-md border"
                          />
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="reschedule-time">Select Time</Label>
                            <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                              <SelectTrigger id="reschedule-time">
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_SLOTS.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="reschedule-reason">Reason for Rescheduling *</Label>
                            <Textarea
                              id="reschedule-reason"
                              value={rescheduleReason}
                              onChange={(e) => setRescheduleReason(e.target.value)}
                              placeholder="Enter the reason for rescheduling..."
                              rows={3}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="notify-reschedule"
                              checked={notifyOnReschedule}
                              onCheckedChange={(checked) => setNotifyOnReschedule(checked as boolean)}
                            />
                            <Label htmlFor="notify-reschedule" className="text-sm">
                              Send email notification to candidate
                            </Label>
                          </div>
                        </div>
                      </div>

                      {rescheduleDate && (
                        <Alert>
                          <CalendarCheck className="h-4 w-4" />
                          <AlertTitle>New Schedule</AlertTitle>
                          <AlertDescription>
                            {format(rescheduleDate, 'PPPP')} at {rescheduleTime}
                          </AlertDescription>
                        </Alert>
                      )}

                      <Button
                        onClick={() => rescheduleMutation.mutate()}
                        disabled={!rescheduleDate || !rescheduleReason || rescheduleMutation.isPending}
                        className="w-full"
                      >
                        {rescheduleMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Rescheduling...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Confirm Reschedule
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Remove Schedule Tab */}
            <TabsContent value="cancel">
              <Card>
                <CardHeader>
                  <CardTitle>Remove Schedule</CardTitle>
                  <CardDescription>
                    Remove this exam schedule and optionally restore the voucher
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!canCancel ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Cannot Remove</AlertTitle>
                      <AlertDescription>
                        This schedule cannot be removed in its current status ({booking.status}).
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Warning</AlertTitle>
                        <AlertDescription>
                          Removing this schedule will prevent the candidate from taking the exam at the scheduled time.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="cancel-reason">Reason *</Label>
                          <Textarea
                            id="cancel-reason"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Enter the reason for removing this schedule..."
                            rows={3}
                          />
                        </div>

                        {booking.voucher_id && (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="restore-voucher"
                              checked={restoreVoucher}
                              onCheckedChange={(checked) => setRestoreVoucher(checked as boolean)}
                            />
                            <Label htmlFor="restore-voucher" className="text-sm">
                              Restore voucher to active status (allows candidate to reschedule)
                            </Label>
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="notify-cancel"
                            checked={notifyOnCancel}
                            onCheckedChange={(checked) => setNotifyOnCancel(checked as boolean)}
                          />
                          <Label htmlFor="notify-cancel" className="text-sm">
                            Send email notification to candidate
                          </Label>
                        </div>
                      </div>

                      <Button
                        variant="destructive"
                        onClick={() => cancelMutation.mutate()}
                        disabled={!cancelReason || cancelMutation.isPending}
                        className="w-full"
                      >
                        {cancelMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <CalendarX className="h-4 w-4 mr-2" />
                            Remove Schedule
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Status Tab */}
            <TabsContent value="status">
              <Card>
                <CardHeader>
                  <CardTitle>Change Status</CardTitle>
                  <CardDescription>
                    Manually update the booking status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Current Status</Label>
                      <div className="mt-1">
                        <Badge className={STATUS_CONFIG[booking.status]?.color}>
                          {STATUS_CONFIG[booking.status]?.label}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="new-status">New Status</Label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger id="new-status">
                          <SelectValue placeholder="Select new status" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG)
                            .filter(([key]) => key !== booking.status)
                            .map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                {config.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="status-note">Note (Optional)</Label>
                      <Textarea
                        id="status-note"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        placeholder="Add a note for this status change..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => statusMutation.mutate()}
                    disabled={!newStatus || statusMutation.isPending}
                    className="w-full"
                  >
                    {statusMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update Status
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
