/**
 * ECP Help Center
 *
 * Contact support, submit tickets, access FAQs for ECP partners
 * Based on official spec: Technical / Licensing / Exam / Billing categories
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
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

// ============================================================================
// Translations
// ============================================================================

const translations = {
  en: {
    // Page header
    pageTitle: 'Help Center',
    pageSubtitle: 'Get help with your ECP partnership, training, and certification management',
    // Quick actions
    submitTicket: 'Submit a Ticket',
    createSupportRequest: 'Create a support request',
    emailSupport: 'Email Support',
    phoneSupport: 'Phone Support',
    sendEmail: 'Send Email',
    phoneHours: 'Mon-Fri, 9am-5pm EST',
    // Response times
    responseTimes: 'Response Times',
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    hours: 'hours',
    // FAQ
    faqTitle: 'Frequently Asked Questions',
    faqSubtitle: 'Find answers to common questions about ECP operations',
    searchFaqs: 'Search FAQs...',
    noFaqsMatch: 'No FAQs match your search',
    clearSearch: 'Clear search',
    // FAQ Categories
    catCandidateManagement: 'Candidate Management',
    catTrainingBatches: 'Training Batches',
    catCertifiedTrainers: 'Certified Trainers',
    catExamVouchers: 'Exam Vouchers',
    catReportsCompliance: 'Reports & Compliance',
    catLicensePartnership: 'License & Partnership',
    // Resources
    helpfulResources: 'Helpful Resources',
    trainingBatches: 'Training Batches',
    manageTrainingSessions: 'Manage training sessions',
    certifiedTrainers: 'Certified Trainers',
    viewManageTrainers: 'View and manage trainers',
    promotionalToolkit: 'Promotional Toolkit',
    logosTemplatesGuidelines: 'Logos, templates, and guidelines',
    licenseAgreement: 'License & Agreement',
    viewLicenseRenewal: 'View license and request renewal',
    performanceReports: 'Performance Reports',
    generateExportReports: 'Generate and export reports',
    examVouchers: 'Exam Vouchers',
    manageVouchersAssignments: 'Manage voucher requests and assignments',
    // Ticket dialog
    submitSupportTicket: 'Submit Support Ticket',
    ticketDescription: 'Describe your issue and we\'ll get back to you as soon as possible',
    category: 'Category',
    selectCategory: 'Select category',
    priority: 'Priority',
    subject: 'Subject',
    subjectPlaceholder: 'Brief description of your issue',
    message: 'Message',
    messagePlaceholder: 'Please provide as much detail as possible...',
    urgentNote: 'For urgent issues affecting live training sessions or exam access, please call our support line directly.',
    cancel: 'Cancel',
    // Support categories
    catTechnical: 'Technical',
    catLicensing: 'Licencing',
    catExam: 'Exam',
    catBilling: 'Billing',
    // Priorities
    priLow: 'Low - General inquiry',
    priMedium: 'Medium - Need assistance',
    priHigh: 'High - Affecting operations',
    priUrgent: 'Urgent - Critical issue',
    // Toast messages
    missingFields: 'Missing Fields',
    missingFieldsDesc: 'Please fill in all required fields',
    ticketSubmitted: 'Ticket Submitted',
    ticketSubmittedDesc: 'Your support request has been submitted. We\'ll respond within 24-48 hours.',
  },
  ar: {
    // Page header
    pageTitle: 'مركز المساعدة',
    pageSubtitle: 'احصل على المساعدة في شراكة ECP والتدريب وإدارة الشهادات',
    // Quick actions
    submitTicket: 'إرسال تذكرة',
    createSupportRequest: 'إنشاء طلب دعم',
    emailSupport: 'الدعم عبر البريد الإلكتروني',
    phoneSupport: 'الدعم الهاتفي',
    sendEmail: 'إرسال بريد إلكتروني',
    phoneHours: 'الاثنين-الجمعة، 9ص-5م بتوقيت EST',
    // Response times
    responseTimes: 'أوقات الاستجابة',
    urgent: 'عاجل',
    high: 'مرتفع',
    medium: 'متوسط',
    low: 'منخفض',
    hours: 'ساعات',
    // FAQ
    faqTitle: 'الأسئلة الشائعة',
    faqSubtitle: 'اعثر على إجابات للأسئلة الشائعة حول عمليات ECP',
    searchFaqs: 'البحث في الأسئلة الشائعة...',
    noFaqsMatch: 'لا توجد أسئلة شائعة تطابق بحثك',
    clearSearch: 'مسح البحث',
    // FAQ Categories
    catCandidateManagement: 'إدارة المرشحين',
    catTrainingBatches: 'دفعات التدريب',
    catCertifiedTrainers: 'المدربون المعتمدون',
    catExamVouchers: 'قسائم الامتحان',
    catReportsCompliance: 'التقارير والامتثال',
    catLicensePartnership: 'الترخيص والشراكة',
    // Resources
    helpfulResources: 'موارد مفيدة',
    trainingBatches: 'دفعات التدريب',
    manageTrainingSessions: 'إدارة جلسات التدريب',
    certifiedTrainers: 'المدربون المعتمدون',
    viewManageTrainers: 'عرض وإدارة المدربين',
    promotionalToolkit: 'مجموعة أدوات الترويج',
    logosTemplatesGuidelines: 'الشعارات والقوالب والإرشادات',
    licenseAgreement: 'الترخيص والاتفاقية',
    viewLicenseRenewal: 'عرض الترخيص وطلب التجديد',
    performanceReports: 'تقارير الأداء',
    generateExportReports: 'إنشاء وتصدير التقارير',
    examVouchers: 'قسائم الامتحان',
    manageVouchersAssignments: 'إدارة طلبات وتعيينات القسائم',
    // Ticket dialog
    submitSupportTicket: 'إرسال تذكرة دعم',
    ticketDescription: 'صف مشكلتك وسنرد عليك في أقرب وقت ممكن',
    category: 'الفئة',
    selectCategory: 'اختر الفئة',
    priority: 'الأولوية',
    subject: 'الموضوع',
    subjectPlaceholder: 'وصف موجز لمشكلتك',
    message: 'الرسالة',
    messagePlaceholder: 'يرجى تقديم أكبر قدر ممكن من التفاصيل...',
    urgentNote: 'للمشاكل العاجلة التي تؤثر على جلسات التدريب المباشرة أو الوصول إلى الامتحان، يرجى الاتصال بخط الدعم مباشرة.',
    cancel: 'إلغاء',
    // Support categories
    catTechnical: 'تقني',
    catLicensing: 'الترخيص',
    catExam: 'الامتحان',
    catBilling: 'الفوترة',
    // Priorities
    priLow: 'منخفض - استفسار عام',
    priMedium: 'متوسط - بحاجة لمساعدة',
    priHigh: 'مرتفع - يؤثر على العمليات',
    priUrgent: 'عاجل - مشكلة حرجة',
    // Toast messages
    missingFields: 'حقول مفقودة',
    missingFieldsDesc: 'يرجى ملء جميع الحقول المطلوبة',
    ticketSubmitted: 'تم إرسال التذكرة',
    ticketSubmittedDesc: 'تم إرسال طلب الدعم الخاص بك. سنرد خلال 24-48 ساعة.',
  },
};

interface SupportTicket {
  category: string;
  subject: string;
  message: string;
  priority: string;
}

// FAQ data with translations
const getFaqs = (texts: typeof translations.en) => [
  {
    category: texts.catCandidateManagement,
    questions: [
      {
        question: texts === translations.ar ? "كيف أسجل مرشحاً جديداً؟" : "How do I register a new candidate?",
        answer: texts === translations.ar
          ? "انتقل إلى المتدربون > إضافة متدرب. املأ الحقول المطلوبة بما في ذلك الاسم والبريد الإلكتروني وبرنامج الشهادة (CP أو SCP) وتفاصيل الاتصال. يمكنك أيضاً استيراد عدة مرشحين باستخدام قالب CSV المتاح في صفحة المتدربين."
          : "Navigate to Trainees > Add Trainee. Fill in required fields including name, email, certification program (CP or SCP), and contact details. You can also import multiple candidates using the CSV template available on the Trainees page.",
      },
      {
        question: texts === translations.ar ? "ما هو سير عمل حالة المرشح؟" : "What is the candidate status workflow?",
        answer: texts === translations.ar
          ? "يتقدم المرشحون عبر هذه المراحل: مسجل ← قسيمة مفعلة ← امتحان مجدول ← ناجح/راسب. كل مرشح مرتبط تلقائياً ببوابته الشخصية حيث يمكنه تتبع رحلة شهادته."
          : "Candidates progress through these stages: Registered → Voucher Activated → Exam Scheduled → Passed/Failed. Each candidate is automatically linked to their personal portal where they can track their certification journey.",
      },
      {
        question: texts === translations.ar ? "هل يمكنني تعديل معلومات المرشح بعد التسجيل؟" : "Can I edit candidate information after registration?",
        answer: texts === translations.ar
          ? "نعم، يمكنك تعديل تفاصيل المرشح في أي وقت قبل أداء الامتحان. انتقل إلى المتدربين، ابحث عن المرشح، وانقر على تعديل. بعد إكمال الامتحان، يمكن تحديث حقول معينة فقط."
          : "Yes, you can edit candidate details at any time before they take the exam. Navigate to Trainees, find the candidate, and click Edit. After exam completion, only certain fields can be updated.",
      },
      {
        question: texts === translations.ar ? "كيف يصل المرشحون إلى بوابتهم الشخصية؟" : "How do candidates access their personal portal?",
        answer: texts === translations.ar
          ? "يتم إرسال بيانات تسجيل الدخول تلقائياً للمرشحين على بريدهم الإلكتروني المسجل. يمكنهم الوصول إلى بوابتهم الشخصية على portal.bda-global.org باستخدام بريدهم الإلكتروني وكلمة المرور لعرض حالة الامتحان وتاريخ التدريب والشهادات."
          : "Candidates are automatically sent login credentials to their registered email. They can access their personal portal at portal.bda-global.org using their email and password to view exam status, training history, and certificates.",
      },
    ],
  },
  {
    category: texts.catTrainingBatches,
    questions: [
      {
        question: texts === translations.ar ? "كيف أنشئ دفعة تدريب جديدة؟" : "How do I create a new training batch?",
        answer: texts === translations.ar
          ? "اذهب إلى دفعات التدريب > دفعة جديدة. أدخل تفاصيل الدفعة بما في ذلك الاسم ونوع الشهادة (CP/SCP) والتواريخ والمدة والوضع (عبر الإنترنت/حضوري) واللغة والموقع وتعيين مدرب معتمد. يمكنك بعد ذلك إضافة متدربين للدفعة."
          : "Go to Training Batches > New Batch. Enter batch details including name, certification type (CP/SCP), dates, duration, mode (online/in-person), language, location, and assign a certified trainer. You can then add trainees to the batch.",
      },
      {
        question: texts === translations.ar ? "ما الفرق بين تدريب CP و SCP؟" : "What's the difference between CP and SCP training?",
        answer: texts === translations.ar
          ? "CP (المحترف المعتمد) هي الشهادة التأسيسية التي تتطلب 40 ساعة تدريب. SCP (المحترف المعتمد الأول) هو المستوى المتقدم الذي يتطلب شهادة CP بالإضافة إلى 40 ساعة إضافية من التدريب المتخصص."
          : "CP (Certified Professional) is the foundational certification requiring 40 hours of training. SCP (Senior Certified Professional) is the advanced level requiring CP certification plus additional 40 hours of specialised training.",
      },
      {
        question: texts === translations.ar ? "هل يمكنني رفع مواد التدريب والصور؟" : "Can I upload training materials and photos?",
        answer: texts === translations.ar
          ? "نعم، عند تعديل دفعة التدريب يمكنك رفع الصور وتقييمات المشاركين ونماذج التغذية الراجعة ومواد التدريب. هذه تعمل كوثائق وسجلات جودة."
          : "Yes, when editing a training batch you can upload photos, participant evaluations, feedback forms, and training materials. These serve as documentation and quality records.",
      },
      {
        question: texts === translations.ar ? "كيف أضع علامة على دفعة التدريب كمكتملة؟" : "How do I mark a training batch as completed?",
        answer: texts === translations.ar
          ? "انتقل إلى صفحة تفاصيل دفعة التدريب وغير الحالة إلى 'مكتمل'. تأكد من ملء جميع المعلومات المطلوبة بما في ذلك التواريخ الفعلية وعدد المشاركين وتعيين المدرب."
          : "Navigate to the training batch detail page and change the status to 'Completed'. Ensure all required information is filled in including actual dates, participant count, and trainer assignment.",
      },
    ],
  },
  {
    category: texts.catCertifiedTrainers,
    questions: [
      {
        question: texts === translations.ar ? "ما هي متطلبات أن تصبح مدرباً معتمداً؟" : "What are the requirements to become a certified trainer?",
        answer: texts === translations.ar
          ? "يجب على المدربين: (1) اجتياز امتحان SCP، (2) تقديم طلب من خلال نموذج المدرب المعتمد، (3) المراجعة والموافقة من قبل إدارة BDA. فقط المدربون المعتمدون يمكن تعيينهم لتقديم برامج التدريب."
          : "Trainers must: (1) Have passed the SCP exam, (2) Submit an application through the Certified Trainer form, (3) Be reviewed and approved by BDA Admin. Only approved trainers can be assigned to deliver training programs.",
      },
      {
        question: texts === translations.ar ? "كم يستغرق اعتماد المدرب؟" : "How long does trainer approval take?",
        answer: texts === translations.ar
          ? "يتم مراجعة طلبات المدربين عادة خلال 5-7 أيام عمل. ستتلقى إشعاراً بالبريد الإلكتروني عند الموافقة على الطلب أو إذا كانت هناك حاجة لمعلومات إضافية."
          : "Trainer applications are typically reviewed within 5-7 business days. You'll receive an email notification when the application is approved or if additional information is needed.",
      },
      {
        question: texts === translations.ar ? "هل يمكن لمدربين من شركاء آخرين تقديم التدريب لنا؟" : "Can trainers from other partners deliver training for us?",
        answer: texts === translations.ar
          ? "لا، المدربون المعتمدون مرتبطون حصرياً بمنظمة شريكهم. يمكنك فقط تعيين المدربين المعتمدين لشراكة ECP الخاصة بك."
          : "No, certified trainers are exclusively associated with their partner organisation. You can only assign trainers that are approved for your specific ECP partnership.",
      },
      {
        question: texts === translations.ar ? "كيف أضيف مدرباً جديداً لفريقي؟" : "How do I add a new trainer to my team?",
        answer: texts === translations.ar
          ? "اذهب إلى المدربون > إضافة مدرب. أدخل تفاصيلهم بما في ذلك الاسم والبريد الإلكتروني والشهادات الحاصل عليها وتواريخ الشهادات. سيحتاج المدرب لموافقة إدارة BDA قبل تعيينه لدفعات التدريب."
          : "Go to Trainers > Add Trainer. Enter their details including name, email, certifications held, and certification dates. The trainer will need BDA Admin approval before they can be assigned to training batches.",
      },
    ],
  },
  {
    category: texts.catExamVouchers,
    questions: [
      {
        question: texts === translations.ar ? "كيف أشتري قسائم الامتحان؟" : "How do I purchase exam vouchers?",
        answer: texts === translations.ar
          ? "يتم شراء القسائم من متجر BDA (store.bda-global.org). بعد الدفع، تُضاف القسائم تلقائياً لبوابتك. يمكنك بعد ذلك تعيينها للمرشحين المسجلين. كل قسيمة تتضمن الامتحان ومنهج التدريب."
          : "Vouchers are purchased through the BDA Store (store.bda-global.org). After payment, vouchers are automatically added to your portal. You can then assign them to registered candidates. Each voucher includes the exam and training curriculum.",
      },
      {
        question: texts === translations.ar ? "كم مدة صلاحية قسائم الامتحان؟" : "How long are exam vouchers valid?",
        answer: texts === translations.ar
          ? "قسائم الامتحان صالحة لمدة سنة واحدة من تاريخ التفعيل (عند تعيينها لمرشح). القسائم غير المعينة في مجموعتك تبقى صالحة حتى يتم تعيينها."
          : "Exam vouchers are valid for 1 year from the date of activation (when assigned to a candidate). Unassigned vouchers in your pool remain valid until assigned.",
      },
      {
        question: texts === translations.ar ? "هل يمكنني نقل قسيمة بين المرشحين؟" : "Can I transfer a voucher between candidates?",
        answer: texts === translations.ar
          ? "يمكن إعادة تعيين القسائم إذا لم يتم استخدامها بعد. انتقل إلى القسائم، ابحث عن القسيمة، وغير المرشح المعين. بمجرد أن يبدأ المرشح الامتحان أو يكمله، لا يمكن نقل القسيمة."
          : "Vouchers can be reassigned if they haven't been used yet. Navigate to Vouchers, find the voucher, and change the assigned candidate. Once a candidate starts or completes the exam, the voucher cannot be transferred.",
      },
      {
        question: texts === translations.ar ? "ماذا يحدث إذا رسب المرشح في الامتحان؟" : "What happens if a candidate fails the exam?",
        answer: texts === translations.ar
          ? "يمكن للمرشحين الراسبين إعادة الامتحان. سيحتاجون لشراء قسيمة جديدة لإعادة المحاولة. يتحقق النظام تلقائياً إذا استخدموا نفس البريد الإلكتروني وقد يطبق خصومات التجديد إذا كانوا مؤهلين."
          : "Failed candidates can retake the exam. They'll need a new voucher purchase for the retake. The system automatically checks if they used the same email and may apply renewal discounts if eligible.",
      },
    ],
  },
  {
    category: texts.catReportsCompliance,
    questions: [
      {
        question: texts === translations.ar ? "ما هي التقارير التي يمكنني إنشاؤها؟" : "What reports can I generate?",
        answer: texts === translations.ar
          ? "يمكنك إنشاء تقارير أداء مفلترة حسب البرنامج (CP/SCP) والنطاق الزمني والمدرب والموقع. تتضمن التقارير معدلات النجاح وساعات التدريب وتتبع تقدم المرشحين ويمكن تصديرها كملفات PDF أو Excel."
          : "You can generate performance reports filtered by program (CP/SCP), date range, trainer, and location. Reports include success rates, training hours, candidate progress tracking, and can be exported as PDF or Excel files.",
      },
      {
        question: texts === translations.ar ? "ما هي متطلبات التقارير السنوية؟" : "What are the annual reporting requirements?",
        answer: texts === translations.ar
          ? "يجب على شركاء ECP تقديم تقرير نشاط سنوي بحلول 31 يناير من كل عام، يغطي السنة التقويمية السابقة. يتضمن ذلك إجمالي التدريبات المقدمة وأعداد المرشحين ومعدلات الإتمام ومقاييس النجاح."
          : "ECP partners must submit an annual activity report by January 31st each year, covering the previous calendar year. This includes total trainings delivered, candidate counts, completion rates, and success metrics.",
      },
      {
        question: texts === translations.ar ? "كيف أتتبع أداء شراكتي؟" : "How do I track my partnership performance?",
        answer: texts === translations.ar
          ? "تعرض لوحة التحكم مؤشرات الأداء الرئيسية في الوقت الفعلي بما في ذلك المرشحين النشطين والتدريبات المقدمة ومعدلات النجاح والقسائم المستخدمة. يوفر قسم التقارير تحليلات مفصلة للحصول على رؤى أعمق."
          : "Your Dashboard shows real-time KPIs including active candidates, trainings delivered, success rates, and vouchers used. The Reports section provides detailed analytics for deeper insights.",
      },
    ],
  },
  {
    category: texts.catLicensePartnership,
    questions: [
      {
        question: texts === translations.ar ? "متى يجب أن أجدد ترخيص ECP الخاص بي؟" : "When should I renew my ECP license?",
        answer: texts === translations.ar
          ? "نوصي بتقديم طلبات التجديد قبل 60 يوماً من انتهاء الصلاحية. ستتلقى تذكيرات تلقائية قبل 90 و60 و30 يوماً من انتهاء الصلاحية. التراخيص المنتهية تفقد القدرة على تسجيل مرشحين جدد أو إجراء تدريب."
          : "We recommend submitting renewal requests 60 days before expiration. You'll receive automated reminders at 90, 60, and 30 days before expiry. Expired licenses lose the ability to register new candidates or conduct training.",
      },
      {
        question: texts === translations.ar ? "كيف أطلب تحديث نطاق الترخيص؟" : "How do I request a license scope update?",
        answer: texts === translations.ar
          ? "اذهب إلى صفحة الترخيص والاتفاقية وانقر على 'طلب تحديث النطاق'. حدد التغييرات التي تحتاجها (دول إضافية، أنواع برامج، إلخ). ستراجع إدارة BDA وترد خلال 10 أيام عمل."
          : "Go to License & Agreement page and click 'Request Scope Update'. Specify what changes you need (additional countries, program types, etc.). BDA Admin will review and respond within 10 business days.",
      },
      {
        question: texts === translations.ar ? "أين يمكنني تحميل اتفاقية الترخيص الموقعة؟" : "Where can I download my signed license agreement?",
        answer: texts === translations.ar
          ? "انتقل إلى صفحة الترخيص والاتفاقية. وثيقة الترخيص الموقعة متاحة في قسم المستندات. يمكنك تحميلها كملف PDF في أي وقت."
          : "Navigate to License & Agreement page. Your signed license document is available in the Documents section. You can download it as PDF at any time.",
      },
      {
        question: texts === translations.ar ? "ماذا يحدث إذا انتهى ترخيصي؟" : "What happens if my license expires?",
        answer: texts === translations.ar
          ? "التراخيص المنتهية لا يمكنها تسجيل مرشحين جدد أو إجراء جلسات تدريب جديدة أو تعيين قسائم امتحان. يمكن للمرشحين الحاليين الاستمرار في إكمال رحلة شهاداتهم، ولكن الأنشطة الجديدة معلقة حتى التجديد."
          : "Expired licenses cannot register new candidates, conduct new training sessions, or assign exam vouchers. Existing candidates can still complete their certification journey, but new activities are suspended until renewal.",
      },
    ],
  },
];

// Dynamic support categories based on language
const getSupportCategories = (texts: typeof translations.en) => [
  { value: "technical", label: texts.catTechnical },
  { value: "licencing", label: texts.catLicensing },
  { value: "exam", label: texts.catExam },
  { value: "billing", label: texts.catBilling },
];

// Dynamic priorities based on language
const getPriorities = (texts: typeof translations.en) => [
  { value: "low", label: texts.priLow },
  { value: "medium", label: texts.priMedium },
  { value: "high", label: texts.priHigh },
  { value: "urgent", label: texts.priUrgent },
];

export default function ECPHelpCenter() {
  const { language } = useLanguage();
  const texts = translations[language];
  const { toast } = useToast();
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticket, setTicket] = useState<SupportTicket>({
    category: "",
    subject: "",
    message: "",
    priority: "medium",
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Get dynamic data based on language
  const faqs = getFaqs(texts);
  const supportCategories = getSupportCategories(texts);
  const priorities = getPriorities(texts);

  const handleSubmitTicket = async () => {
    if (!ticket.category || !ticket.subject || !ticket.message) {
      toast({
        title: texts.missingFields,
        description: texts.missingFieldsDesc,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    // Simulate API call - in production this would go to the admin ticketing system
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
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${language === 'ar' ? 'from-navy-800 via-royal-600 to-sky-500' : 'from-sky-500 via-royal-600 to-navy-800'} rounded-lg p-6 text-white`}>
        <h1 className={`text-3xl font-bold flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <HelpCircle className="h-8 w-8" />
          {texts.pageTitle}
        </h1>
        <p className={`mt-2 opacity-90 ${language === 'ar' ? 'text-right' : ''}`}>
          {texts.pageSubtitle}
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
              support@bda-global.org
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => window.open("mailto:support@bda-global.org", "_blank")}
            >
              <Mail className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
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
            <div className={`flex items-center justify-center gap-1 mt-2 text-xs text-purple-600 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <Clock className="h-3 w-3" />
              <span>{texts.phoneHours}</span>
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
            <div className="text-center">
              <Badge variant="outline" className="text-red-600 border-red-300">{texts.urgent}</Badge>
              <p className="mt-1">4 {texts.hours}</p>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="text-orange-600 border-orange-300">{texts.high}</Badge>
              <p className="mt-1">8 {texts.hours}</p>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="text-blue-600 border-blue-300">{texts.medium}</Badge>
              <p className="mt-1">24 {texts.hours}</p>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="text-gray-600 border-gray-300">{texts.low}</Badge>
              <p className="mt-1">48 {texts.hours}</p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <div className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <div className={language === 'ar' ? 'text-right' : ''}>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <HelpCircle className="h-5 w-5" />
                {texts.faqTitle}
              </CardTitle>
              <CardDescription>
                {texts.faqSubtitle}
              </CardDescription>
            </div>
            <div className="w-64">
              <Input
                placeholder={texts.searchFaqs}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
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
                  <h3 className={`font-semibold text-gray-900 mb-3 flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <Badge variant="outline">{category.category}</Badge>
                  </h3>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((faq, faqIndex) => (
                      <AccordionItem
                        key={faqIndex}
                        value={`${categoryIndex}-${faqIndex}`}
                      >
                        <AccordionTrigger className={language === 'ar' ? 'text-right' : 'text-left'}>
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className={`text-gray-600 ${language === 'ar' ? 'text-right' : ''}`}>
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
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <BookOpen className="h-5 w-5" />
            {texts.helpfulResources}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/ecp/trainings"
              className={`flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${language === 'ar' ? 'flex-row-reverse' : ''}`}
            >
              <FileText className="h-5 w-5 text-blue-600" />
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className="font-medium">{texts.trainingBatches}</p>
                <p className="text-sm text-gray-500">{texts.manageTrainingSessions}</p>
              </div>
              <ExternalLink className={`h-4 w-4 text-gray-400 ${language === 'ar' ? 'mr-auto' : 'ml-auto'}`} />
            </a>

            <a
              href="/ecp/trainers"
              className={`flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${language === 'ar' ? 'flex-row-reverse' : ''}`}
            >
              <FileText className="h-5 w-5 text-green-600" />
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className="font-medium">{texts.certifiedTrainers}</p>
                <p className="text-sm text-gray-500">{texts.viewManageTrainers}</p>
              </div>
              <ExternalLink className={`h-4 w-4 text-gray-400 ${language === 'ar' ? 'mr-auto' : 'ml-auto'}`} />
            </a>

            <a
              href="/ecp/toolkit"
              className={`flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${language === 'ar' ? 'flex-row-reverse' : ''}`}
            >
              <FileText className="h-5 w-5 text-purple-600" />
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className="font-medium">{texts.promotionalToolkit}</p>
                <p className="text-sm text-gray-500">{texts.logosTemplatesGuidelines}</p>
              </div>
              <ExternalLink className={`h-4 w-4 text-gray-400 ${language === 'ar' ? 'mr-auto' : 'ml-auto'}`} />
            </a>

            <a
              href="/ecp/license"
              className={`flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${language === 'ar' ? 'flex-row-reverse' : ''}`}
            >
              <FileText className="h-5 w-5 text-orange-600" />
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className="font-medium">{texts.licenseAgreement}</p>
                <p className="text-sm text-gray-500">{texts.viewLicenseRenewal}</p>
              </div>
              <ExternalLink className={`h-4 w-4 text-gray-400 ${language === 'ar' ? 'mr-auto' : 'ml-auto'}`} />
            </a>

            <a
              href="/ecp/reports"
              className={`flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${language === 'ar' ? 'flex-row-reverse' : ''}`}
            >
              <FileText className="h-5 w-5 text-indigo-600" />
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className="font-medium">{texts.performanceReports}</p>
                <p className="text-sm text-gray-500">{texts.generateExportReports}</p>
              </div>
              <ExternalLink className={`h-4 w-4 text-gray-400 ${language === 'ar' ? 'mr-auto' : 'ml-auto'}`} />
            </a>

            <a
              href="/ecp/vouchers"
              className={`flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${language === 'ar' ? 'flex-row-reverse' : ''}`}
            >
              <FileText className="h-5 w-5 text-pink-600" />
              <div className={language === 'ar' ? 'text-right' : ''}>
                <p className="font-medium">{texts.examVouchers}</p>
                <p className="text-sm text-gray-500">{texts.manageVouchersAssignments}</p>
              </div>
              <ExternalLink className={`h-4 w-4 text-gray-400 ${language === 'ar' ? 'mr-auto' : 'ml-auto'}`} />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Submit Ticket Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="max-w-lg" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader className={language === 'ar' ? 'text-right' : ''}>
            <DialogTitle>{texts.submitSupportTicket}</DialogTitle>
            <DialogDescription>
              {texts.ticketDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className={`space-y-2 ${language === 'ar' ? 'text-right' : ''}`}>
                <Label>{texts.category} *</Label>
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

              <div className={`space-y-2 ${language === 'ar' ? 'text-right' : ''}`}>
                <Label>{texts.priority}</Label>
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

            <div className={`space-y-2 ${language === 'ar' ? 'text-right' : ''}`}>
              <Label>{texts.subject} *</Label>
              <Input
                value={ticket.subject}
                onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                placeholder={texts.subjectPlaceholder}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>

            <div className={`space-y-2 ${language === 'ar' ? 'text-right' : ''}`}>
              <Label>{texts.message} *</Label>
              <Textarea
                value={ticket.message}
                onChange={(e) => setTicket({ ...ticket, message: e.target.value })}
                placeholder={texts.messagePlaceholder}
                rows={5}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {texts.urgentNote}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className={language === 'ar' ? 'flex-row-reverse gap-2' : ''}>
            <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
              {texts.cancel}
            </Button>
            <Button onClick={handleSubmitTicket} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              ) : (
                <Send className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              )}
              {texts.submitTicket}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
