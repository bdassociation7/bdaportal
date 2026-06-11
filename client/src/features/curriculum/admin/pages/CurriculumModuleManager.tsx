import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Lock,
  Unlock,
  BookMarked,
  FileText,
  CheckCircle,
  Brain,
  Globe,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { CurriculumService, curriculumKeys } from '@/entities/curriculum';
import { ModuleEditor } from '../components/ModuleEditor';
import { ModulePreview } from '../components/ModulePreview';
import { useToast } from '@/components/ui/use-toast';
import { StatCard } from '../components/shared';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Curriculum Module Manager (Admin)
 * English only — Arabic content is hidden from the Learning System.
 * The curriculum is shared across both certifications (CP & SCP) — only quizzes differ.
 */
export function CurriculumModuleManager() {
  const { t } = useLanguage();
  const { toast } = useToast();

  // Always English
  const activeLanguage = 'en' as const;

  // Editor / preview state
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [previewModule, setPreviewModule] = useState<string | null>(null);

  // Section filter (per tab)
  const [filterSection, setFilterSection] = useState<'all' | 'knowledge_based' | 'behavioural'>('all');
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'draft'>('all');

  // Fetch English modules only
  const { data: modules, isLoading, refetch } = useQuery({
    queryKey: curriculumKeys.modulesList({
      section_type: filterSection === 'all' ? undefined : filterSection,
      is_published: filterPublished === 'all' ? undefined : filterPublished === 'published',
      exam_language: 'en',
    }),
    queryFn: async () => {
      const result = await CurriculumService.getModules({
        section_type: filterSection === 'all' ? undefined : filterSection,
        is_published: filterPublished === 'all' ? undefined : filterPublished === 'published',
        exam_language: 'en',
      });
      if (result.error) throw result.error;
      return result.data || [];
    },
  });

  const handleDelete = async (moduleId: string) => {
    if (!confirm(t('curriculum.deleteConfirm'))) return;
    const result = await CurriculumService.deleteModule(moduleId);
    if (!result.error) {
      toast({ title: t('curriculum.moduleDeleted'), description: t('curriculum.moduleDeletedDesc') });
      refetch();
    } else {
      toast({ title: t('common.error'), description: result.error.message || t('curriculum.deleteError'), variant: 'destructive' });
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
      toast({ title: t('common.error'), description: result.error.message || t('curriculum.publishError'), variant: 'destructive' });
    }
  };

  if (selectedModule || isCreating) {
    return (
      <ModuleEditor
        moduleId={selectedModule || undefined}
        defaultLanguage={isCreating ? 'en' : undefined}
        onClose={() => {
          setSelectedModule(null);
          setIsCreating(false);
          refetch();
        }}
      />
    );
  }

  if (previewModule) {
    return <ModulePreview moduleId={previewModule} onClose={() => setPreviewModule(null)} />;
  }

  const isEN = true;

  // Section label helper
  const sectionLabel = (section: string) => {
    if (section === 'knowledge_based') return 'Knowledge';
    if (section === 'behavioral' || section === 'behavioural') return 'Behavioural';
    if (section === 'intro') return 'Intro';
    if (section === 'outro') return 'Outro';
    return section;
  };

  const sectionBadge = (section: string) => {
    const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
    if (section === 'knowledge_based') return `${base} bg-blue-100 text-blue-700`;
    if (section === 'behavioral' || section === 'behavioural') return `${base} bg-purple-100 text-purple-700`;
    if (section === 'intro') return `${base} bg-gray-100 text-gray-600`;
    if (section === 'outro') return `${base} bg-gray-100 text-gray-600`;
    return `${base} bg-gray-100 text-gray-600`;
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-sky-500 via-blue-600 to-navy-800 rounded-xl p-6 text-white shadow">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookMarked className="h-7 w-7" />
              Curriculum Modules
            </h1>
            <p className="mt-1 text-sm opacity-80">
              Manage BDA BoCK competency modules — shared curriculum for both CP &amp; SCP certifications.
            </p>
          </div>

          {/* Add Module Button */}
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold shadow transition bg-white text-blue-600 hover:bg-blue-50"
          >
            <Plus className="w-4 h-4" />
            Add Module
          </button>
        </div>
      </div>

      {/* ── Modules Table ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div>

        {/* Tab Content */}
        <div className="p-5">
          {/* ── Stats Row ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard label="Total Modules"    value={modules?.length || 0}                                                icon={BookMarked}  color="gray"  />
            <StatCard label="Published"        value={modules?.filter(m => m.is_published).length || 0}                   icon={CheckCircle} color="green" />
            <StatCard label="Drafts"           value={modules?.filter(m => !m.is_published).length || 0}                  icon={FileText}    color="amber" />
            <StatCard label="Knowledge-Based"  value={modules?.filter(m => m.section_type === 'knowledge_based').length || 0} icon={Brain}   color="blue"  />
          </div>

          {/* ── Filters ───────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 mb-5 p-3 bg-gray-50 rounded-lg">
            <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-500 font-medium">Filter:</span>

            {/* Section filter */}
            <select
              value={filterSection}
              onChange={e => setFilterSection(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            >
              <option value="all">All Sections</option>
              <option value="knowledge_based">Knowledge-Based</option>
              <option value="behavioural">Behavioural</option>
            </select>

            {/* Published filter */}
            <select
              value={filterPublished}
              onChange={e => setFilterPublished(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="published">Published Only</option>
              <option value="draft">Drafts Only</option>
            </select>
          </div>

          {/* ── Table ─────────────────────────────────────────────── */}
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Loading modules…</p>
            </div>
          ) : modules && modules.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                    <tr className="bg-blue-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Module Name</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Section</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quiz</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {[...modules]
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((module) => (
                      <tr key={module.id} className="hover:bg-gray-50 transition-colors">
                        {/* Order index */}
                        <td className="px-5 py-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-blue-100 text-blue-700">
                            {module.order_index}
                          </div>
                        </td>

                        {/* Module name */}
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-900 text-sm">{module.competency_name}</p>
                        </td>

                        {/* Section badge */}
                        <td className="px-5 py-3">
                          <span className={sectionBadge(module.section_type)}>
                            {sectionLabel(module.section_type)}
                          </span>
                        </td>

                        {/* Quiz link */}
                        <td className="px-5 py-3">
                          {module.quiz_id ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                              <CheckCircle className="w-3.5 h-3.5" /> Linked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-500">
                              <Layers className="w-3.5 h-3.5" /> Not linked
                            </span>
                          )}
                        </td>

                        {/* Published status */}
                        <td className="px-5 py-3">
                          {module.is_published ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              <Unlock className="w-3 h-3" /> Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                              <Lock className="w-3 h-3" /> Draft
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setPreviewModule(module.id)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedModule(module.id)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleTogglePublish(module.id, module.is_published)}
                              className={`p-1.5 rounded transition ${
                                module.is_published
                                  ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                              }`}
                              title={module.is_published ? 'Unpublish' : 'Publish'}
                            >
                              {module.is_published ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDelete(module.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <BookMarked className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">
                No modules found.
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Create first module
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
