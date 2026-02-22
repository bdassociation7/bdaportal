import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  Target,
  TrendingUp,
  Filter,
  Award,
  CheckCircle2,
  XCircle,
  Lock,
  Crown,
  Globe,
  ExternalLink,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import { useActiveExams } from '@/entities/mock-exam';
import { useLanguage } from '@/contexts/LanguageContext';
import type {
  ExamCategory,
  ExamDifficulty,
  MockExamWithStats,
  MockExamLanguage,
} from '@/entities/mock-exam';
import {
  EXAM_CATEGORY_LABELS,
  EXAM_DIFFICULTY_LABELS,
  EXAM_DIFFICULTY_COLORS,
  EXAM_LANGUAGE_LABELS,
} from '@/entities/mock-exam';
import { StatusBadge } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';

/**
 * MockExamList Page
 * Displays all available mock exams organized by Free/Premium sections
 */

// WooCommerce store URL for premium exams
const WOOCOMMERCE_STORE_URL = 'https://bda-global.org/en/store/certifications-mock-exams/';

const translations = {
  en: {
    // Header
    title: 'Mock Exams',
    subtitle: 'Practice with realistic exam scenarios and track your progress',
    // Filters
    allCategories: 'All Categories',
    cpExam: 'CP Exam',
    scpExam: 'SCP Exam',
    generalKnowledge: 'General Knowledge',
    allDifficulties: 'All Difficulties',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    allLanguages: 'All Languages',
    english: 'English',
    arabic: 'Arabic',
    // Loading/Error
    loadingExams: 'Loading exams...',
    errorLoading: 'Error loading exams. Please try again.',
    noExamsFound: 'No exams found matching your filters',
    // Sections
    freeMockExams: 'Free Mock Exams',
    freeSubtitle: 'Practice exams available to all registered users',
    premiumMockExams: 'Premium Mock Exams',
    premiumSubtitle: 'Advanced exams requiring purchase from our store',
    // Exam Card
    questions: 'questions',
    minutes: 'minutes',
    toPass: 'to pass',
    purchaseRequired: 'Purchase required to access this exam',
    buyNow: 'Buy Now',
    premiumOwned: 'Premium (Owned)',
    premium: 'Premium',
    yourProgress: 'Your Progress',
    attempts: 'Attempts',
    bestScore: 'Best Score',
    average: 'Average',
    passed: 'Passed',
    notPassedYet: 'Not passed yet',
    readyToStart: 'Ready to Start',
    takeFirstAttempt: 'Take your first attempt and track your progress',
    retakeAvailable: 'Retake Available',
    // Premium CTA
    getAccessTitle: 'Get Access to Premium Mock Exams',
    getAccessDesc: 'Purchase from our online store to unlock full practice experience',
    visitStore: 'Visit Store',
    // Results count
    showingExams: 'Showing',
    exams: 'exams',
    exam: 'exam',
    free: 'free',
    // Purchase CTA
    getPremiumExams: 'Get Premium Mock Exams',
    getPremiumExamsDesc: 'Purchase premium mock exams from our store to enhance your exam preparation',
  },
  ar: {
    // Header
    title: 'الامتحانات التجريبية',
    subtitle: 'تدرب على سيناريوهات امتحانية واقعية وتتبع تقدمك',
    // Filters
    allCategories: 'جميع الفئات',
    cpExam: 'امتحان CP',
    scpExam: 'امتحان SCP',
    generalKnowledge: 'المعرفة العامة',
    allDifficulties: 'جميع المستويات',
    easy: 'سهل',
    medium: 'متوسط',
    hard: 'صعب',
    allLanguages: 'جميع اللغات',
    english: 'الإنجليزية',
    arabic: 'العربية',
    // Loading/Error
    loadingExams: 'جارٍ تحميل الامتحانات...',
    errorLoading: 'خطأ في تحميل الامتحانات. يرجى المحاولة مرة أخرى.',
    noExamsFound: 'لم يتم العثور على امتحانات تطابق المرشحات',
    // Sections
    freeMockExams: 'الامتحانات التجريبية المجانية',
    freeSubtitle: 'امتحانات تدريبية متاحة لجميع المستخدمين المسجلين',
    premiumMockExams: 'الامتحانات التجريبية المميزة',
    premiumSubtitle: 'امتحانات متقدمة تتطلب الشراء من متجرنا',
    // Exam Card
    questions: 'سؤال',
    minutes: 'دقيقة',
    toPass: 'للنجاح',
    purchaseRequired: 'يتطلب الشراء للوصول إلى هذا الامتحان',
    buyNow: 'اشترِ الآن',
    premiumOwned: 'مميز (مملوك)',
    premium: 'مميز',
    yourProgress: 'تقدمك',
    attempts: 'المحاولات',
    bestScore: 'أفضل درجة',
    average: 'المتوسط',
    passed: 'ناجح',
    notPassedYet: 'لم ينجح بعد',
    readyToStart: 'جاهز للبدء',
    takeFirstAttempt: 'ابدأ محاولتك الأولى وتتبع تقدمك',
    retakeAvailable: 'إعادة الامتحان متاحة',
    // Premium CTA
    getAccessTitle: 'احصل على وصول للامتحانات التجريبية المميزة',
    getAccessDesc: 'اشترِ من متجرنا الإلكتروني لفتح تجربة التدريب الكاملة',
    visitStore: 'زيارة المتجر',
    // Results count
    showingExams: 'عرض',
    exams: 'امتحانات',
    exam: 'امتحان',
    free: 'مجاني',
    // Purchase CTA
    getPremiumExams: 'احصل على الامتحانات التجريبية المميزة',
    getPremiumExamsDesc: 'اشترِ الامتحانات التجريبية المميزة من متجرنا لتعزيز استعدادك للامتحان',
  }
};

