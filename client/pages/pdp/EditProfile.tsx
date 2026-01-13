/**
 * PDP Partner Profile Edit Page
 * Full database integration with pdp_partner_profiles table
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  usePDPPartnerProfile,
  useUpdatePDPPartnerProfile,
  useUploadPartnerLogo,
  useRemovePartnerLogo,
  usePDPLicense,
  usePDPToolkit,
} from "@/entities/pdp";
import type {
  UpdatePDPPartnerProfileDTO,
  Specialization,
  DeliveryMethod,
  TargetAudience,
} from "@/entities/pdp";
import {
  Building2,
  MapPin,
  Globe,
  Phone,
  Mail,
  User,
  Save,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Download,
  Award,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const translations = {
  en: {
    // Page header
    pageTitle: "Edit Partner Profile",
    pageSubtitle: "Update your organization information and preferences",
    cancel: "Cancel",
    saveChanges: "Save Changes",
    saving: "Saving...",

    // Error/Loading states
    errorLoadingTitle: "Error Loading Profile",
    errorLoadingDesc: "Unable to load your profile. Please try again later.",
    retry: "Retry",
    fileTooLarge: "File too large",
    fileTooLargeDesc: "Logo must be less than 2MB",

    // Status banner
    activePDPPartner: "Active PDP Partner",
    pdpPartner: (status: string) => `PDP Partner (${status})`,
    partnerCode: "Partner Code",
    licenseValidUntil: "License valid until",

    // Tabs
    tabOrganization: "Organization",
    tabContact: "Contact Info",
    tabSpecializations: "Specializations",
    tabBranding: "Branding",

    // Organization tab
    organizationDetails: "Organization Details",
    organizationDetailsDesc: "Basic information about your organization",
    organizationName: "Organization Name",
    legalName: "Legal Name",
    registrationNumber: "Registration Number",
    taxId: "Tax ID",
    yearEstablished: "Year Established",
    website: "Website",
    organizationDescription: "Organization Description",
    descriptionPlaceholder: "Brief description of your organization and training services...",

    // Address section
    address: "Address",
    addressDesc: "Physical location of your organization",
    streetAddress: "Street Address",
    city: "City",
    stateProvince: "State/Province",
    postalCode: "Postal Code",
    country: "Country",
    timezone: "Time Zone",
    selectCountry: "Select country",
    selectTimezone: "Select timezone",

    // Contact tab
    primaryContact: "Primary Contact",
    primaryContactDesc: "Main point of contact for BDA communications",
    fullName: "Full Name",
    titlePosition: "Title/Position",
    email: "Email",
    phone: "Phone",
    billingContact: "Billing Contact",
    billingContactDesc: "Contact for billing and financial matters",
    socialMedia: "Social Media",
    socialMediaDesc: "Connect your social media profiles (optional)",
    linkedin: "LinkedIn",
    twitterX: "Twitter/X",
    facebook: "Facebook",

    // Specializations tab
    trainingSpecializations: "Training Specializations",
    trainingSpecializationsDesc: "Select the areas your programs specialize in",
    deliveryMethods: "Delivery Methods",
    deliveryMethodsDesc: "How do you deliver your training programs?",
    targetAudiences: "Target Audiences",
    targetAudiencesDesc: "Who are your typical training participants?",

    // Branding tab
    organizationLogo: "Organization Logo",
    organizationLogoDesc: "Your company logo. Upload your organization's own logo to display on your partner profile.",
    uploadLogo: "Upload Logo",
    removeLogo: "Remove Logo",
    logoRecommendation: "Recommended: Square image, at least 200x200 pixels",
    noLogo: "No logo uploaded",
    bdaPartnerBadge: "BDA Partner Badge",
    bdaPartnerBadgeDesc: "Official BDA accreditation badge issued to authorized PDP partners. Download and use on your website and marketing materials.",
    downloadBadge: "Download Badge",
    downloadBadgePng: "Download PNG",
    downloadBadgeSvg: "Download SVG",
    bdaAccredited: "BDA Accredited",
    pdp: "PDP",
    partner: "Partner",
    badgeUsageInfo: "This official BDA Partner Badge is provided by BDA and certifies your accreditation status. Display it on your website, marketing materials, and training documentation.",
    viewUsageGuidelines: "View Usage Guidelines",
    brandGuidelines: "Brand Guidelines",
    brandGuidelinesInfo: "When using BDA logos and badges, please follow the official brand guidelines. Improper use may result in partnership review.",
    viewBrandGuidelines: "View Brand Guidelines →",
    badgeNotAvailable: "Badge not yet available",
    badgeNotAvailableDesc: "Your BDA Partner Badge will be available once your partnership is fully activated. Contact support if you believe this is an error.",

    // Specialization options
    specBusinessDevelopment: "Business Development",
    specLeadership: "Leadership & Management",
    specProjectManagement: "Project Management",
    specDataAnalytics: "Data Analytics",
    specHrManagement: "HR Management",
    specFinance: "Finance & Accounting",
    specMarketing: "Marketing & Sales",
    specOperations: "Operations Management",
    specTechnology: "Information Technology",
    specCompliance: "Compliance & Risk",
    specStrategy: "Strategy & Planning",
    specCommunication: "Communication Skills",
    specOther: "Other Specializations",

    // Delivery methods
    deliveryInPerson: "In-Person/Classroom",
    deliveryOnline: "Virtual/Online Live",
    deliveryHybrid: "Hybrid",
    deliveryBlended: "Blended Learning",

    // Target audiences
    audienceCorporate: "Corporate Teams",
    audienceIndividual: "Individual Professionals",
    audienceGovernment: "Government/Public Sector",
    audienceAcademic: "Academic/Students",
    audienceNonprofit: "Non-Profit Organizations",
  },
  ar: {
    // Page header
    pageTitle: "تعديل ملف الشريك",
    pageSubtitle: "تحديث معلومات مؤسستك وتفضيلاتها",
    cancel: "إلغاء",
    saveChanges: "حفظ التغييرات",
    saving: "جارِ الحفظ...",

    // Error/Loading states
    errorLoadingTitle: "خطأ في تحميل الملف الشخصي",
    errorLoadingDesc: "تعذر تحميل ملفك الشخصي. يرجى المحاولة مرة أخرى لاحقاً.",
    retry: "إعادة المحاولة",
    fileTooLarge: "الملف كبير جداً",
    fileTooLargeDesc: "يجب أن يكون الشعار أقل من 2 ميجابايت",

    // Status banner
    activePDPPartner: "شريك PDP نشط",
    pdpPartner: (status: string) => `شريك PDP (${status})`,
    partnerCode: "رمز الشريك",
    licenseValidUntil: "الترخيص صالح حتى",

    // Tabs
    tabOrganization: "المؤسسة",
    tabContact: "معلومات الاتصال",
    tabSpecializations: "التخصصات",
    tabBranding: "العلامة التجارية",

    // Organization tab
    organizationDetails: "تفاصيل المؤسسة",
    organizationDetailsDesc: "معلومات أساسية عن مؤسستك",
    organizationName: "اسم المؤسسة",
    legalName: "الاسم القانوني",
    registrationNumber: "رقم التسجيل",
    taxId: "الرقم الضريبي",
    yearEstablished: "سنة التأسيس",
    website: "الموقع الإلكتروني",
    organizationDescription: "وصف المؤسسة",
    descriptionPlaceholder: "وصف موجز لمؤسستك وخدمات التدريب...",

    // Address section
    address: "العنوان",
    addressDesc: "الموقع الفعلي لمؤسستك",
    streetAddress: "عنوان الشارع",
    city: "المدينة",
    stateProvince: "الولاية/المحافظة",
    postalCode: "الرمز البريدي",
    country: "البلد",
    timezone: "المنطقة الزمنية",
    selectCountry: "اختر البلد",
    selectTimezone: "اختر المنطقة الزمنية",

    // Contact tab
    primaryContact: "جهة الاتصال الرئيسية",
    primaryContactDesc: "نقطة الاتصال الرئيسية للتواصل مع BDA",
    fullName: "الاسم الكامل",
    titlePosition: "المسمى الوظيفي",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    billingContact: "جهة اتصال الفواتير",
    billingContactDesc: "جهة الاتصال للمسائل المالية والفواتير",
    socialMedia: "وسائل التواصل الاجتماعي",
    socialMediaDesc: "ربط حسابات التواصل الاجتماعي (اختياري)",
    linkedin: "لينكدإن",
    twitterX: "تويتر/X",
    facebook: "فيسبوك",

    // Specializations tab
    trainingSpecializations: "تخصصات التدريب",
    trainingSpecializationsDesc: "حدد المجالات التي تتخصص فيها برامجك",
    deliveryMethods: "طرق التقديم",
    deliveryMethodsDesc: "كيف تقدم برامجك التدريبية؟",
    targetAudiences: "الجمهور المستهدف",
    targetAudiencesDesc: "من هم المشاركون النموذجيون في تدريباتك؟",

    // Branding tab
    organizationLogo: "شعار المؤسسة",
    organizationLogoDesc: "شعار شركتك. قم بتحميل شعار مؤسستك لعرضه في ملفك الشخصي كشريك.",
    uploadLogo: "تحميل الشعار",
    removeLogo: "حذف الشعار",
    logoRecommendation: "يُنصح بصورة مربعة بحجم 200×200 بكسل على الأقل",
    noLogo: "لم يتم تحميل شعار",
    bdaPartnerBadge: "شارة شريك BDA",
    bdaPartnerBadgeDesc: "شارة اعتماد BDA الرسمية الممنوحة لشركاء PDP المعتمدين. قم بتنزيلها واستخدامها على موقعك الإلكتروني ومواد التسويق.",
    downloadBadge: "تنزيل الشارة",
    downloadBadgePng: "تنزيل PNG",
    downloadBadgeSvg: "تنزيل SVG",
    bdaAccredited: "معتمد من BDA",
    pdp: "PDP",
    partner: "شريك",
    badgeUsageInfo: "شارة شريك BDA الرسمية هذه مقدمة من BDA وتشهد على حالة اعتمادك. اعرضها على موقعك الإلكتروني ومواد التسويق ووثائق التدريب.",
    viewUsageGuidelines: "عرض إرشادات الاستخدام",
    brandGuidelines: "إرشادات العلامة التجارية",
    brandGuidelinesInfo: "عند استخدام شعارات وشارات BDA، يرجى اتباع إرشادات العلامة التجارية الرسمية. قد يؤدي الاستخدام غير السليم إلى مراجعة الشراكة.",
    viewBrandGuidelines: "عرض إرشادات العلامة التجارية ←",
    badgeNotAvailable: "الشارة غير متاحة بعد",
    badgeNotAvailableDesc: "ستتوفر شارة شريك BDA الخاصة بك بمجرد تفعيل شراكتك بالكامل. تواصل مع الدعم إذا كنت تعتقد أن هذا خطأ.",

    // Specialization options
    specBusinessDevelopment: "تطوير الأعمال",
    specLeadership: "القيادة والإدارة",
    specProjectManagement: "إدارة المشاريع",
    specDataAnalytics: "تحليل البيانات",
    specHrManagement: "إدارة الموارد البشرية",
    specFinance: "المالية والمحاسبة",
    specMarketing: "التسويق والمبيعات",
    specOperations: "إدارة العمليات",
    specTechnology: "تكنولوجيا المعلومات",
    specCompliance: "الامتثال والمخاطر",
    specStrategy: "الاستراتيجية والتخطيط",
    specCommunication: "مهارات التواصل",
    specOther: "تخصصات أخرى",

    // Delivery methods
    deliveryInPerson: "حضوري/فصل دراسي",
    deliveryOnline: "افتراضي/مباشر عبر الإنترنت",
    deliveryHybrid: "هجين",
    deliveryBlended: "تعلم مدمج",

    // Target audiences
    audienceCorporate: "فرق الشركات",
    audienceIndividual: "المحترفون الأفراد",
    audienceGovernment: "القطاع الحكومي/العام",
    audienceAcademic: "الأكاديميون/الطلاب",
    audienceNonprofit: "المنظمات غير الربحية",
  },
};

const getSpecializationOptions = (texts: typeof translations.en) => [
  { id: "business_development" as Specialization, name: texts.specBusinessDevelopment },
  { id: "leadership" as Specialization, name: texts.specLeadership },
  { id: "project_management" as Specialization, name: texts.specProjectManagement },
  { id: "data_analytics" as Specialization, name: texts.specDataAnalytics },
  { id: "hr_management" as Specialization, name: texts.specHrManagement },
  { id: "finance" as Specialization, name: texts.specFinance },
  { id: "marketing" as Specialization, name: texts.specMarketing },
  { id: "operations" as Specialization, name: texts.specOperations },
  { id: "technology" as Specialization, name: texts.specTechnology },
  { id: "compliance" as Specialization, name: texts.specCompliance },
  { id: "strategy" as Specialization, name: texts.specStrategy },
  { id: "communication" as Specialization, name: texts.specCommunication },
  { id: "other" as Specialization, name: texts.specOther },
];

const getDeliveryMethodOptions = (texts: typeof translations.en) => [
  { id: "in_person" as DeliveryMethod, label: texts.deliveryInPerson },
  { id: "online" as DeliveryMethod, label: texts.deliveryOnline },
  { id: "hybrid" as DeliveryMethod, label: texts.deliveryHybrid },
  { id: "blended" as DeliveryMethod, label: texts.deliveryBlended },
];

const getTargetAudienceOptions = (texts: typeof translations.en) => [
  { id: "corporate" as TargetAudience, label: texts.audienceCorporate },
  { id: "individual" as TargetAudience, label: texts.audienceIndividual },
  { id: "government" as TargetAudience, label: texts.audienceGovernment },
  { id: "academic" as TargetAudience, label: texts.audienceAcademic },
  { id: "nonprofit" as TargetAudience, label: texts.audienceNonprofit },
];

// Country list for dropdown
const countries = [
  "United States", "Canada", "United Kingdom", "Germany", "France", "Australia",
  "Japan", "Singapore", "UAE", "Saudi Arabia", "India", "Brazil", "Mexico",
  "South Africa", "Netherlands", "Switzerland", "Spain", "Italy", "China", "South Korea"
].sort();

// Time zones
const timeZones = [
  "UTC-12:00", "UTC-11:00", "UTC-10:00", "UTC-09:00", "UTC-08:00", "UTC-07:00",
  "UTC-06:00", "UTC-05:00", "UTC-04:00", "UTC-03:00", "UTC-02:00", "UTC-01:00",
  "UTC", "UTC+01:00", "UTC+02:00", "UTC+03:00", "UTC+04:00", "UTC+05:00",
  "UTC+05:30", "UTC+06:00", "UTC+07:00", "UTC+08:00", "UTC+09:00", "UTC+10:00",
  "UTC+11:00", "UTC+12:00"
];

interface FormData {
  organization_name: string;
  legal_name: string;
  registration_number: string;
  tax_id: string;
  year_established: string;
  website: string;
  description: string;
  street_address: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  timezone: string;
  primary_contact_name: string;
  primary_contact_title: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  billing_contact_name: string;
  billing_contact_email: string;
  billing_contact_phone: string;
  specializations: Specialization[];
  delivery_methods: DeliveryMethod[];
  target_audiences: TargetAudience[];
  linkedin_url: string;
  twitter_url: string;
  facebook_url: string;
}

export default function EditProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { language } = useLanguage();
  const texts = translations[language];
  const [activeTab, setActiveTab] = useState("organization");

  // Dynamic options based on language
  const specializationOptions = getSpecializationOptions(texts);
  const deliveryMethodOptions = getDeliveryMethodOptions(texts);
  const targetAudienceOptions = getTargetAudienceOptions(texts);

  // Fetch profile data
  const { data: profile, isLoading, error, refetch } = usePDPPartnerProfile();
  const { data: licenseInfo } = usePDPLicense();
  const { data: toolkitItems } = usePDPToolkit('logos');
  const updateProfile = useUpdatePDPPartnerProfile();
  const uploadLogo = useUploadPartnerLogo();
  const removeLogo = useRemovePartnerLogo();

  // Find BDA Partner Badge/Logo from toolkit items (provided by BDA admin)
  const bdaPartnerBadge = toolkitItems?.find(item =>
    item.title.toLowerCase().includes('partner badge') ||
    item.title.toLowerCase().includes('pdp badge') ||
    item.title.toLowerCase().includes('accreditation badge') ||
    item.title.toLowerCase().includes('partner logo')
  );

  // Default BDA logo available to all accredited partners
  const defaultBadgeUrl = '/bda-logo.png';

  // Use profile badge_url first, then toolkit badge, then default BDA logo
  // Note: All accredited PDP partners have access to the badge
  const effectiveBadgeUrl = profile?.badge_url || bdaPartnerBadge?.file_url || defaultBadgeUrl;

  // Partner is accredited if they have a profile (they can access this page)
  const isAccreditedPartner = !!profile;

  // Form state
  const [formData, setFormData] = useState<FormData>({
    organization_name: "",
    legal_name: "",
    registration_number: "",
    tax_id: "",
    year_established: "",
    website: "",
    description: "",
    street_address: "",
    city: "",
    state_province: "",
    postal_code: "",
    country: "",
    timezone: "UTC",
    primary_contact_name: "",
    primary_contact_title: "",
    primary_contact_email: "",
    primary_contact_phone: "",
    billing_contact_name: "",
    billing_contact_email: "",
    billing_contact_phone: "",
    specializations: [],
    delivery_methods: [],
    target_audiences: [],
    linkedin_url: "",
    twitter_url: "",
    facebook_url: "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        organization_name: profile.organization_name || "",
        legal_name: profile.legal_name || "",
        registration_number: profile.registration_number || "",
        tax_id: profile.tax_id || "",
        year_established: profile.year_established?.toString() || "",
        website: profile.website || "",
        description: profile.description || "",
        street_address: profile.street_address || "",
        city: profile.city || "",
        state_province: profile.state_province || "",
        postal_code: profile.postal_code || "",
        country: profile.country || "",
        timezone: profile.timezone || "UTC",
        primary_contact_name: profile.primary_contact_name || "",
        primary_contact_title: profile.primary_contact_title || "",
        primary_contact_email: profile.primary_contact_email || "",
        primary_contact_phone: profile.primary_contact_phone || "",
        billing_contact_name: profile.billing_contact_name || "",
        billing_contact_email: profile.billing_contact_email || "",
        billing_contact_phone: profile.billing_contact_phone || "",
        specializations: profile.specializations || [],
        delivery_methods: profile.delivery_methods || [],
        target_audiences: profile.target_audiences || [],
        linkedin_url: profile.linkedin_url || "",
        twitter_url: profile.twitter_url || "",
        facebook_url: profile.facebook_url || "",
      });
      if (profile.logo_url) {
        setLogoPreview(profile.logo_url);
      }
    }
  }, [profile]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSpecializationToggle = (specId: Specialization) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(specId)
        ? prev.specializations.filter(s => s !== specId)
        : [...prev.specializations, specId]
    }));
  };

  const handleDeliveryMethodToggle = (method: DeliveryMethod) => {
    setFormData(prev => ({
      ...prev,
      delivery_methods: prev.delivery_methods.includes(method)
        ? prev.delivery_methods.filter(m => m !== method)
        : [...prev.delivery_methods, method]
    }));
  };

  const handleTargetAudienceToggle = (audience: TargetAudience) => {
    setFormData(prev => ({
      ...prev,
      target_audiences: prev.target_audiences.includes(audience)
        ? prev.target_audiences.filter(a => a !== audience)
        : [...prev.target_audiences, audience]
    }));
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: texts.fileTooLarge,
          description: texts.fileTooLargeDesc,
          variant: "destructive",
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = async () => {
    await removeLogo.mutateAsync();
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleDownloadBadge = () => {
    if (effectiveBadgeUrl) {
      const link = document.createElement('a');
      link.href = effectiveBadgeUrl;
      link.download = bdaPartnerBadge?.title || 'bda-partner-badge';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSubmit = async () => {
    // Build the update DTO
    const dto: UpdatePDPPartnerProfileDTO = {
      organization_name: formData.organization_name || undefined,
      legal_name: formData.legal_name || undefined,
      registration_number: formData.registration_number || undefined,
      tax_id: formData.tax_id || undefined,
      year_established: formData.year_established ? parseInt(formData.year_established) : undefined,
      website: formData.website || undefined,
      description: formData.description || undefined,
      street_address: formData.street_address || undefined,
      city: formData.city || undefined,
      state_province: formData.state_province || undefined,
      postal_code: formData.postal_code || undefined,
      country: formData.country || undefined,
      timezone: formData.timezone || undefined,
      primary_contact_name: formData.primary_contact_name || undefined,
      primary_contact_title: formData.primary_contact_title || undefined,
      primary_contact_email: formData.primary_contact_email || undefined,
      primary_contact_phone: formData.primary_contact_phone || undefined,
      billing_contact_name: formData.billing_contact_name || undefined,
      billing_contact_email: formData.billing_contact_email || undefined,
      billing_contact_phone: formData.billing_contact_phone || undefined,
      specializations: formData.specializations,
      delivery_methods: formData.delivery_methods,
      target_audiences: formData.target_audiences,
      linkedin_url: formData.linkedin_url || undefined,
      twitter_url: formData.twitter_url || undefined,
      facebook_url: formData.facebook_url || undefined,
    };

    // Upload logo if changed
    if (logoFile) {
      await uploadLogo.mutateAsync(logoFile);
    }

    // Update profile
    await updateProfile.mutateAsync(dto);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <Alert variant="destructive">
          <AlertCircle className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
          <AlertTitle>{texts.errorLoadingTitle}</AlertTitle>
          <AlertDescription>
            {texts.errorLoadingDesc}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()}>
          <RefreshCw className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
          {texts.retry}
        </Button>
      </div>
    );
  }

  const isSubmitting = updateProfile.isPending || uploadLogo.isPending || removeLogo.isPending;
  const license = licenseInfo?.license;

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={language === 'ar' ? 'text-right' : ''}>
          <h1 className="text-2xl font-bold text-gray-900">{texts.pageTitle}</h1>
          <p className="text-gray-600 mt-1">
            {texts.pageSubtitle}
          </p>
        </div>
        <div className={`flex gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <Button variant="outline" onClick={() => navigate("/pdp/dashboard")}>
            {texts.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
            ) : (
              <Save className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
            )}
            {isSubmitting ? texts.saving : texts.saveChanges}
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      {license && (
        <Card className={license.status === 'active' ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
          <CardContent className="py-4">
            <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              {license.status === 'active' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className={`font-medium ${license.status === 'active' ? 'text-green-900' : 'text-amber-900'}`}>
                  {license.status === 'active' ? texts.activePDPPartner : texts.pdpPartner(license.status)}
                </p>
                <p className={`text-sm ${license.status === 'active' ? 'text-green-700' : 'text-amber-700'}`}>
                  {texts.partnerCode}: {license.partner_code} | {texts.licenseValidUntil} {new Date(license.expiry_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Form Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="organization">{texts.tabOrganization}</TabsTrigger>
          <TabsTrigger value="contact">{texts.tabContact}</TabsTrigger>
          <TabsTrigger value="specializations">{texts.tabSpecializations}</TabsTrigger>
          <TabsTrigger value="branding">{texts.tabBranding}</TabsTrigger>
        </TabsList>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <Building2 className="h-5 w-5" />
                {texts.organizationDetails}
              </CardTitle>
              <CardDescription className={language === 'ar' ? 'text-right' : ''}>
                {texts.organizationDetailsDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organization_name">{texts.organizationName} *</Label>
                  <Input
                    id="organization_name"
                    value={formData.organization_name}
                    onChange={(e) => handleInputChange("organization_name", e.target.value)}
                    className={language === 'ar' ? 'text-right' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_name">{texts.legalName}</Label>
                  <Input
                    id="legal_name"
                    value={formData.legal_name}
                    onChange={(e) => handleInputChange("legal_name", e.target.value)}
                    className={language === 'ar' ? 'text-right' : ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registration_number">{texts.registrationNumber}</Label>
                  <Input
                    id="registration_number"
                    value={formData.registration_number}
                    onChange={(e) => handleInputChange("registration_number", e.target.value)}
                    className={language === 'ar' ? 'text-right' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_id">{texts.taxId}</Label>
                  <Input
                    id="tax_id"
                    value={formData.tax_id}
                    onChange={(e) => handleInputChange("tax_id", e.target.value)}
                    className={language === 'ar' ? 'text-right' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year_established">{texts.yearEstablished}</Label>
                  <Input
                    id="year_established"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={formData.year_established}
                    onChange={(e) => handleInputChange("year_established", e.target.value)}
                    className={language === 'ar' ? 'text-right' : ''}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">{texts.website}</Label>
                <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <Globe className={`h-4 w-4 text-gray-400 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{texts.organizationDescription}</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder={texts.descriptionPlaceholder}
                  className={language === 'ar' ? 'text-right' : ''}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <MapPin className="h-5 w-5" />
                {texts.address}
              </CardTitle>
              <CardDescription className={language === 'ar' ? 'text-right' : ''}>
                {texts.addressDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street_address">{texts.streetAddress}</Label>
                <Input
                  id="street_address"
                  value={formData.street_address}
                  onChange={(e) => handleInputChange("street_address", e.target.value)}
                  className={language === 'ar' ? 'text-right' : ''}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">{texts.city}</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className={language === 'ar' ? 'text-right' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state_province">{texts.stateProvince}</Label>
                  <Input
                    id="state_province"
                    value={formData.state_province}
                    onChange={(e) => handleInputChange("state_province", e.target.value)}
                    className={language === 'ar' ? 'text-right' : ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postal_code">{texts.postalCode}</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => handleInputChange("postal_code", e.target.value)}
                    className={language === 'ar' ? 'text-right' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">{texts.country}</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => handleInputChange("country", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={texts.selectCountry} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(country => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">{texts.timezone}</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => handleInputChange("timezone", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={texts.selectTimezone} />
                    </SelectTrigger>
                    <SelectContent>
                      {timeZones.map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <User className="h-5 w-5" />
                {texts.primaryContact}
              </CardTitle>
              <CardDescription className={language === 'ar' ? 'text-right' : ''}>
                {texts.primaryContactDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_contact_name">{texts.fullName} *</Label>
                  <Input
                    id="primary_contact_name"
                    value={formData.primary_contact_name}
                    onChange={(e) => handleInputChange("primary_contact_name", e.target.value)}
                    className={language === 'ar' ? 'text-right' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary_contact_title">{texts.titlePosition}</Label>
                  <Input
                    id="primary_contact_title"
                    value={formData.primary_contact_title}
                    onChange={(e) => handleInputChange("primary_contact_title", e.target.value)}
                    className={language === 'ar' ? 'text-right' : ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_contact_email">{texts.email} *</Label>
                  <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <Mail className={`h-4 w-4 text-gray-400 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                    <Input
                      id="primary_contact_email"
                      type="email"
                      value={formData.primary_contact_email}
                      onChange={(e) => handleInputChange("primary_contact_email", e.target.value)}
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary_contact_phone">{texts.phone}</Label>
                  <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <Phone className={`h-4 w-4 text-gray-400 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                    <Input
                      id="primary_contact_phone"
                      type="tel"
                      value={formData.primary_contact_phone}
                      onChange={(e) => handleInputChange("primary_contact_phone", e.target.value)}
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'text-right' : ''}>{texts.billingContact}</CardTitle>
              <CardDescription className={language === 'ar' ? 'text-right' : ''}>
                {texts.billingContactDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="billing_contact_name">{texts.fullName}</Label>
                <Input
                  id="billing_contact_name"
                  value={formData.billing_contact_name}
                  onChange={(e) => handleInputChange("billing_contact_name", e.target.value)}
                  className={language === 'ar' ? 'text-right' : ''}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billing_contact_email">{texts.email}</Label>
                  <Input
                    id="billing_contact_email"
                    type="email"
                    value={formData.billing_contact_email}
                    onChange={(e) => handleInputChange("billing_contact_email", e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_contact_phone">{texts.phone}</Label>
                  <Input
                    id="billing_contact_phone"
                    type="tel"
                    value={formData.billing_contact_phone}
                    onChange={(e) => handleInputChange("billing_contact_phone", e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'text-right' : ''}>{texts.socialMedia}</CardTitle>
              <CardDescription className={language === 'ar' ? 'text-right' : ''}>
                {texts.socialMediaDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">{texts.linkedin}</Label>
                <Input
                  id="linkedin_url"
                  type="url"
                  placeholder="https://linkedin.com/company/..."
                  value={formData.linkedin_url}
                  onChange={(e) => handleInputChange("linkedin_url", e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter_url">{texts.twitterX}</Label>
                <Input
                  id="twitter_url"
                  type="url"
                  placeholder="https://twitter.com/..."
                  value={formData.twitter_url}
                  onChange={(e) => handleInputChange("twitter_url", e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook_url">{texts.facebook}</Label>
                <Input
                  id="facebook_url"
                  type="url"
                  placeholder="https://facebook.com/..."
                  value={formData.facebook_url}
                  onChange={(e) => handleInputChange("facebook_url", e.target.value)}
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Specializations Tab */}
        <TabsContent value="specializations" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'text-right' : ''}>{texts.trainingSpecializations}</CardTitle>
              <CardDescription className={language === 'ar' ? 'text-right' : ''}>
                {texts.trainingSpecializationsDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {specializationOptions.map(spec => (
                  <div
                    key={spec.id}
                    onClick={() => handleSpecializationToggle(spec.id)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.specializations.includes(spec.id)
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        formData.specializations.includes(spec.id)
                          ? "bg-primary border-primary"
                          : "border-gray-300"
                      }`}>
                        {formData.specializations.includes(spec.id) && (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm font-medium">{spec.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'text-right' : ''}>{texts.deliveryMethods}</CardTitle>
              <CardDescription className={language === 'ar' ? 'text-right' : ''}>
                {texts.deliveryMethodsDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`flex flex-wrap gap-3 ${language === 'ar' ? 'justify-end' : ''}`}>
                {deliveryMethodOptions.map(method => (
                  <Badge
                    key={method.id}
                    variant={formData.delivery_methods.includes(method.id) ? "default" : "outline"}
                    className="cursor-pointer px-4 py-2"
                    onClick={() => handleDeliveryMethodToggle(method.id)}
                  >
                    {method.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'text-right' : ''}>{texts.targetAudiences}</CardTitle>
              <CardDescription className={language === 'ar' ? 'text-right' : ''}>
                {texts.targetAudiencesDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`flex flex-wrap gap-3 ${language === 'ar' ? 'justify-end' : ''}`}>
                {targetAudienceOptions.map(audience => (
                  <Badge
                    key={audience.id}
                    variant={formData.target_audiences.includes(audience.id) ? "default" : "outline"}
                    className="cursor-pointer px-4 py-2"
                    onClick={() => handleTargetAudienceToggle(audience.id)}
                  >
                    {audience.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'text-right' : ''}>{texts.organizationLogo}</CardTitle>
              <CardDescription className={language === 'ar' ? 'text-right' : ''}>
                {texts.organizationLogoDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`flex items-start gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                  {logoPreview ? (
                    <div className="relative w-full h-full">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="text-center">
                      <Building2 className="h-8 w-8 mx-auto text-gray-400" />
                      <span className="text-xs text-gray-500 mt-1">{texts.noLogo}</span>
                    </div>
                  )}
                </div>
                <div className={`flex-1 ${language === 'ar' ? 'text-right' : ''}`}>
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/png,image/jpeg"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <div className={`flex gap-2 ${language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                    <label htmlFor="logo-upload">
                      <Button variant="outline" asChild>
                        <span className="cursor-pointer">
                          <Upload className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                          {texts.uploadLogo}
                        </span>
                      </Button>
                    </label>
                    {(logoPreview || profile?.logo_url) && (
                      <Button
                        variant="outline"
                        onClick={handleRemoveLogo}
                        disabled={removeLogo.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {removeLogo.isPending ? (
                          <Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                        ) : (
                          <X className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                        )}
                        {texts.removeLogo}
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {texts.logoRecommendation}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                <Award className="h-5 w-5 text-blue-600" />
                {texts.bdaPartnerBadge}
              </CardTitle>
              <CardDescription className={language === 'ar' ? 'text-right' : ''}>
                {texts.bdaPartnerBadgeDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`flex items-start gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <div className="w-32 h-32 border-2 border-blue-200 rounded-lg flex items-center justify-center bg-white shadow-sm">
                  {effectiveBadgeUrl ? (
                    <img
                      src={effectiveBadgeUrl}
                      alt="BDA Partner Badge"
                      className="w-full h-full object-contain rounded-lg p-2"
                    />
                  ) : (
                    <div className={`p-4 rounded-lg text-white text-center ${language === 'ar' ? 'bg-gradient-to-bl' : 'bg-gradient-to-br'} from-blue-500 to-blue-700 w-full h-full flex flex-col items-center justify-center`}>
                      <div className="text-[10px] font-medium mb-1">{texts.bdaAccredited}</div>
                      <div className="text-lg font-bold">{texts.pdp}</div>
                      <div className="text-[10px]">{texts.partner}</div>
                    </div>
                  )}
                </div>
                <div className={`flex-1 ${language === 'ar' ? 'text-right' : ''}`}>
                  <p className="text-sm text-gray-600 mb-3">
                    {texts.badgeUsageInfo}
                  </p>
                  {isAccreditedPartner ? (
                    <div className={`flex gap-2 flex-wrap ${language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                      <Button
                        onClick={handleDownloadBadge}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Download className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                        {texts.downloadBadge}
                      </Button>
                      <Button variant="outline" onClick={() => navigate("/pdp/toolkit")}>
                        {texts.viewUsageGuidelines}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-100 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">{texts.badgeNotAvailable}</p>
                      <p className="text-xs text-gray-500 mt-1">{texts.badgeNotAvailableDesc}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-4">
              <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className={language === 'ar' ? 'text-right' : ''}>
                  <p className="font-medium text-amber-900">{texts.brandGuidelines}</p>
                  <p className="text-sm text-amber-700 mt-1">
                    {texts.brandGuidelinesInfo}
                  </p>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-amber-700 hover:text-amber-800 mt-1"
                    onClick={() => navigate("/pdp/toolkit")}
                  >
                    {texts.viewBrandGuidelines}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
