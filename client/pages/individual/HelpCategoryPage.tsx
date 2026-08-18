import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MessageCircle,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/shared/config/supabase.config';

const db = supabase as any;
const BDA = { navy: '#0d1f4e', blue: '#0f91e0', bluePale: '#f0f6ff', border: '#e2eaf6' };

type IconKey = 'Award' | 'BookOpen' | 'FileText' | 'User' | 'Wrench' | 'Rocket' | 'HelpCircle' | 'MessageCircle' | 'ExternalLink';
interface HelpCategory { id: string; slug: string; title: string; title_ar: string; description: string; description_ar: string; icon_key: IconKey; }
interface HelpArticle { id: string; category_id: string; question: string; question_ar: string; answer: string; answer_ar: string; order_index: number; }

/** Dedicated category route. The Help Center entry page deliberately contains no articles. */
export default function HelpCategoryPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<Set<string>>(new Set());

  const categoryQuery = useQuery<HelpCategory | null>({
    queryKey: ['help-center-category', slug],
    queryFn: async () => {
      const { data, error } = await db.from('help_categories').select('*').eq('slug', slug).eq('is_published', true).maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: Boolean(slug),
  });
  const articlesQuery = useQuery<HelpArticle[]>({
    queryKey: ['help-center-category-articles', categoryQuery.data?.id],
    queryFn: async () => {
      const { data, error } = await db.from('help_articles').select('*').eq('category_id', categoryQuery.data!.id).eq('is_published', true).order('order_index');
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(categoryQuery.data?.id),
  });

  const category = categoryQuery.data;
  const articles = articlesQuery.data || [];
  const isLoading = categoryQuery.isLoading || articlesQuery.isLoading;
  const visibleArticles = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return articles;
    return articles.filter((article) => [article.question, article.question_ar, article.answer, article.answer_ar]
      .some((value) => value?.toLowerCase().includes(term)));
  }, [articles, searchQuery]);

  const toggleArticle = (id: string) => setExpandedFAQ((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const expandAll = () => setExpandedFAQ(new Set(visibleArticles.map((article) => article.id)));
  const collapseAll = () => setExpandedFAQ(new Set());

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 px-4 py-24 text-center text-sm text-gray-500">Loading Help Center…</div>;
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-24 text-center">
        <HelpCircle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900">{isArabic ? 'لم يتم العثور على الفئة' : 'Category not found'}</h1>
        <button onClick={() => navigate('/help-center')} className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white" style={{ background: BDA.navy }}>
          <ArrowLeft className={cn('h-4 w-4', isArabic && 'rotate-180')} />{isArabic ? 'العودة إلى مركز المساعدة' : 'Back to Help Center'}
        </button>
      </div>
    );
  }

  const title = isArabic ? category.title_ar || category.title : category.title;
  const description = isArabic ? category.description_ar || category.description : category.description;

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="text-white" style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}>
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <button onClick={() => navigate('/help-center')} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-100 transition hover:text-white">
            <ArrowLeft className={cn('h-4 w-4', isArabic && 'rotate-180')} />{isArabic ? 'العودة إلى مركز المساعدة' : 'Back to Help Center'}
          </button>
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">{isArabic ? 'قاعدة المعرفة' : 'Knowledge Base'}</p>
            <h1 className={cn('mb-3 text-4xl font-bold', isArabic && 'text-right')} dir={isArabic ? 'rtl' : 'ltr'}>{title}</h1>
            <p className={cn('max-w-2xl text-lg leading-relaxed text-blue-100', isArabic && 'text-right')} dir={isArabic ? 'rtl' : 'ltr'}>{description}</p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{isArabic ? 'مقالات الفئة' : 'Category Articles'}</h2>
            <p className="mt-1 text-sm text-gray-500">{articles.length} {isArabic ? 'مقالة متاحة' : articles.length === 1 ? 'article available' : 'articles available'}</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className={cn('absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400', isArabic ? 'right-3' : 'left-3')} />
            <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={isArabic ? 'ابحث في هذه الفئة...' : 'Search this category...'} className={cn('w-full rounded-xl border bg-white py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#0f91e0]', isArabic ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3')} style={{ borderColor: BDA.border }} />
          </div>
        </div>

        {visibleArticles.length === 0 ? (
          <div className="rounded-2xl border bg-white py-16 text-center" style={{ borderColor: BDA.border }}>
            <Search className="mx-auto mb-4 h-10 w-10 text-gray-300" />
            <p className="text-gray-600">{isArabic ? 'لم يتم العثور على مقالات مطابقة.' : 'No matching articles found.'}</p>
          </div>
        ) : (
          <section className="rounded-2xl border bg-white p-3 sm:p-4" style={{ borderColor: BDA.border }}>
            <div className="mb-2 flex items-center justify-end gap-3 px-2 py-2 text-sm">
              <button onClick={expandAll} className="font-semibold text-[#0f91e0] hover:text-[#0d1f4e]">{isArabic ? 'توسيع الكل' : 'Expand all'}</button>
              <span className="text-gray-300">|</span>
              <button onClick={collapseAll} className="font-semibold text-[#0f91e0] hover:text-[#0d1f4e]">{isArabic ? 'طي الكل' : 'Collapse all'}</button>
            </div>
            <div className="space-y-2">
              {visibleArticles.map((article) => {
                const expanded = expandedFAQ.has(article.id);
                const question = isArabic ? article.question_ar || article.question : article.question;
                const answer = isArabic ? article.answer_ar || article.answer : article.answer;
                return (
                  <article key={article.id} className="overflow-hidden rounded-xl border" style={{ borderColor: BDA.border }}>
                    <button onClick={() => toggleArticle(article.id)} className={cn('flex w-full items-center justify-between gap-5 p-5 text-left transition hover:bg-slate-50', isArabic && 'text-right')}>
                      <span className="font-semibold text-gray-900" dir={isArabic ? 'rtl' : 'ltr'}>{question}</span>
                      {expanded ? <ChevronUp className="h-5 w-5 shrink-0 text-gray-400" /> : <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />}
                    </button>
                    {expanded && <div className={cn('border-t px-5 pb-5 pt-4 leading-relaxed text-gray-700', isArabic && 'text-right')} style={{ borderColor: BDA.border }} dir={isArabic ? 'rtl' : 'ltr'}>{answer}</div>}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-12 rounded-2xl border p-7 text-center" style={{ background: BDA.bluePale, borderColor: BDA.border }}>
          <MessageCircle className="mx-auto mb-3 h-9 w-9" style={{ color: BDA.blue }} />
          <h2 className="text-xl font-bold text-gray-900">{isArabic ? 'هل ما زلت بحاجة إلى مساعدة؟' : 'Still need help?'}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-gray-600">{isArabic ? 'إذا لم تجد الإجابة التي تبحث عنها، يمكنك التواصل مع فريق الدعم.' : "If you have not found the answer you need, our support team is ready to help."}</p>
          <button onClick={() => navigate('/support/new')} className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}>
            <MessageCircle className="h-4 w-4" />{isArabic ? 'إنشاء تذكرة دعم' : 'Create Support Ticket'}
          </button>
        </section>
      </main>
    </div>
  );
}

HelpCategoryPage.displayName = 'HelpCategoryPage';
