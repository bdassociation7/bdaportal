/**
 * TrainerGateLessons — Admin page to manage Trainer Learning Centre lessons
 * Route: /admin/trainer-gate/lessons?module=<uuid>
 * Uses instructor_curriculum_lessons table
 * Includes TipTap rich-text editor for lesson content
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Eye, EyeOff, ArrowLeft,
  BookOpen, CheckCircle, FileText, Clock, GraduationCap,
  ChevronDown, Save, X,
} from 'lucide-react';
import { supabase } from '@/shared/config/supabase.config';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { RichTextEditor } from '@/features/curriculum/admin/components/RichTextEditor';
import type { RichContent } from '@/entities/curriculum';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrainerLesson {
  id: string;
  module_id: string;
  order_index: number;
  title: string;
  content: RichContent | null;
  duration_min: number | null;
  is_published: boolean;
  created_at: string;
}

interface TrainerModule {
  id: string;
  title: string;
  order_index: number;
}

// ─── Lesson Form (inline editor) ─────────────────────────────────────────────
function LessonEditorPanel({
  lesson,
  moduleId,
  onClose,
  onSaved,
}: {
  lesson: TrainerLesson | null;
  moduleId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: lesson?.title || '',
    order_index: lesson?.order_index || 1,
    duration_min: lesson?.duration_min || 30,
    is_published: lesson?.is_published ?? false,
    content: lesson?.content || null as RichContent | null,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (lesson?.id) {
        const { error } = await supabase
          .from('instructor_curriculum_lessons')
          .update({
            title: form.title.trim(),
            order_index: form.order_index,
            duration_min: form.duration_min || null,
            is_published: form.is_published,
            content: form.content,
            updated_at: new Date().toISOString(),
          })
          .eq('id', lesson.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('instructor_curriculum_lessons')
          .insert({
            module_id: moduleId,
            title: form.title.trim(),
            order_index: form.order_index,
            duration_min: form.duration_min || null,
            is_published: form.is_published,
            content: form.content,
          });
        if (error) throw error;
      }
      toast({ title: lesson ? 'Lesson updated' : 'Lesson created', description: form.title });
      onSaved();
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}>
          <h2 className="text-lg font-bold text-white">
            {lesson ? 'Edit Lesson' : 'New Lesson'}
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form fields */}
        <div className="px-6 pt-5 pb-3 flex-shrink-0 border-b border-gray-100">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Lesson Title *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f91e0]"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Introduction to BDA"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Order</label>
              <input
                type="number"
                min={1}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f91e0]"
                value={form.order_index}
                onChange={e => setForm(f => ({ ...f, order_index: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Duration (min)</label>
              <input
                type="number"
                min={1}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f91e0]"
                value={form.duration_min}
                onChange={e => setForm(f => ({ ...f, duration_min: parseInt(e.target.value) || 30 }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <input
              type="checkbox"
              id="lesson_published"
              checked={form.is_published}
              onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="lesson_published" className="text-sm font-medium text-gray-700">
              Published (visible to instructors)
            </label>
          </div>
        </div>

        {/* Rich Text Editor */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Lesson Content</label>
          <RichTextEditor
            content={form.content}
            onChange={content => setForm(f => ({ ...f, content }))}
            placeholder="Write the lesson content here..."
            dir="ltr"
          />
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
            {saving ? 'Saving...' : lesson ? 'Save Changes' : 'Create Lesson'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TrainerGateLessons() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const moduleId = searchParams.get('module') || '';
  const [editingLesson, setEditingLesson] = useState<TrainerLesson | null | 'new'>('new' as any);
  const [showEditor, setShowEditor] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');

  // Fetch current module info
  const { data: module } = useQuery<TrainerModule>({
    queryKey: ['trainer-gate-module', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructor_curriculum_modules')
        .select('id, title, order_index')
        .eq('id', moduleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });

  // Fetch all modules for the dropdown selector
  const { data: allModules = [] } = useQuery<TrainerModule[]>({
    queryKey: ['trainer-gate-all-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructor_curriculum_modules')
        .select('id, title, order_index')
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch lessons for this module
  const { data: lessons = [], isLoading, refetch } = useQuery<TrainerLesson[]>({
    queryKey: ['trainer-gate-lessons', moduleId, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('instructor_curriculum_lessons')
        .select('*')
        .eq('module_id', moduleId)
        .order('order_index', { ascending: true });
      if (filterStatus === 'published') query = query.eq('is_published', true);
      if (filterStatus === 'draft') query = query.eq('is_published', false);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!moduleId,
  });

  const togglePublish = async (lesson: TrainerLesson) => {
    const { error } = await supabase
      .from('instructor_curriculum_lessons')
      .update({ is_published: !lesson.is_published, updated_at: new Date().toISOString() })
      .eq('id', lesson.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: lesson.is_published ? 'Lesson unpublished' : 'Lesson published' });
      refetch();
    }
  };

  const deleteLesson = async (lesson: TrainerLesson) => {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return;
    const { error } = await supabase
      .from('instructor_curriculum_lessons')
      .delete()
      .eq('id', lesson.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Lesson deleted' });
      refetch();
    }
  };

  const totalLessons = lessons.length;
  const publishedLessons = lessons.filter(l => l.is_published).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="mx-6 mt-6 rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/trainer-gate/modules')}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-white/60 text-xs mb-1">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Trainer Gate</span>
                  <span>›</span>
                  <span>Modules</span>
                  <span>›</span>
                  <span className="text-white/90">{module?.title || 'Lessons'}</span>
                </div>
                <h1 className="text-2xl font-bold">Trainer Gate — Lessons</h1>
                <p className="text-white/70 text-sm mt-0.5">
                  Manage lessons for: <span className="text-white font-semibold">{module?.title || '...'}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Module switcher */}
              {allModules.length > 0 && (
                <div className="relative">
                  <select
                    value={moduleId}
                    onChange={e => navigate(`/admin/trainer-gate/lessons?module=${e.target.value}`)}
                    className="appearance-none bg-white/10 border border-white/20 text-white text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
                  >
                    {allModules.map(m => (
                      <option key={m.id} value={m.id} className="text-gray-900 bg-white">
                        Module {m.order_index}: {m.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70 pointer-events-none" />
                </div>
              )}
              <Button
                onClick={() => { setEditingLesson(null); setShowEditor(true); }}
                disabled={!moduleId}
                className="flex items-center gap-2 bg-white text-[#0d1f4e] hover:bg-white/90 font-semibold"
              >
                <Plus className="h-4 w-4" />
                Add Lesson
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Lessons', value: totalLessons, icon: BookOpen, color: '#0f91e0' },
            { label: 'Published', value: publishedLessons, icon: CheckCircle, color: '#16a34a' },
            { label: 'Drafts', value: totalLessons - publishedLessons, icon: FileText, color: '#d97706' },
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

        {/* No module selected */}
        {!moduleId && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No module selected</p>
            <p className="text-gray-400 text-sm mt-1">Please select a module from the Modules page.</p>
            <Button
              onClick={() => navigate('/admin/trainer-gate/modules')}
              className="mt-4"
              style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)', color: '#fff' }}
            >
              Go to Modules
            </Button>
          </div>
        )}

        {moduleId && (
          <>
            {/* Filter */}
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

            {/* Lessons Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Lesson Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Duration</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Content</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">Loading lessons...</td>
                    </tr>
                  ) : lessons.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500 font-medium">No lessons yet</p>
                        <p className="text-gray-400 text-sm mt-1">Add the first lesson to this module.</p>
                      </td>
                    </tr>
                  ) : (
                    lessons.map(lesson => (
                      <tr key={lesson.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="w-8 h-8 rounded-full bg-[#f0f6ff] text-[#0f91e0] flex items-center justify-center text-sm font-bold">
                            {lesson.order_index}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 text-sm">{lesson.title}</p>
                        </td>
                        <td className="px-4 py-3">
                          {lesson.duration_min ? (
                            <span className="flex items-center gap-1 text-sm text-gray-500">
                              <Clock className="h-3.5 w-3.5" />
                              {lesson.duration_min} min
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {lesson.content ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              <CheckCircle className="h-3 w-3" />
                              Has content
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Empty</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            lesson.is_published
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {lesson.is_published ? <CheckCircle className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                            {lesson.is_published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => togglePublish(lesson)}
                              title={lesson.is_published ? 'Unpublish' : 'Publish'}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                            >
                              {lesson.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => { setEditingLesson(lesson); setShowEditor(true); }}
                              title="Edit"
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteLesson(lesson)}
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
          </>
        )}
      </div>

      {/* Lesson Editor Dialog */}
      {showEditor && (
        <LessonEditorPanel
          lesson={editingLesson as TrainerLesson | null}
          moduleId={moduleId}
          onClose={() => setShowEditor(false)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}
