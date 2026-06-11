/**
 * Question Set Editor - Admin Page — English Only
 * Manage individual questions within a question set
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useQuestionSet,
  useQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
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
  MoreHorizontal,
  Upload,
  Search,
  Filter,
  HelpCircle,
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

export function QuestionSetEditor() {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<PracticeQuestion | null>(null);
  const [deleteConfirmQuestion, setDeleteConfirmQuestion] = useState<PracticeQuestion | null>(null);

  const { data: questionSet, isLoading: isLoadingSet } = useQuestionSet(setId);
  const { data: questions, isLoading: isLoadingQuestions } = useQuestions(setId, {
    difficulty_level: difficultyFilter !== 'all' ? (difficultyFilter as any) : undefined,
  });

  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();

  const filteredQuestions = questions?.filter((q) => {
    if (searchTerm) {
      return q.question_text.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const handleCreate = async (data: PracticeQuestionInsert) => {
    try {
      await createQuestion.mutateAsync(data);
      toast.success('Question created successfully');
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error('Failed to create question');
    }
  };

  const handleUpdate = async (questionId: string, data: PracticeQuestionUpdate) => {
    try {
      await updateQuestion.mutateAsync({ questionId, updates: data });
      toast.success('Question updated successfully');
      setEditingQuestion(null);
    } catch (error) {
      toast.error('Failed to update question');
    }
  };

  const handleDelete = async (questionId: string) => {
    try {
      await deleteQuestion.mutateAsync({ questionId, questionSetId: setId! });
      toast.success('Question deleted successfully');
      setDeleteConfirmQuestion(null);
    } catch (error) {
      toast.error('Failed to delete question');
    }
  };

  const handleTogglePublish = async (question: PracticeQuestion) => {
    try {
      await updateQuestion.mutateAsync({
        questionId: question.id,
        updates: { is_published: !question.is_published },
      });
      toast.success(question.is_published ? 'Question unpublished' : 'Question published');
    } catch (error) {
      toast.error('Failed to update publish status');
    }
  };

  if (isLoadingSet || isLoadingQuestions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/question-bank')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Question Bank
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{questionSet?.title}</h1>
            <span className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-700">🇬🇧 English</span>
          </div>
          <p className="text-gray-600 mt-1">
            {questions?.length || 0} questions • Passing score: {questionSet?.passing_score}%
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import Questions
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search questions..."
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

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions?.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index + 1}
            onEdit={() => setEditingQuestion(question)}
            onDelete={() => setDeleteConfirmQuestion(question)}
            onTogglePublish={() => handleTogglePublish(question)}
          />
        ))}

        {filteredQuestions?.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No questions found</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Question
            </Button>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <QuestionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={(data) => handleCreate({ ...data, question_set_id: setId! })}
        title="Create Question"
        nextOrderIndex={(questions?.length || 0) + 1}
      />

      {/* Edit Dialog */}
      <QuestionDialog
        open={!!editingQuestion}
        onOpenChange={(open) => !open && setEditingQuestion(null)}
        onSubmit={(data) => editingQuestion && handleUpdate(editingQuestion.id, data)}
        title="Edit Question"
        defaultValues={editingQuestion || undefined}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmQuestion} onOpenChange={(open) => !open && setDeleteConfirmQuestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmQuestion(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmQuestion && handleDelete(deleteConfirmQuestion.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Safely parse options
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
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
}

function QuestionCard({ question, index, onEdit, onDelete, onTogglePublish }: QuestionCardProps) {
  const options: QuestionOption[] = safeParseOptions(question.options);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="flex items-center gap-2 text-gray-400">
            <GripVertical className="w-4 h-4" />
            <span className="font-mono text-sm">#{index}</span>
          </div>
          <div className="flex-1">
            <p className="text-gray-900 font-medium">{question.question_text}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            question.difficulty_level === 'easy' ? 'bg-green-100 text-green-700'
            : question.difficulty_level === 'hard' ? 'bg-red-100 text-red-700'
            : 'bg-yellow-100 text-yellow-700'
          }`}>
            {question.difficulty_level}
          </span>
          <button
            onClick={onTogglePublish}
            className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
              question.is_published
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {question.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
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

      {/* Options */}
      <div className="grid grid-cols-2 gap-2 ml-12">
        {options.map((option) => (
          <div
            key={option.id}
            className={`flex items-center gap-2 p-2 rounded ${
              option.id === question.correct_option_id
                ? 'bg-green-50 border border-green-200'
                : 'bg-gray-50'
            }`}
          >
            <span className="font-semibold text-gray-600 uppercase text-sm">{option.id}.</span>
            <span className="text-sm text-gray-700">{option.text}</span>
            {option.id === question.correct_option_id && (
              <Check className="w-4 h-4 text-green-600 ml-auto" />
            )}
          </div>
        ))}
      </div>

      {/* Explanation */}
      {question.explanation && (
        <div className="mt-4 ml-12 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Explanation:</strong> {question.explanation}
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
}

function QuestionDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  defaultValues,
  nextOrderIndex = 1,
}: QuestionDialogProps) {
  const getDefaultOptions = (): QuestionOption[] => {
    const parsedOptions = safeParseOptions(defaultValues?.options);
    if (parsedOptions.length > 0) return parsedOptions;
    return [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ];
  };

  const [formData, setFormData] = useState({
    question_text: defaultValues?.question_text || '',
    question_type: defaultValues?.question_type || 'multiple_choice',
    options: getDefaultOptions(),
    correct_option_id: defaultValues?.correct_option_id || 'a',
    explanation: defaultValues?.explanation || '',
    difficulty_level: defaultValues?.difficulty_level || 'medium',
    order_index: defaultValues?.order_index || nextOrderIndex,
    tags: defaultValues?.tags || [],
    points: defaultValues?.points || 1,
    is_published: defaultValues?.is_published ?? true,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        question_text: defaultValues?.question_text || '',
        question_type: defaultValues?.question_type || 'multiple_choice',
        options: getDefaultOptions(),
        correct_option_id: defaultValues?.correct_option_id || 'a',
        explanation: defaultValues?.explanation || '',
        difficulty_level: defaultValues?.difficulty_level || 'medium',
        order_index: defaultValues?.order_index || nextOrderIndex,
        tags: defaultValues?.tags || [],
        points: defaultValues?.points || 1,
        is_published: defaultValues?.is_published ?? true,
      });
    }
  }, [open, defaultValues, nextOrderIndex]);

  const updateOption = (index: number, text: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], text };
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = () => {
    if (!formData.question_text) {
      toast.error('Question text is required');
      return;
    }
    if (!formData.options.every((opt) => opt.text)) {
      toast.error('All options must have text');
      return;
    }

    const submitData: PracticeQuestionInsert = {
      question_text: formData.question_text,
      question_text_ar: null,
      question_type: formData.question_type as any,
      options: formData.options.map(opt => ({
        id: opt.id,
        text: opt.text,
        text_ar: undefined,
      })),
      correct_option_id: formData.correct_option_id,
      explanation: formData.explanation || null,
      explanation_ar: null,
      difficulty_level: formData.difficulty_level as any,
      order_index: formData.order_index,
      tags: formData.tags,
      points: formData.points,
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
          {/* Question Text */}
          <div>
            <Label>Question Text *</Label>
            <Textarea
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              placeholder="Enter question text"
              rows={3}
            />
          </div>

          {/* Options */}
          <div>
            <Label>Answer Options *</Label>
            <div className="space-y-2 mt-2">
              {formData.options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, correct_option_id: option.id })}
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
                    placeholder={`Option ${option.id.toUpperCase()}`}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Click the letter to mark as correct answer</p>
          </div>

          {/* Explanation */}
          <div>
            <Label>Explanation (shown after answering)</Label>
            <Textarea
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              placeholder="Explain why the correct answer is correct"
              rows={2}
            />
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Difficulty</Label>
              <Select
                value={formData.difficulty_level}
                onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
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
              <Label>Points</Label>
              <Input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Order</Label>
              <Input
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_published}
              onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
            />
            <Label>Published</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {defaultValues?.question_text ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
