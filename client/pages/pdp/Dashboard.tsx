/**
 * PDP Partner Dashboard
 *
 * Real data-driven dashboard for Professional Development Providers
 * Shows programs, enrollments, BoCK alignment, and annual report status
 */

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Star,
  TrendingUp,
  FileText,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Award,
  Plus,
  Users,
  GraduationCap,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { usePDPDashboard, useMyPrograms, useAnnualReports, usePDPLicense } from "@/entities/pdp";
import type { PDPProgram, ProgramStatus } from "@/entities/pdp";
import { useLanguage } from "@/contexts/LanguageContext";

const translations = {
  en: {
    // Header
    dashboardTitle: "PDP Partner Dashboard",
    dashboardSubtitle: "Manage your accredited programs, track performance, and grow your offerings.",
    submitNewProgram: "Submit New Program",
    viewGuidelines: "View Guidelines",

    // Error state
    errorLoadingTitle: "Error Loading Dashboard",
    errorLoadingDesc: "Unable to load dashboard data. Please try again later.",

    // Metrics cards
    activePrograms: "Active Programs",
    totalLabel: "total",
    pendingReview: "Pending Review",
    awaitingApproval: "Awaiting approval",
    totalEnrollments: "Total Enrolments",
    allTime: "All time",
    pdcsIssued: "PDCs Issued",
    professionalCredits: "Professional credits",

    // Status labels
    statusDraft: "Draft",
    statusSubmitted: "Submitted",
    statusUnderReview: "Under Review",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    statusExpired: "Expired",

    // My Programs section
    myPrograms: "My Programs",
    viewAll: "View All",
    pdcs: "PDCs",
    enrolled: "enroled",
    noProgramsYet: "No programs yet",
    submitFirstProgram: "Submit Your First Program",

    // Deadlines section
    upcomingDeadlines: "Upcoming Deadlines",
    annualReportSubmission: "Annual Report Submission",
    dueInDays: (days: number) => `Due in ${days} days`,
    programsUnderReview: (count: number) => `${count} Program(s) Under Review`,
    checkStatus: "Check status",
    partnershipRenewal: "Partnership Renewal",
    renewalOverdue: "Renewal overdue",
    nextRenewalIn: (months: number) => `Next renewal in ${months} month${months !== 1 ? 's' : ''}`,
    allCaughtUp: "All caught up!",

    // Key Metrics section
    keyMetrics: "Key Metrics",
    programCompletionRate: "Program Completion Rate",
    completions: "Completions",

    // Annual Reports section
    annualReports: "Annual Reports",
    manage: "Manage",
    annualReport: "Annual Report",
    programs: "programs",
    enrolments: "enrolments",
    noAnnualReportsYet: "No annual reports yet",
    createReport: "Create Report",

    // Quick Actions
    quickActions: "Quick Actions",
    newProgram: "New Program",
    getSupport: "Get Support",

    // Activity types
    course: "Course",
    workshop: "Workshop",
    webinar: "Webinar",
    conference: "Conference",
    self_study: "Self Study",
    coaching: "Coaching",
    mentoring: "Mentoring",
    other: "Other",
  },
  ar: {
    // Header
    dashboardTitle: "لوحة تحكم شريك PDP",
    dashboardSubtitle: "إدارة برامجك المعتمدة، تتبع الأداء، وتطوير عروضك.",
    submitNewProgram: "تقديم برنامج جديد",
    viewGuidelines: "عرض الإرشادات",

    // Error state
    errorLoadingTitle: "خطأ في تحميل لوحة التحكم",
    errorLoadingDesc: "تعذر تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى لاحقاً.",

    // Metrics cards
    activePrograms: "البرامج النشطة",
    totalLabel: "الإجمالي",
    pendingReview: "قيد المراجعة",
    awaitingApproval: "في انتظار الموافقة",
    totalEnrolments: "إجمالي التسجيلات",
    allTime: "كل الأوقات",
    pdcsIssued: "PDCs صادرة",
    professionalCredits: "ساعات التطوير المهني",

    // Status labels
    statusDraft: "مسودة",
    statusSubmitted: "مُقدَّم",
    statusUnderReview: "قيد المراجعة",
    statusApproved: "معتمد",
    statusRejected: "مرفوض",
    statusExpired: "منتهي الصلاحية",

    // My Programs section
    myPrograms: "برامجي",
    viewAll: "عرض الكل",
    pdcs: "PDCs",
    enroled: "مسجل",
    noProgramsYet: "لا توجد برامج بعد",
    submitFirstProgram: "قدّم برنامجك الأول",

    // Deadlines section
    upcomingDeadlines: "المواعيد النهائية القادمة",
    annualReportSubmission: "تقديم التقرير السنوي",
    dueInDays: (days: number) => `مستحق خلال ${days} يوم`,
    programsUnderReview: (count: number) => `${count} برنامج قيد المراجعة`,
    checkStatus: "تحقق من الحالة",
    partnershipRenewal: "تجديد الشراكة",
    renewalOverdue: "التجديد متأخر",
    nextRenewalIn: (months: number) => `التجديد التالي خلال ${months} شهر`,
    allCaughtUp: "كل شيء محدّث!",

    // Key Metrics section
    keyMetrics: "المقاييس الرئيسية",
    programCompletionRate: "معدل إتمام البرامج",
    completions: "الإتمامات",

    // Annual Reports section
    annualReports: "التقارير السنوية",
    manage: "إدارة",
    annualReport: "التقرير السنوي",
    programs: "برامج",
    enrolments: "تسجيلات",
    noAnnualReportsYet: "لا توجد تقارير سنوية بعد",
    createReport: "إنشاء تقرير",

    // Quick Actions
    quickActions: "إجراءات سريعة",
    newProgram: "برنامج جديد",
    getSupport: "الحصول على الدعم",

    // Activity types
    course: "دورة تدريبية",
    workshop: "ورشة عمل",
    webinar: "ندوة عبر الإنترنت",
    conference: "مؤتمر",
    self_study: "دراسة ذاتية",
    coaching: "تدريب",
    mentoring: "إرشاد",
    other: "أخرى",
  },
};

