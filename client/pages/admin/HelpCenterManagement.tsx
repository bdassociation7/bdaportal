import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, CircleHelp, Edit, ExternalLink, FileText, FolderPlus,
  HelpCircle, Link2, ListChecks, MessageCircle, Plus, Save, Settings,
  Trash2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/shared/config/supabase.config';

const db = supabase as any;
const BDA = { navy: '#0d1f4e', blue: '#0f91e0', bluePale: '#f0f6ff', border: '#e2eaf6' };
const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#0f91e0] focus:ring-2 focus:ring-[#0f91e0]/15';

type Tab = 'categories' | 'articles' | 'resources' | 'settings';
type IconKey = 'Award' | 'BookOpen' | 'FileText' | 'User' | 'Wrench' | 'Rocket' | 'HelpCircle' | 'MessageCircle' | 'ExternalLink';

interface HelpCategory {
  id: string;
  slug: string;
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  icon_key: IconKey;
  order_index: number;
  is_published: boolean;
}

interface HelpArticle {
  id: string;
  category_id: string;
  question: string;
  question_ar: string;
  answer: string;
  answer_ar: string;
  order_index: number;
  is_published: boolean;
}

interface HelpResource {
  id: string;
  slug: string;
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  url: string;
  icon_key: IconKey;
  order_index: number;
  is_published: boolean;
}

interface HelpSettings {
  id: boolean;
  support_email: string;
  support_ticket_path: string;
  response_time_text: string;
  response_time_text_ar: string;
  availability_text: string;
  availability_text_ar: string;
}

const icons: Record<IconKey, any> = {
  Award: CircleHelp,
  BookOpen,
  FileText,
  User: CircleHelp,
  Wrench: Settings,
  Rocket: ExternalLink,
  HelpCircle,
  MessageCircle,
  ExternalLink,
};

function getIcon(key: IconKey) {
  return icons[key] || HelpCircle;
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      {published ? 'Published' : 'Draft'}
    </span>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/70 transition hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">{children}</label>;
}

function PublishedControl({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-700">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 rounded" />
      Published and visible in Help Center
    </label>
  );
}

