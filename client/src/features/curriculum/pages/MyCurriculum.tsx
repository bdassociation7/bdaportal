import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  useCurriculumDashboard,
  useUserAccesses,
  useLanguageAccess,
  useInitializeLessonProgress,
  type Language,
} from '@/entities/curriculum';
import { CurriculumDashboard } from '../components/CurriculumDashboard';
import { AccessDenied } from '../components/AccessDenied';
import { CurriculumLoading } from '../components/CurriculumLoading';

/**
 * My Curriculum Page
 * Entry point for curriculum learning system
 * - Checks language-based access (EN/AR)
 * - Shows language selector if user has multiple languages
 * - Shows 14 BoCK modules (7 knowledge + 7 behavioral)
 * - Sequential unlocking with quiz gates
 */
export function MyCurriculum() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Determine base path for navigation (supports both /learning-system and /ecp/learning-system)
  const learningSystemPath = location.pathname.includes('/ecp/')
    ? '/ecp/learning-system'
    : '/learning-system';
  const basePath = `${learningSystemPath}/training-kits`;

  // Get language from URL param, default to EN
  const langFromUrl = searchParams.get('lang') as Language | null;
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(langFromUrl || 'EN');

  // Sync URL param with state
  const handleLanguageChange = (lang: Language) => {
    setSelectedLanguage(lang);
    setSearchParams({ lang });
  };

  // Get all user accesses to determine available languages
  const { data: accessSummary, isLoading: accessSummaryLoading } = useUserAccesses(
    user?.id
  );

  // Check access for selected language
  const {
    data: languageAccess,
    isLoading: languageAccessLoading,
  } = useLanguageAccess(user?.id, selectedLanguage);

  // Auto-select available language on first load (only if not set via URL)
  useEffect(() => {
    if (accessSummary && !languageAccessLoading && !langFromUrl) {
      // If user has both languages, keep current selection (defaults to EN)
      if (accessSummary.has_en && accessSummary.has_ar) {
        // Both available - no auto-switch needed, user can choose via LanguageSelector
        return;
      }
      // If current selection has no access, switch to available language
      if (accessSummary.has_en && !accessSummary.has_ar && selectedLanguage !== 'EN') {
        handleLanguageChange('EN');
      } else if (accessSummary.has_ar && !accessSummary.has_en && selectedLanguage !== 'AR') {
        handleLanguageChange('AR');
      }
    }
  }, [accessSummary, selectedLanguage, languageAccessLoading, langFromUrl]);

  // Determine certification type from language access (or default to CP)
  const certificationType = languageAccess?.certification_type || 'CP';

  // Main hook: loads modules and progress for certification type AND language
  const {
    isLoading: dashboardLoading,
    isError,
    error,
    hasAccess,
    accessReason,
    access,
    knowledgeModules,
    behavioralModules,
    overallProgress,
    nextModule,
    refetch,
  } = useCurriculumDashboard(
    user?.id,
    user?.email,
    certificationType,
    selectedLanguage  // Pass selected language to filter modules
  );

  // Initialize progress mutation
  const initializeProgress = useInitializeLessonProgress();
  const hasInitialized = useRef(false);

  // Initialize user progress when they first access the curriculum
  useEffect(() => {
    if (!user?.id || !hasAccess || hasInitialized.current) return;

    // Mark as initialized to prevent duplicate calls
    hasInitialized.current = true;

    // Initialize progress for this certification type
    // This will create progress records for all lessons if they don't exist
    initializeProgress.mutate({
      userId: user.id,
      certificationType: certificationType,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, certificationType, hasAccess]);

  const isLoading = accessSummaryLoading || languageAccessLoading || dashboardLoading;

  // Loading state
  if (isLoading) {
    return <CurriculumLoading />;
  }

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Error Loading Curriculum
          </h2>
          <p className="text-red-600 mb-4">
            {error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No access state - check language-based access
  // Trust accessSummary which checks both EN and AR at once
  const hasLanguageAccess = languageAccess?.has_access || false;
  const hasAnyAccessFromSummary = accessSummary?.has_en || accessSummary?.has_ar;

  // If accessSummary shows user has access to the selected language, trust it
  // This handles cases where languageAccess RPC might have temporary issues
  const userHasAccessToSelectedLanguage =
    (selectedLanguage === 'EN' && accessSummary?.has_en) ||
    (selectedLanguage === 'AR' && accessSummary?.has_ar);

  if (!hasLanguageAccess && !userHasAccessToSelectedLanguage && !accessSummaryLoading) {
    // Check if user has access in another language
    if (hasAnyAccessFromSummary) {
      // User has access to a different language than currently selected
      // For single-language access: useEffect will auto-switch
      // For dual-language access: this shouldn't happen since userHasAccessToSelectedLanguage would be true
      return <CurriculumLoading />;
    }

    // User has no access at all
    return (
      <AccessDenied
        reason={languageAccess?.reason || 'no_active_access'}
        onRetry={() => refetch()}
      />
    );
  }

  // Main curriculum interface
  // Language is already selected from the main Learning System dashboard
  // No language selector shown here to maintain isolation between EN/AR systems
  return (
    <div className="min-h-screen bg-gray-50">
      <CurriculumDashboard
        access={access!}
        knowledgeModules={knowledgeModules}
        behavioralModules={behavioralModules}
        overallProgress={overallProgress}
        nextModule={nextModule}
        basePath={basePath}
        backPath={learningSystemPath}
        selectedLanguage={selectedLanguage}
      />
    </div>
  );
}
