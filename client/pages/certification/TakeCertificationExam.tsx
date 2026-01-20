/**
 * Certification Exams Page - Exam Runner
 *
 * Two modes:
 * 1. Voucher-selected mode: User arrives from ExamApplications with voucher_id
 *    - Loads the exam flow for that voucher
 * 2. No voucher context: Shows prompt to select a voucher first
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { CertificationExamService, type CertificationExam } from '@/entities/certification-exam';
import { useMergedVoucherById } from '@/entities/quiz';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Award,
  Clock,
  FileText,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Calendar,
  CalendarX,
  CalendarCheck,
  Ticket,
  ArrowRight,
  ArrowLeft,
  Lock,
  Play,
  Timer,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// ============================================================================
// Countdown Hook & Component
// ============================================================================

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  isReady: boolean;
}

function useCountdown(targetDate: string | Date): CountdownTime {
  const [countdown, setCountdown] = useState<CountdownTime>(() => calculateCountdown(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(calculateCountdown(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return countdown;
}

function calculateCountdown(targetDate: string | Date): CountdownTime {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const windowStart = target - 15 * 60 * 1000; // 15 min before
  const difference = target - now;
  const isReady = now >= windowStart;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isReady: true };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
    total: difference,
    isReady,
  };
}

interface ScheduledExamBannerProps {
  booking: any;
  examTitle: string;
  onLaunch: () => void;
  language: 'en' | 'ar';
}

function ScheduledExamBanner({ booking, examTitle, onLaunch, language }: ScheduledExamBannerProps) {
  const countdown = useCountdown(booking.scheduled_start_time);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const texts = language === 'ar' ? {
    yourExamScheduled: 'امتحانك المجدول',
    startsIn: 'يبدأ خلال',
    days: 'يوم',
    hours: 'ساعة',
    minutes: 'دقيقة',
    seconds: 'ثانية',
    confirmationCode: 'رمز التأكيد',
    examReadyNow: 'الامتحان جاهز الآن!',
    youCanLaunch: 'يمكنك بدء الامتحان الآن',
    launchExam: 'ابدأ الامتحان',
    at: 'في',
  } : {
    yourExamScheduled: 'Your Exam is Scheduled',
    startsIn: 'Starts in',
    days: 'days',
    hours: 'hours',
    minutes: 'min',
    seconds: 'sec',
    confirmationCode: 'Confirmation Code',
    examReadyNow: 'Exam Ready Now!',
    youCanLaunch: 'You can launch your exam now',
    launchExam: 'Launch Exam',
    at: 'at',
  };

  if (countdown.isReady) {
    // Ready to launch - green animated banner
    return (
      <Card className="mb-6 border-2 border-green-400 bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 shadow-lg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 via-emerald-400/10 to-green-400/10 animate-pulse" />
        <CardContent className="relative py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full animate-bounce">
                <Sparkles className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-800 flex items-center gap-2">
                  {texts.examReadyNow}
                </h3>
                <p className="text-green-700 font-medium">{examTitle}</p>
                <p className="text-sm text-green-600">{texts.youCanLaunch}</p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={onLaunch}
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg animate-pulse"
            >
              <Play className="mr-2 h-5 w-5" />
              {texts.launchExam}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Countdown banner - blue gradient
  return (
    <Card className="mb-6 border-2 border-blue-300 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 shadow-lg">
      <CardContent className="py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Exam Info */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <CalendarCheck className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-900">{texts.yourExamScheduled}</h3>
              <p className="text-blue-800 font-medium">{examTitle}</p>
              <p className="text-sm text-blue-700">
                {formatDate(booking.scheduled_start_time)} {texts.at} {formatTime(booking.scheduled_start_time)}
              </p>
              <div className="mt-2">
                <span className="text-xs text-blue-600">{texts.confirmationCode}: </span>
                <span className="font-mono font-bold text-blue-800">{booking.confirmation_code}</span>
              </div>
            </div>
          </div>

          {/* Right: Countdown */}
          <div className="flex flex-col items-center">
            <p className="text-sm text-blue-700 mb-2 font-medium">{texts.startsIn}</p>
            <div className="flex gap-3">
              {countdown.days > 0 && (
                <div className="flex flex-col items-center">
                  <div className="bg-blue-600 text-white rounded-lg px-3 py-2 min-w-[60px] text-center shadow-md">
                    <span className="text-2xl font-bold">{countdown.days}</span>
                  </div>
                  <span className="text-xs text-blue-600 mt-1">{texts.days}</span>
                </div>
              )}
              <div className="flex flex-col items-center">
                <div className="bg-blue-600 text-white rounded-lg px-3 py-2 min-w-[60px] text-center shadow-md">
                  <span className="text-2xl font-bold">{String(countdown.hours).padStart(2, '0')}</span>
                </div>
                <span className="text-xs text-blue-600 mt-1">{texts.hours}</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-blue-600 text-white rounded-lg px-3 py-2 min-w-[60px] text-center shadow-md">
                  <span className="text-2xl font-bold">{String(countdown.minutes).padStart(2, '0')}</span>
                </div>
                <span className="text-xs text-blue-600 mt-1">{texts.minutes}</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-blue-500 text-white rounded-lg px-3 py-2 min-w-[60px] text-center shadow-md">
                  <span className="text-2xl font-bold">{String(countdown.seconds).padStart(2, '0')}</span>
                </div>
                <span className="text-xs text-blue-600 mt-1">{texts.seconds}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type ExamStatus = 'has_voucher' | 'scheduled' | 'ready' | 'certified';

