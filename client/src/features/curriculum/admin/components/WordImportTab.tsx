/**
 * Word Import Tab
 * Allows admins to upload .docx files and import their content
 * directly into existing curriculum lessons.
 *
 * Two modes:
 *  1. Auto-match  — filename follows M<nn>_L<n>_<EN|AR>.docx convention
 *  2. Manual pick — admin selects the target lesson from a dropdown
 *
 * No server required — mammoth.js runs entirely in the browser.
 */
import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Loader2, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { convertWordToTipTap, parseWordFilename } from '../utils/word-to-tiptap';
import type { RichContent } from '@/entities/curriculum';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface LessonOption {
  id: string;
  title: string;
  module_name: string;
  order_index: number;
  module_index: number;
  exam_language: 'en' | 'ar';
}

type ImportStatus = 'pending' | 'parsing' | 'ready' | 'saving' | 'saved' | 'error';

interface ImportItem {
  id: string; // local key
  file: File;
  status: ImportStatus;
  parsedContent?: RichContent;
  rawHtml?: string;
  warnings?: string[];
  error?: string;
  // Matched lesson
  matchedLessonId?: string;
  matchedLessonTitle?: string;
  autoMatched: boolean;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function WordImportTab() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [lessonsLoaded, setLessonsLoaded] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [previewItem, setPreviewItem] = useState<ImportItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── Load lessons from DB ──────────────────────────────────────────────────
  const loadLessons = useCallback(async () => {
    if (lessonsLoaded) return;
    setLoadingLessons(true);
    try {
      const { data, error } = await supabase
        .from('curriculum_lessons')
        .select(`
          id, title, order_index, exam_language,
          module:module_id ( order_index, competency_name )
        `)
        .order('order_index', { ascending: true });

      if (error) throw error;

      const opts: LessonOption[] = (data || []).map((l: any) => ({
        id: l.id,
        title: l.title,
        order_index: l.order_index,
        module_name: l.module?.competency_name ?? '—',
        module_index: l.module?.order_index ?? 0,
        exam_language: l.exam_language,
      }));

      // Sort by module index then lesson index
      opts.sort((a, b) =>
        a.module_index !== b.module_index
          ? a.module_index - b.module_index
          : a.order_index - b.order_index
      );

      setLessons(opts);
      setLessonsLoaded(true);
    } catch (err: any) {
      toast({ title: 'Error loading lessons', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingLessons(false);
    }
  }, [lessonsLoaded, toast]);

  // ── File processing ───────────────────────────────────────────────────────
  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      await loadLessons();

      const newItems: ImportItem[] = Array.from(files)
        .filter((f) => /\.(docx?)$/i.test(f.name))
        .map((file) => ({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          status: 'parsing' as ImportStatus,
          autoMatched: false,
        }));

      if (newItems.length === 0) {
        toast({ title: 'No valid files', description: 'Please select .docx files only.', variant: 'destructive' });
        return;
      }

      setItems((prev) => [...prev, ...newItems]);

      // Parse each file
      for (const item of newItems) {
        const result = await convertWordToTipTap(item.file);

        if (!result.success || !result.content) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, status: 'error', error: result.error } : i
            )
          );
          continue;
        }

        // Try auto-match by filename
        const parsed = parseWordFilename(item.file.name);
        let matchedLessonId: string | undefined;
        let matchedLessonTitle: string | undefined;
        let autoMatched = false;

        if (parsed.valid && parsed.moduleIndex !== null && parsed.lessonIndex !== null && parsed.language) {
          // Re-fetch lessons if not yet loaded (edge case)
          const currentLessons = lessons.length > 0 ? lessons : [];
          const match = currentLessons.find(
            (l) =>
              l.module_index === parsed.moduleIndex &&
              l.order_index === parsed.lessonIndex &&
              l.exam_language === parsed.language
          );
          if (match) {
            matchedLessonId = match.id;
            matchedLessonTitle = match.title;
            autoMatched = true;
          }
        }

        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'ready',
                  parsedContent: result.content,
                  rawHtml: result.rawHtml,
                  warnings: result.warnings,
                  matchedLessonId,
                  matchedLessonTitle,
                  autoMatched,
                }
              : i
          )
        );
      }
    },
    [lessons, loadLessons, toast]
  );

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  // ── Save single item ──────────────────────────────────────────────────────
  const saveItem = useCallback(
    async (item: ImportItem) => {
      if (!item.matchedLessonId || !item.parsedContent) return;

      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'saving' } : i)));

      const { error } = await supabase
        .from('curriculum_lessons')
        .update({ content: item.parsedContent })
        .eq('id', item.matchedLessonId);

      if (error) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'error', error: error.message } : i))
        );
        toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      } else {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'saved' } : i)));
        toast({ title: '✅ Saved', description: `"${item.matchedLessonTitle}" updated successfully.` });
      }
    },
    [toast]
  );

  // ── Save all ready items ──────────────────────────────────────────────────
  const saveAll = useCallback(async () => {
    const readyItems = items.filter((i) => i.status === 'ready' && i.matchedLessonId);
    for (const item of readyItems) {
      await saveItem(item);
    }
  }, [items, saveItem]);

  // ── Update lesson assignment ──────────────────────────────────────────────
  const assignLesson = useCallback((itemId: string, lessonId: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        const lesson = lessons.find((l) => l.id === lessonId);
        return {
          ...i,
          matchedLessonId: lessonId,
          matchedLessonTitle: lesson?.title,
          autoMatched: false,
          status: i.status === 'error' ? 'ready' : i.status,
        };
      })
    );
  }, [lessons]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  const readyCount = items.filter((i) => i.status === 'ready' && i.matchedLessonId).length;
  const savedCount = items.filter((i) => i.status === 'saved').length;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Word Document Import
          </CardTitle>
          <CardDescription>
            Upload <strong>.docx</strong> files to populate lesson content. Use the naming convention{' '}
            <code className="bg-gray-100 px-1 rounded text-sm">M09_L1_EN.docx</code> for automatic
            lesson matching, or assign manually using the dropdown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Naming convention guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">📁 Naming Convention (for auto-match)</p>
            <p>
              <code>M&lt;module_number&gt;_L&lt;lesson_number&gt;_&lt;EN|AR&gt;.docx</code>
            </p>
            <p className="mt-1 text-blue-600">
              Examples: <code>M09_L1_EN.docx</code> · <code>M01_L3_AR.docx</code> · <code>M14_L2_EN.docx</code>
            </p>
          </div>

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => { loadLessons(); fileInputRef.current?.click(); }}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 font-medium">Drop .docx files here or click to browse</p>
            <p className="text-gray-400 text-sm mt-1">Multiple files supported</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && processFiles(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items list */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">
                Import Queue — {items.length} file{items.length !== 1 ? 's' : ''}
              </CardTitle>
              {savedCount > 0 && (
                <p className="text-sm text-green-600 mt-0.5">{savedCount} saved successfully</p>
              )}
            </div>
            {readyCount > 0 && (
              <Button onClick={saveAll} className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Save All ({readyCount})
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <ImportItemRow
                key={item.id}
                item={item}
                lessons={lessons}
                loadingLessons={loadingLessons}
                onAssign={assignLesson}
                onSave={saveItem}
                onRemove={removeItem}
                onPreview={() => setPreviewItem(item)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Preview dialog */}
      {previewItem && (
        <Dialog open onOpenChange={() => setPreviewItem(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview — {previewItem.file.name}</DialogTitle>
            </DialogHeader>
            {previewItem.rawHtml ? (
              <div
                className="prose prose-sm max-w-none border rounded p-4 bg-white"
                dangerouslySetInnerHTML={{ __html: previewItem.rawHtml }}
              />
            ) : (
              <p className="text-gray-500">No content to preview.</p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Single import item row
// ─────────────────────────────────────────────

interface ImportItemRowProps {
  item: ImportItem;
  lessons: LessonOption[];
  loadingLessons: boolean;
  onAssign: (itemId: string, lessonId: string) => void;
  onSave: (item: ImportItem) => void;
  onRemove: (id: string) => void;
  onPreview: () => void;
}

function ImportItemRow({
  item,
  lessons,
  loadingLessons,
  onAssign,
  onSave,
  onRemove,
  onPreview,
}: ImportItemRowProps) {
  const statusIcon = {
    pending: <Loader2 className="w-4 h-4 animate-spin text-gray-400" />,
    parsing: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />,
    ready: <FileText className="w-4 h-4 text-blue-500" />,
    saving: <Loader2 className="w-4 h-4 animate-spin text-orange-500" />,
    saved: <CheckCircle className="w-4 h-4 text-green-500" />,
    error: <XCircle className="w-4 h-4 text-red-500" />,
  }[item.status];

  const statusLabel = {
    pending: 'Queued',
    parsing: 'Parsing…',
    ready: 'Ready',
    saving: 'Saving…',
    saved: 'Saved ✓',
    error: 'Error',
  }[item.status];

  // Group lessons by language for the dropdown
  const enLessons = lessons.filter((l) => l.exam_language === 'en');
  const arLessons = lessons.filter((l) => l.exam_language === 'ar');

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border rounded-lg bg-gray-50">
      {/* Status icon */}
      <div className="flex-shrink-0">{statusIcon}</div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.file.name}</p>
        {item.autoMatched && item.matchedLessonTitle && (
          <p className="text-xs text-green-600 mt-0.5">
            Auto-matched → {item.matchedLessonTitle}
          </p>
        )}
        {!item.autoMatched && item.matchedLessonTitle && (
          <p className="text-xs text-blue-600 mt-0.5">
            Assigned → {item.matchedLessonTitle}
          </p>
        )}
        {item.error && (
          <p className="text-xs text-red-500 mt-0.5">{item.error}</p>
        )}
        {item.warnings && item.warnings.length > 0 && (
          <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {item.warnings.length} warning{item.warnings.length > 1 ? 's' : ''} during parsing
          </p>
        )}
      </div>

      {/* Status badge */}
      <Badge
        variant={
          item.status === 'saved'
            ? 'default'
            : item.status === 'error'
            ? 'destructive'
            : 'secondary'
        }
        className="flex-shrink-0 text-xs"
      >
        {statusLabel}
      </Badge>

      {/* Lesson selector — shown when not yet saved */}
      {item.status !== 'saved' && item.status !== 'saving' && item.parsedContent && (
        <div className="w-full sm:w-64 flex-shrink-0">
          <Select
            value={item.matchedLessonId || ''}
            onValueChange={(val) => onAssign(item.id, val)}
            disabled={loadingLessons}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={loadingLessons ? 'Loading…' : 'Select lesson…'} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {enLessons.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-50">
                    🇬🇧 English Lessons
                  </div>
                  {enLessons.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-xs">
                      M{String(l.module_index).padStart(2, '0')}_L{l.order_index} — {l.title}
                    </SelectItem>
                  ))}
                </>
              )}
              {arLessons.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-50">
                    🇸🇦 Arabic Lessons
                  </div>
                  {arLessons.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-xs">
                      M{String(l.module_index).padStart(2, '0')}_L{l.order_index} — {l.title}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {item.parsedContent && (
          <Button size="sm" variant="ghost" onClick={onPreview} title="Preview HTML">
            <Eye className="w-4 h-4" />
          </Button>
        )}
        {item.status === 'ready' && item.matchedLessonId && (
          <Button size="sm" variant="default" onClick={() => onSave(item)} className="h-8 text-xs px-3">
            Save
          </Button>
        )}
        {(item.status === 'error' || item.status === 'saved') && (
          <Button size="sm" variant="ghost" onClick={() => onRemove(item.id)} title="Remove">
            <Trash2 className="w-4 h-4 text-gray-400" />
          </Button>
        )}
      </div>
    </div>
  );
}
