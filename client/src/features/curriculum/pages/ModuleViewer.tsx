import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  useModuleDetail,
  useUpdateProgress,
  useIncrementTimeSpent,
} from '@/entities/curriculum';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Clock, CheckCircle, Lock, BookOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentRenderer } from '../components/ContentRenderer';
import { QuizGate } from '../components/QuizGate';
import { ModuleLocked } from '../components/ModuleLocked';
import { ModuleLessons } from '../components/ModuleLessons';

/**
 * Module Viewer Page
 * Displays module content with progress tracking
 */
export function ModuleViewer() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [readingProgress, setReadingProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const timeTrackerRef = useRef<NodeJS.Timeout>();

  // Detect base path from current location (ECP vs individual learning system)
  const basePath = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/ecp/learning-system')) {
      return '/ecp/learning-system/training-kits';
    }
    return '/learning-system/training-kits';
  }, [location.pathname]);

  // Get language from URL params for back navigation
  const searchParams = new URLSearchParams(location.search);
  const urlLang = searchParams.get('lang');

  // Helper to get back URL with language preserved
  const getBackUrl = (moduleLang?: string) => {
    const lang = urlLang || moduleLang;
    if (lang) {
      return `${basePath}?lang=${lang}`;
    }
    return basePath;
  };

  // Fetch module detail
  const { data: moduleDetail, isLoading, isError } = useModuleDetail(
    user?.id,
    moduleId
  );

  // Mutations
  const updateProgressMutation = useUpdateProgress();
  const incrementTimeMutation = useIncrementTimeSpent();

  // Track reading progress on scroll
  useEffect(() => {
    if (!contentRef.current || !moduleDetail) return;

    const handleScroll = () => {
      const element = contentRef.current;
      if (!element) return;

      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const progress = Math.round((scrollTop / scrollHeight) * 100);

      setReadingProgress(Math.min(progress, 100));

      // Update progress in database (debounced)
      if (progress > (moduleDetail.progress.progress_percentage || 0)) {
        updateProgressMutation.mutate({
          userId: user!.id,
          moduleId: moduleId!,
          updates: {
            progress_percentage: progress,
            status: progress === 100 ? 'quiz_pending' : 'in_progress',
          },
        });
      }
    };

    const element = contentRef.current;
    element.addEventListener('scroll', handleScroll);

    return () => element.removeEventListener('scroll', handleScroll);
  }, [moduleDetail, user, moduleId, updateProgressMutation]);

  // Track time spent (increment every minute)
  useEffect(() => {
    if (!user || !moduleId || !moduleDetail?.isUnlocked) return;

    timeTrackerRef.current = setInterval(() => {
      incrementTimeMutation.mutate({
        userId: user.id,
        moduleId: moduleId,
        minutes: 1,
      });
    }, 60000); // Every 1 minute

    return () => {
      if (timeTrackerRef.current) {
        clearInterval(timeTrackerRef.current);
      }
    };
  }, [user, moduleId, moduleDetail, incrementTimeMutation]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading module...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !moduleDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load module</p>
          <button
            onClick={() => navigate(getBackUrl())}
            className="text-blue-600 hover:underline"
          >
            Return to Curriculum
          </button>
        </div>
      </div>
    );
  }

  const { module, progress, isUnlocked, prerequisiteModule, nextModule } =
    moduleDetail;

  // Module locked
  if (!isUnlocked) {
    return (
      <ModuleLocked
        module={module}
        prerequisiteModule={prerequisiteModule}
        onBack={() => navigate(getBackUrl(module.exam_language))}
      />
    );
  }

  const isQuizPending = progress.status === 'quiz_pending';
  const isCompleted = progress.status === 'completed';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(getBackUrl(module.exam_language))}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Module Title in Header */}
              <div className="border-l pl-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-0.5">
                  <span>Module {module.order_index}</span>
                  <span>•</span>
                  <span>
                    {module.section_type === 'knowledge_based' ? 'Knowledge-Based' : 'Behavioral'}
                  </span>
                </div>
                <h1
                  className="text-lg font-semibold text-gray-900 line-clamp-1"
                  dir={module.exam_language === 'ar' ? 'rtl' : 'ltr'}
                >
                  {module.exam_language === 'ar' && module.competency_name_ar
                    ? module.competency_name_ar
                    : module.competency_name || 'Untitled Module'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Time Spent */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{progress.time_spent_minutes || 0} min</span>
              </div>

              {/* Status Badge */}
              {isCompleted ? (
                <div className="flex items-center gap-2 text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  Completed
                </div>
              ) : isQuizPending ? (
                <div className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  Quiz Pending
                </div>
              ) : (
                <div className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  In Progress
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Reading Progress</span>
              <span>{readingProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${readingProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="container mx-auto px-4 py-8 max-w-4xl overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 180px)' }}
      >
        {/* Module Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <span>Module {module.order_index}</span>
            <span>•</span>
            <span>
              {module.section_type === 'knowledge_based'
                ? '🧠 Knowledge-Based'
                : '💼 Behavioral'}
            </span>
          </div>

          <h1
            className="text-4xl font-bold text-gray-900 mb-4"
            dir={module.exam_language === 'ar' ? 'rtl' : 'ltr'}
          >
            {module.exam_language === 'ar' && module.competency_name_ar
              ? module.competency_name_ar
              : module.competency_name || 'Untitled Module'}
          </h1>

          {(module.description || module.description_ar) && (
            <p
              className="text-lg text-gray-600 mb-6"
              dir={module.exam_language === 'ar' ? 'rtl' : 'ltr'}
            >
              {module.exam_language === 'ar' && module.description_ar
                ? module.description_ar
                : module.description}
            </p>
          )}

          {/* Learning Objectives */}
          {module.learning_objectives &&
            module.learning_objectives.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Learning Objectives
                </h3>
                <ul className="space-y-2">
                  {module.learning_objectives.map((objective, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-gray-700"
                    >
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>

        {/* Tabs: Module Content vs Lessons */}
        <Tabs defaultValue="lessons" className="mb-8">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="lessons" className="gap-2">
              <BookOpen className="h-4 w-4" />
              The 3 Lessons
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Overview
            </TabsTrigger>
          </TabsList>

          {/* Lessons Tab */}
          <TabsContent value="lessons">
            <ModuleLessons moduleId={moduleId!} userId={user?.id} basePath={basePath} />
          </TabsContent>

          {/* Module Overview Tab */}
          <TabsContent value="overview">
            <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
              {/* Check if module has actual content */}
              {module.content && module.content.content && module.content.content.length > 0 ? (
                <ContentRenderer content={module.content} />
              ) : (
                <div className="text-center py-8" dir={module.exam_language === 'ar' ? 'rtl' : 'ltr'}>
                  <BookOpen className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {module.exam_language === 'ar' ? 'نظرة عامة على الوحدة' : 'Module Overview'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {module.exam_language === 'ar' ? (
                      <>تغطي هذه الوحدة <strong>{module.competency_name_ar || module.competency_name}</strong>.</>
                    ) : (
                      <>This module covers <strong>{module.competency_name || module.competency_name_ar}</strong>.</>
                    )}
                  </p>
                  <p className="text-gray-500 text-sm mb-6">
                    {module.exam_language === 'ar'
                      ? 'ابدأ التعلم بإكمال الدروس الثلاثة في علامة التبويب "الدروس الثلاثة". كل درس يبني على الدرس السابق لمساعدتك على إتقان هذه الكفاءة.'
                      : 'Start learning by completing the 3 lessons in the "The 3 Lessons" tab. Each lesson builds on the previous one to help you master this competency.'}
                  </p>
                  {((module.exam_language === 'ar' && module.learning_objectives_ar && module.learning_objectives_ar.length > 0) ||
                    (module.learning_objectives && module.learning_objectives.length > 0)) && (
                    <div className={`${module.exam_language === 'ar' ? 'text-right' : 'text-left'} bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto`}>
                      <h4 className="font-medium text-gray-900 mb-2">
                        {module.exam_language === 'ar' ? 'ما ستتعلمه:' : "What you'll learn:"}
                      </h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {(module.exam_language === 'ar' && module.learning_objectives_ar
                          ? module.learning_objectives_ar
                          : module.learning_objectives || []
                        ).slice(0, 3).map((obj, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quiz Gate */}
            {isQuizPending || isCompleted ? (
              <QuizGate
                module={module}
                progress={progress}
                isCompleted={isCompleted}
                nextModule={nextModule}
                onNextModule={() =>
                  nextModule && navigate(`${basePath}/module/${nextModule.id}`)
                }
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-2">
                  Complete the 3 lessons to unlock the module quiz.
                </p>
                <p className="text-sm text-gray-500">
                  Go to the "The 3 Lessons" tab to start learning.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
