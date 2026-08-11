/**
 * TrainerModulePage — Trainer Learning Centre Module View
 * Layout: identical to ModuleViewer (Top bar + Content left + Lessons sidebar right)
 * Route: /instructor/learning-centre/module/:moduleId
 */

import { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/config/supabase.config';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  BookOpen,
  LayoutList,
  Clock,
  ChevronRight,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// BDA Brand Palette
const BDA = {
  navy: '#1C4A8B',
  navyDark: '#0d1f4e',
  blue: '#0f91e0',
  bluePale: '#f0f6ff',
  blueMid: '#dbeafe',
  border: '#e2eaf6',
};

interface TrainerModule {
  id: string;
  title: string;
  description: string | null;
  intro_content: any | null;
  order_index: number;
  is_published: boolean;
  estimated_duration_hours: number | null;
}

interface TrainerLesson {
  id: string;
  title: string;
  order_index: number;
  is_published: boolean;
  duration_min: number | null;
  content: any;
}

// Lesson Sidebar Item — navigates to lesson page on click
function LessonItem({ lesson, index, onClick }: {
  lesson: TrainerLesson; index: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all hover:bg-[#f0f6ff]"
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border bg-[#f0f6ff] text-[#1C4A8B] border-[#dbeafe]">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate text-[#0d1f4e]">
          {lesson.title}
        </p>
        {lesson.duration_min && (
          <p className="text-xs mt-0.5 text-gray-400">
            ⏱ {lesson.duration_min}m
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
    </button>
  );
}

// TipTap Content Renderer
function renderTipTap(node: any): string {
  if (!node) return '';
  if (node.type === 'doc') return (node.content || []).map(renderTipTap).join('');
  if (node.type === 'paragraph') {
    const inner = (node.content || []).map(renderTipTap).join('');
    return `<p class="mb-4 text-gray-700 leading-relaxed">${inner || '&nbsp;'}</p>`;
  }
  if (node.type === 'heading') {
    const inner = (node.content || []).map(renderTipTap).join('');
    const level = node.attrs?.level || 2;
    // Respect any colour set by the editor via marks; fall back to inherit
    const colorStyle = node.attrs?.color ? `color:${node.attrs.color}` : '';
    const cls = level === 1 ? 'text-2xl font-bold mt-6 mb-3' :
                level === 2 ? 'text-xl font-bold mt-5 mb-2' :
                              'text-lg font-semibold mt-4 mb-2';
    return `<h${level} class="${cls}"${colorStyle ? ` style="${colorStyle}"` : ''}>${inner}</h${level}>`;
  }
  if (node.type === 'bulletList') return `<ul class="list-disc pl-5 mb-4 space-y-1">${(node.content || []).map(renderTipTap).join('')}</ul>`;
  if (node.type === 'orderedList') return `<ol class="list-decimal pl-5 mb-4 space-y-1">${(node.content || []).map(renderTipTap).join('')}</ol>`;
  if (node.type === 'listItem') return `<li class="text-gray-700 leading-relaxed">${(node.content || []).map(renderTipTap).join('')}</li>`;
  if (node.type === 'blockquote') return `<blockquote class="border-l-4 border-[#0f91e0] pl-4 italic text-slate-500 my-4">${(node.content || []).map(renderTipTap).join('')}</blockquote>`;
  if (node.type === 'horizontalRule') return `<hr class="my-5 border-[#dbeafe]" />`;
  if (node.type === 'text') {
    let text = node.text || '';
    let inlineStyle = '';
    if (node.marks) {
      node.marks.forEach((mark: any) => {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        if (mark.type === 'italic') text = `<em>${text}</em>`;
        if (mark.type === 'underline') text = `<u>${text}</u>`;
        if (mark.type === 'textStyle' && mark.attrs?.color) {
          inlineStyle += `color:${mark.attrs.color};`;
        }
      });
    }
    if (inlineStyle) text = `<span style="${inlineStyle}">${text}</span>`;
    return text;
  }
  return (node.content || []).map(renderTipTap).join('');
}

// Main Component
export default function TrainerModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  // Support both UUID and order_index (e.g. /module/1 or /module/uuid)
  const isNumeric = moduleId && /^\d+$/.test(moduleId);

  const { data: module, isLoading: moduleLoading } = useQuery<TrainerModule>({
    queryKey: ['trainer-module', moduleId],
    queryFn: async () => {
      let query = supabase.from('instructor_curriculum_modules').select('*');
      if (isNumeric) {
        query = query.eq('order_index', parseInt(moduleId!));
      } else {
        query = query.eq('id', moduleId);
      }
      const { data, error } = await query.single();
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });

  const resolvedModuleId = module?.id;

  const { data: lessons = [] } = useQuery<TrainerLesson[]>({
    queryKey: ['trainer-lessons', resolvedModuleId],
    queryFn: async () => {
      if (!resolvedModuleId) return [];
      const { data, error } = await supabase
        .from('instructor_curriculum_lessons')
        .select('id, order_index, title, content, duration_min, is_published')
        .eq('module_id', resolvedModuleId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!resolvedModuleId,
    staleTime: 0,
  });

  const { data: allModules = [] } = useQuery<TrainerModule[]>({
    queryKey: ['trainer-all-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructor_curriculum_modules')
        .select('id, title, order_index')
        .eq('is_published', true)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight <= clientHeight) { setReadingProgress(100); return; }
      setReadingProgress(Math.min(100, Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)));
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const currentIndex = allModules.findIndex(m => m.id === (module?.id || moduleId));
  const nextModule = currentIndex >= 0 && currentIndex < allModules.length - 1 ? allModules[currentIndex + 1] : null;

  if (moduleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: BDA.bluePale }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: BDA.navy }} />
          <p className="text-gray-500 text-sm">Loading module...</p>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: BDA.bluePale }}>
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-lg font-bold mb-2" style={{ color: BDA.navyDark }}>Module not found</h2>
          <Button variant="outline" onClick={() => navigate('/instructor/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isFullscreen ? 'fixed inset-0 z-50 overflow-auto' : ''}`}
      style={{ background: BDA.bluePale, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* TOP BAR */}
      <div className="sticky top-0 z-30 border-b"
        style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {!isFullscreen && (
              <>
                <Button variant="ghost" size="sm" className="flex-shrink-0 gap-1.5 font-medium"
                  style={{ color: BDA.navy }} onClick={() => navigate('/instructor/dashboard')}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
                <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
              </>
            )}
            <div className="min-w-0">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: BDA.blueMid, color: BDA.navy }}>
                Trainer Learning Centre
              </span>
              <h1 className="text-base font-bold truncate mt-0.5" style={{ color: BDA.navyDark }}>
                Module {module.order_index}: {module.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-gray-400">Lessons</div>
                <div className="text-sm font-bold" style={{ color: BDA.navy }}>
                  {lessons.length} lessons
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="flex-shrink-0 gap-1.5" style={{ color: BDA.navy }}
              onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span className="hidden sm:inline text-xs font-medium">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </Button>
          </div>
        </div>
        <div className="h-0.5" style={{ background: BDA.blueMid }}>
          <div className="h-full transition-all duration-300" style={{ width: `${readingProgress}%`, background: BDA.blue }} />
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* LEFT: Content */}
        <main className="flex-1 min-w-0" ref={contentRef}>
          {/* Module Header Card */}
          <div className="rounded-2xl border p-6 mb-5"
            style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.06)' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold mb-2 leading-tight"
                  style={{ color: BDA.navyDark, fontFamily: "'Playfair Display', 'Georgia', serif" }}>
                  {module.title}
                </h2>
                {module.description && (
                  <p className="text-gray-600 leading-relaxed text-sm">{module.description}</p>
                )}
              </div>
              {module.estimated_duration_hours && (
                <div className="flex-shrink-0 flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border"
                  style={{ color: BDA.navy, borderColor: BDA.border, background: BDA.bluePale }}>
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{module.estimated_duration_hours}h</span>
                </div>
              )}
            </div>
          </div>

          {/* Module Introduction */}
          {module.intro_content && (
            <div className="rounded-2xl border p-6 mb-5"
              style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.06)' }}>
              <h3 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: BDA.navyDark }}>
                <span className="w-1.5 h-5 rounded-full inline-block" style={{ background: BDA.blue }} />
                Module Introduction
              </h3>
              <div className="max-w-none tiptap-content"
                dangerouslySetInnerHTML={{ __html: renderTipTap(module.intro_content) }} />
            </div>
          )}

          {/* Lessons CTA */}
          {lessons.length > 0 ? (
            <div className="rounded-2xl border p-6 mb-5"
              style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.06)' }}>
              <div className="flex items-center gap-2 mb-4">
                <LayoutList className="h-4 w-4" style={{ color: BDA.navy }} />
                <h3 className="font-semibold text-sm" style={{ color: BDA.navy }}>Module Lessons</h3>
                <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: BDA.blueMid, color: BDA.navy }}>{lessons.length} lessons</span>
              </div>
              <div className="space-y-1">
                {lessons.map((lesson, i) => (
                  <LessonItem key={lesson.id} lesson={lesson} index={i}
                    onClick={() => navigate(`/instructor/learning-centre/module/${module.id}/lesson/${lesson.id}`)} />
                ))}
              </div>
              <Button className="mt-4 w-full gap-1.5" style={{ background: BDA.navy, color: '#fff' }}
                onClick={() => navigate(`/instructor/learning-centre/module/${module.id}/lesson/${lessons[0].id}`)}>
                Start First Lesson <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border p-10 mb-5 text-center"
              style={{ background: '#fff', borderColor: BDA.border }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: BDA.bluePale }}>
                <BookOpen className="h-8 w-8" style={{ color: BDA.blue }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: BDA.navyDark }}>Content Coming Soon</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                The detailed content for this module is being prepared by the BDA team.
              </p>
            </div>
          )}

          {/* Next Module CTA */}
          {nextModule ? (
            <div className="rounded-2xl border p-5 flex items-center justify-between gap-4"
              style={{ background: BDA.bluePale, borderColor: BDA.border }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: BDA.navyDark }}>Next Module</p>
                <p className="text-xs mt-0.5 text-gray-500">{nextModule.title}</p>
              </div>
              <Button size="sm" style={{ background: BDA.navy, color: '#fff' }}
                onClick={() => navigate(`/instructor/learning-centre/module/${nextModule.id}`)}>
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border p-5 flex items-center gap-3"
              style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <CheckCircle className="h-6 w-6 flex-shrink-0" style={{ color: '#16a34a' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#14532d' }}>All modules completed!</p>
                <p className="text-xs mt-0.5" style={{ color: '#166534' }}>You've reached the end of the Trainer Learning Centre.</p>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-2xl border overflow-hidden"
              style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.06)' }}>
              <div className="px-4 py-3 border-b flex items-center justify-between"
                style={{ background: BDA.bluePale, borderColor: BDA.border }}>
                <div className="flex items-center gap-2">
                  <LayoutList className="h-4 w-4" style={{ color: BDA.navy }} />
                  <span className="text-sm font-semibold" style={{ color: BDA.navy }}>Lessons</span>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: BDA.blueMid, color: BDA.navy }}>
                  {lessons.length} lessons
                </span>
              </div>
              <div className="p-3 space-y-1">
                {lessons.length === 0 ? (
                  <div className="text-center py-6">
                    <Circle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs text-gray-400">No lessons yet</p>
                  </div>
                ) : (
                  lessons.map((lesson, i) => (
                    <LessonItem key={lesson.id} lesson={lesson} index={i}
                      onClick={() => navigate(`/instructor/learning-centre/module/${module.id}/lesson/${lesson.id}`)} />
                  ))
                )}
              </div>
            </div>

            {nextModule && (
              <div className="rounded-2xl border p-4"
                style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.06)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: BDA.blue }}>Up Next</p>
                <p className="text-sm font-semibold mb-1" style={{ color: BDA.navyDark }}>Module {nextModule.order_index}</p>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{nextModule.title}</p>
                <Button size="sm" className="w-full gap-1.5 font-medium"
                  style={{ background: BDA.bluePale, color: BDA.navy, border: `1px solid ${BDA.border}` }}
                  onClick={() => navigate(`/instructor/learning-centre/module/${nextModule.id}`)}>
                  Go to Next Module <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
