/**
 * TrainerGateModules — Admin page to manage Trainer Learning Centre modules
 * Route: /admin/trainer-gate/modules
 * Mirrors the CurriculumModuleManager but uses instructor_curriculum_modules table
 * Includes TipTap editor for module introduction content
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Eye, EyeOff, GraduationCap,
  BookOpen, CheckCircle, FileText, ChevronRight, Clock, Save, X,
} from 'lucide-react';
import { supabase } from '@/shared/config/supabase.config';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { RichTextEditor } from '@/features/curriculum/admin/components/RichTextEditor';
import type { RichContent } from '@/entities/curriculum';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrainerModule {
  id: string;
  order_index: number;
  title: string;
  description: string | null;
  intro_content: RichContent | null;
  is_published: boolean;
  estimated_duration_hours: number | null;
  created_at: string;
  lesson_count?: number;
}

// ─── Module Form Dialog ───────────────────────────────────────────────────────
function ModuleFormDialog({
  module,
  onClose,
  onSaved,
}: {
  module: TrainerModule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: module?.title || '',
    description: module?.description || '',
    order_index: module?.order_index || 1,
    estimated_duration_hours: module?.estimated_duration_hours || 1,
    is_published: module?.is_published ?? false,
    intro_content: module?.intro_content || null as RichContent | null,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        order_index: form.order_index,
        estimated_duration_hours: form.estimated_duration_hours,
        is_published: form.is_published,
        intro_content: form.intro_content,
      };
      if (module?.id) {
        const { error } = await supabase
          .from('instructor_curriculum_modules')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', module.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('instructor_curriculum_modules')
          .insert(payload);
        if (error) throw error;
      }
      toast({ title: module ? 'Module updated' : 'Module created', description: form.title });
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}>
          <h2 className="text-lg font-bold text-white">
            {module ? 'Edit Module' : 'New Trainer Module'}
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Module Title *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f91e0]"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. BDA Orientation"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Short Description</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f91e0] resize-none"
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief one-line description shown in the module list..."
            />
          </div>

          {/* Order & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Order Index</label>
              <input
                type="number"
                min={1}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f91e0]"
                value={form.order_index}
                onChange={e => setForm(f => ({ ...f, order_index: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Duration (hours)</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f91e0]"
                value={form.estimated_duration_hours}
                onChange={e => setForm(f => ({ ...f, estimated_duration_hours: parseFloat(e.target.value) || 1 }))}
              />
            </div>
          </div>

          {/* Module Introduction — TipTap editor */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
              Module Introduction
              <span className="ml-2 text-gray-400 font-normal normal-case">
                — shown at the top of the module page before the lessons
              </span>
            </label>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <RichTextEditor
                content={form.intro_content}
                onChange={content => setForm(f => ({ ...f, intro_content: content }))}
                placeholder="Write a module introduction — objectives, overview, what instructors will learn..."
                dir="ltr"
              />
            </div>
          </div>

          {/* Published */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_published_mod"
              checked={form.is_published}
              onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="is_published_mod" className="text-sm font-medium text-gray-700">
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
            {saving ? 'Saving...' : module ? 'Save Changes' : 'Create Module'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TrainerGateModules() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [editingModule, setEditingModule] = useState<TrainerModule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');

  // Fetch modules
  const { data: modules = [], isLoading, refetch } = useQuery<TrainerModule[]>({
    queryKey: ['trainer-gate-modules', filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('instructor_curriculum_modules')
        .select('*, instructor_curriculum_lessons(count)')
        .order('order_index', { ascending: true });
      if (filterStatus === 'published') query = query.eq('is_published', true);
      if (filterStatus === 'draft') query = query.eq('is_published', false);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((m: any) => ({
        ...m,
        lesson_count: m.instructor_curriculum_lessons?.[0]?.count || 0,
      }));
    },
  });

  // Toggle publish
  const togglePublish = async (mod: TrainerModule) => {
    const { error } = await supabase
      .from('instructor_curriculum_modules')
      .update({ is_published: !mod.is_published })
      .eq('id', mod.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: mod.is_published ? 'Module unpublished' : 'Module published' });
      refetch();
    }
  };

  // Delete module
  const deleteModule = async (mod: TrainerModule) => {
    if (!confirm(`Delete "${mod.title}"? This will also delete all its lessons.`)) return;
    const { error } = await supabase
      .from('instructor_curriculum_modules')
      .delete()
      .eq('id', mod.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Module deleted' });
      refetch();
    }
  };

  const totalModules = modules.length;
  const publishedModules = modules.filter(m => m.is_published).length;
  const draftModules = modules.filter(m => !m.is_published).length;
  const totalLessons = modules.reduce((sum, m) => sum + (m.lesson_count || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="mx-6 mt-6 rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-white/80" />
            <div>
              <h1 className="text-2xl font-bold">Trainer Gate — Modules</h1>
              <p className="text-white/70 text-sm mt-0.5">
                Manage Trainer Learning Centre modules — exclusive content for BDA instructors.
              </p>
            </div>
          </div>
          <Button
            onClick={() => { setEditingModule(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-white text-[#0d1f4e] hover:bg-white/90 font-semibold"
          >
            <Plus className="h-4 w-4" />
            Add Module
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Modules', value: totalModules, icon: BookOpen, color: '#0f91e0' },
            { label: 'Published', value: publishedModules, icon: CheckCircle, color: '#16a34a' },
            { label: 'Drafts', value: draftModules, icon: FileText, color: '#d97706' },
            { label: 'Total Lessons', value: totalLessons, icon: FileText, color: '#7c3aed' },
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

        {/* Modules Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Module Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Lessons</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Intro</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">Loading modules...</td>
                </tr>
              ) : modules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <GraduationCap className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No modules yet</p>
                    <p className="text-gray-400 text-sm mt-1">Create your first Trainer Learning Centre module.</p>
                  </td>
                </tr>
              ) : (
                modules.map(mod => (
                  <tr key={mod.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-[#f0f6ff] text-[#0f91e0] flex items-center justify-center text-sm font-bold">
                        {mod.order_index}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-sm">{mod.title}</p>
                      {mod.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{mod.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{mod.lesson_count || 0} lessons</span>
                    </td>
                    <td className="px-4 py-3">
                      {mod.intro_content ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="h-3 w-3" />
                          Added
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {mod.estimated_duration_hours ? (
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          {mod.estimated_duration_hours}h
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        mod.is_published
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {mod.is_published ? <CheckCircle className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        {mod.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/admin/trainer-gate/lessons?module=${mod.id}`)}
                          title="Manage Lessons"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#0f91e0] transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => togglePublish(mod)}
                          title={mod.is_published ? 'Unpublish' : 'Publish'}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          {mod.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => { setEditingModule(mod); setShowForm(true); }}
                          title="Edit"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteModule(mod)}
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
        <ModuleFormDialog
          module={editingModule}
          onClose={() => setShowForm(false)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}
