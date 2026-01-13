import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Eye, Lock, Unlock, BookMarked, FileText, CheckCircle, Brain, Globe } from 'lucide-react';
import { CurriculumService, curriculumKeys } from '@/entities/curriculum';
import { ModuleEditor } from '../components/ModuleEditor';
import { ModulePreview } from '../components/ModulePreview';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { StatCard } from '../components/shared';
import { useLanguage } from '@/contexts/LanguageContext';

type ExamLanguage = 'en' | 'ar';

/**
 * Curriculum Module Manager (Admin)
 * CRUD interface for managing all 14 curriculum modules
 */
export function CurriculumModuleManager() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createLanguage, setCreateLanguage] = useState<ExamLanguage>('en');
  const [previewModule, setPreviewModule] = useState<string | null>(null);
  const [filterSection, setFilterSection] = useState<'all' | 'knowledge_based' | 'behavioral'>('all');
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'draft'>('all');
  const [filterLanguage, setFilterLanguage] = useState<ExamLanguage>('en');

  // Fetch all modules
  const { data: modules, isLoading, refetch } = useQuery({
    queryKey: curriculumKeys.modulesList({
      section_type: filterSection === 'all' ? undefined : filterSection,
      is_published: filterPublished === 'all' ? undefined : filterPublished === 'published',
      exam_language: filterLanguage,
    }),
    queryFn: async () => {
      const result = await CurriculumService.getModules({
        section_type: filterSection === 'all' ? undefined : filterSection,
        is_published: filterPublished === 'all' ? undefined : filterPublished === 'published',
        exam_language: filterLanguage,
      });
      if (result.error) throw result.error;
      return result.data || [];
    },
  });

  const handleDelete = async (moduleId: string) => {
    if (!confirm(t('curriculum.deleteConfirm'))) {
      return;
    }

    const result = await CurriculumService.deleteModule(moduleId);
    if (!result.error) {
      toast({
        title: t('curriculum.moduleDeleted'),
        description: t('curriculum.moduleDeletedDesc'),
      });
      refetch();
    } else {
      toast({
        title: t('common.error'),
        description: result.error.message || t('curriculum.deleteError'),
        variant: 'destructive',
      });
    }
  };

  const handleTogglePublish = async (moduleId: string, isPublished: boolean) => {
    const result = await CurriculumService.togglePublishModule(moduleId, !isPublished);
    if (!result.error) {
      toast({
        title: isPublished ? t('curriculum.moduleUnpublished') : t('curriculum.modulePublished'),
        description: isPublished ? t('curriculum.moduleUnpublishedDesc') : t('curriculum.modulePublishedDesc'),
      });
      refetch();
    } else {
      toast({
        title: t('common.error'),
        description: result.error.message || t('curriculum.publishError'),
        variant: 'destructive',
      });
    }
  };

  if (selectedModule || isCreating) {
    return (
      <ModuleEditor
        moduleId={selectedModule || undefined}
        defaultLanguage={isCreating ? createLanguage : undefined}
        onClose={() => {
          setSelectedModule(null);
          setIsCreating(false);
          refetch();
        }}
      />
    );
  }

  if (previewModule) {
    return (
      <ModulePreview
        moduleId={previewModule}
        onClose={() => setPreviewModule(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookMarked className="h-8 w-8" />
              {t('curriculum.title')}
            </h1>
            <p className="mt-2 opacity-90">
              {t('curriculum.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Create Module with Language Selection */}
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => {
                  setCreateLanguage('en');
                  setIsCreating(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 font-semibold rounded-md hover:bg-blue-50 transition"
              >
                <Plus className="w-4 h-4" />
                🇬🇧 English Module
              </button>
              <button
                onClick={() => {
                  setCreateLanguage('ar');
                  setIsCreating(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 font-semibold rounded-md hover:bg-emerald-50 transition"
              >
                <Plus className="w-4 h-4" />
                🇸🇦 وحدة عربية
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Language Filter - Prominent */}
      <div className="flex items-center gap-4 bg-white rounded-lg shadow-sm p-4">
        <Globe className="h-5 w-5 text-gray-500" />
        <span className="font-medium text-gray-700">{t('curriculum.selectLanguage')}:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterLanguage('en')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              filterLanguage === 'en'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🇬🇧 English Modules
          </button>
          <button
            onClick={() => setFilterLanguage('ar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              filterLanguage === 'ar'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🇸🇦 الوحدات العربية
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Section Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('curriculum.sectionType')}
            </label>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('curriculum.allSections')}</option>
              <option value="knowledge_based">{t('curriculum.knowledgeBased')}</option>
              <option value="behavioral">{t('curriculum.behavioral')}</option>
            </select>
          </div>

          {/* Published Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('curriculum.publicationStatus')}
            </label>
            <select
              value={filterPublished}
              onChange={(e) => setFilterPublished(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('curriculum.allStatus')}</option>
              <option value="published">{t('curriculum.publishedOnly')}</option>
              <option value="draft">{t('curriculum.draftsOnly')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label={t('curriculum.totalModules')}
          value={modules?.length || 0}
          icon={BookMarked}
          color="gray"
        />
        <StatCard
          label={t('curriculum.published')}
          value={modules?.filter((m) => m.is_published).length || 0}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          label={t('curriculum.drafts')}
          value={modules?.filter((m) => !m.is_published).length || 0}
          icon={FileText}
          color="amber"
        />
        <StatCard
          label={t('curriculum.knowledgeBasedShort')}
          value={modules?.filter((m) => m.section_type === 'knowledge_based').length || 0}
          icon={Brain}
          color="blue"
        />
      </div>

      {/* Modules Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('curriculum.loadingModules')}</p>
          </div>
        ) : modules && modules.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('curriculum.module')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('curriculum.section')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('curriculum.quiz')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modules
                .sort((a, b) => a.order_index - b.order_index)
                .map((module) => (
                  <tr key={module.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="font-semibold text-blue-600">
                            {module.order_index}
                          </span>
                        </div>
                        <div className="ml-4">
                          <p className="font-medium text-gray-900">
                            {module.competency_name}
                          </p>
                          {module.competency_name_ar && (
                            <p className="text-sm text-gray-600" dir="rtl">
                              {module.competency_name_ar}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {module.certification_type.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {module.section_type === 'knowledge_based'
                          ? t('curriculum.knowledgeShort')
                          : t('curriculum.behavioralShort')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {module.quiz_id ? (
                        <span className="text-sm text-green-600 font-medium">
                          {t('curriculum.linked')}
                        </span>
                      ) : (
                        <span className="text-sm text-red-600">{t('curriculum.notLinked')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {module.is_published ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          <Unlock className="w-3 h-3" />
                          {t('curriculum.published')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                          <Lock className="w-3 h-3" />
                          {t('curriculum.draft')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewModule(module.id)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title={t('common.preview')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedModule(module.id)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title={t('common.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleTogglePublish(module.id, module.is_published)
                          }
                          className={`p-2 rounded transition ${
                            module.is_published
                              ? 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                              : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={module.is_published ? t('curriculum.unpublish') : t('curriculum.publish')}
                        >
                          {module.is_published ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(module.id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-600 mb-4">{t('curriculum.noModulesFound')}</p>
            <button
              onClick={() => setIsCreating(true)}
              className="text-blue-600 hover:underline"
            >
              {t('curriculum.createFirstModule')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
