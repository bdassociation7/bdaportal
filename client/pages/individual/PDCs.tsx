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
  HelpCircle,
  BookOpen,
  Users,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { useUserCertifications } from '@/entities/certifications';
import {
  usePdcEntries,
  useUserPdcSummary,
  ACTIVITY_TYPE_LABELS,
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

// Submission path type
type SubmissionPath = 'pdp_partner' | 'professional_development';

const translations = {
  en: {
    title: 'Recertification',
    subtitle: 'Manage your Professional Development Credits (PDCs) and recertification status',
    // Status badges
    approved: 'Approved',
    rejected: 'Rejected',
    pending: 'Pending',
    // No certification
    certificationRequired: 'Certification Required',
    certificationRequiredDesc: 'You must hold an active BDA-CP™ or BDA-SCP™ certification to access the Recertification module.',
    certificationRequiredCard: 'The Recertification module is available exclusively to certified BDA professionals. Earn your BDA-CP™ or BDA-SCP™ certification to access this feature.',
    learnAboutCertification: 'Learn About Certification',
    // Path selection
    choosePath: 'Choose Submission Path',
    choosePathDesc: 'Select how you earned your Professional Development Credits',
    pathPdpPartner: 'BDA Authorised Provider',
    pathPdpPartnerDesc: 'Activity completed through a BDA-authorised training provider. Requires a valid Program ID.',
    pathProfDev: 'Professional Development',
    pathProfDevDesc: 'Any continuing education activity: courses, conferences, workshops, publications, self-study, etc. Auto-approved upon submission.',
    // Submit button & dialog
    howToEnterPdcs: 'How to Enter PDCs',
    submitPdc: 'Submit PDC',
    submitPdcEntry: 'Submit PDC Entry',
    submitPdcDesc: 'Submit your professional development activity for credit',
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
    creditsClaimed: 'PDC Credits',
    activityDate: 'Activity Date',
    programId: 'PDP Program ID',
    programIdPlaceholder: 'e.g., BDA-PDP-2024-001',
    programIdRequired: 'Required: Official BDA Authorised Provider program ID (min 3 characters)',
    programIdError: 'Program ID is required and must be at least 3 characters',
    certificateProof: 'Certificate / Proof of Completion',
    selectedFile: 'Selected',
    uploadHint: 'Upload certificate, completion letter, or proof of participation (PDF, JPG, PNG)',
    additionalNotes: 'Additional Notes',
    notesPlaceholder: 'Any additional information about this activity',
    cancel: 'Cancel',
    back: 'Back',
    // Progress
    recertificationProgress: 'Recertification Progress',
    pdcsCompleted: (current: number, total: number) => `${current} / ${total} PDCs completed`,
    pdcsRequirement: 'You need 60 approved PDC credits to qualify for recertification',
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
    path: 'Path',
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
    // Path labels in table
    pathLabelPdp: 'Authorised Provider',
    pathLabelProfDev: 'Prof. Development',
  },
  ar: {
    title: 'إعادة الاعتماد',
    subtitle: 'إدارة نقاط التطوير المهني (PDCs) وحالة إعادة الاعتماد',
    approved: 'معتمد',
    rejected: 'مرفوض',
    pending: 'قيد الانتظار',
    certificationRequired: 'الشهادة مطلوبة',
    certificationRequiredDesc: 'يجب أن تكون حاملاً لشهادة BDA-CP™ أو BDA-SCP™ نشطة للوصول إلى وحدة إعادة الاعتماد.',
    certificationRequiredCard: 'وحدة إعادة الاعتماد متاحة حصرياً لمحترفي BDA المعتمدين. احصل على شهادة BDA-CP™ أو BDA-SCP™ للوصول إلى هذه الميزة.',
    learnAboutCertification: 'تعرف على الشهادة',
    choosePath: 'اختر مسار التقديم',
    choosePathDesc: 'حدد كيف حصلت على نقاط التطوير المهني',
    pathPdpPartner: 'مزود BDA المعتمد',
    pathPdpPartnerDesc: 'نشاط مكتمل من خلال مزود تدريب معتمد من BDA. يتطلب معرف برنامج صالح.',
    pathProfDev: 'التطوير المهني',
    pathProfDevDesc: 'أي نشاط تعليمي مستمر: دورات، مؤتمرات، ورش عمل، منشورات، دراسة ذاتية، إلخ. يتم الاعتماد تلقائياً عند التقديم.',
    howToEnterPdcs: 'كيفية إدخال PDCs',
    submitPdc: 'تقديم PDC',
    submitPdcEntry: 'تقديم إدخال PDC',
    submitPdcDesc: 'قدم نشاط التطوير المهني الخاص بك للحصول على النقاط',
    certificationTypeLabel: 'نوع الشهادة',
    autoDetected: '(تم اكتشافه تلقائياً من شهادتك النشطة)',
    activityType: 'نوع النشاط',
    activityTitleEn: 'عنوان النشاط (بالإنجليزية)',
    activityTitleAr: 'عنوان النشاط (بالعربية)',
    activityTitlePlaceholder: 'مثال: ورشة عمل تحليل البيانات',
    activityTitleArPlaceholder: 'عنوان النشاط',
    description: 'الوصف',
    descriptionPlaceholder: 'وصف موجز للنشاط وما تعلمته',
    creditsClaimed: 'نقاط PDC',
    activityDate: 'تاريخ النشاط',
    programId: 'معرف برنامج PDP',
    programIdPlaceholder: 'مثال: BDA-PDP-2024-001',
    programIdRequired: 'مطلوب: معرف برنامج مزود BDA المعتمد (3 أحرف على الأقل)',
    programIdError: 'معرف البرنامج مطلوب ويجب أن يكون 3 أحرف على الأقل',
    certificateProof: 'الشهادة / إثبات الإتمام',
    selectedFile: 'المحدد',
    uploadHint: 'قم بتحميل الشهادة أو خطاب الإتمام أو إثبات المشاركة (PDF، JPG، PNG)',
    additionalNotes: 'ملاحظات إضافية',
    notesPlaceholder: 'أي معلومات إضافية عن هذا النشاط',
    cancel: 'إلغاء',
    back: 'رجوع',
    recertificationProgress: 'تقدم إعادة الاعتماد',
    pdcsCompleted: (current: number, total: number) => `${current} / ${total} PDCs مكتملة`,
    pdcsRequirement: 'تحتاج إلى 60 نقطة PDC معتمدة للتأهل لإعادة الاعتماد',
    readyForRecertification: 'اكتمال متطلبات PDC!',
    recertificationPaymentRequired: 'تهانينا! لقد أكملت 60 نقطة PDC المطلوبة لإعادة الاعتماد. لإكمال عملية إعادة الاعتماد، يجب عليك شراء التجديد ودفع رسوم إعادة الاعتماد.',
    yourCertificationExpires: 'تنتهي صلاحية شهادتك في',
    purchaseRenewal: 'شراء إعادة الاعتماد',
    renewalFeeRequired: 'مطلوب دفع رسوم التجديد لإكمال إعادة الاعتماد',
    viewCertification: 'عرض شهادتي',
    cpCredits: 'نقاط BDA-CP™',
    scpCredits: 'نقاط BDA-SCP™',
    last3Years: 'آخر 3 سنوات',
    approvedCredits: 'النقاط المعتمدة',
    pendingCredits: 'النقاط المعلقة',
    totalEntries: 'إجمالي الإدخالات',
    activeForPdc: 'نشط لتتبع PDC',
    inactiveForPdc: 'غير نشط',
    pdcNotCountedTowardThis: 'يتم احتساب نقاط PDC نحو BDA-SCP™ فقط',
    myPdcEntries: 'إدخالات PDC الخاصة بي',
    myPdcEntriesDesc: 'تتبع أنشطة التطوير المهني المقدمة',
    activity: 'النشاط',
    type: 'النوع',
    path: 'المسار',
    cert: 'الشهادة',
    date: 'التاريخ',
    credits: 'النقاط',
    status: 'الحالة',
    submitted: 'تم التقديم',
    proof: 'الإثبات',
    claimed: 'المطلوبة',
    approvedLabel: 'المعتمدة',
    noEntries: 'لا توجد إدخالات PDC بعد. قدم أول نشاط لك أعلاه!',
    downloadFailed: 'فشل في تحميل الشهادة',
    generateUrlFailed: 'فشل في إنشاء رابط التحميل',
    validatingProgram: 'جاري التحقق من معرف البرنامج...',
    programValid: 'تم العثور على برنامج صالح',
    programInvalid: 'معرف البرنامج غير صالح',
    programAutoFill: 'تم ملء النقاط تلقائياً من البرنامج',
    autoApproved: 'تمت الموافقة التلقائية على إدخال PDC!',
    pendingReview: 'تم تقديم إدخال PDC للمراجعة',
    creditsFromProgram: 'النقاط (من البرنامج)',
    programAlreadyUsed: 'لقد استخدمت بالفعل معرف البرنامج هذا',
    duplicateProgram: 'تم تقديم هذا البرنامج بالفعل. يمكن استخدام كل برنامج مرة واحدة فقط.',
    reservedForNextCycle: 'محجوز للدورة القادمة',
    creditsReservedDesc: (credits: number) => `${credits} PDCs محجوزة لدورة إعادة الاعتماد القادمة`,
    carryOverExplanation: 'لقد تجاوزت حد 60 نقطة لهذه الدورة. سيتم تطبيق النقاط الزائدة تلقائياً عند تجديد شهادتك.',
    carryOverActive: 'ستصبح هذه النقاط نشطة بعد تجديد الشهادة',
    pathLabelPdp: 'مزود معتمد',
    pathLabelProfDev: 'تطوير مهني',
  }
};

const RECERTIFICATION_URLS: Record<CertificationType, string> = {
  'CP': 'https://bda-global.org/en/product/bda-cp-recertification/',
  'SCP': 'https://bda-global.org/en/product/bda-scp-recertification/',
};

const emptyForm = {
  activity_type: 'training_course' as PdcActivityType,
  activity_title: '',
  activity_title_ar: '',
  activity_description: '',
  credits_claimed: 1,
  activity_date: new Date().toISOString().split('T')[0],
  program_id: '',
  certificate_file: null as File | null,
  notes: '',
};

export default function PDCs() {
  const { user } = useAuthContext();
  const { language } = useLanguage();
  const texts = translations[language];

  // Dialog state
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<SubmissionPath | null>(null);

  // Program validation state (PDP Partner path)
  const [isValidatingProgram, setIsValidatingProgram] = useState(false);
  const [programDetails, setProgramDetails] = useState<{
    is_valid: boolean;
    program_name: string | null;
    max_pdc_credits: number | null;
    provider_name: string | null;
    already_used?: boolean;
  } | null>(null);

  // Certifications
  const { data: certificationsResult } = useUserCertifications(user?.id || '', { status: 'active' });
  const activeCertifications = certificationsResult?.data || [];
  const hasActiveCertification = activeCertifications.length > 0;

  const hasSCP = activeCertifications.some(cert => cert.certification_type === 'SCP');
  const activeCertificationType: CertificationType = hasSCP ? 'SCP' : 'CP';
  const primaryCertification = activeCertifications.find(
    cert => cert.certification_type === activeCertificationType
  ) || activeCertifications[0];

  // Data
  const { data: entries, isLoading } = usePdcEntries(user?.id ? { user_id: user.id } : {});
  const { data: cpSummary } = useUserPdcSummary(user?.id || '', 'CP');
  const { data: scpSummary } = useUserPdcSummary(user?.id || '', 'SCP');

  const [cycleTotals, setCycleTotals] = useState<{
    current_cycle_credits: number;
    reserved_next_cycle_credits: number;
    total_entries: number;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (primaryCertification?.id) {
      PdcsService.getCycleTotals(primaryCertification.id).then((result) => {
        if (result.data) setCycleTotals(result.data);
      });
    }
  }, [primaryCertification?.id, entries]);

  const totalApprovedPDCs = cycleTotals?.current_cycle_credits || 0;
  const reservedNextCycle = cycleTotals?.reserved_next_cycle_credits || 0;
  const progressPercentage = Math.min((totalApprovedPDCs / 60) * 100, 100);
  const needsRecertification = totalApprovedPDCs >= 60;

  // Form state
  const [submitForm, setSubmitForm] = useState(emptyForm);

  // Celebration toast
  useEffect(() => {
    if (needsRecertification && primaryCertification && user?.id) {
      const storageKey = `pdc_completion_toast_${user.id}_${primaryCertification.id}`;
      if (!localStorage.getItem(storageKey)) {
        toast.success(texts.readyForRecertification, {
          description: texts.recertificationPaymentRequired,
          duration: 8000,
          icon: '🎉',
        });
        localStorage.setItem(storageKey, 'true');
      }
    }
  }, [needsRecertification, primaryCertification, user?.id, language]);

  const handleProgramIdValidation = async (programId: string) => {
    if (!programId || programId.trim().length < 3 || !user?.id) {
      setProgramDetails(null);
      return;
    }
    setIsValidatingProgram(true);
    try {
      const result = await PdcsService.getProgramDetails(programId.trim());
      const usageCheck = await PdcsService.checkProgramAlreadyUsed(user.id, programId.trim());
      const alreadyUsed = usageCheck.data === true;
      if (result.data) {
        setProgramDetails({
          is_valid: result.data.is_valid && !alreadyUsed,
          program_name: result.data.program_name,
          max_pdc_credits: result.data.max_pdc_credits,
          provider_name: result.data.provider_name,
          already_used: alreadyUsed,
        });
        if (alreadyUsed) {
          toast.error(`${texts.programAlreadyUsed}: ${result.data.program_name}`);
        } else if (result.data.is_valid && result.data.max_pdc_credits) {
          setSubmitForm(prev => ({ ...prev, credits_claimed: result.data!.max_pdc_credits! }));
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
    if (!user?.id || !selectedPath) return;

    // Validate for PDP Partner path
    if (selectedPath === 'pdp_partner') {
      if (!submitForm.program_id || submitForm.program_id.trim().length < 3) {
        toast.error(texts.programIdError);
        return;
      }
    }

    if (!submitForm.activity_title) {
      toast.error('Activity title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const dto: CreatePdcEntryDTO = {
        certification_type: activeCertificationType,
        activity_type: submitForm.activity_type,
        activity_title: submitForm.activity_title,
        activity_title_ar: submitForm.activity_title_ar || undefined,
        activity_description: submitForm.activity_description || undefined,
        credits_claimed: submitForm.credits_claimed,
        activity_date: submitForm.activity_date,
        program_id: selectedPath === 'pdp_partner' ? submitForm.program_id : undefined,
        certificate_file: submitForm.certificate_file || undefined,
        notes: submitForm.notes || undefined,
        submission_path: selectedPath,
      };

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
      setSelectedPath(null);
      setSubmitForm(emptyForm);
      setProgramDetails(null);
      window.location.reload();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setIsSubmitOpen(false);
    setSelectedPath(null);
    setSubmitForm(emptyForm);
    setProgramDetails(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="default" className="bg-[#e8f4fd] text-[#0f91e0] border-[#bfdfef]">
            <CheckCircle className="h-3 w-3 mr-1" />
            {texts.approved}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="default" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            {texts.rejected}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="default" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            {texts.pending}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPathBadge = (path: string | null | undefined) => {
    if (path === 'professional_development') {
      return (
        <Badge variant="outline" className="text-[#1C4A8B] border-[#1C4A8B]/30 bg-[#f0f6ff] text-xs">
          <BookOpen className="h-3 w-3 mr-1" />
          {texts.pathLabelProfDev}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[#0f91e0] border-[#0f91e0]/30 bg-[#e8f4fd] text-xs">
        <Users className="h-3 w-3 mr-1" />
        {texts.pathLabelPdp}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Eligibility guard
  if (!hasActiveCertification) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-4 pb-2">
          <div className="w-12 h-12 rounded-xl bg-[#e8f4fd] flex items-center justify-center">
            <RefreshCw className="h-6 w-6 text-[#0f91e0]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0d1f4e]">{texts.title}</h1>
            <p className="text-sm text-slate-500">{texts.subtitle}</p>
          </div>
        </div>

        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <XCircle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-900">{texts.certificationRequired}</AlertTitle>
          <AlertDescription className="text-red-800">{texts.certificationRequiredDesc}</AlertDescription>
        </Alert>

        <Card>
          <CardContent className="p-12 text-center">
            <Award className="h-20 w-20 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{texts.certificationRequired}</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">{texts.certificationRequiredCard}</p>
            <Button
              size="lg"
              className="bg-[#0f91e0] hover:bg-[#0d7bc4]"
              onClick={() => window.open('https://bda-global.org/en/certifications/', '_blank')}
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#e8f4fd] flex items-center justify-center">
            <RefreshCw className="h-6 w-6 text-[#0f91e0]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0d1f4e]">{texts.title}</h1>
            <p className="text-sm text-slate-500">{texts.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-[#dbeafe] text-[#1C4A8B] hover:bg-[#f0f6ff]"
            onClick={() => window.open('https://bda-global.org/en/certifications/recertification/how-to-enter-pdcs/', '_blank')}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            {texts.howToEnterPdcs}
          </Button>
          <Button
            className="bg-[#0f91e0] hover:bg-[#0d7bc4] text-white"
            onClick={() => { setIsSubmitOpen(true); setSelectedPath(null); setSubmitForm(emptyForm); setProgramDetails(null); }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {texts.submitPdc}
          </Button>
        </div>
      </div>

      {/* Progress Card */}
      <Card className={needsRecertification ? 'border-2 border-[#0f91e0]' : 'border border-[#dbeafe]'}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-[#0d1f4e]">{texts.recertificationProgress}</h3>
                {needsRecertification && (
                  <Badge className="bg-[#0f91e0] text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-500">
                {texts.pdcsCompleted(totalApprovedPDCs, 60)} — BDA-{activeCertificationType}™
              </p>
            </div>
            <div className={`text-3xl font-bold ${needsRecertification ? 'text-[#0f91e0]' : 'text-[#0d1f4e]'}`}>
              {Math.round(progressPercentage)}%
            </div>
          </div>
          <Progress
            value={progressPercentage}
            className="h-3 bg-[#f0f6ff] [&>div]:bg-[#0f91e0]"
          />
          <p className="text-xs text-slate-500 mt-2">
            {needsRecertification ? (
              <span className="text-[#0f91e0] font-medium flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {texts.renewalFeeRequired}
              </span>
            ) : (
              texts.pdcsRequirement
            )}
          </p>
        </CardContent>
      </Card>

      {/* Carry-over Credits */}
      {reservedNextCycle > 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <Info className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-900 font-semibold">{texts.reservedForNextCycle}</AlertTitle>
          <AlertDescription className="text-amber-800">
            <div className="space-y-2">
              <p className="text-base font-medium">{texts.creditsReservedDesc(reservedNextCycle)}</p>
              <div className="p-3 bg-white rounded-md border border-amber-300">
                <p className="text-sm text-amber-900">
                  <Info className="h-4 w-4 inline mr-2" />
                  {texts.carryOverExplanation}
                </p>
              </div>
              <p className="text-sm text-amber-700">{texts.carryOverActive}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Recertification CTA */}
      {needsRecertification && primaryCertification && (
        <Alert className="bg-[#f0f6ff] border-[#0f91e0]">
          <CheckCircle className="h-5 w-5 text-[#0f91e0]" />
          <AlertTitle className="text-[#0d1f4e] text-lg font-bold">{texts.readyForRecertification}</AlertTitle>
          <AlertDescription className="text-slate-700">
            <div className="space-y-4">
              <p className="text-base">{texts.recertificationPaymentRequired}</p>
              <div className="p-3 bg-white rounded-md border border-[#dbeafe]">
                <p className="text-sm text-[#0d1f4e] flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#0f91e0]" />
                  {texts.yourCertificationExpires}{' '}
                  <strong>
                    {new Date(primaryCertification.expiry_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
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
                  className="bg-[#0f91e0] hover:bg-[#0d7bc4] text-white"
                  onClick={() => window.open(RECERTIFICATION_URLS[activeCertificationType], '_blank')}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {texts.purchaseRenewal} — BDA-{activeCertificationType}™
                </Button>
                <Button
                  variant="outline"
                  className="border-[#0f91e0] text-[#0f91e0] hover:bg-[#e8f4fd]"
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
          <Card className={`border ${activeCertificationType === 'CP' ? 'border-2 border-[#0f91e0]' : 'border-slate-200 opacity-75'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-[#0d1f4e]">
                  <Award className="h-5 w-5 text-[#0f91e0]" />
                  {texts.cpCredits}
                </CardTitle>
                {activeCertificationType === 'CP' ? (
                  <Badge className="bg-[#0f91e0] text-white">{texts.activeForPdc}</Badge>
                ) : hasSCP && (
                  <Badge variant="outline" className="text-slate-400 border-slate-300">{texts.inactiveForPdc}</Badge>
                )}
              </div>
              <CardDescription>
                {texts.last3Years}
                {activeCertificationType !== 'CP' && hasSCP && (
                  <span className="block text-xs text-slate-400 mt-1">{texts.pdcNotCountedTowardThis}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">{texts.approvedCredits}</span>
                  <span className="text-2xl font-bold text-[#0f91e0]">{cpSummary.total_approved_credits}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">{texts.pendingCredits}</span>
                  <span className="text-xl font-semibold text-amber-600">{cpSummary.pending_credits}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-sm text-slate-500">{texts.totalEntries}</span>
                  <span className="font-medium text-[#0d1f4e]">{cpSummary.total_entries}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {scpSummary && (
          <Card className={`border ${activeCertificationType === 'SCP' ? 'border-2 border-[#0f91e0]' : 'border-slate-200'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-[#0d1f4e]">
                  <Award className="h-5 w-5 text-[#0f91e0]" />
                  {texts.scpCredits}
                </CardTitle>
                {activeCertificationType === 'SCP' && (
                  <Badge className="bg-[#0f91e0] text-white">{texts.activeForPdc}</Badge>
                )}
              </div>
              <CardDescription>{texts.last3Years}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">{texts.approvedCredits}</span>
                  <span className="text-2xl font-bold text-[#0f91e0]">{scpSummary.total_approved_credits}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">{texts.pendingCredits}</span>
                  <span className="text-xl font-semibold text-amber-600">{scpSummary.pending_credits}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-sm text-slate-500">{texts.totalEntries}</span>
                  <span className="font-medium text-[#0d1f4e]">{scpSummary.total_entries}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Entries Table */}
      <Card className="border border-[#dbeafe]">
        <CardHeader>
          <CardTitle className="text-[#0d1f4e]">{texts.myPdcEntries}</CardTitle>
          <CardDescription>{texts.myPdcEntriesDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#0f91e0]" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f5f9ff]">
                  <TableHead className="text-[#0d1f4e]">{texts.activity}</TableHead>
                  <TableHead className="text-[#0d1f4e]">{texts.type}</TableHead>
                  <TableHead className="text-[#0d1f4e]">{texts.path}</TableHead>
                  <TableHead className="text-[#0d1f4e]">{texts.cert}</TableHead>
                  <TableHead className="text-[#0d1f4e]">{texts.date}</TableHead>
                  <TableHead className="text-[#0d1f4e]">{texts.credits}</TableHead>
                  <TableHead className="text-[#0d1f4e]">{texts.status}</TableHead>
                  <TableHead className="text-[#0d1f4e]">{texts.proof}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries && entries.length > 0 ? (
                  entries.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-[#f5f9ff]">
                      <TableCell>
                        <div className="font-medium text-[#0d1f4e]">{entry.activity_title}</div>
                        {entry.activity_title_ar && (
                          <div className="text-sm text-slate-400">{entry.activity_title_ar}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {ACTIVITY_TYPE_LABELS[entry.activity_type]}
                      </TableCell>
                      <TableCell>
                        {getPathBadge((entry as any).submission_path)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-[#0f91e0]/30 text-[#0f91e0]">
                          BDA-{entry.certification_type}™
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{formatDate(entry.activity_date)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="text-slate-600">{texts.claimed}: {entry.credits_claimed}</div>
                          {entry.credits_approved !== null && (
                            <div className="text-[#0f91e0] font-medium">
                              {texts.approvedLabel}: {entry.credits_approved}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>
                        {entry.certificate_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#0f91e0] hover:bg-[#e8f4fd]"
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
                    <TableCell colSpan={8} className="text-center text-slate-400 py-12">
                      {texts.noEntries}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Submit PDC Dialog */}
      <Dialog open={isSubmitOpen} onOpenChange={(open) => { if (!open) resetAndClose(); else setIsSubmitOpen(true); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0d1f4e]">{texts.submitPdcEntry}</DialogTitle>
            <DialogDescription>{texts.submitPdcDesc}</DialogDescription>
          </DialogHeader>

          {/* Step 1: Choose Path */}
          {!selectedPath ? (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-[#f0f6ff] border border-[#dbeafe] rounded-lg">
                <p className="text-sm text-[#1C4A8B]">
                  <strong>{texts.certificationTypeLabel}:</strong> BDA-{activeCertificationType}™
                  <span className="ml-2 text-xs text-slate-500">{texts.autoDetected}</span>
                </p>
              </div>

              <p className="text-sm font-medium text-[#0d1f4e]">{texts.choosePath}</p>
              <p className="text-xs text-slate-500">{texts.choosePathDesc}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {/* PDP Partner Path */}
                <button
                  onClick={() => setSelectedPath('pdp_partner')}
                  className="text-left p-5 rounded-xl border-2 border-[#dbeafe] hover:border-[#0f91e0] hover:bg-[#f0f6ff] transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#e8f4fd] flex items-center justify-center flex-shrink-0 group-hover:bg-[#0f91e0] transition-colors">
                      <Users className="h-5 w-5 text-[#0f91e0] group-hover:text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-[#0d1f4e]">{texts.pathPdpPartner}</h3>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#0f91e0]" />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{texts.pathPdpPartnerDesc}</p>
                    </div>
                  </div>
                </button>

                {/* Professional Development Path */}
                <button
                  onClick={() => setSelectedPath('professional_development')}
                  className="text-left p-5 rounded-xl border-2 border-[#dbeafe] hover:border-[#1C4A8B] hover:bg-[#f0f6ff] transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#f0f6ff] flex items-center justify-center flex-shrink-0 group-hover:bg-[#1C4A8B] transition-colors">
                      <BookOpen className="h-5 w-5 text-[#1C4A8B] group-hover:text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-[#0d1f4e]">{texts.pathProfDev}</h3>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#1C4A8B]" />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{texts.pathProfDevDesc}</p>
                      <Badge className="mt-2 bg-[#e8f4fd] text-[#0f91e0] text-xs border-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Auto-approved
                      </Badge>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: Fill Form */
            <div className="space-y-4">
              {/* Path indicator */}
              <div className="flex items-center gap-2 p-3 bg-[#f0f6ff] border border-[#dbeafe] rounded-lg">
                {selectedPath === 'pdp_partner' ? (
                  <Users className="h-4 w-4 text-[#0f91e0]" />
                ) : (
                  <BookOpen className="h-4 w-4 text-[#1C4A8B]" />
                )}
                <span className="text-sm font-medium text-[#0d1f4e]">
                  {selectedPath === 'pdp_partner' ? texts.pathPdpPartner : texts.pathProfDev}
                </span>
                {selectedPath === 'professional_development' && (
                  <Badge className="ml-auto bg-[#e8f4fd] text-[#0f91e0] text-xs border-0">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Auto-approved
                  </Badge>
                )}
              </div>

              {/* Cert type */}
              <div className="p-3 bg-[#f0f6ff] border border-[#dbeafe] rounded-lg">
                <p className="text-sm text-[#1C4A8B]">
                  <strong>{texts.certificationTypeLabel}:</strong> BDA-{activeCertificationType}™
                  <span className="ml-2 text-xs text-slate-500">{texts.autoDetected}</span>
                </p>
              </div>

              {/* Activity Type */}
              <div>
                <Label className="text-[#0d1f4e]">{texts.activityType} *</Label>
                <Select
                  value={submitForm.activity_type}
                  onValueChange={(value) => setSubmitForm({ ...submitForm, activity_type: value as PdcActivityType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Titles */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#0d1f4e]">{texts.activityTitleEn} *</Label>
                  <Input
                    value={submitForm.activity_title}
                    onChange={(e) => setSubmitForm({ ...submitForm, activity_title: e.target.value })}
                    placeholder={texts.activityTitlePlaceholder}
                  />
                </div>
                <div>
                  <Label className="text-[#0d1f4e]">{texts.activityTitleAr}</Label>
                  <Input
                    value={submitForm.activity_title_ar}
                    onChange={(e) => setSubmitForm({ ...submitForm, activity_title_ar: e.target.value })}
                    placeholder={texts.activityTitleArPlaceholder}
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-[#0d1f4e]">{texts.description}</Label>
                <Textarea
                  value={submitForm.activity_description}
                  onChange={(e) => setSubmitForm({ ...submitForm, activity_description: e.target.value })}
                  placeholder={texts.descriptionPlaceholder}
                  rows={3}
                />
              </div>

              {/* Credits, Date, Program ID */}
              <div className={`grid gap-4 ${selectedPath === 'pdp_partner' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div>
                  <Label className="text-[#0d1f4e]">
                    {programDetails?.is_valid ? texts.creditsFromProgram : texts.creditsClaimed} *
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={programDetails?.max_pdc_credits || 100}
                    value={submitForm.credits_claimed}
                    onChange={(e) => setSubmitForm({ ...submitForm, credits_claimed: parseInt(e.target.value) || 1 })}
                    readOnly={programDetails?.is_valid}
                    className={programDetails?.is_valid ? 'bg-[#f0f6ff] border-[#0f91e0]' : ''}
                  />
                  {programDetails?.is_valid && (
                    <p className="text-xs text-[#0f91e0] mt-1">{texts.programAutoFill}</p>
                  )}
                </div>

                <div>
                  <Label className="text-[#0d1f4e]">{texts.activityDate} *</Label>
                  <Input
                    type="date"
                    value={submitForm.activity_date}
                    onChange={(e) => setSubmitForm({ ...submitForm, activity_date: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Program ID - only for PDP Partner path */}
                {selectedPath === 'pdp_partner' && (
                  <div>
                    <Label className="text-[#0d1f4e]">{texts.programId} *</Label>
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
                            ? 'border-[#0f91e0] pr-10'
                            : programDetails === null
                            ? ''
                            : 'border-red-500 pr-10'
                        }
                      />
                      {isValidatingProgram && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                      )}
                      {programDetails?.is_valid && !programDetails.already_used && !isValidatingProgram && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0f91e0]" />
                      )}
                      {programDetails?.already_used && !isValidatingProgram && (
                        <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                      )}
                    </div>
                    {programDetails?.is_valid && !programDetails.already_used && (
                      <div className="mt-2 p-2 bg-[#f0f6ff] border border-[#dbeafe] rounded text-sm">
                        <p className="font-medium text-[#0d1f4e]">{programDetails.program_name}</p>
                        <p className="text-[#0f91e0] text-xs">
                          Provider: {programDetails.provider_name} | Max Credits: {programDetails.max_pdc_credits}
                        </p>
                      </div>
                    )}
                    {programDetails?.already_used && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                        <p className="font-medium text-red-800">{programDetails.program_name}</p>
                        <p className="text-red-700 text-xs">{texts.programAlreadyUsed}</p>
                      </div>
                    )}
                    {programDetails && !programDetails.is_valid && !programDetails.already_used && (
                      <p className="text-xs text-red-500 mt-1">{texts.programInvalid}</p>
                    )}
                    {!programDetails && (
                      <p className="text-xs text-slate-400 mt-1">{texts.programIdRequired}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Certificate Upload */}
              <div>
                <Label className="text-[#0d1f4e]">
                  {texts.certificateProof}
                  {selectedPath === 'professional_development' ? '' : ' *'}
                </Label>
                <Input
                  type="file"
                  onChange={(e) => setSubmitForm({ ...submitForm, certificate_file: e.target.files?.[0] || null })}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                {submitForm.certificate_file && (
                  <p className="text-sm text-slate-500 mt-1">
                    {texts.selectedFile}: {submitForm.certificate_file.name} ({(submitForm.certificate_file.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">{texts.uploadHint}</p>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-[#0d1f4e]">{texts.additionalNotes}</Label>
                <Textarea
                  value={submitForm.notes}
                  onChange={(e) => setSubmitForm({ ...submitForm, notes: e.target.value })}
                  placeholder={texts.notesPlaceholder}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedPath ? (
              <>
                <Button variant="outline" onClick={() => { setSelectedPath(null); setProgramDetails(null); }}>
                  {texts.back}
                </Button>
                <Button
                  className="bg-[#0f91e0] hover:bg-[#0d7bc4] text-white"
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    !submitForm.activity_title ||
                    (selectedPath === 'pdp_partner' && programDetails?.already_used)
                  }
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Upload className="h-4 w-4 mr-2" />
                  {texts.submitPdc}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={resetAndClose}>
                {texts.cancel}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

PDCs.displayName = 'PDCs';
