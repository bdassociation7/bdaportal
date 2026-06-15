import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  BookOpen,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { cn } from '@/shared/utils/cn';
import { supabase } from '@/shared/config/supabase.config';

// BDA BoCK Competency Areas
const BDA_COMPETENCIES = {
  behavioral: [
    { value: 'Strategic Leadership', label: 'Strategic Leadership' },
    { value: 'Effective Communication', label: 'Effective Communication' },
    { value: 'Business Acumen', label: 'Business Acumen' },
    { value: 'Emotional Intelligence (EQ)', label: 'Emotional Intelligence (EQ)' },
    { value: 'Critical Thinking & Problem Solving', label: 'Critical Thinking & Problem Solving' },
    { value: 'Consultative Mindset', label: 'Consultative Mindset' },
    { value: 'Negotiation & Relationship Management', label: 'Negotiation & Relationship Management' },
  ],
  knowledge_based: [
    { value: 'Growth & Expansion Strategies', label: 'Growth & Expansion Strategies' },
    { value: 'Market & Competitive Analysis', label: 'Market & Competitive Analysis' },
    { value: 'Innovation in Business Development', label: 'Innovation in Business Development' },
    { value: 'Business Project Management', label: 'Business Project Management' },
    { value: 'Financial & Pricing Models', label: 'Financial & Pricing Models' },
    { value: 'Marketing & Sales Strategies', label: 'Marketing & Sales Strategies' },
    { value: 'Legal & Compliance in Business Development', label: 'Legal & Compliance in Business Development' },
  ],
};

type TabKey = 'CP-EN' | 'CP-AR' | 'SCP-EN' | 'SCP-AR';

const TABS: { key: TabKey; label: string; certType: string; lang: string; color: string; bgGradient: string }[] = [
  {
    key: 'CP-EN',
    label: 'BDA-CP English',
    certType: 'CP',
    lang: 'en',
    color: 'blue',
    bgGradient: 'from-blue-600 to-blue-800',
  },
  {
    key: 'CP-AR',
    label: 'BDA-CP Arabic',
    certType: 'CP',
    lang: 'ar',
    color: 'emerald',
    bgGradient: 'from-emerald-600 to-emerald-800',
  },
  {
    key: 'SCP-EN',
    label: 'BDA-SCP English',
    certType: 'SCP',
    lang: 'en',
    color: 'purple',
    bgGradient: 'from-purple-600 to-purple-800',
  },
  {
    key: 'SCP-AR',
    label: 'BDA-SCP Arabic',
    certType: 'SCP',
    lang: 'ar',
    color: 'rose',
    bgGradient: 'from-rose-600 to-rose-800',
  },
];

type QuestionForm = {
  question_text: string;
  question_text_ar: string;
  question_type: 'multiple_choice' | 'true_false' | 'multi_select';
  bock_domain: string;
  competency_section: 'behavioral' | 'behavioural' | 'knowledge_based' | '';
  competency_name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  order_index: number;
  explanation: string;
  explanation_ar: string;
  answers: Array<{
    tempId: string;
    answer_text: string;
    answer_text_ar: string;
    is_correct: boolean;
    order_index: number;
  }>;
};

const defaultQuestionForm = (): QuestionForm => ({
  question_text: '',
  question_text_ar: '',
  question_type: 'multiple_choice',
  bock_domain: '',
  competency_section: '',
  competency_name: '',
  difficulty: 'medium',
  points: 1,
  order_index: 0,
  explanation: '',
  explanation_ar: '',
  answers: [
    { tempId: '1', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 0 },
    { tempId: '2', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 1 },
    { tempId: '3', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 2 },
    { tempId: '4', answer_text: '', answer_text_ar: '', is_correct: false, order_index: 3 },
  ],
});

