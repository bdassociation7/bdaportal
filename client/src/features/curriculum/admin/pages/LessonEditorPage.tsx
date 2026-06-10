/**
 * LessonEditorPage — Full-page lesson editor
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
 *   /admin/curriculum/lessons/new?lang=ar
 *   /admin/curriculum/lessons/:id/edit
 */

import { useEffect, useState } from 'react';
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
import { useAllQuizzes } from '@/entities/quiz';
import { useToast } from '@/hooks/use-toast';
import { RichTextEditor } from '../components/RichTextEditor';

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
type ExamLanguage = 'en' | 'ar';

// ─── Helper: expected filename ──────────────────────────────────────────────
function buildExpectedFilename(moduleOrder: number | undefined, lessonOrder: number, lang: ExamLanguage): string | null {
  if (!moduleOrder) return null;
  return `M${String(moduleOrder).padStart(2, '0')}_L${lessonOrder}_${lang.toUpperCase()}.docx`;
}

// ─── Component ─────────────────────────────────────────────────────────────
export function LessonEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const isEditing = !!id;
  const defaultLang = (searchParams.get('lang') as ExamLanguage) || 'en';

  const [examLanguage, setExamLanguage] = useState<ExamLanguage>(defaultLang);
  const [richContent, setRichContent] = useState<RichContent | null>(null);

  const isArabic = examLanguage === 'ar';

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: lesson, isLoading: isLoadingLesson } = useLesson(id, isEditing);

  const { data: modules } = useQuery({
    queryKey: curriculumKeys.modulesList({ exam_language: examLanguage }),
    queryFn: async () => {
      const result = await CurriculumService.getModules({ exam_language: examLanguage });
      return result.data || [];
    },
  });

  const { data: quizzes, isLoading: isLoadingQuizzes } = useAllQuizzes({ exclude_certification: true });

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

  // Derive module order for expected filename
  const selectedModule = modules?.find(m => m.id === selectedModuleId);
  const expectedFilename = buildExpectedFilename(
    selectedModule?.order_index ?? undefined,
    selectedOrderIndex,
    examLanguage
  );

  // ── Load lesson data when editing ─────────────────────────────────────
  useEffect(() => {
    if (lesson && isEditing) {
      const lessonLang = (lesson as any).exam_language as ExamLanguage;
      if (lessonLang) setExamLanguage(lessonLang);
      const isAr = lessonLang === 'ar';
      form.reset({
        module_id: lesson.module_id,
        title: isAr ? (lesson.title_ar || lesson.title) : lesson.title,
        description: isAr ? (lesson.description_ar || lesson.description || '') : (lesson.description || ''),
        order_index: lesson.order_index,
        estimated_duration_hours: lesson.estimated_duration_hours || 1,
        lesson_quiz_id: lesson.lesson_quiz_id || '',
        quiz_required: lesson.quiz_required,
        quiz_passing_score: lesson.quiz_passing_score,
        is_published: lesson.is_published,
      });
      const contentToLoad = isAr ? (lesson.content_ar || lesson.content) : lesson.content;
      setRichContent(contentToLoad as RichContent || null);
    }
  }, [lesson, isEditing, form]);

  // ── Submit ─────────────────────────────────────────────────────────────
  const onSubmit = async (data: LessonFormData) => {
    if (!isOrderAvailable) {
      toast({ title: 'Error', description: `Order ${data.order_index} is already used in this module`, variant: 'destructive' });
      return;
    }
    if (!richContent || !richContent.content || richContent.content.length === 0) {
      toast({ title: isArabic ? 'خطأ' : 'Error', description: isArabic ? 'المحتوى مطلوب' : 'Content is required', variant: 'destructive' });
      return;
    }
    try {
      const lessonData = {
        module_id: data.module_id,
        title: data.title,
        title_ar: examLanguage === 'ar' ? data.title : null,
        description: examLanguage === 'en' ? data.description : null,
        description_ar: examLanguage === 'ar' ? data.description : null,
        content: examLanguage === 'en' ? richContent : {},
        content_ar: examLanguage === 'ar' ? richContent : null,
        order_index: data.order_index as 1 | 2 | 3,
        estimated_duration_hours: data.estimated_duration_hours || null,
        lesson_quiz_id: data.lesson_quiz_id || null,
        quiz_required: data.quiz_required,
        quiz_passing_score: data.quiz_passing_score,
        is_published: data.is_published,
        exam_language: examLanguage,
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

  // ── Labels ─────────────────────────────────────────────────────────────
  const L = {
    title: isArabic ? 'العنوان *' : 'Title *',
    titlePh: isArabic ? 'مثال: مقدمة في إطار عمل BDA BoCK™' : 'Ex: Introduction to BDA BoCK™ Framework',
    desc: isArabic ? 'الوصف *' : 'Description *',
    descPh: isArabic ? 'صف هذا الدرس بإيجاز...' : 'Briefly describe this lesson...',
    contentPh: isArabic ? 'ابدأ كتابة محتوى الدرس...' : 'Start writing your lesson content here…',
    module: isArabic ? 'الوحدة (الكفاءة) *' : 'Module (Competency) *',
    selectModule: isArabic ? 'اختر وحدة' : 'Select a module',
    order: isArabic ? 'الترتيب في الوحدة *' : 'Order in module *',
    duration: isArabic ? 'المدة التقديرية (ساعات)' : 'Estimated duration (hours)',
    publish: isArabic ? 'نشر الدرس' : 'Publish lesson',
    publishDesc: isArabic ? 'الدروس المنشورة مرئية للمستخدمين' : 'Published lessons are visible to users',
    quizRequired: isArabic ? 'الاختبار مطلوب' : 'Quiz required',
    quizRequiredDesc: isArabic ? 'يجب إكمال الاختبار لإنهاء الدرس' : 'User must pass the quiz to complete the lesson',
    passingScore: isArabic ? 'درجة النجاح (%)' : 'Passing Score (%)',
  };

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
        <div className={`sticky top-0 z-30 border-b shadow-sm ${
          isArabic
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
            : 'bg-gradient-to-r from-blue-600 to-sky-700'
        }`}>
          <div className="flex items-center justify-between px-6 py-3 text-white">
            {/* Left: back + title */}
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
                  {isEditing ? (isArabic ? 'تعديل الدرس' : 'Edit Lesson') : (isArabic ? 'درس جديد' : 'New Lesson')}
                </span>
                <Badge className={`text-xs font-bold px-2 py-0.5 ${
                  isArabic ? 'bg-emerald-800 text-white' : 'bg-blue-800 text-white'
                }`}>
                  {isArabic ? '🇸🇦 Arabic' : '🇬🇧 English'}
                </Badge>
              </div>
            </div>

            {/* Right: expected filename + publish toggle + save */}
            <div className="flex items-center gap-3">
              {/* Expected filename */}
              {expectedFilename && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5 cursor-default">
                      <FileText className="h-3.5 w-3.5 opacity-70" />
                      <code className="text-xs font-mono">{expectedFilename}</code>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Expected Word filename for auto-import
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Publish toggle */}
              <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5">
                {isPublished
                  ? <Eye className="h-3.5 w-3.5" />
                  : <EyeOff className="h-3.5 w-3.5 opacity-60" />
                }
                <span className="text-xs font-medium">
                  {isPublished ? (isArabic ? 'منشور' : 'Published') : (isArabic ? 'مسودة' : 'Draft')}
                </span>
                <Switch
                  checked={isPublished}
                  onCheckedChange={(v) => form.setValue('is_published', v)}
                  className="scale-75"
                />
              </div>

              {/* Save button */}
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSaving || isOrderAvailable === false}
                className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow"
              >
                {isSaving
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Save className="mr-2 h-4 w-4" />
                }
                {isEditing ? (isArabic ? 'تحديث' : 'Update') : (isArabic ? 'حفظ' : 'Save Lesson')}
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
                      <FormLabel className="text-sm font-medium">{L.module}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder={L.selectModule} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {modules?.map((module) => (
                            <SelectItem key={module.id} value={module.id} className="text-sm">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {module.order_index ? `M${String(module.order_index).padStart(2,'0')} — ` : ''}
                                  {module.competency_name}
                                </span>
                                {module.competency_name_ar && (
                                  <span className="text-xs text-gray-400" dir="rtl">{module.competency_name_ar}</span>
                                )}
                              </div>
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
                        {L.order}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">{isArabic ? '1 — الدرس الأول' : '1 — First lesson'}</SelectItem>
                          <SelectItem value="2">{isArabic ? '2 — الدرس الثاني' : '2 — Second lesson'}</SelectItem>
                          <SelectItem value="3">{isArabic ? '3 — الدرس الثالث' : '3 — Third lesson'}</SelectItem>
                        </SelectContent>
                      </Select>
                      {isOrderAvailable === false && (
                        <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          {isArabic ? 'هذا الترتيب مستخدم بالفعل' : 'This order is already taken'}
                        </p>
                      )}
                      {isOrderAvailable === true && selectedModuleId && (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                          <CheckCircle className="h-3 w-3" />
                          {isArabic ? 'متاح' : 'Available'}
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
                      <FormLabel className="text-sm font-medium">{L.title}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={L.titlePh}
                          dir={isArabic ? 'rtl' : 'ltr'}
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
                      <FormLabel className="text-sm font-medium">{L.desc}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={L.descPh}
                          dir={isArabic ? 'rtl' : 'ltr'}
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
                        {L.duration}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" step="0.5" className="text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Expected filename info box */}
              {expectedFilename && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-blue-700 mb-1">Expected Word File</p>
                      <code className="text-xs bg-white border border-blue-200 rounded px-1.5 py-0.5 text-blue-800 font-mono">
                        {expectedFilename}
                      </code>
                      <p className="text-xs text-blue-600 mt-1">Upload this file in Word Import tab</p>
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
                  <span className="text-sm font-semibold text-gray-700">
                    {isArabic ? 'محتوى الدرس' : 'Lesson Content'}
                  </span>
                  <span className="text-xs text-red-500">*</span>
                </div>
                <p className="text-xs text-gray-400">
                  {isArabic
                    ? 'استخدم شريط الأدوات لتنسيق النص وإضافة العناوين والقوائم والصور'
                    : 'Use the toolbar to format text, add headings, lists, links, and images'}
                </p>
              </div>
              <div className="flex-1 p-6">
                <RichTextEditor
                  content={richContent}
                  onChange={setRichContent}
                  placeholder={L.contentPh}
                  dir={isArabic ? 'rtl' : 'ltr'}
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

                {/* Info banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-amber-700">
                    <strong>{isArabic ? 'ملاحظة:' : 'Note:'}</strong>{' '}
                    {isArabic
                      ? 'أنشئ الاختبارات أولاً في قسم إدارة الاختبارات، ثم اربطها هنا.'
                      : 'Create quizzes in Quiz Management first, then link them here.'}
                  </p>
                </div>

                {/* Quiz Selection */}
                <FormField
                  control={form.control}
                  name="lesson_quiz_id"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel className="text-sm font-medium">
                        {isArabic ? 'اختبار الدرس' : 'Lesson Quiz'}
                      </FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                        value={field.value || '__none__'}
                      >
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder={isArabic ? 'اختر اختبارًا' : 'Select a quiz'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-muted-foreground text-sm">
                              {isArabic ? '— بدون اختبار —' : '— No quiz —'}
                            </span>
                          </SelectItem>
                          {isLoadingQuizzes ? (
                            <SelectItem value="__loading__" disabled>Loading…</SelectItem>
                          ) : quizzes && quizzes.length > 0 ? (
                            quizzes.map((quiz) => (
                              <SelectItem key={quiz.id} value={quiz.id} className="text-sm">
                                <div className="flex flex-col">
                                  <span>{quiz.title}</span>
                                  {quiz.title_ar && <span className="text-xs text-gray-400" dir="rtl">{quiz.title_ar}</span>}
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__empty__" disabled>
                              {isArabic ? 'لا توجد اختبارات' : 'No quizzes available'}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        {isArabic
                          ? 'اربط اختبارًا للتحقق من فهم المتعلم'
                          : 'Link a quiz to validate learner understanding'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quiz Required */}
                <FormField
                  control={form.control}
                  name="quiz_required"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel className="text-sm font-medium">{L.quizRequired}</FormLabel>
                          <FormDescription className="text-xs mt-0.5">{L.quizRequiredDesc}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Passing Score */}
                <FormField
                  control={form.control}
                  name="quiz_passing_score"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel className="text-sm font-medium">{L.passingScore}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" min="0" max="100" className="text-sm pr-8" {...field} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">
                        {isArabic ? 'الحد الأدنى للنجاح (0-100%)' : 'Minimum score to pass (0-100%)'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Bottom save button (duplicate for convenience) */}
              <div className="pt-2 border-t">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSaving || isOrderAvailable === false}
                >
                  {isSaving
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <Save className="mr-2 h-4 w-4" />
                  }
                  {isEditing ? (isArabic ? 'تحديث الدرس' : 'Update Lesson') : (isArabic ? 'حفظ الدرس' : 'Save Lesson')}
                </Button>
              </div>
            </aside>

          </form>
        </Form>
      </div>
    </TooltipProvider>
  );
}
