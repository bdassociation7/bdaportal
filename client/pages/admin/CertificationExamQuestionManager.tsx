import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle2,
  Circle,
  FileCheck,
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
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { cn } from '@/shared/utils/cn';
import { QuizService } from '@/entities/quiz';
import type {
  QuizQuestion,
  QuestionWithAnswers,
  QuizAnswer,
  CreateQuestionDTO,
  CreateAnswerDTO,
} from '@/entities/quiz/quiz.types';

/**
 * CertificationExamQuestionManager Page
 * Manage questions and answers for a certification exam
 */

// BABOK Knowledge Areas for BOK Domain
const BABOK_KNOWLEDGE_AREAS = [
  { value: 'business_analysis_planning_and_monitoring', label: 'Business Analysis Planning and Monitoring' },
  { value: 'elicitation_and_collaboration', label: 'Elicitation and Collaboration' },
  { value: 'requirements_lifecycle_management', label: 'Requirements Life Cycle Management' },
  { value: 'strategy_analysis', label: 'Strategy Analysis' },
  { value: 'requirements_analysis_and_design_definition', label: 'Requirements Analysis and Design Definition' },
  { value: 'solution_evaluation', label: 'Solution Evaluation' },
  { value: 'underlying_competencies', label: 'Underlying Competencies' },
  { value: 'techniques', label: 'Techniques' },
];

