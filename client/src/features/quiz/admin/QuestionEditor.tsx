import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import {
  Save,
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import {
  useCreateQuestion,
  useUpdateQuestion,
  type CreateQuestionDTO,
  type CreateAnswerDTO,
  type QuestionType,
  type DifficultyLevel,
  QUIZ_DEFAULTS,
} from '@/entities/quiz';
import { cn } from '@/shared/utils/cn';
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  BOCK_DOMAINS_CP,
  BOCK_DOMAINS_SCP,
  getBockDomains,
  QUIZ_MESSAGES,
  QUIZ_MESSAGES_AR,
} from '@/shared/constants/quiz.constants';

/**
 * QuestionEditor Component
 *
 * Form for creating and editing quiz questions with dynamic answers
 */

interface AnswerFormData {
  answer_text: string;
  answer_text_ar: string;
  is_correct: boolean;
  explanation: string;
  explanation_ar: string;
  showExplanation: boolean; // UI state
}

interface FormData {
  question_text: string;
  question_text_ar: string;
  question_type: QuestionType;
  bock_domain: string;
  difficulty: DifficultyLevel;
  points: number;
  answers: AnswerFormData[];
}

export interface QuestionEditorProps {
  /**
   * Quiz ID (required)
   */
  quizId: string;

  /**
   * Question data for edit mode (optional)
   */
  question?: {
    id: string;
    question_text: string;
    question_text_ar?: string;
    question_type: QuestionType;
    bock_domain?: string;
    difficulty: DifficultyLevel;
    points: number;
    answers: {
      id: string;
      answer_text: string;
      answer_text_ar?: string;
      is_correct: boolean;
      explanation?: string;
      explanation_ar?: string;
    }[];
  };

  /**
   * Callback when question is saved
   */
  onSuccess?: () => void;

  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;

