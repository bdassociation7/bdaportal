/**
 * LessonEditorPage — Full-page lesson editor — English Only
 *
 * Layout: 3-column
 *  ┌──────────────────────────────────────────────────────────┐
 *  │  ← Back   [Language badge]   [Expected filename]  [Save] │  ← Top bar
 *  ├─────────────┬──────────────────────────┬─────────────────┤
 *  │  Sidebar    │   Rich Text Editor        │  Quiz Panel     │
 *  │  (info)     │   (main content)          │  (quiz config)  │
 *  └─────────────┴──────────────────────────┴─────────────────┘
 *
 * Routes:
 *   /admin/curriculum/lessons/new?lang=en
 *   /admin/curriculum/lessons/:id/edit
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Loader2,
  HelpCircle,
  BookOpen,
  Clock,
  Hash,
  FileText,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Info,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useLesson,
  useCreateLesson,
  useUpdateLesson,
  useCheckOrderIndex,
  CurriculumService,
  curriculumKeys,
  type RichContent,
} from '@/entities/curriculum';
import { InlineQuizBuilder } from '../components/InlineQuizBuilder';
import { useToast } from '@/hooks/use-toast';
import { RichTextEditor } from '../components/RichTextEditor';
import { convertWordToTipTap } from '../utils/word-to-tiptap';

// ─── Validation ────────────────────────────────────────────────────────────
const lessonSchema = z.object({
  module_id: z.string().uuid('Please select a module'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  order_index: z.coerce.number().min(1).max(3),
  estimated_duration_hours: z.coerce.number().min(0).max(100).optional(),
  lesson_quiz_id: z.string().uuid().optional().or(z.literal('')),
  quiz_required: z.boolean().default(true),
  quiz_passing_score: z.coerce.number().min(0).max(100).default(70),
  is_published: z.boolean().default(false),
});

type LessonFormData = z.infer<typeof lessonSchema>;

// ─── Helper: expected filename ──────────────────────────────────────────────
function buildExpectedFilename(moduleOrder: number | undefined, lessonOrder: number): string | null {
  if (!moduleOrder) return null;
  return `M${String(moduleOrder).padStart(2, '0')}_L${lessonOrder}_EN.docx`;
}

// ─── Component ─────────────────────────────────────────────────────────────
export function LessonEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const isEditing = !!id;
  const [richContent, setRichContent] = useState<RichContent | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Word Import Handler ────────────────────────────────────────────────
  const handleWordFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const result = await convertWordToTipTap(file);
      if (result.success && result.content) {
        setRichContent(result.content as RichContent);
        toast({
          title: '✅ Word file imported',
          description: `Content loaded successfully. Click "${isEditing ? 'Update' : 'Save'}" to save.${result.warnings?.length ? ` (${result.warnings.length} warnings)` : ''}`,
        });
      } else {
        toast({
          title: 'Import failed',
          description: result.error || 'Could not parse Word file',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Import error',
        description: err?.message || 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: lesson, isLoading: isLoadingLesson } = useLesson(id, isEditing);

  const { data: modules } = useQuery({
    queryKey: curriculumKeys.modulesList({ exam_language: 'en' }),
    queryFn: async () => {
      const result = await CurriculumService.getModules({ exam_language: 'en' });
      return result.data || [];
    },
  });

  const [linkedQuizId, setLinkedQuizId] = useState<string | undefined>(undefined);

  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();

  // ── Form ───────────────────────────────────────────────────────────────
  const form = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      module_id: '',
      title: '',
      description: '',
      order_index: 1,
      estimated_duration_hours: 1,
      lesson_quiz_id: '',
      quiz_required: true,
      quiz_passing_score: 70,
      is_published: false,
    },
  });

  const selectedModuleId = form.watch('module_id');
  const selectedOrderIndex = form.watch('order_index');
  const isPublished = form.watch('is_published');

  const { data: isOrderAvailable } = useCheckOrderIndex(
    selectedModuleId,
    selectedOrderIndex as 1 | 2 | 3,
    id
  );

  const selectedModule = modules?.find(m => m.id === selectedModuleId);
  const expectedFilename = buildExpectedFilename(
    selectedModule?.order_index ?? undefined,
    selectedOrderIndex
  );

  // ── Load lesson data when editing ─────────────────────────────────────
  useEffect(() => {
    if (lesson && isEditing) {
      setLinkedQuizId(lesson.lesson_quiz_id || undefined);
      form.reset({
        module_id: lesson.module_id,
        title: lesson.title,
        description: lesson.description || '',
        order_index: lesson.order_index,
        estimated_duration_hours: lesson.estimated_duration_hours || 1,
        lesson_quiz_id: lesson.lesson_quiz_id || '',
        quiz_required: lesson.quiz_required,
        quiz_passing_score: lesson.quiz_passing_score,
        is_published: lesson.is_published,
      });
      setRichContent(lesson.content as RichContent || null);
    }
  }, [lesson, isEditing, form]);

  // ── Submit ─────────────────────────────────────────────────────────────
  const onSubmit = async (data: LessonFormData) => {
    if (!isOrderAvailable) {
      toast({ title: 'Error', description: `Order ${data.order_index} is already used in this module`, variant: 'destructive' });
      return;
    }
    if (!richContent || !richContent.content || richContent.content.length === 0) {
      toast({ title: 'Error', description: 'Lesson content is required', variant: 'destructive' });
      return;
    }
    try {
      const lessonData = {
        module_id: data.module_id,
        title: data.title,
        title_ar: null,
        description: data.description,
        description_ar: null,
        content: richContent,
        content_ar: null,
        order_index: data.order_index as 1 | 2 | 3,
        estimated_duration_hours: data.estimated_duration_hours || null,
        lesson_quiz_id: linkedQuizId || data.lesson_quiz_id || null,
        quiz_required: data.quiz_required,
        quiz_passing_score: data.quiz_passing_score,
        is_published: data.is_published,
        exam_language: 'en' as const,
      };

      if (isEditing) {
        await updateLesson.mutateAsync({ id, updates: lessonData });
        toast({ title: 'Success', description: 'Lesson updated successfully' });
      } else {
        await createLesson.mutateAsync(lessonData);
        toast({ title: 'Success', description: 'Lesson created successfully' });
      }
      navigate('/admin/curriculum/lessons');
    } catch {
      toast({ title: 'Error', description: `Failed to ${isEditing ? 'update' : 'create'} lesson`, variant: 'destructive' });
    }
  };

  const isSaving = createLesson.isPending || updateLesson.isPending;

  // ── Loading state ──────────────────────────────────────────────────────
  if (isEditing && isLoadingLesson) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading lesson…</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">

        {/* ── Top Bar ─────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-30 border-b shadow-sm bg-gradient-to-r from-blue-600 to-sky-700">
          <div className="flex items-center justify-between px-6 py-3 text-white">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/curriculum/lessons')}
                className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Lessons
              </button>
              <div className="h-5 w-px bg-white/30" />
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 opacity-80" />
                <span className="font-semibold text-base">
                  {isEditing ? 'Edit Lesson' : 'New Lesson'}
                </span>
                <Badge className="text-xs font-bold px-2 py-0.5 bg-blue-800 text-white">
                  🇬🇧 English Lesson
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {expectedFilename && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx"
                    className="hidden"
                    onChange={handleWordFileChange}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="bg-white/15 hover:bg-white/25 text-white border-0 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                      >
                        {isImporting ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {isImporting ? 'Importing…' : `Import ${expectedFilename}`}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Click to upload and import Word file into the editor
                    </TooltipContent>
                  </Tooltip>
                </>
              )}

              <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5">
                {isPublished ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 opacity-60" />}
                <span className="text-xs font-medium">{isPublished ? 'Published' : 'Draft'}</span>
                <Switch
                  checked={isPublished}
                  onCheckedChange={(v) => form.setValue('is_published', v)}
                  className="scale-75"
                />
              </div>

              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSaving || isOrderAvailable === false}
                className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow"
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing ? 'Update' : 'Save Lesson'}
              </Button>
            </div>
          </div>
        </div>

        {/* ── 3-Column Body ───────────────────────────────────────────── */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 overflow-hidden">

            {/* ── LEFT SIDEBAR: Lesson Info ──────────────────────────── */}
            <aside className="w-72 flex-shrink-0 bg-white border-r overflow-y-auto p-5 space-y-5">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
                  Lesson Information
                </h2>

                {/* Module */}
                <FormField
                  control={form.control}
                  name="module_id"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel className="text-sm font-medium">Module (Competency) *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select a module" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {modules?.map((module) => (
                            <SelectItem key={module.id} value={module.id} className="text-sm">
                              <span className="font-medium">
                                {module.order_index ? `M${String(module.order_index).padStart(2,'0')} — ` : ''}
                                {module.competency_name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Order */}
                <FormField
                  control={form.control}
                  name="order_index"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-gray-400" />
                        Order in module *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 — First lesson</SelectItem>
                          <SelectItem value="2">2 — Second lesson</SelectItem>
                          <SelectItem value="3">3 — Third lesson</SelectItem>
                        </SelectContent>
                      </Select>
                      {isOrderAvailable === false && (
                        <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          This order is already taken
                        </p>
                      )}
                      {isOrderAvailable === true && selectedModuleId && (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                          <CheckCircle className="h-3 w-3" />
                          Available
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel className="text-sm font-medium">Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Introduction to BDA BoCK™ Framework"
                          className="text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel className="text-sm font-medium">Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Briefly describe this lesson…"
                          rows={4}
                          className="text-sm resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Duration */}
                <FormField
                  control={form.control}
                  name="estimated_duration_hours"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        Estimated duration (hours)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" step="0.5" className="text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {expectedFilename && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-blue-700 mb-1">Expected Word File</p>
                      <code className="text-xs bg-white border border-blue-200 rounded px-1.5 py-0.5 text-blue-800 font-mono">
                        {expectedFilename}
                      </code>
                      <p className="text-xs text-blue-600 mt-1">Click "Import" button in the top bar to upload</p>
                    </div>
                  </div>
                </div>
              )}
            </aside>

            {/* ── MAIN: Rich Text Editor ─────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-y-auto bg-white">
              <div className="border-b px-6 py-3 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Lesson Content</span>
                  <span className="text-xs text-red-500">*</span>
                </div>
                <p className="text-xs text-gray-400">
                  Use the toolbar to format text, add headings, lists, links, and images
                </p>
              </div>
              <div className="flex-1 p-6">
                <RichTextEditor
                  content={richContent}
                  onChange={setRichContent}
                  placeholder="Start writing your lesson content here…"
                />
              </div>
            </main>

            {/* ── RIGHT PANEL: Quiz Config ───────────────────────────── */}
            <aside className="w-72 flex-shrink-0 bg-white border-l overflow-y-auto p-5 space-y-5">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Quiz Configuration
                </h2>

                <div className="mb-4">
                  <InlineQuizBuilder
                    quizId={linkedQuizId}
                    language="en"
                    lessonTitle={form.watch('title')}
                    onQuizSaved={(qid) => {
                      setLinkedQuizId(qid);
                      form.setValue('lesson_quiz_id', qid);
                    }}
                    onQuizRemoved={() => {
                      setLinkedQuizId(undefined);
                      form.setValue('lesson_quiz_id', '');
                    }}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="quiz_required"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel className="text-sm font-medium">Quiz required</FormLabel>
                          <FormDescription className="text-xs mt-0.5">User must pass the quiz to complete the lesson</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quiz_passing_score"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel className="text-sm font-medium">Passing Score (%)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" min="0" max="100" className="text-sm pr-8" {...field} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">
                        Minimum score to pass (0-100%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-2 border-t">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSaving || isOrderAvailable === false}
                >
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isEditing ? 'Update Lesson' : 'Save Lesson'}
                </Button>
              </div>
            </aside>

          </form>
        </Form>
      </div>
    </TooltipProvider>
  );
}
