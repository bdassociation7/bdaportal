/**
 * PDP Guidelines Page
 * Downloadable resources for PDP partners: policies, templates, logo usage, ID formats
 * Fetches documents from database
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileText,
  Download,
  BookOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  GraduationCap,
  Target,
  Award,
  FileCheck,
  HelpCircle,
  ExternalLink,
  Image,
  RefreshCw,
  FileSpreadsheet,
  File,
} from "lucide-react";
import { usePDPGuidelines, useTrackGuidelineDownload } from "@/entities/pdp";
import type { PDPGuideline, GuidelineCategory } from "@/entities/pdp";
import { useLanguage } from "@/contexts/LanguageContext";

const translations = {
  en: {
    // Page header
    pageTitle: "Accreditation Guidelines",
    pageSubtitle: "Resources and documentation for PDP program accreditation",

    // Error state
    errorLoadingTitle: "Error Loading Guidelines",
    errorLoadingDesc: "Unable to load guideline documents. Please try again.",
    retry: "Retry",

    // Quick links
    policies: "Policies",
    templates: "Templates",
    guides: "Guides",
    logoUsage: "Logo Usage",
    idFormats: "ID Formats",
    documents: "documents",

    // Tabs
    tabOverview: "Overview",
    tabPolicies: "Policies",
    tabTemplates: "Templates",
    tabGuides: "Guides",
    tabLogoUsage: "Logo Usage",
    tabIdFormats: "ID Formats",
    tabPdcRules: "PDC Rules",
    tabFaq: "FAQ",

    // Category labels and descriptions
    catPolicy: "Policies",
    catTemplate: "Templates",
    catGuide: "Guides",
    catLogo: "Logo & Branding",
    catFormat: "ID Formats",
    catPolicyDesc: "Official policies and agreements",
    catTemplateDesc: "Forms and worksheets",
    catGuideDesc: "How-to documentation",
    catLogoDesc: "Branding assets and guidelines",
    catFormatDesc: "ID specifications",

    // Document list
    noDocuments: "No documents available in this category",
    required: "Required",
    updated: "Updated",

    // Overview tab
    aboutPdpTitle: "About PDP Accreditation",
    aboutPdpDesc: "The Professional Development Provider (PDP) program enables training organisations to offer BDA-accredited professional development programs. Accredited programs allow participants to earn Professional Development Credits (PDCs) toward maintaining their BDA certifications.",
    recognition: "Recognition",
    recognitionDesc: "Your programs are recognised by BDA as meeting quality standards",
    pdcCredits: "PDC Credits",
    pdcCreditsDesc: "Participants can earn PDCs for certification maintenance",
    bockAlignment: "BoCK Alignment",
    bockAlignmentDesc: "Programs map to BDA's Body of Competency & Knowledge",
    accreditationProcess: "Accreditation Process",
    stepsToAccredit: "Steps to get your program accredited",
    requiredReading: "Required Reading",
    requiredReadingDesc: "Some documents are marked as required for all PDP partners. Make sure to review these before submitting programs.",

    // Process steps
    step1Title: "Prepare Program Documentation",
    step1Desc: "Gather learning objectives, content outline, and delivery details",
    step2Title: "Map to BoCK Competencies",
    step2Desc: "Align your program content with relevant BDA competency areas",
    step3Title: "Calculate PDC Credits",
    step3Desc: "Determine appropriate PDC value based on program duration and type",
    step4Title: "Submit for Review",
    step4Desc: "Complete the submission form with all required documentation",
    step5Title: "Review & Approval",
    step5Desc: "BDA reviews your submission (typically 2-4 weeks)",
    step6Title: "Program Accredited",
    step6Desc: "Receive accreditation and start offering PDCs to participants",

    // PDC Rules
    pdcCalculationRules: "PDC Calculation Rules",
    pdcCalculationDesc: "How to determine the appropriate PDC value for your program",
    example: "Example",
    pdcLimitsTitle: "PDC Limits & Guidelines",
    maxPdcsPerProgram: "Maximum PDCs per Program",
    singleDayMax: "Single day program: 8 PDCs max",
    multiDayMax: "Multi-day program: 40 PDCs max",
    selfPacedMax: "Self-paced course: 20 PDCs max",
    whatDoesntCount: "What Doesn't Count",
    breaksAndMeals: "Breaks and meals",
    registrationTime: "Registration and networking time",
    vendorSales: "Vendor sales presentations",

    // PDC types
    classroomTraining: "Classroom Training",
    classroomDesc: "Instructor-led in-person training",
    classroomRule: "1 PDC per contact hour of instruction",
    classroomExample: "8-hour workshop = 8 PDCs",
    virtualTraining: "Virtual Training",
    virtualDesc: "Live online instructor-led training",
    virtualRule: "1 PDC per contact hour of instruction",
    virtualExample: "4-hour virtual session = 4 PDCs",
    selfPacedLearning: "Self-Paced Learning",
    selfPacedDesc: "Online courses completed independently",
    selfPacedRule: "1 PDC per estimated learning hour",
    selfPacedExample: "6-hour e-learning module = 6 PDCs",
    conferenceSessions: "Conference Sessions",
    conferenceDesc: "Professional conference presentations",
    conferenceRule: "1 PDC per session hour attended",
    conferenceExample: "2-hour keynote = 2 PDCs",
    workshops: "Workshops",
    workshopsDesc: "Hands-on practical workshops",
    workshopsRule: "1 PDC per contact hour, max 2x for intensive",
    workshopsExample: "4-hour intensive workshop = up to 8 PDCs",

    // FAQ
    faqTitle: "Frequently Asked Questions",
    stillHaveQuestions: "Still have questions?",
    supportTeamHelp: "Our PDP support team is here to help you with the accreditation process.",
    contactSupport: "Contact Support",
    scheduleCall: "Schedule a Call",

    // FAQ items
    faq1Q: "How long does program accreditation take?",
    faq1A: "The standard review process takes 2-4 weeks from submission. Complex programs or those requiring additional documentation may take longer. You can track your submission status in the Programs dashboard.",
    faq2Q: "Can I submit programs in languages other than English?",
    faq2A: "Yes, programs can be delivered in any language. However, the program submission documentation must be in English for the review process. You should indicate the delivery language in your submission.",
    faq3Q: "How are PDC credits calculated for hybrid programs?",
    faq3A: "Hybrid programs combine multiple delivery methods. Calculate PDCs for each component separately based on the rules for each delivery type, then sum the total. Document each component clearly in your submission.",
    faq4Q: "What happens if my program doesn't meet accreditation criteria?",
    faq4A: "If your program doesn't meet criteria, you'll receive detailed feedback explaining the gaps. You can revise and resubmit your program. Most programs achieve accreditation after one round of revisions.",
    faq5Q: "How often do I need to renew program accreditation?",
    faq5A: "Program accreditations are valid for 3 years. You'll receive reminders 90 days before expiration. The renewal process is streamlined if you've maintained good standing.",
    faq6Q: "Can participants earn PDCs retroactively?",
    faq6A: "No, PDCs can only be claimed for programs completed after accreditation. Participants who completed a program before accreditation cannot claim PDCs for that completion.",
    faq7Q: "What's required for the annual report?",
    faq7A: "Annual reports include: total programs delivered, participant counts, completion rates, feedback summaries, and any program modifications. Due by January 31 each year for the previous calendar year.",
    faq8Q: "How do I handle program modifications?",
    faq8A: "Minor updates (under 20% content change) don't require re-accreditation. Significant changes require a modification review. Contact support if you're unsure whether changes require review.",
  },
  ar: {
    // Page header
    pageTitle: "إرشادات الاعتماد",
    pageSubtitle: "الموارد والوثائق لاعتماد برامج PDP",

    // Error state
    errorLoadingTitle: "خطأ في تحميل الإرشادات",
    errorLoadingDesc: "تعذر تحميل وثائق الإرشادات. يرجى المحاولة مرة أخرى.",
    retry: "إعادة المحاولة",

    // Quick links
    policies: "السياسات",
    templates: "القوالب",
    guides: "الأدلة",
    logoUsage: "استخدام الشعار",
    idFormats: "تنسيقات المعرفات",
    documents: "وثائق",

    // Tabs
    tabOverview: "نظرة عامة",
    tabPolicies: "السياسات",
    tabTemplates: "القوالب",
    tabGuides: "الأدلة",
    tabLogoUsage: "استخدام الشعار",
    tabIdFormats: "تنسيقات المعرفات",
    tabPdcRules: "قواعد PDC",
    tabFaq: "الأسئلة الشائعة",

    // Category labels and descriptions
    catPolicy: "السياسات",
    catTemplate: "القوالب",
    catGuide: "الأدلة",
    catLogo: "الشعار والعلامة التجارية",
    catFormat: "تنسيقات المعرفات",
    catPolicyDesc: "السياسات والاتفاقيات الرسمية",
    catTemplateDesc: "النماذج وأوراق العمل",
    catGuideDesc: "وثائق إرشادية",
    catLogoDesc: "أصول العلامة التجارية والإرشادات",
    catFormatDesc: "مواصفات المعرفات",

    // Document list
    noDocuments: "لا توجد وثائق متاحة في هذه الفئة",
    required: "مطلوب",
    updated: "محدث",

    // Overview tab
    aboutPdpTitle: "حول اعتماد PDP",
    aboutPdpDesc: "يتيح برنامج مزود التطوير المهني (PDP) لمؤسسات التدريب تقديم برامج تطوير مهني معتمدة من BDA. تسمح البرامج المعتمدة للمشاركين بكسب اعتمادات التطوير المهني (PDCs) للحفاظ على شهادات BDA الخاصة بهم.",
    recognition: "الاعتراف",
    recognitionDesc: "يتم الاعتراف ببرامجك من قبل BDA كونها تلبي معايير الجودة",
    pdcCredits: "اعتمادات PDC",
    pdcCreditsDesc: "يمكن للمشاركين كسب PDCs للحفاظ على الشهادة",
    bockAlignment: "التوافق مع BoCK",
    bockAlignmentDesc: "البرامج مرتبطة بمجموعة الكفاءات والمعرفة لدى BDA",
    accreditationProcess: "عملية الاعتماد",
    stepsToAccredit: "خطوات اعتماد برنامجك",
    requiredReading: "قراءة مطلوبة",
    requiredReadingDesc: "بعض الوثائق مُعلَّمة كمطلوبة لجميع شركاء PDP. تأكد من مراجعتها قبل تقديم البرامج.",

    // Process steps
    step1Title: "إعداد وثائق البرنامج",
    step1Desc: "جمع أهداف التعلم ومخطط المحتوى وتفاصيل التقديم",
    step2Title: "الربط بكفاءات BoCK",
    step2Desc: "مواءمة محتوى برنامجك مع مجالات كفاءات BDA ذات الصلة",
    step3Title: "حساب اعتمادات PDC",
    step3Desc: "تحديد قيمة PDC المناسبة بناءً على مدة البرنامج ونوعه",
    step4Title: "التقديم للمراجعة",
    step4Desc: "إكمال نموذج التقديم بجميع الوثائق المطلوبة",
    step5Title: "المراجعة والموافقة",
    step5Desc: "تقوم BDA بمراجعة تقديمك (عادةً 2-4 أسابيع)",
    step6Title: "البرنامج معتمد",
    step6Desc: "استلام الاعتماد وبدء تقديم PDCs للمشاركين",

    // PDC Rules
    pdcCalculationRules: "قواعد حساب PDC",
    pdcCalculationDesc: "كيفية تحديد قيمة PDC المناسبة لبرنامجك",
    example: "مثال",
    pdcLimitsTitle: "حدود وإرشادات PDC",
    maxPdcsPerProgram: "الحد الأقصى لـ PDCs لكل برنامج",
    singleDayMax: "برنامج يوم واحد: 8 PDCs كحد أقصى",
    multiDayMax: "برنامج متعدد الأيام: 40 PDC كحد أقصى",
    selfPacedMax: "دورة ذاتية: 20 PDC كحد أقصى",
    whatDoesntCount: "ما لا يُحتسب",
    breaksAndMeals: "فترات الراحة والوجبات",
    registrationTime: "وقت التسجيل والتواصل",
    vendorSales: "عروض مبيعات الموردين",

    // PDC types
    classroomTraining: "التدريب الصفي",
    classroomDesc: "تدريب حضوري بقيادة مدرب",
    classroomRule: "1 PDC لكل ساعة تعليم فعلية",
    classroomExample: "ورشة عمل 8 ساعات = 8 PDCs",
    virtualTraining: "التدريب الافتراضي",
    virtualDesc: "تدريب مباشر عبر الإنترنت بقيادة مدرب",
    virtualRule: "1 PDC لكل ساعة تعليم فعلية",
    virtualExample: "جلسة افتراضية 4 ساعات = 4 PDCs",
    selfPacedLearning: "التعلم الذاتي",
    selfPacedDesc: "دورات عبر الإنترنت تُكمَل بشكل مستقل",
    selfPacedRule: "1 PDC لكل ساعة تعلم تقديرية",
    selfPacedExample: "وحدة تعلم إلكتروني 6 ساعات = 6 PDCs",
    conferenceSessions: "جلسات المؤتمرات",
    conferenceDesc: "عروض المؤتمرات المهنية",
    conferenceRule: "1 PDC لكل ساعة حضور جلسة",
    conferenceExample: "كلمة رئيسية ساعتين = 2 PDCs",
    workshops: "ورش العمل",
    workshopsDesc: "ورش عمل تطبيقية عملية",
    workshopsRule: "1 PDC لكل ساعة فعلية، بحد أقصى 2x للمكثفة",
    workshopsExample: "ورشة عمل مكثفة 4 ساعات = حتى 8 PDCs",

    // FAQ
    faqTitle: "الأسئلة الشائعة",
    stillHaveQuestions: "لا زلت لديك أسئلة؟",
    supportTeamHelp: "فريق دعم PDP لدينا هنا لمساعدتك في عملية الاعتماد.",
    contactSupport: "اتصل بالدعم",
    scheduleCall: "جدولة مكالمة",

    // FAQ items
    faq1Q: "كم يستغرق اعتماد البرنامج؟",
    faq1A: "تستغرق عملية المراجعة القياسية 2-4 أسابيع من التقديم. قد تستغرق البرامج المعقدة أو تلك التي تتطلب وثائق إضافية وقتًا أطول. يمكنك تتبع حالة تقديمك في لوحة معلومات البرامج.",
    faq2Q: "هل يمكنني تقديم برامج بلغات غير الإنجليزية؟",
    faq2A: "نعم، يمكن تقديم البرامج بأي لغة. ومع ذلك، يجب أن تكون وثائق تقديم البرنامج باللغة الإنجليزية لعملية المراجعة. يجب عليك الإشارة إلى لغة التقديم في تقديمك.",
    faq3Q: "كيف يتم حساب اعتمادات PDC للبرامج الهجينة؟",
    faq3A: "تجمع البرامج الهجينة بين طرق تقديم متعددة. احسب PDCs لكل مكون بشكل منفصل بناءً على قواعد كل نوع تقديم، ثم اجمع الإجمالي. وثّق كل مكون بوضوح في تقديمك.",
    faq4Q: "ماذا يحدث إذا لم يستوفِ برنامجي معايير الاعتماد؟",
    faq4A: "إذا لم يستوفِ برنامجك المعايير، ستتلقى ملاحظات مفصلة توضح الثغرات. يمكنك مراجعة وإعادة تقديم برنامجك. تحقق معظم البرامج الاعتماد بعد جولة واحدة من المراجعات.",
    faq5Q: "كم مرة أحتاج لتجديد اعتماد البرنامج؟",
    faq5A: "اعتمادات البرامج صالحة لمدة 3 سنوات. ستتلقى تذكيرات قبل 90 يومًا من انتهاء الصلاحية. عملية التجديد مبسطة إذا حافظت على سمعة جيدة.",
    faq6Q: "هل يمكن للمشاركين كسب PDCs بأثر رجعي؟",
    faq6A: "لا، يمكن المطالبة بـ PDCs فقط للبرامج المكتملة بعد الاعتماد. لا يمكن للمشاركين الذين أكملوا برنامجًا قبل الاعتماد المطالبة بـ PDCs لذلك الإكمال.",
    faq7Q: "ما المطلوب للتقرير السنوي؟",
    faq7A: "تشمل التقارير السنوية: إجمالي البرامج المقدمة، وأعداد المشاركين، ومعدلات الإكمال، وملخصات الملاحظات، وأي تعديلات على البرنامج. تُقدَّم بحلول 31 يناير من كل عام للسنة التقويمية السابقة.",
    faq8Q: "كيف أتعامل مع تعديلات البرنامج؟",
    faq8A: "التحديثات الطفيفة (أقل من 20% تغيير في المحتوى) لا تتطلب إعادة اعتماد. التغييرات الكبيرة تتطلب مراجعة تعديل. اتصل بالدعم إذا لم تكن متأكدًا مما إذا كانت التغييرات تتطلب مراجعة.",
  },
};

const categoryIcons: Record<GuidelineCategory, React.ReactNode> = {
  policy: <FileCheck className="h-5 w-5 text-blue-600" />,
  template: <FileText className="h-5 w-5 text-green-600" />,
  guide: <BookOpen className="h-5 w-5 text-purple-600" />,
  logo: <Image className="h-5 w-5 text-amber-600" />,
  format: <Target className="h-5 w-5 text-red-600" />,
};

// Dynamic helper functions for translated content
const getCategoryLabels = (texts: typeof translations.en): Record<GuidelineCategory, string> => ({
  policy: texts.catPolicy,
  template: texts.catTemplate,
  guide: texts.catGuide,
  logo: texts.catLogo,
  format: texts.catFormat,
});

const getCategoryDescriptions = (texts: typeof translations.en): Record<GuidelineCategory, string> => ({
  policy: texts.catPolicyDesc,
  template: texts.catTemplateDesc,
  guide: texts.catGuideDesc,
  logo: texts.catLogoDesc,
  format: texts.catFormatDesc,
});

const getFaqs = (texts: typeof translations.en) => [
  { question: texts.faq1Q, answer: texts.faq1A },
  { question: texts.faq2Q, answer: texts.faq2A },
  { question: texts.faq3Q, answer: texts.faq3A },
  { question: texts.faq4Q, answer: texts.faq4A },
  { question: texts.faq5Q, answer: texts.faq5A },
  { question: texts.faq6Q, answer: texts.faq6A },
  { question: texts.faq7Q, answer: texts.faq7A },
  { question: texts.faq8Q, answer: texts.faq8A },
];

const getPdcCalculationRules = (texts: typeof translations.en) => [
  {
    type: texts.classroomTraining,
    description: texts.classroomDesc,
    rule: texts.classroomRule,
    example: texts.classroomExample,
  },
  {
    type: texts.virtualTraining,
    description: texts.virtualDesc,
    rule: texts.virtualRule,
    example: texts.virtualExample,
  },
  {
    type: texts.selfPacedLearning,
    description: texts.selfPacedDesc,
    rule: texts.selfPacedRule,
    example: texts.selfPacedExample,
  },
  {
    type: texts.conferenceSessions,
    description: texts.conferenceDesc,
    rule: texts.conferenceRule,
    example: texts.conferenceExample,
  },
  {
    type: texts.workshops,
    description: texts.workshopsDesc,
    rule: texts.workshopsRule,
    example: texts.workshopsExample,
  },
];

export default function Guidelines() {
  const [activeTab, setActiveTab] = useState("overview");
  const { language } = useLanguage();
  const texts = translations[language];

  // Dynamic content based on language
  const categoryLabels = getCategoryLabels(texts);
  const categoryDescriptions = getCategoryDescriptions(texts);
  const faqs = getFaqs(texts);
  const pdcCalculationRules = getPdcCalculationRules(texts);

  // Fetch guidelines from database
  const { data: guidelines, isLoading, error, refetch } = usePDPGuidelines();
  const trackDownload = useTrackGuidelineDownload();

  const getFileIcon = (fileType?: string) => {
    switch (fileType?.toLowerCase()) {
      case "pdf":
        return <FileText className="h-5 w-5 text-red-500" />;
      case "doc":
      case "docx":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "xlsx":
      case "xls":
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case "zip":
        return <File className="h-5 w-5 text-amber-500" />;
      case "png":
      case "jpg":
      case "svg":
        return <Image className="h-5 w-5 text-purple-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryDocs = (category: GuidelineCategory) => {
    return guidelines?.filter(doc => doc.category === category) || [];
  };

  const handleDownload = (guideline: PDPGuideline) => {
    // Track the download
    trackDownload.mutate(guideline.id);
    // Open the file URL
    window.open(guideline.file_url, "_blank");
  };

  const renderDocumentList = (category: GuidelineCategory) => {
    const docs = getCategoryDocs(category);

    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }

    if (docs.length === 0) {
      return (
        <div className={`text-center py-8 text-gray-500 ${language === 'ar' ? 'text-right' : ''}`}>
          {texts.noDocuments}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {docs.map(doc => (
          <div
            key={doc.id}
            className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${language === 'ar' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              {getFileIcon(doc.file_type)}
              <div className={language === 'ar' ? 'text-right' : ''}>
                <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <p className="font-medium text-sm">{doc.title}</p>
                  {doc.is_required && (
                    <Badge variant="destructive" className="text-xs">{texts.required}</Badge>
                  )}
                  {doc.version && (
                    <Badge variant="outline" className="text-xs">v{doc.version}</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {doc.description && `${doc.description} • `}
                  {formatFileSize(doc.file_size)}
                  {doc.file_size && " • "}
                  {texts.updated} {new Date(doc.updated_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    );
  };

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

  // Count documents by category
  const policiesCount = getCategoryDocs("policy").length;
  const templatesCount = getCategoryDocs("template").length;
  const guidesCount = getCategoryDocs("guide").length;
  const logoCount = getCategoryDocs("logo").length;
  const formatCount = getCategoryDocs("format").length;

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={language === 'ar' ? 'text-right' : ''}>
        <h1 className="text-2xl font-bold text-gray-900">{texts.pageTitle}</h1>
        <p className="text-gray-600 mt-1">
          {texts.pageSubtitle}
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("policy")}>
          <CardContent className="pt-6 text-center">
            <FileCheck className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <h3 className="font-medium">{texts.policies}</h3>
            <p className="text-sm text-gray-500">{policiesCount} {texts.documents}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("template")}>
          <CardContent className="pt-6 text-center">
            <FileText className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <h3 className="font-medium">{texts.templates}</h3>
            <p className="text-sm text-gray-500">{templatesCount} {texts.documents}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("guide")}>
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <h3 className="font-medium">{texts.guides}</h3>
            <p className="text-sm text-gray-500">{guidesCount} {texts.documents}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("logo")}>
          <CardContent className="pt-6 text-center">
            <Image className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <h3 className="font-medium">{texts.logoUsage}</h3>
            <p className="text-sm text-gray-500">{logoCount} {texts.documents}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("format")}>
          <CardContent className="pt-6 text-center">
            <Target className="h-8 w-8 mx-auto text-red-600 mb-2" />
            <h3 className="font-medium">{texts.idFormats}</h3>
            <p className="text-sm text-gray-500">{formatCount} {texts.documents}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">{texts.tabOverview}</TabsTrigger>
          <TabsTrigger value="policy">{texts.tabPolicies}</TabsTrigger>
          <TabsTrigger value="template">{texts.tabTemplates}</TabsTrigger>
          <TabsTrigger value="guide">{texts.tabGuides}</TabsTrigger>
          <TabsTrigger value="logo">{texts.tabLogoUsage}</TabsTrigger>
          <TabsTrigger value="format">{texts.tabIdFormats}</TabsTrigger>
          <TabsTrigger value="pdc">{texts.tabPdcRules}</TabsTrigger>
          <TabsTrigger value="faq">{texts.tabFaq}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <BookOpen className="h-5 w-5" />
                {texts.aboutPdpTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className={`text-gray-600 ${language === 'ar' ? 'text-right' : ''}`}>
                {texts.aboutPdpDesc}
              </p>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className={`p-4 bg-blue-50 rounded-lg ${language === 'ar' ? 'text-right' : ''}`}>
                  <Award className={`h-6 w-6 text-blue-600 mb-2 ${language === 'ar' ? 'mr-auto' : ''}`} />
                  <h4 className="font-medium text-blue-900">{texts.recognition}</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {texts.recognitionDesc}
                  </p>
                </div>
                <div className={`p-4 bg-green-50 rounded-lg ${language === 'ar' ? 'text-right' : ''}`}>
                  <GraduationCap className={`h-6 w-6 text-green-600 mb-2 ${language === 'ar' ? 'mr-auto' : ''}`} />
                  <h4 className="font-medium text-green-900">{texts.pdcCredits}</h4>
                  <p className="text-sm text-green-700 mt-1">
                    {texts.pdcCreditsDesc}
                  </p>
                </div>
                <div className={`p-4 bg-purple-50 rounded-lg ${language === 'ar' ? 'text-right' : ''}`}>
                  <Target className={`h-6 w-6 text-purple-600 mb-2 ${language === 'ar' ? 'mr-auto' : ''}`} />
                  <h4 className="font-medium text-purple-900">{texts.bockAlignment}</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    {texts.bockAlignmentDesc}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'text-right' : ''}>{texts.accreditationProcess}</CardTitle>
              <CardDescription className={language === 'ar' ? 'text-right' : ''}>{texts.stepsToAccredit}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className={`absolute top-0 bottom-0 w-0.5 bg-gray-200 ${language === 'ar' ? 'right-6' : 'left-6'}`} />
                <div className="space-y-6">
                  {[
                    { step: 1, title: texts.step1Title, description: texts.step1Desc, icon: FileText },
                    { step: 2, title: texts.step2Title, description: texts.step2Desc, icon: Target },
                    { step: 3, title: texts.step3Title, description: texts.step3Desc, icon: Clock },
                    { step: 4, title: texts.step4Title, description: texts.step4Desc, icon: FileCheck },
                    { step: 5, title: texts.step5Title, description: texts.step5Desc, icon: CheckCircle },
                    { step: 6, title: texts.step6Title, description: texts.step6Desc, icon: Award },
                  ].map((item) => (
                    <div key={item.step} className={`relative ${language === 'ar' ? 'pr-14 text-right' : 'pl-14'}`}>
                      <div className={`absolute w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium ${language === 'ar' ? 'right-4 translate-x-1/2' : 'left-4 -translate-x-1/2'}`}>
                        {item.step}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{item.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Required Documents Alert */}
          {guidelines?.some(g => g.is_required) && (
            <Alert>
              <AlertCircle className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              <AlertTitle>{texts.requiredReading}</AlertTitle>
              <AlertDescription>
                {texts.requiredReadingDesc}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Document Category Tabs */}
        {(["policy", "template", "guide", "logo", "format"] as GuidelineCategory[]).map(category => (
          <TabsContent key={category} value={category} className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  {categoryIcons[category]}
                  {categoryLabels[category]}
                </CardTitle>
                <CardDescription className={language === 'ar' ? 'text-right' : ''}>{categoryDescriptions[category]}</CardDescription>
              </CardHeader>
              <CardContent>
                {renderDocumentList(category)}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* PDC Calculation Tab */}
        <TabsContent value="pdc" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <Target className="h-5 w-5" />
                {texts.pdcCalculationRules}
              </CardTitle>
              <CardDescription className={language === 'ar' ? 'text-right' : ''}>
                {texts.pdcCalculationDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pdcCalculationRules.map((rule, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className={`flex items-start justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <div className={language === 'ar' ? 'text-right' : ''}>
                        <h4 className="font-medium text-gray-900">{rule.type}</h4>
                        <p className="text-sm text-gray-500">{rule.description}</p>
                      </div>
                      <Badge variant="outline">{rule.rule}</Badge>
                    </div>
                    <div className={`mt-3 p-2 bg-gray-50 rounded text-sm ${language === 'ar' ? 'text-right' : ''}`}>
                      <span className="font-medium">{texts.example}:</span> {rule.example}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'text-right' : ''}>{texts.pdcLimitsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 border rounded-lg ${language === 'ar' ? 'text-right' : ''}`}>
                  <h4 className="font-medium text-gray-900 mb-2">{texts.maxPdcsPerProgram}</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• {texts.singleDayMax}</li>
                    <li>• {texts.multiDayMax}</li>
                    <li>• {texts.selfPacedMax}</li>
                  </ul>
                </div>
                <div className={`p-4 border rounded-lg ${language === 'ar' ? 'text-right' : ''}`}>
                  <h4 className="font-medium text-gray-900 mb-2">{texts.whatDoesntCount}</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• {texts.breaksAndMeals}</li>
                    <li>• {texts.registrationTime}</li>
                    <li>• {texts.vendorSales}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <HelpCircle className="h-5 w-5" />
                {texts.faqTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className={language === 'ar' ? 'text-right' : 'text-left'}>
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className={`text-gray-600 ${language === 'ar' ? 'text-right' : ''}`}>
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-6">
              <div className="text-center">
                <HelpCircle className="h-8 w-8 mx-auto text-blue-600 mb-3" />
                <h3 className="font-medium text-blue-900 mb-2">{texts.stillHaveQuestions}</h3>
                <p className="text-sm text-blue-700 mb-4">
                  {texts.supportTeamHelp}
                </p>
                <div className={`flex justify-center gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <Button variant="outline">
                    <ExternalLink className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                    {texts.contactSupport}
                  </Button>
                  <Button>
                    {texts.scheduleCall}
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
