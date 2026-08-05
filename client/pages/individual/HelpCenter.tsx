import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  BookOpen,
  Award,
  FileText,
  User,
  Wrench,
  Rocket,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  ExternalLink,
  Clock,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Help Center Page for Individual Users
 *
 * Provides comprehensive help resources including:
 * - Searchable knowledge base
 * - Category-based navigation
 * - FAQ accordion
 * - Support ticket creation
 */

interface HelpCategory {
  id: string;
  icon: any;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  articleCount: number;
  color: string;
}

interface FAQItem {
  id: string;
  category: string;
  question: string;
  questionAr: string;
  answer: string;
  answerAr: string;
}

const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'certification',
    icon: Award,
    title: 'Certification',
    titleAr: 'الشهادات',
    description: 'Learn about CP & SCP certifications',
    descriptionAr: 'تعرف على شهادات CP و SCP',
    articleCount: 8,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    id: 'exams',
    icon: BookOpen,
    title: 'Exams & Testing',
    titleAr: 'الامتحانات',
    description: 'Exam registration and procedures',
    descriptionAr: 'التسجيل في الامتحانات والإجراءات',
    articleCount: 12,
    color: 'text-green-600 bg-green-50',
  },
  {
    id: 'pdc',
    icon: FileText,
    title: 'PDC Management',
    titleAr: 'إدارة PDC',
    description: 'Professional Development Credits',
    descriptionAr: 'وحدات التطوير المهني',
    articleCount: 6,
    color: 'text-royal-600 bg-purple-50',
  },
  {
    id: 'account',
    icon: User,
    title: 'Account Settings',
    titleAr: 'إعدادات الحساب',
    description: 'Manage your profile and preferences',
    descriptionAr: 'إدارة ملفك الشخصي والتفضيلات',
    articleCount: 10,
    color: 'text-orange-600 bg-orange-50',
  },
  {
    id: 'technical',
    icon: Wrench,
    title: 'Technical Support',
    titleAr: 'الدعم الفني',
    description: 'Troubleshooting and technical issues',
    descriptionAr: 'حل المشاكل والقضايا الفنية',
    articleCount: 5,
    color: 'text-red-600 bg-red-50',
  },
  {
    id: 'getting-started',
    icon: Rocket,
    title: 'Getting Started',
    titleAr: 'البدء',
    description: 'New to BDA? Start here',
    descriptionAr: 'جديد في BDA؟ ابدأ هنا',
    articleCount: 7,
    color: 'text-royal-600 bg-indigo-50',
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    id: '1',
    category: 'certification',
    question: 'What is the difference between CP and SCP certifications?',
    questionAr: 'ما الفرق بين شهادتي CP و SCP؟',
    answer: 'The Certified Professional (CP) is the foundational certification covering 8 BoCK domains. The Senior Certified Professional (SCP) is an advanced certification that includes all CP domains plus 4 additional advanced domains (Strategic Planning, Organisational Development, Change Management, and Advanced Leadership).',
    answerAr: 'الاحترافي المعتمد (CP) هو الشهادة الأساسية التي تغطي 8 مجالات BoCK. بينما الاحترافي المعتمد الأول (SCP) هو شهادة متقدمة تشمل جميع مجالات CP بالإضافة إلى 4 مجالات متقدمة إضافية (التخطيط الاستراتيجي، التطوير التنظيمي، إدارة التغيير، والقيادة المتقدمة).',
  },
  {
    id: '2',
    category: 'certification',
    question: 'How long is my certification valid?',
    questionAr: 'ما هي مدة صلاحية شهادتي؟',
    answer: 'BDA certifications are valid for 3 years from the date of issuance. To maintain your certification, you must complete the required Professional Development Credits (PDCs) and apply for recertification before expiration.',
    answerAr: 'شهادات BDA صالحة لمدة 3 سنوات من تاريخ الإصدار. للحفاظ على شهادتك، يجب عليك إكمال وحدات التطوير المهني (PDCs) المطلوبة والتقدم بطلب لتجديد الشهادة قبل انتهاء صلاحيتها.',
  },
  {
    id: '3',
    category: 'exams',
    question: 'How do I register for an exam?',
    questionAr: 'كيف أسجل للامتحان؟',
    answer: 'To register for an exam: 1) Log in to your account, 2) Navigate to "Exam Applications", 3) Select your desired certification (CP or SCP), 4) Choose an exam date and location, 5) Complete payment, 6) Receive your exam voucher via email.',
    answerAr: 'للتسجيل في الامتحان: 1) قم بتسجيل الدخول إلى حسابك، 2) انتقل إلى "طلبات الامتحان"، 3) اختر الشهادة المطلوبة (CP أو SCP)، 4) اختر تاريخ ومكان الامتحان، 5) أكمل الدفع، 6) استلم قسيمة الامتحان عبر البريد الإلكتروني.',
  },
  {
    id: '4',
    category: 'exams',
    question: 'What is the exam format and duration?',
    questionAr: 'ما هو شكل الامتحان ومدته؟',
    answer: 'CP exam: 150 multiple-choice questions, 3 hours. SCP exam: 170 multiple-choice questions, 3.5 hours. Both exams are computer-based and can be taken at authorised testing centers or online with proctoring.',
    answerAr: 'امتحان CP: 150 سؤال اختيار من متعدد، 3 ساعات. امتحان SCP: 170 سؤال اختيار من متعدد، 3.5 ساعة. كلا الامتحانين قائم على الكمبيوتر ويمكن إجراؤه في مراكز الاختبار المعتمدة أو عبر الإنترنت مع المراقبة.',
  },
  {
    id: '5',
    category: 'exams',
    question: 'When will I receive my exam results?',
    questionAr: 'متى سأحصل على نتائج الامتحان؟',
    answer: 'Preliminary results are available immediately after completing the exam. Official results and certificates are issued within 5-7 business days after verification.',
    answerAr: 'النتائج الأولية متاحة فورًا بعد إكمال الامتحان. يتم إصدار النتائج الرسمية والشهادات في غضون 5-7 أيام عمل بعد التحقق.',
  },
  {
    id: '6',
    category: 'pdc',
    question: 'What are PDCs and why do I need them?',
    questionAr: 'ما هي PDCs ولماذا أحتاجها؟',
    answer: 'Professional Development Credits (PDCs) are units that measure your continuing professional development activities. You need to earn 60 PDCs over 3 years to maintain your certification. Activities include training, conferences, publications, and volunteer work.',
    answerAr: 'وحدات التطوير المهني (PDCs) هي وحدات تقيس أنشطة التطوير المهني المستمر. تحتاج إلى كسب 60 PDC على مدى 3 سنوات للحفاظ على شهادتك. تشمل الأنشطة التدريب والمؤتمرات والمنشورات والعمل التطوعي.',
  },
  {
    id: '7',
    category: 'pdc',
    question: 'How do I submit PDCs?',
    questionAr: 'كيف أقدم PDCs؟',
    answer: 'Go to "PDCs" section in your dashboard, click "Submit PDC", select the activity category, upload supporting documents (certificates, attendance proof), and submit for review. Approved PDCs are added to your account within 10 business days.',
    answerAr: 'انتقل إلى قسم "PDCs" في لوحة التحكم، انقر على "تقديم PDC"، اختر فئة النشاط، قم بتحميل المستندات الداعمة (الشهادات، إثبات الحضور)، وقدم للمراجعة. يتم إضافة PDCs المعتمدة إلى حسابك في غضون 10 أيام عمل.',
  },
  {
    id: '8',
    category: 'account',
    question: 'How do I update my profile information?',
    questionAr: 'كيف أحدث معلومات ملفي الشخصي؟',
    answer: 'Click on your profile icon, select "Profile Settings", update your information (name, contact details, photo), and click "Save Changes". Some fields may require verification for security purposes.',
    answerAr: 'انقر على أيقونة ملفك الشخصي، اختر "إعدادات الملف الشخصي"، قم بتحديث معلوماتك (الاسم، تفاصيل الاتصال، الصورة)، وانقر على "حفظ التغييرات". قد تتطلب بعض الحقول التحقق لأغراض أمنية.',
  },
  {
    id: '9',
    category: 'account',
    question: 'I forgot my password. How can I reset it?',
    questionAr: 'نسيت كلمة المرور. كيف يمكنني إعادة تعيينها؟',
    answer: 'On the login page, click "Forgot Password?", enter your registered email address, check your inbox for a password reset link, click the link, and create a new password. The reset link is valid for 24 hours.',
    answerAr: 'في صفحة تسجيل الدخول، انقر على "نسيت كلمة المرور؟"، أدخل عنوان بريدك الإلكتروني المسجل، تحقق من بريدك الوارد للحصول على رابط إعادة تعيين كلمة المرور، انقر على الرابط، وأنشئ كلمة مرور جديدة. رابط إعادة التعيين صالح لمدة 24 ساعة.',
  },
  {
    id: '10',
    category: 'technical',
    question: 'The website is not loading properly. What should I do?',
    questionAr: 'الموقع لا يتم تحميله بشكل صحيح. ماذا يجب أن أفعل؟',
    answer: 'Try these steps: 1) Clear your browser cache and cookies, 2) Try a different browser (Chrome, Firefox, Safari), 3) Disable browser extensions, 4) Check your internet connection, 5) If the issue persists, contact technical support with your browser details and error messages.',
    answerAr: 'جرب هذه الخطوات: 1) امسح ذاكرة التخزين المؤقت وملفات تعريف الارتباط في متصفحك، 2) جرب متصفح مختلف (Chrome، Firefox، Safari)، 3) قم بتعطيل إضافات المتصفح، 4) تحقق من اتصالك بالإنترنت، 5) إذا استمرت المشكلة، اتصل بالدعم الفني مع تفاصيل المتصفح ورسائل الخطأ.',
  },
  {
    id: '11',
    category: 'getting-started',
    question: 'I am new to BDA. Where should I start?',
    questionAr: 'أنا جديد في BDA. من أين أبدأ؟',
    answer: 'Welcome to BDA! Start by: 1) Completing your profile, 2) Review the BoCK framework, 3) Explore certification paths (CP or SCP), 4) Take free practice quizzes, 5) Review exam preparation resources, 6) Join our community forums to connect with other professionals.',
    answerAr: 'مرحبًا بك في BDA! ابدأ بـ: 1) إكمال ملفك الشخصي، 2) مراجعة إطار BoCK، 3) استكشاف مسارات الشهادات (CP أو SCP)، 4) إجراء اختبارات تدريبية مجانية، 5) مراجعة موارد التحضير للامتحان، 6) انضم إلى منتديات مجتمعنا للتواصل مع المحترفين الآخرين.',
  },
  {
    id: '12',
    category: 'getting-started',
    question: 'What study materials are available?',
    questionAr: 'ما هي المواد الدراسية المتاحة؟',
    answer: 'BDA provides: Official BoCK Guide (digital and print), Practice exams, Video tutorials, Webinars, Case studies, and Study groups. All materials are available in the "Resources" section of your dashboard.',
    answerAr: 'توفر BDA: دليل BoCK الرسمي (رقمي ومطبوع)، امتحانات تدريبية، دروس فيديو، ندوات عبر الإنترنت، دراسات حالة، ومجموعات دراسية. جميع المواد متاحة في قسم "الموارد" في لوحة التحكم الخاصة بك.',
  },
];