function CategoryForm({ initial, onClose, onSaved }: { initial: HelpCategory | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    slug: initial?.slug || '', title: initial?.title || '', title_ar: initial?.title_ar || '',
    description: initial?.description || '', description_ar: initial?.description_ar || '',
    icon_key: initial?.icon_key || 'HelpCircle' as IconKey, order_index: initial?.order_index ?? 1,
    is_published: initial?.is_published ?? true,
  });
  const [saving, setSaving] = useState(false);
  const update = (values: Partial<typeof form>) => setForm(current => ({ ...current, ...values }));
  const save = async () => {
    if (!form.slug.trim() || !form.title.trim()) { toast({ title: 'Slug and English title are required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = { ...form, slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'), title: form.title.trim(), updated_at: new Date().toISOString() };
      const result = initial ? await db.from('help_categories').update(payload).eq('id', initial.id) : await db.from('help_categories').insert(payload);
      if (result.error) throw result.error;
      toast({ title: initial ? 'Category updated' : 'Category created' }); onSaved(); onClose();
    } catch (error: any) { toast({ title: 'Could not save category', description: error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  return <Modal title={initial ? 'Edit Help Category' : 'New Help Category'} onClose={onClose}>
    <div className="grid gap-4 md:grid-cols-2">
      <div><FieldLabel>Title (English) *</FieldLabel><input value={form.title} onChange={e => update({ title: e.target.value })} className={inputClass} /></div>
      <div><FieldLabel>العنوان بالعربية</FieldLabel><input value={form.title_ar} onChange={e => update({ title_ar: e.target.value })} dir="rtl" className={inputClass} /></div>
      <div><FieldLabel>Slug *</FieldLabel><input value={form.slug} onChange={e => update({ slug: e.target.value })} placeholder="e.g. certification" className={inputClass} /></div>
      <div><FieldLabel>Icon</FieldLabel><select value={form.icon_key} onChange={e => update({ icon_key: e.target.value as IconKey })} className={inputClass}>{Object.keys(icons).map(icon => <option key={icon}>{icon}</option>)}</select></div>
      <div className="md:col-span-2"><FieldLabel>Description (English)</FieldLabel><textarea rows={2} value={form.description} onChange={e => update({ description: e.target.value })} className={inputClass} /></div>
      <div className="md:col-span-2"><FieldLabel>الوصف بالعربية</FieldLabel><textarea rows={2} value={form.description_ar} onChange={e => update({ description_ar: e.target.value })} dir="rtl" className={inputClass} /></div>
      <div><FieldLabel>Display order</FieldLabel><input type="number" min={1} value={form.order_index} onChange={e => update({ order_index: Number(e.target.value) || 1 })} className={inputClass} /></div>
      <div className="flex items-end"><PublishedControl checked={form.is_published} onChange={value => update({ is_published: value })} /></div>
    </div>
    <div className="mt-6 flex justify-end gap-3 border-t pt-5"><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button disabled={saving} onClick={save} className="gap-2" style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Category'}</Button></div>
  </Modal>;
}

function ArticleForm({ initial, categories, onClose, onSaved }: { initial: HelpArticle | null; categories: HelpCategory[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    category_id: initial?.category_id || categories[0]?.id || '', question: initial?.question || '', question_ar: initial?.question_ar || '',
    answer: initial?.answer || '', answer_ar: initial?.answer_ar || '', order_index: initial?.order_index ?? 1, is_published: initial?.is_published ?? true,
  });
  const [saving, setSaving] = useState(false);
  const update = (values: Partial<typeof form>) => setForm(current => ({ ...current, ...values }));
  const save = async () => {
    if (!form.category_id || !form.question.trim() || !form.answer.trim()) { toast({ title: 'Category, English question and English answer are required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = { ...form, question: form.question.trim(), answer: form.answer.trim(), updated_at: new Date().toISOString() };
      const result = initial ? await db.from('help_articles').update(payload).eq('id', initial.id) : await db.from('help_articles').insert(payload);
      if (result.error) throw result.error;
      toast({ title: initial ? 'FAQ updated' : 'FAQ created' }); onSaved(); onClose();
    } catch (error: any) { toast({ title: 'Could not save FAQ', description: error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  return <Modal title={initial ? 'Edit Help Article' : 'New Help Article'} onClose={onClose}>
    <div className="space-y-4">
      <div><FieldLabel>Category *</FieldLabel><select value={form.category_id} onChange={e => update({ category_id: e.target.value })} className={inputClass}><option value="">Select category</option>{categories.map(category => <option value={category.id} key={category.id}>{category.title}</option>)}</select></div>
      <div><FieldLabel>Question (English) *</FieldLabel><textarea rows={2} value={form.question} onChange={e => update({ question: e.target.value })} className={inputClass} /></div>
      <div><FieldLabel>السؤال بالعربية</FieldLabel><textarea rows={2} value={form.question_ar} onChange={e => update({ question_ar: e.target.value })} dir="rtl" className={inputClass} /></div>
      <div><FieldLabel>Answer (English) *</FieldLabel><textarea rows={5} value={form.answer} onChange={e => update({ answer: e.target.value })} className={inputClass} /></div>
      <div><FieldLabel>الإجابة بالعربية</FieldLabel><textarea rows={5} value={form.answer_ar} onChange={e => update({ answer_ar: e.target.value })} dir="rtl" className={inputClass} /></div>
      <div className="grid gap-4 md:grid-cols-2"><div><FieldLabel>Display order</FieldLabel><input type="number" min={1} value={form.order_index} onChange={e => update({ order_index: Number(e.target.value) || 1 })} className={inputClass} /></div><div className="flex items-end"><PublishedControl checked={form.is_published} onChange={value => update({ is_published: value })} /></div></div>
    </div>
    <div className="mt-6 flex justify-end gap-3 border-t pt-5"><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button disabled={saving} onClick={save} className="gap-2" style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Article'}</Button></div>
  </Modal>;
}

function ResourceForm({ initial, onClose, onSaved }: { initial: HelpResource | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    slug: initial?.slug || '', title: initial?.title || '', title_ar: initial?.title_ar || '', description: initial?.description || '', description_ar: initial?.description_ar || '',
    url: initial?.url || '', icon_key: initial?.icon_key || 'ExternalLink' as IconKey, order_index: initial?.order_index ?? 1, is_published: initial?.is_published ?? true,
  });
  const [saving, setSaving] = useState(false);
  const update = (values: Partial<typeof form>) => setForm(current => ({ ...current, ...values }));
  const save = async () => {
    const destinationUrl = form.url.trim();
    if (!form.slug.trim() || !form.title.trim() || !destinationUrl) { toast({ title: 'Slug, English title and destination link are required', variant: 'destructive' }); return; }
    try {
      const parsedUrl = new URL(destinationUrl);
      if (!['https:', 'http:'].includes(parsedUrl.protocol)) throw new Error('Unsupported protocol');
    } catch {
      toast({ title: 'Enter a complete external URL', description: 'Use a full link beginning with https:// or http://.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'), url: destinationUrl, updated_at: new Date().toISOString() };
      const result = initial ? await db.from('help_resources').update(payload).eq('id', initial.id) : await db.from('help_resources').insert(payload);
      if (result.error) throw result.error;
      toast({ title: initial ? 'Resource updated' : 'Resource created' }); onSaved(); onClose();
    } catch (error: any) { toast({ title: 'Could not save resource', description: error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  return <Modal title={initial ? 'Edit Resource Link' : 'New Resource Link'} onClose={onClose}>
    <div className="grid gap-4 md:grid-cols-2">
      <div><FieldLabel>Title (English) *</FieldLabel><input value={form.title} onChange={e => update({ title: e.target.value })} className={inputClass} /></div>
      <div><FieldLabel>العنوان بالعربية</FieldLabel><input value={form.title_ar} onChange={e => update({ title_ar: e.target.value })} dir="rtl" className={inputClass} /></div>
      <div><FieldLabel>Slug *</FieldLabel><input value={form.slug} onChange={e => update({ slug: e.target.value })} className={inputClass} /></div>
      <div><FieldLabel>Icon</FieldLabel><select value={form.icon_key} onChange={e => update({ icon_key: e.target.value as IconKey })} className={inputClass}>{Object.keys(icons).map(icon => <option key={icon}>{icon}</option>)}</select></div>
      <div className="md:col-span-2"><FieldLabel>External destination URL *</FieldLabel><input type="url" value={form.url} onChange={e => update({ url: e.target.value })} placeholder="https://example.com/resource" className={inputClass} /><p className="mt-1 text-xs text-gray-400">Use a complete external link beginning with https:// or http://.</p></div>
      <div className="md:col-span-2"><FieldLabel>Description (English)</FieldLabel><textarea rows={2} value={form.description} onChange={e => update({ description: e.target.value })} className={inputClass} /></div>
      <div className="md:col-span-2"><FieldLabel>الوصف بالعربية</FieldLabel><textarea rows={2} value={form.description_ar} onChange={e => update({ description_ar: e.target.value })} dir="rtl" className={inputClass} /></div>
      <div><FieldLabel>Display order</FieldLabel><input type="number" min={1} value={form.order_index} onChange={e => update({ order_index: Number(e.target.value) || 1 })} className={inputClass} /></div>
      <div className="flex items-end"><PublishedControl checked={form.is_published} onChange={value => update({ is_published: value })} /></div>
    </div>
    <div className="mt-6 flex justify-end gap-3 border-t pt-5"><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button disabled={saving} onClick={save} className="gap-2" style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Resource'}</Button></div>
  </Modal>;
}

function SettingsForm({ initial, onSaved }: { initial: HelpSettings | null; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<HelpSettings>({
    id: true, support_email: '', support_ticket_path: '/support/new', response_time_text: '', response_time_text_ar: '', availability_text: '', availability_text_ar: '',
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (initial) setForm(initial); }, [initial]);
  const update = (values: Partial<HelpSettings>) => setForm(current => ({ ...current, ...values }));
  const save = async () => {
    if (!form.support_email.trim() || !form.support_ticket_path.trim()) { toast({ title: 'Support email and ticket path are required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const { error } = await db.from('help_center_settings').upsert({ ...form, id: true, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast({ title: 'Help Center settings saved' }); onSaved();
    } catch (error: any) { toast({ title: 'Could not save settings', description: error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  return <div className="max-w-3xl rounded-2xl border bg-white p-6" style={{ borderColor: BDA.border }}>
    <h3 className="text-base font-bold" style={{ color: BDA.navy }}>Support contact settings</h3>
    <p className="mt-1 text-sm text-gray-500">Control the support button, contact email and service messages shown in the public Help Center.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <div><FieldLabel>Support email *</FieldLabel><input value={form.support_email} onChange={e => update({ support_email: e.target.value })} className={inputClass} /></div>
      <div><FieldLabel>Support ticket path *</FieldLabel><input value={form.support_ticket_path} onChange={e => update({ support_ticket_path: e.target.value })} className={inputClass} /></div>
      <div><FieldLabel>Response time (English)</FieldLabel><input value={form.response_time_text} onChange={e => update({ response_time_text: e.target.value })} className={inputClass} /></div>
      <div><FieldLabel>وقت الاستجابة بالعربية</FieldLabel><input value={form.response_time_text_ar} onChange={e => update({ response_time_text_ar: e.target.value })} dir="rtl" className={inputClass} /></div>
      <div><FieldLabel>Availability (English)</FieldLabel><input value={form.availability_text} onChange={e => update({ availability_text: e.target.value })} className={inputClass} /></div>
      <div><FieldLabel>التوافر بالعربية</FieldLabel><input value={form.availability_text_ar} onChange={e => update({ availability_text_ar: e.target.value })} dir="rtl" className={inputClass} /></div>
    </div>
    <div className="mt-6 flex justify-end"><Button disabled={saving} onClick={save} className="gap-2" style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Settings'}</Button></div>
  </div>;
}

export default function HelpCenterManagement() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('categories');
  const [categoryForm, setCategoryForm] = useState<HelpCategory | null | undefined>(undefined);
  const [articleForm, setArticleForm] = useState<HelpArticle | null | undefined>(undefined);
  const [resourceForm, setResourceForm] = useState<HelpResource | null | undefined>(undefined);

  const categoriesQuery = useQuery<HelpCategory[]>({ queryKey: ['admin-help-categories'], queryFn: async () => { const { data, error } = await db.from('help_categories').select('*').order('order_index'); if (error) throw error; return data || []; } });
  const articlesQuery = useQuery<HelpArticle[]>({ queryKey: ['admin-help-articles'], queryFn: async () => { const { data, error } = await db.from('help_articles').select('*').order('order_index'); if (error) throw error; return data || []; } });
  const resourcesQuery = useQuery<HelpResource[]>({ queryKey: ['admin-help-resources'], queryFn: async () => { const { data, error } = await db.from('help_resources').select('*').order('order_index'); if (error) throw error; return data || []; } });
  const settingsQuery = useQuery<HelpSettings | null>({ queryKey: ['admin-help-settings'], queryFn: async () => { const { data, error } = await db.from('help_center_settings').select('*').eq('id', true).maybeSingle(); if (error) throw error; return data; } });

  const categories = categoriesQuery.data || [];
  const articles = articlesQuery.data || [];
  const resources = resourcesQuery.data || [];
  const categoryById = useMemo(() => new Map(categories.map(category => [category.id, category])), [categories]);
  const refreshAll = () => { categoriesQuery.refetch(); articlesQuery.refetch(); resourcesQuery.refetch(); settingsQuery.refetch(); };
  const remove = async (table: string, id: string, label: string) => {
    if (!window.confirm(`Delete this ${label}? This action cannot be undone.`)) return;
    const { error } = await db.from(table).delete().eq('id', id);
    if (error) toast({ title: `Could not delete ${label}`, description: error.message, variant: 'destructive' });
    else { toast({ title: `${label[0].toUpperCase()}${label.slice(1)} deleted` }); refreshAll(); }
  };
  const loading = categoriesQuery.isLoading || articlesQuery.isLoading || resourcesQuery.isLoading;

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'categories', label: 'Categories', icon: FolderPlus, count: categories.length },
    { id: 'articles', label: 'FAQs & Articles', icon: ListChecks, count: articles.length },
    { id: 'resources', label: 'Resource Links', icon: Link2, count: resources.length },
    { id: 'settings', label: 'Support Settings', icon: Settings },
  ];

  return <div className="space-y-6 p-6">
    <div className="rounded-2xl p-7 text-white" style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div><div className="mb-2 flex items-center gap-2 text-sm text-white/70"><HelpCircle className="h-4 w-4" /> Support Content</div><h1 className="text-2xl font-bold">Help Center Management</h1><p className="mt-1 text-sm text-white/75">Manage the categories, questions, answers, resource links and support details shown to portal users.</p></div>
        <a href="/help-center" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"><ExternalLink className="h-4 w-4" />Preview Help Center</a>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      {[{ label: 'Categories', value: categories.length, icon: FolderPlus }, { label: 'Published articles', value: articles.filter(article => article.is_published).length, icon: ListChecks }, { label: 'Active resource links', value: resources.filter(resource => resource.is_published).length, icon: Link2 }].map(stat => { const Icon = stat.icon; return <div key={stat.label} className="rounded-xl border bg-white p-5" style={{ borderColor: BDA.border }}><Icon className="mb-3 h-5 w-5" style={{ color: BDA.blue }} /><p className="text-2xl font-bold" style={{ color: BDA.navy }}>{stat.value}</p><p className="text-sm text-gray-500">{stat.label}</p></div>; })}
    </div>

    <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-2" style={{ borderColor: BDA.border }}>{tabs.map(item => { const Icon = item.icon; const active = tab === item.id; return <button key={item.id} onClick={() => setTab(item.id)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition" style={{ background: active ? BDA.bluePale : 'transparent', color: active ? BDA.navy : '#6b7280' }}><Icon className="h-4 w-4" />{item.label}{item.count !== undefined && <span className="rounded-full bg-white px-1.5 py-0.5 text-xs">{item.count}</span>}</button>; })}</div>

    {loading ? <div className="rounded-xl border bg-white p-10 text-center text-sm text-gray-500" style={{ borderColor: BDA.border }}>Loading Help Center content…</div> : <>
      {tab === 'categories' && <div className="rounded-2xl border bg-white" style={{ borderColor: BDA.border }}><div className="flex items-center justify-between border-b p-5" style={{ borderColor: BDA.border }}><div><h2 className="font-bold" style={{ color: BDA.navy }}>Help Categories</h2><p className="mt-1 text-sm text-gray-500">Categories organise the FAQ list on the public Help Center.</p></div><Button onClick={() => setCategoryForm(null)} className="gap-2" style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}><Plus className="h-4 w-4" />Add Category</Button></div><div className="divide-y" style={{ borderColor: BDA.border }}>{categories.map(category => { const Icon = getIcon(category.icon_key); const count = articles.filter(article => article.category_id === category.id).length; return <div key={category.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: BDA.bluePale, color: BDA.blue }}><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="font-semibold" style={{ color: BDA.navy }}>{category.order_index}. {category.title}</p><p className="mt-0.5 truncate text-sm text-gray-500">{category.description || 'No description added'}</p><p className="mt-1 text-xs text-gray-400">{count} article{count === 1 ? '' : 's'} · {category.slug}</p></div><StatusBadge published={category.is_published} /><div className="flex gap-2"><Button size="icon" variant="outline" onClick={() => setCategoryForm(category)} title="Edit category"><Edit className="h-4 w-4" /></Button><Button size="icon" variant="outline" onClick={() => remove('help_categories', category.id, 'category')} title="Delete category" className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button></div></div>; })}</div></div>}

      {tab === 'articles' && <div className="rounded-2xl border bg-white" style={{ borderColor: BDA.border }}><div className="flex items-center justify-between border-b p-5" style={{ borderColor: BDA.border }}><div><h2 className="font-bold" style={{ color: BDA.navy }}>FAQs & Articles</h2><p className="mt-1 text-sm text-gray-500">Questions and answers displayed in the Help Center accordion.</p></div><Button onClick={() => setArticleForm(null)} className="gap-2" disabled={!categories.length} style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}><Plus className="h-4 w-4" />Add FAQ</Button></div>{!categories.length ? <div className="p-10 text-center text-sm text-gray-500">Create a category before adding FAQs.</div> : <div className="divide-y" style={{ borderColor: BDA.border }}>{articles.map(article => <div key={article.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center"><div className="min-w-0 flex-1"><div className="mb-1 flex flex-wrap items-center gap-2"><span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ color: BDA.navy, background: BDA.bluePale }}>{categoryById.get(article.category_id)?.title || 'Uncategorised'}</span><span className="text-xs text-gray-400">Order {article.order_index}</span></div><p className="line-clamp-2 font-semibold" style={{ color: BDA.navy }}>{article.question}</p><p className="mt-1 line-clamp-1 text-sm text-gray-500">{article.answer}</p></div><StatusBadge published={article.is_published} /><div className="flex gap-2"><Button size="icon" variant="outline" onClick={() => setArticleForm(article)} title="Edit FAQ"><Edit className="h-4 w-4" /></Button><Button size="icon" variant="outline" onClick={() => remove('help_articles', article.id, 'FAQ')} title="Delete FAQ" className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>}</div>}

      {tab === 'resources' && <div className="rounded-2xl border bg-white" style={{ borderColor: BDA.border }}><div className="flex items-center justify-between border-b p-5" style={{ borderColor: BDA.border }}><div><h2 className="font-bold" style={{ color: BDA.navy }}>Resource Links</h2><p className="mt-1 text-sm text-gray-500">The cards at the bottom of Help Center. Set a complete external URL for each resource.</p></div><Button onClick={() => setResourceForm(null)} className="gap-2" style={{ background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)' }}><Plus className="h-4 w-4" />Add Resource</Button></div><div className="divide-y" style={{ borderColor: BDA.border }}>{resources.map(resource => { const Icon = getIcon(resource.icon_key); return <div key={resource.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: BDA.bluePale, color: BDA.blue }}><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="font-semibold" style={{ color: BDA.navy }}>{resource.order_index}. {resource.title}</p><p className="mt-0.5 text-sm text-gray-500">{resource.description || 'No description added'}</p><p className="mt-1 truncate text-xs text-gray-400">{resource.url}</p></div><StatusBadge published={resource.is_published} /><div className="flex gap-2"><Button size="icon" variant="outline" onClick={() => setResourceForm(resource)} title="Edit resource"><Edit className="h-4 w-4" /></Button><Button size="icon" variant="outline" onClick={() => remove('help_resources', resource.id, 'resource')} title="Delete resource" className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button></div></div>; })}</div></div>}

      {tab === 'settings' && <SettingsForm initial={settingsQuery.data || null} onSaved={refreshAll} />}
    </>}

    {categoryForm !== undefined && <CategoryForm initial={categoryForm} onClose={() => setCategoryForm(undefined)} onSaved={refreshAll} />}
    {articleForm !== undefined && <ArticleForm initial={articleForm} categories={categories} onClose={() => setArticleForm(undefined)} onSaved={refreshAll} />}
    {resourceForm !== undefined && <ResourceForm initial={resourceForm} onClose={() => setResourceForm(undefined)} onSaved={refreshAll} />}
  </div>;
}
