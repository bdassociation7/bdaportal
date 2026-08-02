/**
 * Flashcard Deck Editor - Admin Page — English Only
 * Manage individual flashcards within a deck
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
import mammoth from 'mammoth/mammoth.browser';

export function FlashcardDeckEditor() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [deleteConfirmCard, setDeleteConfirmCard] = useState<Flashcard | null>(null);
  const [previewCard, setPreviewCard] = useState<Flashcard | null>(null);
  const [previewFlipped, setPreviewFlipped] = useState(false);

  const { data: deck, isLoading: isLoadingDeck } = useFlashcardDeck(deckId);
  const { data: cards, isLoading: isLoadingCards } = useFlashcards(deckId, {
    difficulty_level: difficultyFilter !== 'all' ? (difficultyFilter as any) : undefined,
  });

  const createFlashcard = useCreateFlashcard();
  const updateFlashcard = useUpdateFlashcard();
  const deleteFlashcard = useDeleteFlashcard();
  const bulkCreateFlashcards = useBulkCreateFlashcards();

  const filteredCards = cards?.filter((card) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        card.front_text.toLowerCase().includes(search) ||
        card.back_text.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const handleCreate = async (data: FlashcardInsert) => {
    try {
      await createFlashcard.mutateAsync(data);
      toast.success('Flashcard created successfully');
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error('Failed to create flashcard');
    }
  };

  const handleUpdate = async (cardId: string, data: FlashcardUpdate) => {
    try {
      await updateFlashcard.mutateAsync({ cardId, updates: data });
      toast.success('Flashcard updated successfully');
      setEditingCard(null);
    } catch (error) {
      toast.error('Failed to update flashcard');
    }
  };

  const handleDelete = async (cardId: string) => {
    try {
      await deleteFlashcard.mutateAsync({ cardId, deckId: deckId! });
      toast.success('Flashcard deleted successfully');
      setDeleteConfirmCard(null);
    } catch (error) {
      toast.error('Failed to delete flashcard');
    }
  };

  const handleTogglePublish = async (card: Flashcard) => {
    try {
      await updateFlashcard.mutateAsync({
        cardId: card.id,
        updates: { is_published: !card.is_published },
      });
      toast.success(card.is_published ? 'Flashcard unpublished' : 'Flashcard published');
    } catch (error) {
      toast.error('Failed to update publish status');
    }
  };

  // ─── Word Import ─────────────────────────────────────────────────────────────
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<FlashcardInsert[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  /**
   * Parse BDA flashcard Word file.
   * Expected format:
   *   Heading 2: Card N
   *   Paragraph: Front: ...
   *   Paragraph: Back: ...
   *   Paragraph: Hint: ...
   */
  const parseFlashcardWord = (rawText: string): FlashcardInsert[] => {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const cards: FlashcardInsert[] = [];
    let i = 0;
    let orderIndex = 1;

    // Skip header lines before first Card
    while (i < lines.length && !/^Card\s+\d+$/i.test(lines[i])) {
      i++;
    }

    while (i < lines.length) {
      const line = lines[i];
      if (!/^Card\s+\d+$/i.test(line)) { i++; continue; }
      i++;

      let frontText = '';
      let backText = '';
      let hintText = '';

      // Collect Front, Back, Hint
      while (i < lines.length && !/^Card\s+\d+$/i.test(lines[i])) {
        const l = lines[i];
        if (/^Front:/i.test(l)) {
          frontText = l.replace(/^Front:\s*/i, '').trim();
          i++;
          // Collect continuation
          while (i < lines.length && !/^(Back:|Hint:|Card\s+\d+)/i.test(lines[i])) {
            frontText += ' ' + lines[i].trim();
            i++;
          }
        } else if (/^Back:/i.test(l)) {
          backText = l.replace(/^Back:\s*/i, '').trim();
          i++;
          while (i < lines.length && !/^(Front:|Hint:|Card\s+\d+)/i.test(lines[i])) {
            backText += ' ' + lines[i].trim();
            i++;
          }
        } else if (/^Hint:/i.test(l)) {
          hintText = l.replace(/^Hint:\s*/i, '').trim();
          i++;
          while (i < lines.length && !/^(Front:|Back:|Card\s+\d+)/i.test(lines[i])) {
            hintText += ' ' + lines[i].trim();
            i++;
          }
        } else {
          i++;
        }
      }

      if (frontText && backText) {
        cards.push({
          deck_id: deckId!,
          front_text: frontText,
          front_text_ar: null,
          back_text: backText,
          back_text_ar: null,
          hint: hintText || null,
          hint_ar: null,
          order_index: orderIndex++,
          difficulty_level: 'medium',
          is_published: true,
        });
      }
    }
    return cards;
  };

  const handleBulkImport = () => {
    setImportPreview([]);
    setImportFileName('');
    setIsImportDialogOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.docx')) {
      toast.error('Please upload a .docx file');
      return;
    }
    setImportFileName(file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const parsed = parseFlashcardWord(result.value);
      if (parsed.length === 0) {
        toast.error('No flashcards found. Check file format (Front: / Back: / Hint:)');
        return;
      }
      setImportPreview(parsed);
    } catch (err) {
      toast.error('Failed to read file');
    }
  };

  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    setIsImporting(true);
    try {
      await bulkCreateFlashcards.mutateAsync(importPreview);
      toast.success(`Successfully imported ${importPreview.length} flashcards`);
      setIsImportDialogOpen(false);
      setImportPreview([]);
    } catch (err) {
      toast.error('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoadingDeck || isLoadingCards) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/flashcards')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Flashcard Manager
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{deck?.title}</h1>
            <span className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-700">🇬🇧 English</span>
          </div>
          <p className="text-gray-600 mt-1">
            {cards?.length || 0} flashcards •{' '}
            {deck?.estimated_study_time_minutes
              ? `~${deck.estimated_study_time_minutes} min study time`
              : 'No time estimate'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleBulkImport}>
            <Upload className="w-4 h-4 mr-2" />
            Import Cards
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Flashcard
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <Layers className="w-4 h-4" />
            <span className="text-sm font-medium">Total Cards</span>
          </div>
          <p className="text-2xl font-bold">{cards?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">Published</span>
          </div>
          <p className="text-2xl font-bold">{cards?.filter((c) => c.is_published).length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <EyeOff className="w-4 h-4" />
            <span className="text-sm font-medium">Draft</span>
          </div>
          <p className="text-2xl font-bold">{cards?.filter((c) => !c.is_published).length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex items-center gap-2 text-yellow-600 mb-1">
            <Star className="w-4 h-4" />
            <span className="text-sm font-medium">With Hints</span>
          </div>
          <p className="text-2xl font-bold">{cards?.filter((c) => c.hint).length || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search flashcards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
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
          <p className="text-gray-600 mb-4">No flashcards found</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Flashcard
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <FlashcardDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={(data) => handleCreate({ ...data, deck_id: deckId! })}
        title="Create Flashcard"
        nextOrderIndex={(cards?.length || 0) + 1}
      />

      {/* Edit Dialog */}
      <FlashcardDialog
        open={!!editingCard}
        onOpenChange={(open) => !open && setEditingCard(null)}
        onSubmit={(data) => editingCard && handleUpdate(editingCard.id, data)}
        title="Edit Flashcard"
        defaultValues={editingCard || undefined}
      />

      {/* Preview Dialog */}
      <Dialog open={!!previewCard} onOpenChange={(open) => !open && setPreviewCard(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <div
            className="relative w-full h-64 cursor-pointer perspective-1000"
            onClick={() => setPreviewFlipped(!previewFlipped)}
          >
            <div
              className={`absolute inset-0 transition-transform duration-500 preserve-3d ${previewFlipped ? 'rotate-y-180' : ''}`}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div
                className="absolute inset-0 backface-hidden bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 flex flex-col items-center justify-center text-white"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <p className="text-lg font-medium text-center">{previewCard?.front_text}</p>
                <p className="text-xs mt-4 opacity-75">Click to flip</p>
              </div>
              <div
                className="absolute inset-0 backface-hidden bg-white rounded-xl p-6 flex flex-col items-center justify-center border-2 border-purple-200 rotate-y-180"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <p className="text-gray-900 text-center">{previewCard?.back_text}</p>
                {previewCard?.hint && (
                  <div className="mt-4 p-2 bg-yellow-50 rounded text-sm text-yellow-700 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    {previewCard.hint}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => setPreviewFlipped(!previewFlipped)}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Flip Card
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Word Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Flashcards from Word</DialogTitle>
            <DialogDescription>
              Upload a .docx file in BDA flashcard format (Card N / Front: / Back: / Hint:).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select .docx File</Label>
              <input
                type="file"
                accept=".docx"
                onChange={handleFileSelect}
                className="mt-1 block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              {importFileName && (
                <p className="text-xs text-gray-500 mt-1">File: {importFileName}</p>
              )}
            </div>
            {importPreview.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-green-700 mb-2">
                  ✅ {importPreview.length} flashcards ready to import
                </p>
                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50">
                  {importPreview.slice(0, 5).map((card, idx) => (
                    <div key={idx} className="text-xs border-b pb-2 last:border-0">
                      <p className="font-medium text-gray-800">#{idx + 1} {card.front_text.slice(0, 80)}{card.front_text.length > 80 ? '...' : ''}</p>
                      <p className="text-gray-500">{card.back_text.slice(0, 80)}{card.back_text.length > 80 ? '...' : ''}</p>
                    </div>
                  ))}
                  {importPreview.length > 5 && (
                    <p className="text-xs text-gray-400 text-center">... and {importPreview.length - 5} more cards</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConfirmImport}
              disabled={importPreview.length === 0 || isImporting}
            >
              {isImporting ? 'Importing...' : `Import ${importPreview.length} Cards`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmCard} onOpenChange={(open) => !open && setDeleteConfirmCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Flashcard</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this flashcard? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{deleteConfirmCard?.front_text}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmCard(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmCard && handleDelete(deleteConfirmCard.id)}
            >
              Delete
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
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onPreview: () => void;
}

function FlashcardCard({ card, index, onEdit, onDelete, onTogglePublish, onPreview }: FlashcardCardProps) {
  const difficultyLabel = card.difficulty_level === 'easy' ? 'easy' : card.difficulty_level === 'hard' ? 'hard' : 'medium';

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-600" />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-gray-400">
            <GripVertical className="w-4 h-4" />
            <span className="font-mono text-sm">#{index}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              card.difficulty_level === 'easy' ? 'bg-green-100 text-green-700'
              : card.difficulty_level === 'hard' ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700'
            }`}>
              {difficultyLabel}
            </span>
            <button
              onClick={onTogglePublish}
              className={`p-1 rounded transition-colors ${card.is_published ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              {card.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Front</p>
          <p className="text-gray-900 font-medium line-clamp-2">{card.front_text}</p>
        </div>

        <div className="mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Back</p>
          <p className="text-gray-700 text-sm line-clamp-2">{card.back_text}</p>
        </div>

        {card.hint && (
          <div className="flex items-center gap-1 text-yellow-600 text-xs mb-3">
            <Lightbulb className="w-3 h-3" />
            <span>Has hint</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t">
          <Button variant="ghost" size="sm" onClick={onPreview}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Preview
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
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
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
}

function FlashcardDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  defaultValues,
  nextOrderIndex = 1,
}: FlashcardDialogProps) {
  const [formData, setFormData] = useState({
    front_text: defaultValues?.front_text || '',
    back_text: defaultValues?.back_text || '',
    hint: defaultValues?.hint || '',
    front_image_url: defaultValues?.front_image_url || '',
    back_image_url: defaultValues?.back_image_url || '',
    difficulty_level: defaultValues?.difficulty_level || 'medium',
    order_index: defaultValues?.order_index || nextOrderIndex,
    tags: defaultValues?.tags || [],
    is_published: defaultValues?.is_published ?? true,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        front_text: defaultValues?.front_text || '',
        back_text: defaultValues?.back_text || '',
        hint: defaultValues?.hint || '',
        front_image_url: defaultValues?.front_image_url || '',
        back_image_url: defaultValues?.back_image_url || '',
        difficulty_level: defaultValues?.difficulty_level || 'medium',
        order_index: defaultValues?.order_index || nextOrderIndex,
        tags: defaultValues?.tags || [],
        is_published: defaultValues?.is_published ?? true,
      });
    }
  }, [open, defaultValues, nextOrderIndex]);

  const handleSubmit = () => {
    if (!formData.front_text) {
      toast.error('Front content is required');
      return;
    }
    if (!formData.back_text) {
      toast.error('Back content is required');
      return;
    }

    const submitData: FlashcardInsert = {
      front_text: formData.front_text,
      front_text_ar: null,
      back_text: formData.back_text,
      back_text_ar: null,
      hint: formData.hint || null,
      hint_ar: null,
      front_image_url: formData.front_image_url || null,
      back_image_url: formData.back_image_url || null,
      difficulty_level: formData.difficulty_level as any,
      order_index: formData.order_index,
      tags: formData.tags,
      is_published: formData.is_published,
    };

    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            <span className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-700">🇬🇧 English</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Front Content */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-600 text-white rounded flex items-center justify-center text-sm">F</span>
              Front of Card
            </h4>
            <div className="space-y-3">
              <div>
                <Label>Content (Front) *</Label>
                <Textarea
                  value={formData.front_text}
                  onChange={(e) => setFormData({ ...formData, front_text: e.target.value })}
                  placeholder="Enter the question or term"
                  rows={2}
                />
              </div>
              <div>
                <Label>Image URL (optional)</Label>
                <Input
                  value={formData.front_image_url || ''}
                  onChange={(e) => setFormData({ ...formData, front_image_url: e.target.value })}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Back Content */}
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <h4 className="font-medium text-indigo-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-600 text-white rounded flex items-center justify-center text-sm">B</span>
              Back of Card
            </h4>
            <div className="space-y-3">
              <div>
                <Label>Content (Back) *</Label>
                <Textarea
                  value={formData.back_text}
                  onChange={(e) => setFormData({ ...formData, back_text: e.target.value })}
                  placeholder="Enter the answer or definition"
                  rows={3}
                />
              </div>
              <div>
                <Label>Image URL (optional)</Label>
                <Input
                  value={formData.back_image_url || ''}
                  onChange={(e) => setFormData({ ...formData, back_image_url: e.target.value })}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Hint */}
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-900 mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Hint (optional)
            </h4>
            <Input
              value={formData.hint || ''}
              onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
              placeholder="A helpful clue..."
            />
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Difficulty</Label>
              <Select
                value={formData.difficulty_level}
                onValueChange={(value) => setFormData({ ...formData, difficulty_level: value as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Order</Label>
              <Input
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
                <Label>Published</Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {defaultValues?.front_text ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
