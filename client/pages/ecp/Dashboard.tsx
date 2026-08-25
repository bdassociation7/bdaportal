/**
 * ECP Partner Dashboard
 * Main dashboard for Exclusive Certification Partners
 */

import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  GraduationCap,
  Trophy,
  TrendingUp,
  Calendar,
  Ticket,
  PlusCircle,
  ArrowRight,
  Loader2,
  UserPlus,
  CalendarPlus,
} from 'lucide-react';
import { useECPDashboard, useBatches, useTrainees } from '@/entities/ecp';
import { useLanguage } from '@/contexts/LanguageContext';

// ============================================================================
// Translations
// ============================================================================

const translations = {
  en: {
    // Header
    title: 'ECP Partner Dashboard',
    subtitle: 'Manage your training programs, candidates, and certification deliveries.',
    scheduleTraining: 'Schedule Training',
    addTrainee: 'Add Trainee',
    viewReports: 'View Reports',
    // Metrics
    activeTrainees: 'Active Trainees',
    totalRegistered: (count: number) => `${count} total registered`,
    examVouchers: 'Exam Vouchers',
    availableForUse: 'Available for use',
    trainingBatches: 'Training Batches',
    totalBatches: (count: number) => `${count} total batches`,
    certifiedTrainers: 'Certified Trainers',
    totalTrainers: (count: number) => `${count} total trainers`,
    // Performance Overview
    performanceOverview: 'Performance Overview',
    examPassRate: 'Exam Pass Rate',
    certificationRate: 'Certification Rate',
    certifiedCandidates: 'Certified Candidates',
    allTimeCertifications: 'All-time certifications',
    activeBatches: 'Active Batches',
    currentlyRunning: 'Currently running',
    viewDetailedReports: 'View Detailed Reports',
    // Upcoming Trainings
    upcomingTrainings: 'Upcoming Trainings',
    noUpcomingTrainings: 'No upcoming trainings',
    scheduleOneNow: 'Schedule one now',
    enroled: 'enroled',
    // Recent Trainees
    recentTrainees: 'Recent Trainees',
    viewAll: 'View All',
    noTraineesYet: 'No trainees registered yet',
    addFirstTrainee: 'Add your first trainee',
    certified: 'Certified',
    examPassed: 'Exam Passed',
    // Quick Actions
    bulkUploadTrainees: 'Bulk Upload Trainees',
    importFromExcel: 'Import from Excel/CSV',
    requestVouchers: 'Request Vouchers',
    orderExamVouchers: 'Order exam vouchers',
    partnerToolkit: 'Partner Toolkit',
    marketingResources: 'Marketing & resources',
    // General
    na: 'N/A',
  },
  ar: {
    // Header
    title: 'لوحة تحكم شريك ECP',
    subtitle: 'إدارة برامج التدريب والمرشحين وتسليم الشهادات.',
    scheduleTraining: 'جدولة تدريب',
    addTrainee: 'إضافة متدرب',
    viewReports: 'عرض التقارير',
    // Metrics
    activeTrainees: 'المتدربون النشطون',
    totalRegistered: (count: number) => `${count} مسجل إجمالي`,
    examVouchers: 'قسائم الامتحان',
    availableForUse: 'متاحة للاستخدام',
    trainingBatches: 'دفعات التدريب',
    totalBatches: (count: number) => `${count} دفعة إجمالي`,
    certifiedTrainers: 'المدربون المعتمدون',
    totalTrainers: (count: number) => `${count} مدرب إجمالي`,
    // Performance Overview
    performanceOverview: 'نظرة عامة على الأداء',
    examPassRate: 'معدل النجاح في الامتحان',
    certificationRate: 'معدل الشهادات',
    certifiedCandidates: 'المرشحون المعتمدون',
    allTimeCertifications: 'جميع الشهادات',
    activeBatches: 'الدفعات النشطة',
    currentlyRunning: 'قيد التنفيذ حالياً',
    viewDetailedReports: 'عرض التقارير التفصيلية',
    // Upcoming Trainings
    upcomingTrainings: 'التدريبات القادمة',
    noUpcomingTrainings: 'لا توجد تدريبات قادمة',
    scheduleOneNow: 'جدولة واحدة الآن',
    enroled: 'مسجل',
    // Recent Trainees
    recentTrainees: 'المتدربون الجدد',
    viewAll: 'عرض الكل',
    noTraineesYet: 'لم يتم تسجيل متدربين بعد',
    addFirstTrainee: 'أضف أول متدرب',
    certified: 'معتمد',
    examPassed: 'اجتاز الامتحان',
    // Quick Actions
    bulkUploadTrainees: 'رفع متدربين بالجملة',
    importFromExcel: 'استيراد من Excel/CSV',
    requestVouchers: 'طلب قسائم',
    orderExamVouchers: 'طلب قسائم امتحان',
    partnerToolkit: 'أدوات الشريك',
    marketingResources: 'التسويق والموارد',
    // General
    na: 'غير متاح',
  },
};

