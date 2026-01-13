import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Award,
  Loader2,
  Plus,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { useUserCertifications } from '@/entities/certifications';
import {
  usePdcEntries,
  useCreatePdcEntry,
  useUserPdcSummary,
  ACTIVITY_TYPE_LABELS,
  STATUS_LABELS,
  PdcsService,
} from '@/entities/pdcs';
import type {
  CreatePdcEntryDTO,
  CertificationType,
  PdcActivityType,
} from '@/entities/pdcs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShoppingCart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const translations = {
  en: {
    // Header
    title: 'PDC Management',
    subtitle: 'Track and submit Professional Development Credits',
    // Status badges
    approved: 'Approved',
    rejected: 'Rejected',
    pending: 'Pending',
    // No certification
    certificationRequired: 'Certification Required',
    certificationRequiredDesc: 'You must be a certified BDA professional (BDA-CP™ or BDA-SCP™) to submit PDCs. Professional Development Credits are only available to active certification holders.',
    certificationRequiredCard: 'The PDC module is available exclusively to certified BDA professionals. Earn your BDA-CP™ or BDA-SCP™ certification to access this feature.',
    learnAboutCertification: 'Learn About Certification',
    // Submit button & dialog
    submitPdc: 'Submit PDC',
    submitPdcEntry: 'Submit PDC Entry',
    submitPdcDesc: 'Submit your professional development activity for credit approval',
    // Form labels
    certificationTypeLabel: 'Certification Type',
    autoDetected: '(Auto-detected from your active certification)',
    activityType: 'Activity Type',
    activityTitleEn: 'Activity Title (English)',
    activityTitleAr: 'Activity Title (Arabic)',
    activityTitlePlaceholder: 'e.g., Data Analytics Workshop',
    activityTitleArPlaceholder: 'عنوان النشاط',
    description: 'Description',
    descriptionPlaceholder: 'Brief description of the activity and what you learned',
    creditsClaimed: 'Credits Claimed',
    activityDate: 'Activity Date',
    programId: 'PDP Program ID',
    programIdPlaceholder: 'e.g., BDA-PDP-2024-001',
    programIdRequired: 'Required: Official PDP Provider program ID (min 3 characters)',
    programIdError: 'Program ID is required and must be at least 3 characters',
    certificateProof: 'Certificate / Proof of Completion',
    selectedFile: 'Selected',
    uploadHint: 'Upload certificate, completion letter, or proof of participation (PDF, JPG, PNG)',
    additionalNotes: 'Additional Notes',
    notesPlaceholder: 'Any additional information for the reviewer',
    cancel: 'Cancel',
    // Progress
    recertificationProgress: 'Recertification Progress',
    pdcsCompleted: (current: number, total: number) => `${current} / ${total} PDCs completed`,
    pdcsRequirement: 'You need 60 approved PDC credits for recertification',
    // Recertification CTA
    readyForRecertification: 'PDC Requirement Complete!',
    recertificationPaymentRequired: 'Congratulations! You have completed the 60 PDC credits required for recertification. To complete the recertification process, you must purchase the renewal and pay the recertification fee.',
    yourCertificationExpires: 'Your certification expires on',
    purchaseRenewal: 'Purchase Recertification',
    renewalFeeRequired: 'Renewal fee payment required to complete recertification',
    viewCertification: 'View My Certification',
    // Summary cards
    cpCredits: 'BDA-CP™ Credits',
    scpCredits: 'BDA-SCP™ Credits',
    last3Years: 'Last 3 years',
    approvedCredits: 'Approved Credits',
    pendingCredits: 'Pending Credits',
    totalEntries: 'Total Entries',
    activeForPdc: 'Active for PDC Tracking',
    inactiveForPdc: 'Inactive',
    pdcNotCountedTowardThis: 'PDCs are counted toward BDA-SCP™ only',
    // Table
    myPdcEntries: 'My PDC Entries',
    myPdcEntriesDesc: 'Track your submitted professional development activities',
    activity: 'Activity',
    type: 'Type',
    cert: 'Cert',
    date: 'Date',
    credits: 'Credits',
    status: 'Status',
    submitted: 'Submitted',
    proof: 'Proof',
    claimed: 'Claimed',
    approvedLabel: 'Approved',
    noEntries: 'No PDC entries yet. Submit your first activity above!',
    // Toast
    downloadFailed: 'Failed to download certificate',
    generateUrlFailed: 'Failed to generate download URL',
    // Program validation
    validatingProgram: 'Validating Program ID...',
    programValid: 'Valid program found',
    programInvalid: 'Invalid Program ID',
    programAutoFill: 'Credits auto-filled from program',
    autoApproved: 'PDC entry auto-approved!',
    pendingReview: 'PDC entry submitted for review',
    creditsFromProgram: 'Credits (from program)',
    programAlreadyUsed: 'You have already used this Program ID',
    duplicateProgram: 'This program has already been submitted. Each program can only be used once.',
    // Carry-over credits
    reservedForNextCycle: 'Reserved for Next Cycle',
    creditsReservedDesc: (credits: number) => `${credits} PDCs reserved for your next recertification cycle`,
    carryOverExplanation: 'You have exceeded the 60-credit limit for this cycle. Excess credits will be automatically applied when your certification renews.',
    carryOverActive: 'These credits will become active after certification renewal',
  },
  ar: {
    // Header
    title: 'إدارة PDC',
    subtitle: 'تتبع وتقديم نقاط التطوير المهني',
    // Status badges
    approved: 'معتمد',
    rejected: 'مرفوض',
    pending: 'قيد الانتظار',
    // No certification
    certificationRequired: 'الشهادة مطلوبة',
    certificationRequiredDesc: 'يجب أن تكون محترفاً معتمداً من BDA (BDA-CP™ أو BDA-SCP™) لتقديم PDCs. نقاط التطوير المهني متاحة فقط لحاملي الشهادات النشطة.',
    certificationRequiredCard: 'وحدة PDC متاحة حصرياً لمحترفي BDA المعتمدين. احصل على شهادة BDA-CP™ أو BDA-SCP™ للوصول إلى هذه الميزة.',
    learnAboutCertification: 'تعرف على الشهادة',
    // Submit button & dialog
    submitPdc: 'تقديم PDC',
    submitPdcEntry: 'تقديم إدخال PDC',
    submitPdcDesc: 'قدم نشاط التطوير المهني الخاص بك للموافقة على النقاط',
    // Form labels
    certificationTypeLabel: 'نوع الشهادة',
    autoDetected: '(تم اكتشافه تلقائياً من شهادتك النشطة)',
    activityType: 'نوع النشاط',
    activityTitleEn: 'عنوان النشاط (بالإنجليزية)',
    activityTitleAr: 'عنوان النشاط (بالعربية)',
    activityTitlePlaceholder: 'مثال: ورشة عمل تحليل البيانات',
    activityTitleArPlaceholder: 'عنوان النشاط',
    description: 'الوصف',
    descriptionPlaceholder: 'وصف موجز للنشاط وما تعلمته',
    creditsClaimed: 'النقاط المطلوبة',
    activityDate: 'تاريخ النشاط',
    programId: 'معرف برنامج PDP',
    programIdPlaceholder: 'مثال: BDA-PDP-2024-001',
    programIdRequired: 'مطلوب: معرف برنامج مزود PDP الرسمي (3 أحرف على الأقل)',
    programIdError: 'معرف البرنامج مطلوب ويجب أن يكون 3 أحرف على الأقل',
    certificateProof: 'الشهادة / إثبات الإتمام',
    selectedFile: 'المحدد',
    uploadHint: 'قم بتحميل الشهادة أو خطاب الإتمام أو إثبات المشاركة (PDF، JPG، PNG)',
    additionalNotes: 'ملاحظات إضافية',
    notesPlaceholder: 'أي معلومات إضافية للمراجع',
    cancel: 'إلغاء',
    // Progress
    recertificationProgress: 'تقدم إعادة الاعتماد',
    pdcsCompleted: (current: number, total: number) => `${current} / ${total} PDCs مكتملة`,
    pdcsRequirement: 'تحتاج إلى 60 نقطة PDC معتمدة لإعادة الاعتماد',
    // Recertification CTA
    readyForRecertification: 'اكتمال متطلبات PDC!',
    recertificationPaymentRequired: 'تهانينا! لقد أكملت 60 نقطة PDC المطلوبة لإعادة الاعتماد. لإكمال عملية إعادة الاعتماد، يجب عليك شراء التجديد ودفع رسوم إعادة الاعتماد.',
    yourCertificationExpires: 'تنتهي صلاحية شهادتك في',
    purchaseRenewal: 'شراء إعادة الاعتماد',
    renewalFeeRequired: 'مطلوب دفع رسوم التجديد لإكمال إعادة الاعتماد',
    viewCertification: 'عرض شهادتي',
    // Summary cards
    cpCredits: 'نقاط BDA-CP™',
    scpCredits: 'نقاط BDA-SCP™',
    last3Years: 'آخر 3 سنوات',
    approvedCredits: 'النقاط المعتمدة',
    pendingCredits: 'النقاط المعلقة',
    totalEntries: 'إجمالي الإدخالات',
    activeForPdc: 'نشط لتتبع PDC',
    inactiveForPdc: 'غير نشط',
    pdcNotCountedTowardThis: 'يتم احتساب نقاط PDC نحو BDA-SCP™ فقط',
    // Table
    myPdcEntries: 'إدخالات PDC الخاصة بي',
    myPdcEntriesDesc: 'تتبع أنشطة التطوير المهني المقدمة',
    activity: 'النشاط',
    type: 'النوع',
    cert: 'الشهادة',
    date: 'التاريخ',
    credits: 'النقاط',
    status: 'الحالة',
    submitted: 'تم التقديم',
    proof: 'الإثبات',
    claimed: 'المطلوبة',
    approvedLabel: 'المعتمدة',
    noEntries: 'لا توجد إدخالات PDC بعد. قدم أول نشاط لك أعلاه!',
    // Toast
    downloadFailed: 'فشل في تحميل الشهادة',
    generateUrlFailed: 'فشل في إنشاء رابط التحميل',
    // Program validation
    validatingProgram: 'جاري التحقق من معرف البرنامج...',
    programValid: 'تم العثور على برنامج صالح',
    programInvalid: 'معرف البرنامج غير صالح',
    programAutoFill: 'تم ملء النقاط تلقائياً من البرنامج',
    autoApproved: 'تمت الموافقة التلقائية على إدخال PDC!',
    pendingReview: 'تم تقديم إدخال PDC للمراجعة',
    creditsFromProgram: 'النقاط (من البرنامج)',
    programAlreadyUsed: 'لقد استخدمت بالفعل معرف البرنامج هذا',
    duplicateProgram: 'تم تقديم هذا البرنامج بالفعل. يمكن استخدام كل برنامج مرة واحدة فقط.',
    // Carry-over credits
    reservedForNextCycle: 'محجوز للدورة القادمة',
    creditsReservedDesc: (credits: number) => `${credits} PDCs محجوزة لدورة إعادة الاعتماد القادمة`,
    carryOverExplanation: 'لقد تجاوزت حد 60 نقطة لهذه الدورة. سيتم تطبيق النقاط الزائدة تلقائياً عند تجديد شهادتك.',
    carryOverActive: 'ستصبح هذه النقاط نشطة بعد تجديد الشهادة',
  }
};

