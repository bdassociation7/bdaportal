/**
 * Lesson Manager - Admin Page
 * Managing the 42 sub-competencies (lessons) of the BDA framework
 * English only — Arabic content is hidden from the Learning System.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  BookOpen,
  Search,
  CheckCircle,
  FileText,
  HelpCircle,
  Upload,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useLessons,
  useDeleteLesson,
  useTogglePublished,
  type LessonFilters,
} from '@/entities/curriculum';
import { LessonTable } from '../components/LessonTable';
import { LessonFilters as LessonFiltersComponent } from '../components/LessonFilters';
import { WordImportTab } from '../components/WordImportTab';
import { useToast } from '@/hooks/use-toast';
import { StatCard } from '../components/shared';

// Top-level page tabs
type PageTab = 'manage' | 'import';

export function LessonManager() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [pageTab, setPageTab] = useState<PageTab>('manage');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<LessonFilters>({});
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft'>('all');

  // Always English only
  const activeFilters: LessonFilters = {
    ...filters,
    is_published: activeTab === 'published' ? true : activeTab === 'draft' ? false : undefined,
    exam_language: 'en',
  };

  // Queries
  const { data: lessons, isLoading } = useLessons(activeFilters);
  const deleteLesson = useDeleteLesson();
  const togglePublished = useTogglePublished();

  // Local filtering by search
  const filteredLessons = lessons?.filter((lesson) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lesson.title.toLowerCase().includes(query) ||
      lesson.module?.competency_name.toLowerCase().includes(query)
    );
  });

  // Handlers
  const handleCreateLesson = () => {
    navigate(`/admin/curriculum/lessons/new?lang=en`);
  };

  const handleEditLesson = (lessonId: string) => {
    navigate(`/admin/curriculum/lessons/${lessonId}/edit`);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm(t('lessons.deleteConfirm'))) return;
    try {
      await deleteLesson.mutateAsync(lessonId);
      toast({
        title: t('common.success'),
        description: t('lessons.deleteSuccess'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('lessons.deleteError'),
        variant: 'destructive',
      });
    }
  };

  const handleTogglePublished = async (lessonId: string, isPublished: boolean) => {
    try {
      await togglePublished.mutateAsync({ id: lessonId, isPublished: !isPublished });
      toast({
        title: t('common.success'),
        description: !isPublished ? t('lessons.publishSuccess') : t('lessons.unpublishSuccess'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('lessons.publishError'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="rounded-xl p-6 text-white shadow bg-gradient-to-r from-sky-500 via-blue-600 to-blue-800">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-7 w-7" />
              {t('lessons.title')}
            </h1>
            <p className="mt-1 text-sm opacity-80">
              {t('lessons.subtitle')}
            </p>
          </div>

          {/* Add Lesson Button */}
          <Button
            onClick={handleCreateLesson}
            className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Lesson
          </Button>
        </div>
      </div>

      {/* ── Page-level tabs: Manage / Word Import ── */}
      <div className="flex gap-2 border-b pb-0">
        <button
          onClick={() => setPageTab('manage')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            pageTab === 'manage'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <BookOpen className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Manage Lessons
        </button>
        <button
          onClick={() => setPageTab('import')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            pageTab === 'import'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Upload className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Word Import
        </button>
      </div>

      {/* ── Word Import Tab ── */}
      {pageTab === 'import' && <WordImportTab />}

      {/* ── Manage Tab ── */}
      {pageTab === 'manage' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5">
              {/* ── Stats Row ─────────────────────────────────────────── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <StatCard
                  label={t('lessons.totalLessons')}
                  value={lessons?.length || 0}
                  icon={BookOpen}
                  color="gray"
                />
                <StatCard
                  label={t('curriculum.published')}
                  value={lessons?.filter(l => l.is_published).length || 0}
                  icon={CheckCircle}
                  color="green"
                />
                <StatCard
                  label={t('curriculum.drafts')}
                  value={lessons?.filter(l => !l.is_published).length || 0}
                  icon={FileText}
                  color="amber"
                />
                <StatCard
                  label={t('lessons.withQuiz')}
                  value={lessons?.filter(l => l.lesson_quiz_id).length || 0}
                  icon={HelpCircle}
                  color="blue"
                />
              </div>

              {/* ── Search & Filters ──────────────────────────────────── */}
              <div className="flex flex-wrap items-center gap-3 mb-5 p-3 bg-gray-50 rounded-lg">
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <Input
                  placeholder={t('lessons.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-[200px] h-8 text-sm"
                />
                <LessonFiltersComponent filters={filters} onFiltersChange={setFilters} />
                {(searchQuery || Object.keys(filters).length > 0) && (
                  <button
                    onClick={() => { setFilters({}); setSearchQuery(''); }}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    {t('common.reset')}
                  </button>
                )}
              </div>

              {/* ── Status Tabs + Table ───────────────────────────────── */}
              <Card className="border-0 shadow-none">
                <CardHeader className="px-0 pt-0 pb-3">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                    <TabsList>
                      <TabsTrigger value="all">
                        {t('common.all')} ({lessons?.length || 0})
                      </TabsTrigger>
                      <TabsTrigger value="published">
                        {t('curriculum.published')} ({lessons?.filter(l => l.is_published).length || 0})
                      </TabsTrigger>
                      <TabsTrigger value="draft">
                        {t('curriculum.drafts')} ({lessons?.filter(l => !l.is_published).length || 0})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">{t('lessons.loadingLessons')}</p>
                      </div>
                    </div>
                  ) : filteredLessons && filteredLessons.length > 0 ? (
                    <LessonTable
                      lessons={filteredLessons}
                      onEdit={handleEditLesson}
                      onDelete={handleDeleteLesson}
                      onTogglePublished={handleTogglePublished}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {searchQuery || Object.keys(filters).length > 0
                          ? t('lessons.noLessonsMatch')
                          : t('lessons.noLessonsYet')}
                      </p>
                      {!searchQuery && Object.keys(filters).length === 0 && (
                        <Button onClick={handleCreateLesson} className="mt-4">
                          {t('lessons.createFirstLesson')}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