// Exam Card Component
function ExamCard({
  exam,
  onClick,
  texts,
}: {
  exam: MockExamWithStats;
  onClick: () => void;
  texts: typeof translations.en;
}) {
  const getDifficultyVariant = (
    difficulty: ExamDifficulty
  ): 'default' | 'success' | 'warning' | 'danger' => {
    const colorMap: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
      green: 'success',
      yellow: 'warning',
      red: 'danger',
    };
    const color = EXAM_DIFFICULTY_COLORS[difficulty];
    return colorMap[color] || 'default';
  };

  const canTakeExam = !exam.is_premium || exam.has_premium_access;

  return (
    <div
      onClick={canTakeExam ? onClick : undefined}
      className={cn(
        'rounded-lg border bg-white p-6 shadow-sm transition-shadow',
        canTakeExam ? 'hover:shadow-md cursor-pointer' : 'opacity-75'
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Exam Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3
              className="text-xl font-bold text-gray-900"
              dir={exam.language === 'ar' ? 'rtl' : 'ltr'}
            >
              {exam.language === 'ar' && exam.title_ar ? exam.title_ar : exam.title}
            </h3>
            <StatusBadge variant={getDifficultyVariant(exam.difficulty)} size="sm">
              {EXAM_DIFFICULTY_LABELS[exam.difficulty]}
            </StatusBadge>
            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
              {EXAM_CATEGORY_LABELS[exam.category]}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 font-medium flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {EXAM_LANGUAGE_LABELS[exam.language]}
            </span>
            {exam.is_premium && (
              <span
                className={cn(
                  'text-xs px-2 py-1 rounded font-medium flex items-center gap-1',
                  exam.has_premium_access
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                )}
              >
                <Crown className="h-3 w-3" />
                {exam.has_premium_access ? texts.premiumOwned : texts.premium}
              </span>
            )}
          </div>

          <p
            className="text-gray-600 mb-4"
            dir={exam.language === 'ar' ? 'rtl' : 'ltr'}
          >
            {exam.language === 'ar' && exam.description_ar ? exam.description_ar : exam.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>{exam.total_questions} {texts.questions}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{exam.duration_minutes} {texts.minutes}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              <span>{exam.passing_score}% {texts.toPass}</span>
            </div>
          </div>

          {/* Premium purchase CTA */}
          {exam.is_premium && !exam.has_premium_access && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-800">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {texts.purchaseRequired}
                  </span>
                </div>
                <a
                  href={WOOCOMMERCE_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {texts.buyNow}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        {canTakeExam && exam.attempt_count !== undefined && exam.attempt_count > 0 && (
          <div className="lg:w-64 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">{texts.yourProgress}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{texts.attempts}:</span>
                <span className="font-medium text-gray-900">{exam.attempt_count}</span>
              </div>
              {exam.best_score !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{texts.bestScore}:</span>
                  <span
                    className={cn(
                      'font-bold',
                      exam.best_score >= exam.passing_score
                        ? 'text-green-600'
                        : 'text-red-600'
                    )}
                  >
                    {exam.best_score}%
                  </span>
                </div>
              )}
              {exam.average_score !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{texts.average}:</span>
                  <span className="font-medium text-gray-900">{exam.average_score}%</span>
                </div>
              )}
              {exam.user_has_passed && (
                <>
                  <div className="flex items-center gap-1 text-sm text-green-600 pt-2 border-t">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">{texts.passed}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-blue-600 pt-2 border-t">
                    <RotateCcw className="h-4 w-4" />
                    <span className="font-medium">{texts.retakeAvailable}</span>
                  </div>
                </>
              )}
              {!exam.user_has_passed &&
                exam.attempt_count > 0 &&
                exam.best_score !== null && (
                  <div className="flex items-center gap-1 text-sm text-orange-600 pt-2 border-t">
                    <XCircle className="h-4 w-4" />
                    <span className="font-medium">{texts.notPassedYet}</span>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* No attempts yet - show only for accessible exams */}
        {canTakeExam &&
          (exam.attempt_count === undefined || exam.attempt_count === 0) && (
            <div className="lg:w-64 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">{texts.readyToStart}</span>
              </div>
              <p className="text-xs text-blue-700">
                {texts.takeFirstAttempt}
              </p>
            </div>
          )}
      </div>
    </div>
  );
}

// Section Header Component
function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  count,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={cn('p-2 rounded-lg', iconColor)}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          {title}
          <span className="text-sm font-normal text-gray-500">({count})</span>
        </h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

export default function MockExamList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const texts = translations[language];
  const [categoryFilter, setCategoryFilter] = useState<ExamCategory | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<ExamDifficulty | 'all'>('all');
  const [languageFilter, setLanguageFilter] = useState<MockExamLanguage | 'all'>('all');

  // Determine base path for navigation (ECP vs non-ECP routes)
  const basePath = location.pathname.startsWith('/ecp/') ? '/ecp/mock-exams' : '/mock-exams';

  const { data: exams, isLoading, error } = useActiveExams({
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    difficulty: difficultyFilter !== 'all' ? difficultyFilter : undefined,
    language: languageFilter !== 'all' ? languageFilter : undefined,
  });

  // Separate exams into free and premium sections
  const { freeExams, premiumExams } = useMemo(() => {
    if (!exams) return { freeExams: [], premiumExams: [] };

    const free: MockExamWithStats[] = [];
    const premium: MockExamWithStats[] = [];

    exams.forEach((exam) => {
      if (exam.is_premium) {
        premium.push(exam);
      } else {
        free.push(exam);
      }
    });

    // Sort by category then language
    const sortExams = (a: MockExamWithStats, b: MockExamWithStats) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.language.localeCompare(b.language);
    };

    return {
      freeExams: free.sort(sortExams),
      premiumExams: premium.sort(sortExams),
    };
  }, [exams]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            {texts.title}
          </h1>
          <p className="mt-2 opacity-90">
            {texts.subtitle}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as ExamCategory | 'all')}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="all">{texts.allCategories}</option>
                <option value="cp">{texts.cpExam}</option>
                <option value="scp">{texts.scpExam}</option>
                <option value="general">{texts.generalKnowledge}</option>
              </select>
            </div>

            {/* Difficulty Filter */}
            <div className="relative">
              <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={difficultyFilter}
                onChange={(e) =>
                  setDifficultyFilter(e.target.value as ExamDifficulty | 'all')
                }
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="all">{texts.allDifficulties}</option>
                <option value="easy">{texts.easy}</option>
                <option value="medium">{texts.medium}</option>
                <option value="hard">{texts.hard}</option>
              </select>
            </div>

            {/* Language Filter */}
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={languageFilter}
                onChange={(e) =>
                  setLanguageFilter(e.target.value as MockExamLanguage | 'all')
                }
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="all">{texts.allLanguages}</option>
                <option value="en">{texts.english}</option>
                <option value="ar">{texts.arabic}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="rounded-lg border bg-white p-12 shadow-sm text-center">
            <div className="inline-block h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">{texts.loadingExams}</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
            <p className="text-red-800">{texts.errorLoading}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && (!exams || exams.length === 0) && (
          <div className="rounded-lg border bg-white p-12 shadow-sm text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">{texts.noExamsFound}</p>
          </div>
        )}

        {/* Exam Sections */}
        {!isLoading && !error && exams && exams.length > 0 && (
          <div className="space-y-8">
            {/* Free Mock Exams Section */}
            {freeExams.length > 0 && (
              <div>
                <SectionHeader
                  title={texts.freeMockExams}
                  subtitle={texts.freeSubtitle}
                  icon={BookOpen}
                  iconColor="bg-green-600"
                  count={freeExams.length}
                />
                <div className="space-y-4">
                  {freeExams.map((exam) => (
                    <ExamCard
                      key={exam.id}
                      exam={exam}
                      texts={texts}
                      onClick={() => navigate(`${basePath}/${exam.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Premium Mock Exams Section */}
            {premiumExams.length > 0 && (
              <div>
                <SectionHeader
                  title={texts.premiumMockExams}
                  subtitle={texts.premiumSubtitle}
                  icon={Crown}
                  iconColor="bg-amber-500"
                  count={premiumExams.length}
                />
                <div className="space-y-4">
                  {premiumExams.map((exam) => (
                    <ExamCard
                      key={exam.id}
                      exam={exam}
                      texts={texts}
                      onClick={() => navigate(`${basePath}/${exam.id}`)}
                    />
                  ))}
                </div>

                {/* Store Link for Premium Exams */}
                <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-amber-900">
                        {texts.getAccessTitle}
                      </h3>
                      <p className="text-sm text-amber-700">
                        {texts.getAccessDesc}
                      </p>
                    </div>
                    <a
                      href={WOOCOMMERCE_STORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
                    >
                      {texts.visitStore}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Count */}
        {!isLoading && exams && exams.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">
            {texts.showingExams} {exams.length} {exams.length !== 1 ? texts.exams : texts.exam} (
            {freeExams.length} {texts.free}, {premiumExams.length} {texts.premium})
          </div>
        )}

        {/* Premium Purchase CTA */}
        <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-full">
              <ShoppingBag className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{texts.getPremiumExams}</h3>
            <p className="text-sm text-gray-600 max-w-md">{texts.getPremiumExamsDesc}</p>
            <a
              href="https://bda-global.org/en/store/bda-mock-exams/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
            >
              <ShoppingBag className="h-5 w-5" />
              {texts.visitStore}
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

MockExamList.displayName = 'MockExamList';
