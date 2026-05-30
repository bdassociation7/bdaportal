/**
 * Lesson Editor Component
 * Form for creating and editing lessons
 *
 * IMPORTANT: English and Arabic lessons are completely separate products.
 * Each lesson belongs to ONE language only - no bilingual content within a single lesson.
 */

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Loader2, Save, HelpCircle } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';

// Validation schema - fields are language-agnostic (title/description/content are used for the selected language)
// Note: content is managed separately via RichTextEditor state, not through the form
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

interface LessonEditorProps {
  lessonId?: string;
  isOpen: boolean;
  onClose: () => void;
  defaultLanguage?: ExamLanguage;
}

export function LessonEditor({ lessonId, isOpen, onClose, defaultLanguage = 'en' }: LessonEditorProps) {
  const { toast } = useToast();
  const isEditing = !!lessonId;
  const [examLanguage, setExamLanguage] = useState<ExamLanguage>(defaultLanguage);
  const [richContent, setRichContent] = useState<RichContent | null>(null);

  // Update examLanguage when defaultLanguage changes (for new lessons)
  useEffect(() => {
    if (!isEditing) {
      setExamLanguage(defaultLanguage);
    }
  }, [defaultLanguage, isEditing]);

  // Queries
  const { data: lesson, isLoading: isLoadingLesson } = useLesson(lessonId, isOpen && isEditing);

  // Load modules filtered by language (admin context - no user progress needed)
  const { data: modules } = useQuery({
    queryKey: curriculumKeys.modulesList({ exam_language: examLanguage }),
    queryFn: async () => {
      const result = await CurriculumService.getModules({ exam_language: examLanguage });
      return result.data || [];
    },
  });

  // Load all quizzes for selection
  const { data: quizzes, isLoading: isLoadingQuizzes } = useAllQuizzes();

  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();

  // Form
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

  // Check if order index is available
  const { data: isOrderAvailable } = useCheckOrderIndex(
    selectedModuleId,
    selectedOrderIndex as 1 | 2 | 3,
    lessonId
  );

  // Load lesson data when editing
  useEffect(() => {
    if (lesson && isEditing) {
      // Set exam language from the lesson being edited
      const lessonLang = (lesson as any).exam_language as ExamLanguage;
      if (lessonLang) {
        setExamLanguage(lessonLang);
      }

      // For Arabic lessons, use Arabic fields; for English, use English fields
      const isArabic = lessonLang === 'ar';

      form.reset({
        module_id: lesson.module_id,
        // Use the appropriate language field
        title: isArabic ? (lesson.title_ar || lesson.title) : lesson.title,
        description: isArabic ? (lesson.description_ar || lesson.description || '') : (lesson.description || ''),
        order_index: lesson.order_index,
        estimated_duration_hours: lesson.estimated_duration_hours || 1,
        lesson_quiz_id: lesson.lesson_quiz_id || '',
        quiz_required: lesson.quiz_required,
        quiz_passing_score: lesson.quiz_passing_score,
        is_published: lesson.is_published,
      });

      // Load rich content for the WYSIWYG editor
      const contentToLoad = isArabic
        ? (lesson.content_ar || lesson.content)
        : lesson.content;
      setRichContent(contentToLoad as RichContent || null);
    }
  }, [lesson, isEditing, form]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setRichContent(null);
    }
  }, [isOpen, form]);

  const onSubmit = async (data: LessonFormData) => {
    try {
      // Check that order index is available
      if (!isOrderAvailable) {
        toast({
          title: 'Error',
          description: `Order ${data.order_index} is already used in this module`,
          variant: 'destructive',
        });
        return;
      }

      // Validate content from WYSIWYG editor
      if (!richContent || !richContent.content || richContent.content.length === 0) {
        toast({
          title: examLanguage === 'ar' ? 'خطأ' : 'Error',
          description: examLanguage === 'ar' ? 'المحتوى مطلوب' : 'Content is required',
          variant: 'destructive',
        });
        return;
      }

      // Build lesson data based on language
      // For English lessons: populate title, description, content
      // For Arabic lessons: populate title_ar, description_ar, content_ar
      const lessonData = {
        module_id: data.module_id,
        // English fields
        title: examLanguage === 'en' ? data.title : data.title, // Always set title for DB constraint
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
        await updateLesson.mutateAsync({
          id: lessonId,
          updates: lessonData,
        });
        toast({
          title: 'Success',
          description: 'Lesson updated successfully',
        });
      } else {
        await createLesson.mutateAsync(lessonData);
        toast({
          title: 'Success',
          description: 'Lesson created successfully',
        });
      }

      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'create'} lesson`,
        variant: 'destructive',
      });
    }
  };

  const isLoading = createLesson.isPending || updateLesson.isPending;

  // Language-specific labels
  const isArabic = examLanguage === 'ar';
  const labels = {
    title: isArabic ? 'العنوان *' : 'Title *',
    titlePlaceholder: isArabic ? 'مثال: مقدمة في إطار عمل BDA BoCK™' : 'Ex: Introduction to BDA BoCK™ Framework',
    description: isArabic ? 'الوصف *' : 'Description *',
    descriptionPlaceholder: isArabic ? 'صف هذا الدرس بإيجاز...' : 'Briefly describe this lesson...',
    content: isArabic ? 'محتوى الدرس *' : 'Lesson Content *',
    contentPlaceholder: isArabic ? 'ابدأ كتابة محتوى الدرس...' : 'Start writing your lesson content...',
    module: isArabic ? 'الوحدة (الكفاءة) *' : 'Module (Competency) *',
    selectModule: isArabic ? 'اختر وحدة' : 'Select a module',
    order: isArabic ? 'الترتيب في الوحدة *' : 'Order in module *',
    duration: isArabic ? 'المدة المقدرة (ساعات)' : 'Estimated duration (hours)',
    publish: isArabic ? 'نشر الدرس' : 'Publish lesson',
    publishDesc: isArabic ? 'الدروس المنشورة مرئية للمستخدمين' : 'Published lessons are visible to users',
    quizRequired: isArabic ? 'الاختبار مطلوب' : 'Quiz required',
    quizRequiredDesc: isArabic ? 'يجب على المستخدم إكمال الاختبار لإنهاء الدرس' : 'User must complete the quiz to finish the lesson',
    passingScore: isArabic ? 'درجة النجاح (%)' : 'Passing Score (%)',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (isArabic ? 'تعديل الدرس' : 'Edit Lesson') : (isArabic ? 'درس جديد' : 'New Lesson')}
            <span className={`text-sm px-2 py-1 rounded ${examLanguage === 'en' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {examLanguage === 'en' ? '🇬🇧 English' : '🇸🇦 Arabic'}
            </span>
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? (isArabic ? 'تعديل معلومات الدرس أدناه' : 'Modify the lesson information below')
              : (isArabic
                  ? 'إنشاء درس عربي جديد (كفاءة فرعية) لإطار عمل BDA'
                  : 'Create a new English sub-competency (lesson) for the BDA framework')}
          </DialogDescription>
        </DialogHeader>

        {isLoadingLesson && isEditing ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">{isArabic ? 'المعلومات' : 'Information'}</TabsTrigger>
                  <TabsTrigger value="content">{isArabic ? 'المحتوى' : 'Content'}</TabsTrigger>
                  <TabsTrigger value="quiz">{isArabic ? 'الاختبار' : 'Quiz'}</TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4 mt-4">
                  {/* Module */}
                  <FormField
                    control={form.control}
                    name="module_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{labels.module}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={labels.selectModule} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {modules?.map((module) => (
                              <SelectItem key={module.id} value={module.id}>
                                {module.competency_name}
                                {module.competency_name_ar && ` | ${module.competency_name_ar}`}
                                {module.section_type === 'knowledge_based'
                                  ? ' (Knowledge)'
                                  : ' (Behavioural)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {isArabic ? 'اختر الوحدة الأم (14 كفاءة متاحة)' : 'Choose the parent module (14 competencies available)'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Order in module */}
                  <FormField
                    control={form.control}
                    name="order_index"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{labels.order}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value?.toString()}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isArabic ? 'الترتيب (1، 2، أو 3)' : 'Order (1, 2, or 3)'} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">{isArabic ? '1 - الدرس الأول' : '1 - First lesson'}</SelectItem>
                            <SelectItem value="2">{isArabic ? '2 - الدرس الثاني' : '2 - Second lesson'}</SelectItem>
                            <SelectItem value="3">{isArabic ? '3 - الدرس الثالث' : '3 - Third lesson'}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {isArabic ? 'موضع الدرس في الوحدة (3 دروس لكل وحدة)' : 'Position of the lesson in the module (3 lessons per module)'}
                          {isOrderAvailable === false && (
                            <span className="text-destructive mx-2">
                              ⚠️ {isArabic ? 'هذا الترتيب مستخدم بالفعل في هذه الوحدة' : 'This order is already used in this module'}
                            </span>
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Title - Single field for the selected language */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{labels.title}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={labels.titlePlaceholder}
                            dir={isArabic ? 'rtl' : 'ltr'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description - Single field for the selected language */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{labels.description}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={labels.descriptionPlaceholder}
                            dir={isArabic ? 'rtl' : 'ltr'}
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Estimated Duration */}
                  <FormField
                    control={form.control}
                    name="estimated_duration_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{labels.duration}</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="100" step="0.5" {...field} />
                        </FormControl>
                        <FormDescription>
                          {isArabic ? 'الوقت المقدر لإكمال هذا الدرس' : 'Estimated time to complete this lesson'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Published */}
                  <FormField
                    control={form.control}
                    name="is_published"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">{labels.publish}</FormLabel>
                          <FormDescription>
                            {labels.publishDesc}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Content Tab */}
                <TabsContent value="content" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {labels.content}
                    </label>
                    <RichTextEditor
                      content={richContent}
                      onChange={setRichContent}
                      placeholder={labels.contentPlaceholder}
                      dir={isArabic ? 'rtl' : 'ltr'}
                    />
                    <p className="text-sm text-muted-foreground">
                      {isArabic
                        ? 'استخدم شريط الأدوات لتنسيق النص وإضافة العناوين والقوائم والروابط والصور'
                        : 'Use the toolbar to format text, add headings, lists, links, and images'}
                    </p>
                  </div>
                </TabsContent>

                {/* Quiz Tab */}
                <TabsContent value="quiz" className="space-y-4 mt-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>{isArabic ? 'مهم:' : 'Important:'}</strong> {isArabic
                        ? 'حدد اختبارًا من القائمة أدناه. أنشئ الاختبارات في قسم إدارة الاختبارات أولاً.'
                        : 'Select a quiz from the list below. Create quizzes in Quiz Management first.'}
                    </p>
                  </div>

                  {/* Quiz Selection */}
                  <FormField
                    control={form.control}
                    name="lesson_quiz_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4" />
                          {isArabic ? 'اختبار الدرس' : 'Lesson Quiz'}
                        </FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                          value={field.value || '__none__'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isArabic ? 'اختر اختبارًا (اختياري)' : 'Select a quiz (optional)'} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">
                              <span className="text-muted-foreground">
                                {isArabic ? '— بدون اختبار —' : '— No quiz —'}
                              </span>
                            </SelectItem>
                            {isLoadingQuizzes ? (
                              <SelectItem value="__loading__" disabled>
                                {isArabic ? 'جارٍ التحميل...' : 'Loading...'}
                              </SelectItem>
                            ) : quizzes && quizzes.length > 0 ? (
                              quizzes.map((quiz) => (
                                <SelectItem key={quiz.id} value={quiz.id}>
                                  <div className="flex items-center gap-2">
                                    <span>
                                      {quiz.title}
                                      {quiz.title_ar && ` | ${quiz.title_ar}`}
                                    </span>
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                      {quiz.certification_type}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      ({quiz.difficulty_level})
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__empty__" disabled>
                                {isArabic ? 'لا توجد اختبارات متاحة' : 'No quizzes available'}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {isArabic
                            ? 'اربط اختبارًا بهذا الدرس للتحقق من فهم المتعلم'
                            : 'Link a quiz to this lesson to validate learner understanding'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Quiz required toggle */}
                  <FormField
                    control={form.control}
                    name="quiz_required"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">{labels.quizRequired}</FormLabel>
                          <FormDescription>
                            {labels.quizRequiredDesc}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Passing Score */}
                  <FormField
                    control={form.control}
                    name="quiz_passing_score"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{labels.passingScore}</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="100" {...field} />
                        </FormControl>
                        <FormDescription>
                          {isArabic ? 'الحد الأدنى للنجاح في الاختبار (0-100%)' : 'Minimum score to pass the quiz (0-100%)'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" disabled={isLoading || !isOrderAvailable}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing
                    ? (isArabic ? 'تحديث' : 'Update')
                    : (isArabic ? 'إنشاء' : 'Create')}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
