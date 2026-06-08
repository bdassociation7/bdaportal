/**
 * Lesson Manager - Admin Page
 * Managing the 42 sub-competencies (lessons) of the BDA framework
 */

import { useState } from 'react';
import { Plus, BookOpen, Filter, Search, CheckCircle, FileText, HelpCircle, Globe, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ExamLanguage = 'en' | 'ar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useLessons,
  useLessonSummary,
  useDeleteLesson,
  useTogglePublished,
  type LessonFilters,
} from '@/entities/curriculum';
import { LessonTable } from '../components/LessonTable';
import { LessonEditor } from '../components/LessonEditor';
import { LessonFilters as LessonFiltersComponent } from '../components/LessonFilters';
import { WordImportTab } from '../components/WordImportTab';
import { useToast } from '@/hooks/use-toast';
import { AdminPageHeader, StatCard, AdminFilterCard } from '../components/shared';

// Top-level page tabs
type PageTab = 'manage' | 'import';

export function LessonManager() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [pageTab, setPageTab] = useState<PageTab>('manage');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<LessonFilters>({});
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft'>('all');
  const [filterLanguage, setFilterLanguage] = useState<ExamLanguage>('en');
  const [createLanguage, setCreateLanguage] = useState<ExamLanguage>('en');

  // Build filters based on active tab and language
  const activeFilters: LessonFilters = {
    ...filters,
    is_published: activeTab === 'published' ? true : activeTab === 'draft' ? false : undefined,
    exam_language: filterLanguage,
  };

  // Queries
  const { data: lessons, isLoading } = useLessons(activeFilters);
  const { data: summary } = useLessonSummary();
  const deleteLesson = useDeleteLesson();
  const togglePublished = useTogglePublished();

  // Local filtering by search
  const filteredLessons = lessons?.filter((lesson) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lesson.title.toLowerCase().includes(query) ||
      lesson.title_ar?.toLowerCase().includes(query) ||
      lesson.module?.competency_name.toLowerCase().includes(query)
    );
  });

  // Handlers
  const handleCreateLesson = (language: ExamLanguage = 'en') => {
    setCreateLanguage(language);
    setEditingLessonId(undefined);
    setIsEditorOpen(true);
  };

  const handleEditLesson = (lessonId: string) => {
    setEditingLessonId(lessonId);
    setIsEditorOpen(true);
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <AdminPageHeader
        title={t('lessons.title')}
        description={t('lessons.subtitle')}
        icon={BookOpen}
        action={
          <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
            <Button onClick={() => handleCreateLesson('en')} size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
              <Plus className="mr-2 h-4 w-4" />
              🇬🇧 English Lesson
            </Button>
            <Button onClick={() => handleCreateLesson('ar')} size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50">
              <Plus className="mr-2 h-4 w-4" />
              🇸🇦 درس عربي
            </Button>
          </div>
        }
      />

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
          {/* Language Filter */}
          <div className="flex items-center gap-4 bg-white rounded-lg shadow-sm p-4">
            <Globe className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-700">{t('curriculum.selectLanguage')}:</span>
            <div className="flex gap-2">
              <Button
                variant={filterLanguage === 'en' ? 'default' : 'outline'}
                onClick={() => setFilterLanguage('en')}
                className={filterLanguage === 'en' ? 'bg-blue-600' : ''}
              >
                🇬🇧 English Lessons
              </Button>
              <Button
                variant={filterLanguage === 'ar' ? 'default' : 'outline'}
                onClick={() => setFilterLanguage('ar')}
                className={filterLanguage === 'ar' ? 'bg-emerald-600' : ''}
              >
                🇸🇦 الدروس العربية
              </Button>
            </div>
          </div>

          {/* Statistics */}
          {summary && (
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                label={t('lessons.totalLessons')}
                value={summary.total_lessons}
                icon={BookOpen}
                color="gray"
              />
              <StatCard
                label={t('curriculum.published')}
                value={summary.published_lessons}
                icon={CheckCircle}
                color="green"
              />
              <StatCard
                label={t('curriculum.drafts')}
                value={summary.draft_lessons}
                icon={FileText}
                color="amber"
              />
              <StatCard
                label={t('lessons.withQuiz')}
                value={summary.lessons_with_quiz}
                icon={HelpCircle}
                color="blue"
              />
            </div>
          )}

          {/* Filters and search */}
          <AdminFilterCard
            title={t('common.filter')}
            description={t('lessons.filterDescription')}
            onReset={() => {
              setFilters({});
              setSearchQuery('');
            }}
          >
            {/* Search bar */}
            <div className="relative md:col-span-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('lessons.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter component */}
            <div className="md:col-span-3">
              <LessonFiltersComponent filters={filters} onFiltersChange={setFilters} />
            </div>
          </AdminFilterCard>

          {/* Tabs and table */}
          <Card>
            <CardHeader>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">
                    {t('common.all')} ({summary?.total_lessons || 0})
                  </TabsTrigger>
                  <TabsTrigger value="published">
                    {t('curriculum.published')} ({summary?.published_lessons || 0})
                  </TabsTrigger>
                  <TabsTrigger value="draft">
                    {t('curriculum.drafts')} ({summary?.draft_lessons || 0})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
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
        </>
      )}

      {/* Editor modal */}
      <LessonEditor
        lessonId={editingLessonId}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingLessonId(undefined);
        }}
        defaultLanguage={editingLessonId ? undefined : createLanguage}
      />
    </div>
  );
}