// DEV MODE: Set to true to bypass exam time window check for testing
// WARNING: Set to false for production!
const DEV_MODE_SKIP_TIME_CHECK = false;

interface ExamWithStatus extends CertificationExam {
  userStatus: ExamStatus;
  booking?: any;
}

export default function TakeCertificationExam() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();

  // Get voucher_id from URL params
  const voucherIdFromUrl = searchParams.get('voucher_id');
  const hasVoucherContext = !!voucherIdFromUrl;

  // Fetch the selected voucher using merged hook
  const {
    data: selectedVoucher,
    isLoading: voucherLoading,
    isNotFound: voucherNotFound,
  } = useMergedVoucherById(voucherIdFromUrl);

  const t = {
    en: {
      // Header
      title: 'Certification Exams',
      subtitle: 'Take official certification exams to earn your BDA-CP™ or BDA-SCP™ credential',
      // No Voucher Mode
      selectVoucherTitle: 'Select a Voucher to Continue',
      selectVoucherDesc: 'To take an official certification exam, you need to select an active voucher first. Your vouchers can be obtained from purchasing certification books or through ECP partners.',
      goToVouchers: 'Go to My Vouchers',
      // Invalid Voucher
      invalidVoucherTitle: 'Invalid Voucher',
      invalidVoucherDesc: 'The voucher ID provided is invalid or the voucher no longer exists.',
      voucherUsedTitle: 'Voucher Already Used',
      voucherUsedDesc: 'This voucher has already been used for an exam attempt.',
      voucherExpiredTitle: 'Voucher Expired',
      voucherExpiredDesc: 'This voucher has expired and can no longer be used.',
      selectDifferent: 'Select a Different Voucher',
      // Voucher Info
      selectedVoucher: 'Selected Voucher',
      voucherCode: 'Voucher Code',
      certType: 'Certification',
      source: 'Source',
      expires: 'Expires',
      // Section Titles
      availableExams: 'Available Exams for Your Voucher',
      attemptHistory: 'Your Attempt History',
      // Status Badges
      certification: 'Certification',
      certified: 'Certified',
      readyToStart: 'Ready to Start',
      scheduled: 'Scheduled',
      hasVoucher: 'Ready to Schedule',
      // Exam Info
      questions: 'Questions',
      minutes: 'Minutes',
      pass: 'Pass',
      // Difficulty
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
      // Scheduled Info
      scheduledFor: 'Scheduled for:',
      examWindowOpen: 'Your exam window is open!',
      canLaunchNow: 'You can launch the exam now.',
      // Buttons
      alreadyCertified: 'Already Certified',
      scheduleExam: 'Schedule Exam',
      waitingForTime: 'Waiting for Exam Time',
      launchBefore: 'You can launch 15 minutes before your scheduled time',
      launchExamNow: 'Launch Exam Now',
      backToVouchers: 'Back to My Vouchers',
      // Empty State
      noExamsAvailable: 'No Exams Available',
      noExamsDesc: 'No certification exams are available for your voucher type at the moment.',
      // History Table
      exam: 'Exam',
      type: 'Type',
      date: 'Date',
      score: 'Score',
      status: 'Status',
      passed: 'Passed',
      failed: 'Failed',
      inProgress: 'In Progress',
      completed: 'Completed',
      unknownExam: 'Unknown Exam',
      // Exam Registration Windows
      registrationOpen: 'Exam Registration Open',
      registrationOpenDesc: 'Exam registration is currently open. You can schedule your exam now.',
      registrationClosed: 'Exam Registration Closed',
      registrationClosedDesc: 'Exam registration is currently closed.',
      nextWindowOpens: 'Next exam window opens:',
      noUpcomingWindows: 'Please check back later for exam scheduling availability.',
      currentWindow: 'Current Window',
      windowEnds: 'Window ends:',
    },
    ar: {
      // Header
      title: 'امتحانات الشهادات',
      subtitle: 'أدِّ امتحانات الشهادات الرسمية للحصول على اعتماد BDA-CP™ أو BDA-SCP™',
      // No Voucher Mode
      selectVoucherTitle: 'اختر قسيمة للمتابعة',
      selectVoucherDesc: 'لأداء امتحان شهادة رسمي، تحتاج إلى اختيار قسيمة صالحة أولاً. يمكنك الحصول على قسائمك من شراء كتب الشهادات أو من خلال شركاء ECP.',
      goToVouchers: 'انتقل إلى قسائمي',
      // Invalid Voucher
      invalidVoucherTitle: 'قسيمة غير صالحة',
      invalidVoucherDesc: 'معرف القسيمة المقدم غير صالح أو لم تعد القسيمة موجودة.',
      voucherUsedTitle: 'القسيمة مستخدمة بالفعل',
      voucherUsedDesc: 'تم استخدام هذه القسيمة بالفعل لمحاولة امتحان.',
      voucherExpiredTitle: 'انتهت صلاحية القسيمة',
      voucherExpiredDesc: 'انتهت صلاحية هذه القسيمة ولا يمكن استخدامها بعد الآن.',
      selectDifferent: 'اختر قسيمة مختلفة',
      // Voucher Info
      selectedVoucher: 'القسيمة المختارة',
      voucherCode: 'رمز القسيمة',
      certType: 'الشهادة',
      source: 'المصدر',
      expires: 'تنتهي في',
      // Section Titles
      availableExams: 'الامتحانات المتاحة لقسيمتك',
      attemptHistory: 'سجل محاولاتك',
      // Status Badges
      certification: 'شهادة',
      certified: 'معتمد',
      readyToStart: 'جاهز للبدء',
      scheduled: 'مجدول',
      hasVoucher: 'جاهز للجدولة',
      // Exam Info
      questions: 'سؤال',
      minutes: 'دقيقة',
      pass: 'النجاح',
      // Difficulty
      easy: 'سهل',
      medium: 'متوسط',
      hard: 'صعب',
      // Scheduled Info
      scheduledFor: 'مجدول في:',
      examWindowOpen: 'نافذة الامتحان مفتوحة!',
      canLaunchNow: 'يمكنك بدء الامتحان الآن.',
      // Buttons
      alreadyCertified: 'معتمد بالفعل',
      scheduleExam: 'جدولة الامتحان',
      waitingForTime: 'في انتظار موعد الامتحان',
      launchBefore: 'يمكنك البدء قبل 15 دقيقة من موعدك المحدد',
      launchExamNow: 'ابدأ الامتحان الآن',
      backToVouchers: 'العودة إلى قسائمي',
      // Empty State
      noExamsAvailable: 'لا توجد امتحانات متاحة',
      noExamsDesc: 'لا توجد امتحانات شهادات متاحة لنوع قسيمتك حالياً.',
      // History Table
      exam: 'الامتحان',
      type: 'النوع',
      date: 'التاريخ',
      score: 'الدرجة',
      status: 'الحالة',
      passed: 'ناجح',
      failed: 'راسب',
      inProgress: 'قيد التقدم',
      completed: 'مكتمل',
      unknownExam: 'امتحان غير معروف',
      // Exam Registration Windows
      registrationOpen: 'التسجيل للامتحانات مفتوح',
      registrationOpenDesc: 'التسجيل للامتحانات مفتوح حالياً. يمكنك جدولة امتحانك الآن.',
      registrationClosed: 'التسجيل للامتحانات مغلق',
      registrationClosedDesc: 'التسجيل للامتحانات مغلق حالياً.',
      nextWindowOpens: 'فترة التسجيل القادمة تبدأ في:',
      noUpcomingWindows: 'يرجى التحقق لاحقاً من توفر جدولة الامتحانات.',
      currentWindow: 'الفترة الحالية',
      windowEnds: 'تنتهي الفترة في:',
    },
  };

  const texts = t[language];

  // Fetch exam window status
  interface ExamWindowStatus {
    is_open: boolean;
    current_window_id: string | null;
    current_window_name: string | null;
    current_window_end: string | null;
    next_window_date: string | null;
    next_window_name: string | null;
    message: string;
  }

  const { data: examWindowStatus } = useQuery<ExamWindowStatus>({
    queryKey: ['exam-window-status', selectedVoucher?.certification_type],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_exam_window_open', {
        p_certification_type: selectedVoucher?.certification_type || null,
      });
      if (error) throw error;
      // RPC returns a TABLE (array), extract first row
      const result = Array.isArray(data) ? data[0] : data;
      return result as ExamWindowStatus;
    },
    enabled: !!selectedVoucher && selectedVoucher.displayInfo.canUse,
  });

  // Fetch exams matching the voucher's certification type
  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ['certification-exams-for-voucher', selectedVoucher?.certification_type],
    queryFn: async () => {
      if (!selectedVoucher) return [];
      const result = await CertificationExamService.getAvailableCertificationExams(
        selectedVoucher.certification_type
      );
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled: !!selectedVoucher && selectedVoucher.displayInfo.canUse,
  });

  // Fetch user's exam bookings (only future bookings with valid status)
  // Always fetch regardless of voucher context so we can show scheduled exam banner
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['user-exam-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_bookings')
        .select('*')
        .eq('user_id', user?.id)
        .in('status', ['scheduled', 'rescheduled'])
        .gte('scheduled_start_time', new Date().toISOString())
        .order('scheduled_start_time', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch quiz info for scheduled bookings (for banner display when no voucher context)
  const { data: scheduledExamInfo } = useQuery({
    queryKey: ['scheduled-exam-info', bookings?.[0]?.quiz_id],
    queryFn: async () => {
      if (!bookings || bookings.length === 0) return null;
      const booking = bookings[0];
      const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, title, title_ar, certification_type')
        .eq('id', booking.quiz_id)
        .single();
      return { booking, quiz };
    },
    enabled: !!bookings && bookings.length > 0,
  });

  // Fetch user attempt history
  const { data: history } = useQuery({
    queryKey: ['certification-attempt-history'],
    queryFn: async () => {
      const result = await CertificationExamService.getUserAttemptHistory();
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled: hasVoucherContext,
  });

  // Combine exam data with user status (using voucher context)
  const getExamWithStatus = (exam: CertificationExam): ExamWithStatus => {
    // Check if already certified
    if (exam.is_certified) {
      return { ...exam, userStatus: 'certified' };
    }

    // Check if user has a booking for this exam
    const booking = bookings?.find(
      (b: any) => b.quiz_id === exam.id && ['scheduled', 'rescheduled'].includes(b.status)
    );

    if (booking) {
      // DEV MODE: Skip time check and always allow exam launch
      if (DEV_MODE_SKIP_TIME_CHECK) {
        return { ...exam, userStatus: 'ready', booking };
      }

      // Check if exam is ready to start (within time window)
      const now = new Date();
      const examStart = new Date(booking.scheduled_start_time);
      const examEnd = new Date(booking.scheduled_end_time);
      const windowStart = new Date(examStart.getTime() - 15 * 60 * 1000); // 15 min before

      if (now >= windowStart && now <= examEnd) {
        return { ...exam, userStatus: 'ready', booking };
      }

      return { ...exam, userStatus: 'scheduled', booking };
    }

    // Has voucher context, ready to schedule
    return { ...exam, userStatus: 'has_voucher' };
  };

  const examsWithStatus: ExamWithStatus[] =
    exams?.map((exam: CertificationExam) => getExamWithStatus(exam)) || [];

  const isLoading = voucherLoading || examsLoading || bookingsLoading;

  // Handlers
  const handleScheduleExam = (exam: ExamWithStatus) => {
    navigate(`/schedule-exam?quiz_id=${exam.id}&voucher_id=${voucherIdFromUrl}`);
  };

  const handleLaunchExam = (exam: ExamWithStatus) => {
    navigate(`/exam-launch?booking_id=${exam.booking?.id}&quiz_id=${exam.id}`);
  };

  const handleBackToVouchers = () => {
    navigate('/exam-applications');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getDifficultyLabel = (level: string) => {
    if (level === 'easy') return texts.easy;
    if (level === 'medium') return texts.medium;
    return texts.hard;
  };

  // Helper: Check if a booking is ready to launch
  const isBookingReady = (booking: any) => {
    if (!booking) return false;
    if (DEV_MODE_SKIP_TIME_CHECK) return true;
    const now = new Date();
    const examStart = new Date(booking.scheduled_start_time);
    const examEnd = new Date(booking.scheduled_end_time);
    const windowStart = new Date(examStart.getTime() - 15 * 60 * 1000);
    return now >= windowStart && now <= examEnd;
  };

  // =========================================================================
  // MODE B: No voucher context - Show prompt to select voucher
  // =========================================================================
  if (!hasVoucherContext) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Award className="h-8 w-8" />
            {texts.title}
          </h1>
          <p className="mt-2 opacity-90">{texts.subtitle}</p>
        </div>

        {/* Scheduled Exam Banner (shows even without voucher context) */}
        {scheduledExamInfo && scheduledExamInfo.booking && (
          <ScheduledExamBanner
            booking={scheduledExamInfo.booking}
            examTitle={language === 'ar' && scheduledExamInfo.quiz?.title_ar
              ? scheduledExamInfo.quiz.title_ar
              : scheduledExamInfo.quiz?.title || 'Certification Exam'}
            onLaunch={() => {
              if (isBookingReady(scheduledExamInfo.booking)) {
                navigate(`/exam-launch?booking_id=${scheduledExamInfo.booking.id}`);
              }
            }}
            language={language as 'en' | 'ar'}
          />
        )}

        {/* No Voucher Selected Card */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-12 text-center">
            <Ticket className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-orange-900 mb-2">
              {texts.selectVoucherTitle}
            </h2>
            <p className="text-orange-800 mb-6 max-w-xl mx-auto">
              {texts.selectVoucherDesc}
            </p>
            <Button
              size="lg"
              onClick={handleBackToVouchers}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Ticket className="mr-2 h-5 w-5" />
              {texts.goToVouchers}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // LOADING STATE
  // =========================================================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // =========================================================================
  // ERROR STATES: Invalid/Used/Expired Voucher
  // =========================================================================
  if (voucherNotFound) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{texts.invalidVoucherTitle}</AlertTitle>
          <AlertDescription>{texts.invalidVoucherDesc}</AlertDescription>
        </Alert>
        <Button onClick={handleBackToVouchers}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {texts.selectDifferent}
        </Button>
      </div>
    );
  }

  if (selectedVoucher && selectedVoucher.displayInfo.status === 'used') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{texts.voucherUsedTitle}</AlertTitle>
          <AlertDescription>{texts.voucherUsedDesc}</AlertDescription>
        </Alert>
        <Button onClick={handleBackToVouchers}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {texts.selectDifferent}
        </Button>
      </div>
    );
  }

  if (selectedVoucher && selectedVoucher.displayInfo.status === 'expired') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{texts.voucherExpiredTitle}</AlertTitle>
          <AlertDescription>{texts.voucherExpiredDesc}</AlertDescription>
        </Alert>
        <Button onClick={handleBackToVouchers}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {texts.selectDifferent}
        </Button>
      </div>
    );
  }

  // =========================================================================
  // MODE A: Voucher-selected mode - Show matching exams
  // =========================================================================
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Award className="h-8 w-8" />
          {texts.title}
        </h1>
        <p className="mt-2 opacity-90">{texts.subtitle}</p>
      </div>

      {/* Back Button */}
      <div className="mb-6">
        <Button variant="outline" onClick={handleBackToVouchers}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {texts.backToVouchers}
        </Button>
      </div>

      {/* Selected Voucher Info */}
      {selectedVoucher && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-green-900 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {texts.selectedVoucher}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">{texts.voucherCode}</p>
                <p className="font-mono font-semibold">{selectedVoucher.code}</p>
              </div>
              <div>
                <p className="text-gray-600">{texts.certType}</p>
                <Badge
                  className={
                    selectedVoucher.certification_type === 'CP'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-purple-100 text-purple-800'
                  }
                >
                  BDA-{selectedVoucher.certification_type}™
                </Badge>
              </div>
              <div>
                <p className="text-gray-600">{texts.source}</p>
                <p className="font-medium">{selectedVoucher.displayInfo.sourceLabel}</p>
              </div>
              {selectedVoucher.expires_at && (
                <div>
                  <p className="text-gray-600">{texts.expires}</p>
                  <p className="font-medium">
                    {new Date(selectedVoucher.expires_at).toLocaleDateString(
                      language === 'ar' ? 'ar-SA' : 'en-US'
                    )}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Exam Banner with Countdown */}
      {examsWithStatus?.map((exam) => {
        if ((exam.userStatus === 'scheduled' || exam.userStatus === 'ready') && exam.booking) {
          return (
            <ScheduledExamBanner
              key={exam.id}
              booking={exam.booking}
              examTitle={language === 'ar' && exam.title_ar ? exam.title_ar : exam.title}
              onLaunch={() => handleLaunchExam(exam)}
              language={language as 'en' | 'ar'}
            />
          );
        }
        return null;
      })}

      {/* Exam Window Status - Only show for users who need to schedule (not for ready/scheduled exams) */}
      {examWindowStatus &&
       !examWindowStatus.is_open &&
       examsWithStatus?.every(e => e.userStatus !== 'ready' && e.userStatus !== 'scheduled') && (
        <div className="mb-8">
          <Alert className="border-red-200 bg-red-50">
            <CalendarX className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-800">{texts.registrationClosed}</AlertTitle>
            <AlertDescription className="text-red-700">
              <p>{texts.registrationClosedDesc}</p>
              {examWindowStatus.next_window_date ? (
                <p className="mt-2 font-medium">
                  {texts.nextWindowOpens}{' '}
                  {new Date(examWindowStatus.next_window_date).toLocaleDateString(
                    language === 'ar' ? 'ar-SA' : 'en-US',
                    { year: 'numeric', month: 'long', day: 'numeric' }
                  )}
                  {examWindowStatus.next_window_name && (
                    <span className="font-normal"> ({examWindowStatus.next_window_name})</span>
                  )}
                </p>
              ) : (
                <p className="mt-2">{texts.noUpcomingWindows}</p>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Available Exams */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{texts.availableExams}</h2>

        {examsWithStatus && examsWithStatus.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {examsWithStatus.map((exam) => (
              <Card
                key={exam.id}
                className={`relative overflow-hidden transition hover:shadow-lg ${
                  exam.certification_type === 'CP'
                    ? 'border-l-4 border-l-green-500'
                    : 'border-l-4 border-l-purple-500'
                }`}
              >
                <CardHeader className="pb-3">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant="outline"
                      className={
                        exam.certification_type === 'CP'
                          ? 'bg-green-100 text-green-800 border-green-300'
                          : 'bg-purple-100 text-purple-800 border-purple-300'
                      }
                    >
                      BDA-{exam.certification_type}™ {texts.certification}
                    </Badge>

                    {/* User Status Badge */}
                    {exam.userStatus === 'certified' && (
                      <Badge className="bg-blue-100 text-blue-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {texts.certified}
                      </Badge>
                    )}
                    {exam.userStatus === 'ready' && (
                      <Badge className="bg-green-100 text-green-800 animate-pulse">
                        <Play className="w-3 h-3 mr-1" />
                        {texts.readyToStart}
                      </Badge>
                    )}
                    {exam.userStatus === 'scheduled' && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Calendar className="w-3 h-3 mr-1" />
                        {texts.scheduled}
                      </Badge>
                    )}
                    {exam.userStatus === 'has_voucher' && (
                      <Badge className="bg-orange-100 text-orange-800">
                        <Ticket className="w-3 h-3 mr-1" />
                        {texts.hasVoucher}
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-xl">
                    {language === 'ar' && exam.title_ar ? exam.title_ar : exam.title}
                  </CardTitle>
                  {exam.description && (
                    <CardDescription>
                      {language === 'ar' && exam.description_ar
                        ? exam.description_ar
                        : exam.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Exam Info Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <FileText size={16} className="text-gray-400" />
                      <span>
                        {exam.question_count || 0} {texts.questions}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock size={16} className="text-gray-400" />
                      <span>
                        {exam.time_limit_minutes} {texts.minutes}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <TrendingUp size={16} className="text-gray-400" />
                      <span>
                        {texts.pass}: {exam.passing_score_percentage}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Award size={16} className="text-gray-400" />
                      <span>{getDifficultyLabel(exam.difficulty_level)}</span>
                    </div>
                  </div>

                  {/* Scheduled Info */}
                  {exam.booking && exam.userStatus === 'scheduled' && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <Calendar className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <strong>{texts.scheduledFor}</strong>{' '}
                        {formatDateTime(exam.booking.scheduled_start_time)}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Ready to Start Info */}
                  {exam.booking && exam.userStatus === 'ready' && (
                    <Alert className="bg-green-50 border-green-200">
                      <Play className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <strong>{texts.examWindowOpen}</strong> {texts.canLaunchNow}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Action Button */}
                  <div className="pt-2">
                    {exam.userStatus === 'certified' && (
                      <Button disabled variant="secondary" className="w-full">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {texts.alreadyCertified}
                      </Button>
                    )}

                    {exam.userStatus === 'has_voucher' && (
                      <Button
                        onClick={() => handleScheduleExam(exam)}
                        className={`w-full ${
                          exam.certification_type === 'CP'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        {texts.scheduleExam}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}

                    {exam.userStatus === 'scheduled' && (
                      <div className="space-y-2">
                        <Button disabled variant="secondary" className="w-full">
                          <Clock className="w-4 h-4 mr-2" />
                          {texts.waitingForTime}
                        </Button>
                        <p className="text-xs text-center text-gray-500">{texts.launchBefore}</p>
                      </div>
                    )}

                    {exam.userStatus === 'ready' && (
                      <Button
                        onClick={() => handleLaunchExam(exam)}
                        className="w-full bg-green-600 hover:bg-green-700 animate-pulse"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {texts.launchExamNow}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-900">{texts.noExamsAvailable}</AlertTitle>
            <AlertDescription className="text-yellow-800">{texts.noExamsDesc}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Attempt History */}
      {history && history.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{texts.attemptHistory}</h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {texts.exam}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {texts.type}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {texts.date}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {texts.score}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {texts.status}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {history.map((attempt: any) => (
                    <tr key={attempt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {language === 'ar' && attempt.quiz?.title_ar
                            ? attempt.quiz.title_ar
                            : attempt.quiz?.title || texts.unknownExam}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            attempt.quiz?.certification_type === 'CP'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                          }
                        >
                          BDA-{attempt.quiz?.certification_type}™
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(attempt.started_at).toLocaleDateString(
                          language === 'ar' ? 'ar-SA' : 'en-US'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {attempt.score !== null ? (
                          <span
                            className={`font-semibold ${
                              attempt.passed ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {attempt.score}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {attempt.passed === true && (
                          <Badge className="bg-green-100 text-green-800">{texts.passed}</Badge>
                        )}
                        {attempt.passed === false && (
                          <Badge className="bg-red-100 text-red-800">{texts.failed}</Badge>
                        )}
                        {attempt.passed === null && !attempt.completed_at && (
                          <Badge className="bg-yellow-100 text-yellow-800">{texts.inProgress}</Badge>
                        )}
                        {attempt.passed === null && attempt.completed_at && (
                          <Badge className="bg-gray-100 text-gray-800">{texts.completed}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
