import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award, BookOpen, ChevronDown, ChevronUp, Clock, ExternalLink, FileText,
  HelpCircle, Mail, MessageCircle, Rocket, Search, User, Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/shared/config/supabase.config';

const db = supabase as any;
const BDA = { navy: '#0d1f4e', blue: '#0f91e0', bluePale: '#f0f6ff', border: '#e2eaf6' };

type IconKey = 'Award' | 'BookOpen' | 'FileText' | 'User' | 'Wrench' | 'Rocket' | 'HelpCircle' | 'MessageCircle' | 'ExternalLink';
interface HelpCategory { id: string; slug: string; title: string; title_ar: string; description: string; description_ar: string; icon_key: IconKey; order_index: number; }
interface HelpArticle { id: string; category_id: string; question: string; question_ar: string; answer: string; answer_ar: string; order_index: number; }
interface HelpResource { id: string; title: string; title_ar: string; description: string; description_ar: string; url: string; icon_key: IconKey; order_index: number; }
interface HelpSettings { support_email: string; support_ticket_path: string; response_time_text: string; response_time_text_ar: string; availability_text: string; availability_text_ar: string; }

const iconMap: Record<IconKey, any> = { Award, BookOpen, FileText, User, Wrench, Rocket, HelpCircle, MessageCircle, ExternalLink };
const categoryColours = ['text-sky-600 bg-sky-50', 'text-emerald-600 bg-emerald-50', 'text-blue-700 bg-blue-50', 'text-cyan-700 bg-cyan-50', 'text-rose-600 bg-rose-50', 'text-indigo-600 bg-indigo-50'];
function IconFor({ name, className }: { name: IconKey; className?: string }) { const Icon = iconMap[name] || HelpCircle; return <Icon className={className} />; }

