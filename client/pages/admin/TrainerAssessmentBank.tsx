/**
 * TrainerAssessmentBank — Admin page to manage Trainer Assessment questions
 * Route: /admin/trainer-gate/assessment
 * Uses instructor_assessment_questions table
 * ONE comprehensive assessment covering all 5 modules — no per-module linking
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Edit, Trash2, Eye, EyeOff,
  CheckCircle, FileText, HelpCircle,
  Save, X,
} from 'lucide-react';
import { supabase } from '@/shared/config/supabase.config';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AssessmentQuestion {
  id: string;
  order_index: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  rationale: string | null;
  is_published: boolean;
  created_at: string;
}

// ─── Question Form Dialog ─────────────────────────────────────────────────────
function QuestionFormDialog({
  question,
  nextOrder,
  onClose,
  onSaved,
}: {
  question: AssessmentQuestion | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    order_index: question?.order_index ?? nextOrder,
    question_text: question?.question_text || '',
    option_a: question?.option_a || '',
    option_b: question?.option_b || '',
    option_c: question?.option_c || '',
    option_d: question?.option_d || '',
    correct_answer: (question?.correct_answer || 'A') as 'A' | 'B' | 'C' | 'D',
    rationale: question?.rationale || '',
    is_published: question?.is_published ?? false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.question_text.trim()) {
      toast({ title: 'Question text is required', variant: 'destructive' });
      return;
    }
    if (!form.option_a.trim() || !form.option_b.trim() || !form.option_c.trim() || !form.option_d.trim()) {
      toast({ title: 'All four options are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        module_id: null,          // no module link — global assessment
        order_index: form.order_index,
        question_text: form.question_text.trim(),
        option_a: form.option_a.trim(),
        option_b: form.option_b.trim(),
        option_c: form.option_c.trim(),
        option_d: form.option_d.trim(),
        correct_answer: form.correct_answer,
        rationale: form.rationale.trim() || null,
        is_published: form.is_published,
      };
      if (question?.id) {
        const { error } = await supabase
          .from('instructor_assessment_questions')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', question.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('instructor_assessment_questions')
          .insert(payload);
        if (error) throw error;
      }
      toast({ title: question ? 'Question updated' : 'Question created' });
      onSaved();
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const optionLabels = ['A', 'B', 'C', 'D'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}>
          <div>
            <h2 className="text-lg font-bold text-white">
              {question ? 'Edit Question' : 'New Assessment Question'}
            </h2>
            <p className="text-white/60 text-xs mt-0.5">Comprehensive Trainer Assessment — covers all modules</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Order only */}
          <div className="w-32">
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Question Order</label>
            <input
              type="number"
              min={1}
              value={form.order_index}
              onChange={e => setForm(f => ({ ...f, order_index: parseInt(e.target.value) || 1 }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f91e0]"
            />
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Question *</label>
            <textarea
              rows={3}
              value={form.question_text}
              onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f91e0] resize-none"
              placeholder="Enter the question text..."
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Answer Options *</label>
            {optionLabels.map(label => {
              const key = `option_${label.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d';
              const isCorrect = form.correct_answer === label;
              return (
                <div key={label} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  isCorrect ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-gray-50'
                }`}>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, correct_answer: label }))}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                      isCorrect
                        ? 'bg-green-500 text-white'
                        : 'bg-white border-2 border-gray-300 text-gray-500 hover:border-[#0f91e0]'
                    }`}
                    title={`Mark ${label} as correct`}
                  >
                    {label}
                  </button>
                  <input
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400"
                    placeholder={`Option ${label}...`}
                  />
                  {isCorrect && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                </div>
              );
            })}
            <p className="text-xs text-gray-400">Click the letter button to mark the correct answer.</p>
          </div>

          {/* Rationale */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Rationale (optional)</label>
            <textarea
              rows={2}
              value={form.rationale}
              onChange={e => setForm(f => ({ ...f, rationale: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f91e0] resize-none"
              placeholder="Explain why the correct answer is correct..."
            />
          </div>

          {/* Published */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="q_published"
              checked={form.is_published}
              onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="q_published" className="text-sm font-medium text-gray-700">
              Published (visible to instructors)
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)', color: '#fff' }}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : question ? 'Save Changes' : 'Create Question'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TrainerAssessmentBank() {
  const { toast } = useToast();
  const [editingQuestion, setEditingQuestion] = useState<AssessmentQuestion | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');

  // Fetch questions (no module filter — global assessment)
  const { data: questions = [], isLoading, refetch } = useQuery<AssessmentQuestion[]>({
    queryKey: ['trainer-assessment-questions', filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('instructor_assessment_questions')
        .select('*')
        .order('order_index', { ascending: true });
      if (filterStatus === 'published') query = query.eq('is_published', true);
      if (filterStatus === 'draft') query = query.eq('is_published', false);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const togglePublish = async (q: AssessmentQuestion) => {
    const { error } = await supabase
      .from('instructor_assessment_questions')
      .update({ is_published: !q.is_published, updated_at: new Date().toISOString() })
      .eq('id', q.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: q.is_published ? 'Question unpublished' : 'Question published' });
      refetch();
    }
  };

  const deleteQuestion = async (q: AssessmentQuestion) => {
    if (!confirm('Delete this question?')) return;
    const { error } = await supabase
      .from('instructor_assessment_questions')
      .delete()
      .eq('id', q.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Question deleted' });
      refetch();
    }
  };

  const totalQ = questions.length;
  const publishedQ = questions.filter(q => q.is_published).length;
  const nextOrder = totalQ + 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="mx-6 mt-6 rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-8 w-8 text-white/80" />
            <div>
              <h1 className="text-2xl font-bold">Trainer Gate — Assessment Bank</h1>
              <p className="text-white/70 text-sm mt-0.5">
                Comprehensive MCQ assessment covering all Trainer Learning Centre modules.
              </p>
            </div>
          </div>
          <Button
            onClick={() => { setEditingQuestion(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-white text-[#0d1f4e] hover:bg-white/90 font-semibold"
          >
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-[#0f91e0] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            This is a <strong>single comprehensive assessment</strong> that covers all five Trainer Learning Centre modules.
            Questions are not linked to individual modules — the assessment evaluates overall instructor readiness.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Questions', value: totalQ, icon: HelpCircle, color: '#0f91e0' },
            { label: 'Published', value: publishedQ, icon: CheckCircle, color: '#16a34a' },
            { label: 'Drafts', value: totalQ - publishedQ, icon: FileText, color: '#d97706' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: `${stat.color}15` }}>
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          {(['all', 'published', 'draft'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filterStatus === f
                  ? 'bg-[#0f91e0] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#0f91e0]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Questions Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Question</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Answer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">Loading questions...</td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <HelpCircle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No questions yet</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Add MCQ questions to build the comprehensive instructor assessment.
                    </p>
                    <Button
                      onClick={() => { setEditingQuestion(null); setShowForm(true); }}
                      className="mt-4 flex items-center gap-2 mx-auto"
                      style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)', color: '#fff' }}
                    >
                      <Plus className="h-4 w-4" />
                      Add First Question
                    </Button>
                  </td>
                </tr>
              ) : (
                questions.map((q, idx) => (
                  <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-[#f0f6ff] text-[#0f91e0] flex items-center justify-center text-sm font-bold">
                        {q.order_index}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm line-clamp-2">{q.question_text}</p>
                      {q.rationale && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          <span className="font-semibold">Rationale:</span> {q.rationale}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-700 font-bold text-sm">
                        {q.correct_answer}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        q.is_published
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {q.is_published ? <CheckCircle className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        {q.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => togglePublish(q)}
                          title={q.is_published ? 'Unpublish' : 'Publish'}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          {q.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => { setEditingQuestion(q); setShowForm(true); }}
                          title="Edit"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteQuestion(q)}
                          title="Delete"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Dialog */}
      {showForm && (
        <QuestionFormDialog
          question={editingQuestion}
          nextOrder={nextOrder}
          onClose={() => setShowForm(false)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}
