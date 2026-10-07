/**
 * PDP License & Program Slots
 *
 * View and manage PDP partnership license
 * Monitor program slot usage, request slot increases
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Send,
  Shield,
  BookOpen,
  Loader2,
  XCircle,
  Plus,
  Layers,
} from "lucide-react";
import { useAuthContext } from "@/app/providers/AuthProvider";
import {
  usePDPLicense,
  useProgramSlotStatus,
  useSubmitLicenseRequest,
  useCancelLicenseRequest,
} from "@/entities/pdp/pdp.hooks";
import type { LicenseRequestStatus, PDPLicenseStatus } from "@/entities/pdp/pdp.types";
import { useLanguage } from "@/contexts/LanguageContext";

// =============================================================================
// Translations
// =============================================================================
const translations = {
  en: {
    pageTitle: "License & Program Slots",
    pageDescription: "View and manage your PDP partnership license",
    licenseExpiringSoon: "License Expiring Soon",
    licenseExpiringSoonDesc: "Your PDP license will expire in {days} days. Please submit a renewal request to maintain your partnership status.",
    licenseExpired: "License Expired",
    licenseExpiredDesc: "Your PDP license has expired. Please contact BDA immediately to renew your partnership.",
    slotLimitReached: "Program Slot Limit Reached",
    noLicenseFound: "No License Found",
    noLicenseFoundDesc: "Your PDP license has not been set up yet. Please contact BDA administration to complete your partner registration and license setup.",
    pdpLicense: "PDP Partnership License",
    partnerName: "Partner Name",
    licenseNumber: "License Number",
    partnerCode: "Partner Code",
    issueDate: "Issue Date",
    expiryDate: "Expiry Date",
    timeRemaining: "Time Remaining",
    daysRemaining: "{days} days remaining",
    expired: "Expired",
    programSlots: "Program Slots",
    maxPrograms: "Maximum Programs",
    programsUsed: "Programs Used",
    availableSlots: "Available Slots",
    slotUsage: "Slot Usage",
    programSubmissionDisabled: "Program Submission Disabled",
    programSubmissionDisabledDesc: "Your ability to submit new programs has been disabled by the administrator. Please contact BDA support for assistance.",
    downloadLicenseAgreement: "Download License Agreement",
    requestMoreSlots: "Request More Slots",
    slotRequestPending: "Slot Request Pending",
    requestRenewal: "Request Renewal",
    renewalRequested: "Renewal Requested",
    licenseTerms: "License Terms & Conditions",
    licenseDocuments: "License Documents",
    downloadDocuments: "Download official partnership documents",
    download: "Download",
    requestHistory: "Request History",
    trackRequests: "Track your license requests",
    slotIncreaseRequest: "Slot Increase Request",
    renewalRequest: "Renewal Request",
    requestLicenseRenewal: "Request License Renewal",
    renewalDialogDesc: "Submit a renewal request for your PDP partnership license",
    currentLicenseExpiry: "Current License Expiry",
    additionalNotes: "Additional Notes (Optional)",
    renewalNotesPlaceholder: "Any special requests or changes for the renewal...",
    cancel: "Cancel",
    submitRenewalRequest: "Submit Renewal Request",
    requestAdditionalSlots: "Request Additional Program Slots",
    slotDialogDesc: "Request an increase to your maximum program limit",
    currentLimit: "Current Limit",
    currentlyUsed: "Currently Used",
    programs: "programs",
    requestedNewLimit: "Requested New Limit",
    requestingAdditionalSlots: "Requesting {count} additional slots",
    justification: "Justification",
    justificationPlaceholder: "Explain why you need additional program slots...",
    submitRequest: "Submit Request",
    // Status labels
    statusActive: "Active",
    statusExpiringSoon: "Expiring Soon",
    statusExpired: "Expired",
    statusSuspended: "Suspended",
    statusPending: "Pending Activation",
  },
  ar: {
    pageTitle: "الترخيص وفتحات البرامج",
    pageDescription: "عرض وإدارة ترخيص شراكة PDP الخاص بك",
    licenseExpiringSoon: "الترخيص ينتهي قريباً",
    licenseExpiringSoonDesc: "ستنتهي صلاحية ترخيص PDP الخاص بك خلال {days} يوم. يرجى تقديم طلب تجديد للحفاظ على حالة شراكتك.",
    licenseExpired: "انتهت صلاحية الترخيص",
    licenseExpiredDesc: "انتهت صلاحية ترخيص PDP الخاص بك. يرجى الاتصال بـ BDA فوراً لتجديد شراكتك.",
    slotLimitReached: "تم الوصول إلى حد فتحات البرامج",
    noLicenseFound: "لم يتم العثور على ترخيص",
    noLicenseFoundDesc: "لم يتم إعداد ترخيص PDP الخاص بك بعد. يرجى الاتصال بإدارة BDA لإكمال تسجيل شريكك وإعداد الترخيص.",
    pdpLicense: "ترخيص شراكة PDP",
    partnerName: "اسم الشريك",
    licenseNumber: "رقم الترخيص",
    partnerCode: "رمز الشريك",
    issueDate: "تاريخ الإصدار",
    expiryDate: "تاريخ الانتهاء",
    timeRemaining: "الوقت المتبقي",
    daysRemaining: "{days} يوم متبقي",
    expired: "منتهي الصلاحية",
    programSlots: "فتحات البرامج",
    maxPrograms: "الحد الأقصى للبرامج",
    programsUsed: "البرامج المستخدمة",
    availableSlots: "الفتحات المتاحة",
    slotUsage: "استخدام الفتحات",
    programSubmissionDisabled: "تقديم البرامج معطل",
    programSubmissionDisabledDesc: "تم تعطيل قدرتك على تقديم برامج جديدة من قبل المسؤول. يرجى الاتصال بدعم BDA للمساعدة.",
    downloadLicenseAgreement: "تحميل اتفاقية الترخيص",
    requestMoreSlots: "طلب المزيد من الفتحات",
    slotRequestPending: "طلب الفتحات قيد الانتظار",
    requestRenewal: "طلب التجديد",
    renewalRequested: "تم طلب التجديد",
    licenseTerms: "شروط وأحكام الترخيص",
    licenseDocuments: "وثائق الترخيص",
    downloadDocuments: "تحميل وثائق الشراكة الرسمية",
    download: "تحميل",
    requestHistory: "سجل الطلبات",
    trackRequests: "تتبع طلبات الترخيص الخاصة بك",
    slotIncreaseRequest: "طلب زيادة الفتحات",
    renewalRequest: "طلب التجديد",
    requestLicenseRenewal: "طلب تجديد الترخيص",
    renewalDialogDesc: "قدم طلب تجديد لترخيص شراكة PDP الخاص بك",
    currentLicenseExpiry: "انتهاء الترخيص الحالي",
    additionalNotes: "ملاحظات إضافية (اختياري)",
    renewalNotesPlaceholder: "أي طلبات خاصة أو تغييرات للتجديد...",
    cancel: "إلغاء",
    submitRenewalRequest: "تقديم طلب التجديد",
    requestAdditionalSlots: "طلب فتحات برامج إضافية",
    slotDialogDesc: "طلب زيادة الحد الأقصى لبرامجك",
    currentLimit: "الحد الحالي",
    currentlyUsed: "المستخدم حالياً",
    programs: "برامج",
    requestedNewLimit: "الحد الجديد المطلوب",
    requestingAdditionalSlots: "طلب {count} فتحات إضافية",
    justification: "المبرر",
    justificationPlaceholder: "اشرح لماذا تحتاج إلى فتحات برامج إضافية...",
    submitRequest: "تقديم الطلب",
    // Status labels
    statusActive: "نشط",
    statusExpiringSoon: "ينتهي قريباً",
    statusExpired: "منتهي الصلاحية",
    statusSuspended: "معلق",
    statusPending: "في انتظار التفعيل",
  },
};

// Helper function for status labels
const getStatusLabels = (texts: typeof translations.en): Record<PDPLicenseStatus, string> => ({
  active: texts.statusActive,
  expiring_soon: texts.statusExpiringSoon,
  expired: texts.statusExpired,
  suspended: texts.statusSuspended,
  pending: texts.statusPending,
});

export default function PDPLicense() {
  const { user } = useAuthContext();
  const { language } = useLanguage();
  const texts = translations[language];
  const isRTL = language === "ar";
  const statusLabels = getStatusLabels(texts);

  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [renewalNotes, setRenewalNotes] = useState("");
  const [requestedSlots, setRequestedSlots] = useState<number>(0);
  const [slotJustification, setSlotJustification] = useState("");

  // Fetch data using hooks
  const { data: licenseInfo, isLoading: licenseLoading, error: licenseError } = usePDPLicense();
  const { data: slotStatus, isLoading: slotLoading } = useProgramSlotStatus();

  const submitRequest = useSubmitLicenseRequest();
  const cancelRequest = useCancelLicenseRequest();

  const license = licenseInfo?.license;
  const terms = licenseInfo?.terms || [];
  const documents = licenseInfo?.documents || [];
  const pendingRequests = licenseInfo?.pending_requests || [];

  // Calculate days until expiry
  const daysUntilExpiry = license?.expiry_date
    ? Math.ceil((new Date(license.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;
  const expiryPercentage = Math.max(0, Math.min(100, (daysUntilExpiry / 365) * 100));

  // Program slot usage
  const slotUsagePercentage = license
    ? Math.min(100, (license.programs_used / license.max_programs) * 100)
    : 0;

  const statusColors: Record<PDPLicenseStatus, string> = {
    active: "bg-green-100 text-green-700 border-green-200",
    expiring_soon: "bg-orange-100 text-orange-700 border-orange-200",
    expired: "bg-red-100 text-red-700 border-red-200",
    suspended: "bg-gray-100 text-gray-700 border-gray-200",
    pending: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const requestStatusColors: Record<LicenseRequestStatus, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    under_review: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-700",
  };

  const handleRenewalRequest = async () => {
    await submitRequest.mutateAsync({
      request_type: 'renewal',
      justification: renewalNotes || 'License renewal request',
    });
    setShowRenewalDialog(false);
    setRenewalNotes("");
  };

  const handleSlotRequest = async () => {
    await submitRequest.mutateAsync({
      request_type: 'slot_increase',
      requested_slots: requestedSlots,
      justification: slotJustification,
    });
    setShowSlotDialog(false);
    setRequestedSlots(0);
    setSlotJustification("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Licence dates are date-only values. Format them in a fixed LTR form so
  // browser locale and RTL rendering cannot reorder the date components.
  const formatLicenseDate = (dateString: string) => {
    const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(date);
  };

  // Check if there's a pending renewal request
  const hasPendingRenewal = pendingRequests.some(
    r => r.request_type === 'renewal' && ['pending', 'under_review'].includes(r.status)
  );

  const hasPendingSlotRequest = pendingRequests.some(
    r => r.request_type === 'slot_increase' && ['pending', 'under_review'].includes(r.status)
  );

  // Loading state
  if (licenseLoading) {
    return (
      <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-2xl font-bold text-gray-900">{texts.pageTitle}</h1>
          <p className="text-gray-600 mt-1">{texts.pageDescription}</p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // No license found - show setup message
  if (licenseError || !license) {
    return (
      <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-2xl font-bold text-gray-900">{texts.pageTitle}</h1>
          <p className="text-gray-600 mt-1">{texts.pageDescription}</p>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{texts.noLicenseFound}</AlertTitle>
          <AlertDescription>
            {texts.noLicenseFoundDesc}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className={isRTL ? "text-right" : ""}>
        <h1 className="text-2xl font-bold text-gray-900">{texts.pageTitle}</h1>
        <p className="text-gray-600 mt-1">
          {texts.pageDescription}
        </p>
      </div>

      {/* Expiry Warning */}
      {daysUntilExpiry <= 60 && daysUntilExpiry > 0 && (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">{texts.licenseExpiringSoon}</AlertTitle>
          <AlertDescription className="text-orange-700">
            {texts.licenseExpiringSoonDesc.replace("{days}", String(daysUntilExpiry))}
          </AlertDescription>
        </Alert>
      )}

      {daysUntilExpiry <= 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{texts.licenseExpired}</AlertTitle>
          <AlertDescription>
            {texts.licenseExpiredDesc}
          </AlertDescription>
        </Alert>
      )}

      {/* Slot limit warning */}
      {slotStatus && !slotStatus.can_submit && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">{texts.slotLimitReached}</AlertTitle>
          <AlertDescription className="text-amber-700">
            {slotStatus.reason || "You have reached your maximum program limit. Request additional slots to submit more programs."}
          </AlertDescription>
        </Alert>
      )}

      {/* License Card */}
      <Card>
        <CardHeader>
          <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <Shield className="h-5 w-5 text-primary" />
              {texts.pdpLicense}
            </CardTitle>
            <Badge className={statusColors[license.status]}>
              {statusLabels[license.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* License Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-500">{texts.partnerName}</p>
                <p className="font-semibold text-lg">
                  {user?.profile?.company_name || `${user?.profile?.first_name} ${user?.profile?.last_name}`}
                </p>
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-500">{texts.licenseNumber}</p>
                <p className="font-mono font-semibold">{license.license_number}</p>
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-500">{texts.partnerCode}</p>
                <p className="font-mono">{license.partner_code}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-500">{texts.issueDate}</p>
                <p className="font-medium" dir="ltr">{formatLicenseDate(license.issue_date)}</p>
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-500">{texts.expiryDate}</p>
                <p className="font-medium" dir="ltr">{formatLicenseDate(license.expiry_date)}</p>
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-500 mb-2">{texts.timeRemaining}</p>
                <Progress value={expiryPercentage} className="h-2" />
                <p className="text-sm text-gray-600 mt-1">
                  {daysUntilExpiry > 0 ? texts.daysRemaining.replace("{days}", String(daysUntilExpiry)) : texts.expired}
                </p>
              </div>
            </div>
          </div>

          {/* Program Slots */}
          <div className="pt-6 border-t">
            <div className={`flex items-center gap-2 mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              <Layers className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold">{texts.programSlots}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 bg-blue-50 rounded-lg border border-blue-200 ${isRTL ? "text-right" : ""}`}>
                <p className="text-sm text-blue-600">{texts.maxPrograms}</p>
                <p className="text-2xl font-bold text-blue-900">{license.max_programs}</p>
              </div>
              <div className={`p-4 bg-green-50 rounded-lg border border-green-200 ${isRTL ? "text-right" : ""}`}>
                <p className="text-sm text-green-600">{texts.programsUsed}</p>
                <p className="text-2xl font-bold text-green-900">{license.programs_used}</p>
              </div>
              <div className={`p-4 bg-purple-50 rounded-lg border border-purple-200 ${isRTL ? "text-right" : ""}`}>
                <p className="text-sm text-purple-600">{texts.availableSlots}</p>
                <p className="text-2xl font-bold text-purple-900">
                  {license.max_programs - license.programs_used}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className={`flex items-center justify-between text-sm mb-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                <span>{texts.slotUsage}</span>
                <span>{license.programs_used} / {license.max_programs}</span>
              </div>
              <Progress
                value={slotUsagePercentage}
                className={`h-2 ${slotUsagePercentage >= 80 ? '[&>div]:bg-amber-500' : ''} ${slotUsagePercentage >= 100 ? '[&>div]:bg-red-500' : ''}`}
              />
            </div>
            {!license.program_submission_enabled && (
              <Alert className="mt-4" variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>{texts.programSubmissionDisabled}</AlertTitle>
                <AlertDescription>
                  {texts.programSubmissionDisabledDesc}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Actions */}
          <div className={`flex flex-wrap gap-3 pt-6 border-t ${isRTL ? "flex-row-reverse" : ""}`}>
            {license.agreement_document_url && (
              <Button variant="outline" onClick={() => window.open(license.agreement_document_url, "_blank")}>
                <Download className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                {texts.downloadLicenseAgreement}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setRequestedSlots(license.max_programs + 5);
                setShowSlotDialog(true);
              }}
              disabled={hasPendingSlotRequest || submitRequest.isPending}
            >
              <Plus className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
              {hasPendingSlotRequest ? texts.slotRequestPending : texts.requestMoreSlots}
            </Button>
            <Button
              onClick={() => setShowRenewalDialog(true)}
              disabled={license.renewal_requested || hasPendingRenewal || submitRequest.isPending}
            >
              {submitRequest.isPending ? (
                <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? "ml-2" : "mr-2"}`} />
              ) : (
                <RefreshCw className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
              )}
              {license.renewal_requested || hasPendingRenewal ? texts.renewalRequested : texts.requestRenewal}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* License Terms */}
      {terms.length > 0 && (
        <Card>
          <CardHeader className={isRTL ? "text-right" : ""}>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <BookOpen className="h-5 w-5 text-primary" />
              {texts.licenseTerms}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {terms.map((term) => (
                <div key={term.id} className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{term.term_title}</p>
                    {term.term_description && (
                      <p className="text-sm text-gray-600">{term.term_description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader className={isRTL ? "text-right" : ""}>
            <CardTitle>{texts.licenseDocuments}</CardTitle>
            <CardDescription>{texts.downloadDocuments}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className={`flex items-center justify-between p-3 border rounded-lg ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div className={isRTL ? "text-right" : ""}>
                      <p className="font-medium">{doc.document_name}</p>
                      {doc.file_size && (
                        <p className="text-sm text-gray-500">
                          {(doc.file_size / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(doc.document_url, "_blank")}
                  >
                    <Download className={`h-4 w-4 ${isRTL ? "ml-1" : "mr-1"}`} />
                    {texts.download}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Requests History */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader className={isRTL ? "text-right" : ""}>
            <CardTitle>{texts.requestHistory}</CardTitle>
            <CardDescription>{texts.trackRequests}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.slice(0, 10).map((request) => (
                <div key={request.id} className={`flex items-center justify-between p-3 border rounded-lg ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    {request.status === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : request.status === 'rejected' ? (
                      <XCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-blue-600" />
                    )}
                    <div className={isRTL ? "text-right" : ""}>
                      <p className="font-medium capitalize">
                        {request.request_type === 'slot_increase'
                          ? `${texts.slotIncreaseRequest} (${request.current_slots} → ${request.requested_slots})`
                          : texts.renewalRequest}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <Badge className={requestStatusColors[request.status]}>
                      {request.status.replace('_', ' ')}
                    </Badge>
                    {request.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelRequest.mutate(request.id)}
                        disabled={cancelRequest.isPending}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Renewal Request Dialog */}
      <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className={isRTL ? "text-right" : ""}>
            <DialogTitle>{texts.requestLicenseRenewal}</DialogTitle>
            <DialogDescription>
              {texts.renewalDialogDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className={`p-4 bg-gray-50 rounded-lg ${isRTL ? "text-right" : ""}`}>
              <p className="text-sm text-gray-600">{texts.currentLicenseExpiry}</p>
              <p className="font-semibold" dir="ltr">{formatLicenseDate(license.expiry_date)}</p>
            </div>
            <div className={`space-y-2 ${isRTL ? "text-right" : ""}`}>
              <Label>{texts.additionalNotes}</Label>
              <Textarea
                value={renewalNotes}
                onChange={(e) => setRenewalNotes(e.target.value)}
                placeholder={texts.renewalNotesPlaceholder}
                rows={4}
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>
          </div>
          <DialogFooter className={isRTL ? "flex-row-reverse gap-2" : ""}>
            <Button variant="outline" onClick={() => setShowRenewalDialog(false)}>
              {texts.cancel}
            </Button>
            <Button onClick={handleRenewalRequest} disabled={submitRequest.isPending}>
              {submitRequest.isPending ? (
                <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? "ml-2" : "mr-2"}`} />
              ) : (
                <Send className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
              )}
              {texts.submitRenewalRequest}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slot Increase Dialog */}
      <Dialog open={showSlotDialog} onOpenChange={setShowSlotDialog}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className={isRTL ? "text-right" : ""}>
            <DialogTitle>{texts.requestAdditionalSlots}</DialogTitle>
            <DialogDescription>
              {texts.slotDialogDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg grid grid-cols-2 gap-4">
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-600">{texts.currentLimit}</p>
                <p className="font-semibold text-xl">{license.max_programs} {texts.programs}</p>
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-sm text-gray-600">{texts.currentlyUsed}</p>
                <p className="font-semibold text-xl">{license.programs_used} {texts.programs}</p>
              </div>
            </div>
            <div className={`space-y-2 ${isRTL ? "text-right" : ""}`}>
              <Label>{texts.requestedNewLimit} *</Label>
              <Input
                type="number"
                min={license.max_programs + 1}
                max={50}
                value={requestedSlots}
                onChange={(e) => setRequestedSlots(parseInt(e.target.value) || 0)}
                dir="ltr"
              />
              <p className="text-sm text-gray-500">
                {texts.requestingAdditionalSlots.replace("{count}", String(requestedSlots - license.max_programs))}
              </p>
            </div>
            <div className={`space-y-2 ${isRTL ? "text-right" : ""}`}>
              <Label>{texts.justification} *</Label>
              <Textarea
                value={slotJustification}
                onChange={(e) => setSlotJustification(e.target.value)}
                placeholder={texts.justificationPlaceholder}
                rows={4}
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>
          </div>
          <DialogFooter className={isRTL ? "flex-row-reverse gap-2" : ""}>
            <Button variant="outline" onClick={() => setShowSlotDialog(false)}>
              {texts.cancel}
            </Button>
            <Button
              onClick={handleSlotRequest}
              disabled={
                !slotJustification.trim() ||
                requestedSlots <= license.max_programs ||
                submitRequest.isPending
              }
            >
              {submitRequest.isPending ? (
                <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? "ml-2" : "mr-2"}`} />
              ) : (
                <Send className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
              )}
              {texts.submitRequest}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