export default function ExamQuestionBank() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>('CP-EN');
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [questionForm, setQuestionForm] = useState<QuestionForm>(defaultQuestionForm());

  const currentTab = TABS.find((t) => t.key === activeTab)!;

  // Fetch questions for the active tab
  // Strategy: first fetch quiz metadata (which has a permissive SELECT policy for all authenticated users),
  // then use cert_type + exam_language to fetch questions (same approach as CertificationExamQuestionManager)
  const { data: questions = [], isLoading, refetch } = useQuery({
    queryKey: ['exam-question-bank', activeTab, currentTab.certType, currentTab.lang],
    queryFn: async () => {
      const certType = currentTab.certType;
      const lang = currentTab.lang;

      // Step 1: Get quiz metadata to establish auth context (same as CertificationExamQuestionManager)
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('id, certification_type, exam_language')
        .eq('certification_type', certType)
        .eq('exam_language', lang)
        .eq('is_active', true)
        .maybeSingle();

      if (quizError) {
        console.error('ExamQuestionBank quiz fetch error:', quizError);
        throw quizError;
      }

      // Step 2: Fetch questions using cert_type + language
      const { data, error } = await supabase
        .from('certification_question_bank')
        .select('*, answers:certification_question_bank_answers(*)')
        .eq('certification_type', certType)
        .eq('exam_language', lang)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('ExamQuestionBank fetch error:', error);
        throw error;
      }

      return (data || []).map((q: any) => ({
        ...q,
        answers: (q.answers || []).sort((a: any, b: any) => a.order_index - b.order_index),
      }));
    },
    staleTime: 0,
  });

  const handleAddQuestion = () => {
    setIsAddingQuestion(true);
    setEditingQuestionId(null);
    setQuestionForm({
      ...defaultQuestionForm(),
      order_index: questions.length,
    });
  };

  const normalizeCompetencySection = (section: string | null | undefined): 'behavioral' | 'knowledge_based' | '' => {
    if (!section) return '';
    if (section === 'behavioural' || section === 'behavioral') return 'behavioral';
    if (section === 'knowledge_based') return 'knowledge_based';
    return '';
  };

  const handleEditQuestion = (question: any, questionIndex: number) => {
    setIsAddingQuestion(false);
    setEditingQuestionId(question.id);
    const correctAnswer = (question.answers || []).find((a: any) => a.is_correct);
    setQuestionForm({
      question_text: question.question_text || '',
      question_text_ar: question.question_text_ar || '',
      question_type: question.question_type || 'multiple_choice',
      bock_domain: question.bock_domain || '',
      competency_section: normalizeCompetencySection(question.competency_section),
      competency_name: question.competency_name || '',
      difficulty: question.difficulty || 'medium',
      points: question.points || 1,
      order_index: question.order_index ?? questionIndex,
      explanation: question.explanation || correctAnswer?.explanation || '',
      explanation_ar: question.explanation_ar || correctAnswer?.explanation_ar || '',
      answers: (question.answers || []).map((a: any) => ({
        tempId: a.id,
        answer_text: a.answer_text || '',
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
    // Validation
    const primaryText = currentTab.lang === 'en' ? questionForm.question_text : questionForm.question_text_ar;
    if (!primaryText.trim()) {
      toast({ title: 'Validation Error', description: 'Question text is required.', variant: 'destructive' });
      return;
    }
    if (questionForm.answers.length < 2) {
      toast({ title: 'Validation Error', description: 'At least 2 answers are required.', variant: 'destructive' });
      return;
    }
    const hasCorrect = questionForm.answers.some((a) => a.is_correct);
    if (!hasCorrect) {
      toast({ title: 'Validation Error', description: 'At least one correct answer is required.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      if (!editingQuestionId) {
        // Insert new question
        const { data: newQuestion, error: qError } = await supabase
          .from('certification_question_bank')
          .insert({
            certification_type: currentTab.certType,
            exam_language: currentTab.lang,
            question_text: questionForm.question_text,
            question_text_ar: questionForm.question_text_ar || null,
            question_type: questionForm.question_type,
            bock_domain: questionForm.bock_domain || null,
            competency_section: questionForm.competency_section || null,
            competency_name: questionForm.competency_name || null,
            difficulty: questionForm.difficulty,
            points: questionForm.points,
            explanation: questionForm.explanation || null,
            explanation_ar: questionForm.explanation_ar || null,
            is_active: true,
          })
          .select()
          .single();
        if (qError || !newQuestion) throw qError || new Error('Failed to create question');

        const answers = questionForm.answers.map((a, idx) => ({
          question_id: newQuestion.id,
          answer_text: a.answer_text,
          answer_text_ar: a.answer_text_ar || null,
          is_correct: a.is_correct,
          explanation: a.is_correct ? (questionForm.explanation || null) : null,
          explanation_ar: a.is_correct ? (questionForm.explanation_ar || null) : null,
          order_index: idx,
        }));
        const { error: aError } = await supabase
          .from('certification_question_bank_answers')
          .insert(answers);
        if (aError) throw aError;

        toast({ title: 'Success', description: 'Question created successfully' });
      } else {
        // Update existing question
        const { error: qError } = await supabase
          .from('certification_question_bank')
          .update({
            question_text: questionForm.question_text,
            question_text_ar: questionForm.question_text_ar || null,
            question_type: questionForm.question_type,
            bock_domain: questionForm.bock_domain || null,
            competency_section: questionForm.competency_section || null,
            competency_name: questionForm.competency_name || null,
            difficulty: questionForm.difficulty,
            points: questionForm.points,
            explanation: questionForm.explanation || null,
            explanation_ar: questionForm.explanation_ar || null,
          })
          .eq('id', editingQuestionId);
        if (qError) throw qError;

        await supabase
          .from('certification_question_bank_answers')
          .delete()
          .eq('question_id', editingQuestionId);

        const answers = questionForm.answers.map((a, idx) => ({
          question_id: editingQuestionId,
          answer_text: a.answer_text,
          answer_text_ar: a.answer_text_ar || null,
          is_correct: a.is_correct,
          explanation: a.is_correct ? (questionForm.explanation || null) : null,
          explanation_ar: a.is_correct ? (questionForm.explanation_ar || null) : null,
          order_index: idx,
        }));
        const { error: aError } = await supabase
          .from('certification_question_bank_answers')
          .insert(answers);
        if (aError) throw aError;

        toast({ title: 'Success', description: 'Question updated successfully' });
      }

      queryClient.invalidateQueries({ queryKey: ['exam-question-bank', activeTab] });
      handleCancelEdit();
    } catch (error) {
      console.error('Error saving question:', error);
      toast({ title: 'Error', description: 'Failed to save question. Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string, questionText: string) => {
    const confirmed = await confirm({
      title: 'Delete Question',
      description: `Are you sure you want to delete this question? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('certification_question_bank')
        .update({ is_active: false })
        .eq('id', questionId);
      if (error) throw error;

      toast({ title: 'Success', description: 'Question deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['exam-question-bank', activeTab] });
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({ title: 'Error', description: 'Failed to delete question. Please try again.', variant: 'destructive' });
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

  const handleAnswerChange = (tempId: string, field: string, value: any) => {
    setQuestionForm((prev) => ({
      ...prev,
      answers: prev.answers.map((a) =>
        a.tempId === tempId ? { ...a, [field]: value } : a
      ),
    }));
  };

  const handleSetCorrectAnswer = (tempId: string) => {
    setQuestionForm((prev) => ({
      ...prev,
      answers: prev.answers.map((a) => ({
        ...a,
        is_correct: a.tempId === tempId,
      })),
    }));
  };

  const tabColorClasses: Record<string, { tab: string; activeBg: string; badge: string }> = {
    blue: { tab: 'text-blue-600 border-blue-600', activeBg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
    emerald: { tab: 'text-emerald-600 border-emerald-600', activeBg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
    purple: { tab: 'text-purple-600 border-purple-600', activeBg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
    rose: { tab: 'text-rose-600 border-rose-600', activeBg: 'bg-rose-50', badge: 'bg-rose-100 text-rose-700' },
  };

  const currentColors = tabColorClasses[currentTab.color];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className={cn('bg-gradient-to-r rounded-lg p-6 text-white', currentTab.bgGradient)}>
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
                <BookOpen className="h-8 w-8" />
                Exam Question Bank
              </h1>
              <Badge variant="outline" className="border-white/30 text-white bg-white/10">
                Certification Questions
              </Badge>
            </div>
            <p className="mt-1 opacity-90 text-sm">
              Manage official certification exam questions — independent of individual exam configurations.
            </p>
            <div className="mt-2 flex items-center gap-4 text-sm opacity-80">
              <span>{questions.length} Questions in {currentTab.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const colors = tabColorClasses[tab.color];
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setIsAddingQuestion(false);
                  setEditingQuestionId(null);
                }}
                className={cn(
                  'whitespace-nowrap py-3 px-5 border-b-2 font-medium text-sm transition-colors',
                  isActive
                    ? cn('border-current', colors.tab)
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {tab.label}
                {isActive && (
                  <span className={cn('ml-2 px-2 py-0.5 rounded-full text-xs font-semibold', colors.badge)}>
                    {questions.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Add Question Button */}
      {!isAddingQuestion && !editingQuestionId && (
        <div className="flex justify-end">
          <Button onClick={handleAddQuestion} className={cn(
            currentTab.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
            currentTab.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' :
            currentTab.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
            'bg-rose-600 hover:bg-rose-700'
          )}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question to {currentTab.label}
          </Button>
        </div>
      )}

      {/* Question Form (Add/Edit) - shown inline only for Add New */}
      {isAddingQuestion && (
        <Card className="border-2 border-blue-500 shadow-lg">
          <CardHeader className="bg-blue-50 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Add New Question</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {currentTab.label} — {currentTab.lang === 'ar' ? 'Arabic' : 'English'} Exam
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Language Indicator */}
            <div className={cn(
              'p-3 rounded-lg border-2 flex items-center gap-3',
              currentTab.lang === 'ar' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'
            )}>
              <span className="text-2xl">{currentTab.lang === 'ar' ? '🇸🇦' : '🇬🇧'}</span>
              <div>
                <p className={cn('font-semibold', currentTab.lang === 'ar' ? 'text-emerald-800' : 'text-blue-800')}>
                  {currentTab.lang === 'ar' ? 'امتحان عربي' : 'English Exam'}
                </p>
                <p className="text-sm text-gray-600">
                  {currentTab.lang === 'ar'
                    ? 'جميع الأسئلة والإجابات بالعربية فقط'
                    : 'All questions and answers in English only'}
                </p>
              </div>
            </div>

            {/* Question Text */}
            {currentTab.lang === 'en' ? (
              <div className="space-y-2 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <Label className="text-blue-800 font-semibold">
                  Question Text <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, question_text: e.target.value }))}
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
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, question_text_ar: e.target.value }))}
                  placeholder="أدخل نص السؤال بالعربية"
                  rows={3}
                  dir="rtl"
                  className="bg-white"
                />
              </div>
            )}

            {/* Question Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={questionForm.question_type}
                  onValueChange={(v: any) => setQuestionForm((prev) => ({ ...prev, question_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                    <SelectItem value="multi_select">Multi Select</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={questionForm.difficulty}
                  onValueChange={(v: any) => setQuestionForm((prev) => ({ ...prev, difficulty: v }))}
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
                <Label>Competency Section</Label>
                <Select
                  value={questionForm.competency_section}
                  onValueChange={(v: any) =>
                    setQuestionForm((prev) => ({ ...prev, competency_section: v, competency_name: '' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="behavioral">Behavioural</SelectItem>
                    <SelectItem value="knowledge_based">Knowledge Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {questionForm.competency_section && (
                <div className="space-y-2">
                  <Label>Competency Name</Label>
                  <Select
                    value={questionForm.competency_name}
                    onValueChange={(v) => setQuestionForm((prev) => ({ ...prev, competency_name: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select competency..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(questionForm.competency_section === 'behavioral' || questionForm.competency_section === 'behavioural'
                        ? BDA_COMPETENCIES.behavioral
                        : BDA_COMPETENCIES.knowledge_based
                      ).map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>BoCK Domain</Label>
                <Input
                  value={questionForm.bock_domain}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, bock_domain: e.target.value }))}
                  placeholder="e.g., Business Development Strategy"
                />
              </div>
              <div className="space-y-2">
                <Label>Points</Label>
                <Input
                  type="number"
                  min={1}
                  value={questionForm.points}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            {/* Answers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Answer Options <span className="text-red-500">*</span>
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddAnswer}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Answer
                </Button>
              </div>

              {questionForm.question_type === 'multiple_choice' || questionForm.question_type === 'true_false' ? (
                <RadioGroup
                  value={questionForm.answers.find((a) => a.is_correct)?.tempId || ''}
                  onValueChange={handleSetCorrectAnswer}
                >
                  {questionForm.answers.map((answer, idx) => (
                    <div
                      key={answer.tempId}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border-2 transition-colors',
                        answer.is_correct
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      )}
                    >
                      <RadioGroupItem value={answer.tempId} id={`answer-${answer.tempId}`} className="mt-1" />
                      <div className="flex-1 space-y-2">
                        {currentTab.lang === 'en' ? (
                          <Input
                            value={answer.answer_text}
                            onChange={(e) => handleAnswerChange(answer.tempId, 'answer_text', e.target.value)}
                            placeholder={`Answer ${String.fromCharCode(65 + idx)}`}
                            className="bg-white"
                          />
                        ) : (
                          <Input
                            value={answer.answer_text_ar}
                            onChange={(e) => handleAnswerChange(answer.tempId, 'answer_text_ar', e.target.value)}
                            placeholder={`الإجابة ${idx + 1}`}
                            dir="rtl"
                            className="bg-white"
                          />
                        )}
                        {answer.is_correct && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            Correct Answer
                          </span>
                        )}
                      </div>
                      {questionForm.answers.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAnswer(answer.tempId)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                // Multi-select
                <div className="space-y-2">
                  {questionForm.answers.map((answer, idx) => (
                    <div
                      key={answer.tempId}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border-2 transition-colors',
                        answer.is_correct
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={answer.is_correct}
                        onChange={(e) => handleAnswerChange(answer.tempId, 'is_correct', e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600"
                      />
                      <div className="flex-1 space-y-2">
                        {currentTab.lang === 'en' ? (
                          <Input
                            value={answer.answer_text}
                            onChange={(e) => handleAnswerChange(answer.tempId, 'answer_text', e.target.value)}
                            placeholder={`Answer ${String.fromCharCode(65 + idx)}`}
                            className="bg-white"
                          />
                        ) : (
                          <Input
                            value={answer.answer_text_ar}
                            onChange={(e) => handleAnswerChange(answer.tempId, 'answer_text_ar', e.target.value)}
                            placeholder={`الإجابة ${idx + 1}`}
                            dir="rtl"
                            className="bg-white"
                          />
                        )}
                      </div>
                      {questionForm.answers.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAnswer(answer.tempId)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Explanation */}
            <div className="space-y-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <Label className="text-amber-800 font-semibold">
                Explanation (shown after exam)
              </Label>
              {currentTab.lang === 'en' ? (
                <Textarea
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, explanation: e.target.value }))}
                  placeholder="Explain why the correct answer is right..."
                  rows={2}
                  className="bg-white"
                />
              ) : (
                <Textarea
                  value={questionForm.explanation_ar}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, explanation_ar: e.target.value }))}
                  placeholder="اشرح لماذا الإجابة الصحيحة هي الأنسب..."
                  rows={2}
                  dir="rtl"
                  className="bg-white"
                />
              )}
            </div>

            {/* Save/Cancel Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveQuestion} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                {isSaving ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isAddingQuestion ? 'Create Question' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">No questions yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Add the first question for {currentTab.label}
            </p>
            <Button onClick={handleAddQuestion} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add First Question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((question: any, index: number) => (
            <Card
              key={question.id}
              className={cn(
                'transition-shadow hover:shadow-md',
                editingQuestionId === question.id ? 'ring-2 ring-blue-500' : ''
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Question Number */}
                  <div className={cn(
                    'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white',
                    currentTab.color === 'blue' ? 'bg-blue-500' :
                    currentTab.color === 'emerald' ? 'bg-emerald-500' :
                    currentTab.color === 'purple' ? 'bg-purple-500' :
                    'bg-rose-500'
                  )}>
                    {index + 1}
                  </div>

                  {/* Question Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-medium text-gray-900 mb-2',
                      currentTab.lang === 'ar' ? 'text-right' : ''
                    )} dir={currentTab.lang === 'ar' ? 'rtl' : 'ltr'}>
                      {currentTab.lang === 'ar'
                        ? (question.question_text_ar || question.question_text)
                        : question.question_text}
                    </p>

                    {/* Answers Preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mb-3">
                      {(question.answers || []).slice(0, 4).map((answer: any, aIdx: number) => (
                        <div
                          key={answer.id}
                          className={cn(
                            'flex items-center gap-2 text-sm px-2 py-1 rounded',
                            answer.is_correct
                              ? 'bg-green-100 text-green-800 font-medium'
                              : 'bg-gray-100 text-gray-600'
                          )}
                          dir={currentTab.lang === 'ar' ? 'rtl' : 'ltr'}
                        >
                          {answer.is_correct ? (
                            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                          )}
                          <span className="truncate">
                            {currentTab.lang === 'ar'
                              ? (answer.answer_text_ar || answer.answer_text)
                              : answer.answer_text}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      {question.difficulty && (
                        <Badge variant="outline" className={cn(
                          'text-xs',
                          question.difficulty === 'easy' ? 'border-green-300 text-green-700' :
                          question.difficulty === 'medium' ? 'border-yellow-300 text-yellow-700' :
                          'border-red-300 text-red-700'
                        )}>
                          {question.difficulty}
                        </Badge>
                      )}
                      {question.competency_section && (
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                          {(question.competency_section === 'behavioural' || question.competency_section === 'behavioral') ? 'Behavioural' : 'Knowledge'}
                        </Badge>
                      )}
                      {question.competency_name && (
                        <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                          {question.competency_name}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex-shrink-0 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditQuestion(question, index)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteQuestion(question.id, question.question_text)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Question Dialog (Modal) */}
      <Dialog open={!!editingQuestionId} onOpenChange={(open) => { if (!open) handleCancelEdit(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Edit Question
              <span className="text-sm font-normal text-gray-500 ml-2">{currentTab.label} — {currentTab.lang === 'ar' ? 'Arabic' : 'English'} Exam</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            {/* Language Indicator */}
            <div className={cn(
              'p-3 rounded-lg border-2 flex items-center gap-3',
              currentTab.lang === 'ar' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'
            )}>
              <span className="text-2xl">{currentTab.lang === 'ar' ? '🇸🇦' : '🇬🇧'}</span>
              <div>
                <p className={cn('font-semibold', currentTab.lang === 'ar' ? 'text-emerald-800' : 'text-blue-800')}>
                  {currentTab.lang === 'ar' ? 'امتحان عربي' : 'English Exam'}
                </p>
                <p className="text-sm text-gray-600">
                  {currentTab.lang === 'ar' ? 'جميع الأسئلة والإجابات بالعربية فقط' : 'All questions and answers in English only'}
                </p>
              </div>
            </div>

            {/* Question Text */}
            {currentTab.lang === 'en' ? (
              <div className="space-y-2 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <Label className="text-blue-800 font-semibold">Question Text <span className="text-red-500">*</span></Label>
                <Textarea
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, question_text: e.target.value }))}
                  placeholder="Enter question text in English"
                  rows={4}
                  className="bg-white"
                />
              </div>
            ) : (
              <div className="space-y-2 p-4 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <Label className="text-emerald-800 font-semibold">نص السؤال <span className="text-red-500">*</span></Label>
                <Textarea
                  value={questionForm.question_text_ar}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, question_text_ar: e.target.value }))}
                  placeholder="أدخل نص السؤال بالعربية"
                  rows={4}
                  dir="rtl"
                  className="bg-white"
                />
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={questionForm.question_type} onValueChange={(v: any) => setQuestionForm((prev) => ({ ...prev, question_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                    <SelectItem value="multi_select">Multi Select</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={questionForm.difficulty} onValueChange={(v: any) => setQuestionForm((prev) => ({ ...prev, difficulty: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Competency Section</Label>
                <Select
                  value={questionForm.competency_section}
                  onValueChange={(v: any) => setQuestionForm((prev) => ({ ...prev, competency_section: v, competency_name: '' }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select section..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="behavioral">Behavioural</SelectItem>
                    <SelectItem value="knowledge_based">Knowledge Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {questionForm.competency_section && (
                <div className="space-y-2">
                  <Label>Competency Name</Label>
                  <Select
                    value={questionForm.competency_name}
                    onValueChange={(v) => setQuestionForm((prev) => ({ ...prev, competency_name: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select competency..." /></SelectTrigger>
                    <SelectContent>
                      {(questionForm.competency_section === 'behavioral' || questionForm.competency_section === 'behavioural'
                        ? BDA_COMPETENCIES.behavioral
                        : BDA_COMPETENCIES.knowledge_based
                      ).map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>BoCK Domain</Label>
                <Input
                  value={questionForm.bock_domain}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, bock_domain: e.target.value }))}
                  placeholder="e.g., Business Development Strategy"
                />
              </div>
              <div className="space-y-2">
                <Label>Points</Label>
                <Input
                  type="number" min={1}
                  value={questionForm.points}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            {/* Answers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Answer Options <span className="text-red-500">*</span></Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddAnswer}>
                  <Plus className="h-4 w-4 mr-1" />Add Answer
                </Button>
              </div>
              {questionForm.question_type === 'multiple_choice' || questionForm.question_type === 'true_false' ? (
                <RadioGroup
                  value={questionForm.answers.find((a) => a.is_correct)?.tempId || ''}
                  onValueChange={handleSetCorrectAnswer}
                >
                  {questionForm.answers.map((answer, idx) => (
                    <div key={answer.tempId} className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border-2 transition-colors',
                      answer.is_correct ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'
                    )}>
                      <RadioGroupItem value={answer.tempId} id={`edit-answer-${answer.tempId}`} className="mt-1" />
                      <div className="flex-1 space-y-2">
                        {currentTab.lang === 'en' ? (
                          <Input
                            value={answer.answer_text}
                            onChange={(e) => handleAnswerChange(answer.tempId, 'answer_text', e.target.value)}
                            placeholder={`Answer ${String.fromCharCode(65 + idx)}`}
                            className="bg-white"
                          />
                        ) : (
                          <Input
                            value={answer.answer_text_ar}
                            onChange={(e) => handleAnswerChange(answer.tempId, 'answer_text_ar', e.target.value)}
                            placeholder={`الإجابة ${idx + 1}`}
                            dir="rtl"
                            className="bg-white"
                          />
                        )}
                        {answer.is_correct && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                            <CheckCircle2 className="h-3 w-3" />Correct Answer
                          </span>
                        )}
                      </div>
                      {questionForm.answers.length > 2 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveAnswer(answer.tempId)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-2">
                  {questionForm.answers.map((answer, idx) => (
                    <div key={answer.tempId} className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border-2 transition-colors',
                      answer.is_correct ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'
                    )}>
                      <input type="checkbox" checked={answer.is_correct} onChange={(e) => handleAnswerChange(answer.tempId, 'is_correct', e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600" />
                      <div className="flex-1">
                        {currentTab.lang === 'en' ? (
                          <Input value={answer.answer_text} onChange={(e) => handleAnswerChange(answer.tempId, 'answer_text', e.target.value)} placeholder={`Answer ${String.fromCharCode(65 + idx)}`} className="bg-white" />
                        ) : (
                          <Input value={answer.answer_text_ar} onChange={(e) => handleAnswerChange(answer.tempId, 'answer_text_ar', e.target.value)} placeholder={`الإجابة ${idx + 1}`} dir="rtl" className="bg-white" />
                        )}
                      </div>
                      {questionForm.answers.length > 2 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveAnswer(answer.tempId)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Explanation */}
            <div className="space-y-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <Label className="text-amber-800 font-semibold">Explanation (shown after exam)</Label>
              {currentTab.lang === 'en' ? (
                <Textarea value={questionForm.explanation} onChange={(e) => setQuestionForm((prev) => ({ ...prev, explanation: e.target.value }))} placeholder="Explain why the correct answer is right..." rows={2} className="bg-white" />
              ) : (
                <Textarea value={questionForm.explanation_ar} onChange={(e) => setQuestionForm((prev) => ({ ...prev, explanation_ar: e.target.value }))} placeholder="اشرح لماذا الإجابة الصحيحة هي الأنسب..." rows={2} dir="rtl" className="bg-white" />
              )}
            </div>

            {/* Save/Cancel */}
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />Cancel
              </Button>
              <Button onClick={handleSaveQuestion} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                {isSaving ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