export default function ECPDashboard() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const texts = translations[language];
  const { data: stats, isLoading: statsLoading } = useECPDashboard();
  const { data: batches, isLoading: batchesLoading } = useBatches({ status: 'scheduled' });
  const { data: recentTrainees, isLoading: traineesLoading } = useTrainees({});

  // Get upcoming batches (next 3)
  const upcomingBatches = (batches || [])
    .filter(b => new Date(b.training_start_date) >= new Date())
    .slice(0, 3);

  // Get recent trainees (last 5)
  const latestTrainees = (recentTrainees || []).slice(0, 5);

  const isLoading = statsLoading || batchesLoading || traineesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: texts.activeTrainees,
      value: stats?.active_trainees || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      subtitle: texts.totalRegistered(stats?.total_trainees || 0),
      onClick: () => navigate('/ecp/candidates'),
    },
    {
      title: texts.examVouchers,
      value: stats?.vouchers_available || 0,
      icon: Ticket,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      subtitle: texts.availableForUse,
      onClick: () => navigate('/ecp/vouchers'),
    },
    {
      title: texts.trainingBatches,
      value: stats?.active_batches || 0,
      icon: GraduationCap,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      subtitle: texts.totalBatches(stats?.total_batches || 0),
      onClick: () => navigate('/ecp/trainings'),
    },
    {
      title: texts.certifiedTrainers,
      value: stats?.active_trainers || 0,
      icon: Trophy,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      subtitle: texts.totalTrainers(stats?.total_trainers || 0),
      onClick: () => navigate('/ecp/trainers'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold">{texts.title}</h1>
        <p className="mt-2 opacity-90">
          {texts.subtitle}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/ecp/trainings?action=new')}
          >
            <CalendarPlus className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
            {texts.scheduleTraining}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/ecp/candidates?action=new')}
          >
            <UserPlus className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
            {texts.addTrainee}
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            key={metric.title}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={metric.onClick}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                  <metric.icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                <div className={language === 'ar' ? 'mr-4' : 'ml-4'}>
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
        {/* Performance Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {texts.performanceOverview}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Pass Rate */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">{texts.examPassRate}</span>
                  <span className="text-sm text-gray-600">
                    {stats?.pass_rate ? `${stats.pass_rate}%` : texts.na}
                  </span>
                </div>
                <Progress value={stats?.pass_rate || 0} className="h-3" />
              </div>

              {/* Certification Progress */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">{texts.certificationRate}</span>
                  <span className="text-sm text-gray-600">
                    {stats?.total_trainees
                      ? `${Math.round((stats.certified_trainees / stats.total_trainees) * 100)}%`
                      : texts.na}
                  </span>
                </div>
                <Progress
                  value={
                    stats?.total_trainees
                      ? (stats.certified_trainees / stats.total_trainees) * 100
                      : 0
                  }
                  className="h-3"
                />
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium text-gray-600">{texts.certifiedCandidates}</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.certified_trainees || 0}</p>
                  <p className="text-xs text-gray-500">{texts.allTimeCertifications}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{texts.activeBatches}</p>
                  <p className="text-2xl font-bold text-blue-600">{stats?.active_batches || 0}</p>
                  <p className="text-xs text-gray-500">{texts.currentlyRunning}</p>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Upcoming Trainings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              {texts.upcomingTrainings}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/ecp/trainings?action=new')}
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingBatches.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{texts.noUpcomingTrainings}</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => navigate('/ecp/trainings?action=new')}
                >
                  {texts.scheduleOneNow}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => navigate(`/ecp/trainings/${batch.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium">{batch.batch_name}</p>
                      <p className="text-xs text-gray-500">
                        {batch.training_start_date
                          ? new Date(batch.training_start_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB')
                          : 'Schedule to be confirmed'}
                      </p>
                      <div className="mt-1">
                        <span className="text-xs text-blue-600">
                          {batch.trainee_count || 0} {texts.enroled}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className={`h-4 w-4 text-gray-400 ${language === 'ar' ? 'rotate-180' : ''}`} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Trainees */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{texts.recentTrainees}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/ecp/candidates')}>
            {texts.viewAll}
          </Button>
        </CardHeader>
        <CardContent>
          {latestTrainees.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{texts.noTraineesYet}</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate('/ecp/candidates?action=new')}
              >
                {texts.addFirstTrainee}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {latestTrainees.map((trainee) => (
                <div
                  key={trainee.id}
                  className="flex items-start gap-4 pb-4 border-b last:border-0"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {trainee.first_name[0]}
                      {trainee.last_name[0]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {trainee.first_name} {trainee.last_name}
                    </p>
                    <p className="text-sm text-gray-600">{trainee.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        BDA-{trainee.certification_type}
                      </Badge>
                      <Badge
                        variant={trainee.certified ? 'default' : 'secondary'}
                        className={`text-xs ${
                          trainee.certified ? 'bg-green-100 text-green-700' : ''
                        }`}
                      >
                        {trainee.certified
                          ? texts.certified
                          : trainee.exam_passed
                            ? texts.examPassed
                            : trainee.enrolment_status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(trainee.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/ecp/candidates?action=upload')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">{texts.bulkUploadTrainees}</p>
              <p className="text-sm text-gray-500">{texts.importFromExcel}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/ecp/vouchers')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <Ticket className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium">{texts.requestVouchers}</p>
              <p className="text-sm text-gray-500">{texts.orderExamVouchers}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/ecp/toolkit')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <GraduationCap className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="font-medium">{texts.partnerToolkit}</p>
              <p className="text-sm text-gray-500">{texts.marketingResources}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
