/**
 * TrainerLessonPage — Full-page lesson viewer for Trainer Learning Centre
 * Route: /instructor/learning-centre/module/:moduleId/lesson/:lessonId
 * Opens as a standalone page (not inline within TrainerModulePage)
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/config/supabase.config';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  List,
  ArrowUp,
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
  order_index: number;
}

interface TrainerLesson {
  id: string;
  title: string;
  order_index: number;
  duration_min: number | null;
  content: any;
  is_published: boolean;
}

// ── TipTap Renderer ──────────────────────────────────────────────────────────
function renderTipTap(node: any): string {
  if (!node) return '';
  if (node.type === 'doc') return (node.content || []).map(renderTipTap).join('');
  if (node.type === 'paragraph') {
    const inner = (node.content || []).map(renderTipTap).join('');
    return `<p class="mb-4 leading-relaxed text-gray-700">${inner || '&nbsp;'}</p>`;
  }
  if (node.type === 'heading') {
    const inner = (node.content || []).map(renderTipTap).join('');
    const level = node.attrs?.level || 2;
    const cls =
      level === 1 ? 'text-2xl font-bold mt-8 mb-4' :
      level === 2 ? 'text-xl font-bold mt-6 mb-3' :
                    'text-lg font-semibold mt-5 mb-2';
    return `<h${level} class="${cls}">${inner}</h${level}>`;
  }
  if (node.type === 'bulletList')
    return `<ul class="list-disc pl-6 mb-4 space-y-1.5">${(node.content || []).map(renderTipTap).join('')}</ul>`;
  if (node.type === 'orderedList')
    return `<ol class="list-decimal pl-6 mb-4 space-y-1.5">${(node.content || []).map(renderTipTap).join('')}</ol>`;
  if (node.type === 'listItem')
    return `<li class="text-gray-700 leading-relaxed">${(node.content || []).map(renderTipTap).join('')}</li>`;
  if (node.type === 'blockquote')
    return `<blockquote class="border-l-4 border-[#0f91e0] pl-5 italic text-slate-500 my-5 bg-[#f0f6ff] py-3 pr-4 rounded-r-lg">${(node.content || []).map(renderTipTap).join('')}</blockquote>`;
  if (node.type === 'horizontalRule')
    return `<hr class="my-6 border-[#dbeafe]" />`;
  if (node.type === 'codeBlock') {
    const inner = (node.content || []).map(renderTipTap).join('');
    return `<pre class="bg-gray-900 text-green-300 rounded-xl p-4 mb-4 overflow-x-auto text-sm font-mono"><code>${inner}</code></pre>`;
  }
  if (node.type === 'text') {
    let text = node.text || '';
    let inlineStyle = '';
    if (node.marks) {
      node.marks.forEach((mark: any) => {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        if (mark.type === 'italic') text = `<em>${text}</em>`;
        if (mark.type === 'underline') text = `<u>${text}</u>`;
        if (mark.type === 'strike') text = `<s>${text}</s>`;
        if (mark.type === 'code') text = `<code class="bg-gray-100 text-[#0f91e0] px-1.5 py-0.5 rounded text-sm font-mono">${text}</code>`;
        if (mark.type === 'textStyle' && mark.attrs?.color) {
          inlineStyle += `color:${mark.attrs.color};`;
        }
        if (mark.type === 'link' && mark.attrs?.href) {
          text = `<a href="${mark.attrs.href}" target="_blank" rel="noopener noreferrer" class="text-[#0f91e0] underline hover:opacity-80">${text}</a>`;
        }
      });
    }
    if (inlineStyle) text = `<span style="${inlineStyle}">${text}</span>`;
    return text;
  }
  return (node.content || []).map(renderTipTap).join('');
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TrainerLessonPage() {
  const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Fetch module info
  const isNumeric = moduleId && /^\d+$/.test(moduleId);
  const { data: module } = useQuery<TrainerModule>({
    queryKey: ['trainer-module', moduleId],
    queryFn: async () => {
      let q = supabase.from('instructor_curriculum_modules').select('id, title, order_index');
      if (isNumeric) q = q.eq('order_index', parseInt(moduleId!));
      else q = q.eq('id', moduleId);
      const { data, error } = await q.single();
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });

  // Fetch all lessons for this module (for prev/next nav)
  const { data: allLessons = [] } = useQuery<TrainerLesson[]>({
    queryKey: ['trainer-lessons', module?.id],
    queryFn: async () => {
      if (!module?.id) return [];
      const { data, error } = await supabase
        .from('instructor_curriculum_lessons')
        .select('id, order_index, title, content, duration_min, is_published')
        .eq('module_id', module.id)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!module?.id,
    staleTime: 0,
  });

  // Current lesson
  const lesson = allLessons.find(l => l.id === lessonId);
  const lessonIndex = lesson ? allLessons.indexOf(lesson) : -1;
  const prevLesson = lessonIndex > 0 ? allLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < allLessons.length - 1 ? allLessons[lessonIndex + 1] : null;

  // Reading progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) { setReadingProgress(100); return; }
      const pct = Math.min(100, Math.round((scrollTop / docHeight) * 100));
      setReadingProgress(pct);
      setShowScrollTop(scrollTop > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top on lesson change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [lessonId]);

  const moduleRoute = module?.id
    ? `/instructor/learning-centre/module/${module.id}`
    : `/instructor/learning-centre/module/${moduleId}`;

  if (!lesson && allLessons.length > 0) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: BDA.bluePale }}>
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-lg font-bold mb-2" style={{ color: BDA.navyDark }}>Lesson not found</h2>
          <Button variant="outline" onClick={() => navigate(moduleRoute)}>Back to Module</Button>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: BDA.bluePale }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: BDA.navy }} />
          <p className="text-gray-500 text-sm">Loading lesson...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: BDA.bluePale, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1" style={{ background: BDA.blueMid }}>
        <div className="h-full transition-all duration-200" style={{ width: `${readingProgress}%`, background: BDA.blue }} />
      </div>

      {/* TOP BAR */}
      <div className="sticky top-1 z-40 border-b"
        style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.08)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Back to Module */}
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" className="gap-1.5 font-medium flex-shrink-0"
              style={{ color: BDA.navy }} onClick={() => navigate(moduleRoute)}>
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">
                {module ? `Module ${module.order_index}` : 'Module'}
              </span>
            </Button>
            <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: BDA.blueMid, color: BDA.navy }}>
                Trainer Learning Centre
              </span>
              <p className="text-sm font-semibold truncate mt-0.5" style={{ color: BDA.navyDark }}>
                {lesson.title}
              </p>
            </div>
          </div>
          {/* Lesson counter */}
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-gray-400">Lesson</p>
            <p className="text-sm font-bold" style={{ color: BDA.navy }}>
              {lessonIndex + 1} / {allLessons.length}
            </p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto px-4 py-8" ref={contentRef}>

        {/* Lesson Header */}
        <div className="rounded-2xl border p-6 mb-6"
          style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.06)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: BDA.blueMid, color: BDA.navy }}>
                  Lesson {lessonIndex + 1}
                </span>
                {lesson.is_published && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: '#dcfce7', color: '#166534' }}>
                    Published
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold leading-tight"
                style={{ color: BDA.navyDark, fontFamily: "'Playfair Display', 'Georgia', serif" }}>
                {lesson.title}
              </h1>
            </div>
            {lesson.duration_min && (
              <div className="flex-shrink-0 flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border"
                style={{ color: BDA.navy, borderColor: BDA.border, background: BDA.bluePale }}>
                <Clock className="h-4 w-4" />
                <span className="font-medium">{lesson.duration_min}m</span>
              </div>
            )}
          </div>
        </div>

        {/* Lesson Body */}
        <div className="rounded-2xl border p-8 mb-6"
          style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.06)' }}>
          {lesson.content ? (
            <div
              className="max-w-none"
              style={{ lineHeight: '1.8', fontSize: '1rem' }}
              dangerouslySetInnerHTML={{ __html: renderTipTap(lesson.content) }}
            />
          ) : (
            <div className="text-center py-16">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2" style={{ color: BDA.navyDark }}>
                Content Coming Soon
              </h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                The content for this lesson is being prepared by the BDA team.
              </p>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between gap-4">
          {/* Previous */}
          {prevLesson ? (
            <button
              onClick={() => navigate(`/instructor/learning-centre/module/${module?.id || moduleId}/lesson/${prevLesson.id}`)}
              className="flex items-center gap-3 rounded-2xl border p-4 flex-1 text-left transition-all hover:shadow-md"
              style={{ background: '#fff', borderColor: BDA.border }}>
              <ChevronLeft className="h-5 w-5 flex-shrink-0" style={{ color: BDA.navy }} />
              <div className="min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Previous Lesson</p>
                <p className="text-sm font-semibold truncate" style={{ color: BDA.navyDark }}>{prevLesson.title}</p>
              </div>
            </button>
          ) : (
            <button
              onClick={() => navigate(moduleRoute)}
              className="flex items-center gap-3 rounded-2xl border p-4 flex-1 text-left transition-all hover:shadow-md"
              style={{ background: '#fff', borderColor: BDA.border }}>
              <ArrowLeft className="h-5 w-5 flex-shrink-0" style={{ color: BDA.navy }} />
              <div className="min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Back to</p>
                <p className="text-sm font-semibold truncate" style={{ color: BDA.navyDark }}>Module Overview</p>
              </div>
            </button>
          )}

          {/* Next */}
          {nextLesson ? (
            <button
              onClick={() => navigate(`/instructor/learning-centre/module/${module?.id || moduleId}/lesson/${nextLesson.id}`)}
              className="flex items-center gap-3 rounded-2xl border p-4 flex-1 text-right transition-all hover:shadow-md"
              style={{ background: BDA.navy, borderColor: BDA.navy }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Next Lesson</p>
                <p className="text-sm font-semibold truncate text-white">{nextLesson.title}</p>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-white" />
            </button>
          ) : (
            <button
              onClick={() => navigate(moduleRoute)}
              className="flex items-center gap-3 rounded-2xl border p-4 flex-1 text-right transition-all hover:shadow-md"
              style={{ background: BDA.navy, borderColor: BDA.navy }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Module Complete</p>
                <p className="text-sm font-semibold text-white">Back to Module</p>
              </div>
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Scroll to Top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
          style={{ background: BDA.navy, color: '#fff' }}>
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