export default function CertificationExamQuestionManager() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  // Data fetching
  const { data: exam, isLoading } = useQuery({
    queryKey: ['certification-exam', examId],
    queryFn: async () => {
      if (!examId) throw new Error('Exam ID is required');
      const result = await QuizService.getQuiz(examId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!examId,
  });

  // State for adding/editing question
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  // Use exam's language - no more toggle, each exam is language-specific
  const examLanguage = (exam?.exam_language || 'en') as 'en' | 'ar';
  const [questionForm, setQuestionForm] = useState<{
    question_text: string;
    question_text_ar: string;
    question_type: 'multiple_choice' | 'true_false' | 'multi_select';
    bock_domain: string;
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
    order_index: number;
    explanation: string; // Question-level explanation (after all answers)
    explanation_ar: string; // Question-level explanation in Arabic
    answers: Array<Omit<CreateAnswerDTO, 'explanation' | 'explanation_ar'> & { tempId: string }>;
  }>({
    question_text: '',
    question_text_ar: '',
    question_type: 'multiple_choice',
    bock_domain: '',
    difficulty: 'medium',
    points: 1,
    order_index: 0,
    explanation: '',
    explanation_ar: '',
    answers: [],
  });

  const questions = exam?.questions || [];

  // Handlers
  const handleAddQuestion = () => {
    setIsAddingQuestion(true);
    setEditingQuestionId(null);
    setQuestionForm({
      question_text: '',
      question_text_ar: '',
      question_type: 'multiple_choice',
      bock_domain: '',
      difficulty: 'medium',
      points: 1,
      order_index: questions.length,
      explanation: '',
      explanation_ar: '',
      answers: [
        { tempId: '1', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 0 },
        { tempId: '2', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 1 },
        { tempId: '3', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 2 },
        { tempId: '4', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 3 },
      ],
    });
  };

  const handleEditQuestion = (question: QuestionWithAnswers, questionIndex: number) => {
    setIsAddingQuestion(false);
    setEditingQuestionId(question.id);
    // Get explanation from correct answer (legacy) or from question level
    const correctAnswer = (question.answers || []).find((a: QuizAnswer) => a.is_correct);
    setQuestionForm({
      question_text: question.question_text,
      question_text_ar: question.question_text_ar || '',
      question_type: question.question_type || 'multiple_choice',
      bock_domain: question.bock_domain || '',
      difficulty: question.difficulty || 'medium',
      points: question.points || 1,
      order_index: question.order_index || questionIndex,
      explanation: (question as any).explanation || correctAnswer?.explanation || '',
      explanation_ar: (question as any).explanation_ar || correctAnswer?.explanation_ar || '',
      answers: (question.answers || []).map((a: QuizAnswer) => ({
        tempId: a.id,
        answer_text: a.answer_text,
        answer_text_ar: a.answer_text_ar || '',
        is_correct: a.is_correct,
        order_index: a.order_index || 0,
      })),
    });
  };

  const handleCancelEdit = () => {
    setIsAddingQuestion(false);
    setEditingQuestionId(null);
  };

  const handleSaveQuestion = async () => {
    // Validation - check the appropriate language field based on exam language
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
        description: 'At least 2 answers are required',
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

    // Validate correct answer count based on question type
    const correctCount = questionForm.answers.filter((a) => a.is_correct).length;

    if (questionForm.question_type === 'multiple_choice' || questionForm.question_type === 'true_false') {
      if (correctCount !== 1) {
        toast({
          title: 'Validation Error',
          description: `${questionForm.question_type === 'true_false' ? 'True/False' : 'Multiple choice'} questions must have exactly one correct answer`,
          variant: 'destructive',
        });
        return;
      }
    } else if (questionForm.question_type === 'multi_select') {
      if (correctCount < 1) {
        toast({
          title: 'Validation Error',
          description: 'Multi-select questions must have at least one correct answer',
          variant: 'destructive',
        });
        return;
      }
      if (correctCount === questionForm.answers.length) {
        toast({
          title: 'Validation Error',
          description: 'Multi-select questions cannot have all answers as correct (at least one must be incorrect)',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      // Put explanation on the correct answer (for backward compatibility with data model)
      const dto: CreateQuestionDTO = {
        quiz_id: examId!,
        question_text: questionForm.question_text,
        question_text_ar: questionForm.question_text_ar || undefined,
        question_type: questionForm.question_type,
        bock_domain: questionForm.bock_domain || undefined,
        difficulty: questionForm.difficulty,
        points: questionForm.points,
        order_index: questionForm.order_index,
        answers: questionForm.answers.map((a) => ({
          answer_text: a.answer_text,
          answer_text_ar: a.answer_text_ar || undefined,
          is_correct: a.is_correct,
          // Only store explanation on correct answer(s)
          explanation: a.is_correct ? (questionForm.explanation || undefined) : undefined,
          explanation_ar: a.is_correct ? (questionForm.explanation_ar || undefined) : undefined,
          order_index: a.order_index,
        })),
      };

      if (isAddingQuestion) {
        const result = await QuizService.createQuestion(dto);
        if (result.error) throw result.error;

        toast({
          title: 'Success',
          description: 'Question created successfully',
        });
      } else {
        const result = await QuizService.updateQuestion(editingQuestionId!, dto);
        if (result.error) throw result.error;

        toast({
          title: 'Success',
          description: 'Question updated successfully',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['certification-exam', examId] });
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
      const result = await QuizService.deleteQuestion(questionId);
      if (result.error) throw result.error;

      toast({
        title: 'Success',
        description: 'Question deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['certification-exam', examId] });
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
      const isSingleChoice = prev.question_type === 'multiple_choice' || prev.question_type === 'true_false';
      return {
        ...prev,
        answers: prev.answers.map((a) => {
          if (a.tempId === tempId) {
            return { ...a, is_correct: !a.is_correct };
          } else if (isSingleChoice) {
            // For multiple choice and true/false (single correct answer), uncheck other answers
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
          <Button onClick={() => navigate('/admin/certification-exams')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Certification Exams
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
            onClick={() => navigate('/admin/certification-exams')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <FileCheck className="h-8 w-8" />
                Question Manager
              </h1>
              <Badge variant="outline" className="border-white/30 text-white bg-white/10">
                BDA-{exam.certification_type}™ Certification
              </Badge>
              <Badge variant="outline" className={examLanguage === 'ar' ? 'border-emerald-300 text-emerald-100 bg-emerald-500/20' : 'border-blue-300 text-blue-100 bg-blue-500/20'}>
                {examLanguage === 'ar' ? '🇸🇦 Arabic Exam' : '🇬🇧 English Exam'}
              </Badge>
            </div>
            <p className="mt-2 opacity-90">{exam.title}</p>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span>{questions.length} Questions</span>
              <span>•</span>
              <span>{exam.time_limit_minutes} minutes</span>
              <span>•</span>
              <span>Pass: {exam.passing_score_percentage}%</span>
            </div>
          </div>
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
                      ? 'Create a new question for this certification exam'
                      : 'Modify the question details and answers'
                    }
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Language Indicator - Shows exam language */}
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
                  placeholder="Enter question text in English"
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
                  placeholder="أدخل نص السؤال بالعربية"
                  rows={3}
                  dir="rtl"
                  className="bg-white"
                />
              </div>
            )}

            {/* BOK Domain */}
            <div className="space-y-2">
              <Label>BABOK Knowledge Area (BOK Domain)</Label>
              <Select
                value={questionForm.bock_domain || undefined}
                onValueChange={(value) =>
                  setQuestionForm((prev) => ({ ...prev, bock_domain: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select knowledge area (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {BABOK_KNOWLEDGE_AREAS.map((area) => (
                    <SelectItem key={area.value} value={area.value}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Select the BABOK knowledge area this question relates to
              </p>
            </div>

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
                            description: `Only the first correct answer was kept. Single answer questions can only have one correct answer.`,
                          });
                        }

                        const updatedAnswers = prev.answers.map((answer, index) => ({
                          ...answer,
                          is_correct: correctAnswers.length > 1
                            ? answer.tempId === correctAnswers[0].tempId // Keep only first correct
                            : answer.is_correct, // Keep as is if 0 or 1 correct
                        }));

                        return {
                          ...prev,
                          question_type: 'multiple_choice',
                          answers: prev.answers.length < 2 ? [
                            { tempId: '1', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 0 },
                            { tempId: '2', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 1 },
                          ] : updatedAnswers,
                        };
                      });
                    }}
                    className={cn(
                      'p-4 border-2 rounded-lg text-left transition-all',
                      (questionForm.question_type === 'multiple_choice' || questionForm.question_type === 'true_false')
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-300 bg-white hover:border-green-300'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full border-2 border-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {(questionForm.question_type === 'multiple_choice' || questionForm.question_type === 'true_false') && (
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
                        question_type: 'multi_select',
                        answers: prev.answers.length < 2 ? [
                          { tempId: '1', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 0 },
                          { tempId: '2', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 1 },
                        ] : prev.answers,
                      }));
                    }}
                    className={cn(
                      'p-4 border-2 rounded-lg text-left transition-all',
                      questionForm.question_type === 'multi_select'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-300 bg-white hover:border-blue-300'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded border-2 border-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {questionForm.question_type === 'multi_select' && (
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

              {/* True/False Option (only for single answer) */}
              {(questionForm.question_type === 'multiple_choice' || questionForm.question_type === 'true_false') && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Checkbox
                    id="trueFalseMode"
                    checked={questionForm.question_type === 'true_false'}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setQuestionForm((prev) => ({
                          ...prev,
                          question_type: 'true_false',
                          answers: [
                            { tempId: 'true', answer_text: 'True', answer_text_ar: 'صحيح', is_correct: false, order_index: 0 },
                            { tempId: 'false', answer_text: 'False', answer_text_ar: 'خطأ', is_correct: false, order_index: 1 },
                          ],
                        }));
                      } else {
                        setQuestionForm((prev) => ({
                          ...prev,
                          question_type: 'multiple_choice',
                          answers: [
                            { tempId: '1', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 0 },
                            { tempId: '2', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 1 },
                          ],
                        }));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <Label htmlFor="trueFalseMode" className="font-medium cursor-pointer">
                      True/False Question
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      Check this if your question has only True and False as options
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Difficulty and Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={questionForm.difficulty}
                  onValueChange={(value) =>
                    setQuestionForm((prev) => ({
                      ...prev,
                      difficulty: value as 'easy' | 'medium' | 'hard',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
            </div>

            {/* Answers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg">
                  Answers <span className="text-red-500">*</span>
                </Label>
                {questionForm.question_type !== 'true_false' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddAnswer}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Answer
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {/* Instructions based on question type */}
                <div className={cn(
                  "p-4 rounded-lg border-l-4 flex items-start gap-3",
                  questionForm.question_type === 'multi_select'
                    ? "bg-blue-50 border-blue-500"
                    : "bg-green-50 border-green-500"
                )}>
                  {questionForm.question_type === 'multi_select' ? (
                    <div className="h-5 w-5 rounded border-2 border-blue-600 bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-green-600 flex items-center justify-center flex-shrink-0">
                      <div className="h-2.5 w-2.5 rounded-full bg-green-600"></div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold mb-1">
                      {questionForm.question_type === 'multi_select' ? 'Multiple Answers Mode' : 'Single Answer Mode'}
                      {questionForm.question_type === 'true_false' && ' (True/False)'}
                    </p>
                    <p className="text-sm text-gray-700">
                      {questionForm.question_type === 'multiple_choice' && (
                        <>Use radio buttons to select exactly <strong>ONE</strong> correct answer</>
                      )}
                      {questionForm.question_type === 'true_false' && (
                        <>Select whether <strong>True</strong> or <strong>False</strong> is the correct answer</>
                      )}
                      {questionForm.question_type === 'multi_select' && (
                        <>Use checkboxes to select <strong>ALL</strong> correct answers (can be multiple)</>
                      )}
                    </p>
                  </div>
                </div>

                {/* Single choice questions (Multiple Choice & True/False) */}
                {(questionForm.question_type === 'multiple_choice' || questionForm.question_type === 'true_false') && (
                  <RadioGroup
                    value={questionForm.answers.find(a => a.is_correct)?.tempId || ''}
                    onValueChange={(tempId) => handleToggleCorrect(tempId)}
                  >
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
                          {/* Radio Button */}
                          <div className="flex items-center pt-3">
                            <RadioGroupItem value={answer.tempId} id={`answer-${answer.tempId}`} />
                          </div>

                          {/* Answer Fields */}
                          <div className="flex-1 space-y-2">
                            <Label htmlFor={`answer-${answer.tempId}`} className="text-sm font-medium">
                              {questionForm.question_type === 'true_false'
                                ? (index === 0 ? 'True' : 'False')
                                : `Answer ${index + 1}`}
                              {answer.is_correct && <span className="ml-2 text-green-600 text-xs">✓ Correct</span>}
                            </Label>
                            {examLanguage === 'en' ? (
                              <Input
                                value={answer.answer_text}
                                onChange={(e) =>
                                  handleUpdateAnswer(answer.tempId, 'answer_text', e.target.value)
                                }
                                placeholder={`Answer ${index + 1}`}
                                className={answer.is_correct ? 'border-green-500' : ''}
                                disabled={questionForm.question_type === 'true_false'}
                              />
                            ) : (
                              <Input
                                value={answer.answer_text_ar}
                                onChange={(e) =>
                                  handleUpdateAnswer(answer.tempId, 'answer_text_ar', e.target.value)
                                }
                                placeholder={`الإجابة ${index + 1}`}
                                dir="rtl"
                                className={answer.is_correct ? 'border-green-500' : ''}
                                disabled={questionForm.question_type === 'true_false'}
                              />
                            )}
                          </div>

                          {/* Remove Button */}
                          {questionForm.answers.length > 2 && questionForm.question_type !== 'true_false' && (
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
                  </RadioGroup>
                )}

                {/* Multi-select questions */}
                {questionForm.question_type === 'multi_select' && (
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
                          {/* Checkbox */}
                          <div className="flex items-center pt-3">
                            <Checkbox
                              id={`answer-${answer.tempId}`}
                              checked={answer.is_correct}
                              onCheckedChange={(checked) => {
                                handleUpdateAnswer(answer.tempId, 'is_correct', checked === true);
                              }}
                            />
                          </div>

                          {/* Answer Fields */}
                          <div className="flex-1 space-y-2">
                            <Label htmlFor={`answer-${answer.tempId}`} className="text-sm font-medium">
                              Answer {index + 1}
                              {answer.is_correct && <span className="ml-2 text-blue-600 text-xs">✓ Correct</span>}
                            </Label>
                            {examLanguage === 'en' ? (
                              <Input
                                value={answer.answer_text}
                                onChange={(e) =>
                                  handleUpdateAnswer(answer.tempId, 'answer_text', e.target.value)
                                }
                                placeholder={`Answer ${index + 1}`}
                                className={answer.is_correct ? 'border-blue-500' : ''}
                              />
                            ) : (
                              <Input
                                value={answer.answer_text_ar}
                                onChange={(e) =>
                                  handleUpdateAnswer(answer.tempId, 'answer_text_ar', e.target.value)
                                }
                                placeholder={`الإجابة ${index + 1}`}
                                dir="rtl"
                                className={answer.is_correct ? 'border-blue-500' : ''}
                              />
                            )}
                          </div>

                          {/* Remove Button */}
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
            </div>

            {/* EXPLANATION SECTION - After all answers */}
            <div className="space-y-4 pt-4 border-t-2 border-gray-200">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="text-amber-600">💡</span>
                </div>
                <div>
                  <Label className="text-base font-semibold">
                    {examLanguage === 'ar' ? 'توضيح الإجابة' : 'Answer Explanation'}
                  </Label>
                  <p className="text-xs text-gray-500">
                    {examLanguage === 'ar'
                      ? 'اشرح لماذا الإجابة الصحيحة صحيحة (يظهر بعد الإجابة على السؤال)'
                      : 'Explain why the correct answer(s) is/are correct (shown after question is answered)'
                    }
                  </p>
                </div>
              </div>

              {examLanguage === 'en' ? (
                <div className="space-y-2 p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                  <Label className="text-amber-800 font-medium">Explanation</Label>
                  <Textarea
                    value={questionForm.explanation}
                    onChange={(e) =>
                      setQuestionForm((prev) => ({ ...prev, explanation: e.target.value }))
                    }
                    placeholder="Explain why the correct answer is correct. This will be shown to the user after they answer the question."
                    rows={3}
                    className="bg-white"
                  />
                </div>
              ) : (
                <div className="space-y-2 p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                  <Label className="text-amber-800 font-medium">التوضيح</Label>
                  <Textarea
                    value={questionForm.explanation_ar}
                    onChange={(e) =>
                      setQuestionForm((prev) => ({ ...prev, explanation_ar: e.target.value }))
                    }
                    placeholder="اشرح لماذا الإجابة الصحيحة صحيحة. سيتم عرض هذا للمستخدم بعد الإجابة على السؤال."
                    rows={3}
                    dir="rtl"
                    className="bg-white"
                  />
                </div>
              )}
            </div>

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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Questions ({questions.length})</CardTitle>
            <Button onClick={handleAddQuestion} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </CardHeader>
          <CardContent>
          {questions.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No questions yet</p>
              <Button onClick={handleAddQuestion} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add First Question
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question: QuestionWithAnswers, index: number) => (
                <div
                  key={question.id}
                  className="border rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-lg font-bold text-gray-900">Q{index + 1}.</span>
                        <Badge
                          variant={
                            question.question_type === 'multiple_choice' ? 'default' : 'secondary'
                          }
                        >
                          {question.question_type === 'multiple_choice'
                            ? 'Multiple Choice'
                            : question.question_type === 'multi_select'
                            ? 'Multi Select'
                            : 'True/False'}
                        </Badge>
                        <Badge variant="outline">{question.points || 1} pts</Badge>
                        {question.difficulty && (
                          <Badge
                            variant="outline"
                            className={cn(
                              question.difficulty === 'easy' ? 'border-green-500 text-green-700' :
                              question.difficulty === 'hard' ? 'border-red-500 text-red-700' :
                              'border-yellow-500 text-yellow-700'
                            )}
                          >
                            {question.difficulty}
                          </Badge>
                        )}
                        {question.bock_domain && (
                          <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700">
                            {BABOK_KNOWLEDGE_AREAS.find(a => a.value === question.bock_domain)?.label.substring(0, 30) || question.bock_domain}
                          </Badge>
                        )}
                      </div>
                      <p className={cn(
                        "text-gray-900 font-medium mb-3",
                        examLanguage === 'ar' && "text-right"
                      )} dir={examLanguage === 'ar' ? 'rtl' : 'ltr'}>
                        {examLanguage === 'ar' && question.question_text_ar
                          ? question.question_text_ar
                          : question.question_text}
                      </p>
                      <div className="space-y-2">
                        {(question.answers || []).map((answer: QuizAnswer, answerIndex: number) => (
                          <div
                            key={answer.id}
                            className={cn(
                              'flex flex-col gap-1 p-3 rounded-lg border transition-all',
                              answer.is_correct
                                ? 'bg-green-50 border-green-300 text-green-900'
                                : 'bg-gray-50 border-gray-200 text-gray-700'
                            )}
                          >
                            <div className="flex items-start gap-2">
                              {/* Icon based on question type */}
                              {question.question_type === 'multi_select' ? (
                                answer.is_correct ? (
                                  <div className="h-4 w-4 rounded border-2 border-green-600 bg-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <CheckCircle2 className="h-3 w-3 text-white" />
                                  </div>
                                ) : (
                                  <div className="h-4 w-4 rounded border-2 border-gray-400 flex-shrink-0 mt-0.5"></div>
                                )
                              ) : (
                                answer.is_correct ? (
                                  <div className="h-4 w-4 rounded-full border-2 border-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <div className="h-2 w-2 rounded-full bg-green-600"></div>
                                  </div>
                                ) : (
                                  <div className="h-4 w-4 rounded-full border-2 border-gray-400 flex-shrink-0 mt-0.5"></div>
                                )
                              )}
                              <div className="flex-1">
                                <span className={cn(
                                  "text-sm",
                                  answer.is_correct ? "font-medium" : "",
                                  examLanguage === 'ar' && "block text-right"
                                )} dir={examLanguage === 'ar' ? 'rtl' : 'ltr'}>
                                  {examLanguage === 'ar' && answer.answer_text_ar
                                    ? answer.answer_text_ar
                                    : answer.answer_text}
                                  {answer.is_correct && (
                                    <span className={cn(
                                      "text-xs font-semibold text-green-700",
                                      examLanguage === 'ar' ? "mr-2" : "ml-2"
                                    )}>✓ {examLanguage === 'ar' ? 'صحيح' : 'Correct'}</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Explanation Section - After all answers */}
                      {(() => {
                        const correctAnswer = (question.answers || []).find((a: QuizAnswer) => a.is_correct);
                        const explanation = examLanguage === 'ar'
                          ? ((question as any).explanation_ar || correctAnswer?.explanation_ar || (question as any).explanation || correctAnswer?.explanation)
                          : ((question as any).explanation || correctAnswer?.explanation);
                        return explanation ? (
                          <div className={cn(
                            "mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg",
                            examLanguage === 'ar' && "text-right"
                          )} dir={examLanguage === 'ar' ? 'rtl' : 'ltr'}>
                            <p className="text-sm text-amber-800">
                              <span className="font-semibold">💡 {examLanguage === 'ar' ? 'التوضيح:' : 'Explanation:'}</span>{' '}
                              <span className="italic">{explanation}</span>
                            </p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="ghost" onClick={() => handleEditQuestion(question, index)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteQuestion(question.id, question.question_text)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
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

CertificationExamQuestionManager.displayName = 'CertificationExamQuestionManager';
