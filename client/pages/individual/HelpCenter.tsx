import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Award,
  BookOpen,
  Clock,
  ExternalLink,
  FileText,
  HelpCircle,
  Mail,
  MessageCircle,
  Rocket,
  Search,
  User,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/shared/config/supabase.config';

const db = supabase as any;
const BDA = { navy: '#0d1f4e', blue: '#0f91e0', bluePale: '#f0f6ff', border: '#e2eaf6' };

type IconKey = 'Award' | 'BookOpen' | 'FileText' | 'User' | 'Wrench' | 'Rocket' | 'HelpCircle' | 'MessageCircle' | 'ExternalLink';
interface HelpCategory { id: string; slug: string; title: string; title_ar: string; description: string; description_ar: string; icon_key: IconKey; order_index: number; }
interface HelpArticleIndex { category_id: string; }
interface HelpResource { id: string; title: string; title_ar: string; description: string; description_ar: string; url: string; icon_key: IconKey; order_index: number; }
interface HelpSettings { support_email: string; support_ticket_path: string; response_time_text: string; response_time_text_ar: string; availability_text: string; availability_text_ar: string; }

const iconMap: Record<IconKey, any> = { Award, BookOpen, FileText, User, Wrench, Rocket, HelpCircle, MessageCircle, ExternalLink };
const categoryColours = ['text-sky-600 bg-sky-50', 'text-emerald-600 bg-emerald-50', 'text-blue-700 bg-blue-50', 'text-cyan-700 bg-cyan-50', 'text-rose-600 bg-rose-50', 'text-indigo-600 bg-indigo-50'];
function IconFor({ name, className }: { name: IconKey; className?: string }) { const Icon = iconMap[name] || HelpCircle; return <Icon className={className} />; }

