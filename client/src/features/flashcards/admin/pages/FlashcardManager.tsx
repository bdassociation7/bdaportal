/**
 * Flashcard Manager - Admin Page
 * CRUD operations for flashcard decks and cards
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  useDecksWithCompetency,
  useCreateDeck,
  useUpdateDeck,
  useDeleteDeck,
  useAdminFlashcardStats,
} from '@/entities/flashcards';
import {
  CurriculumService,
  curriculumKeys,
  useLessonsByModule,
} from '@/entities/curriculum';
import type {
  FlashcardDeckWithCompetency,
  FlashcardDeckInsert,
  FlashcardDeckUpdate,
} from '@/entities/flashcards';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Layers,
  Filter,
  MoreHorizontal,
  Download,
  Upload,
  Clock,
  CheckCircle,
  Globe,
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

type ExamLanguage = 'en';

export function FlashcardManager() {
  const navigate = useNavigate();
  // Admin interface should always be in English - only content is language-specific
  const language = 'en' as const;

  const t = {
    en: {
      title: 'Flashcard Manager',
      description: 'Manage flashcard decks and cards',
      import: 'Import',
      export: 'Export',
      createDeck: 'Create Deck',
      totalCards: 'Total Cards',
      totalDecks: 'Total Decks',
      published: 'Published',
      unpublished: 'Unpublished',
      filters: 'Filters',
      filterDescription: 'Search and filter flashcard decks',
      searchPlaceholder: 'Search flashcard decks...',
      section: 'Section',
      allSections: 'All Sections',
      introduction: 'Introduction',
      knowledge: 'Knowledge',
      behavioral: 'Behavioural',
      status: 'Status',
      allStatus: 'All Status',
      cards: 'cards',
      draft: 'Draft',
      min: 'min',
      manageCards: 'Manage Cards',
      editDeck: 'Edit Deck',
      delete: 'Delete',
      noDecksFound: 'No flashcard decks found',
      createDeckTitle: 'Create Flashcard Deck',
      editDeckTitle: 'Edit Flashcard Deck',
      deleteDeckTitle: 'Delete Flashcard Deck',
      deleteConfirmation: 'Are you sure you want to delete "{title}"? This will also delete all flashcards in this deck. This action cannot be undone.',
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
      coverImageUrl: 'Cover Image URL',
      studyTimeMinutes: 'Study Time (minutes)',
      optional: 'Optional',
      update: 'Update',
      create: 'Create',
      enterTitle: 'Enter title',
      enterTitleAr: 'ادخل العنوان',
      enterDescription: 'Enter description',
      titleRequired: 'Title is required',
      createSuccess: 'Flashcard deck created successfully',
      createError: 'Failed to create flashcard deck',
      updateSuccess: 'Flashcard deck updated successfully',
      updateError: 'Failed to update flashcard deck',
      deleteSuccess: 'Flashcard deck deleted successfully',
      deleteError: 'Failed to delete flashcard deck',
      publishSuccess: 'Deck published',
      unpublishSuccess: 'Deck unpublished',
      publishError: 'Failed to update publish status',
      bockLinkage: 'BDA BoCK™ Structure Linkage',
      englishVersion: 'English Version',
      arabicVersion: 'Arabic Version',
      descriptionArabic: 'Description (Arabic)',
      enterDescriptionAr: 'أدخل وصف المجموعة...',
      selectLanguage: 'Select Language',
      englishDecks: 'English Decks',
      arabicDecks: 'Arabic Decks',
      createEnglishDeck: 'English Deck',
      createArabicDeck: 'Arabic Deck',
    },
    ar: {
      title: 'إدارة البطاقات التعليمية',
      description: 'إدارة مجموعات البطاقات والبطاقات',
      import: 'استيراد',
      export: 'تصدير',
      createDeck: 'إنشاء مجموعة',
      totalCards: 'إجمالي البطاقات',
      totalDecks: 'إجمالي المجموعات',
      published: 'منشور',
      unpublished: 'غير منشور',
      filters: 'الفلاتر',
      filterDescription: 'البحث والتصفية في مجموعات البطاقات',
      searchPlaceholder: 'البحث في مجموعات البطاقات...',
      section: 'القسم',
      allSections: 'جميع الأقسام',
      introduction: 'مقدمة',
      knowledge: 'معرفة',
      behavioral: 'سلوكي',
      status: 'الحالة',
      allStatus: 'جميع الحالات',
      cards: 'بطاقات',
      draft: 'مسودة',
      min: 'دقيقة',
      manageCards: 'إدارة البطاقات',
      editDeck: 'تعديل المجموعة',
      delete: 'حذف',
      noDecksFound: 'لم يتم العثور على مجموعات بطاقات',
      createDeckTitle: 'إنشاء مجموعة بطاقات',
      editDeckTitle: 'تعديل مجموعة البطاقات',
      deleteDeckTitle: 'حذف مجموعة البطاقات',
      deleteConfirmation: 'هل أنت متأكد من حذف "{title}"؟ سيؤدي هذا أيضًا إلى حذف جميع البطاقات في هذه المجموعة. لا يمكن التراجع عن هذا الإجراء.',
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
      coverImageUrl: 'رابط صورة الغلاف',
      studyTimeMinutes: 'وقت الدراسة (بالدقائق)',
      optional: 'اختياري',
      update: 'تحديث',
      create: 'إنشاء',
      enterTitle: 'أدخل العنوان',
      enterTitleAr: 'ادخل العنوان',
      enterDescription: 'أدخل الوصف',
      titleRequired: 'العنوان مطلوب',
      createSuccess: 'تم إنشاء مجموعة البطاقات بنجاح',
      createError: 'فشل في إنشاء مجموعة البطاقات',
      updateSuccess: 'تم تحديث مجموعة البطاقات بنجاح',
      updateError: 'فشل في تحديث مجموعة البطاقات',
      deleteSuccess: 'تم حذف مجموعة البطاقات بنجاح',
      deleteError: 'فشل في حذف مجموعة البطاقات',
      publishSuccess: 'تم نشر المجموعة',
      unpublishSuccess: 'تم إلغاء نشر المجموعة',
      publishError: 'فشل في تحديث حالة النشر',
      bockLinkage: 'ربط هيكل BDA BoCK™',
      englishVersion: 'النسخة الإنجليزية',
      arabicVersion: 'النسخة العربية',
      descriptionArabic: 'الوصف (بالعربية)',
      enterDescriptionAr: 'أدخل وصف المجموعة...',
      selectLanguage: 'اختر اللغة',
      englishDecks: 'المجموعات الإنجليزية',
      arabicDecks: 'المجموعات العربية',
      createEnglishDeck: 'مجموعة إنجليزية',
      createArabicDeck: 'مجموعة عربية',
    }
  };

  const texts = t[language];

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [publishedFilter, setPublishedFilter] = useState<string>('all');
  const filterLanguage: ExamLanguage = 'en';
  const createLanguage: ExamLanguage = 'en';
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDeck, setEditingDeck] =
    useState<FlashcardDeckWithCompetency | null>(null);
  const [deleteConfirmDeck, setDeleteConfirmDeck] =
    useState<FlashcardDeckWithCompetency | null>(null);

  // Data fetching
  const { data: decks, isLoading } = useDecksWithCompetency({
    certification_type: 'CP',
    section_type:
      sectionFilter !== 'all' ? (sectionFilter as any) : undefined,
    is_published:
      publishedFilter === 'all' ? undefined : publishedFilter === 'published',
    exam_language: 'en',
  });
  const { data: stats } = useAdminFlashcardStats('CP');

  // Mutations
  const createDeck = useCreateDeck();
  const updateDeck = useUpdateDeck();
  const deleteDeck = useDeleteDeck();

  // Filter decks
  const filteredDecks = decks?.filter((deck) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        deck.title.toLowerCase().includes(search) ||
        deck.competency?.competency_name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Handle create
  const handleCreate = async (data: FlashcardDeckInsert) => {
    try {
      await createDeck.mutateAsync(data);
      toast.success(texts.createSuccess);
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error(texts.createError);
    }
  };

  // Handle update
  const handleUpdate = async (deckId: string, data: FlashcardDeckUpdate) => {
    try {
      await updateDeck.mutateAsync({ deckId, updates: data });
      toast.success(texts.updateSuccess);
      setEditingDeck(null);
    } catch (error) {
      toast.error(texts.updateError);
    }
  };

  // Handle delete
  const handleDelete = async (deckId: string) => {
    try {
      await deleteDeck.mutateAsync(deckId);
      toast.success(texts.deleteSuccess);
      setDeleteConfirmDeck(null);
    } catch (error) {
      toast.error(texts.deleteError);
    }
  };

  // Handle toggle publish
  const handleTogglePublish = async (deck: FlashcardDeckWithCompetency) => {
    try {
      await updateDeck.mutateAsync({
        deckId: deck.id,
        updates: { is_published: !deck.is_published },
      });
      toast.success(
        deck.is_published ? texts.unpublishSuccess : texts.publishSuccess
      );
    } catch (error) {
      toast.error(texts.publishError);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <AdminPageHeader
        title={texts.title}
        description={texts.description}
        icon={Layers}
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
                {texts.createEnglishDeck}
              </Button>
          </div>
        }
      />



      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label={texts.totalCards}
            value={stats.totalCards}
            icon={Layers}
            color="purple"
          />
          <StatCard
            label={texts.totalDecks}
            value={stats.totalDecks}
            icon={Layers}
            color="blue"
          />
          <StatCard
            label={texts.published}
            value={stats.publishedDecks}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            label={texts.unpublished}
            value={stats.unpublishedDecks}
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
            <SelectItem value="introduction">{texts.introduction}</SelectItem>
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

      {/* Decks Grid — Behavioral first, then Knowledge */}
      {(() => {
        const behavioralDecks = filteredDecks?.filter(d => d.section_type === 'behavioral') ?? [];
        const knowledgeDecks  = filteredDecks?.filter(d => d.section_type === 'knowledge')  ?? [];
        const otherDecks      = filteredDecks?.filter(d => d.section_type !== 'behavioral' && d.section_type !== 'knowledge') ?? [];

        const renderGrid = (deckList: typeof behavioralDecks) => (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deckList.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onEdit={() => setEditingDeck(deck)}
                onDelete={() => setDeleteConfirmDeck(deck)}
                onTogglePublish={() => handleTogglePublish(deck)}
                onManageCards={() => navigate(`/admin/flashcards/decks/${deck.id}`)}
                texts={texts}
              />
            ))}
          </div>
        );

        if (filteredDecks?.length === 0) {
          return (
            <div className="text-center py-12 bg-white rounded-lg border">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">{texts.noDecksFound}</p>
            </div>
          );
        }

        return (
          <div className="space-y-10">
            {/* ── Behavioral Competencies ─────────────────────────────── */}
            {behavioralDecks.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-8 w-1 rounded-full bg-purple-500" />
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Behavioral Competencies</h2>
                    <p className="text-sm text-gray-500">Competencies 1–7 · Soft skills & professional behaviours</p>
                  </div>
                  <span className="ml-auto text-sm font-medium text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                    {behavioralDecks.length} decks
                  </span>
                </div>
                {renderGrid(behavioralDecks)}
              </section>
            )}

            {/* ── Knowledge-Based Competencies ────────────────────────── */}
            {knowledgeDecks.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-8 w-1 rounded-full bg-blue-500" />
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Knowledge-Based Competencies</h2>
                    <p className="text-sm text-gray-500">Competencies 8–14 · Technical & domain knowledge</p>
                  </div>
                  <span className="ml-auto text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                    {knowledgeDecks.length} decks
                  </span>
                </div>
                {renderGrid(knowledgeDecks)}
              </section>
            )}

            {/* ── Other (Introduction / Standalone) ───────────────────── */}
            {otherDecks.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-8 w-1 rounded-full bg-gray-400" />
                  <h2 className="text-lg font-bold text-gray-900">Other Decks</h2>
                </div>
                {renderGrid(otherDecks)}
              </section>
            )}
          </div>
        );
      })()}

      {/* Create Dialog */}
      <DeckDialog
        key={`create-${createLanguage}`}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        title={texts.createDeckTitle}
        texts={texts}
        defaultLanguage={createLanguage}
      />

      {/* Edit Dialog */}
      <DeckDialog
        open={!!editingDeck}
        onOpenChange={(open) => !open && setEditingDeck(null)}
        onSubmit={(data) => editingDeck && handleUpdate(editingDeck.id, data)}
        title={texts.editDeckTitle}
        defaultValues={editingDeck || undefined}
        texts={texts}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirmDeck}
        onOpenChange={(open) => !open && setDeleteConfirmDeck(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{texts.deleteDeckTitle}</DialogTitle>
            <DialogDescription>
              {texts.deleteConfirmation.replace('{title}', deleteConfirmDeck?.title || '')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmDeck(null)}
            >
              {texts.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmDeck && handleDelete(deleteConfirmDeck.id)
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

// Deck Card Component
interface DeckCardProps {
  deck: FlashcardDeckWithCompetency;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onManageCards: () => void;
  texts: Record<string, string>;
}

function DeckCard({
  deck,
  onEdit,
  onDelete,
  onTogglePublish,
  onManageCards,
  texts,
}: DeckCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header */}
      <div
        className="h-24 bg-gradient-to-br from-purple-500 to-indigo-600 relative"
        style={
          deck.cover_image_url
            ? {
                backgroundImage: `url(${deck.cover_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <div className="text-white">
            <p className="text-2xl font-bold">{deck.card_count}</p>
            <p className="text-xs opacity-90">{texts.cards}</p>
          </div>
          <button
            onClick={onTogglePublish}
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              deck.is_published
                ? 'bg-green-500 text-white'
                : 'bg-gray-500 text-white'
            }`}
          >
            {deck.is_published ? texts.published : texts.draft}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{deck.title}</h3>
        {deck.competency && (
          <p className="text-sm text-gray-600 mt-2">
            {deck.competency.competency_name || ''}
          </p>
        )}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              deck.section_type === 'introduction'
                ? 'bg-gray-100 text-gray-700'
                : deck.section_type === 'knowledge'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            {deck.section_type === 'introduction' ? texts.introduction :
             deck.section_type === 'knowledge' ? texts.knowledge : texts.behavioural}
          </span>
          {deck.estimated_study_time_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {deck.estimated_study_time_minutes} {texts.min}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onManageCards}>
          <Layers className="w-4 h-4 mr-2" />
          {texts.manageCards}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              {texts.editDeck}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              {texts.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Deck Dialog Component
interface DeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FlashcardDeckInsert | FlashcardDeckUpdate) => void;
  title: string;
  defaultValues?: Partial<FlashcardDeckWithCompetency>;
  texts: Record<string, string>;
  defaultLanguage?: ExamLanguage;
}

function DeckDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  defaultValues,
  texts,
  defaultLanguage = 'en',
}: DeckDialogProps) {
  const examLanguage: ExamLanguage = 'en';
  const [formData, setFormData] = useState<Partial<FlashcardDeckInsert>>({
    certification_type: defaultValues?.certification_type || 'CP',
    section_type: defaultValues?.section_type || 'knowledge',
    // Default published to true for new decks
    competency_id: defaultValues?.competency_id || null,
    sub_unit_id: defaultValues?.sub_unit_id || null,
    title: defaultValues?.title || '',
    title_ar: defaultValues?.title_ar || '',
    description: defaultValues?.description || '',
    description_ar: defaultValues?.description_ar || '',
    cover_image_url: defaultValues?.cover_image_url || '',
    estimated_study_time_minutes:
      defaultValues?.estimated_study_time_minutes || undefined,
    order_index: defaultValues?.order_index || 1,
    is_published: defaultValues?.is_published ?? true,
    exam_language: (defaultValues as any)?.exam_language || defaultLanguage,
  });

  // Fetch English modules only (competencies 1-14, exclude intro/wrap-up)
  const { data: modulesRaw } = useQuery({
    queryKey: curriculumKeys.modulesList({ exam_language: 'en' }),
    queryFn: async () => {
      const result = await CurriculumService.getModules({ exam_language: 'en' });
      return result.data || [];
    },
  });
  // Filter to show only competencies 1-14 (exclude Module 0 and Module 15)
  const modules = modulesRaw?.filter(m => m.order_index >= 1 && m.order_index <= 14);

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
    onSubmit(formData as FlashcardDeckInsert);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Section Type + Order Index */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{texts.section}</Label>
              <Select
                value={formData.section_type || 'knowledge'}
                onValueChange={(value) =>
                  setFormData({ ...formData, section_type: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="behavioral">{texts.behavioral}</SelectItem>
                  <SelectItem value="knowledge">{texts.knowledge}</SelectItem>
                  <SelectItem value="introduction">{texts.introduction}</SelectItem>
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

          {/* BDA BoCK Structure Linkage - Highlighted */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              {texts.bockLinkage}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-blue-700">{texts.competencyModule}</Label>
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
                  <SelectTrigger className="bg-white">
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
                <Label className="text-blue-700">{texts.subCompetency}</Label>
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
                  <SelectTrigger className="bg-white">
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

          {/* Additional Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{texts.coverImageUrl}</Label>
              <Input
                value={formData.cover_image_url || ''}
                onChange={(e) =>
                  setFormData({ ...formData, cover_image_url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>{texts.studyTimeMinutes}</Label>
              <Input
                type="number"
                value={formData.estimated_study_time_minutes || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimated_study_time_minutes: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                placeholder={texts.optional}
              />
            </div>
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
