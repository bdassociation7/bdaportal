import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  Clock,
  BookOpen,
  ClipboardCheck,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  CalendarCheck,
  Play,
  Sparkles,
  Timer,
} from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useUserCertifications, useCertificationStats } from "@/entities/certifications";
import { usePdcEntries } from "@/entities/pdcs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

// ============================================================================
// Scheduled Exam Widget with Countdown
// ============================================================================

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isReady: boolean;
}

function useCountdown(targetDate: string): CountdownTime {
  const [countdown, setCountdown] = useState<CountdownTime>(() => calculateCountdown(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(calculateCountdown(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return countdown;
}

function calculateCountdown(targetDate: string): CountdownTime {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const windowStart = target - 15 * 60 * 1000;
  const difference = target - now;

  if (difference <= 0 || now >= windowStart) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isReady: now >= windowStart };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
    isReady: false,
  };
}

interface ScheduledExamWidgetProps {
  booking: any;
  quiz: any;
  onLaunch: () => void;
  language: string;
}

function ScheduledExamWidget({ booking, quiz, onLaunch, language }: ScheduledExamWidgetProps) {
  const countdown = useCountdown(booking.scheduled_start_time);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      weekday: 'short',
      month: 'short',
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
    upcomingExam: 'الامتحان القادم',
    startsIn: 'يبدأ خلال',
    days: 'يوم',
    hours: 'ساعة',
    min: 'د',
    sec: 'ث',
    readyNow: 'جاهز الآن!',
    launchExam: 'ابدأ الامتحان',
    viewDetails: 'عرض التفاصيل',
    at: 'في',
  } : {
    upcomingExam: 'Upcoming Exam',
    startsIn: 'Starts in',
    days: 'd',
    hours: 'h',
    min: 'm',
    sec: 's',
    readyNow: 'Ready Now!',
    launchExam: 'Launch Exam',
    viewDetails: 'View Details',
    at: 'at',
  };

  if (countdown.isReady) {
    return (
      <Card className="border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg animate-pulse">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full animate-bounce">
                <Sparkles className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">{texts.readyNow}</p>
                <p className="font-bold text-green-900">{quiz?.title || 'Certification Exam'}</p>
              </div>
            </div>
            <Button onClick={onLaunch} className="bg-green-600 hover:bg-green-700">
              <Play className="mr-2 h-4 w-4" />
              {texts.launchExam}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md">
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <CalendarCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">{texts.upcomingExam}</p>
              <p className="font-bold text-blue-900">{quiz?.title || 'Certification Exam'}</p>
              <p className="text-xs text-blue-700">
                {formatDate(booking.scheduled_start_time)} {texts.at} {formatTime(booking.scheduled_start_time)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm">
              <Timer className="h-4 w-4 text-blue-600" />
              <span className="text-blue-800 font-mono font-bold">
                {countdown.days > 0 && `${countdown.days}${texts.days} `}
                {String(countdown.hours).padStart(2, '0')}{texts.hours}
                {String(countdown.minutes).padStart(2, '0')}{texts.min}
                {String(countdown.seconds).padStart(2, '0')}{texts.sec}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const WP_API_BASE_URL = import.meta.env.VITE_WP_API_BASE_URL || 'http://localhost:8080/wp-json';

export default function IndividualDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Fetch real data
  const { data: certStatsResult } = useCertificationStats(user?.id || '');
  const { data: certsResult } = useUserCertifications(user?.id || '', { status: 'active' });

  // Fetch user's PDC entries
  const { data: pdcEntriesResult } = usePdcEntries({ userId: user?.id });
  const pdcEntries = pdcEntriesResult?.data || [];

  // Determine active certification level for PDC tracking
  // If user has both CP and SCP, SCP is the active level (higher certification)
  // PDCs should only count toward the active certification
  const activeCerts = certsResult?.data || [];
  const hasSCP = activeCerts.some(cert => cert.certification_type === 'SCP');
  const hasCP = activeCerts.some(cert => cert.certification_type === 'CP');
  const activeCertificationType = hasSCP ? 'SCP' : 'CP';

  // Calculate user-specific PDC stats - ONLY for active certification level
  // If user has both CP and SCP, only count SCP entries
  const activePdcEntries = pdcEntries.filter(
    (e) => e.certification_type === activeCertificationType
  );

  const pdcStats = {
    total_approved: activePdcEntries
      .filter((e) => e.status === 'approved')
      .reduce((sum, e) => sum + (e.credits_approved || 0), 0),
    total_pending: activePdcEntries.filter((e) => e.status === 'pending').length,
    total_submissions: activePdcEntries.length,
  };

  // Fetch books count
  const { data: booksCount } = useQuery({
    queryKey: ['books-count', user?.email],
    queryFn: async () => {
      if (!user?.email) return 0;
      const response = await fetch(
        `${WP_API_BASE_URL}/bda-portal/v1/woocommerce/user-books?customer_email=${user.email}`
      );
      const result = await response.json();
      return result.success ? result.data.length : 0;
    },
    enabled: !!user?.email,
  });

  // Fetch mock exams count
  const { data: mockExamsCount } = useQuery({
    queryKey: ['mock-exams-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('mock_exam_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id || '');

      if (error) {
        console.error('Error fetching mock exams count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Fetch upcoming scheduled exam
  const { data: scheduledExam } = useQuery({
    queryKey: ['scheduled-exam', user?.id],
    queryFn: async () => {
      // Get the next upcoming booking
      const { data: bookings, error: bookingError } = await supabase
        .from('exam_bookings')
        .select('*')
        .eq('user_id', user?.id || '')
        .in('status', ['scheduled', 'rescheduled'])
        .gte('scheduled_start_time', new Date().toISOString())
        .order('scheduled_start_time', { ascending: true })
        .limit(1);

      if (bookingError || !bookings || bookings.length === 0) {
        return null;
      }

      const booking = bookings[0];

      // Get the quiz info
      const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, title, title_ar, certification_type')
        .eq('id', booking.quiz_id)
        .single();

      return { booking, quiz };
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refresh every minute
  });

  const certStats = certStatsResult?.data;
  const { language } = useLanguage();

  // Calculate PDC progress (assuming 60 credits over 3 years)
  const pdcProgress = pdcStats ? Math.min(100, (pdcStats.total_approved / 60) * 100) : 0;
  const pdcRemaining = pdcStats ? Math.max(0, 60 - pdcStats.total_approved) : 60;

  // Find expiring certifications (within 90 days)
  const expiringCerts = activeCerts.filter(cert => {
    const expiryDate = new Date(cert.expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
  });

  const metrics = [
    {
      title: t('dashboard.individual.activeCertifications'),
      value: certStats?.active_certifications || 0,
      icon: Award,
      color: "text-royal-600",
      bgColor: "bg-royal-100",
      subtitle: `${certStats?.cp_certifications || 0} BDA-CP™, ${certStats?.scp_certifications || 0} BDA-SCP™`,
      onClick: () => navigate('/my-certifications')
    },
    {
      title: t('dashboard.individual.pdcCredits'),
      value: pdcStats?.total_approved || 0,
      icon: Clock,
      color: "text-green-600",
      bgColor: "bg-green-100",
      subtitle: `${pdcRemaining} ${t('dashboard.individual.moreNeeded')}`,
      onClick: () => navigate('/pdcs')
    },
    {
      title: t('dashboard.individual.mockExams'),
      value: mockExamsCount || 0,
      icon: ClipboardCheck,
      color: "text-sky-600",
      bgColor: "bg-sky-100",
      subtitle: t('dashboard.individual.completed'),
      onClick: () => navigate('/mock-exams')
    },
    {
      title: t('dashboard.individual.myBooks'),
      value: booksCount || 0,
      icon: BookOpen,
      color: "text-navy-700",
      bgColor: "bg-navy-100",
      subtitle: t('dashboard.individual.availableDownloads'),
      onClick: () => navigate('/my-books')
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold">
          {t('dashboard.individual.welcomeBack')}, {user?.first_name || 'Professional'}! 👋
        </h1>
        <p className="mt-2 opacity-90">
          {t('dashboard.individual.subtitle')}
        </p>
      </div>

      {/* Scheduled Exam Widget */}
      {scheduledExam && scheduledExam.booking && (
        <ScheduledExamWidget
          booking={scheduledExam.booking}
          quiz={scheduledExam.quiz}
          onLaunch={() => navigate(`/exam-launch?booking_id=${scheduledExam.booking.id}`)}
          language={language}
        />
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            key={metric.title}
            className="hover:shadow-lg transition-all cursor-pointer"
            onClick={metric.onClick}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                  <metric.icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-xs text-gray-500">{metric.subtitle}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PDC Progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              {t('dashboard.individual.pdcProgress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">{t('dashboard.individual.currentCycleProgress')}</span>
                  <span className="text-sm text-gray-600">
                    {pdcStats?.total_approved || 0} / 60 {t('dashboard.individual.credits')}
                  </span>
                </div>
                <Progress value={pdcProgress} className="h-3" />
                <p className="text-xs text-gray-500 mt-2">
                  {pdcRemaining} {t('dashboard.individual.moreCreditsForRenewal')}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('dashboard.individual.approved')}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {pdcStats?.total_approved || 0}
                  </p>
                  <p className="text-xs text-gray-500">{t('dashboard.individual.credits')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('dashboard.individual.pending')}</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {pdcStats?.total_pending || 0}
                  </p>
                  <p className="text-xs text-gray-500">{t('dashboard.individual.underReview')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('dashboard.individual.total')}</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {pdcStats?.total_submissions || 0}
                  </p>
                  <p className="text-xs text-gray-500">{t('dashboard.individual.submissions')}</p>
                </div>
              </div>

              <Button
                className="w-full bg-royal-600 hover:bg-royal-700"
                size="sm"
                onClick={() => navigate('/pdcs')}
              >
                <Clock className="h-4 w-4 mr-2" />
                {t('dashboard.individual.managePdcEntries')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              {t('dashboard.individual.alertsReminders')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Expiring Certifications */}
              {expiringCerts.length > 0 ? (
                expiringCerts.map((cert) => {
                  const daysUntilExpiry = Math.ceil(
                    (new Date(cert.expiry_date).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={cert.id}
                      className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100"
                      onClick={() => navigate('/my-certifications')}
                    >
                      <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-900">
                          BDA-{cert.certification_type}™ {t('dashboard.individual.expiringSoon')}
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                          {daysUntilExpiry} {t('dashboard.individual.daysRemaining')}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">
                      {t('dashboard.individual.allCertificationsValid')}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {t('dashboard.individual.noUpcomingRenewals')}
                    </p>
                  </div>
                </div>
              )}

              {/* PDC Status Alerts */}
              {pdcStats && pdcStats.total_approved >= 60 && activeCerts.length > 0 ? (
                // PDC Requirement Complete
                <div
                  className="flex items-start gap-3 p-3 bg-green-50 border-2 border-green-300 rounded-lg cursor-pointer hover:bg-green-100"
                  onClick={() => navigate('/pdcs')}
                >
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-green-900">
                      {t('dashboard.individual.pdcRequirementComplete')}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {t('dashboard.individual.autoRenewalReady')}
                    </p>
                  </div>
                </div>
              ) : pdcStats && pdcStats.total_approved < 60 ? (
                // PDC Credits Still Needed
                <div
                  className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100"
                  onClick={() => navigate('/pdcs')}
                >
                  <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      {t('dashboard.individual.pdcCreditsRequired')}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {pdcRemaining} {t('dashboard.individual.moreCreditsNeeded')}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Mock Exams Available */}
              <div
                className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-100"
                onClick={() => navigate('/mock-exams')}
              >
                <ClipboardCheck className="h-5 w-5 text-royal-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-purple-900">
                    {t('dashboard.individual.practiceMockExams')}
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    {t('dashboard.individual.prepareForCertification')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.individual.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/exam-applications')}
            >
              <Award className="h-4 w-4 mr-2" />
              {t('dashboard.individual.applyForExam')}
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/mock-exams')}
            >
              <ClipboardCheck className="h-4 w-4 mr-2" />
              {t('dashboard.individual.takeMockExam')}
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/resources')}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {t('dashboard.individual.browseResources')}
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/support/new')}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              {t('dashboard.individual.getSupport')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

IndividualDashboard.displayName = 'IndividualDashboard';
