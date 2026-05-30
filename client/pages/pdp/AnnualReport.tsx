/**
 * PDP Annual Report Page
 *
 * Manage and submit annual reports for PDP partners
 * Shows historical reports and allows creating new ones
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FileText,
  Plus,
  Send,
  Save,
  Calendar,
  TrendingUp,
  Users,
  Award,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Eye,
  Edit,
  ArrowLeft,
  BarChart3,
  Target,
} from "lucide-react";
import {
  useAnnualReports,
  useCreateAnnualReport,
  useUpdateAnnualReport,
  usePDPDashboard,
} from "@/entities/pdp";
import type { AnnualReport, ReportStatus, CreateReportDTO } from "@/entities/pdp";
import { useLanguage } from "@/contexts/LanguageContext";

// =============================================================================
// Translations
// =============================================================================
const translations = {
  en: {
    // Page header
    pageTitle: "Annual Reports",
    pageDescription: "Submit and manage your annual partnership reports",

    // Quick stats
    totalReports: "Total Reports",
    approved: "Approved",
    pending: "Pending",
    currentYearPrograms: "Current Year Programs",

    // Error state
    errorTitle: "Error Loading Reports",
    errorDescription: "Unable to load annual reports. Please try again later.",

    // Report Due Alert
    reportDueTitle: "Annual Report Due",
    reportDueDesc1: "Your annual report for",
    reportDueDesc2: "is due by March 31,",
    reportDueDesc3: "Please submit your report to maintain your partnership status.",

    // Table
    reportHistory: "Report History",
    reportYear: "Report Year",
    programs: "Programs",
    enrollments: "Enrolments",
    pdcsIssued: "PDCs Issued",
    status: "Status",
    submitted: "Submitted",
    actions: "Actions",

    // Empty state
    noReports: "No Annual Reports",
    noReportsDesc: "Create your first annual report to track your partnership progress",
    createReport: "Create Report",
    createNewReport: "Create New Report",
    submit: "Submit",

    // Status labels
    statusDraft: "Draft",
    statusSubmitted: "Submitted",
    statusUnderReview: "Under Review",
    statusApproved: "Approved",
    statusRejected: "Rejected",

    // Create dialog
    createDialogTitle: "Create Annual Report",
    createDialogDesc: "Submit your annual partnership report for BDA review",
    selectYear: "Select year",
    totalProgramsLabel: "Total Programs",
    totalEnrollmentsLabel: "Total Enrolments",
    completions: "Completions",
    pdcsIssuedLabel: "PDCs Issued",

    // Form fields
    executiveSummary: "Executive Summary",
    executiveSummaryPlaceholder: "Summarise your organisation's professional development activities for the year...",
    challengesFaced: "Challenges Faced",
    challengesPlaceholder: "Describe any challenges you faced in delivering your programs...",
    plannedImprovements: "Planned Improvements",
    improvementsPlaceholder: "Outline improvements you plan to make in the coming year...",

    // Buttons
    cancel: "Cancel",
    saveAsDraft: "Save as Draft",
    submitReport: "Submit Report",
    close: "Close",

    // View dialog
    viewDialogTitle: "Annual Report",
    submittedOn: "Submitted:",
    completionRate: "Completion Rate",
    avgSatisfaction: "Avg. Satisfaction",
    challenges: "Challenges",
    reviewNotes: "Review Notes",
  },
  ar: {
    // Page header
    pageTitle: "التقارير السنوية",
    pageDescription: "قدّم وأدِر تقارير الشراكة السنوية",

    // Quick stats
    totalReports: "إجمالي التقارير",
    approved: "المعتمدة",
    pending: "قيد الانتظار",
    currentYearPrograms: "برامج العام الحالي",

    // Error state
    errorTitle: "خطأ في تحميل التقارير",
    errorDescription: "تعذر تحميل التقارير السنوية. يرجى المحاولة مرة أخرى لاحقاً.",

    // Report Due Alert
    reportDueTitle: "موعد تقديم التقرير السنوي",
    reportDueDesc1: "تقريرك السنوي لعام",
    reportDueDesc2: "مستحق بحلول 31 مارس",
    reportDueDesc3: "يرجى تقديم تقريرك للحفاظ على حالة شراكتك.",

    // Table
    reportHistory: "سجل التقارير",
    reportYear: "سنة التقرير",
    programs: "البرامج",
    enrollments: "التسجيلات",
    pdcsIssued: "نقاط PDC الصادرة",
    status: "الحالة",
    submitted: "تاريخ التقديم",
    actions: "الإجراءات",

    // Empty state
    noReports: "لا توجد تقارير سنوية",
    noReportsDesc: "أنشئ تقريرك السنوي الأول لتتبع تقدم شراكتك",
    createReport: "إنشاء تقرير",
    createNewReport: "إنشاء تقرير جديد",
    submit: "تقديم",

    // Status labels
    statusDraft: "مسودة",
    statusSubmitted: "مقدَّم",
    statusUnderReview: "قيد المراجعة",
    statusApproved: "معتمد",
    statusRejected: "مرفوض",

    // Create dialog
    createDialogTitle: "إنشاء تقرير سنوي",
    createDialogDesc: "قدّم تقرير الشراكة السنوي لمراجعة BDA",
    selectYear: "اختر السنة",
    totalProgramsLabel: "إجمالي البرامج",
    totalEnrollmentsLabel: "إجمالي التسجيلات",
    completions: "الإتمامات",
    pdcsIssuedLabel: "نقاط PDC الصادرة",

    // Form fields
    executiveSummary: "الملخص التنفيذي",
    executiveSummaryPlaceholder: "لخّص أنشطة التطوير المهني لمؤسستك خلال العام...",
    challengesFaced: "التحديات التي واجهتها",
    challengesPlaceholder: "صِف أي تحديات واجهتها في تقديم برامجك...",
    plannedImprovements: "التحسينات المخطط لها",
    improvementsPlaceholder: "حدد التحسينات التي تخطط لإجرائها في العام المقبل...",

    // Buttons
    cancel: "إلغاء",
    saveAsDraft: "حفظ كمسودة",
    submitReport: "تقديم التقرير",
    close: "إغلاق",

    // View dialog
    viewDialogTitle: "التقرير السنوي",
    submittedOn: "تاريخ التقديم:",
    completionRate: "معدل الإتمام",
    avgSatisfaction: "متوسط الرضا",
    challenges: "التحديات",
    reviewNotes: "ملاحظات المراجعة",
  },
};

// Helper function for status labels based on current language
const getStatusLabels = (texts: typeof translations.en): Record<ReportStatus, string> => ({
  draft: texts.statusDraft,
  submitted: texts.statusSubmitted,
  under_review: texts.statusUnderReview,
  approved: texts.statusApproved,
  rejected: texts.statusRejected,
});

const statusColors: Record<ReportStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AnnualReportPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const texts = translations[language];
  const statusLabels = getStatusLabels(texts);
  const isRTL = language === "ar";
  const currentYear = new Date().getFullYear();

  // State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AnnualReport | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateReportDTO>({
    report_year: currentYear - 1,
    summary: "",
    challenges: "",
    improvements_planned: "",
  });

  // Fetch data
  const { data: reports, isLoading: reportsLoading, error } = useAnnualReports();
  const { data: stats } = usePDPDashboard();

  // Mutations
  const createReport = useCreateAnnualReport();
  const updateReport = useUpdateAnnualReport();

  // Check if report for previous year exists
  const previousYearReport = reports?.find((r) => r.report_year === currentYear - 1);
  const canCreateReport = !previousYearReport;

  const handleInputChange = (field: keyof CreateReportDTO, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateReport = async (asDraft: boolean = false) => {
    const result = await createReport.mutateAsync(formData);
    if (!result.error) {
      setShowCreateDialog(false);
      setFormData({
        report_year: currentYear - 1,
        summary: "",
        challenges: "",
        improvements_planned: "",
      });
    }
  };

  const handleSubmitReport = async (report: AnnualReport) => {
    await updateReport.mutateAsync({
      id: report.id,
      dto: { status: "submitted" },
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Generate available years for report creation
  const availableYears = [];
  for (let year = currentYear - 1; year >= currentYear - 5; year--) {
    const exists = reports?.some((r) => r.report_year === year);
    if (!exists) {
      availableYears.push(year);
    }
  }

  if (error) {
    return (
      <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{texts.errorTitle}</AlertTitle>
          <AlertDescription>
            {texts.errorDescription}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isRTL ? "sm:flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-2xl font-bold text-gray-900">{texts.pageTitle}</h1>
          <p className="text-gray-600 mt-1">
            {texts.pageDescription}
          </p>
        </div>
        {availableYears.length > 0 && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
            {texts.createNewReport}
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className="p-2 rounded-lg bg-blue-100">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-600">{texts.totalReports}</p>
                <p className="text-xl font-bold">{reports?.length ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-600">{texts.approved}</p>
                <p className="text-xl font-bold">
                  {reports?.filter((r) => r.status === "approved").length ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className="p-2 rounded-lg bg-orange-100">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-600">{texts.pending}</p>
                <p className="text-xl font-bold">
                  {reports?.filter((r) =>
                    r.status === "submitted" || r.status === "under_review"
                  ).length ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className="p-2 rounded-lg bg-purple-100">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-600">{texts.currentYearPrograms}</p>
                <p className="text-xl font-bold">{stats?.active_programs ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Due Alert */}
      {!previousYearReport && (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">{texts.reportDueTitle}</AlertTitle>
          <AlertDescription className="text-orange-700">
            {texts.reportDueDesc1} {currentYear - 1} {texts.reportDueDesc2} {currentYear}.{" "}
            {texts.reportDueDesc3}
          </AlertDescription>
        </Alert>
      )}

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <FileText className="h-5 w-5 text-primary" />
            {texts.reportHistory}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : reports && reports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRTL ? "text-right" : ""}>{texts.reportYear}</TableHead>
                  <TableHead className={isRTL ? "text-right" : ""}>{texts.programs}</TableHead>
                  <TableHead className={isRTL ? "text-right" : ""}>{texts.enrollments}</TableHead>
                  <TableHead className={isRTL ? "text-right" : ""}>{texts.pdcsIssued}</TableHead>
                  <TableHead className={isRTL ? "text-right" : ""}>{texts.status}</TableHead>
                  <TableHead className={isRTL ? "text-right" : ""}>{texts.submitted}</TableHead>
                  <TableHead className={isRTL ? "text-left" : "text-right"}>{texts.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className={`font-medium ${isRTL ? "text-right" : ""}`}>
                      {report.report_year}
                    </TableCell>
                    <TableCell className={isRTL ? "text-right" : ""}>{report.total_programs}</TableCell>
                    <TableCell className={isRTL ? "text-right" : ""}>{report.total_enrollments.toLocaleString(isRTL ? "ar-EG" : "en-US")}</TableCell>
                    <TableCell className={isRTL ? "text-right" : ""}>{report.total_pdc_credits_issued.toLocaleString(isRTL ? "ar-EG" : "en-US")}</TableCell>
                    <TableCell className={isRTL ? "text-right" : ""}>
                      <Badge className={statusColors[report.status]}>
                        {statusLabels[report.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className={isRTL ? "text-right" : ""}>
                      {report.submitted_at
                        ? formatDate(report.submitted_at)
                        : "-"}
                    </TableCell>
                    <TableCell className={isRTL ? "text-left" : "text-right"}>
                      <div className={`flex gap-2 ${isRTL ? "justify-start flex-row-reverse" : "justify-end"}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowViewDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {report.status === "draft" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedReport(report);
                                // Could open edit dialog
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSubmitReport(report)}
                              disabled={updateReport.isPending}
                            >
                              <Send className={`h-4 w-4 ${isRTL ? "ml-1" : "mr-1"}`} />
                              {texts.submit}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {texts.noReports}
              </h3>
              <p className="text-gray-600 mb-4">
                {texts.noReportsDesc}
              </p>
              {availableYears.length > 0 && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                  {texts.createReport}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Report Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className={isRTL ? "text-right" : ""}>
            <DialogTitle>{texts.createDialogTitle}</DialogTitle>
            <DialogDescription>
              {texts.createDialogDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Year Selection */}
            <div className="space-y-2">
              <Label className={isRTL ? "text-right block" : ""}>{texts.reportYear}</Label>
              <Select
                value={formData.report_year.toString()}
                onValueChange={(value) =>
                  handleInputChange("report_year", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={texts.selectYear} />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auto-calculated Stats */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-600">{texts.totalProgramsLabel}</p>
                <p className="text-lg font-bold">{(stats?.total_programs ?? 0).toLocaleString(isRTL ? "ar-EG" : "en-US")}</p>
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-600">{texts.totalEnrollmentsLabel}</p>
                <p className="text-lg font-bold">
                  {(stats?.total_enrollments ?? 0).toLocaleString(isRTL ? "ar-EG" : "en-US")}
                </p>
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-600">{texts.completions}</p>
                <p className="text-lg font-bold">
                  {(stats?.completions ?? 0).toLocaleString(isRTL ? "ar-EG" : "en-US")}
                </p>
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-600">{texts.pdcsIssuedLabel}</p>
                <p className="text-lg font-bold">
                  {(stats?.total_pdc_credits ?? 0).toLocaleString(isRTL ? "ar-EG" : "en-US")}
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <Label htmlFor="summary" className={isRTL ? "text-right block" : ""}>{texts.executiveSummary}</Label>
              <Textarea
                id="summary"
                value={formData.summary}
                onChange={(e) => handleInputChange("summary", e.target.value)}
                placeholder={texts.executiveSummaryPlaceholder}
                rows={4}
                className={isRTL ? "text-right" : ""}
              />
            </div>

            {/* Challenges */}
            <div className="space-y-2">
              <Label htmlFor="challenges" className={isRTL ? "text-right block" : ""}>{texts.challengesFaced}</Label>
              <Textarea
                id="challenges"
                value={formData.challenges}
                onChange={(e) => handleInputChange("challenges", e.target.value)}
                placeholder={texts.challengesPlaceholder}
                rows={3}
                className={isRTL ? "text-right" : ""}
              />
            </div>

            {/* Improvements */}
            <div className="space-y-2">
              <Label htmlFor="improvements_planned" className={isRTL ? "text-right block" : ""}>{texts.plannedImprovements}</Label>
              <Textarea
                id="improvements_planned"
                value={formData.improvements_planned}
                onChange={(e) =>
                  handleInputChange("improvements_planned", e.target.value)
                }
                placeholder={texts.improvementsPlaceholder}
                rows={3}
                className={isRTL ? "text-right" : ""}
              />
            </div>
          </div>

          <DialogFooter className={isRTL ? "flex-row-reverse gap-2" : ""}>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={createReport.isPending}
            >
              {texts.cancel}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCreateReport(true)}
              disabled={createReport.isPending}
            >
              {createReport.isPending ? (
                <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? "ml-2" : "mr-2"}`} />
              ) : (
                <Save className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
              )}
              {texts.saveAsDraft}
            </Button>
            <Button
              onClick={() => handleCreateReport(false)}
              disabled={createReport.isPending}
            >
              {createReport.isPending ? (
                <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? "ml-2" : "mr-2"}`} />
              ) : (
                <Send className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
              )}
              {texts.submitReport}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className={isRTL ? "text-right" : ""}>
            <DialogTitle>
              {selectedReport?.report_year} {texts.viewDialogTitle}
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 py-4">
              {/* Status */}
              <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                <Badge className={statusColors[selectedReport.status]}>
                  {statusLabels[selectedReport.status]}
                </Badge>
                {selectedReport.submitted_at && (
                  <span className="text-sm text-gray-600">
                    {texts.submittedOn} {formatDate(selectedReport.submitted_at)}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedReport.total_programs.toLocaleString(isRTL ? "ar-EG" : "en-US")}
                  </p>
                  <p className="text-sm text-gray-600">{texts.programs}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedReport.total_enrollments.toLocaleString(isRTL ? "ar-EG" : "en-US")}
                  </p>
                  <p className="text-sm text-gray-600">{texts.enrollments}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedReport.total_completions.toLocaleString(isRTL ? "ar-EG" : "en-US")}
                  </p>
                  <p className="text-sm text-gray-600">{texts.completions}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedReport.total_pdc_credits_issued.toLocaleString(isRTL ? "ar-EG" : "en-US")}
                  </p>
                  <p className="text-sm text-gray-600">{texts.pdcsIssued}</p>
                </div>
              </div>

              {/* Additional Stats */}
              {(selectedReport.completion_rate || selectedReport.average_satisfaction_score) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedReport.completion_rate && (
                    <div className={`p-3 border rounded-lg ${isRTL ? "text-right" : ""}`}>
                      <p className="text-sm text-gray-600">{texts.completionRate}</p>
                      <p className="text-xl font-bold">
                        {selectedReport.completion_rate}%
                      </p>
                    </div>
                  )}
                  {selectedReport.average_satisfaction_score && (
                    <div className={`p-3 border rounded-lg ${isRTL ? "text-right" : ""}`}>
                      <p className="text-sm text-gray-600">{texts.avgSatisfaction}</p>
                      <p className="text-xl font-bold">
                        {selectedReport.average_satisfaction_score}/5
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {selectedReport.summary && (
                <div className={isRTL ? "text-right" : ""}>
                  <h4 className="font-medium text-gray-900 mb-2">{texts.executiveSummary}</h4>
                  <p className="text-gray-700">{selectedReport.summary}</p>
                </div>
              )}

              {/* Challenges */}
              {selectedReport.challenges && (
                <div className={isRTL ? "text-right" : ""}>
                  <h4 className="font-medium text-gray-900 mb-2">{texts.challenges}</h4>
                  <p className="text-gray-700">{selectedReport.challenges}</p>
                </div>
              )}

              {/* Improvements */}
              {selectedReport.improvements_planned && (
                <div className={isRTL ? "text-right" : ""}>
                  <h4 className="font-medium text-gray-900 mb-2">{texts.plannedImprovements}</h4>
                  <p className="text-gray-700">{selectedReport.improvements_planned}</p>
                </div>
              )}

              {/* Review Notes */}
              {selectedReport.review_notes && (
                <Alert className={
                  selectedReport.status === "approved"
                    ? "bg-green-50 border-green-200"
                    : selectedReport.status === "rejected"
                    ? "bg-red-50 border-red-200"
                    : ""
                }>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{texts.reviewNotes}</AlertTitle>
                  <AlertDescription>{selectedReport.review_notes}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter className={isRTL ? "flex-row-reverse" : ""}>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              {texts.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
