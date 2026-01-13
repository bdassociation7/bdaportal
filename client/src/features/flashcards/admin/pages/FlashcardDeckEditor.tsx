/**
 * Flashcard Deck Editor - Admin Page
 * Manage individual flashcards within a deck
 *
 * IMPORTANT: Flashcards are language-specific based on the parent deck's exam_language.
 * English decks only have English flashcards.
 * Arabic decks only have Arabic flashcards.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useFlashcardDeck,
  useFlashcards,
  useCreateFlashcard,
  useUpdateFlashcard,
  useDeleteFlashcard,
  useBulkCreateFlashcards,
} from '@/entities/flashcards';
import type {
  Flashcard,
  FlashcardInsert,
  FlashcardUpdate,
} from '@/entities/flashcards';

type ExamLanguage = 'en' | 'ar';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  MoreHorizontal,
  Upload,
  Download,
  Search,
  Filter,
  Lightbulb,
  RotateCcw,
  Layers,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export function FlashcardDeckEditor() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [deleteConfirmCard, setDeleteConfirmCard] = useState<Flashcard | null>(
    null
  );
  const [previewCard, setPreviewCard] = useState<Flashcard | null>(null);
  const [previewFlipped, setPreviewFlipped] = useState(false);

  // Data fetching
  const { data: deck, isLoading: isLoadingDeck } = useFlashcardDeck(deckId);
  const { data: cards, isLoading: isLoadingCards } = useFlashcards(deckId, {
    difficulty_level:
      difficultyFilter !== 'all' ? (difficultyFilter as any) : undefined,
  });

  // Get exam language from deck
  const examLanguage: ExamLanguage = (deck as any)?.exam_language || 'en';
  const isArabic = examLanguage === 'ar';

  // Mutations
  const createFlashcard = useCreateFlashcard();
  const updateFlashcard = useUpdateFlashcard();
  const deleteFlashcard = useDeleteFlashcard();
  const bulkCreateFlashcards = useBulkCreateFlashcards();

  // Filter cards - search in the appropriate language
  const filteredCards = cards?.filter((card) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (isArabic) {
        return (
          card.front_text_ar?.toLowerCase().includes(search) ||
          card.back_text_ar?.toLowerCase().includes(search) ||
          card.front_text.toLowerCase().includes(search) ||
          card.back_text.toLowerCase().includes(search)
        );
      }
      return (
        card.front_text.toLowerCase().includes(search) ||
        card.back_text.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Handle create
  const handleCreate = async (data: FlashcardInsert) => {
    try {
      await createFlashcard.mutateAsync(data);
      toast.success(isArabic ? 'تم إنشاء البطاقة بنجاح' : 'Flashcard created successfully');
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error(isArabic ? 'فشل في إنشاء البطاقة' : 'Failed to create flashcard');
    }
  };

  // Handle update
  const handleUpdate = async (cardId: string, data: FlashcardUpdate) => {
    try {
      await updateFlashcard.mutateAsync({ cardId, updates: data });
      toast.success(isArabic ? 'تم تحديث البطاقة بنجاح' : 'Flashcard updated successfully');
      setEditingCard(null);
    } catch (error) {
      toast.error(isArabic ? 'فشل في تحديث البطاقة' : 'Failed to update flashcard');
    }
  };

  // Handle delete
  const handleDelete = async (cardId: string) => {
    try {
      await deleteFlashcard.mutateAsync({ cardId, deckId: deckId! });
      toast.success(isArabic ? 'تم حذف البطاقة بنجاح' : 'Flashcard deleted successfully');
      setDeleteConfirmCard(null);
    } catch (error) {
      toast.error(isArabic ? 'فشل في حذف البطاقة' : 'Failed to delete flashcard');
    }
  };

  // Handle toggle publish
  const handleTogglePublish = async (card: Flashcard) => {
    try {
      await updateFlashcard.mutateAsync({
        cardId: card.id,
        updates: { is_published: !card.is_published },
      });
      toast.success(
        card.is_published
          ? (isArabic ? 'تم إلغاء نشر البطاقة' : 'Flashcard unpublished')
          : (isArabic ? 'تم نشر البطاقة' : 'Flashcard published')
      );
    } catch (error) {
      toast.error(isArabic ? 'فشل في تحديث حالة النشر' : 'Failed to update publish status');
    }
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    // This would open a modal or file picker for CSV/JSON import
    toast.info(isArabic ? 'ميزة الاستيراد الجماعي قريبًا' : 'Bulk import feature coming soon');
  };

  if (isLoadingDeck || isLoadingCards) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Language-specific labels
  const labels = {
    backToFlashcards: isArabic ? 'العودة إلى إدارة البطاقات' : 'Back to Flashcard Manager',
    flashcards: isArabic ? 'بطاقة' : 'flashcards',
    studyTime: isArabic ? 'دقيقة وقت الدراسة' : 'min study time',
    noTimeEstimate: isArabic ? 'بدون تقدير زمني' : 'No time estimate',
    importCards: isArabic ? 'استيراد البطاقات' : 'Import Cards',
    exportCards: isArabic ? 'تصدير' : 'Export',
    addFlashcard: isArabic ? 'إضافة بطاقة' : 'Add Flashcard',
    totalCards: isArabic ? 'إجمالي البطاقات' : 'Total Cards',
    published: isArabic ? 'منشور' : 'Published',
    draft: isArabic ? 'مسودة' : 'Draft',
    withHints: isArabic ? 'مع تلميحات' : 'With Hints',
    searchFlashcards: isArabic ? 'البحث في البطاقات...' : 'Search flashcards...',
    allDifficulties: isArabic ? 'جميع المستويات' : 'All Difficulties',
    easy: isArabic ? 'سهل' : 'Easy',
    medium: isArabic ? 'متوسط' : 'Medium',
    hard: isArabic ? 'صعب' : 'Hard',
    noFlashcardsFound: isArabic ? 'لم يتم العثور على بطاقات' : 'No flashcards found',
    addFirstFlashcard: isArabic ? 'إضافة أول بطاقة' : 'Add First Flashcard',
    createFlashcard: isArabic ? 'إنشاء بطاقة' : 'Create Flashcard',
    editFlashcard: isArabic ? 'تعديل البطاقة' : 'Edit Flashcard',
    deleteFlashcard: isArabic ? 'حذف البطاقة' : 'Delete Flashcard',
    deleteConfirmation: isArabic
      ? 'هل أنت متأكد من حذف هذه البطاقة؟ لا يمكن التراجع عن هذا الإجراء.'
      : 'Are you sure you want to delete this flashcard? This action cannot be undone.',
    cancel: isArabic ? 'إلغاء' : 'Cancel',
    delete: isArabic ? 'حذف' : 'Delete',
    preview: isArabic ? 'معاينة' : 'Preview',
    edit: isArabic ? 'تعديل' : 'Edit',
    flipCard: isArabic ? 'اقلب البطاقة' : 'Flip Card',
    clickToFlip: isArabic ? 'انقر للقلب' : 'Click to flip',
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/flashcards')}
            className="mb-2"
          >
            <ArrowLeft className={`w-4 h-4 ${isArabic ? 'ml-2 rotate-180' : 'mr-2'}`} />
            {labels.backToFlashcards}
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              {isArabic ? (deck?.title_ar || deck?.title) : deck?.title}
            </h1>
            <span className={`text-sm px-2 py-1 rounded ${isArabic ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              {isArabic ? '🇸🇦 Arabic' : '🇬🇧 English'}
            </span>
          </div>
          <p className="text-gray-600 mt-1">
            {cards?.length || 0} {labels.flashcards} •{' '}
            {deck?.estimated_study_time_minutes
              ? `~${deck.estimated_study_time_minutes} ${labels.studyTime}`
              : labels.noTimeEstimate}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleBulkImport}>
            <Upload className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
            {labels.importCards}
          </Button>
          <Button variant="outline">
            <Download className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
            {labels.exportCards}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
            {labels.addFlashcard}
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <Layers className="w-4 h-4" />
            <span className="text-sm font-medium">{labels.totalCards}</span>
          </div>
          <p className="text-2xl font-bold">{cards?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">{labels.published}</span>
          </div>
          <p className="text-2xl font-bold">
            {cards?.filter((c) => c.is_published).length || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <EyeOff className="w-4 h-4" />
            <span className="text-sm font-medium">{labels.draft}</span>
          </div>
          <p className="text-2xl font-bold">
            {cards?.filter((c) => !c.is_published).length || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex items-center gap-2 text-yellow-600 mb-1">
            <Star className="w-4 h-4" />
            <span className="text-sm font-medium">{labels.withHints}</span>
          </div>
          <p className="text-2xl font-bold">
            {cards?.filter((c) => c.hint || c.hint_ar).length || 0}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className={`absolute ${isArabic ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
              <Input
                placeholder={labels.searchFlashcards}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={isArabic ? 'pr-10' : 'pl-10'}
                dir={isArabic ? 'rtl' : 'ltr'}
              />
            </div>
          </div>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
              <SelectValue placeholder={isArabic ? 'المستوى' : 'Difficulty'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.allDifficulties}</SelectItem>
              <SelectItem value="easy">{labels.easy}</SelectItem>
              <SelectItem value="medium">{labels.medium}</SelectItem>
              <SelectItem value="hard">{labels.hard}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Flashcards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCards?.map((card, index) => (
          <FlashcardCard
            key={card.id}
            card={card}
            index={index + 1}
            examLanguage={examLanguage}
            onEdit={() => setEditingCard(card)}
            onDelete={() => setDeleteConfirmCard(card)}
            onTogglePublish={() => handleTogglePublish(card)}
            onPreview={() => {
              setPreviewCard(card);
              setPreviewFlipped(false);
            }}
          />
        ))}
      </div>

      {filteredCards?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{labels.noFlashcardsFound}</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
            {labels.addFirstFlashcard}
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <FlashcardDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={(data) => handleCreate({ ...data, deck_id: deckId! })}
        title={labels.createFlashcard}
        nextOrderIndex={(cards?.length || 0) + 1}
        examLanguage={examLanguage}
      />

      {/* Edit Dialog */}
      <FlashcardDialog
        open={!!editingCard}
        onOpenChange={(open) => !open && setEditingCard(null)}
        onSubmit={(data) => editingCard && handleUpdate(editingCard.id, data)}
        title={labels.editFlashcard}
        defaultValues={editingCard || undefined}
        examLanguage={examLanguage}
      />

      {/* Preview Dialog */}
      <Dialog
        open={!!previewCard}
        onOpenChange={(open) => !open && setPreviewCard(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{labels.preview}</DialogTitle>
          </DialogHeader>
          <div
            className="relative w-full h-64 cursor-pointer perspective-1000"
            onClick={() => setPreviewFlipped(!previewFlipped)}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            <div
              className={`absolute inset-0 transition-transform duration-500 preserve-3d ${
                previewFlipped ? 'rotate-y-180' : ''
              }`}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 backface-hidden bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 flex flex-col items-center justify-center text-white"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <p className="text-lg font-medium text-center">
                  {isArabic ? (previewCard?.front_text_ar || previewCard?.front_text) : previewCard?.front_text}
                </p>
                <p className="text-xs mt-4 opacity-75">{labels.clickToFlip}</p>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 backface-hidden bg-white rounded-xl p-6 flex flex-col items-center justify-center border-2 border-purple-200 rotate-y-180"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <p className="text-gray-900 text-center">
                  {isArabic ? (previewCard?.back_text_ar || previewCard?.back_text) : previewCard?.back_text}
                </p>
                {(isArabic ? (previewCard?.hint_ar || previewCard?.hint) : previewCard?.hint) && (
                  <div className="mt-4 p-2 bg-yellow-50 rounded text-sm text-yellow-700 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    {isArabic ? (previewCard?.hint_ar || previewCard?.hint) : previewCard?.hint}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewFlipped(!previewFlipped)}
            >
              <RotateCcw className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
              {labels.flipCard}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirmCard}
        onOpenChange={(open) => !open && setDeleteConfirmCard(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.deleteFlashcard}</DialogTitle>
            <DialogDescription>
              {labels.deleteConfirmation}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-gray-50 rounded-lg" dir={isArabic ? 'rtl' : 'ltr'}>
            <p className="font-medium text-gray-900">
              {isArabic
                ? (deleteConfirmCard?.front_text_ar || deleteConfirmCard?.front_text)
                : deleteConfirmCard?.front_text}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmCard(null)}
            >
              {labels.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmCard && handleDelete(deleteConfirmCard.id)
              }
            >
              {labels.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Flashcard Card Component
interface FlashcardCardProps {
  card: Flashcard;
  index: number;
  examLanguage: ExamLanguage;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onPreview: () => void;
}

function FlashcardCard({
  card,
  index,
  examLanguage,
  onEdit,
  onDelete,
  onTogglePublish,
  onPreview,
}: FlashcardCardProps) {
  const isArabic = examLanguage === 'ar';

  // Get the appropriate text based on language
  const frontText = isArabic ? (card.front_text_ar || card.front_text) : card.front_text;
  const backText = isArabic ? (card.back_text_ar || card.back_text) : card.back_text;
  const hint = isArabic ? (card.hint_ar || card.hint) : card.hint;

  const labels = {
    front: isArabic ? 'الأمام' : 'Front',
    back: isArabic ? 'الخلف' : 'Back',
    hasHint: isArabic ? 'يحتوي تلميح' : 'Has hint',
    preview: isArabic ? 'معاينة' : 'Preview',
    edit: isArabic ? 'تعديل' : 'Edit',
    delete: isArabic ? 'حذف' : 'Delete',
    easy: isArabic ? 'سهل' : 'easy',
    medium: isArabic ? 'متوسط' : 'medium',
    hard: isArabic ? 'صعب' : 'hard',
  };

  const difficultyLabel = card.difficulty_level === 'easy'
    ? labels.easy
    : card.difficulty_level === 'hard'
    ? labels.hard
    : labels.medium;

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header with gradient */}
      <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-600" />

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-gray-400">
            <GripVertical className="w-4 h-4" />
            <span className="font-mono text-sm">#{index}</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                card.difficulty_level === 'easy'
                  ? 'bg-green-100 text-green-700'
                  : card.difficulty_level === 'hard'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {difficultyLabel}
            </span>
            <button
              onClick={onTogglePublish}
              className={`p-1 rounded transition-colors ${
                card.is_published
                  ? 'text-green-600 hover:bg-green-50'
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              {card.is_published ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Front */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            {labels.front}
          </p>
          <p className="text-gray-900 font-medium line-clamp-2">
            {frontText}
          </p>
        </div>

        {/* Back */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            {labels.back}
          </p>
          <p className="text-gray-700 text-sm line-clamp-2">
            {backText}
          </p>
        </div>

        {/* Hint indicator */}
        {hint && (
          <div className="flex items-center gap-1 text-yellow-600 text-xs mb-3">
            <Lightbulb className="w-3 h-3" />
            <span>{labels.hasHint}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Button variant="ghost" size="sm" onClick={onPreview}>
            <RotateCcw className={`w-4 h-4 ${isArabic ? 'ml-1' : 'mr-1'}`} />
            {labels.preview}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                {labels.edit}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                {labels.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// Flashcard Dialog Component
interface FlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FlashcardInsert | FlashcardUpdate) => void;
  title: string;
  defaultValues?: Partial<Flashcard>;
  nextOrderIndex?: number;
  examLanguage: ExamLanguage;
}

function FlashcardDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  defaultValues,
  nextOrderIndex = 1,
  examLanguage,
}: FlashcardDialogProps) {
  const isArabic = examLanguage === 'ar';

  // For Arabic cards, we use _ar fields as primary; for English, standard fields
  const getDefaultFrontText = () => {
    if (isArabic) {
      return defaultValues?.front_text_ar || defaultValues?.front_text || '';
    }
    return defaultValues?.front_text || '';
  };

  const getDefaultBackText = () => {
    if (isArabic) {
      return defaultValues?.back_text_ar || defaultValues?.back_text || '';
    }
    return defaultValues?.back_text || '';
  };

  const getDefaultHint = () => {
    if (isArabic) {
      return defaultValues?.hint_ar || defaultValues?.hint || '';
    }
    return defaultValues?.hint || '';
  };

  const [formData, setFormData] = useState<{
    front_text: string;
    back_text: string;
    hint: string;
    front_image_url: string;
    back_image_url: string;
    difficulty_level: string;
    order_index: number;
    tags: string[];
    is_published: boolean;
  }>({
    front_text: getDefaultFrontText(),
    back_text: getDefaultBackText(),
    hint: getDefaultHint(),
    front_image_url: defaultValues?.front_image_url || '',
    back_image_url: defaultValues?.back_image_url || '',
    difficulty_level: defaultValues?.difficulty_level || 'medium',
    order_index: defaultValues?.order_index || nextOrderIndex,
    tags: defaultValues?.tags || [],
    is_published: defaultValues?.is_published ?? true,
  });

  // Reset form when dialog opens with new values
  useEffect(() => {
    if (open) {
      setFormData({
        front_text: getDefaultFrontText(),
        back_text: getDefaultBackText(),
        hint: getDefaultHint(),
        front_image_url: defaultValues?.front_image_url || '',
        back_image_url: defaultValues?.back_image_url || '',
        difficulty_level: defaultValues?.difficulty_level || 'medium',
        order_index: defaultValues?.order_index || nextOrderIndex,
        tags: defaultValues?.tags || [],
        is_published: defaultValues?.is_published ?? true,
      });
    }
  }, [open, defaultValues, nextOrderIndex, isArabic]);

  const handleSubmit = () => {
    if (!formData.front_text) {
      toast.error(isArabic ? 'محتوى الأمام مطلوب' : 'Front content is required');
      return;
    }
    if (!formData.back_text) {
      toast.error(isArabic ? 'محتوى الخلف مطلوب' : 'Back content is required');
      return;
    }

    // Build the data based on language
    // For Arabic: store in _ar fields
    // For English: store in standard fields
    const submitData: FlashcardInsert = {
      front_text: isArabic ? formData.front_text : formData.front_text,
      front_text_ar: isArabic ? formData.front_text : null,
      back_text: isArabic ? formData.back_text : formData.back_text,
      back_text_ar: isArabic ? formData.back_text : null,
      hint: isArabic ? null : (formData.hint || null),
      hint_ar: isArabic ? (formData.hint || null) : null,
      front_image_url: formData.front_image_url || null,
      back_image_url: formData.back_image_url || null,
      difficulty_level: formData.difficulty_level as any,
      order_index: formData.order_index,
      tags: formData.tags,
      is_published: formData.is_published,
    };

    onSubmit(submitData);
  };

  // Language-specific labels
  const labels = {
    frontOfCard: isArabic ? 'أمام البطاقة' : 'Front of Card',
    backOfCard: isArabic ? 'خلف البطاقة' : 'Back of Card',
    frontContent: isArabic ? 'المحتوى (الأمام) *' : 'Content (Front) *',
    frontPlaceholder: isArabic ? 'أدخل السؤال أو المصطلح' : 'Enter the question or term',
    backContent: isArabic ? 'المحتوى (الخلف) *' : 'Content (Back) *',
    backPlaceholder: isArabic ? 'أدخل الإجابة أو التعريف' : 'Enter the answer or definition',
    imageUrl: isArabic ? 'رابط الصورة (اختياري)' : 'Image URL (optional)',
    hint: isArabic ? 'تلميح (اختياري)' : 'Hint (optional)',
    hintPlaceholder: isArabic ? 'تلميح مفيد...' : 'A helpful clue...',
    difficulty: isArabic ? 'المستوى' : 'Difficulty',
    easy: isArabic ? 'سهل' : 'Easy',
    medium: isArabic ? 'متوسط' : 'Medium',
    hard: isArabic ? 'صعب' : 'Hard',
    order: isArabic ? 'الترتيب' : 'Order',
    published: isArabic ? 'منشور' : 'Published',
    cancel: isArabic ? 'إلغاء' : 'Cancel',
    update: isArabic ? 'تحديث' : 'Update',
    create: isArabic ? 'إنشاء' : 'Create',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            <span className={`text-sm px-2 py-1 rounded ${isArabic ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              {isArabic ? '🇸🇦 Arabic' : '🇬🇧 English'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
          {/* Front Content - Single language */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-600 text-white rounded flex items-center justify-center text-sm">
                {isArabic ? 'أ' : 'F'}
              </span>
              {labels.frontOfCard}
            </h4>
            <div className="space-y-3">
              <div>
                <Label>{labels.frontContent}</Label>
                <Textarea
                  value={formData.front_text}
                  onChange={(e) =>
                    setFormData({ ...formData, front_text: e.target.value })
                  }
                  placeholder={labels.frontPlaceholder}
                  rows={2}
                  dir={isArabic ? 'rtl' : 'ltr'}
                />
              </div>
              <div>
                <Label>{labels.imageUrl}</Label>
                <Input
                  value={formData.front_image_url || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, front_image_url: e.target.value })
                  }
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Back Content - Single language */}
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <h4 className="font-medium text-indigo-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-600 text-white rounded flex items-center justify-center text-sm">
                {isArabic ? 'خ' : 'B'}
              </span>
              {labels.backOfCard}
            </h4>
            <div className="space-y-3">
              <div>
                <Label>{labels.backContent}</Label>
                <Textarea
                  value={formData.back_text}
                  onChange={(e) =>
                    setFormData({ ...formData, back_text: e.target.value })
                  }
                  placeholder={labels.backPlaceholder}
                  rows={3}
                  dir={isArabic ? 'rtl' : 'ltr'}
                />
              </div>
              <div>
                <Label>{labels.imageUrl}</Label>
                <Input
                  value={formData.back_image_url || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, back_image_url: e.target.value })
                  }
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Hint - Single language */}
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-900 mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              {labels.hint}
            </h4>
            <Input
              value={formData.hint || ''}
              onChange={(e) =>
                setFormData({ ...formData, hint: e.target.value })
              }
              placeholder={labels.hintPlaceholder}
              dir={isArabic ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>{labels.difficulty}</Label>
              <Select
                value={formData.difficulty_level}
                onValueChange={(value) =>
                  setFormData({ ...formData, difficulty_level: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{labels.easy}</SelectItem>
                  <SelectItem value="medium">{labels.medium}</SelectItem>
                  <SelectItem value="hard">{labels.hard}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{labels.order}</Label>
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
            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_published: checked })
                  }
                />
                <Label>{labels.published}</Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {labels.cancel}
          </Button>
          <Button onClick={handleSubmit}>
            {defaultValues ? labels.update : labels.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
