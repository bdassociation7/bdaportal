/**
 * ECP Exam Vouchers Management
 *
 * Request, assign, and track exam vouchers for candidates
 * Integrates with WooCommerce for voucher purchases
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Ticket,
  Search,
  UserPlus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ShoppingCart,
  Calendar,
  UserMinus,
  Clock,
  BookOpen,
  Send,
  FileText,
} from "lucide-react";
import {
  useVouchers,
  useVoucherStats,
  useAssignVoucher,
  useUnassignVoucher,
} from "@/entities/ecp/ecp.hooks";
import type { Voucher, VoucherStatus, CertificationType } from "@/entities/ecp/ecp.types";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// Translations
// ============================================================================

const translations = {
  en: {
    // Header
    title: "Orders & Requests",
    subtitle: "Request exam vouchers or Learning System seats, then manage your allocated vouchers",
    requestVouchers: "Request Exam Vouchers",
    requestLearningAccess: "Request Learning System Access",
    learningAccessTitle: "Learning System Access",
    learningAccessDescription: "Request seats for your trainees. Learning System access covers both BDA-CP and BDA-SCP pathways.",
    ordersTitle: "Request a Product",
    ordersDescription: "Each request is processed separately and sent to BDA Support for invoicing.",
    voucherRequestCardTitle: "BDA Exam Vouchers",
    voucherRequestCardDescription: "Request BDA-CP or BDA-SCP exam vouchers for your candidates.",
    learningRequestCardTitle: "Learning System Access",
    learningRequestCardDescription: "Request Learning System seats for your trainees. One learning pathway covers both BDA-CP and BDA-SCP.",
    supportNotification: "Your request is sent directly to BDA Support for invoicing. Access is allocated only after payment confirmation.",
    requestSubmitted: "Request submitted",
    requestSubmittedDescription: (reference: string) => `Request ${reference} has been sent to BDA Support for invoicing.`,
    // Stats
    total: "Total",
    available: "Available",
    assigned: "Assigned",
    used: "Used",
    expired: "Expired",
    // Status labels
    statusAvailable: "Available",
    statusAssigned: "Assigned",
    statusUsed: "Used",
    statusExpired: "Expired",
    statusCancelled: "Cancelled",
    // Alerts
    vouchersExpiringSoon: "Vouchers Expiring Soon",
    expiringSoonMessage: (count: number) => `You have ${count} voucher${count > 1 ? 's' : ''} expiring within 30 days. Consider assigning them to candidates soon.`,
    voucherPolicy: "Voucher Policy",
    voucherPolicyMessage: "Each exam voucher is valid for 1 year from the date of activation. Vouchers must be assigned to candidates before they can schedule their exam.",
    // Filters
    searchPlaceholder: "Search by code or candidate...",
    allStatus: "All Status",
    allTypes: "All Types",
    // Table
    vouchers: "Vouchers",
    voucherCode: "Voucher Code",
    type: "Type",
    status: "Status",
    assignedTo: "Assigned To",
    validUntil: "Valid Until",
    actions: "Actions",
    assign: "Assign",
    unassign: "Unassign",
    soon: "Soon",
    // Empty state
    noVouchersFound: "No vouchers found",
    tryAdjustingFilters: "Try adjusting your filters",
    requestToGetStarted: "Request vouchers to get started",
    // Assign Dialog
    assignVoucherTitle: "Assign Voucher to Candidate",
    assignVoucherDescription: "Enter the candidate's details to assign this voucher",
    voucherCodeLabel: "Voucher Code",
    certification: "Certification",
    candidateName: "Candidate Name",
    candidateEmail: "Candidate Email",
    fullName: "Full name",
    emailPlaceholder: "email@example.com",
    emailNotice: "The candidate will receive an email with their voucher code",
    cancel: "Cancel",
    assignVoucher: "Assign Voucher",
    // Request Dialog
    requestVouchersTitle: "Request Exam Vouchers",
    requestVouchersDescription: "Submit a request for additional exam vouchers. You will receive an invoice via email.",
    certificationType: "Certification Type",
    cpCertified: "BDA-CP — Certified Professional",
    scpCertified: "BDA-SCP — Senior Certified Professional",
    quantity: "Quantity",
    quantityNote: "Minimum order: 1 voucher. Bulk discounts available for 20+ vouchers.",
    pricing: "Pricing",
    examVoucherPrice: (type: string) => `${type} Exam Voucher: $150 USD each`,
    estimatedTotal: (total: number) => `Estimated Total: $${total} USD`,
    submitRequest: "Submit Request",
  },
  ar: {
    // Header
    title: "الطلبات والقسائم",
    subtitle: "اطلب قسائم الاختبارات أو مقاعد نظام التعلم، ثم أدر القسائم المخصصة",
    requestVouchers: "طلب قسائم الاختبارات",
    requestLearningAccess: "طلب مقاعد نظام التعلم",
    learningAccessTitle: "مقاعد نظام التعلم",
    learningAccessDescription: "اطلب مقاعد للمتدربين. يشمل نظام التعلم مساري BDA-CP وBDA-SCP.",
    ordersTitle: "طلب منتج",
    ordersDescription: "يُعالج كل طلب بشكل منفصل ويصل إلى دعم BDA لإصدار الفاتورة.",
    voucherRequestCardTitle: "قسائم اختبارات BDA",
    voucherRequestCardDescription: "اطلب قسائم BDA-CP أو BDA-SCP للمرشحين.",
    learningRequestCardTitle: "مقاعد نظام التعلم",
    learningRequestCardDescription: "اطلب مقاعد نظام التعلم للمتدربين. يغطي مسار التعلم الواحد BDA-CP وBDA-SCP.",
    supportNotification: "يصل طلبك مباشرة إلى دعم BDA لإصدار الفاتورة. لا يُفعّل الوصول إلا بعد تأكيد السداد.",
    requestSubmitted: "تم إرسال الطلب",
    requestSubmittedDescription: (reference: string) => `تم إرسال الطلب ${reference} إلى دعم BDA لإصدار الفاتورة.`,
    // Stats
    total: "الإجمالي",
    available: "متاح",
    assigned: "معين",
    used: "مستخدم",
    expired: "منتهي الصلاحية",
    // Status labels
    statusAvailable: "متاح",
    statusAssigned: "معين",
    statusUsed: "مستخدم",
    statusExpired: "منتهي",
    statusCancelled: "ملغي",
    // Alerts
    vouchersExpiringSoon: "قسائم تنتهي صلاحيتها قريباً",
    expiringSoonMessage: (count: number) => `لديك ${count} قسيمة${count > 1 ? '' : ''} تنتهي صلاحيتها خلال 30 يوماً. يُنصح بتعيينها للمرشحين قريباً.`,
    voucherPolicy: "سياسة القسائم",
    voucherPolicyMessage: "كل قسيمة امتحان صالحة لمدة سنة واحدة من تاريخ التفعيل. يجب تعيين القسائم للمرشحين قبل أن يتمكنوا من جدولة امتحانهم.",
    // Filters
    searchPlaceholder: "البحث بالرمز أو المرشح...",
    allStatus: "جميع الحالات",
    allTypes: "جميع الأنواع",
    // Table
    vouchers: "القسائم",
    voucherCode: "رمز القسيمة",
    type: "النوع",
    status: "الحالة",
    assignedTo: "معين إلى",
    validUntil: "صالح حتى",
    actions: "الإجراءات",
    assign: "تعيين",
    unassign: "إلغاء التعيين",
    soon: "قريباً",
    // Empty state
    noVouchersFound: "لم يتم العثور على قسائم",
    tryAdjustingFilters: "حاول تعديل الفلاتر",
    requestToGetStarted: "اطلب قسائم للبدء",
    // Assign Dialog
    assignVoucherTitle: "تعيين قسيمة للمرشح",
    assignVoucherDescription: "أدخل تفاصيل المرشح لتعيين هذه القسيمة",
    voucherCodeLabel: "رمز القسيمة",
    certification: "الشهادة",
    candidateName: "اسم المرشح",
    candidateEmail: "بريد المرشح الإلكتروني",
    fullName: "الاسم الكامل",
    emailPlaceholder: "email@example.com",
    emailNotice: "سيتلقى المرشح بريداً إلكترونياً يحتوي على رمز القسيمة",
    cancel: "إلغاء",
    assignVoucher: "تعيين القسيمة",
    // Request Dialog
    requestVouchersTitle: "طلب قسائم امتحان",
    requestVouchersDescription: "قدم طلباً للحصول على قسائم امتحان إضافية. ستتلقى فاتورة عبر البريد الإلكتروني.",
    certificationType: "نوع الشهادة",
    cpCertified: "BDA-CP — محترف معتمد",
    scpCertified: "BDA-SCP — محترف معتمد أول",
    quantity: "الكمية",
    quantityNote: "الحد الأدنى للطلب: قسيمة واحدة. خصومات متاحة للطلبات من 20 قسيمة فأكثر.",
    pricing: "التسعير",
    examVoucherPrice: (type: string) => `قسيمة امتحان ${type}: 150 دولار أمريكي لكل قسيمة`,
    estimatedTotal: (total: number) => `الإجمالي التقديري: ${total} دولار أمريكي`,
    submitRequest: "تقديم الطلب",
  },
};

const statusColors: Record<VoucherStatus, string> = {
  available: "bg-green-100 text-green-700 border-green-200",
  assigned: "bg-blue-100 text-blue-700 border-blue-200",
  used: "bg-gray-100 text-gray-700 border-gray-200",
  expired: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-orange-100 text-orange-700 border-orange-200",
};

const statusIcons: Record<VoucherStatus, React.ReactNode> = {
  available: <CheckCircle className="h-3 w-3" />,
  assigned: <UserPlus className="h-3 w-3" />,
  used: <CheckCircle className="h-3 w-3" />,
  expired: <XCircle className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
};

export default function ECPVouchers() {
  const { language } = useLanguage();
  const texts = translations[language];

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showLearningRequestDialog, setShowLearningRequestDialog] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [assignEmail, setAssignEmail] = useState("");
  const [assignName, setAssignName] = useState("");
  const [requestQuantity, setRequestQuantity] = useState(10);
  const [requestType, setRequestType] = useState<CertificationType>("CP");
  const [learningSeatQuantity, setLearningSeatQuantity] = useState(10);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const { toast } = useToast();

  // Fetch vouchers
  const { data: vouchers, isLoading: vouchersLoading } = useVouchers();

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useVoucherStats();

  // Mutations
  const assignVoucher = useAssignVoucher();
  const unassignVoucher = useUnassignVoucher();

  // Status labels map for translations
  const statusLabels: Record<VoucherStatus, string> = {
    available: texts.statusAvailable,
    assigned: texts.statusAssigned,
    used: texts.statusUsed,
    expired: texts.statusExpired,
    cancelled: texts.statusCancelled,
  };

  // Filter vouchers
  const filteredVouchers = useMemo(() => {
    if (!vouchers) return [];

    return vouchers.filter((v) => {
      const matchesSearch =
        !searchQuery ||
        v.voucher_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.assigned_to_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.assigned_to_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || v.status === statusFilter;
      const matchesType = typeFilter === "all" || v.certification_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [vouchers, searchQuery, statusFilter, typeFilter]);

  const handleAssignVoucher = async () => {
    if (!selectedVoucher || !assignEmail || !assignName) return;

    await assignVoucher.mutateAsync({
      voucher_id: selectedVoucher.id,
      email: assignEmail,
      name: assignName,
    });

    setShowAssignDialog(false);
    setSelectedVoucher(null);
    setAssignEmail("");
    setAssignName("");
  };

  const handleUnassignVoucher = async (voucherId: string) => {
    await unassignVoucher.mutateAsync(voucherId);
  };

  const submitProductRequest = async (
    requestType: 'exam_vouchers' | 'learning_system_access',
    quantity: number,
    certificationType?: CertificationType,
  ) => {
    const { data, error } = await supabase.functions.invoke('submit-ecp-order-request', {
      body: {
        request_type: requestType,
        quantity,
        certification_type: certificationType,
      },
    });

    if (error || !data?.success) {
      throw new Error(data?.error || error?.message || 'Unable to submit your request. Please try again.');
    }

    toast({
      title: texts.requestSubmitted,
      description: texts.requestSubmittedDescription(data.request.request_number),
    });
  };

  const handleRequestVouchers = async () => {
    setIsSubmittingOrder(true);
    try {
      await submitProductRequest('exam_vouchers', requestQuantity, requestType);
      setShowRequestDialog(false);
      setRequestQuantity(10);
    } catch (error) {
      toast({
        title: 'Unable to submit request',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleRequestLearningAccess = async () => {
    setIsSubmittingOrder(true);
    try {
      await submitProductRequest('learning_system_access', learningSeatQuantity);
      setShowLearningRequestDialog(false);
      setLearningSeatQuantity(10);
    } catch (error) {
      toast({
        title: 'Unable to submit request',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpiringSoon = (validUntil: string) => {
    const expiryDate = new Date(validUntil);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow;
  };

  // Loading skeleton
  if (vouchersLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={language === 'ar' ? 'text-right' : ''}>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0f91e0]">BDA Partner Workspace</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{texts.title}</h1>
        <p className="mt-2 max-w-2xl text-gray-600 dark:text-slate-300">{texts.subtitle}</p>
      </div>

      {/* Separate product request paths */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden border-blue-100 bg-gradient-to-br from-[#f0f6ff] via-white to-white shadow-sm dark:border-sky-900/60 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
          <CardContent className="p-6">
            <div className={`flex gap-4 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0d1f4e] text-white shadow-lg shadow-blue-950/20">
                <Ticket className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0f91e0]">Examination</p>
                <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{texts.voucherRequestCardTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">{texts.voucherRequestCardDescription}</p>
                <Button className="mt-5 bg-[#0d1f4e] hover:bg-[#1c4a8b]" onClick={() => setShowRequestDialog(true)}>
                  <Ticket className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  {texts.requestVouchers}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-sky-200 bg-gradient-to-br from-sky-50 via-white to-white shadow-sm dark:border-sky-900/60 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
          <CardContent className="p-6">
            <div className={`flex gap-4 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0f91e0] text-white shadow-lg shadow-sky-500/20">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0f91e0]">Learning</p>
                <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{texts.learningRequestCardTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">{texts.learningRequestCardDescription}</p>
                <Button className="mt-5 bg-[#0f91e0] hover:bg-[#1c4a8b]" onClick={() => setShowLearningRequestDialog(true)}>
                  <BookOpen className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  {texts.requestLearningAccess}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert className="border-blue-100 bg-blue-50/70 text-[#0d1f4e] dark:border-sky-900/60 dark:bg-slate-900 dark:text-sky-100">
        <FileText className="h-4 w-4" />
        <AlertTitle>{texts.ordersTitle}</AlertTitle>
        <AlertDescription>{texts.supportNotification}</AlertDescription>
      </Alert>

      {/* Voucher allocation statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 rounded-lg bg-blue-100">
                <Ticket className="h-5 w-5 text-blue-600" />
              </div>
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className="text-sm text-gray-600">{texts.total}</p>
                <p className="text-xl font-bold">{stats?.total ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className="text-sm text-gray-600">{texts.available}</p>
                <p className="text-xl font-bold text-green-600">{stats?.available ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 rounded-lg bg-blue-100">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className="text-sm text-gray-600">{texts.assigned}</p>
                <p className="text-xl font-bold text-blue-600">{stats?.assigned ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 rounded-lg bg-gray-100">
                <CheckCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className="text-sm text-gray-600">{texts.used}</p>
                <p className="text-xl font-bold">{stats?.used ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 rounded-lg bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className="text-sm text-gray-600">{texts.expired}</p>
                <p className="text-xl font-bold text-red-600">{stats?.expired ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Soon Alert */}
      {stats?.expiring_soon && stats.expiring_soon > 0 && (
        <Alert variant="destructive">
          <Clock className="h-4 w-4" />
          <AlertTitle>{texts.vouchersExpiringSoon}</AlertTitle>
          <AlertDescription>
            {texts.expiringSoonMessage(stats.expiring_soon)}
          </AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{texts.voucherPolicy}</AlertTitle>
        <AlertDescription>
          {texts.voucherPolicyMessage}
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={`flex flex-col sm:flex-row gap-4 ${language === 'ar' ? 'sm:flex-row-reverse' : ''}`}>
            <div className="relative flex-1">
              <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`} />
              <Input
                placeholder={texts.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={language === 'ar' ? 'pr-10 text-right' : 'pl-10'}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder={texts.allStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{texts.allStatus}</SelectItem>
                <SelectItem value="available">{texts.statusAvailable}</SelectItem>
                <SelectItem value="assigned">{texts.statusAssigned}</SelectItem>
                <SelectItem value="used">{texts.statusUsed}</SelectItem>
                <SelectItem value="expired">{texts.statusExpired}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder={texts.allTypes} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{texts.allTypes}</SelectItem>
                <SelectItem value="CP">CP</SelectItem>
                <SelectItem value="SCP">SCP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vouchers Table */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <Ticket className="h-5 w-5 text-primary" />
            {texts.vouchers} ({filteredVouchers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVouchers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{texts.voucherCode}</TableHead>
                  <TableHead>{texts.type}</TableHead>
                  <TableHead>{texts.status}</TableHead>
                  <TableHead>{texts.assignedTo}</TableHead>
                  <TableHead>{texts.validUntil}</TableHead>
                  <TableHead className={language === 'ar' ? 'text-left' : 'text-right'}>{texts.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-mono font-medium">
                      {voucher.voucher_code}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          voucher.certification_type === "CP"
                            ? "bg-green-50 text-green-700"
                            : "bg-purple-50 text-purple-700"
                        }
                      >
                        BDA-{voucher.certification_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[voucher.status]}>
                        <span className={`flex items-center gap-1 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                          {statusIcons[voucher.status]}
                          {statusLabels[voucher.status]}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {voucher.assigned_to_email ? (
                        <div className={language === 'ar' ? 'text-right' : ''}>
                          <p className="font-medium">{voucher.assigned_to_name}</p>
                          <p className="text-sm text-gray-500">{voucher.assigned_to_email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 text-sm ${isExpiringSoon(voucher.valid_until) ? 'text-red-600 font-medium' : ''} ${language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(voucher.valid_until)}
                        {isExpiringSoon(voucher.valid_until) && (
                          <Badge variant="destructive" className={`text-xs ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{texts.soon}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={language === 'ar' ? 'text-left' : 'text-right'}>
                      <div className={`flex gap-2 ${language === 'ar' ? 'justify-start' : 'justify-end'}`}>
                        {voucher.status === "available" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedVoucher(voucher);
                              setShowAssignDialog(true);
                            }}
                          >
                            <UserPlus className={`h-4 w-4 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                            {texts.assign}
                          </Button>
                        )}
                        {voucher.status === "assigned" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnassignVoucher(voucher.id)}
                            disabled={unassignVoucher.isPending}
                          >
                            {unassignVoucher.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <UserMinus className={`h-4 w-4 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                                {texts.unassign}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Ticket className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{texts.noVouchersFound}</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                  ? texts.tryAdjustingFilters
                  : texts.requestToGetStarted}
              </p>
              <Button onClick={() => setShowRequestDialog(true)}>
                <ShoppingCart className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                {texts.requestVouchers}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Voucher Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader className={language === 'ar' ? 'text-right' : ''}>
            <DialogTitle>{texts.assignVoucherTitle}</DialogTitle>
            <DialogDescription>
              {texts.assignVoucherDescription}
            </DialogDescription>
          </DialogHeader>

          {selectedVoucher && (
            <div className="space-y-4 py-4">
              <div className={`p-3 bg-gray-50 rounded-lg ${language === 'ar' ? 'text-right' : ''}`}>
                <p className="text-sm text-gray-600">{texts.voucherCodeLabel}</p>
                <p className="font-mono font-bold">{selectedVoucher.voucher_code}</p>
                <Badge
                  className={
                    selectedVoucher.certification_type === "CP"
                      ? "bg-green-100 text-green-700 mt-2"
                      : "bg-purple-100 text-purple-700 mt-2"
                  }
                >
                  BDA-{selectedVoucher.certification_type} {texts.certification}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignName">{texts.candidateName} *</Label>
                <Input
                  id="assignName"
                  value={assignName}
                  onChange={(e) => setAssignName(e.target.value)}
                  placeholder={texts.fullName}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignEmail">{texts.candidateEmail} *</Label>
                <Input
                  id="assignEmail"
                  type="email"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                  placeholder={texts.emailPlaceholder}
                />
                <p className="text-xs text-gray-500">
                  {texts.emailNotice}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              {texts.cancel}
            </Button>
            <Button
              onClick={handleAssignVoucher}
              disabled={!assignEmail || !assignName || assignVoucher.isPending}
            >
              {assignVoucher.isPending ? (
                <Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              ) : (
                <UserPlus className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              )}
              {texts.assignVoucher}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Vouchers Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader className={language === 'ar' ? 'text-right' : ''}>
            <DialogTitle>{texts.requestVouchersTitle}</DialogTitle>
            <DialogDescription>
              {texts.requestVouchersDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{texts.certificationType} *</Label>
              <Select value={requestType} onValueChange={(v) => setRequestType(v as CertificationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CP">{texts.cpCertified}</SelectItem>
                  <SelectItem value="SCP">{texts.scpCertified}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">{texts.quantity} *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={100}
                value={requestQuantity}
                onChange={(e) => setRequestQuantity(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-gray-500">
                {texts.quantityNote}
              </p>
            </div>
          </div>

          <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              {texts.cancel}
            </Button>
            <Button onClick={handleRequestVouchers} disabled={isSubmittingOrder}>
              {isSubmittingOrder ? (
                <Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              ) : (
                <ShoppingCart className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              )}
              {texts.submitRequest}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Learning System access request */}
      <Dialog open={showLearningRequestDialog} onOpenChange={setShowLearningRequestDialog}>
        <DialogContent dir={language === 'ar' ? 'rtl' : 'ltr'} className="sm:max-w-lg">
          <DialogHeader className={language === 'ar' ? 'text-right' : ''}>
            <DialogTitle className="flex items-center gap-2 text-[#0d1f4e] dark:text-white">
              <BookOpen className="h-5 w-5 text-[#0f91e0]" />
              {texts.learningAccessTitle}
            </DialogTitle>
            <DialogDescription>{texts.learningAccessDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="rounded-xl border border-blue-100 bg-[#f0f6ff] p-4 dark:border-sky-900/60 dark:bg-slate-900">
              <p className="text-sm leading-6 text-[#0d1f4e] dark:text-sky-100">{texts.supportNotification}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="learningSeats">{texts.quantity} *</Label>
              <Input
                id="learningSeats"
                type="number"
                min={1}
                max={5000}
                value={learningSeatQuantity}
                onChange={(e) => setLearningSeatQuantity(parseInt(e.target.value) || 1)}
                className="h-11"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400">{texts.learningAccessDescription}</p>
            </div>
          </div>

          <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
            <Button variant="outline" onClick={() => setShowLearningRequestDialog(false)} disabled={isSubmittingOrder}>
              {texts.cancel}
            </Button>
            <Button onClick={handleRequestLearningAccess} disabled={isSubmittingOrder} className="bg-[#0f91e0] hover:bg-[#1c4a8b]">
              {isSubmittingOrder ? <Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2' : 'mr-2'}`} /> : <Send className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />}
              {texts.submitRequest}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
