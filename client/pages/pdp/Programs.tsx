/**
 * PDP Programs Management Page
 *
 * List and manage accredited programs for PDP partners
 * Supports filtering, viewing details, editing, and submitting for review
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Send,
  Trash2,
  Award,
  Users,
  Clock,
  Calendar,
  GraduationCap,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import {
  useMyPrograms,
  useSubmitProgram,
  useDeleteProgram,
} from "@/entities/pdp";
import type { PDPProgram, ProgramStatus, ActivityType } from "@/entities/pdp";
import { useCommonConfirms } from "@/hooks/use-confirm";
import { useLanguage } from "@/contexts/LanguageContext";

const translations = {
  en: {
    // Header
    pageTitle: "My Accredited Programs",
    pageSubtitle: "Manage your professional development programs and track their status",
    submitNewProgram: "Submit New Program",

    // Error state
    errorLoadingTitle: "Error Loading Programs",
    errorLoadingDesc: "Unable to load your programs. Please try again later.",
    retry: "Retry",

    // Quick stats
    totalPrograms: "Total Programs",
    approved: "Approved",
    underReview: "Under Review",
    drafts: "Drafts",

    // Status labels
    statusDraft: "Draft",
    statusSubmitted: "Submitted",
    statusUnderReview: "Under Review",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    statusExpired: "Expired",

    // Activity types
    typeTrainingCourse: "Training Course",
    typeConference: "Conference",
    typeWorkshop: "Workshop",
    typeWebinar: "Webinar",
    typeSelfStudy: "Self Study",
    typeTeaching: "Teaching",
    typePublication: "Publication",
    typeVolunteerWork: "Volunteer Work",
    typeOther: "Other",

    // Filters
    searchPlaceholder: "Search programs...",
    allStatuses: "All Statuses",
    allTypes: "All Types",

    // Table
    programsCount: (count: number) => `Programs (${count})`,
    tableProgram: "Program",
    tableType: "Type",
    tablePDCs: "PDCs",
    tableStatus: "Status",
    tableValidUntil: "Valid Until",
    tableEnrolments: "Enrolments",
    tableActions: "Actions",

    // Actions
    viewDetails: "View Details",
    edit: "Edit",
    activateProgram: "Activate Program",
    delete: "Delete",
    reviseResubmit: "Revise & Resubmit",

    // Confirm dialogs
    confirmActivateTitle: "Activate Program",
    confirmActivateDesc: (name: string) => `Are you sure you want to activate "${name}"? The program will be immediately available in the Accredited Programs directory.`,
    confirmActivate: "Activate",
    cancel: "Cancel",

    // Empty state
    noProgramsFound: "No programs found",
    tryAdjustingFilters: "Try adjusting your filters",
    getStarted: "Get started by submitting your first program",
    submitFirstProgram: "Submit First Program",
  },
  ar: {
    // Header
    pageTitle: "برامجي المعتمدة",
    pageSubtitle: "إدارة برامج التطوير المهني الخاصة بك وتتبع حالتها",
    submitNewProgram: "تقديم برنامج جديد",

    // Error state
    errorLoadingTitle: "خطأ في تحميل البرامج",
    errorLoadingDesc: "تعذر تحميل برامجك. يرجى المحاولة مرة أخرى لاحقاً.",
    retry: "إعادة المحاولة",

    // Quick stats
    totalPrograms: "إجمالي البرامج",
    approved: "معتمد",
    underReview: "قيد المراجعة",
    drafts: "المسودات",

    // Status labels
    statusDraft: "مسودة",
    statusSubmitted: "مُقدَّم",
    statusUnderReview: "قيد المراجعة",
    statusApproved: "معتمد",
    statusRejected: "مرفوض",
    statusExpired: "منتهي الصلاحية",

    // Activity types
    typeTrainingCourse: "دورة تدريبية",
    typeConference: "مؤتمر",
    typeWorkshop: "ورشة عمل",
    typeWebinar: "ندوة عبر الإنترنت",
    typeSelfStudy: "دراسة ذاتية",
    typeTeaching: "تدريس",
    typePublication: "نشر",
    typeVolunteerWork: "عمل تطوعي",
    typeOther: "أخرى",

    // Filters
    searchPlaceholder: "البحث في البرامج...",
    allStatuses: "جميع الحالات",
    allTypes: "جميع الأنواع",

    // Table
    programsCount: (count: number) => `البرامج (${count})`,
    tableProgram: "البرنامج",
    tableType: "النوع",
    tablePDCs: "PDCs",
    tableStatus: "الحالة",
    tableValidUntil: "صالح حتى",
    tableEnrolments: "التسجيلات",
    tableActions: "الإجراءات",

    // Actions
    viewDetails: "عرض التفاصيل",
    edit: "تعديل",
    activateProgram: "تفعيل البرنامج",
    delete: "حذف",
    reviseResubmit: "مراجعة وإعادة التقديم",

    // Confirm dialogs
    confirmActivateTitle: "تفعيل البرنامج",
    confirmActivateDesc: (name: string) => `هل أنت متأكد من تفعيل "${name}"؟ سيكون البرنامج متاحاً فوراً في دليل البرامج المعتمدة.`,
    confirmActivate: "تفعيل",
    cancel: "إلغاء",

    // Empty state
    noProgramsFound: "لم يتم العثور على برامج",
    tryAdjustingFilters: "حاول تعديل الفلاتر",
    getStarted: "ابدأ بتقديم برنامجك الأول",
    submitFirstProgram: "تقديم البرنامج الأول",
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

const getActivityTypeLabel = (activityType: ActivityType, texts: typeof translations.en): string => {
  const types: Record<ActivityType, string> = {
    training_course: texts.typeTrainingCourse,
    conference: texts.typeConference,
    workshop: texts.typeWorkshop,
    webinar: texts.typeWebinar,
    self_study: texts.typeSelfStudy,
    teaching: texts.typeTeaching,
    publication: texts.typePublication,
    volunteer_work: texts.typeVolunteerWork,
    other: texts.typeOther,
  };
  return types[activityType];
};

const statusColors: Record<ProgramStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  under_review: "bg-orange-100 text-orange-700 border-orange-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  expired: "bg-gray-100 text-gray-500 border-gray-200",
};

const statusIcons: Record<ProgramStatus, React.ReactNode> = {
  draft: <Edit className="h-3 w-3" />,
  submitted: <Send className="h-3 w-3" />,
  under_review: <Clock className="h-3 w-3" />,
  approved: <CheckCircle className="h-3 w-3" />,
  rejected: <XCircle className="h-3 w-3" />,
  expired: <AlertCircle className="h-3 w-3" />,
};

export default function PDPPrograms() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const texts = translations[language];
  const { confirmDelete, confirm } = useCommonConfirms();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Fetch programs
  const { data: programs, isLoading, error, refetch } = useMyPrograms({
    status: statusFilter !== "all" ? (statusFilter as ProgramStatus) : undefined,
    activity_type: typeFilter !== "all" ? (typeFilter as ActivityType) : undefined,
    search: searchQuery || undefined,
  });

  // Mutations
  const submitProgram = useSubmitProgram();
  const deleteProgram = useDeleteProgram();

  // Filter programs client-side for search (in case backend doesn't support)
  const filteredPrograms = programs?.filter((program) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        program.program_name.toLowerCase().includes(query) ||
        program.program_id.toLowerCase().includes(query) ||
        program.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleActivateProgram = async (program: PDPProgram) => {
    const confirmed = await confirm({
      title: texts.confirmActivateTitle,
      description: texts.confirmActivateDesc(program.program_name),
      confirmText: texts.confirmActivate,
      cancelText: texts.cancel,
    });
    if (!confirmed) return;

    try {
      await submitProgram.mutateAsync(program.id);
    } catch (error) {
      // Error is already handled by the mutation hook
      console.error('Failed to submit program:', error);
    }
  };

  const handleDeleteProgram = async (program: PDPProgram) => {
    const confirmed = await confirmDelete(`"${program.program_name}"`);
    if (!confirmed) return;

    try {
      await deleteProgram.mutateAsync(program.id);
    } catch (error) {
      // Error is already handled by the mutation hook
      console.error('Failed to delete program:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (error) {
    return (
      <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <Alert variant="destructive">
          <AlertCircle className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
          <AlertTitle className={language === 'ar' ? 'text-right' : ''}>{texts.errorLoadingTitle}</AlertTitle>
          <AlertDescription className={language === 'ar' ? 'text-right' : ''}>
            {texts.errorLoadingDesc}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} className={language === 'ar' ? 'flex-row-reverse' : ''}>
          <RefreshCw className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
          {texts.retry}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${language === 'ar' ? 'from-navy-800 via-royal-600 to-sky-500' : 'from-sky-500 via-royal-600 to-navy-800'} rounded-lg p-6 text-white`}>
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${language === 'ar' ? 'sm:flex-row-reverse' : ''}`}>
          <div className={language === 'ar' ? 'text-right' : ''}>
            <h1 className="text-3xl font-bold">{texts.pageTitle}</h1>
            <p className="mt-2 opacity-90">
              {texts.pageSubtitle}
            </p>
          </div>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate("/pdp/submit-program")}
            className={language === 'ar' ? 'flex-row-reverse' : ''}
          >
            <Plus className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
            {texts.submitNewProgram}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className="text-sm font-medium text-gray-600">{texts.totalPrograms}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : programs?.length ?? 0}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className="text-sm font-medium text-gray-600">{texts.approved}</p>
                <p className="text-2xl font-bold text-green-600">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : programs?.filter(p => p.status === 'approved').length ?? 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className="text-sm font-medium text-gray-600">{texts.underReview}</p>
                <p className="text-2xl font-bold text-orange-600">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : programs?.filter(p => p.status === 'under_review' || p.status === 'submitted').length ?? 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className="text-sm font-medium text-gray-600">{texts.drafts}</p>
                <p className="text-2xl font-bold text-gray-600">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : programs?.filter(p => p.status === 'draft').length ?? 0}
                </p>
              </div>
              <Edit className="h-8 w-8 text-gray-600 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={`flex flex-col sm:flex-row gap-4 ${language === 'ar' ? 'sm:flex-row-reverse' : ''}`}>
            <div className="relative flex-1">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${language === 'ar' ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={texts.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={language === 'ar' ? 'pr-10 text-right' : 'pl-10'}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={texts.allStatuses} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{texts.allStatuses}</SelectItem>
                <SelectItem value="draft">{texts.statusDraft}</SelectItem>
                <SelectItem value="submitted">{texts.statusSubmitted}</SelectItem>
                <SelectItem value="under_review">{texts.statusUnderReview}</SelectItem>
                <SelectItem value="approved">{texts.statusApproved}</SelectItem>
                <SelectItem value="rejected">{texts.statusRejected}</SelectItem>
                <SelectItem value="expired">{texts.statusExpired}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={texts.allTypes} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{texts.allTypes}</SelectItem>
                <SelectItem value="training_course">{texts.typeTrainingCourse}</SelectItem>
                <SelectItem value="conference">{texts.typeConference}</SelectItem>
                <SelectItem value="workshop">{texts.typeWorkshop}</SelectItem>
                <SelectItem value="webinar">{texts.typeWebinar}</SelectItem>
                <SelectItem value="self_study">{texts.typeSelfStudy}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Programs Table */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <BookOpen className="h-5 w-5 text-primary" />
            {texts.programsCount(filteredPrograms?.length ?? 0)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPrograms && filteredPrograms.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={language === 'ar' ? 'text-right' : ''}>{texts.tableProgram}</TableHead>
                    <TableHead className={language === 'ar' ? 'text-right' : ''}>{texts.tableType}</TableHead>
                    <TableHead className={language === 'ar' ? 'text-right' : ''}>{texts.tablePDCs}</TableHead>
                    <TableHead className={language === 'ar' ? 'text-right' : ''}>{texts.tableStatus}</TableHead>
                    <TableHead className={language === 'ar' ? 'text-right' : ''}>{texts.tableValidUntil}</TableHead>
                    <TableHead className={language === 'ar' ? 'text-right' : ''}>{texts.tableEnrolments}</TableHead>
                    <TableHead className={language === 'ar' ? 'text-left' : 'text-right'}>{texts.tableActions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrograms.map((program) => (
                    <TableRow key={program.id}>
                      <TableCell>
                        <div className={language === 'ar' ? 'text-right' : ''}>
                          <p className="font-medium">{program.program_name}</p>
                          <p className="text-sm text-gray-500">{program.program_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getActivityTypeLabel(program.activity_type, texts)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                          <Award className="h-4 w-4 text-purple-600" />
                          <span>{program.max_pdc_credits}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[program.status || "draft"]}>
                          <span className="flex items-center gap-1">
                            {statusIcons[program.status || "draft"]}
                            {getStatusLabel(program.status || "draft", texts)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 text-sm ${language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(program.valid_until)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                          <Users className="h-4 w-4 text-blue-600" />
                          <span>{program.enrolment_count ?? 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className={language === 'ar' ? 'text-left' : 'text-right'}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={submitProgram.isPending || deleteProgram.isPending}
                            >
                              {submitProgram.isPending || deleteProgram.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={language === 'ar' ? 'start' : 'end'}>
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/pdp/programs/${program.id}`)
                              }
                              className={language === 'ar' ? 'flex-row-reverse' : ''}
                            >
                              <Eye className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                              {texts.viewDetails}
                            </DropdownMenuItem>
                            {program.status === "draft" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/pdp/programs/${program.id}/edit`)
                                  }
                                  className={language === 'ar' ? 'flex-row-reverse' : ''}
                                >
                                  <Edit className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                                  {texts.edit}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleActivateProgram(program)}
                                  disabled={submitProgram.isPending}
                                  className={language === 'ar' ? 'flex-row-reverse' : ''}
                                >
                                  {submitProgram.isPending ? (
                                    <Loader2 className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'} animate-spin`} />
                                  ) : (
                                    <CheckCircle className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                                  )}
                                  {texts.activateProgram}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className={`text-red-600 ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                                  onClick={() => handleDeleteProgram(program)}
                                  disabled={deleteProgram.isPending}
                                >
                                  {deleteProgram.isPending ? (
                                    <Loader2 className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'} animate-spin`} />
                                  ) : (
                                    <Trash2 className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                                  )}
                                  {texts.delete}
                                </DropdownMenuItem>
                              </>
                            )}
                            {program.status === "rejected" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/pdp/programs/${program.id}/edit`)
                                }
                                className={language === 'ar' ? 'flex-row-reverse' : ''}
                              >
                                <Edit className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                                {texts.reviseResubmit}
                              </DropdownMenuItem>
                            )}
                            {program.status === "approved" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/pdp/programs/${program.id}/edit`)
                                }
                                className={language === 'ar' ? 'flex-row-reverse' : ''}
                              >
                                <Edit className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                                {texts.edit}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {texts.noProgramsFound}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                  ? texts.tryAdjustingFilters
                  : texts.getStarted}
              </p>
              {!searchQuery && statusFilter === "all" && typeFilter === "all" && (
                <Button onClick={() => navigate("/pdp/submit-program")} className={language === 'ar' ? 'flex-row-reverse' : ''}>
                  <Plus className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  {texts.submitFirstProgram}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
