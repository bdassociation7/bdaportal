/**
 * ECP License & Agreement
 *
 * View and manage ECP partnership license
 * Download agreements, request renewals, update scope
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Globe,
  RefreshCw,
  Send,
  Shield,
  Award,
  BookOpen,
  Loader2,
  XCircle,
} from "lucide-react";
import { useAuthContext } from "@/app/providers/AuthProvider";
import {
  useLicense,
  useLicenseDocuments,
  useLicenseTerms,
  useComplianceRequirements,
  useLicenseRequests,
  useSubmitLicenseRequest,
} from "@/entities/ecp/ecp.hooks";
import type { LicenseStatus, LicenseRequestStatus, CertificationType } from "@/entities/ecp/ecp.types";
import { useLanguage } from "@/contexts/LanguageContext";

// ============================================================================
// Translations
// ============================================================================

const translations = {
  en: {
    // Page header
    pageTitle: 'License & Agreement',
    pageSubtitle: 'View and manage your ECP partnership license',
    // Status labels
    statusActive: 'Active',
    statusExpiringSoon: 'Expiring Soon',
    statusExpired: 'Expired',
    statusSuspended: 'Suspended',
    statusPendingRenewal: 'Pending Renewal',
    // Request status labels
    reqStatusPending: 'pending',
    reqStatusUnderReview: 'under review',
    reqStatusApproved: 'approved',
    reqStatusRejected: 'rejected',
    reqStatusCancelled: 'cancelled',
    // Alerts
    licenseExpiringSoonTitle: 'License Expiring Soon',
    licenseExpiringSoonDesc: (days: number) => `Your ECP license will expire in ${days} days. Please submit a renewal request to maintain your partnership status.`,
    licenseExpiredTitle: 'License Expired',
    licenseExpiredDesc: 'Your ECP license has expired. Please contact BDA immediately to renew your partnership.',
    pendingRequestsTitle: 'Pending Requests',
    pendingRequestsDesc: (count: number) => `You have ${count} pending request(s) under review.`,
    noLicenseTitle: 'No License Found',
    noLicenseDesc: 'Your ECP license has not been set up yet. Please contact BDA administration to complete your partner registration and license setup.',
    // License card
    ecpPartnershipLicense: 'ECP Partnership License',
    partnerName: 'Partner Name',
    licenseNumber: 'License Number',
    partnerCode: 'Partner Code',
    issueDate: 'Issue Date',
    expiryDate: 'Expiry Date',
    timeRemaining: 'Time Remaining',
    daysRemaining: (days: number) => `${days} days remaining`,
    expired: 'Expired',
    // Territories & Programs
    licensedTerritories: 'Licensed Territories',
    noTerritories: 'No territories specified',
    licensedPrograms: 'Licensed Programs',
    noPrograms: 'No programs specified',
    certifiedProfessional: 'Certified Professional',
    seniorCertifiedProfessional: 'Senior Certified Professional',
    // Actions
    downloadLicenseAgreement: 'Download License Agreement',
    requestScopeUpdate: 'Request Scope Update',
    requestRenewal: 'Request Renewal',
    renewalRequested: 'Renewal Requested',
    // Terms card
    licenseTermsTitle: 'License Terms & Conditions',
    trainingDeliveryRights: 'Training Delivery Rights',
    trainingDeliveryDesc: 'Authorised to deliver official BDA certification training programs within licensed territories.',
    bdaBrandingRights: 'Use of BDA Branding',
    bdaBrandingDesc: 'Licensed to use BDA and ECP logos in marketing materials according to brand guidelines.',
    examAdministration: 'Exam Administration',
    examAdministrationDesc: 'Authorised to purchase and distribute exam vouchers to registered candidates.',
    certifiedTrainerAssignment: 'Certified Trainer Assignment',
    certifiedTrainerDesc: 'Must use only BDA-approved Certified Trainers for all training deliveries.',
    // Compliance
    complianceRequirements: 'Compliance Requirements',
    quarterlyReports: 'Submit quarterly activity reports',
    passRateStandards: 'Maintain minimum pass rate standards',
    approvedMaterials: 'Use only approved training materials',
    reportDeliveries: 'Report all training deliveries within 14 days',
    // Documents
    licenseDocuments: 'License Documents',
    downloadDocuments: 'Download official partnership documents',
    download: 'Download',
    ecpLicenseAgreement: 'ECP License Agreement',
    signedPartnershipAgreement: 'Signed partnership agreement',
    brandUsageGuidelines: 'Brand Usage Guidelines',
    brandUsageDesc: 'Logo and branding requirements',
    trainingStandardsManual: 'Training Standards Manual',
    trainingStandardsDesc: 'Quality and delivery requirements',
    documentsNotAvailable: 'Documents will be available once uploaded by BDA administration.',
    // Request history
    requestHistory: 'Request History',
    trackRequests: 'Track your license requests',
    renewalRequest: 'Renewal Request',
    scopeUpdateRequest: 'Scope Update Request',
    // Renewal dialog
    renewalDialogTitle: 'Request License Renewal',
    renewalDialogDesc: 'Submit a renewal request for your ECP partnership license',
    currentLicenseExpiry: 'Current License Expiry',
    additionalNotes: 'Additional Notes (Optional)',
    renewalNotesPlaceholder: 'Any special requests or changes for the renewal...',
    cancel: 'Cancel',
    submitRenewalRequest: 'Submit Renewal Request',
    // Scope dialog
    scopeDialogTitle: 'Request Scope Update',
    scopeDialogDesc: 'Request changes to your licensed territories or programs',
    currentTerritories: 'Current Territories',
    currentPrograms: 'Current Programs',
    noneSpecified: 'None specified',
    describeChanges: 'Describe Requested Changes *',
    scopePlaceholder: 'Example: Add Jordan to licensed territories, or add SCP program to license...',
    submitRequest: 'Submit Request',
  },
  ar: {
    // Page header
    pageTitle: 'الترخيص والاتفاقية',
    pageSubtitle: 'عرض وإدارة ترخيص شراكة ECP الخاص بك',
    // Status labels
    statusActive: 'نشط',
    statusExpiringSoon: 'ينتهي قريباً',
    statusExpired: 'منتهي الصلاحية',
    statusSuspended: 'موقوف',
    statusPendingRenewal: 'بانتظار التجديد',
    // Request status labels
    reqStatusPending: 'معلق',
    reqStatusUnderReview: 'قيد المراجعة',
    reqStatusApproved: 'موافق عليه',
    reqStatusRejected: 'مرفوض',
    reqStatusCancelled: 'ملغى',
    // Alerts
    licenseExpiringSoonTitle: 'الترخيص ينتهي قريباً',
    licenseExpiringSoonDesc: (days: number) => `سينتهي ترخيص ECP الخاص بك خلال ${days} يوم. يرجى تقديم طلب تجديد للحفاظ على حالة الشراكة.`,
    licenseExpiredTitle: 'انتهى الترخيص',
    licenseExpiredDesc: 'انتهى ترخيص ECP الخاص بك. يرجى التواصل مع إدارة BDA فوراً لتجديد شراكتك.',
    pendingRequestsTitle: 'طلبات معلقة',
    pendingRequestsDesc: (count: number) => `لديك ${count} طلب(ات) معلقة قيد المراجعة.`,
    noLicenseTitle: 'لم يتم العثور على ترخيص',
    noLicenseDesc: 'لم يتم إعداد ترخيص ECP الخاص بك بعد. يرجى التواصل مع إدارة BDA لإكمال تسجيل الشريك وإعداد الترخيص.',
    // License card
    ecpPartnershipLicense: 'ترخيص شراكة ECP',
    partnerName: 'اسم الشريك',
    licenseNumber: 'رقم الترخيص',
    partnerCode: 'رمز الشريك',
    issueDate: 'تاريخ الإصدار',
    expiryDate: 'تاريخ الانتهاء',
    timeRemaining: 'الوقت المتبقي',
    daysRemaining: (days: number) => `${days} يوم متبقي`,
    expired: 'منتهي الصلاحية',
    // Territories & Programs
    licensedTerritories: 'المناطق المرخصة',
    noTerritories: 'لم يتم تحديد مناطق',
    licensedPrograms: 'البرامج المرخصة',
    noPrograms: 'لم يتم تحديد برامج',
    certifiedProfessional: 'محترف معتمد',
    seniorCertifiedProfessional: 'محترف معتمد أول',
    // Actions
    downloadLicenseAgreement: 'تحميل اتفاقية الترخيص',
    requestScopeUpdate: 'طلب تحديث النطاق',
    requestRenewal: 'طلب التجديد',
    renewalRequested: 'تم طلب التجديد',
    // Terms card
    licenseTermsTitle: 'شروط وأحكام الترخيص',
    trainingDeliveryRights: 'حقوق تقديم التدريب',
    trainingDeliveryDesc: 'مخول بتقديم برامج تدريب شهادات BDA الرسمية ضمن المناطق المرخصة.',
    bdaBrandingRights: 'استخدام علامة BDA التجارية',
    bdaBrandingDesc: 'مرخص لاستخدام شعارات BDA و ECP في المواد التسويقية وفقاً لإرشادات العلامة التجارية.',
    examAdministration: 'إدارة الامتحانات',
    examAdministrationDesc: 'مخول بشراء وتوزيع قسائم الامتحان للمرشحين المسجلين.',
    certifiedTrainerAssignment: 'تعيين المدرب المعتمد',
    certifiedTrainerDesc: 'يجب استخدام المدربين المعتمدين من BDA فقط لجميع عمليات تقديم التدريب.',
    // Compliance
    complianceRequirements: 'متطلبات الامتثال',
    quarterlyReports: 'تقديم تقارير النشاط ربع السنوية',
    passRateStandards: 'الحفاظ على معايير الحد الأدنى لمعدل النجاح',
    approvedMaterials: 'استخدام المواد التدريبية المعتمدة فقط',
    reportDeliveries: 'الإبلاغ عن جميع عمليات تقديم التدريب خلال 14 يوماً',
    // Documents
    licenseDocuments: 'مستندات الترخيص',
    downloadDocuments: 'تحميل مستندات الشراكة الرسمية',
    download: 'تحميل',
    ecpLicenseAgreement: 'اتفاقية ترخيص ECP',
    signedPartnershipAgreement: 'اتفاقية الشراكة الموقعة',
    brandUsageGuidelines: 'إرشادات استخدام العلامة التجارية',
    brandUsageDesc: 'متطلبات الشعار والعلامة التجارية',
    trainingStandardsManual: 'دليل معايير التدريب',
    trainingStandardsDesc: 'متطلبات الجودة والتقديم',
    documentsNotAvailable: 'ستتوفر المستندات بمجرد رفعها من قبل إدارة BDA.',
    // Request history
    requestHistory: 'سجل الطلبات',
    trackRequests: 'تتبع طلبات الترخيص الخاصة بك',
    renewalRequest: 'طلب تجديد',
    scopeUpdateRequest: 'طلب تحديث النطاق',
    // Renewal dialog
    renewalDialogTitle: 'طلب تجديد الترخيص',
    renewalDialogDesc: 'تقديم طلب تجديد لترخيص شراكة ECP الخاص بك',
    currentLicenseExpiry: 'تاريخ انتهاء الترخيص الحالي',
    additionalNotes: 'ملاحظات إضافية (اختياري)',
    renewalNotesPlaceholder: 'أي طلبات خاصة أو تغييرات للتجديد...',
    cancel: 'إلغاء',
    submitRenewalRequest: 'تقديم طلب التجديد',
    // Scope dialog
    scopeDialogTitle: 'طلب تحديث النطاق',
    scopeDialogDesc: 'طلب تغييرات على المناطق أو البرامج المرخصة',
    currentTerritories: 'المناطق الحالية',
    currentPrograms: 'البرامج الحالية',
    noneSpecified: 'غير محدد',
    describeChanges: 'وصف التغييرات المطلوبة *',
    scopePlaceholder: 'مثال: إضافة الأردن إلى المناطق المرخصة، أو إضافة برنامج SCP إلى الترخيص...',
    submitRequest: 'تقديم الطلب',
  },
};

export default function ECPLicense() {
  const { user } = useAuthContext();
  const { language } = useLanguage();
  const texts = translations[language];

  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [showScopeDialog, setShowScopeDialog] = useState(false);
  const [renewalNotes, setRenewalNotes] = useState("");
  const [scopeRequest, setScopeRequest] = useState("");

  // Fetch data using hooks
  const { data: license, isLoading: licenseLoading, error: licenseError } = useLicense();
  const { data: documents, isLoading: documentsLoading } = useLicenseDocuments();
  const { data: terms, isLoading: termsLoading } = useLicenseTerms();
  const { data: complianceRequirements, isLoading: complianceLoading } = useComplianceRequirements();
  const { data: pendingRequests } = useLicenseRequests();

  const submitRequest = useSubmitLicenseRequest();

  // Calculate days until expiry
  const daysUntilExpiry = license?.expiry_date
    ? Math.ceil((new Date(license.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;
  const expiryPercentage = Math.max(0, Math.min(100, (daysUntilExpiry / 365) * 100));

  const statusColors: Record<LicenseStatus, string> = {
    active: "bg-green-100 text-green-700 border-green-200",
    expiring_soon: "bg-orange-100 text-orange-700 border-orange-200",
    expired: "bg-red-100 text-red-700 border-red-200",
    suspended: "bg-gray-100 text-gray-700 border-gray-200",
    pending_renewal: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const statusLabels: Record<LicenseStatus, string> = {
    active: texts.statusActive,
    expiring_soon: texts.statusExpiringSoon,
    expired: texts.statusExpired,
    suspended: texts.statusSuspended,
    pending_renewal: texts.statusPendingRenewal,
  };

  const requestStatusLabels: Record<LicenseRequestStatus, string> = {
    pending: texts.reqStatusPending,
    under_review: texts.reqStatusUnderReview,
    approved: texts.reqStatusApproved,
    rejected: texts.reqStatusRejected,
    cancelled: texts.reqStatusCancelled,
  };

  const requestStatusColors: Record<LicenseRequestStatus, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    under_review: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-700",
  };

  const documentTypeIcons: Record<string, string> = {
    license_agreement: "text-blue-600",
    brand_guidelines: "text-green-600",
    training_standards: "text-purple-600",
    compliance_checklist: "text-orange-600",
    renewal_contract: "text-indigo-600",
    amendment: "text-red-600",
    other: "text-gray-600",
  };

  const handleRenewalRequest = async () => {
    await submitRequest.mutateAsync({
      request_type: 'renewal',
      description: renewalNotes || 'License renewal request',
    });
    setShowRenewalDialog(false);
    setRenewalNotes("");
  };

  const handleScopeRequest = async () => {
    await submitRequest.mutateAsync({
      request_type: 'scope_update',
      description: scopeRequest,
    });
    setShowScopeDialog(false);
    setScopeRequest("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getProgramLabel = (program: CertificationType) => {
    return program === "CP" ? texts.certifiedProfessional : texts.seniorCertifiedProfessional;
  };

  // Check if there's a pending renewal request
  const hasPendingRenewal = pendingRequests?.some(
    r => r.request_type === 'renewal' && ['pending', 'under_review'].includes(r.status)
  );

  // Loading state
  if (licenseLoading) {
    return (
      <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className={language === 'ar' ? 'text-right' : ''}>
          <h1 className="text-2xl font-bold text-gray-900">{texts.pageTitle}</h1>
          <p className="text-gray-600 mt-1">{texts.pageSubtitle}</p>
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
      <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className={language === 'ar' ? 'text-right' : ''}>
          <h1 className="text-2xl font-bold text-gray-900">{texts.pageTitle}</h1>
          <p className="text-gray-600 mt-1">{texts.pageSubtitle}</p>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{texts.noLicenseTitle}</AlertTitle>
          <AlertDescription>
            {texts.noLicenseDesc}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={language === 'ar' ? 'text-right' : ''}>
        <h1 className="text-2xl font-bold text-gray-900">{texts.pageTitle}</h1>
        <p className="text-gray-600 mt-1">
          {texts.pageSubtitle}
        </p>
      </div>

      {/* Expiry Warning */}
      {daysUntilExpiry <= 60 && daysUntilExpiry > 0 && (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">{texts.licenseExpiringSoonTitle}</AlertTitle>
          <AlertDescription className="text-orange-700">
            {texts.licenseExpiringSoonDesc(daysUntilExpiry)}
          </AlertDescription>
        </Alert>
      )}

      {daysUntilExpiry <= 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{texts.licenseExpiredTitle}</AlertTitle>
          <AlertDescription>
            {texts.licenseExpiredDesc}
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Requests Alert */}
      {pendingRequests && pendingRequests.filter(r => ['pending', 'under_review'].includes(r.status)).length > 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">{texts.pendingRequestsTitle}</AlertTitle>
          <AlertDescription className="text-blue-700">
            {texts.pendingRequestsDesc(pendingRequests.filter(r => ['pending', 'under_review'].includes(r.status)).length)}
          </AlertDescription>
        </Alert>
      )}

      {/* License Card */}
      <Card>
        <CardHeader>
          <div className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <Shield className="h-5 w-5 text-primary" />
              {texts.ecpPartnershipLicense}
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
              <div>
                <p className="text-sm text-gray-500">{texts.partnerName}</p>
                <p className="font-semibold text-lg">
                  {user?.profile?.company_name || `${user?.profile?.first_name} ${user?.profile?.last_name}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{texts.licenseNumber}</p>
                <p className="font-mono font-semibold">{license.license_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{texts.partnerCode}</p>
                <p className="font-mono">{license.partner_code}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">{texts.issueDate}</p>
                <p className="font-medium">{formatDate(license.issue_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{texts.expiryDate}</p>
                <p className="font-medium">{formatDate(license.expiry_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">{texts.timeRemaining}</p>
                <Progress value={expiryPercentage} className="h-2" />
                <p className="text-sm text-gray-600 mt-1">
                  {daysUntilExpiry > 0 ? texts.daysRemaining(daysUntilExpiry) : texts.expired}
                </p>
              </div>
            </div>
          </div>

          {/* Territory & Programs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
            <div>
              <div className={`flex items-center gap-2 mb-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <Globe className="h-4 w-4 text-gray-500" />
                <p className="text-sm font-medium text-gray-700">{texts.licensedTerritories}</p>
              </div>
              <div className={`flex flex-wrap gap-2 ${language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                {license.territories && license.territories.length > 0 ? (
                  license.territories.map((country) => (
                    <Badge key={country} variant="outline">
                      {country}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">{texts.noTerritories}</span>
                )}
              </div>
            </div>
            <div>
              <div className={`flex items-center gap-2 mb-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <Award className="h-4 w-4 text-gray-500" />
                <p className="text-sm font-medium text-gray-700">{texts.licensedPrograms}</p>
              </div>
              <div className={`flex flex-wrap gap-2 ${language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                {license.programs && license.programs.length > 0 ? (
                  license.programs.map((program) => (
                    <Badge
                      key={program}
                      className={
                        program === "CP"
                          ? "bg-green-100 text-green-700"
                          : "bg-purple-100 text-purple-700"
                      }
                    >
                      {program} - {getProgramLabel(program)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">{texts.noPrograms}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={`flex flex-wrap gap-3 pt-6 border-t ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            {license.agreement_document_url && (
              <Button variant="outline" onClick={() => window.open(license.agreement_document_url, "_blank")} className={language === 'ar' ? 'flex-row-reverse' : ''}>
                <Download className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                {texts.downloadLicenseAgreement}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowScopeDialog(true)} className={language === 'ar' ? 'flex-row-reverse' : ''}>
              <Globe className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              {texts.requestScopeUpdate}
            </Button>
            <Button
              onClick={() => setShowRenewalDialog(true)}
              disabled={license.renewal_requested || hasPendingRenewal || submitRequest.isPending}
              className={language === 'ar' ? 'flex-row-reverse' : ''}
            >
              {submitRequest.isPending ? (
                <Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              ) : (
                <RefreshCw className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              )}
              {license.renewal_requested || hasPendingRenewal ? texts.renewalRequested : texts.requestRenewal}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* License Terms */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <BookOpen className="h-5 w-5 text-primary" />
            {texts.licenseTermsTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {termsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : terms && terms.length > 0 ? (
            <div className="space-y-3">
              {terms.map((term) => (
                <div key={term.id} className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{term.title}</p>
                    <p className="text-sm text-gray-600">{term.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{texts.trainingDeliveryRights}</p>
                  <p className="text-sm text-gray-600">
                    {texts.trainingDeliveryDesc}
                  </p>
                </div>
              </div>
              <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{texts.bdaBrandingRights}</p>
                  <p className="text-sm text-gray-600">
                    {texts.bdaBrandingDesc}
                  </p>
                </div>
              </div>
              <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{texts.examAdministration}</p>
                  <p className="text-sm text-gray-600">
                    {texts.examAdministrationDesc}
                  </p>
                </div>
              </div>
              <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{texts.certifiedTrainerAssignment}</p>
                  <p className="text-sm text-gray-600">
                    {texts.certifiedTrainerDesc}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Compliance Requirements */}
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{texts.complianceRequirements}</AlertTitle>
            <AlertDescription>
              {complianceLoading ? (
                <Skeleton className="h-20 w-full mt-2" />
              ) : complianceRequirements && complianceRequirements.length > 0 ? (
                <ul className={`list-disc mt-2 space-y-1 text-sm ${language === 'ar' ? 'list-inside-rtl mr-4' : 'list-inside'}`}>
                  {complianceRequirements.map((req) => (
                    <li key={req.id}>{req.title}</li>
                  ))}
                </ul>
              ) : (
                <ul className={`list-disc mt-2 space-y-1 text-sm ${language === 'ar' ? 'list-inside-rtl mr-4' : 'list-inside'}`}>
                  <li>{texts.quarterlyReports}</li>
                  <li>{texts.passRateStandards}</li>
                  <li>{texts.approvedMaterials}</li>
                  <li>{texts.reportDeliveries}</li>
                </ul>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle>{texts.licenseDocuments}</CardTitle>
          <CardDescription>{texts.downloadDocuments}</CardDescription>
        </CardHeader>
        <CardContent>
          {documentsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className={`flex items-center justify-between p-3 border rounded-lg ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                    <FileText className={`h-5 w-5 ${documentTypeIcons[doc.document_type] || 'text-gray-600'}`} />
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      {doc.description && (
                        <p className="text-sm text-gray-500">{doc.description}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(doc.file_url, "_blank")}
                  >
                    <Download className={`h-4 w-4 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                    {texts.download}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`flex items-center justify-between p-3 border rounded-lg ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">{texts.ecpLicenseAgreement}</p>
                    <p className="text-sm text-gray-500">{texts.signedPartnershipAgreement}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Download className={`h-4 w-4 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                  {texts.download}
                </Button>
              </div>
              <div className={`flex items-center justify-between p-3 border rounded-lg ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">{texts.brandUsageGuidelines}</p>
                    <p className="text-sm text-gray-500">{texts.brandUsageDesc}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Download className={`h-4 w-4 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                  {texts.download}
                </Button>
              </div>
              <div className={`flex items-center justify-between p-3 border rounded-lg ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                  <FileText className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">{texts.trainingStandardsManual}</p>
                    <p className="text-sm text-gray-500">{texts.trainingStandardsDesc}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Download className={`h-4 w-4 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                  {texts.download}
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2 text-center">
                {texts.documentsNotAvailable}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Requests History */}
      {pendingRequests && pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{texts.requestHistory}</CardTitle>
            <CardDescription>{texts.trackRequests}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.slice(0, 5).map((request) => (
                <div key={request.id} className={`flex items-center justify-between p-3 border rounded-lg ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                    {request.status === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : request.status === 'rejected' ? (
                      <XCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-blue-600" />
                    )}
                    <div>
                      <p className="font-medium">
                        {request.request_type === 'renewal' ? texts.renewalRequest : texts.scopeUpdateRequest}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge className={requestStatusColors[request.status]}>
                    {requestStatusLabels[request.status]}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Renewal Request Dialog */}
      <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
        <DialogContent dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader className={language === 'ar' ? 'text-right' : ''}>
            <DialogTitle>{texts.renewalDialogTitle}</DialogTitle>
            <DialogDescription>
              {texts.renewalDialogDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className={`p-4 bg-gray-50 rounded-lg ${language === 'ar' ? 'text-right' : ''}`}>
              <p className="text-sm text-gray-600">{texts.currentLicenseExpiry}</p>
              <p className="font-semibold">{formatDate(license.expiry_date)}</p>
            </div>
            <div className={`space-y-2 ${language === 'ar' ? 'text-right' : ''}`}>
              <Label>{texts.additionalNotes}</Label>
              <Textarea
                value={renewalNotes}
                onChange={(e) => setRenewalNotes(e.target.value)}
                placeholder={texts.renewalNotesPlaceholder}
                rows={4}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>
          </div>
          <DialogFooter className={language === 'ar' ? 'flex-row-reverse gap-2' : ''}>
            <Button variant="outline" onClick={() => setShowRenewalDialog(false)}>
              {texts.cancel}
            </Button>
            <Button onClick={handleRenewalRequest} disabled={submitRequest.isPending}>
              {submitRequest.isPending ? (
                <Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              ) : (
                <Send className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              )}
              {texts.submitRenewalRequest}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scope Update Dialog */}
      <Dialog open={showScopeDialog} onOpenChange={setShowScopeDialog}>
        <DialogContent dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader className={language === 'ar' ? 'text-right' : ''}>
            <DialogTitle>{texts.scopeDialogTitle}</DialogTitle>
            <DialogDescription>
              {texts.scopeDialogDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className={`p-4 bg-gray-50 rounded-lg space-y-2 ${language === 'ar' ? 'text-right' : ''}`}>
              <div>
                <p className="text-sm text-gray-600">{texts.currentTerritories}</p>
                <p className="font-medium">
                  {license.territories && license.territories.length > 0
                    ? license.territories.join(", ")
                    : texts.noneSpecified}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{texts.currentPrograms}</p>
                <p className="font-medium">
                  {license.programs && license.programs.length > 0
                    ? license.programs.join(", ")
                    : texts.noneSpecified}
                </p>
              </div>
            </div>
            <div className={`space-y-2 ${language === 'ar' ? 'text-right' : ''}`}>
              <Label>{texts.describeChanges}</Label>
              <Textarea
                value={scopeRequest}
                onChange={(e) => setScopeRequest(e.target.value)}
                placeholder={texts.scopePlaceholder}
                rows={4}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>
          </div>
          <DialogFooter className={language === 'ar' ? 'flex-row-reverse gap-2' : ''}>
            <Button variant="outline" onClick={() => setShowScopeDialog(false)}>
              {texts.cancel}
            </Button>
            <Button
              onClick={handleScopeRequest}
              disabled={!scopeRequest.trim() || submitRequest.isPending}
            >
              {submitRequest.isPending ? (
                <Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              ) : (
                <Send className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              )}
              {texts.submitRequest}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
