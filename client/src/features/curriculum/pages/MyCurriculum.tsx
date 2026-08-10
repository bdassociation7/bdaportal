import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  useCurriculumDashboard,
  useUserAccesses,
  useLanguageAccess,
  useInitializeLessonProgress,
} from '@/entities/curriculum';
import { CurriculumDashboard } from '../components/CurriculumDashboard';
import { AccessDenied } from '../components/AccessDenied';
import { CurriculumLoading } from '../components/CurriculumLoading';

/**
 * My Curriculum Page — English Only
 * Entry point for the Training Kits learning system (EN only).
 * - Checks EN access only
 * - Shows 14 BoCK modules (7 knowledge + 7 behavioral)
 * - Sequential unlocking with quiz gates
 */
export function MyCurriculum() {
  const { user } = useAuth();
  const location = useLocation();

  // Determine base path for navigation (supports both /learning-system and /ecp/learning-system)
  const learningSystemPath = location.pathname.includes('/instructor/')
    ? '/instructor/learning-system'
    : location.pathname.includes('/ecp/')
    ? '/ecp/learning-system'
    : '/learning-system';
  const basePath = `${learningSystemPath}/training-kits`;

  // Get all user accesses (EN only check)
  const { data: accessSummary, isLoading: accessSummaryLoading } = useUserAccesses(user?.id);

  // Check EN access
  const {
    data: languageAccess,
    isLoading: languageAccessLoading,
  } = useLanguageAccess(user?.id, 'EN');

  // Always use 'CP' as certification type — all content (CP & SCP) is stored under CP
  const certificationType = 'CP';

  // Main hook: loads modules and progress for EN only
  const {
    isLoading: dashboardLoading,
    isError,
    error,
    hasAccess,
    accessReason,
    access,
    knowledgeModules,
    behavioralModules,
    introModules,
    outroModules,
    overallProgress,
    nextModule,
    refetch,
  } = useCurriculumDashboard(
    user?.id,
    user?.email,
    certificationType,
    'EN'
  );

  // Initialize progress mutation
  const initializeProgress = useInitializeLessonProgress();
  const hasInitialized = useRef(false);

  // Initialize user progress when they first access the curriculum
  useEffect(() => {
    if (!user?.id || !hasAccess || hasInitialized.current) return;
    hasInitialized.current = true;
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

  // No access state — EN only
  const hasENAccess = languageAccess?.has_access || accessSummary?.has_en || false;

  if (!hasENAccess && !accessSummaryLoading) {
    return (
      <AccessDenied
        reason={languageAccess?.reason || 'no_active_access'}
        onRetry={() => refetch()}
      />
    );
  }

  // Main curriculum interface — EN only
  return (
    <div className="min-h-screen bg-gray-50">
      <CurriculumDashboard
        access={access!}
        knowledgeModules={knowledgeModules}
        behavioralModules={behavioralModules}
        introModules={introModules}
        outroModules={outroModules}
        overallProgress={overallProgress}
        nextModule={nextModule}
        basePath={basePath}
        backPath={learningSystemPath}
        selectedLanguage="EN"
      />
    </div>
  );
}
