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
    retakeExam: 'Retake Exam',
    viewResults: 'View Results',
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
    retakeExam: 'إعادة الامتحان',
    viewResults: 'عرض النتائج',
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
  onViewResults,
  texts,
}: {
  exam: MockExamWithStats;
  onClick: () => void;
  onViewResults: () => void;
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
            {/* Category badge - BDA blue */}
            <span className="text-xs px-2 py-1 rounded bg-[#0f91e0]/10 text-[#0f91e0] font-medium">
              {EXAM_CATEGORY_LABELS[exam.category]}
            </span>
            {/* Language badge - neutral gray */}
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 font-medium flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {EXAM_LANGUAGE_LABELS[exam.language]}
            </span>
            {exam.is_premium && (
              <span
                className={cn(
                  'text-xs px-2 py-1 rounded font-medium flex items-center gap-1',
                  exam.has_premium_access
                    ? 'bg-[#0f91e0]/10 text-[#0f91e0]'
                    : 'bg-[#0d1f4e]/10 text-[#0d1f4e]'
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

          {/* Premium purchase CTA - BDA blue instead of amber */}
          {exam.is_premium && !exam.has_premium_access && (
            <div className="mt-4 p-3 bg-[#0f91e0]/5 border border-[#0f91e0]/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#0d1f4e]">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {texts.purchaseRequired}
                  </span>
                </div>
                <a
                  href={WOOCOMMERCE_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[#0f91e0] hover:text-[#0d1f4e] flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {texts.buyNow}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Stats - has attempts */}
        {canTakeExam && exam.attempt_count !== undefined && exam.attempt_count > 0 && (
          <div className="lg:w-64 rounded-lg border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#0f91e0]" />
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
              {exam.user_has_passed ? (
                <div className="flex items-center gap-1 text-sm text-green-600 pt-2 border-t">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">{texts.passed}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-sm text-red-600 pt-2 border-t">
                  <XCircle className="h-4 w-4" />
                  <span className="font-medium">{texts.notPassedYet}</span>
                </div>
              )}
            </div>
            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#0f91e0] hover:bg-[#0d7bc4] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {texts.retakeExam}
              </button>
              {exam.last_attempt_id && (
                <button
                  onClick={(e) => { e.stopPropagation(); onViewResults(); }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 hover:border-[#0f91e0] hover:text-[#0f91e0] text-gray-700 text-sm font-medium rounded-lg transition-colors bg-white"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  {texts.viewResults}
                </button>
              )}
            </div>
          </div>
        )}

        {/* No attempts yet - show only for accessible exams */}
        {canTakeExam &&
          (exam.attempt_count === undefined || exam.attempt_count === 0) && (
            <div className="lg:w-64 rounded-lg border border-[#0f91e0]/30 bg-[#0f91e0]/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-5 w-5 text-[#0f91e0]" />
                <span className="text-sm font-semibold text-[#0d1f4e]">{texts.readyToStart}</span>
              </div>
              <p className="text-xs text-[#0f91e0]">
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

  // Determine base path for navigation (ECP vs Instructor vs Individual routes)
  const isECP = location.pathname.startsWith('/ecp/');
  const isInstructor = location.pathname.startsWith('/instructor/');
  const basePath = isECP ? '/ecp/mock-exams' : isInstructor ? '/instructor/mock-exams' : '/mock-exams';
  const backPath = isECP ? '/ecp/dashboard' : isInstructor ? '/instructor/dashboard' : null;

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
        {/* Back button for ECP / Instructor */}
        {backPath && (
          <button
            onClick={() => navigate(backPath)}
            className="flex items-center gap-2 text-sm font-semibold text-[#0f91e0] hover:underline mb-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {isInstructor ? 'Back to Instructor Dashboard' : 'Back to Dashboard'}
          </button>
        )}
        {/* Page Header - BDA blue instead of gradient */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-[#0f91e0]" />
            {texts.title}
          </h1>
          <p className="mt-1 text-gray-500 text-sm">
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
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0f91e0] appearance-none"
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
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0f91e0] appearance-none"
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
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0f91e0] appearance-none"
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
            <div className="inline-block h-8 w-8 border-4 border-[#0f91e0] border-t-transparent rounded-full animate-spin mb-4" />
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
                  iconColor="bg-[#0f91e0]"
                  count={freeExams.length}
                />
                <div className="space-y-4">
                  {freeExams.map((exam) => (
                    <ExamCard
                      key={exam.id}
                      exam={exam}
                      texts={texts}
                      onClick={() => navigate(`${basePath}/${exam.id}`)}
                      onViewResults={() => exam.last_attempt_id && navigate(`${basePath}/results/${exam.last_attempt_id}`)}
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
                  iconColor="bg-[#0d1f4e]"
                  count={premiumExams.length}
                />
                <div className="space-y-4">
                  {premiumExams.map((exam) => (
                    <ExamCard
                      key={exam.id}
                      exam={exam}
                      texts={texts}
                      onClick={() => navigate(`${basePath}/${exam.id}`)}
                      onViewResults={() => exam.last_attempt_id && navigate(`${basePath}/results/${exam.last_attempt_id}`)}
                    />
                  ))}
                </div>

                {/* Store Link for Premium Exams - BDA blue instead of amber */}
                <div className="mt-4 p-4 bg-[#0f91e0]/5 border border-[#0f91e0]/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[#0d1f4e]">
                        {texts.getAccessTitle}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {texts.getAccessDesc}
                      </p>
                    </div>
                    <a
                      href={WOOCOMMERCE_STORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#0f91e0] hover:bg-[#0d7bc4] text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
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

        {/* Premium Purchase CTA - BDA blue instead of amber/orange */}
        <div className="mt-8 bg-[#0f91e0]/5 border border-[#0f91e0]/20 rounded-xl p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-[#0f91e0]/10 rounded-full">
              <ShoppingBag className="h-6 w-6 text-[#0f91e0]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{texts.getPremiumExams}</h3>
            <p className="text-sm text-gray-600 max-w-md">{texts.getPremiumExamsDesc}</p>
            <a
              href="https://bda-global.org/en/store/bda-mock-exams/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-[#0f91e0] hover:bg-[#0d7bc4] text-white font-medium rounded-lg transition-colors"
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
