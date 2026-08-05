/**
 * Question Bank Manager - Admin Page
 * CRUD operations for question sets and questions
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  useQuestionSetsWithCompetency,
  useCreateQuestionSet,
  useUpdateQuestionSet,
  useDeleteQuestionSet,
  useAdminQuestionBankStats,
} from '@/entities/question-bank';
import {
  CurriculumService,
  curriculumKeys,
  useLessonsByModule,
} from '@/entities/curriculum';
import type {
  QuestionSetWithCompetency,
  QuestionSetInsert,
  QuestionSetUpdate,
} from '@/entities/question-bank';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  HelpCircle,
  Filter,
  MoreHorizontal,
  FileQuestion,
  Download,
  Upload,
  CheckCircle,
  List,
  Network,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Globe,
  ClipboardList,
} from 'lucide-react';
import { AdminPageHeader, StatCard, AdminFilterCard } from '@/features/curriculum/admin/components/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

type ExamLanguage = 'en';

// ─── Main Component ──────────────────────────────────────────────────────────
export function QuestionBankManager() {
  const navigate = useNavigate();
  // Admin interface should always be in English - only content is language-specific
  const language = 'en' as const;

  const t = {
    en: {
      title: 'Question Bank Manager',
      description: 'Manage question sets and practice questions',
      import: 'Import',
      export: 'Export',
      createQuestionSet: 'Create Question Set',
      totalQuestions: 'Total Questions',
      questionSets: 'Question Sets',
      published: 'Published',
      unpublished: 'Unpublished',
      filters: 'Filters',
      filterDescription: 'Search and filter question sets',
      searchPlaceholder: 'Search question sets...',
      section: 'Section',
      allSections: 'All Sections',
      introduction: 'Introduction',
      knowledge: 'Knowledge',
      behavioral: 'Behavioural',
      status: 'Status',
      allStatus: 'All Status',
      titleColumn: 'Title',
      competency: 'Competency',
      questions: 'Questions',
      actions: 'Actions',
      draft: 'Draft',
      manageQuestions: 'Manage Questions',
      editSet: 'Edit Set',
      delete: 'Delete',
      noQuestionSetsFound: 'No question sets found',
      createSet: 'Create Question Set',
      editSetTitle: 'Edit Question Set',
      deleteSetTitle: 'Delete Question Set',
      deleteConfirmation: 'Are you sure you want to delete "{title}"? This will also delete all questions in this set. This action cannot be undone.',
      cancel: 'Cancel',
      sectionType: 'Section Type',
      orderIndex: 'Order Index',
      competencyModule: 'Competency (Module)',
      subCompetency: 'Sub-competency (Lesson)',
      selectCompetency: 'Select competency (optional)',
      selectLesson: 'Select lesson (optional)',
      none: 'None (standalone)',
      noneOption: 'None',
      titleEnglish: 'Title (English) *',
      titleArabic: 'Title (Arabic)',
      descriptionEnglish: 'Description (English)',
      timeLimitMinutes: 'Time Limit (minutes)',
      optional: 'Optional',
      passingScore: 'Passing Score (%)',
      finalTest: 'Final Test (40 questions)',
      update: 'Update',
      create: 'Create',
      enterTitle: 'Enter title',
      enterTitleAr: 'ادخل العنوان',
      enterDescription: 'Enter description',
      titleRequired: 'Title is required',
      descriptionArabic: 'Description (Arabic)',
      enterDescriptionAr: 'أدخل الوصف بالعربية',
      englishVersion: 'English Version',
      arabicVersion: 'Arabic Version',
      createSuccess: 'Question set created successfully',
      createError: 'Failed to create question set',
      updateSuccess: 'Question set updated successfully',
      updateError: 'Failed to update question set',
      deleteSuccess: 'Question set deleted successfully',
      deleteError: 'Failed to delete question set',
      publishSuccess: 'Question set published',
      unpublishSuccess: 'Question set unpublished',
      publishError: 'Failed to update publish status',
      tableView: 'Table View',
      treeView: 'Tree View',
      expandAll: 'Expand All',
      collapseAll: 'Collapse All',
      noCompetency: 'Standalone Sets',
      selectLanguage: 'Select Language',
      englishQuestionSets: 'English Question Sets',
      arabicQuestionSets: 'Arabic Question Sets',
      createEnglishSet: 'English Set',
      createArabicSet: 'Arabic Set',
    },
    ar: {
      title: 'إدارة بنك الأسئلة',
      description: 'إدارة مجموعات الأسئلة وأسئلة التمرين',
      import: 'استيراد',
      export: 'تصدير',
      createQuestionSet: 'إنشاء مجموعة أسئلة',
      totalQuestions: 'إجمالي الأسئلة',
      questionSets: 'مجموعات الأسئلة',
      published: 'منشور',
      unpublished: 'غير منشور',
      filters: 'الفلاتر',
      filterDescription: 'البحث والتصفية في مجموعات الأسئلة',
      searchPlaceholder: 'البحث في مجموعات الأسئلة...',
      section: 'القسم',
      allSections: 'جميع الأقسام',
      introduction: 'مقدمة',
      knowledge: 'معرفة',
      behavioral: 'سلوكي',
      status: 'الحالة',
      allStatus: 'جميع الحالات',
      titleColumn: 'العنوان',
      competency: 'الكفاءة',
      questions: 'الأسئلة',
      actions: 'الإجراءات',
      draft: 'مسودة',
      manageQuestions: 'إدارة الأسئلة',
      editSet: 'تعديل المجموعة',
      delete: 'حذف',
      noQuestionSetsFound: 'لم يتم العثور على مجموعات أسئلة',
      createSet: 'إنشاء مجموعة أسئلة',
      editSetTitle: 'تعديل مجموعة الأسئلة',
      deleteSetTitle: 'حذف مجموعة الأسئلة',
      deleteConfirmation: 'هل أنت متأكد من حذف "{title}"؟ سيؤدي هذا أيضًا إلى حذف جميع الأسئلة في هذه المجموعة. لا يمكن التراجع عن هذا الإجراء.',
      cancel: 'إلغاء',
      sectionType: 'نوع القسم',
      orderIndex: 'ترتيب العرض',
      competencyModule: 'الكفاءة (الوحدة)',
      subCompetency: 'الكفاءة الفرعية (الدرس)',
      selectCompetency: 'اختر الكفاءة (اختياري)',
      selectLesson: 'اختر الدرس (اختياري)',
      none: 'لا شيء (مستقل)',
      noneOption: 'لا شيء',
      titleEnglish: 'العنوان (بالإنجليزية) *',
      titleArabic: 'العنوان (بالعربية)',
      descriptionEnglish: 'الوصف (بالإنجليزية)',
      timeLimitMinutes: 'الوقت المحدد (بالدقائق)',
      optional: 'اختياري',
      passingScore: 'درجة النجاح (%)',
      finalTest: 'اختبار نهائي (40 سؤال)',
      update: 'تحديث',
      create: 'إنشاء',
      enterTitle: 'أدخل العنوان',
      enterTitleAr: 'ادخل العنوان',
      enterDescription: 'أدخل الوصف',
      titleRequired: 'العنوان مطلوب',
      descriptionArabic: 'الوصف (بالعربية)',
      enterDescriptionAr: 'أدخل الوصف بالعربية',
      englishVersion: 'النسخة الإنجليزية',
      arabicVersion: 'النسخة العربية',
      createSuccess: 'تم إنشاء مجموعة الأسئلة بنجاح',
      createError: 'فشل في إنشاء مجموعة الأسئلة',
      updateSuccess: 'تم تحديث مجموعة الأسئلة بنجاح',
      updateError: 'فشل في تحديث مجموعة الأسئلة',
      deleteSuccess: 'تم حذف مجموعة الأسئلة بنجاح',
      deleteError: 'فشل في حذف مجموعة الأسئلة',
      publishSuccess: 'تم نشر مجموعة الأسئلة',
      unpublishSuccess: 'تم إلغاء نشر مجموعة الأسئلة',
      publishError: 'فشل في تحديث حالة النشر',
      tableView: 'عرض الجدول',
      treeView: 'عرض الشجرة',
      expandAll: 'توسيع الكل',
      collapseAll: 'طي الكل',
      noCompetency: 'مجموعات مستقلة',
      selectLanguage: 'اختر اللغة',
      englishQuestionSets: 'مجموعات الأسئلة الإنجليزية',
      arabicQuestionSets: 'مجموعات الأسئلة العربية',
      createEnglishSet: 'مجموعة إنجليزية',
      createArabicSet: 'مجموعة عربية',
    }
  };

  const texts = t[language];

  // State
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('tree');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [publishedFilter, setPublishedFilter] = useState<string>('all');
  const filterLanguage: ExamLanguage = 'en';
  const createLanguage: ExamLanguage = 'en';
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<QuestionSetWithCompetency | null>(
    null
  );
  const [deleteConfirmSet, setDeleteConfirmSet] =
    useState<QuestionSetWithCompetency | null>(null);

  // Data fetching
  const { data: questionSets, isLoading } = useQuestionSetsWithCompetency({
    certification_type: 'CP',
    section_type:
      sectionFilter !== 'all' ? (sectionFilter as any) : undefined,
    is_published: publishedFilter === 'all' ? undefined : publishedFilter === 'published',
    exam_language: 'en',
  });
  const { data: stats } = useAdminQuestionBankStats('CP');

  // Mutations
  const createSet = useCreateQuestionSet();
  const updateSet = useUpdateQuestionSet();
  const deleteSet = useDeleteQuestionSet();

  // Filter question sets
  const filteredSets = questionSets?.filter((set) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        set.title.toLowerCase().includes(search) ||
        set.competency?.competency_name.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Group sets by competency for tree view
  const groupedSets = filteredSets?.reduce((acc, set) => {
    const competencyKey = set.competency_id || 'standalone';
    if (!acc[competencyKey]) {
      acc[competencyKey] = {
        competency: set.competency,
        sets: [],
      };
    }
    acc[competencyKey].sets.push(set);
    return acc;
  }, {} as Record<string, { competency: any; sets: QuestionSetWithCompetency[] }>);

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Expand/collapse all
  const expandAll = () => {
    if (groupedSets) {
      setExpandedNodes(new Set(Object.keys(groupedSets)));
    }
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Handle create
  const handleCreate = async (data: QuestionSetInsert) => {
    try {
      await createSet.mutateAsync(data);
      toast.success(texts.createSuccess);
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error(texts.createError);
    }
  };

  // Handle update
  const handleUpdate = async (setId: string, data: QuestionSetUpdate) => {
    try {
      await updateSet.mutateAsync({ setId, updates: data });
      toast.success(texts.updateSuccess);
      setEditingSet(null);
    } catch (error) {
      toast.error(texts.updateError);
    }
  };

  // Handle delete
  const handleDelete = async (setId: string) => {
    try {
      await deleteSet.mutateAsync(setId);
      toast.success(texts.deleteSuccess);
      setDeleteConfirmSet(null);
    } catch (error) {
      toast.error(texts.deleteError);
    }
  };

  // Handle toggle publish
  const handleTogglePublish = async (set: QuestionSetWithCompetency) => {
    try {
      await updateSet.mutateAsync({
        setId: set.id,
        updates: { is_published: !set.is_published },
      });
      toast.success(
        set.is_published ? texts.unpublishSuccess : texts.publishSuccess
      );
    } catch (error) {
      toast.error(texts.publishError);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <AdminPageHeader
        title="Assessment Bank"
        description="Manage practice question sets for the BDA learning curriculum"
        icon={ClipboardList}
        action={
          <div className="flex gap-3">
            <Button variant="outline" className="bg-white text-gray-700 hover:bg-blue-50">
              <Upload className="w-4 h-4 mr-2" />
              {texts.import}
            </Button>
            <Button variant="outline" className="bg-white text-gray-700 hover:bg-blue-50">
              <Download className="w-4 h-4 mr-2" />
              {texts.export}
            </Button>
            <Button
                onClick={() => {
                  setIsCreateDialogOpen(true);
                }}
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                {texts.createEnglishSet}
              </Button>
          </div>
        }
      />

      {/* Practice Question Sets */}



      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label={texts.totalQuestions}
            value={stats.totalQuestions}
            icon={HelpCircle}
            color="green"
          />
          <StatCard
            label={texts.questionSets}
            value={stats.totalSets}
            icon={FileQuestion}
            color="blue"
          />
          <StatCard
            label={texts.published}
            value={stats.publishedSets}
            icon={CheckCircle}
            color="purple"
          />
          <StatCard
            label={texts.unpublished}
            value={stats.unpublishedSets}
            icon={EyeOff}
            color="gray"
          />
        </div>
      )}

      {/* Filters */}
      <AdminFilterCard
        title={texts.filters}
        description={texts.filterDescription}
        onReset={() => {
          setSearchTerm('');
          setSectionFilter('all');
          setPublishedFilter('all');
        }}
      >
        <div className="relative md:col-span-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={texts.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger>
            <SelectValue placeholder={texts.section} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{texts.allSections}</SelectItem>
            <SelectItem value="knowledge">{texts.knowledge}</SelectItem>
            <SelectItem value="behavioral">{texts.behavioral}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={publishedFilter} onValueChange={setPublishedFilter}>
          <SelectTrigger>
            <SelectValue placeholder={texts.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{texts.allStatus}</SelectItem>
            <SelectItem value="published">{texts.published}</SelectItem>
            <SelectItem value="unpublished">{texts.unpublished}</SelectItem>
          </SelectContent>
        </Select>
      </AdminFilterCard>

      {/* View Toggle and Tree Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="w-4 h-4 mr-2" />
            {texts.tableView}
          </Button>
          <Button
            variant={viewMode === 'tree' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('tree')}
          >
            <Network className="w-4 h-4 mr-2" />
            {texts.treeView}
          </Button>
        </div>
        {viewMode === 'tree' && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              {texts.expandAll}
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              {texts.collapseAll}
            </Button>
          </div>
        )}
      </div>

      {/* Tree View */}
      {viewMode === 'tree' && groupedSets && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="divide-y">
            {Object.entries(groupedSets)
              .sort((a, b) => {
                // Put standalone at the end
                if (a[0] === 'standalone') return 1;
                if (b[0] === 'standalone') return -1;
                return (a[1].competency?.order_index || 0) - (b[1].competency?.order_index || 0);
              })
              .map(([key, group]) => {
                const isExpanded = expandedNodes.has(key);
                const competencyName = group.competency?.competency_name || texts.noCompetency;
                const competencyOrder = group.competency?.order_index;

                return (
                  <div key={key}>
                    {/* Competency Node */}
                    <button
                      onClick={() => toggleNode(key)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                        {isExpanded ? (
                          <FolderOpen className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Folder className="w-5 h-5 text-blue-500" />
                        )}
                        <span className="font-medium text-gray-900">
                          {competencyOrder ? `${competencyOrder}. ` : ''}{competencyName}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({group.sets.length} {texts.questionSets.toLowerCase()})
                        </span>
                      </div>
                    </button>

                    {/* Question Sets under this Competency */}
                    {isExpanded && (
                      <div className="pl-12 pb-2 bg-gray-50">
                        {[...group.sets].sort((a, b) => {
                          const aOrder = (a.sub_unit as any)?.order_index ?? a.order_index ?? 0;
                          const bOrder = (b.sub_unit as any)?.order_index ?? b.order_index ?? 0;
                          return aOrder - bOrder;
                        }).map((set) => (
                          <div
                            key={set.id}
                            className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 rounded mx-2 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <FileQuestion className="w-4 h-4 text-green-500" />
                              <div>
                                <p className="font-medium text-gray-800">{set.title}</p>
                                {set.title_ar && (
                                  <p className="text-sm text-gray-500" dir="rtl">{set.title_ar}</p>
                                )}
                              </div>
                              <span className="text-sm text-gray-500">
                                ({set.question_count} {texts.questions.toLowerCase()})
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  set.is_published
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {set.is_published ? texts.published : texts.draft}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/question-bank/sets/${set.id}`)}
                              >
                                <HelpCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingSet(set)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirmSet(set)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {(!groupedSets || Object.keys(groupedSets).length === 0) && (
            <div className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">{texts.noQuestionSetsFound}</p>
            </div>
          )}
        </div>
      )}

      {/* Question Sets Table */}
      {viewMode === 'table' && (
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                {texts.titleColumn}
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                {texts.competency}
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                {texts.section}
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">
                {texts.questions}
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">
                {texts.status}
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">
                {texts.actions}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredSets?.map((set) => (
              <tr key={set.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium text-gray-900">{set.title}</p>
                    {set.title_ar && (
                      <p className="text-sm text-gray-500" dir="rtl">
                        {set.title_ar}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <p className="text-gray-700">
                    {set.competency?.competency_name || '-'}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      set.section_type === 'knowledge'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {set.section_type === 'knowledge' ? texts.knowledge : texts.behavioral}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="font-semibold text-gray-900">
                    {set.question_count}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => handleTogglePublish(set)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                      set.is_published
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {set.is_published ? (
                      <>
                        <Eye className="w-3 h-3" />
                        {texts.published}
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" />
                        {texts.draft}
                      </>
                    )}
                  </button>
                </td>
                <td className="py-3 px-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          navigate(`/admin/question-bank/sets/${set.id}`)
                        }
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        {texts.manageQuestions}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingSet(set)}>
                        <Edit className="w-4 h-4 mr-2" />
                        {texts.editSet}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteConfirmSet(set)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {texts.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSets?.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">{texts.noQuestionSetsFound}</p>
          </div>
        )}
      </div>
      )}

      {/* Create Dialog */}
      <QuestionSetDialog
        key={`create-${createLanguage}`}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        title={texts.createSet}
        texts={texts}
        defaultLanguage={createLanguage}
      />

      {/* Edit Dialog */}
      <QuestionSetDialog
        open={!!editingSet}
        onOpenChange={(open) => !open && setEditingSet(null)}
        onSubmit={(data) => editingSet && handleUpdate(editingSet.id, data)}
        title={texts.editSetTitle}
        defaultValues={editingSet || undefined}
        texts={texts}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirmSet}
        onOpenChange={(open) => !open && setDeleteConfirmSet(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{texts.deleteSetTitle}</DialogTitle>
            <DialogDescription>
              {texts.deleteConfirmation.replace('{title}', deleteConfirmSet?.title || '')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmSet(null)}
            >
              {texts.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmSet && handleDelete(deleteConfirmSet.id)
              }
            >
              {texts.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Question Set Dialog Component
interface QuestionSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: QuestionSetInsert | QuestionSetUpdate) => void;
  title: string;
  defaultValues?: Partial<QuestionSetWithCompetency>;
  texts: Record<string, string>;
  defaultLanguage?: ExamLanguage;
}

function QuestionSetDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  defaultValues,
  texts,
  defaultLanguage = 'en',
}: QuestionSetDialogProps) {
  const examLanguage: ExamLanguage = 'en';
  const [formData, setFormData] = useState<Partial<QuestionSetInsert>>({
    certification_type: defaultValues?.certification_type || 'CP',
    section_type: defaultValues?.section_type || 'knowledge',
    competency_id: defaultValues?.competency_id || null,
    sub_unit_id: defaultValues?.sub_unit_id || null,
    title: defaultValues?.title || '',
    title_ar: defaultValues?.title_ar || '',
    description: defaultValues?.description || '',
    description_ar: defaultValues?.description_ar || '',
    is_final_test: defaultValues?.is_final_test || false,
    time_limit_minutes: defaultValues?.time_limit_minutes || undefined,
    passing_score: defaultValues?.passing_score || 70,
    order_index: defaultValues?.order_index || 1,
    is_published: defaultValues?.is_published || false,
    exam_language: (defaultValues as any)?.exam_language || defaultLanguage,
  });

  // Map question-set section_type to curriculum_modules section_type
  const moduleSectionType = formData.section_type === 'behavioral' ? 'behavioral' : 'knowledge_based';

  // Fetch English modules filtered by section_type
  const { data: modules } = useQuery({
    queryKey: curriculumKeys.modulesList({ exam_language: 'en', section_type: moduleSectionType }),
    queryFn: async () => {
      const result = await CurriculumService.getModules({ exam_language: 'en', section_type: moduleSectionType as any });
      return result.data || [];
    },
  });

  // Fetch lessons for sub-unit selector (filtered by selected competency)
  const { data: lessons } = useLessonsByModule(
    formData.competency_id || undefined,
    !!formData.competency_id
  );

  const handleSubmit = () => {
    if (!formData.title) {
      toast.error(texts.titleRequired);
      return;
    }
    onSubmit(formData as QuestionSetInsert);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{texts.sectionType}</Label>
              <Select
                value={formData.section_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, section_type: value as any, competency_id: null, sub_unit_id: null })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="knowledge">{texts.knowledge}</SelectItem>
                  <SelectItem value="behavioral">{texts.behavioral}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{texts.orderIndex}</Label>
              <Input
                type="number"
                value={formData.order_index}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    order_index: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>

          {/* Competency Linkage - BDA BoCK Structure */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-3">BDA BoCK Structure Linkage</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{texts.competencyModule}</Label>
                <Select
                  value={formData.competency_id || 'none'}
                  onValueChange={(value) => {
                    const newCompetencyId = value === 'none' ? null : value;
                    setFormData({
                      ...formData,
                      competency_id: newCompetencyId,
                      sub_unit_id: null, // Reset sub-unit when competency changes
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={texts.selectCompetency} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{texts.none}</SelectItem>
                    {modules?.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.order_index}. {module.competency_name || 'Untitled'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{texts.subCompetency}</Label>
                <Select
                  value={formData.sub_unit_id || 'none'}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      sub_unit_id: value === 'none' ? null : value,
                    })
                  }
                  disabled={!formData.competency_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={texts.selectLesson} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{texts.noneOption}</SelectItem>
                    {lessons?.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        {lesson.order_index}. {lesson.title || 'Untitled'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-4">
              <div>
                <Label>{texts.titleEnglish}</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={texts.enterTitle}
                />
              </div>

              <div>
                <Label>{texts.descriptionEnglish}</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={texts.enterDescription}
                  rows={3}
                />
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{texts.timeLimitMinutes}</Label>
              <Input
                type="number"
                value={formData.time_limit_minutes || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    time_limit_minutes: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                placeholder={texts.optional}
              />
            </div>
            <div>
              <Label>{texts.passingScore}</Label>
              <Input
                type="number"
                value={formData.passing_score}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    passing_score: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_final_test}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_final_test: checked })
                }
              />
              <Label>{texts.finalTest}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_published: checked })
                }
              />
              <Label>{texts.published}</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {texts.cancel}
          </Button>
          <Button onClick={handleSubmit}>
            {defaultValues ? texts.update : texts.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
