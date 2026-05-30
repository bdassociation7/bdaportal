/**
 * PDP Support Center
 *
 * Contact support, submit tickets, access FAQs
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  HelpCircle,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  Send,
  FileText,
  AlertCircle,
  BookOpen,
  ExternalLink,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

// =============================================================================
// Translations
// =============================================================================
const translations = {
  en: {
    // Page header
    pageTitle: "Support Center",
    pageDescription: "Get help with your PDP partnership and programs",

    // Quick Actions
    submitTicket: "Submit a Ticket",
    createSupportRequest: "Create a support request",
    emailSupport: "Email Support",
    phoneSupport: "Phone Support",
    sendEmail: "Send Email",
    businessHours: "Mon-Fri, 9am-5pm EST",

    // Response Times
    responseTimes: "Response Times",
    urgent: "Urgent",
    high: "High",
    medium: "Medium",
    low: "Low",
    hours4: "4 hours",
    hours8: "8 hours",
    hours24: "24 hours",
    hours48: "48 hours",

    // FAQ Section
    faqTitle: "Frequently Asked Questions",
    faqDescription: "Find answers to common questions",
    searchFaqs: "Search FAQs...",
    noFaqsMatch: "No FAQs match your search",
    clearSearch: "Clear search",

    // FAQ Categories
    catProgramSubmission: "Program Submission",
    catProgramSlots: "Program Slots",
    catPdcCredits: "PDC Credits",
    catLicenseRenewal: "License & Renewal",
    catAnnualReports: "Annual Reports",

    // Resources
    helpfulResources: "Helpful Resources",
    accreditationGuidelines: "Accreditation Guidelines",
    accreditationGuidelinesDesc: "Program requirements and standards",
    bockCompetencyRef: "BoCK Competency Reference",
    bockCompetencyRefDesc: "Complete competency guide",
    partnerToolkit: "Partner Toolkit",
    partnerToolkitDesc: "Logos, templates, and marketing materials",
    licenseAgreements: "License & Agreements",
    licenseAgreementsDesc: "View your license and request changes",

    // Submit Ticket Dialog
    submitSupportTicket: "Submit Support Ticket",
    ticketDialogDesc: "Describe your issue and we'll get back to you as soon as possible",
    category: "Category",
    priority: "Priority",
    subject: "Subject",
    message: "Message",
    selectCategory: "Select category",
    subjectPlaceholder: "Brief description of your issue",
    messagePlaceholder: "Please provide as much detail as possible...",
    urgentCallNote: "For urgent issues affecting live training sessions, please call our support line directly.",
    cancel: "Cancel",
    submitTicketBtn: "Submit Ticket",

    // Support categories
    catProgramSubmissionVal: "Program Submission",
    catProgramSlotsVal: "Program Slots",
    catPdcCreditsVal: "PDC Credits",
    catLicenseRenewalVal: "License & Renewal",
    catTechnicalIssue: "Technical Issue",
    catBilling: "Billing & Payments",
    catOther: "Other",

    // Priorities
    priorityLow: "Low - General inquiry",
    priorityMedium: "Medium - Need assistance",
    priorityHigh: "High - Affecting operations",
    priorityUrgent: "Urgent - Critical issue",

    // Toast messages
    missingFields: "Missing Fields",
    fillAllFields: "Please fill in all required fields",
    ticketSubmitted: "Ticket Submitted",
    ticketSubmittedDesc: "Your support request has been submitted. We'll respond within 24-48 hours.",

    // FAQ Content - Program Submission
    faq1Q: "How do I submit a new program for accreditation?",
    faq1A: "Navigate to Programs > Submit New Program. Fill in all required fields including program details, BoCK competency mapping, and PDC credit information. Click 'Submit for Review' when complete.",
    faq2Q: "What are the BoCK competencies and how do I map them?",
    faq2A: "BoCK (Body of Competency & Knowledge) consists of 14 competencies: 7 Behavioural (BC01-BC07) and 7 Knowledge-based (KC01-KC07). When submitting a program, select primary competencies that your program directly addresses and secondary ones that are covered partially.",
    faq3Q: "How long does program approval take?",
    faq3A: "Programs are typically auto-approved upon submission if they meet all requirements. However, programs flagged for manual review may take 3-5 business days. You'll receive email notifications about your program status.",
    faq4Q: "Can I edit a program after submission?",
    faq4A: "You can edit programs with 'Draft' status freely. Once submitted, you can request modifications through the program details page. Approved programs require a formal amendment request.",

    // FAQ Content - Program Slots
    faq5Q: "What are program slots?",
    faq5A: "Program slots represent the maximum number of active programs you can have as a PDP partner. This limit is set by BDA administration and typically ranges from 5-12 programs based on your partnership tier.",
    faq6Q: "How do I request additional program slots?",
    faq6A: "Go to License & Program Slots page and click 'Request More Slots'. Provide justification for why you need additional slots. Requests are reviewed by BDA administration within 5 business days.",
    faq7Q: "What counts toward my slot limit?",
    faq7A: "Only active programs count toward your slot limit. Draft programs, expired programs, and rejected programs don't count. When you deactivate or archive a program, that slot becomes available again.",

    // FAQ Content - PDC Credits
    faq8Q: "How are PDC credits calculated?",
    faq8A: "PDC credits are based on contact hours: 1 PDC per hour of instruction for classroom and virtual training. Self-paced learning is calculated based on estimated completion time. Maximum 8 PDCs per day for in-person training.",
    faq9Q: "When do participants receive their PDC credits?",
    faq9A: "Participants receive PDC credits after you record their completion in the Enrolments section. Credits are automatically added to their BDA profile if they're registered members.",
    faq10Q: "Can PDC credits be awarded retroactively?",
    faq10A: "PDC credits can only be awarded for program completions that occur after the program is approved. Completions before approval are not eligible for PDC credits.",

    // FAQ Content - License & Renewal
    faq11Q: "When should I renew my PDP license?",
    faq11A: "We recommend submitting renewal requests 60 days before expiration. You'll receive automated reminders at 90, 60, and 30 days before expiry. Expired licenses cannot submit new programs.",
    faq12Q: "What happens if my license expires?",
    faq12A: "Expired licenses lose the ability to submit new programs and report new completions. Existing approved programs remain visible but marked as 'Provider License Expired'. Participants cannot earn PDCs from expired provider programs.",
    faq13Q: "How do I update my partnership information?",
    faq13A: "For minor updates (contact info, address), use the Edit Profile section. For significant changes (company name, ownership), submit a formal request through the License page or contact support.",

    // FAQ Content - Annual Reports
    faq14Q: "When is the annual report due?",
    faq14A: "Annual reports for the previous calendar year are due by January 31st. You'll receive reminders starting in early January.",
    faq15Q: "What information is required in the annual report?",
    faq15A: "The report includes: total programs delivered, participant counts, completion rates, PDC credits issued, satisfaction scores (if collected), challenges faced, and planned improvements.",
    faq16Q: "What if I miss the annual report deadline?",
    faq16A: "Late submissions may result in a warning for first offense. Repeated late submissions or non-submission can affect your partnership status and program submission privileges.",
  },
  ar: {
    // Page header
    pageTitle: "مركز الدعم",
    pageDescription: "احصل على المساعدة لشراكتك وبرامجك كـ PDP",

    // Quick Actions
    submitTicket: "إرسال تذكرة دعم",
    createSupportRequest: "إنشاء طلب دعم",
    emailSupport: "الدعم عبر البريد الإلكتروني",
    phoneSupport: "الدعم الهاتفي",
    sendEmail: "إرسال بريد إلكتروني",
    businessHours: "الإثنين-الجمعة، 9ص-5م بتوقيت شرق أمريكا",

    // Response Times
    responseTimes: "أوقات الاستجابة",
    urgent: "عاجل",
    high: "مرتفع",
    medium: "متوسط",
    low: "منخفض",
    hours4: "4 ساعات",
    hours8: "8 ساعات",
    hours24: "24 ساعة",
    hours48: "48 ساعة",

    // FAQ Section
    faqTitle: "الأسئلة الشائعة",
    faqDescription: "ابحث عن إجابات للأسئلة الشائعة",
    searchFaqs: "البحث في الأسئلة الشائعة...",
    noFaqsMatch: "لا توجد أسئلة تطابق بحثك",
    clearSearch: "مسح البحث",

    // FAQ Categories
    catProgramSubmission: "تقديم البرامج",
    catProgramSlots: "فتحات البرامج",
    catPdcCredits: "نقاط PDC",
    catLicenseRenewal: "الترخيص والتجديد",
    catAnnualReports: "التقارير السنوية",

    // Resources
    helpfulResources: "موارد مفيدة",
    accreditationGuidelines: "إرشادات الاعتماد",
    accreditationGuidelinesDesc: "متطلبات ومعايير البرامج",
    bockCompetencyRef: "مرجع كفاءات BoCK",
    bockCompetencyRefDesc: "دليل الكفاءات الشامل",
    partnerToolkit: "حزمة أدوات الشريك",
    partnerToolkitDesc: "الشعارات والقوالب والمواد التسويقية",
    licenseAgreements: "الترخيص والاتفاقيات",
    licenseAgreementsDesc: "عرض ترخيصك وطلب التغييرات",

    // Submit Ticket Dialog
    submitSupportTicket: "إرسال تذكرة دعم",
    ticketDialogDesc: "صِف مشكلتك وسنرد عليك في أقرب وقت ممكن",
    category: "الفئة",
    priority: "الأولوية",
    subject: "الموضوع",
    message: "الرسالة",
    selectCategory: "اختر الفئة",
    subjectPlaceholder: "وصف مختصر لمشكلتك",
    messagePlaceholder: "يرجى تقديم أكبر قدر ممكن من التفاصيل...",
    urgentCallNote: "للمشاكل العاجلة التي تؤثر على جلسات التدريب المباشرة، يرجى الاتصال بخط الدعم مباشرة.",
    cancel: "إلغاء",
    submitTicketBtn: "إرسال التذكرة",

    // Support categories
    catProgramSubmissionVal: "تقديم البرامج",
    catProgramSlotsVal: "فتحات البرامج",
    catPdcCreditsVal: "نقاط PDC",
    catLicenseRenewalVal: "الترخيص والتجديد",
    catTechnicalIssue: "مشكلة تقنية",
    catBilling: "الفوترة والمدفوعات",
    catOther: "أخرى",

    // Priorities
    priorityLow: "منخفض - استفسار عام",
    priorityMedium: "متوسط - أحتاج مساعدة",
    priorityHigh: "مرتفع - يؤثر على العمليات",
    priorityUrgent: "عاجل - مشكلة حرجة",

    // Toast messages
    missingFields: "حقول ناقصة",
    fillAllFields: "يرجى ملء جميع الحقول المطلوبة",
    ticketSubmitted: "تم إرسال التذكرة",
    ticketSubmittedDesc: "تم إرسال طلب الدعم الخاص بك. سنرد خلال 24-48 ساعة.",

    // FAQ Content - Program Submission
    faq1Q: "كيف أقدم برنامجاً جديداً للاعتماد؟",
    faq1A: "انتقل إلى البرامج > تقديم برنامج جديد. املأ جميع الحقول المطلوبة بما في ذلك تفاصيل البرنامج وربط كفاءات BoCK ومعلومات نقاط PDC. انقر 'تقديم للمراجعة' عند الانتهاء.",
    faq2Q: "ما هي كفاءات BoCK وكيف أربطها؟",
    faq2A: "يتكون BoCK (مجموعة الكفاءات والمعارف) من 14 كفاءة: 7 سلوكية (BC01-BC07) و7 معرفية (KC01-KC07). عند تقديم برنامج، اختر الكفاءات الأساسية التي يتناولها برنامجك مباشرة والثانوية التي يغطيها جزئياً.",
    faq3Q: "كم تستغرق الموافقة على البرنامج؟",
    faq3A: "عادة تتم الموافقة على البرامج تلقائياً عند التقديم إذا استوفت جميع المتطلبات. ومع ذلك، قد تستغرق البرامج المُعلَّمة للمراجعة اليدوية 3-5 أيام عمل. ستتلقى إشعارات بالبريد الإلكتروني حول حالة برنامجك.",
    faq4Q: "هل يمكنني تعديل برنامج بعد التقديم؟",
    faq4A: "يمكنك تعديل البرامج ذات حالة 'مسودة' بحرية. بمجرد التقديم، يمكنك طلب تعديلات من خلال صفحة تفاصيل البرنامج. البرامج المعتمدة تتطلب طلب تعديل رسمي.",

    // FAQ Content - Program Slots
    faq5Q: "ما هي فتحات البرامج؟",
    faq5A: "تمثل فتحات البرامج الحد الأقصى لعدد البرامج النشطة التي يمكنك امتلاكها كشريك PDP. يتم تحديد هذا الحد من قبل إدارة BDA ويتراوح عادة من 5-12 برنامجاً بناءً على مستوى شراكتك.",
    faq6Q: "كيف أطلب فتحات برامج إضافية؟",
    faq6A: "انتقل إلى صفحة الترخيص وفتحات البرامج وانقر 'طلب المزيد من الفتحات'. قدم مبرراً لحاجتك إلى فتحات إضافية. تتم مراجعة الطلبات من قبل إدارة BDA خلال 5 أيام عمل.",
    faq7Q: "ما الذي يُحتسب ضمن حد الفتحات الخاص بي؟",
    faq7A: "فقط البرامج النشطة تُحتسب ضمن حد الفتحات. البرامج المسودة والمنتهية والمرفوضة لا تُحتسب. عند تعطيل أو أرشفة برنامج، تصبح تلك الفتحة متاحة مرة أخرى.",

    // FAQ Content - PDC Credits
    faq8Q: "كيف يتم حساب نقاط PDC؟",
    faq8A: "تعتمد نقاط PDC على ساعات التواصل: نقطة PDC واحدة لكل ساعة تعليم للتدريب في الفصل والافتراضي. يُحسب التعلم الذاتي بناءً على وقت الإكمال المقدر. الحد الأقصى 8 نقاط PDC يومياً للتدريب الحضوري.",
    faq9Q: "متى يحصل المشاركون على نقاط PDC الخاصة بهم؟",
    faq9A: "يحصل المشاركون على نقاط PDC بعد تسجيل إتمامهم في قسم التسجيلات. تُضاف النقاط تلقائياً إلى ملفهم في BDA إذا كانوا أعضاء مسجلين.",
    faq10Q: "هل يمكن منح نقاط PDC بأثر رجعي؟",
    faq10A: "يمكن منح نقاط PDC فقط لإتمامات البرامج التي تحدث بعد الموافقة على البرنامج. الإتمامات قبل الموافقة غير مؤهلة لنقاط PDC.",

    // FAQ Content - License & Renewal
    faq11Q: "متى يجب أن أجدد ترخيص PDP الخاص بي؟",
    faq11A: "نوصي بتقديم طلبات التجديد قبل 60 يوماً من انتهاء الصلاحية. ستتلقى تذكيرات تلقائية قبل 90 و60 و30 يوماً من انتهاء الصلاحية. التراخيص المنتهية لا يمكنها تقديم برامج جديدة.",
    faq12Q: "ماذا يحدث إذا انتهت صلاحية ترخيصي؟",
    faq12A: "تفقد التراخيص المنتهية القدرة على تقديم برامج جديدة والإبلاغ عن إتمامات جديدة. تظل البرامج المعتمدة الموجودة مرئية لكن تُعلَّم بـ 'انتهت صلاحية ترخيص المزود'. لا يمكن للمشاركين كسب نقاط PDC من برامج المزودين منتهية الصلاحية.",
    faq13Q: "كيف أحدث معلومات شراكتي؟",
    faq13A: "للتحديثات البسيطة (معلومات الاتصال، العنوان)، استخدم قسم تعديل الملف الشخصي. للتغييرات الكبيرة (اسم الشركة، الملكية)، قدم طلباً رسمياً من خلال صفحة الترخيص أو اتصل بالدعم.",

    // FAQ Content - Annual Reports
    faq14Q: "متى موعد تسليم التقرير السنوي؟",
    faq14A: "التقارير السنوية للسنة التقويمية السابقة مستحقة بحلول 31 يناير. ستتلقى تذكيرات بدءاً من أوائل يناير.",
    faq15Q: "ما المعلومات المطلوبة في التقرير السنوي؟",
    faq15A: "يتضمن التقرير: إجمالي البرامج المقدمة، أعداد المشاركين، معدلات الإتمام، نقاط PDC الصادرة، درجات الرضا (إن تم جمعها)، التحديات المواجهة، والتحسينات المخطط لها.",
    faq16Q: "ماذا لو فاتني موعد تسليم التقرير السنوي؟",
    faq16A: "قد تؤدي التقديمات المتأخرة إلى تحذير للمخالفة الأولى. التأخيرات المتكررة أو عدم التقديم يمكن أن تؤثر على حالة شراكتك وامتيازات تقديم البرامج.",
  },
};

// Helper function to get FAQs based on language
const getFaqs = (texts: typeof translations.en) => [
  {
    category: texts.catProgramSubmission,
    questions: [
      { question: texts.faq1Q, answer: texts.faq1A },
      { question: texts.faq2Q, answer: texts.faq2A },
      { question: texts.faq3Q, answer: texts.faq3A },
      { question: texts.faq4Q, answer: texts.faq4A },
    ],
  },
  {
    category: texts.catProgramSlots,
    questions: [
      { question: texts.faq5Q, answer: texts.faq5A },
      { question: texts.faq6Q, answer: texts.faq6A },
      { question: texts.faq7Q, answer: texts.faq7A },
    ],
  },
  {
    category: texts.catPdcCredits,
    questions: [
      { question: texts.faq8Q, answer: texts.faq8A },
      { question: texts.faq9Q, answer: texts.faq9A },
      { question: texts.faq10Q, answer: texts.faq10A },
    ],
  },
  {
    category: texts.catLicenseRenewal,
    questions: [
      { question: texts.faq11Q, answer: texts.faq11A },
      { question: texts.faq12Q, answer: texts.faq12A },
      { question: texts.faq13Q, answer: texts.faq13A },
    ],
  },
  {
    category: texts.catAnnualReports,
    questions: [
      { question: texts.faq14Q, answer: texts.faq14A },
      { question: texts.faq15Q, answer: texts.faq15A },
      { question: texts.faq16Q, answer: texts.faq16A },
    ],
  },
];

// Helper function to get support categories based on language
const getSupportCategories = (texts: typeof translations.en) => [
  { value: "program_submission", label: texts.catProgramSubmissionVal },
  { value: "program_slots", label: texts.catProgramSlotsVal },
  { value: "pdc_credits", label: texts.catPdcCreditsVal },
  { value: "license_renewal", label: texts.catLicenseRenewalVal },
  { value: "technical_issue", label: texts.catTechnicalIssue },
  { value: "billing", label: texts.catBilling },
  { value: "other", label: texts.catOther },
];

// Helper function to get priorities based on language
const getPriorities = (texts: typeof translations.en) => [
  { value: "low", label: texts.priorityLow },
  { value: "medium", label: texts.priorityMedium },
  { value: "high", label: texts.priorityHigh },
  { value: "urgent", label: texts.priorityUrgent },
];

interface SupportTicket {
  category: string;
  subject: string;
  message: string;
  priority: string;
}

export default function SupportCenter() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const texts = translations[language];
  const isRTL = language === "ar";

  // Get localized data
  const faqs = getFaqs(texts);
  const supportCategories = getSupportCategories(texts);
  const priorities = getPriorities(texts);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticket, setTicket] = useState<SupportTicket>({
    category: "",
    subject: "",
    message: "",
    priority: "medium",
  });
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmitTicket = async () => {
    if (!ticket.category || !ticket.subject || !ticket.message) {
      toast({
        title: texts.missingFields,
        description: texts.fillAllFields,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast({
      title: texts.ticketSubmitted,
      description: texts.ticketSubmittedDesc,
    });

    setIsSubmitting(false);
    setShowTicketDialog(false);
    setTicket({ category: "", subject: "", message: "", priority: "medium" });
  };

  // Filter FAQs based on search
  const filteredFaqs = searchQuery
    ? faqs.map(category => ({
        ...category,
        questions: category.questions.filter(
          q =>
            q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(category => category.questions.length > 0)
    : faqs;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className={isRTL ? "text-right" : ""}>
        <h1 className="text-2xl font-bold text-gray-900">{texts.pageTitle}</h1>
        <p className="text-gray-600 mt-1">
          {texts.pageDescription}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-blue-200 bg-blue-50"
          onClick={() => setShowTicketDialog(true)}
        >
          <CardContent className="pt-6 text-center">
            <MessageSquare className="h-8 w-8 mx-auto text-blue-600 mb-3" />
            <h3 className="font-semibold text-blue-900">{texts.submitTicket}</h3>
            <p className="text-sm text-blue-700 mt-1">
              {texts.createSupportRequest}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center">
            <Mail className="h-8 w-8 mx-auto text-green-600 mb-3" />
            <h3 className="font-semibold text-green-900">{texts.emailSupport}</h3>
            <p className="text-sm text-green-700 mt-1" dir="ltr">
              pdp-support@bda-global.org
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => window.open("mailto:pdp-support@bda-global.org", "_blank")}
            >
              <Mail className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
              {texts.sendEmail}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-6 text-center">
            <Phone className="h-8 w-8 mx-auto text-purple-600 mb-3" />
            <h3 className="font-semibold text-purple-900">{texts.phoneSupport}</h3>
            <p className="text-sm text-purple-700 mt-1" dir="ltr">
              +1 (800) BDA-HELP
            </p>
            <div className={`flex items-center justify-center gap-1 mt-2 text-xs text-purple-600 ${isRTL ? "flex-row-reverse" : ""}`}>
              <Clock className="h-3 w-3" />
              <span>{texts.businessHours}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Time Info */}
      <Alert className="bg-gray-50">
        <Clock className="h-4 w-4" />
        <AlertTitle>{texts.responseTimes}</AlertTitle>
        <AlertDescription>
          <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
            <div className={isRTL ? "text-right" : ""}>
              <Badge variant="outline" className="text-red-600 border-red-300">{texts.urgent}</Badge>
              <p className="mt-1">{texts.hours4}</p>
            </div>
            <div className={isRTL ? "text-right" : ""}>
              <Badge variant="outline" className="text-orange-600 border-orange-300">{texts.high}</Badge>
              <p className="mt-1">{texts.hours8}</p>
            </div>
            <div className={isRTL ? "text-right" : ""}>
              <Badge variant="outline" className="text-blue-600 border-blue-300">{texts.medium}</Badge>
              <p className="mt-1">{texts.hours24}</p>
            </div>
            <div className={isRTL ? "text-right" : ""}>
              <Badge variant="outline" className="text-gray-600 border-gray-300">{texts.low}</Badge>
              <p className="mt-1">{texts.hours48}</p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className={isRTL ? "text-right" : ""}>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                <HelpCircle className="h-5 w-5" />
                {texts.faqTitle}
              </CardTitle>
              <CardDescription>
                {texts.faqDescription}
              </CardDescription>
            </div>
            <div className="w-64">
              <Input
                placeholder={texts.searchFaqs}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? "text-right" : ""}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{texts.noFaqsMatch}</p>
              <Button
                variant="link"
                onClick={() => setSearchQuery("")}
                className="mt-2"
              >
                {texts.clearSearch}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredFaqs.map((category, categoryIndex) => (
                <div key={categoryIndex}>
                  <h3 className={`font-semibold text-gray-900 mb-3 flex items-center gap-2 ${isRTL ? "flex-row-reverse justify-end" : ""}`}>
                    <Badge variant="outline">{category.category}</Badge>
                  </h3>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((faq, faqIndex) => (
                      <AccordionItem
                        key={faqIndex}
                        value={`${categoryIndex}-${faqIndex}`}
                      >
                        <AccordionTrigger className={isRTL ? "text-right" : "text-left"}>
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className={`text-gray-600 ${isRTL ? "text-right" : ""}`}>
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <BookOpen className="h-5 w-5" />
            {texts.helpfulResources}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/pdp/guidelines"
              className={`flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className={isRTL ? "text-right flex-1" : "flex-1"}>
                <p className="font-medium">{texts.accreditationGuidelines}</p>
                <p className="text-sm text-gray-500">{texts.accreditationGuidelinesDesc}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </a>

            <a
              href="/pdp/competency-mapping"
              className={`flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className={isRTL ? "text-right flex-1" : "flex-1"}>
                <p className="font-medium">{texts.bockCompetencyRef}</p>
                <p className="text-sm text-gray-500">{texts.bockCompetencyRefDesc}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </a>

            <a
              href="/pdp/toolkit"
              className={`flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <FileText className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <div className={isRTL ? "text-right flex-1" : "flex-1"}>
                <p className="font-medium">{texts.partnerToolkit}</p>
                <p className="text-sm text-gray-500">{texts.partnerToolkitDesc}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </a>

            <a
              href="/pdp/license"
              className={`flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <FileText className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div className={isRTL ? "text-right flex-1" : "flex-1"}>
                <p className="font-medium">{texts.licenseAgreements}</p>
                <p className="text-sm text-gray-500">{texts.licenseAgreementsDesc}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Submit Ticket Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className={isRTL ? "text-right" : ""}>
            <DialogTitle>{texts.submitSupportTicket}</DialogTitle>
            <DialogDescription>
              {texts.ticketDialogDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={isRTL ? "text-right block" : ""}>{texts.category} *</Label>
                <Select
                  value={ticket.category}
                  onValueChange={(value) => setTicket({ ...ticket, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={texts.selectCategory} />
                  </SelectTrigger>
                  <SelectContent>
                    {supportCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={isRTL ? "text-right block" : ""}>{texts.priority}</Label>
                <Select
                  value={ticket.priority}
                  onValueChange={(value) => setTicket({ ...ticket, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((pri) => (
                      <SelectItem key={pri.value} value={pri.value}>
                        {pri.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className={isRTL ? "text-right block" : ""}>{texts.subject} *</Label>
              <Input
                value={ticket.subject}
                onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                placeholder={texts.subjectPlaceholder}
                className={isRTL ? "text-right" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label className={isRTL ? "text-right block" : ""}>{texts.message} *</Label>
              <Textarea
                value={ticket.message}
                onChange={(e) => setTicket({ ...ticket, message: e.target.value })}
                placeholder={texts.messagePlaceholder}
                rows={5}
                className={isRTL ? "text-right" : ""}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {texts.urgentCallNote}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className={isRTL ? "flex-row-reverse gap-2" : ""}>
            <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
              {texts.cancel}
            </Button>
            <Button onClick={handleSubmitTicket} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? "ml-2" : "mr-2"}`} />
              ) : (
                <Send className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
              )}
              {texts.submitTicketBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