/** Help Center entry point. Articles are intentionally shown only within their category route. */
export default function HelpCenter() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [searchQuery, setSearchQuery] = useState('');

  const categoriesQuery = useQuery<HelpCategory[]>({
    queryKey: ['help-center-categories'],
    queryFn: async () => {
      const { data, error } = await db.from('help_categories').select('*').eq('is_published', true).order('order_index');
      if (error) throw error;
      return data || [];
    },
  });
  const articleIndexQuery = useQuery<HelpArticleIndex[]>({
    queryKey: ['help-center-article-index'],
    queryFn: async () => {
      const { data, error } = await db.from('help_articles').select('category_id').eq('is_published', true);
      if (error) throw error;
      return data || [];
    },
  });
  const resourcesQuery = useQuery<HelpResource[]>({
    queryKey: ['help-center-resources'],
    queryFn: async () => {
      const { data, error } = await db.from('help_resources').select('*').eq('is_published', true).order('order_index');
      if (error) throw error;
      return data || [];
    },
  });
  const settingsQuery = useQuery<HelpSettings | null>({
    queryKey: ['help-center-settings'],
    queryFn: async () => {
      const { data, error } = await db.from('help_center_settings').select('*').eq('id', true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const categories = categoriesQuery.data || [];
  const articleIndex = articleIndexQuery.data || [];
  const resources = resourcesQuery.data || [];
  const settings = settingsQuery.data || {
    support_email: 'support@bda-global.org',
    support_ticket_path: '/support/new',
    response_time_text: 'Response time: 24 hours',
    response_time_text_ar: 'وقت الاستجابة: 24 ساعة',
    availability_text: 'Available: 24/7',
    availability_text_ar: 'متوفر: 24/7',
  };
  const isLoading = categoriesQuery.isLoading || articleIndexQuery.isLoading || resourcesQuery.isLoading;

  const visibleCategories = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((category) => [category.title, category.title_ar, category.description, category.description_ar]
      .some((value) => value?.toLowerCase().includes(term)));
  }, [categories, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="text-white" style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}>
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-white/10">
            <HelpCircle className="h-7 w-7" />
          </div>
          <h1 className="mb-3 text-4xl font-bold">{isArabic ? 'كيف يمكننا مساعدتك؟' : 'How can we help you?'}</h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-blue-100">{isArabic ? 'اختر فئة للوصول إلى إجابات ومقالات الدعم ذات الصلة.' : 'Choose a category to access the relevant support articles and answers.'}</p>
          <div className="relative mx-auto max-w-2xl">
            <Search className={cn('absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400', isArabic ? 'right-4' : 'left-4')} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={isArabic ? 'ابحث في الفئات...' : 'Search categories...'}
              className={cn('w-full rounded-xl py-4 text-gray-900 shadow-lg outline-none focus:ring-2 focus:ring-blue-200', isArabic ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4')}
            />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="rounded-2xl border bg-white py-16 text-center text-sm text-gray-500" style={{ borderColor: BDA.border }}>Loading Help Center…</div>
        ) : (
          <>
            <section className="mb-16">
              <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-1 text-sm font-semibold uppercase tracking-[0.18em] text-[#0f91e0]">{isArabic ? 'قاعدة المعرفة' : 'Knowledge Base'}</p>
                  <h2 className="text-2xl font-bold text-gray-900">{isArabic ? 'تصفح حسب الفئة' : 'Browse by Category'}</h2>
                </div>
                <p className="text-sm text-gray-500">{visibleCategories.length} {isArabic ? 'فئات متاحة' : visibleCategories.length === 1 ? 'category available' : 'categories available'}</p>
              </div>

              {visibleCategories.length === 0 ? (
                <div className="rounded-2xl border bg-white py-14 text-center" style={{ borderColor: BDA.border }}>
                  <Search className="mx-auto mb-4 h-10 w-10 text-gray-300" />
                  <p className="text-gray-600">{isArabic ? 'لم يتم العثور على فئات مطابقة.' : 'No matching categories found.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {visibleCategories.map((category, index) => {
                    const count = articleIndex.filter((article) => article.category_id === category.id).length;
                    return (
                      <button
                        key={category.id}
                        onClick={() => navigate(`/help-center/category/${category.slug}`)}
                        className="group rounded-2xl border bg-white p-6 text-left transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0f91e0]"
                        style={{ borderColor: BDA.border }}
                      >
                        <div className="mb-7 flex items-start justify-between">
                          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', categoryColours[index % categoryColours.length])}>
                            <IconFor name={category.icon_key} className="h-6 w-6" />
                          </div>
                          <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">{count} {isArabic ? 'مقالة' : count === 1 ? 'article' : 'articles'}</span>
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-[#0f91e0]">{isArabic ? category.title_ar || category.title : category.title}</h3>
                        <p className="mb-6 min-h-10 text-sm leading-relaxed text-gray-600">{isArabic ? category.description_ar || category.description : category.description}</p>
                        <span className="flex items-center gap-2 text-sm font-semibold text-[#0f91e0]">
                          {isArabic ? 'عرض المقالات' : 'View articles'}
                          <ArrowRight className={cn('h-4 w-4 transition-transform group-hover:translate-x-1', isArabic && 'rotate-180 group-hover:-translate-x-1')} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mb-16 rounded-2xl border p-8" style={{ background: BDA.bluePale, borderColor: BDA.border }}>
              <div className="mx-auto max-w-3xl text-center">
                <MessageCircle className="mx-auto mb-4 h-12 w-12" style={{ color: BDA.blue }} />
                <h2 className="mb-3 text-2xl font-bold text-gray-900">{isArabic ? 'لا تزال بحاجة إلى مساعدة؟' : 'Still need help?'}</h2>
                <p className="mb-6 text-gray-700">{isArabic ? 'لم تجد ما تبحث عنه؟ فريق الدعم لدينا هنا لمساعدتك.' : "Can't find what you're looking for? Our support team is here to help."}</p>
                <div className="mb-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <button onClick={() => navigate(settings.support_ticket_path)} className="flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}>
                    <MessageCircle className="h-5 w-5" />{isArabic ? 'إنشاء تذكرة دعم' : 'Create Support Ticket'}
                  </button>
                  <a href={`mailto:${settings.support_email}`} className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50">
                    <Mail className="h-5 w-5" />{isArabic ? 'البريد الإلكتروني للدعم' : 'Email Support'}
                  </a>
                </div>
                <div className="flex flex-col items-center justify-center gap-4 text-sm text-gray-600 sm:flex-row sm:gap-8">
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span>{isArabic ? settings.response_time_text_ar : settings.response_time_text}</span></div>
                  <div className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /><span>{isArabic ? settings.availability_text_ar : settings.availability_text}</span></div>
                </div>
              </div>
            </section>

            {resources.length > 0 && (
              <section>
                <div className="mb-6"><p className="mb-1 text-sm font-semibold uppercase tracking-[0.18em] text-[#0f91e0]">{isArabic ? 'روابط مفيدة' : 'Useful links'}</p><h2 className="text-2xl font-bold text-gray-900">{isArabic ? 'موارد إضافية' : 'Additional Resources'}</h2></div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                  {resources.map((resource) => {
                    const external = /^https?:\/\//i.test(resource.url);
                    return <a key={resource.id} href={resource.url} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className="group rounded-2xl border bg-white p-6 transition hover:border-sky-300 hover:shadow-md" style={{ borderColor: BDA.border }}><IconFor name={resource.icon_key} className="mb-5 h-8 w-8 text-[#0f91e0]" /><h3 className="mb-2 font-semibold text-gray-900 group-hover:text-[#0f91e0]">{isArabic ? resource.title_ar || resource.title : resource.title}</h3><p className="mb-4 text-sm text-gray-600">{isArabic ? resource.description_ar || resource.description : resource.description}</p><span className="flex items-center gap-1 text-sm font-semibold text-[#0f91e0]">{isArabic ? 'فتح' : 'Open'}<ExternalLink className="h-3 w-3" /></span></a>;
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

HelpCenter.displayName = 'HelpCenter';