export default function HelpCenter() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter FAQs based on search and category
  const filteredFAQs = FAQ_ITEMS.filter((faq) => {
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.questionAr.includes(searchQuery) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (id: string) => {
    const newExpanded = new Set(expandedFAQ);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFAQ(newExpanded);
  };

  const expandAll = () => {
    setExpandedFAQ(new Set(filteredFAQs.map((faq) => faq.id)));
  };

  const collapseAll = () => {
    setExpandedFAQ(new Set());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-sky-500 via-royal-600 to-navy-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">
            {isArabic ? 'كيف يمكننا مساعدتك؟' : 'How can we help you?'}
          </h1>
          <p className="text-blue-100 text-lg mb-8">
            {isArabic
              ? 'ابحث في قاعدة المعرفة أو تصفح الفئات'
              : 'Search our knowledge base or browse categories'}
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isArabic ? 'ابحث عن المساعدة...' : 'Search for help...'
              }
              className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Help Categories */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {isArabic ? 'تصفح حسب الفئة' : 'Browse by Category'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {HELP_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    'p-6 rounded-lg border-2 transition-all text-left hover:shadow-lg',
                    selectedCategory === category.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center mb-4', category.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {isArabic ? category.titleAr : category.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {isArabic ? category.descriptionAr : category.description}
                  </p>
                  <div className="text-sm text-gray-500">
                    {category.articleCount} {isArabic ? 'مقالة' : 'articles'}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {isArabic ? '← عرض جميع الفئات' : '← Show all categories'}
            </button>
          )}
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isArabic ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={expandAll}
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                {isArabic ? 'توسيع الكل' : 'Expand All'}
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={collapseAll}
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                {isArabic ? 'طي الكل' : 'Collapse All'}
              </button>
            </div>
          </div>

          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">
                {isArabic
                  ? 'لم يتم العثور على نتائج. جرب مصطلح بحث مختلف.'
                  : 'No results found. Try a different search term.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFAQs.map((faq) => {
                const isExpanded = expandedFAQ.has(faq.id);
                return (
                  <div
                    key={faq.id}
                    className="bg-white rounded-lg border border-gray-200"
                  >
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900 pr-4">
                        {isArabic ? faq.questionAr : faq.question}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-5 text-gray-700 leading-relaxed border-t pt-4">
                        {isArabic ? faq.answerAr : faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Still Need Help Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 mb-16 border border-blue-100">
          <div className="max-w-3xl mx-auto text-center">
            <MessageCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {isArabic ? 'لا تزال بحاجة إلى مساعدة؟' : 'Still need help?'}
            </h2>
            <p className="text-gray-700 mb-6">
              {isArabic
                ? 'لم تجد ما تبحث عنه؟ فريق الدعم لدينا هنا لمساعدتك.'
                : "Can't find what you're looking for? Our support team is here to help."}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <button
                onClick={() => navigate('/support/new')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                {isArabic ? 'إنشاء تذكرة دعم' : 'Create Support Ticket'}
              </button>
              <a
                href="mailto:support@bda.com"
                className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium border border-gray-300 flex items-center gap-2"
              >
                <Mail className="h-5 w-5" />
                {isArabic ? 'البريد الإلكتروني للدعم' : 'Email Support'}
              </a>
            </div>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {isArabic ? 'وقت الاستجابة: 24 ساعة' : 'Response time: 24 hours'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span>
                  {isArabic ? 'متوفر: 24/7' : 'Available: 24/7'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Resources */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {isArabic ? 'موارد إضافية' : 'Additional Resources'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <a
              href="#"
              className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <BookOpen className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                {isArabic ? 'دليل BoCK' : 'BoCK Guide'}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {isArabic ? 'الدليل الرسمي الكامل' : 'Complete official guide'}
              </p>
              <span className="text-sm text-blue-600 flex items-center gap-1">
                {isArabic ? 'تنزيل' : 'Download'}
                <ExternalLink className="h-3 w-3" />
              </span>
            </a>

            <a
              href="#"
              className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <FileText className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                {isArabic ? 'دليل الدراسة' : 'Study Guide'}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {isArabic ? 'موارد التحضير للامتحان' : 'Exam preparation resources'}
              </p>
              <span className="text-sm text-blue-600 flex items-center gap-1">
                {isArabic ? 'عرض' : 'View'}
                <ExternalLink className="h-3 w-3" />
              </span>
            </a>

            <a
              href="#"
              className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <Rocket className="h-8 w-8 text-royal-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                {isArabic ? 'دروس الفيديو' : 'Video Tutorials'}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {isArabic ? 'تعلم بالفيديو' : 'Learn with video'}
              </p>
              <span className="text-sm text-blue-600 flex items-center gap-1">
                {isArabic ? 'مشاهدة' : 'Watch'}
                <ExternalLink className="h-3 w-3" />
              </span>
            </a>

            <a
              href="#"
              className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <MessageCircle className="h-8 w-8 text-orange-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                {isArabic ? 'المنتدى المجتمعي' : 'Community Forum'}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {isArabic ? 'تواصل مع الأعضاء' : 'Connect with members'}
              </p>
              <span className="text-sm text-blue-600 flex items-center gap-1">
                {isArabic ? 'انضم' : 'Join'}
                <ExternalLink className="h-3 w-3" />
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

HelpCenter.displayName = 'HelpCenter';
