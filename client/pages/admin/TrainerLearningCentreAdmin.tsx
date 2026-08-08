/**
 * Admin — Trainer Learning Centre Management
 * Route: /admin/trainer-learning-centre
 *
 * Allows admins to:
 * - View all 6 modules and their lessons
 * - Publish/unpublish modules and lessons
 * - Edit lesson titles and duration
 * - Add new lessons to any module
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookMarked,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Eye,
  EyeOff,
  Clock,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { supabase } from '@/shared/config/supabase.config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Module {
  id: string;
  order_index: number;
  title: string;
  description: string;
  is_published: boolean;
}

interface Lesson {
  id: string;
  module_id: string;
  order_index: number;
  title: string;
  duration_min: number | null;
  is_published: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TrainerLearningCentreAdmin() {
  const queryClient = useQueryClient();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [addLessonModuleId, setAddLessonModuleId] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState({ title: '', duration_min: '' });
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // ── Fetch modules ────────────────────────────────────────────────────────
  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['admin-trainer-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructor_curriculum_modules')
        .select('*')
        .order('order_index');
      if (error) throw error;
      return data as Module[];
    },
  });

  // ── Fetch all lessons ────────────────────────────────────────────────────
  const { data: allLessons = [] } = useQuery({
    queryKey: ['admin-trainer-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructor_curriculum_lessons')
        .select('id, module_id, order_index, title, duration_min, is_published')
        .order('order_index');
      if (error) throw error;
      return data as Lesson[];
    },
  });

  const lessonsForModule = (moduleId: string) =>
    allLessons.filter(l => l.module_id === moduleId);

  // ── Toggle module published ──────────────────────────────────────────────
  const toggleModule = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from('instructor_curriculum_modules')
        .update({ is_published, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-trainer-modules'] }),
  });

  // ── Toggle lesson published ──────────────────────────────────────────────
  const toggleLesson = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from('instructor_curriculum_lessons')
        .update({ is_published, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-trainer-lessons'] }),
  });

  // ── Add lesson ───────────────────────────────────────────────────────────
  const addLesson = useMutation({
    mutationFn: async ({ moduleId, title, duration_min }: { moduleId: string; title: string; duration_min: number | null }) => {
      const existingLessons = lessonsForModule(moduleId);
      const nextOrder = existingLessons.length + 1;
      const { error } = await supabase
        .from('instructor_curriculum_lessons')
        .insert({ module_id: moduleId, order_index: nextOrder, title, duration_min, is_published: false });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainer-lessons'] });
      setAddLessonModuleId(null);
      setNewLesson({ title: '', duration_min: '' });
    },
  });

  // ── Update lesson ────────────────────────────────────────────────────────
  const updateLesson = useMutation({
    mutationFn: async ({ id, title, duration_min }: { id: string; title: string; duration_min: number | null }) => {
      const { error } = await supabase
        .from('instructor_curriculum_lessons')
        .update({ title, duration_min, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainer-lessons'] });
      setEditingLesson(null);
    },
  });

  const toggleExpand = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const totalLessons = allLessons.length;
  const publishedLessons = allLessons.filter(l => l.is_published).length;
  const publishedModules = modules.filter(m => m.is_published).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}
      >
        <div className="flex items-center gap-3">
          <BookMarked className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Trainer Learning Centre</h1>
            <p className="mt-1 opacity-80 text-sm">
              Manage instructor-exclusive curriculum — modules, lessons, and content
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[#0d1f4e]">{modules.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total Modules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{publishedModules}</p>
            <p className="text-xs text-slate-400 mt-0.5">Published Modules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[#0f91e0]">{publishedLessons}/{totalLessons}</p>
            <p className="text-xs text-slate-400 mt-0.5">Published Lessons</p>
          </CardContent>
        </Card>
      </div>

      {/* Modules */}
      <Card>
        <CardHeader>
          <CardTitle>Curriculum Structure</CardTitle>
          <CardDescription>
            Click a module to expand its lessons. Toggle publish status to control visibility for instructors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#0f91e0]" />
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map(mod => {
                const lessons = lessonsForModule(mod.id);
                const isExpanded = expandedModules.has(mod.id);
                const publishedCount = lessons.filter(l => l.is_published).length;

                return (
                  <div key={mod.id} className="border border-[#dbeafe] rounded-xl overflow-hidden">
                    {/* Module row */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-[#f8faff]">
                      <button
                        onClick={() => toggleExpand(mod.id)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#0f91e0] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {mod.order_index}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#0d1f4e] text-sm">{mod.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {lessons.length} lesson{lessons.length !== 1 ? 's' : ''} · {publishedCount} published
                          </p>
                        </div>
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4 text-slate-400" />
                          : <ChevronRight className="w-4 h-4 text-slate-400" />
                        }
                      </button>

                      <Badge
                        variant="outline"
                        className={mod.is_published
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs'
                          : 'bg-slate-50 text-slate-400 border-slate-200 text-xs'
                        }
                      >
                        {mod.is_published ? 'Published' : 'Draft'}
                      </Badge>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleModule.mutate({ id: mod.id, is_published: !mod.is_published })}
                        className="text-xs"
                      >
                        {mod.is_published
                          ? <><EyeOff className="w-3.5 h-3.5 mr-1" />Unpublish</>
                          : <><Eye className="w-3.5 h-3.5 mr-1" />Publish</>
                        }
                      </Button>
                    </div>

                    {/* Lessons */}
                    {isExpanded && (
                      <div className="border-t border-[#dbeafe]">
                        {lessons.length === 0 ? (
                          <p className="text-xs text-slate-400 px-4 py-3 italic">No lessons yet</p>
                        ) : (
                          lessons.map(lesson => (
                            <div
                              key={lesson.id}
                              className="flex items-center gap-3 px-4 py-2.5 border-b border-[#f0f6ff] last:border-0 hover:bg-[#f8faff]"
                            >
                              <div className="w-6 h-6 rounded bg-[#f0f6ff] text-[#1C4A8B] flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {lesson.order_index}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#0d1f4e] truncate">{lesson.title}</p>
                                {lesson.duration_min && (
                                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3" />
                                    {lesson.duration_min} min
                                  </p>
                                )}
                              </div>
                              <Badge
                                variant="outline"
                                className={lesson.is_published
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs'
                                  : 'bg-amber-50 text-amber-600 border-amber-200 text-xs'
                                }
                              >
                                {lesson.is_published ? 'Published' : 'Draft'}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingLesson(lesson)}
                                className="text-xs"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleLesson.mutate({ id: lesson.id, is_published: !lesson.is_published })}
                                className="text-xs"
                              >
                                {lesson.is_published
                                  ? <EyeOff className="w-3.5 h-3.5" />
                                  : <Eye className="w-3.5 h-3.5" />
                                }
                              </Button>
                            </div>
                          ))
                        )}

                        {/* Add lesson */}
                        {addLessonModuleId === mod.id ? (
                          <div className="flex items-center gap-2 px-4 py-3 bg-[#f0f6ff] border-t border-[#dbeafe]">
                            <Input
                              placeholder="Lesson title..."
                              value={newLesson.title}
                              onChange={e => setNewLesson({ ...newLesson, title: e.target.value })}
                              className="flex-1 h-8 text-sm"
                              autoFocus
                            />
                            <Input
                              placeholder="Min"
                              type="number"
                              value={newLesson.duration_min}
                              onChange={e => setNewLesson({ ...newLesson, duration_min: e.target.value })}
                              className="w-20 h-8 text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={() => addLesson.mutate({
                                moduleId: mod.id,
                                title: newLesson.title,
                                duration_min: newLesson.duration_min ? parseInt(newLesson.duration_min) : null,
                              })}
                              disabled={!newLesson.title || addLesson.isPending}
                              className="h-8"
                              style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setAddLessonModuleId(null)}
                              className="h-8"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddLessonModuleId(mod.id)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-[#0f91e0] font-semibold hover:bg-[#f0f6ff] transition-colors border-t border-[#f0f6ff]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Lesson
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Lesson Dialog */}
      <Dialog open={!!editingLesson} onOpenChange={() => setEditingLesson(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
          </DialogHeader>
          {editingLesson && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Lesson Title</Label>
                <Input
                  value={editingLesson.title}
                  onChange={e => setEditingLesson({ ...editingLesson, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={editingLesson.duration_min || ''}
                  onChange={e => setEditingLesson({ ...editingLesson, duration_min: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="e.g. 15"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLesson(null)}>Cancel</Button>
            <Button
              onClick={() => editingLesson && updateLesson.mutate({
                id: editingLesson.id,
                title: editingLesson.title,
                duration_min: editingLesson.duration_min,
              })}
              disabled={updateLesson.isPending}
              style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}
              className="text-white"
            >
              {updateLesson.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
