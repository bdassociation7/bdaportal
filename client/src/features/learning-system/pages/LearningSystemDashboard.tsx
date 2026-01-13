/**
 * Learning System Dashboard
 * Main entry point showing 3 sections:
 * 1. Training Kits (Main Curriculum)
 * 2. Question Bank (Practice Questions)
 * 3. Flashcards (Quick Revision)
 *
 * When user has BOTH EN and AR access, shows language selection page first.
 * When user has only one language, goes directly to that language's dashboard.
 */

import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { useUserAccesses, useOverallProgress, type Language } from '@/entities/curriculum';
import { useQuestionBankStats } from '@/entities/question-bank';
import { useFlashcardStats } from '@/entities/flashcards';
import {
  BookOpen,
  HelpCircle,
  Layers,
  Calendar,
  TrendingUp,
  Clock,
  Award,
  ChevronRight,
  Sparkles,
  Globe,
  ArrowLeft,
} from 'lucide-react';
import { format } from 'date-fns';

interface SectionCardProps {
  title: string;
  titleAr?: string;
  description: string;
  icon: React.ReactNode;
  stats?: {
    label: string;
    value: string | number;
  }[];
  primaryAction: {
    label: string;
    onClick: () => void;
  };
  color: 'blue' | 'green' | 'purple';
  isNew?: boolean;
  newLabel?: string;
}

