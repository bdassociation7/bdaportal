/**
 * Admin Exam Bookings Management
 *
 * List view for all exam bookings with navigation to detail page for actions.
 * Admin can also create new bookings on behalf of candidates.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/shared/config/supabase.config';
import { format, isPast, parseISO, addDays } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/components/ui/use-toast';
import {
  CalendarCheck,
  CalendarX,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Search,
  MoreHorizontal,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Loader2,
  ArrowUpDown,
  Plus,
  Ticket,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ExamBooking {
  id: string;
  user_id: string;
  quiz_id: string;
  voucher_id: string | null;
  scheduled_start_time: string;
  scheduled_end_time: string;
  timezone: string;
  status: 'scheduled' | 'rescheduled' | 'cancelled' | 'no_show' | 'completed' | 'expired';
  confirmation_code: string;
  reschedule_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  quiz?: {
    id: string;
    title: string;
    certification_type: 'CP' | 'SCP';
  };
}

type BookingStatus = ExamBooking['status'];

// Status badge colors
const STATUS_CONFIG: Record<BookingStatus, { label: string; labelAr: string; color: string; icon: any }> = {
  scheduled: { label: 'Scheduled', labelAr: 'مجدول', color: 'bg-blue-100 text-blue-700', icon: CalendarCheck },
  rescheduled: { label: 'Rescheduled', labelAr: 'أعيد جدولته', color: 'bg-yellow-100 text-yellow-700', icon: RefreshCw },
  cancelled: { label: 'Cancelled', labelAr: 'ملغى', color: 'bg-red-100 text-red-700', icon: CalendarX },
  no_show: { label: 'No Show', labelAr: 'لم يحضر', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  completed: { label: 'Completed', labelAr: 'مكتمل', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  expired: { label: 'Expired', labelAr: 'منتهي الصلاحية', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

const TIME_SLOTS = [
  '00:00','01:00','02:00','03:00','04:00','05:00','06:00','07:00',
  '08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00',
  '16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00',
];

const formatTimeSlot = (t: string) => {
  const [h] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:00 ${ampm}`;
};

// ============================================================================
// Book Exam Modal
// ============================================================================

interface BookExamModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function BookExamModal({ open, onClose, onSuccess }: BookExamModalProps) {
  const { toast } = useToast();
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [timezone, setTimezone] = useState('Asia/Riyadh');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search users
  const { data: userResults = [], isFetching: searchingUsers } = useQuery({
    queryKey: ['admin-user-search', userSearch],
    queryFn: async () => {
      if (!userSearch || userSearch.length < 2) return [];
      const { data } = await (supabase as any)
        .from('users')
        .select('id, email, first_name, last_name')
        .or(`email.ilike.%${userSearch}%,first_name.ilike.%${userSearch}%,last_name.ilike.%${userSearch}%`)
        .eq('is_active', true)
        .limit(10);
      return data || [];
    },
    enabled: userSearch.length >= 2,
  });

  // Fetch vouchers for selected user
  const { data: userVouchers = [], isFetching: loadingVouchers } = useQuery({
    queryKey: ['admin-user-vouchers', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const { data } = await (supabase as any)
        .from('exam_vouchers')
        .select(`
          id, code, status, expires_at,
          quiz:quiz_id (id, title, certification_type, duration_minutes)
        `)
        .eq('assigned_to', selectedUser.id)
        .in('status', ['assigned', 'available'])
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!selectedUser,
  });

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setSelectedVoucher(null);
    setUserSearch('');
  };

  const handleSubmit = async () => {
    if (!selectedUser || !selectedVoucher || !selectedDate) {
      toast({ title: 'Missing fields', description: 'Please select candidate, voucher, and exam date.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const dateTimeStr = `${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`;
      const scheduledStart = fromZonedTime(dateTimeStr, timezone);
      const durationMinutes = selectedVoucher.quiz?.duration_minutes || 120;
      const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000);
      const confirmationCode = `BDA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { error: bookingError } = await (supabase as any)
        .from('exam_bookings')
        .insert({
          user_id: selectedUser.id,
          quiz_id: selectedVoucher.quiz?.id,
          voucher_id: selectedVoucher.id,
          scheduled_start_time: scheduledStart.toISOString(),
          scheduled_end_time: scheduledEnd.toISOString(),
          timezone,
          status: 'scheduled',
          confirmation_code: confirmationCode,
          confirmation_email_sent: false,
          reminder_48h_sent: false,
          reminder_24h_sent: false,
          reschedule_count: 0,
        });

      if (bookingError) throw bookingError;

      // Mark voucher as assigned
      await (supabase as any)
        .from('exam_vouchers')
        .update({ status: 'assigned' })
        .eq('id', selectedVoucher.id);

      toast({ title: 'Exam Booked!', description: `Exam scheduled for ${selectedUser.first_name} ${selectedUser.last_name} on ${format(selectedDate, 'MMM d, yyyy')} at ${formatTimeSlot(selectedTime)} (${timezone})` });
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast({ title: 'Booking Failed', description: err.message || 'An error occurred', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setUserSearch('');
    setSelectedUser(null);
    setSelectedVoucher(null);
    setSelectedDate(undefined);
    setSelectedTime('09:00');
    setTimezone('Asia/Riyadh');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-blue-600" />
            Book Exam for Candidate
          </DialogTitle>
          <DialogDescription>
            Schedule an exam on behalf of a candidate who has an assigned voucher.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Step 1: Select Candidate */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">1. Select Candidate</Label>
            {selectedUser ? (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 border-blue-200">
                <div>
                  <p className="font-medium">{selectedUser.first_name} {selectedUser.last_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(null); setSelectedVoucher(null); }}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                  {searchingUsers && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {userResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {userResults.map((u: any) => (
                      <button
                        key={u.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                        onClick={() => handleSelectUser(u)}
                      >
                        <p className="font-medium text-sm">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </button>
                    ))}
                  </div>
                )}
                {userSearch.length >= 2 && !searchingUsers && userResults.length === 0 && (
                  <p className="text-sm text-muted-foreground px-1">No users found</p>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Select Voucher */}
          {selectedUser && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">2. Select Exam Voucher</Label>
              {loadingVouchers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading vouchers...
                </div>
              ) : userVouchers.length === 0 ? (
                <div className="p-3 border rounded-lg bg-yellow-50 border-yellow-200">
                  <p className="text-sm text-yellow-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    No available vouchers found for this candidate.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userVouchers.map((v: any) => (
                    <button
                      key={v.id}
                      className={`w-full text-left p-3 border rounded-lg transition-colors ${selectedVoucher?.id === v.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-muted'}`}
                      onClick={() => setSelectedVoucher(v)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="font-medium text-sm">{v.quiz?.title || 'Unknown Exam'}</p>
                            <p className="text-xs text-muted-foreground">Code: {v.code} · {v.quiz?.certification_type}</p>
                          </div>
                        </div>
                        <Badge variant={v.status === 'assigned' ? 'secondary' : 'outline'} className="text-xs">
                          {v.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Date & Time */}
          {selectedVoucher && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">3. Select Date & Time</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Time</Label>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {TIME_SLOTS.map(t => (
                          <SelectItem key={t} value={t}>{formatTimeSlot(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        <SelectItem value="Asia/Riyadh">Asia/Riyadh (GMT+3)</SelectItem>
                        <SelectItem value="Asia/Dubai">Asia/Dubai (GMT+4)</SelectItem>
                        <SelectItem value="Africa/Cairo">Africa/Cairo (GMT+3)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT+1)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (GMT-4)</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los_Angeles (GMT-7)</SelectItem>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</SelectItem>
                        <SelectItem value="Asia/Singapore">Asia/Singapore (GMT+8)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedDate && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-800 font-medium">Scheduled for:</p>
                      <p className="text-sm font-semibold text-green-900">
                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-green-800">{formatTimeSlot(selectedTime)} · {timezone}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedUser || !selectedVoucher || !selectedDate}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Booking...</> : <><CalendarCheck className="h-4 w-4 mr-2" /> Confirm Booking</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ExamBookingsAdmin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [certificationFilter, setCertificationFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showBookModal, setShowBookModal] = useState(false);

  // ============================================================================
  // Queries
  // ============================================================================

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['exam-bookings-admin'],
    queryFn: async () => {
      // Fetch bookings
      const { data, error } = await (supabase as any)
        .from('exam_bookings')
        .select(`
          id,
          user_id,
          quiz_id,
          voucher_id,
          scheduled_start_time,
          scheduled_end_time,
          timezone,
          status,
          confirmation_code,
          reschedule_count,
          created_at,
          updated_at
        `)
        .order('scheduled_start_time', { ascending: false });

      if (error) throw error;

      // Fetch users and quizzes separately for each booking
      const userIds = [...new Set(data.map((b: any) => b.user_id).filter(Boolean))];
      const quizIds = [...new Set(data.map((b: any) => b.quiz_id).filter(Boolean))];

      let users: any[] = [];
      let quizzes: any[] = [];

      // Fetch users
      if (userIds.length > 0) {
        try {
          const { data: userData } = await (supabase as any)
            .from('users')
            .select('id, email, first_name, last_name')
            .in('id', userIds);
          users = userData || [];
        } catch (e) {
          console.warn('Could not fetch users:', e);
        }
      }

      // Fetch quizzes
      if (quizIds.length > 0) {
        try {
          const { data: quizData } = await (supabase as any)
            .from('quizzes')
            .select('id, title, certification_type')
            .in('id', quizIds);
          quizzes = quizData || [];
        } catch (e) {
          console.warn('Could not fetch quizzes:', e);
        }
      }

      // Map users and quizzes to bookings
      const usersMap = new Map(users.map((u: any) => [u.id, u]));
      const quizzesMap = new Map(quizzes.map((q: any) => [q.id, q]));

      return data.map((booking: any) => ({
        ...booking,
        user: usersMap.get(booking.user_id) || null,
        quiz: quizzesMap.get(booking.quiz_id) || null,
      })) as ExamBooking[];
    },
  });

  // ============================================================================
  // Computed Values
  // ============================================================================

  // Get unique certifications for filter
  const certifications = useMemo(() => {
    const types = new Set(bookings.map(b => b.quiz?.certification_type).filter(Boolean));
    return Array.from(types) as string[];
  }, [bookings]);

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(b =>
        b.confirmation_code?.toLowerCase().includes(search) ||
        b.user?.email?.toLowerCase().includes(search) ||
        b.user?.first_name?.toLowerCase().includes(search) ||
        b.user?.last_name?.toLowerCase().includes(search) ||
        b.quiz?.title?.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter);
    }

    // Certification filter
    if (certificationFilter !== 'all') {
      result = result.filter(b => b.quiz?.certification_type === certificationFilter);
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.scheduled_start_time).getTime();
      const dateB = new Date(b.scheduled_start_time).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [bookings, searchTerm, statusFilter, certificationFilter, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: bookings.length,
      upcoming: bookings.filter(b => ['scheduled', 'rescheduled'].includes(b.status) && new Date(b.scheduled_start_time) > now).length,
      scheduled: bookings.filter(b => b.status === 'scheduled').length,
      rescheduled: bookings.filter(b => b.status === 'rescheduled').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      completed: bookings.filter(b => b.status === 'completed').length,
    };
  }, [bookings]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleViewBooking = (bookingId: string, action?: string) => {
    const url = action
      ? `/admin/exam-bookings/${bookingId}?action=${action}`
      : `/admin/exam-bookings/${bookingId}`;
    navigate(url);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? 'إدارة حجوزات الامتحانات' : 'Exam Bookings Management'}</h1>
          <p className="text-muted-foreground">
            {isRTL ? 'عرض وإدارة جميع حجوزات الامتحانات' : 'View and manage all exam bookings'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowBookModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            {isRTL ? 'حجز اختبار' : 'Book Exam'}
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{isRTL ? 'إجمالي الحجوزات' : 'Total Bookings'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">{isRTL ? 'القادمة' : 'Upcoming'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">{isRTL ? 'مجدولة' : 'Scheduled'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.rescheduled}</div>
            <p className="text-xs text-muted-foreground">{isRTL ? 'أعيد جدولتها' : 'Rescheduled'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground">{isRTL ? 'ملغية' : 'Cancelled'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">{isRTL ? 'مكتملة' : 'Completed'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isRTL ? 'تصفية الحجوزات' : 'Filter Bookings'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isRTL ? 'البحث بالاسم أو البريد أو رمز التأكيد...' : 'Search by name, email, or confirmation code...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={isRTL ? 'الحالة' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {isRTL ? config.labelAr : config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={certificationFilter} onValueChange={setCertificationFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={isRTL ? 'الشهادة' : 'Certification'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'جميع الشهادات' : 'All Certifications'}</SelectItem>
                {certifications.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isRTL ? 'الحجوزات' : 'Bookings'} ({filteredBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isRTL ? 'لا توجد حجوزات' : 'No bookings found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? 'المرشح' : 'Candidate'}</TableHead>
                    <TableHead>{isRTL ? 'الامتحان' : 'Exam'}</TableHead>
                    <TableHead>{isRTL ? 'التاريخ والوقت' : 'Date & Time'}</TableHead>
                    <TableHead>{isRTL ? 'رمز التأكيد' : 'Confirmation'}</TableHead>
                    <TableHead>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className="text-right">{isRTL ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => {
                    const StatusIcon = STATUS_CONFIG[booking.status]?.icon || CalendarCheck;
                    const canModify = ['scheduled', 'rescheduled'].includes(booking.status);
                    const isExamPast = isPast(parseISO(booking.scheduled_start_time));

                    return (
                      <TableRow
                        key={booking.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewBooking(booking.id)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {booking.user
                                ? `${booking.user.first_name || ''} ${booking.user.last_name || ''}`.trim() || 'Unknown'
                                : 'Unknown User'}
                            </p>
                            <p className="text-sm text-muted-foreground">{booking.user?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{booking.quiz?.title || 'Unknown Exam'}</p>
                            {booking.quiz?.certification_type && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {booking.quiz.certification_type}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p>{new Date(booking.scheduled_start_time).toLocaleDateString('en-US', { timeZone: booking.timezone || 'UTC', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              <p className="text-sm font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(booking.scheduled_start_time).toLocaleTimeString('en-US', { timeZone: booking.timezone || 'UTC', hour: 'numeric', minute: '2-digit', hour12: true })}
                              </p>
                              <p className="text-xs text-muted-foreground">{booking.timezone || 'UTC'}</p>
                            </div>
                          </div>
                          {isExamPast && booking.status === 'scheduled' && (
                            <Badge variant="destructive" className="mt-1 text-xs">
                              {isRTL ? 'منتهي' : 'Past'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {booking.confirmation_code}
                          </code>
                          {booking.reschedule_count > 0 && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {isRTL ? `إعادة جدولة ×${booking.reschedule_count}` : `Rescheduled ×${booking.reschedule_count}`}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_CONFIG[booking.status]?.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {isRTL ? STATUS_CONFIG[booking.status]?.labelAr : STATUS_CONFIG[booking.status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewBooking(booking.id, 'details')}>
                                <Eye className="h-4 w-4 mr-2" />
                                {isRTL ? 'عرض التفاصيل' : 'View Details'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleViewBooking(booking.id, 'reschedule')}
                                disabled={!canModify || isExamPast}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {isRTL ? 'إعادة الجدولة' : 'Reschedule'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleViewBooking(booking.id, 'cancel')}
                                disabled={!canModify}
                                className="text-red-600"
                              >
                                <CalendarX className="h-4 w-4 mr-2" />
                                {isRTL ? 'إزالة الجدول' : 'Remove Schedule'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleViewBooking(booking.id, 'status')}>
                                <Edit className="h-4 w-4 mr-2" />
                                {isRTL ? 'تغيير الحالة' : 'Change Status'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Book Exam Modal */}
      <BookExamModal
        open={showBookModal}
        onClose={() => setShowBookModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['exam-bookings-admin'] });
        }}
      />
    </div>
  );
}
