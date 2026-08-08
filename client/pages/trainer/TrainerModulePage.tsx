/**
 * Trainer Learning Centre — Module Detail Page
 * Route: /trainer/learning-centre/module/:moduleId
 *
 * Shows module info + list of lessons.
 * Clicking a lesson opens the lesson content.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookMarked,
  Clock,
  ChevronRight,
  ChevronDown,
  FileText,
  Loader2,
  Lock,
} from 'lucide-react';
import { supabase } from '@/shared/config/supabase.config';

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
  order_index: number;
  title: string;
  content: any;
  duration_min: number | null;
  is_published: boolean;
}

// ─── Lesson Content Renderer ──────────────────────────────────────────────────
function LessonContent({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const hasContent = lesson.content && (
    (lesson.content.content && lesson.content.content.length > 0) ||
    (typeof lesson.content === 'string' && lesson.content.trim().length > 0)
  );

  // Render TipTap JSON content as HTML
  function renderTipTap(node: any): string {
    if (!node) return '';
    if (node.type === 'doc') {
      return (node.content || []).map(renderTipTap).join('');
    }
    if (node.type === 'paragraph') {
      const inner = (node.content || []).map(renderTipTap).join('');
      return `<p class="mb-3 text-slate-700 leading-relaxed">${inner || '&nbsp;'}</p>`;
    }
    if (node.type === 'heading') {
      const inner = (node.content || []).map(renderTipTap).join('');
      const level = node.attrs?.level || 2;
      const cls = level === 1 ? 'text-xl font-bold text-[#0d1f4e] mt-6 mb-3' :
                  level === 2 ? 'text-lg font-bold text-[#0d1f4e] mt-5 mb-2' :
                                'text-base font-semibold text-[#0d1f4e] mt-4 mb-2';
      return `<h${level} class="${cls}">${inner}</h${level}>`;
    }
    if (node.type === 'bulletList') {
      return `<ul class="list-disc pl-5 mb-3 space-y-1">${(node.content || []).map(renderTipTap).join('')}</ul>`;
    }
    if (node.type === 'orderedList') {
      return `<ol class="list-decimal pl-5 mb-3 space-y-1">${(node.content || []).map(renderTipTap).join('')}</ol>`;
    }
    if (node.type === 'listItem') {
      return `<li class="text-slate-700">${(node.content || []).map(renderTipTap).join('')}</li>`;
    }
    if (node.type === 'text') {
      let text = node.text || '';
      if (node.marks) {
        node.marks.forEach((mark: any) => {
          if (mark.type === 'bold') text = `<strong>${text}</strong>`;
          if (mark.type === 'italic') text = `<em>${text}</em>`;
          if (mark.type === 'underline') text = `<u>${text}</u>`;
        });
      }
      return text;
    }
    if (node.type === 'blockquote') {
      return `<blockquote class="border-l-4 border-[#0f91e0] pl-4 italic text-slate-500 my-3">${(node.content || []).map(renderTipTap).join('')}</blockquote>`;
    }
    if (node.type === 'horizontalRule') {
      return `<hr class="my-4 border-[#dbeafe]" />`;
    }
    return (node.content || []).map(renderTipTap).join('');
  }

  const htmlContent = hasContent && typeof lesson.content === 'object'
    ? renderTipTap(lesson.content)
    : null;

  return (
    <div className="bg-white rounded-2xl border border-[#dbeafe] overflow-hidden">
      {/* Lesson header */}
      <div className="bg-[#f0f6ff] border-b border-[#dbeafe] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0f91e0] text-white flex items-center justify-center text-sm font-bold">
            {lesson.order_index}
          </div>
          <div>
            <p className="font-bold text-[#0d1f4e] text-sm">{lesson.title}</p>
            {lesson.duration_min && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {lesson.duration_min} min read
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-[#0f91e0] font-semibold transition-colors"
        >
          Close ×
        </button>
      </div>

      {/* Lesson content */}
      <div className="px-6 py-6">
        {hasContent && htmlContent ? (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        ) : (
          <div className="text-center py-10">
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">Content coming soon</p>
            <p className="text-xs text-slate-300 mt-1">
              This lesson content is being prepared by the BDA team.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TrainerModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  // Fetch module
  const { data: module, isLoading: moduleLoading } = useQuery({
    queryKey: ['trainer-module', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructor_curriculum_modules')
        .select('*')
        .eq('id', moduleId)
        .single();
      if (error) throw error;
      return data as Module;
    },
    enabled: !!moduleId,
  });

  // Fetch lessons
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ['trainer-lessons', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructor_curriculum_lessons')
        .select('id, order_index, title, content, duration_min, is_published')
        .eq('module_id', moduleId)
        .eq('is_published', true)
        .order('order_index');
      if (error) throw error;
      return data as Lesson[];
    },
    enabled: !!moduleId,
  });

  const totalDuration = lessons.reduce((sum, l) => sum + (l.duration_min || 0), 0);
  const openLesson = lessons.find(l => l.id === openLessonId) || null;

  if (moduleLoading || lessonsLoading) {
    return (
      <div className="min-h-screen bg-[#f0f6ff] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f91e0]" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-[#f0f6ff] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 font-medium">Module not found</p>
          <button onClick={() => navigate('/instructor/dashboard')} className="mt-3 text-[#0f91e0] text-sm font-semibold hover:underline">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f6ff]">
      {/* Header */}
      <div className="bg-white border-b border-[#dbeafe] shadow-sm">
        <div className="container mx-auto px-6 py-4 max-w-4xl flex items-center gap-4">
          <button
            onClick={() => navigate('/instructor/dashboard')}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0f91e0] font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="w-px h-5 bg-[#dbeafe]" />
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-[#0f91e0]" />
            <span className="text-xs text-slate-400 font-medium">Trainer Learning Centre</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-4xl space-y-6">
        {/* Module header */}
        <div
          className="rounded-2xl p-6 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-white/60">
                Module {module.order_index}
              </span>
              <span className="text-white/30">·</span>
              <span className="text-xs text-white/60">Trainer Learning Centre</span>
            </div>
            <h1 className="text-2xl font-extrabold mb-2">{module.title}</h1>
            <p className="text-white/70 text-sm leading-relaxed max-w-xl">{module.description}</p>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center gap-1.5 text-xs text-white/60">
                <FileText className="w-3.5 h-3.5" />
                {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
              </div>
              {totalDuration > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-white/60">
                  <Clock className="w-3.5 h-3.5" />
                  ~{totalDuration} min total
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lessons list */}
        <div>
          <h2 className="text-base font-bold text-[#0d1f4e] mb-3">Lessons</h2>

          {lessons.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#dbeafe] p-8 text-center">
              <Lock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No lessons available yet</p>
              <p className="text-xs text-slate-300 mt-1">Content is being prepared by the BDA team.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map(lesson => {
                const isOpen = openLessonId === lesson.id;
                const hasContent = lesson.content && (
                  (lesson.content.content && lesson.content.content.length > 0) ||
                  (typeof lesson.content === 'string' && lesson.content.trim().length > 0)
                );

                return (
                  <div key={lesson.id}>
                    {/* Lesson row */}
                    <button
                      onClick={() => setOpenLessonId(isOpen ? null : lesson.id)}
                      className={`w-full bg-white rounded-xl border px-5 py-4 flex items-center gap-4 text-left transition-all hover:shadow-sm ${
                        isOpen
                          ? 'border-[#0f91e0] shadow-sm rounded-b-none'
                          : 'border-[#dbeafe] hover:border-[#0f91e0]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                        isOpen ? 'bg-[#0f91e0] text-white' : 'bg-[#f0f6ff] text-[#1C4A8B]'
                      }`}>
                        {lesson.order_index}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#0d1f4e] text-sm truncate">{lesson.title}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {lesson.duration_min && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {lesson.duration_min} min
                            </span>
                          )}
                          {!hasContent && (
                            <span className="text-xs text-amber-500 font-medium">Content coming soon</span>
                          )}
                        </div>
                      </div>
                      {isOpen
                        ? <ChevronDown className="w-4 h-4 text-[#0f91e0] flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      }
                    </button>

                    {/* Lesson content (accordion) */}
                    {isOpen && (
                      <div className="rounded-b-xl border border-t-0 border-[#0f91e0] overflow-hidden">
                        <LessonContent lesson={lesson} onClose={() => setOpenLessonId(null)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation between modules */}
        <div className="flex justify-between pt-4 border-t border-[#dbeafe]">
          {module.order_index > 1 ? (
            <button
              onClick={() => navigate('/instructor/dashboard')}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#0f91e0] font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={() => navigate('/instructor/dashboard')}
            className="text-sm text-[#0f91e0] font-semibold hover:underline"
          >
            All Modules →
          </button>
        </div>
      </div>
    </div>
  );
}