function SectionCard({
  title,
  titleAr,
  description,
  icon,
  stats,
  primaryAction,
  color,
  isNew,
  newLabel = 'NEW',
}: SectionCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      border: 'border-blue-200',
      icon: 'bg-blue-600 text-white',
      button: 'bg-blue-600 hover:bg-blue-700',
      text: 'text-blue-600',
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-green-100',
      border: 'border-green-200',
      icon: 'bg-green-600 text-white',
      button: 'bg-green-600 hover:bg-green-700',
      text: 'text-green-600',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
      border: 'border-purple-200',
      icon: 'bg-purple-600 text-white',
      button: 'bg-purple-600 hover:bg-purple-700',
      text: 'text-purple-600',
    },
  };

  const colors = colorClasses[color];

  return (
    <div
      className={`relative rounded-xl border-2 ${colors.border} ${colors.bg} p-6 transition-all hover:shadow-lg`}
    >
      {isNew && (
        <div className="absolute -top-3 -right-2 flex items-center gap-1 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
          <Sparkles className="w-3 h-3" />
          {newLabel}
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${colors.icon} shadow-lg`}>{icon}</div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          {titleAr && (
            <p className="text-sm text-gray-500" dir="rtl">
              {titleAr}
            </p>
          )}
          <p className="text-gray-600 mt-2 text-sm">{description}</p>
        </div>
      </div>

      {stats && stats.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-6">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <p className={`text-2xl font-bold ${colors.text}`}>{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={primaryAction.onClick}
        className={`mt-6 w-full flex items-center justify-center gap-2 ${colors.button} text-white font-semibold py-3 px-4 rounded-lg transition-colors`}
      >
        {primaryAction.label}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Language Selection Card for dual-language access
 */
interface LanguageCardProps {
  language: 'EN' | 'AR';
  title: string;
  subtitle: string;
  description: string;
  expiryDate: Date | null;
  daysRemaining: number;
  onClick: () => void;
}

function LanguageCard({
  language,
  title,
  subtitle,
  description,
  expiryDate,
  daysRemaining,
  onClick,
}: LanguageCardProps) {
  const isArabic = language === 'AR';
  const flagEmoji = isArabic ? '🇸🇦' : '🇬🇧';
  const bgGradient = isArabic
    ? 'from-emerald-500 to-teal-600'
    : 'from-blue-500 to-indigo-600';
  const hoverGradient = isArabic
    ? 'hover:from-emerald-600 hover:to-teal-700'
    : 'hover:from-blue-600 hover:to-indigo-700';

  return (
    <button
      onClick={onClick}
      className={`group relative w-full bg-gradient-to-br ${bgGradient} ${hoverGradient} rounded-2xl p-8 text-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] text-left`}
    >
      <div className="flex items-start gap-4">
        <div className="text-5xl">{flagEmoji}</div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold mb-1">{title}</h3>
          <p className="text-white/80 text-sm mb-3">{subtitle}</p>
          <p className="text-white/70 text-sm">{description}</p>
        </div>
        <ChevronRight className="w-8 h-8 opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>

      {expiryDate && (
        <div className="mt-6 pt-4 border-t border-white/20">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Calendar className="w-4 h-4" />
            <span>
              Valid until {format(expiryDate, 'MMM d, yyyy')}
              <span className="ml-2 text-white/60">
                ({daysRemaining} days left)
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Decorative elements */}
      <div className="absolute top-4 right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
    </button>
  );
}

export function LearningSystemDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Determine base path (works for both /learning-system and /ecp/learning-system)
  const basePath = location.pathname.includes('/ecp/')
    ? '/ecp/learning-system'
    : '/learning-system';

  // Get selected language from URL params
  const selectedLang = searchParams.get('lang') as Language | null;

  // Check curriculum access using language-aware hook
  // This properly handles users with access to both EN and AR
  const {
    data: accessSummary,
    isLoading: isLoadingAccess,
  } = useUserAccesses(user?.id);

  // Compute effective language early for stats hooks
  // Use selectedLang from URL, or fallback to first available language
  const statsLanguage: 'en' | 'ar' | undefined = selectedLang
    ? (selectedLang.toLowerCase() as 'en' | 'ar')
    : accessSummary?.has_en
      ? 'en'
      : accessSummary?.has_ar
        ? 'ar'
        : undefined;

  // Get training/curriculum progress (with language filter)
  const { data: trainingProgress } = useOverallProgress(user?.id, 'CP', statsLanguage);

  // Get question bank stats (with language filter)
  const { data: questionBankStats } = useQuestionBankStats(user?.id, 'CP', statsLanguage);

  // Get flashcard stats (with language filter)
  const { data: flashcardStats } = useFlashcardStats(user?.id, 'CP', statsLanguage);

  // UI Labels - Always in English per requirement
  // Only content (curriculum text, questions, flashcards) should be in Arabic when viewing Arabic content
  const texts = {
    // Loading & Access
    loading: 'Loading your learning system...',
    accessRequired: 'Access Required',
    accessRequiredDesc: 'You need to purchase a certification program to access the Learning System. This includes Training Kits, Question Bank, and Flashcards.',
    purchaseNow: 'Purchase Now',
    // Header
    title: 'Learning System',
    subtitle: 'BDA Body of Competency Knowledge (BoCK) - Complete Learning Suite',
    // Access Banner
    accessValidUntil: 'Access valid until',
    daysRemaining: 'days remaining',
    considerRenewing: '- Consider renewing soon',
    // Quick Stats
    trainingProgress: 'Training Progress',
    questionsPracticed: 'Questions Practiced',
    cardsMastered: 'Cards Mastered',
    studyTime: 'Study Time',
    // Section Cards
    trainingKits: 'Training Kits',
    trainingKitsAr: 'حقائب تدريبية',
    trainingKitsDesc: 'Complete curriculum content organized by competencies. Read comprehensive material with text and images to build your knowledge foundation.',
    questionBank: 'Question Bank',
    questionBankAr: 'بنك الأسئلة',
    questionBankDesc: 'Practice with hundreds of multiple-choice questions. Get instant feedback and track your performance across all competencies.',
    flashcards: 'Flashcards',
    flashcardsAr: 'بطاقات المراجعة',
    flashcardsDesc: 'Quick revision cards with spaced repetition. Master key concepts through active recall and efficient memorization techniques.',
    // Stats Labels
    modules: 'Modules',
    lessons: 'Lessons',
    completed: 'Completed',
    totalQuestions: 'Total Questions',
    attempted: 'Attempted',
    avgScore: 'Avg Score',
    totalCards: 'Total Cards',
    dueToday: 'Due Today',
    mastered: 'Mastered',
    // Button Labels
    startLearning: 'Start Learning',
    practiceNow: 'Practice Now',
    studyFlashcards: 'Study Flashcards',
    // Learning Path
    recommendedPath: 'Recommended Learning Path',
    readContentFirst: 'Read the content first',
    memorizeKeyConcepts: 'Memorize key concepts',
    testYourKnowledge: 'Test your knowledge',
    new: 'NEW',
    // Language Selection
    selectLanguage: 'Select Your Language',
    selectLanguageDesc: 'You have access to both English and Arabic Learning Systems. Choose which language you would like to study in.',
    englishTitle: 'Learning System (English)',
    englishSubtitle: 'BDA Body of Competency Knowledge',
    englishDesc: 'Complete curriculum, question bank, and flashcards in English',
    arabicTitle: 'Learning System (Arabic)',
    arabicSubtitle: 'هيكل معارف كفاءات BDA',
    arabicDesc: 'Complete curriculum, question bank, and flashcards in Arabic',
    switchLanguage: 'Switch Language',
    currentlyViewing: 'Currently viewing',
  };

  // User has access if they have EN, AR, or both
  const hasAccess = accessSummary?.has_en || accessSummary?.has_ar;
  const hasBothLanguages = accessSummary?.has_en && accessSummary?.has_ar;

  // Get access for specific language (for display purposes)
  const getAccessForLanguage = (lang: Language) => {
    return accessSummary?.accesses?.find(a => a.language === lang);
  };

  // Get the access for currently selected language, or first available
  const access = selectedLang
    ? getAccessForLanguage(selectedLang)
    : accessSummary?.accesses?.[0];

  // Helper to calculate days until expiry
  const getDaysUntilExpiry = (expiresAt: string | undefined) => {
    if (!expiresAt) return 0;
    const expiry = new Date(expiresAt);
    return Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  // Loading state
  if (isLoadingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{texts.loading}</p>
        </div>
      </div>
    );
  }

  // No access state
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md text-center bg-white p-8 rounded-xl shadow-lg">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {texts.accessRequired}
          </h2>
          <p className="text-gray-600 mb-6">
            {texts.accessRequiredDesc}
          </p>
          <button
            onClick={() => window.open('https://bda-global.org/en/store/bda-learning-system/', '_blank')}
            className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {texts.purchaseNow}
          </button>
        </div>
      </div>
    );
  }

  // DUAL LANGUAGE SELECTION PAGE
  // Show when user has both EN and AR access but hasn't selected a language yet
  if (hasBothLanguages && !selectedLang) {
    const enAccess = getAccessForLanguage('EN');
    const arAccess = getAccessForLanguage('AR');
    const enExpiry = enAccess?.expires_at ? new Date(enAccess.expires_at) : null;
    const arExpiry = arAccess?.expires_at ? new Date(arAccess.expires_at) : null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-6">
              <Globe className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {texts.selectLanguage}
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              {texts.selectLanguageDesc}
            </p>
          </div>

          {/* Language Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LanguageCard
              language="EN"
              title={texts.englishTitle}
              subtitle={texts.englishSubtitle}
              description={texts.englishDesc}
              expiryDate={enExpiry}
              daysRemaining={getDaysUntilExpiry(enAccess?.expires_at)}
              onClick={() => setSearchParams({ lang: 'EN' })}
            />

            <LanguageCard
              language="AR"
              title={texts.arabicTitle}
              subtitle={texts.arabicSubtitle}
              description={texts.arabicDesc}
              expiryDate={arExpiry}
              daysRemaining={getDaysUntilExpiry(arAccess?.expires_at)}
              onClick={() => setSearchParams({ lang: 'AR' })}
            />
          </div>

          {/* Info note */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>You can switch between languages at any time from the dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  // For single language users without URL param, determine which language they have
  const effectiveLanguage: Language = selectedLang
    || (accessSummary?.has_en ? 'EN' : 'AR');

  // Get the access record for display (fallback to first available)
  const displayAccess = access || accessSummary?.accesses?.[0];
  const expiryDate = displayAccess?.expires_at ? new Date(displayAccess.expires_at) : null;
  const daysUntilExpiry = expiryDate
    ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;
  const isExpiringSoon = daysUntilExpiry <= 30;

  // Current language indicator
  const currentLangLabel = effectiveLanguage === 'AR' ? 'Arabic' : 'English';
  const otherLangLabel = effectiveLanguage === 'AR' ? 'English' : 'Arabic';
  const otherLang: Language = effectiveLanguage === 'AR' ? 'EN' : 'AR';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header with language switcher */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {texts.title}
                <span className="ml-3 text-lg font-medium text-gray-500">
                  ({currentLangLabel})
                </span>
              </h1>
              <p className="text-gray-600">
                {texts.subtitle}
              </p>
            </div>

            {/* Language Switcher - only show when both languages available */}
            {hasBothLanguages && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSearchParams({ lang: otherLang })}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Globe className="w-4 h-4" />
                  {texts.switchLanguage}: {otherLangLabel}
                </button>
                <button
                  onClick={() => {
                    searchParams.delete('lang');
                    setSearchParams(searchParams);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                  title="Back to language selection"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Access Banner */}
        {displayAccess && expiryDate && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              isExpiringSoon
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar
                  className={`w-5 h-5 ${
                    isExpiringSoon ? 'text-yellow-600' : 'text-blue-600'
                  }`}
                />
                <div>
                  <p className="font-medium text-gray-900">
                    {texts.accessValidUntil} {format(expiryDate, 'MMMM d, yyyy')}
                  </p>
                  <p
                    className={`text-sm ${
                      isExpiringSoon ? 'text-yellow-600' : 'text-gray-600'
                    }`}
                  >
                    {daysUntilExpiry} {texts.daysRemaining}
                    {isExpiringSoon && ` ${texts.considerRenewing}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                {texts.trainingProgress}
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {trainingProgress?.percentage || 0}%
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <div className="flex items-center gap-3 mb-2">
              <HelpCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">
                {texts.questionsPracticed}
              </span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {questionBankStats?.questionsAttempted || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <div className="flex items-center gap-3 mb-2">
              <Layers className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">
                {texts.cardsMastered}
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {flashcardStats?.cardsMastered || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-gray-700">
                {texts.studyTime}
              </span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {Math.floor(((trainingProgress?.totalTimeSpent || 0) + (flashcardStats?.totalStudyTimeMinutes || 0)) / 60)}h
            </p>
          </div>
        </div>

        {/* Section Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Training Kits Section */}
          <SectionCard
            title={texts.trainingKits}
            titleAr={effectiveLanguage === 'AR' ? texts.trainingKitsAr : undefined}
            description={texts.trainingKitsDesc}
            icon={<BookOpen className="w-6 h-6" />}
            color="blue"
            stats={[
              { label: texts.modules, value: 14 },
              { label: texts.lessons, value: 42 },
              { label: texts.completed, value: '0%' },
            ]}
            primaryAction={{
              label: texts.startLearning,
              onClick: () => navigate(`${basePath}/training-kits?lang=${effectiveLanguage}`),
            }}
          />

          {/* Question Bank Section */}
          <SectionCard
            title={texts.questionBank}
            titleAr={effectiveLanguage === 'AR' ? texts.questionBankAr : undefined}
            description={texts.questionBankDesc}
            icon={<HelpCircle className="w-6 h-6" />}
            color="green"
            isNew
            newLabel={texts.new}
            stats={[
              { label: texts.totalQuestions, value: questionBankStats?.totalQuestions || 0 },
              { label: texts.attempted, value: questionBankStats?.questionsAttempted || 0 },
              { label: texts.avgScore, value: `${Math.round(questionBankStats?.averageScore || 0)}%` },
            ]}
            primaryAction={{
              label: texts.practiceNow,
              onClick: () => navigate(`${basePath}/question-bank?lang=${effectiveLanguage}`),
            }}
          />

          {/* Flashcards Section */}
          <SectionCard
            title={texts.flashcards}
            titleAr={effectiveLanguage === 'AR' ? texts.flashcardsAr : undefined}
            description={texts.flashcardsDesc}
            icon={<Layers className="w-6 h-6" />}
            color="purple"
            isNew
            newLabel={texts.new}
            stats={[
              { label: texts.totalCards, value: flashcardStats?.totalCards || 0 },
              { label: texts.dueToday, value: flashcardStats?.cardsDueToday || 0 },
              { label: texts.mastered, value: flashcardStats?.cardsMastered || 0 },
            ]}
            primaryAction={{
              label: texts.studyFlashcards,
              onClick: () => navigate(`${basePath}/flashcards?lang=${effectiveLanguage}`),
            }}
          />
        </div>

        {/* Learning Path Guide */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            {texts.recommendedPath}
          </h2>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <p className="font-semibold text-gray-900">{texts.trainingKits}</p>
                <p className="text-sm text-gray-500">{texts.readContentFirst}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <p className="font-semibold text-gray-900">{texts.flashcards}</p>
                <p className="text-sm text-gray-500">{texts.memorizeKeyConcepts}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <p className="font-semibold text-gray-900">{texts.questionBank}</p>
                <p className="text-sm text-gray-500">{texts.testYourKnowledge}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
