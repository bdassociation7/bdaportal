/**
 * Question Set Editor - Admin Page
 * Manage individual questions within a question set
 *
 * IMPORTANT: Questions are language-specific based on the parent question set's exam_language.
 * English question sets only have English questions.
 * Arabic question sets only have Arabic questions.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useQuestionSet,
  useQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useBulkCreateQuestions,
} from '@/entities/question-bank';
import type {
  PracticeQuestion,
  PracticeQuestionInsert,
  PracticeQuestionUpdate,
  QuestionOption,
} from '@/entities/question-bank';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  Check,
  X,
  MoreHorizontal,
  Upload,
  Download,
  Search,
  Filter,
  HelpCircle,
  Globe,
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

type ExamLanguage = 'en' | 'ar';

export function QuestionSetEditor() {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<PracticeQuestion | null>(
    null
  );
  const [deleteConfirmQuestion, setDeleteConfirmQuestion] =
    useState<PracticeQuestion | null>(null);

  // Data fetching
  const { data: questionSet, isLoading: isLoadingSet } = useQuestionSet(setId);
  const { data: questions, isLoading: isLoadingQuestions } = useQuestions(setId, {
    difficulty_level:
      difficultyFilter !== 'all' ? (difficultyFilter as any) : undefined,
  });

  // Get exam language from question set
  const examLanguage: ExamLanguage = (questionSet as any)?.exam_language || 'en';
  const isArabic = examLanguage === 'ar';

  // Mutations
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();

  // Filter questions
  const filteredQuestions = questions?.filter((q) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      // Search in the appropriate language field
      if (isArabic) {
        return (
          q.question_text_ar?.toLowerCase().includes(search) ||
          q.question_text.toLowerCase().includes(search)
        );
      }
      return q.question_text.toLowerCase().includes(search);
    }
    return true;
  });

  // Handle create
  const handleCreate = async (data: PracticeQuestionInsert) => {
    try {
      await createQuestion.mutateAsync(data);
      toast.success(isArabic ? 'تم إنشاء السؤال بنجاح' : 'Question created successfully');
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error(isArabic ? 'فشل في إنشاء السؤال' : 'Failed to create question');
    }
  };

  // Handle update
  const handleUpdate = async (
    questionId: string,
    data: PracticeQuestionUpdate
  ) => {
    try {
      await updateQuestion.mutateAsync({ questionId, updates: data });
      toast.success(isArabic ? 'تم تحديث السؤال بنجاح' : 'Question updated successfully');
      setEditingQuestion(null);
    } catch (error) {
      toast.error(isArabic ? 'فشل في تحديث السؤال' : 'Failed to update question');
    }
  };

  // Handle delete
  const handleDelete = async (questionId: string) => {
    try {
      await deleteQuestion.mutateAsync({ questionId, questionSetId: setId! });
      toast.success(isArabic ? 'تم حذف السؤال بنجاح' : 'Question deleted successfully');
      setDeleteConfirmQuestion(null);
    } catch (error) {
      toast.error(isArabic ? 'فشل في حذف السؤال' : 'Failed to delete question');
    }
  };

  // Handle toggle publish
  const handleTogglePublish = async (question: PracticeQuestion) => {
    try {
      await updateQuestion.mutateAsync({
        questionId: question.id,
        updates: { is_published: !question.is_published },
      });
      toast.success(
        question.is_published
          ? (isArabic ? 'تم إلغاء نشر السؤال' : 'Question unpublished')
          : (isArabic ? 'تم نشر السؤال' : 'Question published')
      );
    } catch (error) {
      toast.error(isArabic ? 'فشل في تحديث حالة النشر' : 'Failed to update publish status');
    }
  };

  if (isLoadingSet || isLoadingQuestions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Language-specific labels
  const labels = {
    backToQuestionBank: isArabic ? 'العودة إلى بنك الأسئلة' : 'Back to Question Bank',
    questions: isArabic ? 'أسئلة' : 'questions',
    passingScore: isArabic ? 'درجة النجاح' : 'Passing score',
    importQuestions: isArabic ? 'استيراد الأسئلة' : 'Import Questions',
    addQuestion: isArabic ? 'إضافة سؤال' : 'Add Question',
    searchQuestions: isArabic ? 'البحث في الأسئلة...' : 'Search questions...',
    allDifficulties: isArabic ? 'جميع المستويات' : 'All Difficulties',
    easy: isArabic ? 'سهل' : 'Easy',
    medium: isArabic ? 'متوسط' : 'Medium',
    hard: isArabic ? 'صعب' : 'Hard',
    noQuestionsFound: isArabic ? 'لم يتم العثور على أسئلة' : 'No questions found',
    addFirstQuestion: isArabic ? 'إضافة أول سؤال' : 'Add First Question',
    createQuestion: isArabic ? 'إنشاء سؤال' : 'Create Question',
    editQuestion: isArabic ? 'تعديل السؤال' : 'Edit Question',
    deleteQuestion: isArabic ? 'حذف السؤال' : 'Delete Question',
    deleteConfirmation: isArabic
      ? 'هل أنت متأكد من حذف هذا السؤال؟ لا يمكن التراجع عن هذا الإجراء.'
      : 'Are you sure you want to delete this question? This action cannot be undone.',
    cancel: isArabic ? 'إلغاء' : 'Cancel',
    delete: isArabic ? 'حذف' : 'Delete',
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/question-bank')}
            className="mb-2"
          >
            <ArrowLeft className={`w-4 h-4 ${isArabic ? 'ml-2 rotate-180' : 'mr-2'}`} />
            {labels.backToQuestionBank}
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              {isArabic ? (questionSet?.title_ar || questionSet?.title) : questionSet?.title}
            </h1>
            <span className={`text-sm px-2 py-1 rounded ${isArabic ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              {isArabic ? '🇸🇦 Arabic' : '🇬🇧 English'}
            </span>
          </div>
          <p className="text-gray-600 mt-1">
            {questions?.length || 0} {labels.questions} • {labels.passingScore}:{' '}
            {questionSet?.passing_score}%
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Upload className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
            {labels.importQuestions}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
            {labels.addQuestion}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className={`absolute ${isArabic ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
              <Input
                placeholder={labels.searchQuestions}
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

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions?.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index + 1}
            examLanguage={examLanguage}
            onEdit={() => setEditingQuestion(question)}
            onDelete={() => setDeleteConfirmQuestion(question)}
            onTogglePublish={() => handleTogglePublish(question)}
          />
        ))}

        {filteredQuestions?.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{labels.noQuestionsFound}</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
              {labels.addFirstQuestion}
            </Button>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <QuestionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={(data) => handleCreate({ ...data, question_set_id: setId! })}
        title={labels.createQuestion}
        nextOrderIndex={(questions?.length || 0) + 1}
        examLanguage={examLanguage}
      />

      {/* Edit Dialog */}
      <QuestionDialog
        open={!!editingQuestion}
        onOpenChange={(open) => !open && setEditingQuestion(null)}
        onSubmit={(data) =>
          editingQuestion && handleUpdate(editingQuestion.id, data)
        }
        title={labels.editQuestion}
        defaultValues={editingQuestion || undefined}
        examLanguage={examLanguage}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirmQuestion}
        onOpenChange={(open) => !open && setDeleteConfirmQuestion(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.deleteQuestion}</DialogTitle>
            <DialogDescription>
              {labels.deleteConfirmation}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmQuestion(null)}
            >
              {labels.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmQuestion && handleDelete(deleteConfirmQuestion.id)
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

/**
 * Safely parse options - handles both proper arrays and double-encoded strings
 */
function safeParseOptions(options: QuestionOption[] | string | null | undefined): QuestionOption[] {
  if (!options) return [];
  if (Array.isArray(options)) return options;
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Question Card Component
interface QuestionCardProps {
  question: PracticeQuestion;
  index: number;
  examLanguage: ExamLanguage;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
}

function QuestionCard({
  question,
  index,
  examLanguage,
  onEdit,
  onDelete,
  onTogglePublish,
}: QuestionCardProps) {
  const options: QuestionOption[] = safeParseOptions(question.options);
  const isArabic = examLanguage === 'ar';

  // Get the appropriate text based on language
  const questionText = isArabic
    ? (question.question_text_ar || question.question_text)
    : question.question_text;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="flex items-center gap-2 text-gray-400">
            <GripVertical className="w-4 h-4" />
            <span className="font-mono text-sm">#{index}</span>
          </div>
          <div className="flex-1">
            <p className="text-gray-900 font-medium">{questionText}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              question.difficulty_level === 'easy'
                ? 'bg-green-100 text-green-700'
                : question.difficulty_level === 'hard'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {isArabic
              ? (question.difficulty_level === 'easy' ? 'سهل' : question.difficulty_level === 'hard' ? 'صعب' : 'متوسط')
              : question.difficulty_level}
          </span>
          <button
            onClick={onTogglePublish}
            className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
              question.is_published
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {question.is_published ? (
              <Eye className="w-3 h-3" />
            ) : (
              <EyeOff className="w-3 h-3" />
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                {isArabic ? 'تعديل' : 'Edit'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                {isArabic ? 'حذف' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Options */}
      <div className={`grid grid-cols-2 gap-2 ${isArabic ? 'mr-12' : 'ml-12'}`}>
        {options.map((option) => {
          // Get the appropriate option text based on language
          const optionText = isArabic ? (option.text_ar || option.text) : option.text;
          return (
            <div
              key={option.id}
              className={`flex items-center gap-2 p-2 rounded ${
                option.id === question.correct_option_id
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-gray-50'
              }`}
            >
              <span className="font-semibold text-gray-600 uppercase text-sm">
                {option.id}.
              </span>
              <span className="text-sm text-gray-700">{optionText}</span>
              {option.id === question.correct_option_id && (
                <Check className={`w-4 h-4 text-green-600 ${isArabic ? 'mr-auto' : 'ml-auto'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      {(isArabic ? (question.explanation_ar || question.explanation) : question.explanation) && (
        <div className={`mt-4 ${isArabic ? 'mr-12' : 'ml-12'} p-3 bg-blue-50 rounded-lg`}>
          <p className="text-sm text-blue-800">
            <strong>{isArabic ? 'الشرح:' : 'Explanation:'}</strong>{' '}
            {isArabic ? (question.explanation_ar || question.explanation) : question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

// Question Dialog Component
interface QuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PracticeQuestionInsert | PracticeQuestionUpdate) => void;
  title: string;
  defaultValues?: Partial<PracticeQuestion>;
  nextOrderIndex?: number;
  examLanguage: ExamLanguage;
}

function QuestionDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  defaultValues,
  nextOrderIndex = 1,
  examLanguage,
}: QuestionDialogProps) {
  const isArabic = examLanguage === 'ar';

  // For Arabic questions, we use the _ar fields as primary
  // For English questions, we use the standard fields
  const getDefaultQuestionText = () => {
    if (isArabic) {
      return defaultValues?.question_text_ar || defaultValues?.question_text || '';
    }
    return defaultValues?.question_text || '';
  };

  const getDefaultExplanation = () => {
    if (isArabic) {
      return defaultValues?.explanation_ar || defaultValues?.explanation || '';
    }
    return defaultValues?.explanation || '';
  };

  const getDefaultOptions = (): QuestionOption[] => {
    const parsedOptions = safeParseOptions(defaultValues?.options);
    if (parsedOptions.length > 0) {
      // For Arabic, use text_ar if available
      if (isArabic) {
        return parsedOptions.map(opt => ({
          ...opt,
          text: opt.text_ar || opt.text,
        }));
      }
      return parsedOptions;
    }
    return [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ];
  };

  const [formData, setFormData] = useState<{
    question_text: string;
    question_type: string;
    options: QuestionOption[];
    correct_option_id: string;
    explanation: string;
    difficulty_level: string;
    order_index: number;
    tags: string[];
    points: number;
    is_published: boolean;
  }>({
    question_text: getDefaultQuestionText(),
    question_type: defaultValues?.question_type || 'multiple_choice',
    options: getDefaultOptions(),
    correct_option_id: defaultValues?.correct_option_id || 'a',
    explanation: getDefaultExplanation(),
    difficulty_level: defaultValues?.difficulty_level || 'medium',
    order_index: defaultValues?.order_index || nextOrderIndex,
    tags: defaultValues?.tags || [],
    points: defaultValues?.points || 1,
    is_published: defaultValues?.is_published ?? true,
  });

  // Reset form when dialog opens with new values
  useEffect(() => {
    if (open) {
      setFormData({
        question_text: getDefaultQuestionText(),
        question_type: defaultValues?.question_type || 'multiple_choice',
        options: getDefaultOptions(),
        correct_option_id: defaultValues?.correct_option_id || 'a',
        explanation: getDefaultExplanation(),
        difficulty_level: defaultValues?.difficulty_level || 'medium',
        order_index: defaultValues?.order_index || nextOrderIndex,
        tags: defaultValues?.tags || [],
        points: defaultValues?.points || 1,
        is_published: defaultValues?.is_published ?? true,
      });
    }
  }, [open, defaultValues, nextOrderIndex, isArabic]);

  const updateOption = (index: number, text: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], text };
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = () => {
    if (!formData.question_text) {
      toast.error(isArabic ? 'نص السؤال مطلوب' : 'Question text is required');
      return;
    }
    if (!formData.options.every((opt) => opt.text)) {
      toast.error(isArabic ? 'جميع الخيارات يجب أن تحتوي على نص' : 'All options must have text');
      return;
    }

    // Build the data based on language
    // For Arabic: store in _ar fields, keep English fields empty/null
    // For English: store in standard fields, keep _ar fields empty/null
    const submitData: PracticeQuestionInsert = {
      question_text: isArabic ? formData.question_text : formData.question_text,
      question_text_ar: isArabic ? formData.question_text : null,
      question_type: formData.question_type as any,
      options: formData.options.map(opt => ({
        id: opt.id,
        text: isArabic ? opt.text : opt.text,
        text_ar: isArabic ? opt.text : undefined,
      })),
      correct_option_id: formData.correct_option_id,
      explanation: isArabic ? null : formData.explanation,
      explanation_ar: isArabic ? formData.explanation : null,
      difficulty_level: formData.difficulty_level as any,
      order_index: formData.order_index,
      tags: formData.tags,
      points: formData.points,
      is_published: formData.is_published,
    };

    onSubmit(submitData);
  };

  // Language-specific labels
  const labels = {
    questionText: isArabic ? 'نص السؤال *' : 'Question Text *',
    questionTextPlaceholder: isArabic ? 'أدخل نص السؤال' : 'Enter question text',
    answerOptions: isArabic ? 'خيارات الإجابة *' : 'Answer Options *',
    optionPlaceholder: (id: string) => isArabic ? `الخيار ${id.toUpperCase()}` : `Option ${id.toUpperCase()}`,
    clickToMark: isArabic ? 'انقر على الحرف لتحديده كإجابة صحيحة' : 'Click the letter to mark as correct answer',
    explanation: isArabic ? 'الشرح (يظهر بعد الإجابة)' : 'Explanation (shown after answering)',
    explanationPlaceholder: isArabic ? 'اشرح لماذا الإجابة الصحيحة صحيحة' : 'Explain why the correct answer is correct',
    difficulty: isArabic ? 'المستوى' : 'Difficulty',
    easy: isArabic ? 'سهل' : 'Easy',
    medium: isArabic ? 'متوسط' : 'Medium',
    hard: isArabic ? 'صعب' : 'Hard',
    points: isArabic ? 'النقاط' : 'Points',
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
          {/* Question Text - Single field for the selected language */}
          <div>
            <Label>{labels.questionText}</Label>
            <Textarea
              value={formData.question_text}
              onChange={(e) =>
                setFormData({ ...formData, question_text: e.target.value })
              }
              placeholder={labels.questionTextPlaceholder}
              rows={3}
              dir={isArabic ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Options - Single language */}
          <div>
            <Label>{labels.answerOptions}</Label>
            <div className="space-y-2 mt-2">
              {formData.options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, correct_option_id: option.id })
                    }
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      formData.correct_option_id === option.id
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {option.id.toUpperCase()}
                  </button>
                  <Input
                    value={option.text}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={labels.optionPlaceholder(option.id)}
                    className="flex-1"
                    dir={isArabic ? 'rtl' : 'ltr'}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {labels.clickToMark}
            </p>
          </div>

          {/* Explanation - Single language */}
          <div>
            <Label>{labels.explanation}</Label>
            <Textarea
              value={formData.explanation}
              onChange={(e) =>
                setFormData({ ...formData, explanation: e.target.value })
              }
              placeholder={labels.explanationPlaceholder}
              rows={2}
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
                  setFormData({ ...formData, difficulty_level: value })
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
              <Label>{labels.points}</Label>
              <Input
                type="number"
                value={formData.points}
                onChange={(e) =>
                  setFormData({ ...formData, points: parseInt(e.target.value) })
                }
              />
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
          </div>

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
