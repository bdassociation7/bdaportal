import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle2,
  Circle,
  GraduationCap,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  useExamAdmin,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useCreateAnswer,
  useUpdateAnswer,
  useDeleteAnswer,
} from '@/entities/mock-exam';
import type {
  CreateQuestionDTO,
  CreateAnswerDTO,
  ExamQuestionType,
  QuestionWithAnswers,
} from '@/entities/mock-exam/mock-exam.types';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { cn } from '@/shared/utils/cn';

/**
 * ExamQuestionManager Page
 * Manage questions and answers for an exam
 */

export default function ExamQuestionManager() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // Data fetching
  const { data: exam, isLoading } = useExamAdmin(examId || '');

  // Mutations
  const createQuestionMutation = useCreateQuestion();
  const updateQuestionMutation = useUpdateQuestion();
  const deleteQuestionMutation = useDeleteQuestion();
  const createAnswerMutation = useCreateAnswer();
  const updateAnswerMutation = useUpdateAnswer();
  const deleteAnswerMutation = useDeleteAnswer();

  // State for adding/editing question
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState<{
    question_text: string;
    question_text_ar: string;
    explanation: string;
    explanation_ar: string;
    question_type: ExamQuestionType;
    points: number;
    answers: Array<CreateAnswerDTO & { tempId: string }>;
  }>({
    question_text: '',
    question_text_ar: '',
    explanation: '',
    explanation_ar: '',
    question_type: 'single_choice',
    points: 1,
    answers: [],
  });

  const questions = exam?.questions || [];
  const examLanguage = exam?.language || 'en'; // Exam's language determines question/answer language

  // Handlers
  const handleAddQuestion = () => {
    setIsAddingQuestion(true);
    setEditingQuestionId(null);
    setQuestionForm({
      question_text: '',
      question_text_ar: '',
      explanation: '',
      explanation_ar: '',
      question_type: 'single_choice',
      points: 1,
      answers: [
        { tempId: '1', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 0 },
        { tempId: '2', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 1 },
        { tempId: '3', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 2 },
        { tempId: '4', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 3 },
      ],
    });
  };

  const handleEditQuestion = (question: QuestionWithAnswers) => {
    setIsAddingQuestion(false);
    setEditingQuestionId(question.id);
    setQuestionForm({
      question_text: question.question_text,
      question_text_ar: question.question_text_ar || '',
      explanation: question.explanation || '',
      explanation_ar: question.explanation_ar || '',
      question_type: question.question_type,
      points: question.points,
      answers: question.answers.map((a, idx) => ({
        tempId: a.id,
        answer_text: a.answer_text,
        answer_text_ar: a.answer_text_ar || '',
        is_correct: a.is_correct,
        order_index: a.order_index,
      })),
    });
  };

  const handleCancelEdit = () => {
    setIsAddingQuestion(false);
    setEditingQuestionId(null);
  };

  const handleSaveQuestion = async () => {
    // Validation - check based on exam language
    const questionText = examLanguage === 'ar' ? questionForm.question_text_ar : questionForm.question_text;
    if (!questionText.trim()) {
      toast({
        title: 'Validation Error',
        description: examLanguage === 'ar' ? 'نص السؤال مطلوب' : 'Question text is required',
        variant: 'destructive',
      });
      return;
    }

    if (questionForm.answers.length < 2) {
      toast({
        title: 'Validation Error',
        description: examLanguage === 'ar' ? 'يجب إضافة إجابتين على الأقل' : 'At least 2 answers are required',
        variant: 'destructive',
      });
      return;
    }

    // Validate answer text based on exam language
    const hasEmptyAnswers = questionForm.answers.some((a) => {
      const answerText = examLanguage === 'ar' ? a.answer_text_ar : a.answer_text;
      return !answerText?.trim();
    });
    if (hasEmptyAnswers) {
      toast({
        title: 'Validation Error',
        description: examLanguage === 'ar' ? 'جميع الإجابات يجب أن تحتوي على نص' : 'All answers must have text',
        variant: 'destructive',
      });
      return;
    }

    const hasCorrectAnswer = questionForm.answers.some((a) => a.is_correct);
    if (!hasCorrectAnswer) {
      toast({
        title: 'Validation Error',
        description: 'At least one answer must be marked as correct',
        variant: 'destructive',
      });
      return;
    }

    if (questionForm.question_type === 'single_choice') {
      const correctCount = questionForm.answers.filter((a) => a.is_correct).length;
      if (correctCount !== 1) {
        toast({
          title: 'Validation Error',
          description: 'Single choice questions must have exactly one correct answer',
          variant: 'destructive',
        });
        return;
      }
    }

    if (questionForm.question_type === 'multiple_choice') {
      const correctCount = questionForm.answers.filter((a) => a.is_correct).length;
      if (correctCount < 1) {
        toast({
          title: 'Validation Error',
          description: 'Multiple choice questions must have at least one correct answer',
          variant: 'destructive',
        });
        return;
      }
      if (correctCount === questionForm.answers.length) {
        toast({
          title: 'Validation Error',
          description: 'Multiple choice questions cannot have all answers as correct (at least one must be incorrect)',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      if (isAddingQuestion) {
        // Create new question
        const dto: CreateQuestionDTO = {
          exam_id: examId!,
          question_text: questionForm.question_text,
          question_text_ar: questionForm.question_text_ar || undefined,
          explanation: questionForm.explanation || undefined,
          explanation_ar: questionForm.explanation_ar || undefined,
          question_type: questionForm.question_type,
          points: questionForm.points,
          order_index: questions.length,
          answers: questionForm.answers.map((a) => ({
            answer_text: a.answer_text,
            answer_text_ar: a.answer_text_ar || undefined,
            is_correct: a.is_correct,
            order_index: a.order_index,
          })),
        };

        const { error } = await createQuestionMutation.mutateAsync(dto);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Question created successfully',
        });
      } else {
        // Update existing question
        const { error: questionError } = await updateQuestionMutation.mutateAsync({
          id: editingQuestionId!,
          question_text: questionForm.question_text,
          question_text_ar: questionForm.question_text_ar || undefined,
          explanation: questionForm.explanation || undefined,
          explanation_ar: questionForm.explanation_ar || undefined,
          question_type: questionForm.question_type,
          points: questionForm.points,
        });

        if (questionError) throw questionError;

        // Update answers
        // tempId is the real answer ID when editing (UUID format)
        // tempId is a timestamp when it's a new answer
        for (const answer of questionForm.answers) {
          const isExistingAnswer = answer.tempId.includes('-'); // UUID has dashes

          if (isExistingAnswer) {
            // Update existing answer
            const { error: answerError } = await updateAnswerMutation.mutateAsync({
              dto: {
                id: answer.tempId,
                answer_text: answer.answer_text,
                answer_text_ar: answer.answer_text_ar || undefined,
                is_correct: answer.is_correct,
                order_index: answer.order_index,
              },
              examId: examId!,
            });

            if (answerError) {
              console.error('Error updating answer:', answerError);
              throw answerError;
            }
          } else {
            // Create new answer
            const { error: answerError } = await createAnswerMutation.mutateAsync({
              questionId: editingQuestionId!,
              dto: {
                answer_text: answer.answer_text,
                answer_text_ar: answer.answer_text_ar || undefined,
                is_correct: answer.is_correct,
                order_index: answer.order_index,
              },
              examId: examId!,
            });

            if (answerError) {
              console.error('Error creating answer:', answerError);
              throw answerError;
            }
          }
        }

        toast({
          title: 'Success',
          description: 'Question updated successfully',
        });
      }

      handleCancelEdit();
    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        title: 'Error',
        description: 'Failed to save question. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteQuestion = async (questionId: string, questionText: string) => {
    const confirmed = await confirm({
      title: 'Delete Question',
      description: `Are you sure you want to delete this question: "${questionText}"? This will also delete all associated answers.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      const { error } = await deleteQuestionMutation.mutateAsync({
        id: questionId,
        examId: examId!,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Question deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete question. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAddAnswer = () => {
    setQuestionForm((prev) => ({
      ...prev,
      answers: [
        ...prev.answers,
        {
          tempId: Date.now().toString(),
          answer_text: '',
          answer_text_ar: '',
          is_correct: false,
          order_index: prev.answers.length,
        },
      ],
    }));
  };

  const handleRemoveAnswer = (tempId: string) => {
    setQuestionForm((prev) => ({
      ...prev,
      answers: prev.answers.filter((a) => a.tempId !== tempId),
    }));
  };

  const handleUpdateAnswer = (tempId: string, field: keyof CreateAnswerDTO, value: any) => {
    setQuestionForm((prev) => ({
      ...prev,
      answers: prev.answers.map((a) =>
        a.tempId === tempId ? { ...a, [field]: value } : a
      ),
    }));
  };

  const handleToggleCorrect = (tempId: string) => {
    setQuestionForm((prev) => {
      const isSingleChoice = prev.question_type === 'single_choice';
      return {
        ...prev,
        answers: prev.answers.map((a) => {
          if (a.tempId === tempId) {
            return { ...a, is_correct: !a.is_correct };
          } else if (isSingleChoice) {
            // For single choice, uncheck other answers
            return { ...a, is_correct: false };
          }
          return a;
        }),
      };
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Exam not found</p>
          <Button onClick={() => navigate('/admin/exams')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/exams')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <GraduationCap className="h-8 w-8" />
                Question Manager
              </h1>
              <Badge
                variant="outline"
                className={examLanguage === 'ar'
                  ? 'border-emerald-300 text-emerald-100 bg-emerald-500/20'
                  : 'border-blue-300 text-blue-100 bg-blue-500/20'
                }
              >
                {examLanguage === 'ar' ? '🇸🇦 Arabic Exam' : '🇬🇧 English Exam'}
              </Badge>
            </div>
            <p className={`mt-2 opacity-90 ${examLanguage === 'ar' ? 'text-right' : ''}`} dir={examLanguage === 'ar' ? 'rtl' : 'ltr'}>
              {examLanguage === 'ar' && exam.title_ar ? exam.title_ar : exam.title}
            </p>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span>{questions.length} Questions</span>
              <span>•</span>
              <span>{exam.duration_minutes} minutes</span>
              <span>•</span>
              <span>Passing: {exam.passing_score}%</span>
            </div>
          </div>
          {!isAddingQuestion && !editingQuestionId && (
            <Button variant="secondary" size="sm" onClick={handleAddQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          )}
        </div>
      </div>

      {/* Question Form (Add/Edit) */}
      {(isAddingQuestion || editingQuestionId) && (
        <Card className="border-2 border-blue-500 shadow-lg">
          <CardHeader className="bg-blue-50 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                  {isAddingQuestion ? (
                    <Plus className="h-6 w-6 text-white" />
                  ) : (
                    <Edit className="h-6 w-6 text-white" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {isAddingQuestion ? 'Add New Question' : 'Edit Question'}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {isAddingQuestion
                      ? 'Create a new question for this mock exam'
                      : 'Modify the question details and answers'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 mt-6">
            {/* Language Indicator */}
            <div className={cn(
              "p-3 rounded-lg border-2 flex items-center gap-3",
              examLanguage === 'ar'
                ? "bg-emerald-50 border-emerald-200"
                : "bg-blue-50 border-blue-200"
            )}>
              <span className="text-2xl">{examLanguage === 'ar' ? '🇸🇦' : '🇬🇧'}</span>
              <div>
                <p className={cn(
                  "font-semibold",
                  examLanguage === 'ar' ? "text-emerald-800" : "text-blue-800"
                )}>
                  {examLanguage === 'ar' ? 'امتحان عربي' : 'English Exam'}
                </p>
                <p className="text-sm text-gray-600">
                  {examLanguage === 'ar'
                    ? 'جميع الأسئلة والإجابات بالعربية فقط'
                    : 'All questions and answers in English only'
                  }
                </p>
              </div>
            </div>

            {/* Question Text - Based on exam language */}
            {examLanguage === 'en' ? (
              <div className="space-y-2 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <Label className="text-blue-800 font-semibold">
                  Question Text <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={questionForm.question_text}
                  onChange={(e) =>
                    setQuestionForm((prev) => ({ ...prev, question_text: e.target.value }))
                  }
                  placeholder="Enter question text"
                  rows={3}
                  className="bg-white"
                />
              </div>
            ) : (
              <div className="space-y-2 p-4 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <Label className="text-emerald-800 font-semibold">
                  نص السؤال <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={questionForm.question_text_ar}
                  onChange={(e) =>
                    setQuestionForm((prev) => ({ ...prev, question_text_ar: e.target.value }))
                  }
                  placeholder="أدخل نص السؤال"
                  rows={3}
                  dir="rtl"
                  className="bg-white"
                />
              </div>
            )}

            {/* Answer Selection Type */}
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Answer Selection Type</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Single Answer Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionForm((prev) => {
                        // When switching to single answer mode, keep only first correct answer
                        const correctAnswers = prev.answers.filter(a => a.is_correct);

                        if (correctAnswers.length > 1) {
                          toast({
                            title: 'Answers Auto-Corrected',
                            description: 'Only the first correct answer was kept. Single answer questions can only have one correct answer.',
                          });
                        }

                        const updatedAnswers = prev.answers.map((answer) => ({
                          ...answer,
                          is_correct: correctAnswers.length > 1
                            ? answer.tempId === correctAnswers[0].tempId // Keep only first correct
                            : answer.is_correct, // Keep as is if 0 or 1 correct
                        }));

                        return {
                          ...prev,
                          question_type: 'single_choice',
                          answers: prev.answers.length < 2 ? [
                            { tempId: '1', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 0 },
                            { tempId: '2', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 1 },
                          ] : updatedAnswers,
                        };
                      });
                    }}
                    className={cn(
                      'p-4 border-2 rounded-lg text-left transition-all',
                      questionForm.question_type === 'single_choice'
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-300 bg-white hover:border-green-300'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full border-2 border-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {questionForm.question_type === 'single_choice' && (
                          <div className="h-2.5 w-2.5 rounded-full bg-green-600"></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Single Answer</h4>
                        <p className="text-sm text-gray-600 mt-1">Only ONE correct answer (Radio buttons)</p>
                      </div>
                    </div>
                  </button>

                  {/* Multiple Answers Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionForm((prev) => ({
                        ...prev,
                        question_type: 'multiple_choice',
                        answers: prev.answers.length < 2 ? [
                          { tempId: '1', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 0 },
                          { tempId: '2', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 1 },
                        ] : prev.answers,
                      }));
                    }}
                    className={cn(
                      'p-4 border-2 rounded-lg text-left transition-all',
                      questionForm.question_type === 'multiple_choice'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-300 bg-white hover:border-blue-300'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded border-2 border-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {questionForm.question_type === 'multiple_choice' && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Multiple Answers</h4>
                        <p className="text-sm text-gray-600 mt-1">MULTIPLE correct answers (Checkboxes)</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Points */}
            <div className="space-y-2">
              <Label>Points</Label>
              <Input
                type="number"
                min="1"
                value={questionForm.points}
                onChange={(e) =>
                  setQuestionForm((prev) => ({
                    ...prev,
                    points: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </div>

            {/* Answers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg">
                  Answers <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAnswer}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Answer
                </Button>
              </div>

              <p className="text-sm text-gray-600 mb-2">
                {questionForm.question_type === 'single_choice'
                  ? 'Select ONE correct answer using the radio button'
                  : 'Select MULTIPLE correct answers using the checkboxes'}
              </p>

              {/* Single Choice Questions - Use Radio Buttons */}
              {questionForm.question_type === 'single_choice' && (
                <RadioGroup
                  value={questionForm.answers.find(a => a.is_correct)?.tempId || ''}
                  onValueChange={(tempId) => handleToggleCorrect(tempId)}
                >
                  <div className="space-y-3">
                    {questionForm.answers.map((answer, index) => (
                      <div
                        key={answer.tempId}
                        className={cn(
                          'p-4 border-2 rounded-lg transition-all',
                          answer.is_correct
                            ? 'border-green-500 bg-green-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center pt-3">
                            <RadioGroupItem
                              value={answer.tempId}
                              id={`answer-${answer.tempId}`}
                            />
                          </div>
                          <div className="flex-1">
                            {examLanguage === 'en' ? (
                              <Input
                                value={answer.answer_text}
                                onChange={(e) =>
                                  handleUpdateAnswer(answer.tempId, 'answer_text', e.target.value)
                                }
                                placeholder={`Answer ${index + 1}`}
                              />
                            ) : (
                              <Input
                                value={answer.answer_text_ar}
                                onChange={(e) =>
                                  handleUpdateAnswer(answer.tempId, 'answer_text_ar', e.target.value)
                                }
                                placeholder={`الإجابة ${index + 1}`}
                                dir="rtl"
                              />
                            )}
                          </div>
                          {questionForm.answers.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAnswer(answer.tempId)}
                              className="mt-2"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}

              {/* Multiple Choice Questions - Use Checkboxes */}
              {questionForm.question_type === 'multiple_choice' && (
                <div className="space-y-3">
                  {questionForm.answers.map((answer, index) => (
                    <div
                      key={answer.tempId}
                      className={cn(
                        'p-4 border-2 rounded-lg transition-all',
                        answer.is_correct
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center pt-3">
                          <Checkbox
                            id={`answer-${answer.tempId}`}
                            checked={answer.is_correct}
                            onCheckedChange={(checked) => {
                              handleUpdateAnswer(answer.tempId, 'is_correct', checked === true);
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          {examLanguage === 'en' ? (
                            <Input
                              value={answer.answer_text}
                              onChange={(e) =>
                                handleUpdateAnswer(answer.tempId, 'answer_text', e.target.value)
                              }
                              placeholder={`Answer ${index + 1}`}
                            />
                          ) : (
                            <Input
                              value={answer.answer_text_ar}
                              onChange={(e) =>
                                handleUpdateAnswer(answer.tempId, 'answer_text_ar', e.target.value)
                              }
                              placeholder={`الإجابة ${index + 1}`}
                              dir="rtl"
                            />
                          )}
                        </div>
                        {questionForm.answers.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAnswer(answer.tempId)}
                            className="mt-2"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Explanation - Based on exam language */}
            {examLanguage === 'en' ? (
              <div className="space-y-2 p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                <Label className="text-amber-800 font-medium">Explanation (Optional)</Label>
                <Textarea
                  value={questionForm.explanation}
                  onChange={(e) =>
                    setQuestionForm((prev) => ({ ...prev, explanation: e.target.value }))
                  }
                  placeholder="Optional explanation for the correct answer"
                  rows={3}
                  className="bg-white"
                />
              </div>
            ) : (
              <div className="space-y-2 p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                <Label className="text-amber-800 font-medium">التوضيح (اختياري)</Label>
                <Textarea
                  value={questionForm.explanation_ar}
                  onChange={(e) =>
                    setQuestionForm((prev) => ({ ...prev, explanation_ar: e.target.value }))
                  }
                  placeholder="شرح اختياري للإجابة الصحيحة"
                  rows={3}
                  dir="rtl"
                  className="bg-white"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-between pt-6 mt-6 border-t-2 border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              <Button variant="outline" size="lg" onClick={handleCancelEdit} className="min-w-32">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="lg" onClick={handleSaveQuestion} className="min-w-40">
                <Save className="h-4 w-4 mr-2" />
                {isAddingQuestion ? 'Create Question' : 'Update Question'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions List - Hidden when editing/creating */}
      {!isAddingQuestion && !editingQuestionId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Questions ({questions.length})</CardTitle>
              <Button onClick={handleAddQuestion} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </CardHeader>
          <CardContent>
          {questions.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No questions yet</p>
              <Button onClick={handleAddQuestion} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add First Question
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="border-2 rounded-lg p-5 hover:border-blue-400 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-sky-500 to-royal-600 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {index + 1}
                          </span>
                        </div>
                        <Badge
                          variant={
                            question.question_type === 'single_choice'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {question.question_type === 'single_choice'
                            ? '○ Single Answer'
                            : '☑ Multiple Answers'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {question.points} {question.points === 1 ? 'point' : 'points'}
                        </Badge>
                      </div>
                      <p className={cn(
                        "text-gray-900 font-semibold mb-4 text-base leading-relaxed",
                        examLanguage === 'ar' && "text-right"
                      )} dir={examLanguage === 'ar' ? 'rtl' : 'ltr'}>
                        {examLanguage === 'ar' && question.question_text_ar
                          ? question.question_text_ar
                          : question.question_text}
                      </p>
                      <div className="space-y-2">
                        {question.answers.map((answer) => (
                          <div
                            key={answer.id}
                            className={cn(
                              'flex items-start gap-3 p-3 rounded-lg border-2 transition-all',
                              answer.is_correct
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 bg-gray-50',
                              examLanguage === 'ar' && 'flex-row-reverse'
                            )}
                          >
                            {answer.is_correct ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                            )}
                            <span className={cn(
                              'text-sm leading-relaxed flex-1',
                              answer.is_correct ? 'text-green-900 font-medium' : 'text-gray-700',
                              examLanguage === 'ar' && 'text-right'
                            )} dir={examLanguage === 'ar' ? 'rtl' : 'ltr'}>
                              {examLanguage === 'ar' && answer.answer_text_ar
                                ? answer.answer_text_ar
                                : answer.answer_text}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Explanation */}
                      {(() => {
                        const explanation = examLanguage === 'ar'
                          ? (question.explanation_ar || question.explanation)
                          : question.explanation;
                        return explanation ? (
                          <div className={cn(
                            "mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg",
                            examLanguage === 'ar' && "text-right"
                          )} dir={examLanguage === 'ar' ? 'rtl' : 'ltr'}>
                            <div className={cn(
                              "flex items-start gap-2",
                              examLanguage === 'ar' && 'flex-row-reverse'
                            )}>
                              <div className="h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-white text-xs font-bold">!</span>
                              </div>
                              <div className="flex-1">
                                <strong className="text-amber-900 text-sm">
                                  {examLanguage === 'ar' ? 'التوضيح:' : 'Explanation:'}
                                </strong>
                                <p className="text-amber-800 text-sm mt-1 leading-relaxed">{explanation}</p>
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditQuestion(question)}
                        className="whitespace-nowrap"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleDeleteQuestion(question.id, question.question_text)
                        }
                        className="whitespace-nowrap text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}

ExamQuestionManager.displayName = 'ExamQuestionManager';