// Recertification product URLs by certification type
const RECERTIFICATION_URLS: Record<CertificationType, string> = {
  'CP': 'https://bda-global.org/en/product/bda-cp-recertification/',
  'SCP': 'https://bda-global.org/en/product/bda-scp-recertification/',
};

export default function PDCs() {
  const { user } = useAuthContext();
  const { language } = useLanguage();
  const texts = translations[language];
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isValidatingProgram, setIsValidatingProgram] = useState(false);
  const [programDetails, setProgramDetails] = useState<{
    is_valid: boolean;
    program_name: string | null;
    max_pdc_credits: number | null;
    provider_name: string | null;
    already_used?: boolean;
  } | null>(null);

  // US1: Check certification eligibility
  const { data: certificationsResult } = useUserCertifications(user?.id || '', { status: 'active' });
  const activeCertifications = certificationsResult?.data || [];
  const hasActiveCertification = activeCertifications.length > 0;

  // Determine active certification level for PDC tracking
  // If user has both CP and SCP, SCP is the active level (higher certification)
  // PDCs should only count toward the active certification
  const hasSCP = activeCertifications.some(cert => cert.certification_type === 'SCP');
  const hasCP = activeCertifications.some(cert => cert.certification_type === 'CP');

  // Active certification is SCP if user has it, otherwise CP
  const activeCertificationType: CertificationType = hasSCP ? 'SCP' : 'CP';
  const primaryCertification = activeCertifications.find(
    cert => cert.certification_type === activeCertificationType
  ) || activeCertifications[0];

  // Fetch data
  const { data: entries, isLoading } = usePdcEntries(user?.id ? { user_id: user.id } : {});
  const { data: cpSummary } = useUserPdcSummary(user?.id || '', 'CP');
  const { data: scpSummary } = useUserPdcSummary(user?.id || '', 'SCP');

  // Fetch cycle totals for active certification
  const [cycleTotals, setCycleTotals] = useState<{
    current_cycle_credits: number;
    reserved_next_cycle_credits: number;
    total_entries: number;
  } | null>(null);

  useEffect(() => {
    if (primaryCertification?.id) {
      PdcsService.getCycleTotals(primaryCertification.id).then((result) => {
        if (result.data) {
          setCycleTotals(result.data);
        }
      });
    }
  }, [primaryCertification?.id, entries]);

  // US4: Calculate total approved PDCs for progress
  // IMPORTANT: Use cycle totals which enforce the 60-PDC limit per cycle
  // Current cycle credits are capped at 60, excess carries over to next cycle
  const totalApprovedPDCs = cycleTotals?.current_cycle_credits || 0;
  const reservedNextCycle = cycleTotals?.reserved_next_cycle_credits || 0;
  const progressPercentage = Math.min((totalApprovedPDCs / 60) * 100, 100);
  const needsRecertification = totalApprovedPDCs >= 60;

  const createMutation = useCreatePdcEntry();

  // Show celebration toast when user completes 60 PDC requirement
  useEffect(() => {
    if (needsRecertification && primaryCertification && user?.id) {
      const storageKey = `pdc_completion_toast_${user.id}_${primaryCertification.id}`;
      const hasShownToast = localStorage.getItem(storageKey);

      if (!hasShownToast) {
        // Show success toast with celebration
        toast.success(texts.readyForRecertification, {
          description: texts.recertificationPaymentRequired,
          duration: 8000, // Show for 8 seconds
          icon: '🎉',
        });

        // Mark as shown so it doesn't repeat
        localStorage.setItem(storageKey, 'true');
      }
    }
  }, [needsRecertification, primaryCertification, user?.id, language, texts]);

  // US2: Auto-detect certification type from user's active certification
  const autoDetectedCertType: CertificationType = activeCertificationType;

  const [submitForm, setSubmitForm] = useState<{
    activity_type: PdcActivityType;
    activity_title: string;
    activity_title_ar: string;
    activity_description: string;
    credits_claimed: number;
    activity_date: string;
    program_id: string;
    certificate_file: File | null;
    notes: string;
  }>({
    activity_type: 'training_course',
    activity_title: '',
    activity_title_ar: '',
    activity_description: '',
    credits_claimed: 1,
    activity_date: new Date().toISOString().split('T')[0],
    program_id: '',
    certificate_file: null,
    notes: '',
  });

  // Validate program ID and auto-fill credits
  const handleProgramIdValidation = async (programId: string) => {
    if (!programId || programId.trim().length < 3 || !user?.id) {
      setProgramDetails(null);
      return;
    }

    setIsValidatingProgram(true);
    try {
      // Check program details
      const result = await PdcsService.getProgramDetails(programId.trim());

      // Check if already used
      const usageCheck = await PdcsService.checkProgramAlreadyUsed(user.id, programId.trim());
      const alreadyUsed = usageCheck.data === true;

      if (result.data) {
        setProgramDetails({
          is_valid: result.data.is_valid && !alreadyUsed, // Invalid if already used
          program_name: result.data.program_name,
          max_pdc_credits: result.data.max_pdc_credits,
          provider_name: result.data.provider_name,
          already_used: alreadyUsed,
        });

        // Show appropriate message
        if (alreadyUsed) {
          toast.error(`${texts.programAlreadyUsed}: ${result.data.program_name}`);
        } else if (result.data.is_valid && result.data.max_pdc_credits) {
          // Auto-fill credits if valid program
          setSubmitForm((prev) => ({
            ...prev,
            credits_claimed: result.data!.max_pdc_credits!,
          }));
          toast.success(`${texts.programValid}: ${result.data.program_name}`);
        } else {
          toast.warning(texts.programInvalid);
        }
      }
    } catch (error) {
      console.error('Error validating program:', error);
      setProgramDetails(null);
    } finally {
      setIsValidatingProgram(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    // US3: Validate program_id is provided
    if (!submitForm.program_id || submitForm.program_id.trim().length < 3) {
      toast.error(texts.programIdError);
      return;
    }

    const dto: CreatePdcEntryDTO = {
      certification_type: autoDetectedCertType, // US2: Auto-detected from user's certification
      activity_type: submitForm.activity_type,
      activity_title: submitForm.activity_title,
      activity_title_ar: submitForm.activity_title_ar || undefined,
      activity_description: submitForm.activity_description || undefined,
      credits_claimed: submitForm.credits_claimed,
      activity_date: submitForm.activity_date,
      program_id: submitForm.program_id, // US3: Now mandatory
      certificate_file: submitForm.certificate_file || undefined,
      notes: submitForm.notes || undefined,
    };

    // Use auto-approve flow
    const result = await PdcsService.createPdcEntryWithAutoApprove(user.id, dto);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    if (result.data?.auto_approved) {
      toast.success(`${texts.autoApproved} (${result.data.credits_approved} credits)`);
    } else {
      toast.info(texts.pendingReview);
    }

    setIsSubmitOpen(false);
    resetForm();

    // Trigger refetch of entries
    window.location.reload();
  };

  const resetForm = () => {
    setSubmitForm({
      activity_type: 'training_course',
      activity_title: '',
      activity_title_ar: '',
      activity_description: '',
      credits_claimed: 1,
      activity_date: new Date().toISOString().split('T')[0],
      program_id: '',
      certificate_file: null,
      notes: '',
    });
    setProgramDetails(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {texts.approved}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="default" className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            {texts.rejected}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            {texts.pending}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // US1: Eligibility guard - must have active certification
  if (!hasActiveCertification) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Award className="h-8 w-8" />
            {texts.title}
          </h1>
          <p className="mt-2 opacity-90">{texts.subtitle}</p>
        </div>

        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <XCircle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-900">{texts.certificationRequired}</AlertTitle>
          <AlertDescription className="text-red-800">
            {texts.certificationRequiredDesc}
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="p-12 text-center">
            <Award className="h-20 w-20 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{texts.certificationRequired}</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {texts.certificationRequiredCard}
            </p>
            <Button
              size="lg"
              onClick={() => window.open('https://bda-global.org/certification', '_blank')}
            >
              {texts.learnAboutCertification}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">{texts.title}</h1>
              <p className="mt-2 opacity-90">
                {texts.subtitle}
              </p>
            </div>
          </div>
          <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
            <DialogTrigger asChild>
              <Button size="lg" variant="secondary" onClick={resetForm} disabled={!hasActiveCertification}>
                <Plus className="h-5 w-5 mr-2" />
                {texts.submitPdc}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{texts.submitPdcEntry}</DialogTitle>
                <DialogDescription>
                  {texts.submitPdcDesc}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* US2: Show auto-detected certification type (read-only) */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>{texts.certificationTypeLabel}:</strong> BDA-{autoDetectedCertType}™
                    <span className="ml-2 text-xs">{texts.autoDetected}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{texts.activityType} *</Label>
                    <Select
                      value={submitForm.activity_type}
                      onValueChange={(value) =>
                        setSubmitForm({ ...submitForm, activity_type: value as PdcActivityType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{texts.activityTitleEn} *</Label>
                    <Input
                      value={submitForm.activity_title}
                      onChange={(e) =>
                        setSubmitForm({ ...submitForm, activity_title: e.target.value })
                      }
                      placeholder={texts.activityTitlePlaceholder}
                    />
                  </div>
                  <div>
                    <Label>{texts.activityTitleAr}</Label>
                    <Input
                      value={submitForm.activity_title_ar}
                      onChange={(e) =>
                        setSubmitForm({ ...submitForm, activity_title_ar: e.target.value })
                      }
                      placeholder={texts.activityTitleArPlaceholder}
                    />
                  </div>
                </div>

                <div>
                  <Label>{texts.description}</Label>
                  <Textarea
                    value={submitForm.activity_description}
                    onChange={(e) =>
                      setSubmitForm({ ...submitForm, activity_description: e.target.value })
                    }
                    placeholder={texts.descriptionPlaceholder}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>
                      {programDetails?.is_valid ? texts.creditsFromProgram : texts.creditsClaimed} *
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={programDetails?.max_pdc_credits || 100}
                      value={submitForm.credits_claimed}
                      onChange={(e) =>
                        setSubmitForm({ ...submitForm, credits_claimed: parseInt(e.target.value) || 1 })
                      }
                      readOnly={programDetails?.is_valid}
                      className={programDetails?.is_valid ? 'bg-green-50 border-green-300' : ''}
                    />
                    {programDetails?.is_valid && (
                      <p className="text-xs text-green-600 mt-1">
                        {texts.programAutoFill}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>{texts.activityDate} *</Label>
                    <Input
                      type="date"
                      value={submitForm.activity_date}
                      onChange={(e) =>
                        setSubmitForm({ ...submitForm, activity_date: e.target.value })
                      }
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <Label>{texts.programId} *</Label>
                    <div className="relative">
                      <Input
                        value={submitForm.program_id}
                        onChange={(e) => {
                          setSubmitForm({ ...submitForm, program_id: e.target.value });
                          setProgramDetails(null);
                        }}
                        onBlur={(e) => handleProgramIdValidation(e.target.value)}
                        placeholder={texts.programIdPlaceholder}
                        required
                        minLength={3}
                        className={
                          programDetails?.is_valid && !programDetails.already_used
                            ? 'border-green-500 pr-10'
                            : programDetails === null
                            ? ''
                            : 'border-red-500 pr-10'
                        }
                      />
                      {isValidatingProgram && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                      )}
                      {programDetails?.is_valid && !programDetails.already_used && !isValidatingProgram && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                      )}
                      {programDetails?.already_used && !isValidatingProgram && (
                        <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                      )}
                    </div>
                    {programDetails?.is_valid && !programDetails.already_used && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                        <p className="font-medium text-green-800">{programDetails.program_name}</p>
                        <p className="text-green-700 text-xs">
                          Provider: {programDetails.provider_name} | Max Credits: {programDetails.max_pdc_credits}
                        </p>
                      </div>
                    )}
                    {programDetails?.already_used && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                        <p className="font-medium text-red-800">{programDetails.program_name}</p>
                        <p className="text-red-700 text-xs">
                          {texts.programAlreadyUsed}
                        </p>
                      </div>
                    )}
                    {programDetails && !programDetails.is_valid && !programDetails.already_used && (
                      <p className="text-xs text-red-500 mt-1">{texts.programInvalid}</p>
                    )}
                    {!programDetails && (
                      <p className="text-xs text-gray-500 mt-1">{texts.programIdRequired}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>{texts.certificateProof} *</Label>
                  <Input
                    type="file"
                    onChange={(e) =>
                      setSubmitForm({ ...submitForm, certificate_file: e.target.files?.[0] || null })
                    }
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  {submitForm.certificate_file && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {texts.selectedFile}: {submitForm.certificate_file.name} (
                      {(submitForm.certificate_file.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {texts.uploadHint}
                  </p>
                </div>

                <div>
                  <Label>{texts.additionalNotes}</Label>
                  <Textarea
                    value={submitForm.notes}
                    onChange={(e) => setSubmitForm({ ...submitForm, notes: e.target.value })}
                    placeholder={texts.notesPlaceholder}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSubmitOpen(false)}>
                  {texts.cancel}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    createMutation.isPending ||
                    !submitForm.activity_title ||
                    !submitForm.certificate_file ||
                    programDetails?.already_used
                  }
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Upload className="h-4 w-4 mr-2" />
                  {texts.submitPdc}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* US4: PDC Progress Bar */}
      <Card className={needsRecertification ? 'border-2 border-green-500' : ''}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{texts.recertificationProgress}</h3>
                {needsRecertification && (
                  <Badge className="bg-green-600 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {texts.pdcsCompleted(totalApprovedPDCs, 60)} - BDA-{activeCertificationType}™
              </p>
            </div>
            <div className={`text-2xl font-bold ${needsRecertification ? 'text-green-600' : 'text-royal-600'}`}>
              {Math.round(progressPercentage)}%
            </div>
          </div>
          <Progress
            value={progressPercentage}
            className={`h-3 ${needsRecertification ? '[&>div]:bg-green-600' : ''}`}
          />
          <p className="text-xs text-gray-500 mt-2">
            {needsRecertification ? (
              <span className="text-green-700 font-medium flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {texts.renewalFeeRequired}
              </span>
            ) : (
              texts.pdcsRequirement
            )}
          </p>
        </CardContent>
      </Card>

      {/* Reserved/Carry-over Credits Display */}
      {reservedNextCycle > 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <Info className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-900 font-semibold">{texts.reservedForNextCycle}</AlertTitle>
          <AlertDescription className="text-amber-800">
            <div className="space-y-2">
              <p className="text-base font-medium">
                {texts.creditsReservedDesc(reservedNextCycle)}
              </p>
              <div className="p-3 bg-white rounded-md border border-amber-300">
                <p className="text-sm text-amber-900">
                  <Info className="h-4 w-4 inline mr-2" />
                  {texts.carryOverExplanation}
                </p>
              </div>
              <p className="text-sm text-amber-700">
                {texts.carryOverActive}
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* US5: Recertification Status with Purchase CTA */}
      {needsRecertification && primaryCertification && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-900 text-lg font-bold">{texts.readyForRecertification}</AlertTitle>
          <AlertDescription className="text-green-800">
            <div className="space-y-4">
              <p className="text-base">
                {texts.recertificationPaymentRequired}
              </p>
              <div className="p-3 bg-white rounded-md border border-green-300">
                <p className="text-sm text-green-900 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  {texts.yourCertificationExpires}{' '}
                  <strong className="font-semibold">
                    {new Date(primaryCertification.expiry_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </strong>
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-md border border-amber-300">
                <p className="text-sm text-amber-900 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  {texts.renewalFeeRequired}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => window.open(RECERTIFICATION_URLS[activeCertificationType], '_blank')}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {texts.purchaseRenewal} - BDA-{activeCertificationType}™
                </Button>
                <Button
                  variant="outline"
                  className="border-green-600 text-green-700 hover:bg-green-100"
                  onClick={() => window.location.href = '/my-certifications'}
                >
                  <Award className="h-4 w-4 mr-2" />
                  {texts.viewCertification}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cpSummary && (
          <Card className={activeCertificationType === 'CP' ? 'border-2 border-royal-600' : 'opacity-75'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-600" />
                  {texts.cpCredits}
                </CardTitle>
                {activeCertificationType === 'CP' ? (
                  <Badge className="bg-royal-600 text-white">
                    {texts.activeForPdc}
                  </Badge>
                ) : hasSCP && (
                  <Badge variant="outline" className="text-gray-500 border-gray-300">
                    {texts.inactiveForPdc}
                  </Badge>
                )}
              </div>
              <CardDescription>
                {texts.last3Years}
                {activeCertificationType !== 'CP' && hasSCP && (
                  <span className="block text-xs text-gray-500 mt-1">
                    {texts.pdcNotCountedTowardThis}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{texts.approvedCredits}</span>
                  <span className="text-2xl font-bold text-green-600">
                    {cpSummary.total_approved_credits}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{texts.pendingCredits}</span>
                  <span className="text-xl font-semibold text-yellow-600">
                    {cpSummary.pending_credits}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">{texts.totalEntries}</span>
                  <span className="font-medium">{cpSummary.total_entries}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {scpSummary && (
          <Card className={activeCertificationType === 'SCP' ? 'border-2 border-royal-600' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-royal-600" />
                  {texts.scpCredits}
                </CardTitle>
                {activeCertificationType === 'SCP' && (
                  <Badge className="bg-royal-600 text-white">
                    {texts.activeForPdc}
                  </Badge>
                )}
              </div>
              <CardDescription>{texts.last3Years}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{texts.approvedCredits}</span>
                  <span className="text-2xl font-bold text-green-600">
                    {scpSummary.total_approved_credits}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{texts.pendingCredits}</span>
                  <span className="text-xl font-semibold text-yellow-600">
                    {scpSummary.pending_credits}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">{texts.totalEntries}</span>
                  <span className="font-medium">{scpSummary.total_entries}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>{texts.myPdcEntries}</CardTitle>
          <CardDescription>{texts.myPdcEntriesDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{texts.activity}</TableHead>
                  <TableHead>{texts.type}</TableHead>
                  <TableHead>{texts.cert}</TableHead>
                  <TableHead>{texts.date}</TableHead>
                  <TableHead>{texts.credits}</TableHead>
                  <TableHead>{texts.status}</TableHead>
                  <TableHead>{texts.submitted}</TableHead>
                  <TableHead>{texts.proof}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries && entries.length > 0 ? (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="font-medium">{entry.activity_title}</div>
                        {entry.activity_title_ar && (
                          <div className="text-sm text-muted-foreground">{entry.activity_title_ar}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ACTIVITY_TYPE_LABELS[entry.activity_type]}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">BDA-{entry.certification_type}™</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(entry.activity_date)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{texts.claimed}: {entry.credits_claimed}</div>
                          {entry.credits_approved !== null && (
                            <div className="text-green-600 font-medium">
                              {texts.approvedLabel}: {entry.credits_approved}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell className="text-sm">{formatDate(entry.submission_date)}</TableCell>
                      <TableCell>
                        {entry.certificate_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                const { data } = await supabase.storage
                                  .from('resources')
                                  .createSignedUrl(entry.certificate_url!, 3600);

                                if (data?.signedUrl) {
                                  window.open(data.signedUrl, '_blank');
                                } else {
                                  toast.error(texts.generateUrlFailed);
                                }
                              } catch (error) {
                                console.error('Download error:', error);
                                toast.error(texts.downloadFailed);
                              }
                            }}
                            title={texts.proof}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      {texts.noEntries}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

PDCs.displayName = 'PDCs';