  /**
   * Show in Arabic
   */
  isArabic?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const TEXT_LIMITS = {
  MIN_QUESTION: 5,
  MAX_QUESTION: 500,
  MIN_ANSWER: 1,
  MAX_ANSWER: 200,
  MAX_EXPLANATION: 500,
  MIN_ANSWERS: 2,
  MAX_ANSWERS: 10,
} as const;

export const QuestionEditor = ({
  quizId,
  question,
  onSuccess,
  onCancel,
  isArabic = false,
  className,
}: QuestionEditorProps) => {
  const isEditMode = Boolean(question);

  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();

  const [showSuccess, setShowSuccess] = useState(false);

  const messages = isArabic ? QUIZ_MESSAGES_AR : QUIZ_MESSAGES;

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: isEditMode && question
      ? {
          question_text: question.question_text,
          question_text_ar: question.question_text_ar || '',
          question_type: question.question_type,
          bock_domain: question.bock_domain || '',
          difficulty: question.difficulty,
          points: question.points,
          answers: question.answers.map((a) => ({
            answer_text: a.answer_text,
            answer_text_ar: a.answer_text_ar || '',
            is_correct: a.is_correct,
            explanation: a.explanation || '',
            explanation_ar: a.explanation_ar || '',
            showExplanation: Boolean(a.explanation || a.explanation_ar),
          })),
        }
      : {
          question_text: '',
          question_text_ar: '',
          question_type: 'multiple_choice',
          bock_domain: '',
          difficulty: 'medium',
          points: QUIZ_DEFAULTS.DEFAULT_POINTS,
          answers: [
            {
              answer_text: '',
              answer_text_ar: '',
              is_correct: false,
              explanation: '',
              explanation_ar: '',
              showExplanation: false,
            },
            {
              answer_text: '',
              answer_text_ar: '',
              is_correct: false,
              explanation: '',
              explanation_ar: '',
              showExplanation: false,
            },
          ],
        },
  });

  // Dynamic answers array
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'answers',
  });

  // Watch fields
  const questionText = watch('question_text') || '';
  const questionType = watch('question_type');
  const answers = watch('answers');

  // Handle question type change
  const handleQuestionTypeChange = (type: QuestionType) => {
    setValue('question_type', type);

    // For true_false, ensure exactly 2 answers
    if (type === 'true_false' && answers.length !== 2) {
      // Reset to 2 answers (True/False)
      setValue('answers', [
        {
          answer_text: 'True',
          answer_text_ar: 'صحيح',
          is_correct: false,
          explanation: '',
          explanation_ar: '',
          showExplanation: false,
        },
        {
          answer_text: 'False',
          answer_text_ar: 'خطأ',
          is_correct: false,
          explanation: '',
          explanation_ar: '',
          showExplanation: false,
        },
      ]);
    }
  };

  // Handle correct answer toggle
  // For multiple_choice and true_false: only one correct answer (radio behavior)
  // For multi_select: multiple correct answers allowed (checkbox behavior)
  const handleCorrectToggle = (index: number) => {
    if (questionType === 'multiple_choice' || questionType === 'true_false') {
      // Uncheck all others, set only the clicked one as correct (radio button behavior)
      const newAnswers = answers.map((ans, i) => ({
        ...ans,
        is_correct: i === index,
      }));
      setValue('answers', newAnswers);
    } else {
      // Toggle current (checkbox behavior for multi_select)
      setValue(`answers.${index}.is_correct`, !answers[index].is_correct);
    }
  };

  // Add answer
  const handleAddAnswer = () => {
    if (fields.length >= TEXT_LIMITS.MAX_ANSWERS) return;

    append({
      answer_text: '',
      answer_text_ar: '',
      is_correct: false,
      explanation: '',
      explanation_ar: '',
      showExplanation: false,
    });
  };

  // Remove answer
  const handleRemoveAnswer = (index: number) => {
    if (fields.length <= TEXT_LIMITS.MIN_ANSWERS) return;
    remove(index);
  };

  // Move answer up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    move(index, index - 1);
  };

  // Move answer down
  const handleMoveDown = (index: number) => {
    if (index === fields.length - 1) return;
    move(index, index + 1);
  };

  // Toggle explanation visibility
  const handleToggleExplanation = (index: number) => {
    setValue(`answers.${index}.showExplanation`, !answers[index].showExplanation);
  };

  // Validate answers
  const validateAnswers = (): string | true => {
    const correctCount = answers.filter((a) => a.is_correct).length;

    if (questionType === 'multiple_choice' && correctCount !== 1) {
      return isArabic
        ? 'يجب تحديد إجابة صحيحة واحدة فقط'
        : 'Exactly one correct answer is required for multiple choice';
    }

    if (questionType === 'true_false') {
      if (answers.length !== 2) {
        return isArabic
          ? 'يجب أن يكون هناك إجابتان فقط (صحيح/خطأ)'
          : 'True/False questions must have exactly 2 answers';
      }
      if (correctCount !== 1) {
        return isArabic
          ? 'يجب تحديد إجابة صحيحة واحدة'
          : 'Exactly one correct answer is required';
      }
    }

    if (questionType === 'multi_select' && correctCount < 1) {
      return isArabic
        ? 'يجب تحديد إجابة صحيحة واحدة على الأقل'
        : 'At least one correct answer is required';
    }

    // Check if all answers have text
    const emptyAnswers = answers.filter((a) => !a.answer_text.trim());
    if (emptyAnswers.length > 0) {
      return isArabic ? 'جميع الإجابات يجب أن تحتوي على نص' : 'All answers must have text';
    }

    return true;
  };

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    // Validate answers
    const answersValid = validateAnswers();
    if (answersValid !== true) {
      alert(answersValid);
      return;
    }

    try {
      const answersDTO: CreateAnswerDTO[] = data.answers.map((ans, index) => ({
        answer_text: ans.answer_text.trim(),
        answer_text_ar: ans.answer_text_ar.trim() || undefined,
        is_correct: ans.is_correct,
        explanation: ans.explanation.trim() || undefined,
        explanation_ar: ans.explanation_ar.trim() || undefined,
        order_index: index,
      }));

      if (isEditMode && question) {
        // Update question
        await updateQuestion.mutateAsync({
          id: question.id,
          dto: {
            question_text: data.question_text.trim(),
            question_text_ar: data.question_text_ar.trim() || undefined,
            question_type: data.question_type,
            bock_domain: data.bock_domain || undefined,
            difficulty: data.difficulty,
            points: data.points,
          },
        });
      } else {
        // Create question
        const dto: CreateQuestionDTO = {
          quiz_id: quizId,
          question_text: data.question_text.trim(),
          question_text_ar: data.question_text_ar.trim() || undefined,
          question_type: data.question_type,
          bock_domain: data.bock_domain || undefined,
          difficulty: data.difficulty,
          points: data.points,
          order_index: 0, // Will be calculated on server
          answers: answersDTO,
        };

        await createQuestion.mutateAsync(dto);
      }

      // Show success
      setShowSuccess(true);

      // Callback after delay
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.();
      }, 1500);
    } catch (error) {
      console.error('Error saving question:', error);
    }
  };

  const isSaving = createQuestion.isPending || updateQuestion.isPending;
  const hasError = createQuestion.isError || updateQuestion.isError;

  const canAddAnswer = fields.length < TEXT_LIMITS.MAX_ANSWERS && questionType !== 'true_false';
  const canRemoveAnswer = fields.length > TEXT_LIMITS.MIN_ANSWERS && questionType !== 'true_false';

  return (
    <div className={cn('space-y-6', className)}>
      {/* Success Message */}
      {showSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-green-900">
                {isEditMode ? messages.SUCCESS.QUESTION_UPDATED : messages.SUCCESS.QUESTION_CREATED}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {hasError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900">
                {isArabic ? 'فشل حفظ السؤال' : 'Failed to save question'}
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {createQuestion.error instanceof Error
                  ? createQuestion.error.message
                  : updateQuestion.error instanceof Error
                  ? updateQuestion.error.message
                  : messages.ERROR.NETWORK_ERROR}
              </p>
            </div>
            <button
              onClick={() => {
                createQuestion.reset();
                updateQuestion.reset();
              }}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Question Section */}
        <div className="rounded-lg border bg-white p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-3">
            {isArabic ? 'السؤال' : 'Question'}
          </h3>

          {/* Question Text (English) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {isArabic ? 'نص السؤال (إنجليزي)' : 'Question Text (English)'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('question_text', {
                required: isArabic ? 'نص السؤال مطلوب' : 'Question text is required',
                minLength: {
                  value: TEXT_LIMITS.MIN_QUESTION,
                  message: isArabic
                    ? `الحد الأدنى ${TEXT_LIMITS.MIN_QUESTION} أحرف`
                    : `Minimum ${TEXT_LIMITS.MIN_QUESTION} characters`,
                },
                maxLength: {
                  value: TEXT_LIMITS.MAX_QUESTION,
                  message: isArabic
                    ? `الحد الأقصى ${TEXT_LIMITS.MAX_QUESTION} حرف`
                    : `Maximum ${TEXT_LIMITS.MAX_QUESTION} characters`,
                },
              })}
              rows={3}
              placeholder={isArabic ? 'أدخل نص السؤال...' : 'Enter question text...'}
              className={cn(
                'w-full rounded-lg border px-4 py-2.5 text-gray-900 transition-colors resize-none',
                'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                {
                  'border-red-300 bg-red-50': errors.question_text,
                  'border-gray-300 bg-white': !errors.question_text,
                }
              )}
            />
            <div className="flex items-center justify-between text-xs">
              {errors.question_text && (
                <p className="text-red-600">{errors.question_text.message}</p>
              )}
              <p
                className={cn('ml-auto text-gray-500', {
                  'text-red-600': questionText.length > TEXT_LIMITS.MAX_QUESTION,
                })}
              >
                {questionText.length} / {TEXT_LIMITS.MAX_QUESTION}
              </p>
            </div>
          </div>

          {/* Question Text (Arabic) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {isArabic ? 'نص السؤال (عربي)' : 'Question Text (Arabic)'}
            </label>
            <textarea
              {...register('question_text_ar', {
                maxLength: {
                  value: TEXT_LIMITS.MAX_QUESTION,
                  message: isArabic
                    ? `الحد الأقصى ${TEXT_LIMITS.MAX_QUESTION} حرف`
                    : `Maximum ${TEXT_LIMITS.MAX_QUESTION} characters`,
                },
              })}
              rows={3}
              placeholder={isArabic ? 'أدخل النص بالعربية...' : 'Enter Arabic text...'}
              className={cn(
                'w-full rounded-lg border px-4 py-2.5 text-gray-900 transition-colors resize-none',
                'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                {
                  'border-red-300 bg-red-50': errors.question_text_ar,
                  'border-gray-300 bg-white': !errors.question_text_ar,
                }
              )}
              dir="rtl"
            />
          </div>

          {/* Question Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {isArabic ? 'نوع السؤال' : 'Question Type'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['multiple_choice', 'true_false', 'multi_select'] as QuestionType[]).map(
                (type) => (
                  <label
                    key={type}
                    className={cn(
                      'cursor-pointer rounded-lg border-2 p-3 text-center transition-all',
                      'hover:border-blue-500',
                      {
                        'border-blue-500 bg-blue-50': questionType === type,
                        'border-gray-300 bg-white': questionType !== type,
                      }
                    )}
                  >
                    <input
                      type="radio"
                      value={type}
                      checked={questionType === type}
                      onChange={() => handleQuestionTypeChange(type)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {QUESTION_TYPE_LABELS[type]}
                    </span>
                  </label>
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* BoCK Domain */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {isArabic ? 'مجال BoCK' : 'BoCK Domain'}
              </label>
              <select
                {...register('bock_domain')}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">{isArabic ? 'بدون' : 'None'}</option>
                {BOCK_DOMAINS_SCP.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {isArabic ? 'الصعوبة' : 'Difficulty'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <select
                {...register('difficulty')}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((level) => (
                  <option key={level} value={level}>
                    {DIFFICULTY_LABELS[level]}
                  </option>
                ))}
              </select>
            </div>

            {/* Points */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {isArabic ? 'النقاط' : 'Points'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register('points', {
                  required: true,
                  min: 1,
                  valueAsNumber: true,
                })}
                placeholder="1"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Answers Section */}
        <div className="rounded-lg border bg-white p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {isArabic ? 'الإجابات' : 'Answers'}{' '}
              <span className="text-sm font-normal text-gray-600">
                ({fields.length}/{TEXT_LIMITS.MAX_ANSWERS})
              </span>
            </h3>
            <button
              type="button"
              onClick={handleAddAnswer}
              disabled={!canAddAnswer}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              {isArabic ? 'إضافة إجابة' : 'Add Answer'}
            </button>
          </div>

          {/* Answers List */}
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3"
              >
                {/* Answer Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                      {index + 1}
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      {/* Use radio buttons for single-answer types, checkboxes for multi-select */}
                      {(questionType === 'multiple_choice' || questionType === 'true_false') ? (
                        <input
                          type="radio"
                          name="correct_answer"
                          checked={answers[index]?.is_correct || false}
                          onChange={() => handleCorrectToggle(index)}
                          className="h-4 w-4 border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={answers[index]?.is_correct || false}
                          onChange={() => handleCorrectToggle(index)}
                          className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {isArabic ? 'إجابة صحيحة' : 'Correct Answer'}
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Move Up */}
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || questionType === 'true_false'}
                      className="rounded p-1 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={isArabic ? 'تحريك لأعلى' : 'Move up'}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === fields.length - 1 || questionType === 'true_false'}
                      className="rounded p-1 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={isArabic ? 'تحريك لأسفل' : 'Move down'}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>

                    {/* Toggle Explanation */}
                    <button
                      type="button"
                      onClick={() => handleToggleExplanation(index)}
                      className={cn(
                        'rounded p-1 transition-colors',
                        answers[index]?.showExplanation
                          ? 'text-blue-600 bg-blue-100'
                          : 'text-gray-600 hover:bg-gray-200'
                      )}
                      title={isArabic ? 'شرح' : 'Explanation'}
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => handleRemoveAnswer(index)}
                      disabled={!canRemoveAnswer}
                      className="rounded p-1 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={isArabic ? 'حذف' : 'Remove'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Answer Text (English) */}
                <div className="space-y-1">
                  <input
                    type="text"
                    {...register(`answers.${index}.answer_text`, {
                      required: true,
                      minLength: TEXT_LIMITS.MIN_ANSWER,
                      maxLength: TEXT_LIMITS.MAX_ANSWER,
                    })}
                    placeholder={isArabic ? 'نص الإجابة...' : 'Answer text...'}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-xs text-gray-500 text-right">
                    {answers[index]?.answer_text?.length || 0} / {TEXT_LIMITS.MAX_ANSWER}
                  </p>
                </div>

                {/* Answer Text (Arabic) */}
                <input
                  type="text"
                  {...register(`answers.${index}.answer_text_ar`, {
                    maxLength: TEXT_LIMITS.MAX_ANSWER,
                  })}
                  placeholder={isArabic ? 'النص بالعربية...' : 'Arabic text...'}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  dir="rtl"
                />

                {/* Explanation (collapsible) */}
                {answers[index]?.showExplanation && (
                  <div className="space-y-2 pt-2 border-t">
                    <label className="text-xs font-medium text-gray-700">
                      {isArabic ? 'الشرح (إنجليزي)' : 'Explanation (English)'}
                    </label>
                    <textarea
                      {...register(`answers.${index}.explanation`, {
                        maxLength: TEXT_LIMITS.MAX_EXPLANATION,
                      })}
                      rows={2}
                      placeholder={
                        isArabic ? 'شرح لماذا هذه الإجابة...' : 'Explain why this answer...'
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 resize-none focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <p className="text-xs text-gray-500 text-right">
                      {answers[index]?.explanation?.length || 0} /{' '}
                      {TEXT_LIMITS.MAX_EXPLANATION}
                    </p>

                    <label className="text-xs font-medium text-gray-700">
                      {isArabic ? 'الشرح (عربي)' : 'Explanation (Arabic)'}
                    </label>
                    <textarea
                      {...register(`answers.${index}.explanation_ar`, {
                        maxLength: TEXT_LIMITS.MAX_EXPLANATION,
                      })}
                      rows={2}
                      placeholder={isArabic ? 'الشرح بالعربية...' : 'Arabic explanation...'}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 resize-none focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      dir="rtl"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Validation hint */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
            {questionType === 'multiple_choice' && (
              <p>{isArabic ? '✓ اختر إجابة صحيحة واحدة فقط' : '✓ Select exactly one correct answer'}</p>
            )}
            {questionType === 'true_false' && (
              <p>{isArabic ? '✓ يجب أن يكون هناك إجابتان فقط' : '✓ Must have exactly 2 answers (True/False)'}</p>
            )}
            {questionType === 'multi_select' && (
              <p>{isArabic ? '✓ اختر إجابة صحيحة واحدة أو أكثر' : '✓ Select one or more correct answers'}</p>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isArabic ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isArabic ? 'حفظ السؤال' : 'Save Question'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

QuestionEditor.displayName = 'QuestionEditor';
