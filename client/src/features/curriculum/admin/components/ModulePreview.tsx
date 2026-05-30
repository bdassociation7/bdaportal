import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, BookOpen, Award, Lock, CheckCircle } from 'lucide-react';
import { CurriculumService, curriculumKeys } from '@/entities/curriculum';
import { ContentRenderer } from '../../components/ContentRenderer';

interface ModulePreviewProps {
  moduleId: string;
  onClose: () => void;
}

/**
 * Module Preview Component
 * Read-only preview of module as it will appear to users
 */
export function ModulePreview({ moduleId, onClose }: ModulePreviewProps) {
  // Fetch module data
  const { data: module, isLoading, error } = useQuery({
    queryKey: curriculumKeys.moduleDetail(moduleId),
    queryFn: async () => {
      const result = await CurriculumService.getModuleById(moduleId);
      if (result.error) throw result.error;
      return result.data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading preview...</p>
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600">Failed to load module preview</p>
        <button
          onClick={onClose}
          className="mt-4 text-blue-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                    PREVIEW MODE
                  </span>
                  {!module.is_published && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Draft
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  {module.competency_name}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Module Header Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {/* Module Number & Type */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-blue-600">
                {module.order_index}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {module.competency_name}
              </h2>
              <p className="text-sm text-gray-600">
                {module.section_type === 'knowledge_based'
                  ? '🧠 Knowledge-Based Competency'
                  : '💼 Behavioural Competency'}
                {' • '}
                {module.certification_type.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              {module.estimated_minutes || 30} min read
            </div>
            {module.learning_objectives && module.learning_objectives.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="w-4 h-4" />
                {module.learning_objectives.length} learning objectives
              </div>
            )}
            {module.quiz_id && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Award className="w-4 h-4" />
                Quiz required ({module.quiz_passing_score}% to pass)
              </div>
            )}
          </div>
        </div>

        {/* Learning Objectives */}
        {module.learning_objectives && module.learning_objectives.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Learning Objectives
            </h3>
            <ul className="space-y-2">
              {module.learning_objectives.map((objective, index) => (
                <li key={index} className="flex items-start gap-2 text-blue-900">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Module Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <ContentRenderer content={module.content} />
        </div>

        {/* Quiz Gate Preview */}
        {module.quiz_id && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Award className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Module Quiz Required
            </h3>
            <p className="text-gray-600 mb-1">
              Complete the quiz to unlock the next module
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Passing score: {module.quiz_passing_score}%
            </p>
            <button
              disabled
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg opacity-50 cursor-not-allowed"
            >
              Take Quiz (Preview Mode)
            </button>
          </div>
        )}

        {/* Preview Notice */}
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-900 text-center">
            This is a preview of how the module will appear to users. Progress tracking and quiz functionality are disabled in preview mode.
          </p>
        </div>
      </div>
    </div>
  );
}