const getStatusLabel = (status: ProgramStatus, texts: typeof translations.en): string => {
  const labels: Record<ProgramStatus, string> = {
    draft: texts.statusDraft,
    submitted: texts.statusSubmitted,
    under_review: texts.statusUnderReview,
    approved: texts.statusApproved,
    rejected: texts.statusRejected,
    expired: texts.statusExpired,
  };
  return labels[status];
};

const getActivityTypeLabel = (activityType: string, texts: typeof translations.en): string => {
  const types: Record<string, string> = {
    course: texts.course,
    workshop: texts.workshop,
    webinar: texts.webinar,
    conference: texts.conference,
    self_study: texts.self_study,
    coaching: texts.coaching,
    mentoring: texts.mentoring,
    other: texts.other,
  };
  return types[activityType] || activityType.replace('_', ' ');
};

const statusColors: Record<ProgramStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
};

export default function PDPDashboard() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const texts = translations[language];

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, error: statsError } = usePDPDashboard();

  // Fetch recent programs (limit 5)
  const { data: programs, isLoading: programsLoading } = useMyPrograms({});

  // Fetch annual reports
  const { data: reports, isLoading: reportsLoading } = useAnnualReports();

  // Fetch license info
  const { data: license, isLoading: licenseLoading } = usePDPLicense();

  const isLoading = statsLoading || programsLoading || reportsLoading || licenseLoading;

  // Calculate deadline alerts
  const currentYear = new Date().getFullYear();
  const latestReport = reports?.find(r => r.report_year === currentYear - 1);
  const reportDueDate = new Date(currentYear, 2, 31); // March 31
  const daysUntilReportDue = Math.ceil((reportDueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Calculate license renewal
  const licenseExpiryDate = license?.license?.expiry_date ? new Date(license.license.expiry_date) : null;
  const monthsUntilRenewal = licenseExpiryDate
    ? Math.ceil((licenseExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
    : null;

  // Programs under review
  const pendingPrograms = programs?.filter(p => p.status === 'under_review' || p.status === 'submitted') || [];

  if (statsError) {
    return (
      <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <Alert variant="destructive">
          <AlertCircle className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
          <AlertTitle className={language === 'ar' ? 'text-right' : ''}>{texts.errorLoadingTitle}</AlertTitle>
          <AlertDescription className={language === 'ar' ? 'text-right' : ''}>
            {texts.errorLoadingDesc}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${language === 'ar' ? 'from-navy-800 via-royal-600 to-sky-500' : 'from-sky-500 via-royal-600 to-navy-800'} rounded-lg p-6 text-white`}>
        <h1 className={`text-3xl font-bold ${language === 'ar' ? 'text-right' : ''}`}>{texts.dashboardTitle}</h1>
        <p className={`mt-2 opacity-90 ${language === 'ar' ? 'text-right' : ''}`}>
          {texts.dashboardSubtitle}
        </p>
        <div className={`mt-4 flex gap-3 ${language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/pdp/submit-program")}
            className={language === 'ar' ? 'flex-row-reverse' : ''}
          >
            <Plus className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
            {texts.submitNewProgram}
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <div className="p-3 rounded-lg bg-green-100">
                    <BookOpen className="h-6 w-6 text-green-600" />
                  </div>
                  <div className={language === 'ar' ? 'mr-4 text-right' : 'ml-4'}>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.active_programs ?? 0}
                    </p>
                    <p className="text-sm font-medium text-gray-600">{texts.activePrograms}</p>
                    <p className="text-xs text-gray-500">
                      {stats?.total_programs ?? 0} {texts.totalLabel}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <div className="p-3 rounded-lg bg-orange-100">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className={language === 'ar' ? 'mr-4 text-right' : 'ml-4'}>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.pending_programs ?? 0}
                    </p>
                    <p className="text-sm font-medium text-gray-600">{texts.pendingReview}</p>
                    <p className="text-xs text-gray-500">{texts.awaitingApproval}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <div className="p-3 rounded-lg bg-blue-100">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className={language === 'ar' ? 'mr-4 text-right' : 'ml-4'}>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.total_enrolments?.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US') ?? 0}
                    </p>
                    <p className="text-sm font-medium text-gray-600">{texts.totalEnrolments}</p>
                    <p className="text-xs text-gray-500">{texts.allTime}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <div className="p-3 rounded-lg bg-purple-100">
                    <Award className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className={language === 'ar' ? 'mr-4 text-right' : 'ml-4'}>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.total_pdc_credits?.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US') ?? 0}
                    </p>
                    <p className="text-sm font-medium text-gray-600">{texts.pdcsIssued}</p>
                    <p className="text-xs text-gray-500">{texts.professionalCredits}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Program Performance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <span className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <BookOpen className="h-5 w-5 text-primary" />
                {texts.myPrograms}
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigate("/pdp/programs")} className={language === 'ar' ? 'flex-row-reverse' : ''}>
                {texts.viewAll}
                <ArrowRight className={`h-4 w-4 ${language === 'ar' ? 'mr-1 rotate-180' : 'ml-1'}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {programsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : programs && programs.length > 0 ? (
              <div className="space-y-4">
                {programs.slice(0, 5).map((program) => (
                  <div key={program.id} className="border rounded-lg p-4">
                    <div className={`flex items-center justify-between mb-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <h4 className={`font-medium ${language === 'ar' ? 'text-right' : ''}`}>{program.program_name}</h4>
                      <Badge className={statusColors[program.status || 'draft']}>
                        {getStatusLabel(program.status || 'draft', texts)}
                      </Badge>
                    </div>
                    <div className={`grid grid-cols-3 gap-4 text-sm text-gray-600 ${language === 'ar' ? 'text-right' : ''}`}>
                      <div className={`flex items-center gap-1 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <GraduationCap className="h-4 w-4" />
                        <span>{getActivityTypeLabel(program.activity_type, texts)}</span>
                      </div>
                      <div className={`flex items-center gap-1 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <Award className="h-4 w-4" />
                        <span>{program.max_pdc_credits} {texts.pdcs}</span>
                      </div>
                      <div className={`flex items-center gap-1 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <Users className="h-4 w-4" />
                        <span>{program.enrolment_count ?? 0} {texts.enroled}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {programs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{texts.noProgramsYet}</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => navigate("/pdp/submit-program")}
                    >
                      {texts.submitFirstProgram}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{texts.noProgramsYet}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/pdp/submit-program")}
                >
                  {texts.submitFirstProgram}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deadlines & Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {texts.upcomingDeadlines}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Annual Report Deadline */}
              {daysUntilReportDue > 0 && !latestReport && (
                <div
                  className={`flex items-center justify-between p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                  onClick={() => navigate("/pdp/annual-report")}
                >
                  <div className={language === 'ar' ? 'text-right' : ''}>
                    <p className="text-sm font-medium">{texts.annualReportSubmission}</p>
                    <p className={`text-xs ${
                      daysUntilReportDue <= 15 ? 'text-red-600' :
                      daysUntilReportDue <= 30 ? 'text-orange-600' :
                      'text-blue-600'
                    }`}>
                      {texts.dueInDays(daysUntilReportDue)}
                    </p>
                  </div>
                  <ArrowRight className={`h-4 w-4 text-gray-400 ${language === 'ar' ? 'rotate-180' : ''}`} />
                </div>
              )}

              {/* Pending Reviews */}
              {pendingPrograms.length > 0 && (
                <div
                  className={`flex items-center justify-between p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                  onClick={() => navigate("/pdp/programs")}
                >
                  <div className={language === 'ar' ? 'text-right' : ''}>
                    <p className="text-sm font-medium">{texts.programsUnderReview(pendingPrograms.length)}</p>
                    <p className="text-xs text-blue-600">
                      {texts.checkStatus}
                    </p>
                  </div>
                  <ArrowRight className={`h-4 w-4 text-gray-400 ${language === 'ar' ? 'rotate-180' : ''}`} />
                </div>
              )}

              {/* Partnership Renewal */}
              {monthsUntilRenewal !== null && (
                <div className={`flex items-center justify-between p-3 rounded-lg ${language === 'ar' ? 'flex-row-reverse' : ''} ${
                  monthsUntilRenewal <= 2 ? 'bg-red-50' :
                  monthsUntilRenewal <= 6 ? 'bg-orange-50' :
                  'bg-gray-50'
                }`}>
                  <div className={language === 'ar' ? 'text-right' : ''}>
                    <p className="text-sm font-medium">{texts.partnershipRenewal}</p>
                    <p className={`text-xs ${
                      monthsUntilRenewal <= 2 ? 'text-red-600' :
                      monthsUntilRenewal <= 6 ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      {monthsUntilRenewal <= 0
                        ? texts.renewalOverdue
                        : texts.nextRenewalIn(monthsUntilRenewal)
                      }
                    </p>
                  </div>
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
              )}

              {daysUntilReportDue <= 0 && latestReport && pendingPrograms.length === 0 && (monthsUntilRenewal === null || monthsUntilRenewal > 6) && (
                <div className="text-center py-4 text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">{texts.allCaughtUp}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <TrendingUp className="h-5 w-5 text-green-600" />
              {texts.keyMetrics}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className={`flex justify-between mb-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm font-medium">{texts.programCompletionRate}</span>
                  <span className="text-sm text-gray-600">
                    {stats?.completion_rate ?? 0}%
                  </span>
                </div>
                <Progress value={stats?.completion_rate ?? 0} className="h-3" />
              </div>

              <div>
                <div className={`flex justify-between mb-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm font-medium">{texts.activePrograms}</span>
                  <span className="text-sm text-gray-600">
                    {stats?.active_programs ?? 0} / {stats?.total_programs ?? 0}
                  </span>
                </div>
                <Progress
                  value={stats?.total_programs ? ((stats?.active_programs ?? 0) / stats.total_programs) * 100 : 0}
                  className="h-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className={language === 'ar' ? 'text-right' : ''}>
                  <p className="text-sm font-medium text-gray-600">{texts.completions}</p>
                  <p className="text-2xl font-bold">{stats?.completions?.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US') ?? 0}</p>
                </div>
                <div className={language === 'ar' ? 'text-right' : ''}>
                  <p className="text-sm font-medium text-gray-600">{texts.pdcsIssued}</p>
                  <p className="text-2xl font-bold">{stats?.total_pdc_credits?.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US') ?? 0}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Annual Reports */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <span className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <FileText className="h-5 w-5 text-blue-600" />
                {texts.annualReports}
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigate("/pdp/annual-report")} className={language === 'ar' ? 'flex-row-reverse' : ''}>
                {texts.manage}
                <ArrowRight className={`h-4 w-4 ${language === 'ar' ? 'mr-1 rotate-180' : 'ml-1'}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : reports && reports.length > 0 ? (
              <div className="space-y-3">
                {reports.slice(0, 3).map((report) => (
                  <div
                    key={report.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={language === 'ar' ? 'text-right' : ''}>
                      <p className="font-medium">{report.report_year} {texts.annualReport}</p>
                      <p className="text-sm text-gray-600">
                        {report.total_programs} {texts.programs} | {report.total_enrolments} {texts.enrolments}
                      </p>
                    </div>
                    <Badge className={
                      report.status === 'approved' ? 'bg-green-100 text-green-700' :
                      report.status === 'submitted' || report.status === 'under_review'
                        ? 'bg-orange-100 text-orange-700' :
                      report.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {getStatusLabel(report.status as ProgramStatus, texts)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{texts.noAnnualReportsYet}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate("/pdp/annual-report")}
                >
                  {texts.createReport}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'text-right' : ''}>{texts.quickActions}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate("/pdp/submit-program")}
            >
              <Plus className="h-6 w-6 text-green-600" />
              <span className="text-sm">{texts.newProgram}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate("/pdp/programs")}
            >
              <BookOpen className="h-6 w-6 text-blue-600" />
              <span className="text-sm">{texts.myPrograms}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate("/pdp/annual-report")}
            >
              <FileText className="h-6 w-6 text-purple-600" />
              <span className="text-sm">{texts.annualReport}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate("/pdp/support")}
            >
              <AlertCircle className="h-6 w-6 text-orange-600" />
              <span className="text-sm">{texts.getSupport}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
