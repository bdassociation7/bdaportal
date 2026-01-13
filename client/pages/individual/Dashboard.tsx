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
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useUserCertifications, useCertificationStats } from "@/entities/certifications";
import { usePdcEntries } from "@/entities/pdcs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

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

  const certStats = certStatsResult?.data;

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
