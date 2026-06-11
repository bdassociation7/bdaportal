/**
 * Learning System Admin - Unified Page
 *
 * Replaces the fragmented 5-page structure with a single unified view:
 * - Tab 1: Curriculum (tree view: Module → Lessons → Quiz per Lesson)
 * - Tab 2: Quizzes (standalone quiz bank management)
 * - Tab 3: Flashcards (deck management)
 * - Tab 4: Access Management
 *
 * English only — Arabic content is hidden from the Learning System.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookMarked,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  FileQuestion,
  Layers,
  UserCog,
  Globe,
  Brain,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  Unlink,
  Upload,
  BarChart3,
  Package,
  Search,
  Filter,
  X,
  ExternalLink,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  CurriculumService,
  curriculumKeys,
  useLessonsByModule,
  useDeleteLesson,
  useTogglePublished,
} from '@/entities/curriculum';
import type { CurriculumModule } from '@/entities/curriculum';
import { useAllQuizzes } from '@/entities/quiz';
import { useDecksWithCompetency, useAdminFlashcardStats } from '@/entities/flashcards';
import { ModuleEditor } from '../components/ModuleEditor';
import { ModulePreview } from '../components/ModulePreview';
import { LessonEditor } from '../components/LessonEditor';
import { WordImportTab } from '../components/WordImportTab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/shared/utils/cn';
import { AccessManagement } from './AccessManagement';

type ExamLanguage = 'en';
type AdminTab = 'curriculum' | 'quizzes' | 'flashcards' | 'access';

// ─────────────────────────────────────────────────────────────────────────────
// MODULE ROW (expandable)
// ─────────────────────────────────────────────────────────────────────────────
interface ModuleRowProps {
  module: CurriculumModule;
  language: ExamLanguage;
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string, current: boolean) => void;
  onAddLesson: (moduleId: string) => void;
  onImportWord: (moduleId: string) => void;
  quizMap: Record<string, { id: string; title: string; title_ar?: string | null }>;
  navigate: ReturnType<typeof useNavigate>;
}

function ModuleRow({
  module,
  language,
  onEdit,
  onPreview,
  onDelete,
  onTogglePublish,
  onAddLesson,
  onImportWord,
  quizMap,
  navigate,
}: ModuleRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const deleteLesson = useDeleteLesson();
  const togglePublished = useTogglePublished();

  const { data: lessons, isLoading: lessonsLoading } = useLessonsByModule(
    expanded ? module.id : undefined,
    expanded
  );

  const filteredLessons = useMemo(
    () => (lessons || []).filter((l) => l.exam_language === 'en').sort((a, b) => a.order_index - b.order_index),
    [lessons]
  );

  const moduleName = module.competency_name;

  const sectionColor =
    module.section_type === 'knowledge_based'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-purple-100 text-purple-700';

  const handleDeleteLesson = async (lessonId: string, lessonTitle: string) => {
    if (!confirm(`Delete lesson "${lessonTitle}"?`)) return;
    await deleteLesson.mutateAsync(lessonId);
    toast({ title: 'Lesson deleted' });
  };

  const handleToggleLessonPublish = async (lessonId: string, current: boolean) => {
    await togglePublished.mutateAsync({ id: lessonId, is_published: !current });
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
      {/* Module Header */}
      <div
        className={cn(
          'flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors',
          expanded && 'bg-gray-50 border-b border-gray-200'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <button className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* Order badge */}
        <div className="w-7 h-7 rounded-full bg-navy-100 text-navy-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {module.order_index}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate text-sm">{moduleName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', sectionColor)}>
              {module.section_type === 'knowledge_based' ? 'Knowledge' : 'Behavioural'}
            </span>
            <span className="text-xs text-gray-400">{module.certification_type}</span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {module.is_published ? (
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
              Published
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-xs">
              Draft
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-1 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onPreview(module.id)} title="Preview">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(module.id)} title="Edit">
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onTogglePublish(module.id, module.is_published)}
            title={module.is_published ? 'Unpublish' : 'Publish'}
          >
            {module.is_published ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
            onClick={() => onDelete(module.id)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Lessons (expanded) */}
      {expanded && (
        <div className="bg-gray-50/50 px-4 py-3 space-y-2">
          {lessonsLoading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading lessons...
            </div>
          ) : filteredLessons.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-1">
              No English lessons yet.
            </p>
          ) : (
            filteredLessons.map((lesson) => {
              const linkedQuiz = lesson.lesson_quiz_id ? quizMap[lesson.lesson_quiz_id] : null;
              return (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 bg-white rounded-md border border-gray-100 px-3 py-2 text-sm"
                >
                  {/* Lesson number */}
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {lesson.order_index}
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {lesson.title}
                    </p>
                    {/* Quiz badge */}
                    {linkedQuiz ? (
                      <span className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        Quiz: {linkedQuiz.title}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-500 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="h-3 w-3" />
                        No quiz linked
                      </span>
                    )}
                  </div>

                  {/* Published status */}
                  <div className="flex-shrink-0">
                    {lesson.is_published ? (
                      <span className="text-xs text-green-600">●</span>
                    ) : (
                      <span className="text-xs text-gray-300">●</span>
                    )}
                  </div>

                  {/* Lesson actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => navigate(`/admin/curriculum/lessons?edit=${lesson.id}`)}
                      title="Edit lesson"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleToggleLessonPublish(lesson.id, lesson.is_published)}
                      title={lesson.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {lesson.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                      onClick={() =>
                        handleDeleteLesson(lesson.id, lesson.title)
                      }
                      title="Delete lesson"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          {/* Add lesson + Import Word buttons */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => onAddLesson(module.id)}
            >
              <Plus className="h-3 w-3" />
              Add Lesson
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => onImportWord(module.id)}
            >
              <Upload className="h-3 w-3" />
              Import Word
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CURRICULUM TAB
// ─────────────────────────────────────────────────────────────────────────────
interface CurriculumTabProps {
  language: ExamLanguage;
}

function CurriculumTab({ language }: CurriculumTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [previewModuleId, setPreviewModuleId] = useState<string | null>(null);
  const [addLessonModuleId, setAddLessonModuleId] = useState<string | null>(null);
  const [importWordModuleId, setImportWordModuleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSection, setFilterSection] = useState<'all' | 'knowledge_based' | 'behavioural'>('all');

  // Fetch modules
  const { data: modules, isLoading, refetch } = useQuery({
    queryKey: [...curriculumKeys.modulesList({ exam_language: language }), 'admin-tree'],
    queryFn: async () => {
      const result = await CurriculumService.getModules({ exam_language: language });
      if (result.error) throw result.error;
      return result.data || [];
    },
  });

  // Fetch all quizzes for linking display
  const { data: quizzes } = useAllQuizzes();
  const quizMap = useMemo(() => {
    const map: Record<string, { id: string; title: string; title_ar?: string | null }> = {};
    (quizzes || []).forEach((q) => {
      map[q.id] = { id: q.id, title: q.title, title_ar: q.title_ar };
    });
    return map;
  }, [quizzes]);

  const filteredModules = useMemo(() => {
    let list = modules || [];
    if (filterSection !== 'all') list = list.filter((m) => m.section_type === filterSection);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.competency_name.toLowerCase().includes(q) ||
          (m.competency_name_ar || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => a.order_index - b.order_index);
  }, [modules, filterSection, searchQuery]);

  const handleDelete = async (moduleId: string) => {
    if (!confirm('Delete this module and all its lessons?')) return;
    const result = await CurriculumService.deleteModule(moduleId);
    if (!result.error) {
      toast({ title: 'Module deleted' });
      refetch();
    } else {
      toast({ title: 'Error', description: result.error.message, variant: 'destructive' });
    }
  };

  const handleTogglePublish = async (moduleId: string, current: boolean) => {
    const result = await CurriculumService.togglePublishModule(moduleId, !current);
    if (!result.error) {
      toast({ title: current ? 'Module unpublished' : 'Module published' });
      refetch();
    }
  };

  // Show ModuleEditor overlay
  if (editingModuleId || isCreatingModule) {
    return (
      <ModuleEditor
        moduleId={editingModuleId || undefined}
        defaultLanguage={isCreatingModule ? language : undefined}
        onClose={() => {
          setEditingModuleId(null);
          setIsCreatingModule(false);
          refetch();
        }}
      />
    );
  }

  // Show ModulePreview overlay
  if (previewModuleId) {
    return (
      <ModulePreview
        moduleId={previewModuleId}
        onClose={() => setPreviewModuleId(null)}
      />
    );
  }

  // Show LessonEditor overlay (add lesson)
  if (addLessonModuleId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setAddLessonModuleId(null)} className="gap-1">
          ← Back to Curriculum
        </Button>
        <LessonEditor
          isOpen={true}
          onClose={() => setAddLessonModuleId(null)}
          defaultLanguage={language}
        />
      </div>
    );
  }

  // Show Word Import overlay
  if (importWordModuleId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setImportWordModuleId(null)} className="gap-1">
          ← Back to Curriculum
        </Button>
        <WordImportTab />
      </div>
    );
  }

  const knowledgeCount = (modules || []).filter((m) => m.section_type === 'knowledge_based').length;
  const behaviouralCount = (modules || []).filter((m) => m.section_type === 'behavioural').length;
  const publishedCount = (modules || []).filter((m) => m.is_published).length;

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-navy-700">{(modules || []).length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Modules</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{publishedCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Published</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{knowledgeCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Knowledge-Based</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-purple-600">{behaviouralCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Behavioural</p>
        </div>
      </div>

      {/* Filters + Add button */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <select
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value as any)}
          className="h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
        >
          <option value="all">All Sections</option>
          <option value="knowledge_based">Knowledge-Based</option>
          <option value="behavioural">Behavioural</option>
        </select>
        <div className="flex-1" />
        <Button
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => setIsCreatingModule(true)}
        >
          <Plus className="h-4 w-4" />
          New Module
        </Button>
      </div>

      {/* Module tree */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading modules...
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <BookMarked className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No modules found</p>
        </div>
      ) : (
        <div>
          {filteredModules.map((module) => (
            <ModuleRow
              key={module.id}
              module={module}
              language={language}
              onEdit={setEditingModuleId}
              onPreview={setPreviewModuleId}
              onDelete={handleDelete}
              onTogglePublish={handleTogglePublish}
              onAddLesson={setAddLessonModuleId}
              onImportWord={setImportWordModuleId}
              quizMap={quizMap}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUIZZES TAB (embedded QuizManager)
// ─────────────────────────────────────────────────────────────────────────────
function QuizzesTab({ language }: { language: ExamLanguage }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: quizzes, isLoading } = useAllQuizzes();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (quizzes || []).filter(
      (quiz) =>
              quiz.title.toLowerCase().includes(q)
    );
  }, [quizzes, search]);

  const activeCount = (quizzes || []).filter((q) => q.is_active).length;
  const inactiveCount = (quizzes || []).length - activeCount;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-navy-700">{(quizzes || []).length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Quizzes</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Active</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-400">{inactiveCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Inactive</p>
        </div>
      </div>

      {/* Search + New */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search quizzes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex-1" />
        <Button size="sm" className="h-9 gap-1.5" onClick={() => navigate('/admin/quizzes/new')}>
          <Plus className="h-4 w-4" />
          New Quiz
        </Button>
      </div>

      {/* Quiz list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading quizzes...
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((quiz) => (
            <div
              key={quiz.id}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {quiz.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{quiz.certification_type}</span>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="text-xs text-gray-400">{quiz.difficulty_level}</span>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="text-xs text-gray-400">{quiz.time_limit_minutes}min</span>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  quiz.is_active
                    ? 'text-green-600 border-green-200 bg-green-50'
                    : 'text-gray-400 border-gray-200'
                )}
              >
                {quiz.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => navigate(`/admin/quizzes/${quiz.id}/edit`)}
                  title="Edit quiz"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => navigate(`/admin/quizzes/${quiz.id}/questions`)}
                  title="Manage questions"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <FileQuestion className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No quizzes found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FLASHCARDS TAB
// ─────────────────────────────────────────────────────────────────────────────
function FlashcardsTab({ language }: { language: ExamLanguage }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: decks, isLoading } = useDecksWithCompetency({ exam_language: language });
  const { data: stats } = useAdminFlashcardStats();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (decks || []).filter(
      (d) =>
        d.title.toLowerCase().includes(q)
    );
  }, [decks, search]);

  const publishedCount = (decks || []).filter((d) => d.is_published).length;
  const totalCards = stats?.totalCards || 0;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-navy-700">{(decks || []).length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Decks</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{publishedCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Published</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-sky-600">{totalCards}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Cards</p>
        </div>
      </div>

      {/* Search + New */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search decks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex-1" />
        <Button size="sm" className="h-9 gap-1.5" onClick={() => navigate('/admin/flashcards')}>
          <Plus className="h-4 w-4" />
          Manage Decks
        </Button>
      </div>

      {/* Deck list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading decks...
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((deck) => (
            <div
              key={deck.id}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {deck.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{deck.certification_type}</span>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="text-xs text-gray-400">{deck.card_count} cards</span>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="text-xs text-gray-400">{deck.estimated_study_time_minutes}min</span>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  deck.is_published
                    ? 'text-green-600 border-green-200 bg-green-50'
                    : 'text-amber-600 border-amber-200 bg-amber-50'
                )}
              >
                {deck.is_published ? 'Published' : 'Draft'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => navigate(`/admin/flashcards/decks/${deck.id}`)}
                title="Edit deck"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No flashcard decks found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function LearningSystemAdmin() {
  const language: ExamLanguage = 'en';
  const [activeTab, setActiveTab] = useState<AdminTab>('curriculum');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookMarked className="h-7 w-7" />
              Learning System
            </h1>
            <p className="mt-1 opacity-80 text-sm">
              Manage curriculum, quizzes, flashcards and access in one place
            </p>
          </div>

          {/* English Only Badge */}
          <div className="flex items-center gap-1 bg-white/10 rounded-lg px-3 py-1.5">
            <Globe className="h-3.5 w-3.5 text-white" />
            <span className="text-sm font-medium text-white">English</span>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdminTab)}>
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="curriculum" className="gap-1.5 text-xs sm:text-sm">
            <BookMarked className="h-4 w-4" />
            Curriculum
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="gap-1.5 text-xs sm:text-sm">
            <FileQuestion className="h-4 w-4" />
            Quizzes
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="gap-1.5 text-xs sm:text-sm">
            <Layers className="h-4 w-4" />
            Flashcards
          </TabsTrigger>
          <TabsTrigger value="access" className="gap-1.5 text-xs sm:text-sm">
            <UserCog className="h-4 w-4" />
            Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="curriculum" className="mt-4">
          <CurriculumTab language={language} />
        </TabsContent>

        <TabsContent value="quizzes" className="mt-4">
          <QuizzesTab language={language} />
        </TabsContent>

        <TabsContent value="flashcards" className="mt-4">
          <FlashcardsTab language={language} />
        </TabsContent>

        <TabsContent value="access" className="mt-4">
          <AccessManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