/** Public Help Center. All content is managed at /admin/help-center. */
export default function HelpCenter() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categoriesQuery = useQuery<HelpCategory[]>({ queryKey: ['help-center-categories'], queryFn: async () => { const { data, error } = await db.from('help_categories').select('*').eq('is_published', true).order('order_index'); if (error) throw error; return data || []; } });
  const articlesQuery = useQuery<HelpArticle[]>({ queryKey: ['help-center-articles'], queryFn: async () => { const { data, error } = await db.from('help_articles').select('*').eq('is_published', true).order('order_index'); if (error) throw error; return data || []; } });
  const resourcesQuery = useQuery<HelpResource[]>({ queryKey: ['help-center-resources'], queryFn: async () => { const { data, error } = await db.from('help_resources').select('*').eq('is_published', true).order('order_index'); if (error) throw error; return data || []; } });
  const settingsQuery = useQuery<HelpSettings | null>({ queryKey: ['help-center-settings'], queryFn: async () => { const { data, error } = await db.from('help_center_settings').select('*').eq('id', true).maybeSingle(); if (error) throw error; return data; } });

  const categories = categoriesQuery.data || [];
  const articles = articlesQuery.data || [];
  const resources = resourcesQuery.data || [];
  const settings = settingsQuery.data || { support_email: 'support@bda-global.org', support_ticket_path: '/support/new', response_time_text: 'Response time: 24 hours', response_time_text_ar: 'وقت الاستجابة: 24 ساعة', availability_text: 'Available: 24/7', availability_text_ar: 'متوفر: 24/7' };
  const isLoading = categoriesQuery.isLoading || articlesQuery.isLoading || resourcesQuery.isLoading;

  const filteredArticles = useMemo(() => articles.filter(article => {
    const term = searchQuery.trim().toLowerCase();
    const matchesSearch = !term || [article.question, article.question_ar, article.answer, article.answer_ar].some(value => value?.toLowerCase().includes(term));
    return matchesSearch && (selectedCategory === 'all' || article.category_id === selectedCategory);
  }), [articles, searchQuery, selectedCategory]);

  const toggleFAQ = (id: string) => setExpandedFAQ(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const expandAll = () => setExpandedFAQ(new Set(filteredArticles.map(article => article.id)));
  const collapseAll = () => setExpandedFAQ(new Set());

  return <div className="min-h-screen bg-slate-50">
    <div className="text-white" style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}>
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold">{isArabic ? 'كيف يمكننا مساعدتك؟' : 'How can we help you?'}</h1>
        <p className="mb-8 text-lg text-blue-100">{isArabic ? 'ابحث في قاعدة المعرفة أو تصفح الفئات' : 'Search our knowledge base or browse categories'}</p>
        <div className="relative mx-auto max-w-2xl"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><input type="text" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder={isArabic ? 'ابحث عن المساعدة...' : 'Search for help...'} className="w-full rounded-xl py-4 pl-12 pr-4 text-gray-900 shadow-lg outline-none ring-0 focus:ring-2 focus:ring-blue-200" /></div>
      </div>
    </div>

    <div className="mx-auto max-w-7xl px-4 py-12">
      {isLoading ? <div className="rounded-2xl border bg-white py-16 text-center text-sm text-gray-500" style={{ borderColor: BDA.border }}>Loading Help Center…</div> : <>
        <section className="mb-16"><h2 className="mb-6 text-2xl font-bold text-gray-900">{isArabic ? 'تصفح حسب الفئة' : 'Browse by Category'}</h2><div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">{categories.map((category, index) => { const count = articles.filter(article => article.category_id === category.id).length; const active = selectedCategory === category.id; return <button key={category.id} onClick={() => setSelectedCategory(category.id)} className={cn('rounded-xl border-2 bg-white p-6 text-left transition-all hover:shadow-md', active ? 'border-[#0f91e0] bg-[#f0f6ff]' : 'border-gray-200 hover:border-sky-200')}><div className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-xl', categoryColours[index % categoryColours.length])}><IconFor name={category.icon_key} className="h-6 w-6" /></div><h3 className="mb-2 text-lg font-semibold text-gray-900">{isArabic ? category.title_ar || category.title : category.title}</h3><p className="mb-3 text-sm text-gray-600">{isArabic ? category.description_ar || category.description : category.description}</p><div className="text-sm text-gray-500">{count} {isArabic ? 'مقالة' : count === 1 ? 'article' : 'articles'}</div></button>; })}</div>{selectedCategory !== 'all' && <button onClick={() => setSelectedCategory('all')} className="mt-4 text-sm font-medium text-[#0f91e0] hover:text-[#0d1f4e]">{isArabic ? '← عرض جميع الفئات' : '← Show all categories'}</button>}</section>

        <section className="mb-16"><div className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-bold text-gray-900">{isArabic ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}</h2><div className="flex items-center gap-3 text-sm"><button onClick={expandAll} className="font-medium text-[#0f91e0] hover:text-[#0d1f4e]">{isArabic ? 'توسيع الكل' : 'Expand All'}</button><span className="text-gray-300">|</span><button onClick={collapseAll} className="font-medium text-[#0f91e0] hover:text-[#0d1f4e]">{isArabic ? 'طي الكل' : 'Collapse All'}</button></div></div>{filteredArticles.length === 0 ? <div className="rounded-xl border bg-white py-12 text-center" style={{ borderColor: BDA.border }}><Search className="mx-auto mb-4 h-10 w-10 text-gray-300" /><p className="text-gray-600">{isArabic ? 'لم يتم العثور على نتائج. جرب مصطلح بحث مختلف.' : 'No results found. Try a different search term.'}</p></div> : <div className="space-y-3">{filteredArticles.map(article => { const expanded = expandedFAQ.has(article.id); return <div key={article.id} className="rounded-xl border bg-white" style={{ borderColor: BDA.border }}><button onClick={() => toggleFAQ(article.id)} className="flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50"><span className="pr-4 font-medium text-gray-900">{isArabic ? article.question_ar || article.question : article.question}</span>{expanded ? <ChevronUp className="h-5 w-5 shrink-0 text-gray-400" /> : <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />}</button>{expanded && <div className="border-t px-5 pb-5 pt-4 leading-relaxed text-gray-700" style={{ borderColor: BDA.border }}>{isArabic ? article.answer_ar || article.answer : article.answer}</div>}</div>; })}</div>}</section>

        <section className="mb-16 rounded-2xl border p-8" style={{ background: BDA.bluePale, borderColor: BDA.border }}><div className="mx-auto max-w-3xl text-center"><MessageCircle className="mx-auto mb-4 h-12 w-12" style={{ color: BDA.blue }} /><h2 className="mb-3 text-2xl font-bold text-gray-900">{isArabic ? 'لا تزال بحاجة إلى مساعدة؟' : 'Still need help?'}</h2><p className="mb-6 text-gray-700">{isArabic ? 'لم تجد ما تبحث عنه؟ فريق الدعم لدينا هنا لمساعدتك.' : "Can't find what you're looking for? Our support team is here to help."}</p><div className="mb-6 flex flex-col items-center justify-center gap-4 sm:flex-row"><button onClick={() => navigate(settings.support_ticket_path)} className="flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}><MessageCircle className="h-5 w-5" />{isArabic ? 'إنشاء تذكرة دعم' : 'Create Support Ticket'}</button><a href={`mailto:${settings.support_email}`} className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50"><Mail className="h-5 w-5" />{isArabic ? 'البريد الإلكتروني للدعم' : 'Email Support'}</a></div><div className="flex flex-col items-center justify-center gap-4 text-sm text-gray-600 sm:flex-row sm:gap-8"><div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span>{isArabic ? settings.response_time_text_ar : settings.response_time_text}</span></div><div className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /><span>{isArabic ? settings.availability_text_ar : settings.availability_text}</span></div></div></div></section>

        <section><h2 className="mb-6 text-2xl font-bold text-gray-900">{isArabic ? 'موارد إضافية' : 'Additional Resources'}</h2><div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">{resources.map(resource => { const external = /^https?:\/\//i.test(resource.url); return <a key={resource.id} href={resource.url} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className="group rounded-xl border bg-white p-6 transition hover:border-sky-300 hover:shadow-md" style={{ borderColor: BDA.border }}><IconFor name={resource.icon_key} className="mb-3 h-8 w-8 text-[#0f91e0]" /><h3 className="mb-2 font-semibold text-gray-900 group-hover:text-[#0f91e0]">{isArabic ? resource.title_ar || resource.title : resource.title}</h3><p className="mb-3 text-sm text-gray-600">{isArabic ? resource.description_ar || resource.description : resource.description}</p><span className="flex items-center gap-1 text-sm text-[#0f91e0]">{isArabic ? 'فتح' : 'Open'}<ExternalLink className="h-3 w-3" /></span></a>; })}</div></section>
      </>}
    </div>
  </div>;
}

HelpCenter.displayName = 'HelpCenter';
