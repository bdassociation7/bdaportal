import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe2, Save, Search, Share2, FileText, ShieldCheck, Sparkles, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface SeoPageSetting {
  page_key: string;
  page_label: string;
  route_pattern: string;
  title_en: string | null;
  description_en: string | null;
  keywords_en: string | null;
  social_title_en: string | null;
  social_description_en: string | null;
  title_ar: string | null;
  description_ar: string | null;
  keywords_ar: string | null;
  social_title_ar: string | null;
  social_description_ar: string | null;
  social_image_url: string | null;
  canonical_url: string | null;
  robots_directive: 'index, follow' | 'noindex, follow';
  schema_type: 'WebPage' | 'CollectionPage' | 'Organization' | 'Course';
  updated_at: string;
}

interface ProgrammeOption {
  id: string;
  program_name: string;
  slug: string | null;
  status: string;
  is_active: boolean;
}

type SeoDraft = Omit<SeoPageSetting, 'updated_at'>;
type ProgrammeSeoDraft = Omit<SeoDraft, 'page_key' | 'page_label' | 'route_pattern'> & { program_id: string };

const emptyProgrammeDraft = (programmeId: string): ProgrammeSeoDraft => ({
  program_id: programmeId,
  title_en: '',
  description_en: '',
  keywords_en: '',
  social_title_en: '',
  social_description_en: '',
  title_ar: '',
  description_ar: '',
  keywords_ar: '',
  social_title_ar: '',
  social_description_ar: '',
  social_image_url: '',
  canonical_url: '',
  robots_directive: 'index, follow',
  schema_type: 'Course',
});

function isAbsoluteUrl(value: string | null) {
  if (!value?.trim()) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function CharacterCount({ value, target }: { value: string | null | undefined; target: number }) {
  const length = value?.length || 0;
  return <span className={`text-xs ${length > target ? 'text-rose-600' : 'text-slate-500'}`}>{length}/{target}</span>;
}

function SeoTextFields({ draft, onChange }: { draft: SeoDraft | ProgrammeSeoDraft; onChange: (patch: Partial<SeoDraft>) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 text-sm text-[#1c4a8b]"><span className="font-medium">English search metadata</span><span>Used across all public search results</span></div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between"><Label>SEO title</Label><CharacterCount value={draft.title_en} target={60} /></div>
        <Input value={draft.title_en || ''} onChange={(event) => onChange({ title_en: event.target.value })} placeholder="Clear title for search results" maxLength={100} />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between"><Label>Meta description</Label><CharacterCount value={draft.description_en} target={160} /></div>
        <Textarea value={draft.description_en || ''} onChange={(event) => onChange({ description_en: event.target.value })} placeholder="A concise, accurate description of this public page" rows={3} maxLength={320} />
      </div>
      <div className="space-y-1.5"><Label>Focus key phrases</Label><Input value={draft.keywords_en || ''} onChange={(event) => onChange({ keywords_en: event.target.value })} placeholder="Separate phrases with commas" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Social sharing title</Label><Input value={draft.social_title_en || ''} onChange={(event) => onChange({ social_title_en: event.target.value })} placeholder="Optional — uses SEO title when blank" /></div>
        <div className="space-y-1.5"><Label>Social sharing description</Label><Input value={draft.social_description_en || ''} onChange={(event) => onChange({ social_description_en: event.target.value })} placeholder="Optional — uses meta description when blank" /></div>
      </div>
    </div>
  );
}

function PublicationControls({ draft, onChange, showSchema = true }: { draft: SeoDraft | ProgrammeSeoDraft; onChange: (patch: Partial<SeoDraft>) => void; showSchema?: boolean }) {
  const imageIsValid = isAbsoluteUrl(draft.social_image_url);
  return (
    <Card className="border-blue-100 shadow-sm">
      <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-lg text-[#0d1f4e]"><Share2 className="h-5 w-5 text-[#0f91e0]" />Publishing & sharing</CardTitle><CardDescription>Control indexing, canonical URLs, and how the page appears when it is shared.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Search visibility</Label><Select value={draft.robots_directive} onValueChange={(value) => onChange({ robots_directive: value as SeoDraft['robots_directive'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="index, follow">Index, follow</SelectItem><SelectItem value="noindex, follow">No index, follow</SelectItem></SelectContent></Select></div>
          {showSchema && <div className="space-y-1.5"><Label>Structured data type</Label><Select value={draft.schema_type} onValueChange={(value) => onChange({ schema_type: value as SeoDraft['schema_type'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="WebPage">Web page</SelectItem><SelectItem value="CollectionPage">Directory / collection</SelectItem><SelectItem value="Organization">Organisation</SelectItem><SelectItem value="Course">Course</SelectItem></SelectContent></Select></div>}
        </div>
        <div className="space-y-1.5"><Label>Canonical URL</Label><Input dir="ltr" value={draft.canonical_url || ''} onChange={(event) => onChange({ canonical_url: event.target.value })} placeholder="https://portal.bda-global.org/public/..." /></div>
        <div className="space-y-1.5"><div className="flex items-center gap-2"><Label>Social sharing image URL</Label>{!imageIsValid && <span className="text-xs text-rose-600">Use a complete https:// URL</span>}</div><Input dir="ltr" value={draft.social_image_url || ''} onChange={(event) => onChange({ social_image_url: event.target.value })} placeholder="https://.../image.jpg" /></div>
      </CardContent>
    </Card>
  );
}

function SearchPreview({ draft, pathLabel }: { draft: SeoDraft | ProgrammeSeoDraft; pathLabel: string }) {
  const title = draft.title_en?.trim() || 'SEO title will appear here';
  const description = draft.description_en?.trim() || 'Add a concise description so search engines and visitors understand this page.';
  const canonical = draft.canonical_url?.trim() || `https://portal.bda-global.org${pathLabel}`;
  return <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/60 shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg text-[#0d1f4e]"><Search className="h-5 w-5 text-[#0f91e0]" />Search preview</CardTitle><CardDescription>A planning preview; search engines decide final presentation.</CardDescription></CardHeader><CardContent><p className="truncate text-sm text-[#1c4a8b]">{canonical}</p><p className="mt-1 text-xl font-medium leading-tight text-[#1a0dab]">{title}</p><p className="mt-1.5 text-sm leading-5 text-slate-600">{description}</p></CardContent></Card>;
}

export default function SEOManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPageKey, setSelectedPageKey] = useState('portal-home');
  const [pageDraft, setPageDraft] = useState<SeoDraft | null>(null);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('');
  const [programmeDraft, setProgrammeDraft] = useState<ProgrammeSeoDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const pagesQuery = useQuery({ queryKey: ['seo-page-settings-admin'], queryFn: async () => {
    const { data, error } = await (supabase as any).from('seo_page_settings').select('*').order('page_label');
    if (error) throw error;
    return (data || []) as SeoPageSetting[];
  }});
  const programmesQuery = useQuery({ queryKey: ['seo-programmes-admin'], queryFn: async () => {
    const { data, error } = await (supabase as any).from('pdp_programs').select('id, program_name, slug, status, is_active').order('program_name').limit(500);
    if (error) throw error;
    return (data || []) as ProgrammeOption[];
  }});
  const programmeOverrideQuery = useQuery({
    queryKey: ['seo-programme-override-admin', selectedProgrammeId],
    enabled: Boolean(selectedProgrammeId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('seo_program_overrides').select('*').eq('program_id', selectedProgrammeId).maybeSingle();
      if (error) throw error;
      return data as ProgrammeSeoDraft | null;
    },
  });

  const selectedPage = useMemo(() => pagesQuery.data?.find((page) => page.page_key === selectedPageKey) || null, [pagesQuery.data, selectedPageKey]);
  const selectedProgramme = useMemo(() => programmesQuery.data?.find((programme) => programme.id === selectedProgrammeId) || null, [programmesQuery.data, selectedProgrammeId]);

  useEffect(() => { if (selectedPage) setPageDraft({ ...selectedPage }); }, [selectedPage]);
  useEffect(() => {
    if (!selectedProgrammeId) { setProgrammeDraft(null); return; }
    setProgrammeDraft(programmeOverrideQuery.data ? { ...programmeOverrideQuery.data, program_id: selectedProgrammeId } : emptyProgrammeDraft(selectedProgrammeId));
  }, [selectedProgrammeId, programmeOverrideQuery.data]);

  const savePage = async () => {
    if (!pageDraft || !isAbsoluteUrl(pageDraft.social_image_url)) { toast({ title: 'Check the social image URL', description: 'Use a complete https:// URL or leave the field blank.', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const { error } = await (supabase as any).from('seo_page_settings').upsert(pageDraft, { onConflict: 'page_key' });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['seo-page-settings-admin'] });
      toast({ title: 'SEO settings saved', description: 'The public page will use the updated metadata on its next load.' });
    } catch (error: any) { toast({ title: 'Could not save SEO settings', description: error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const saveProgramme = async () => {
    if (!programmeDraft || !isAbsoluteUrl(programmeDraft.social_image_url)) { toast({ title: 'Check the social image URL', description: 'Use a complete https:// URL or leave the field blank.', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const { schema_type: _schemaType, ...payload } = programmeDraft;
      const { error } = await (supabase as any).from('seo_program_overrides').upsert(payload, { onConflict: 'program_id' });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['seo-programme-override-admin', selectedProgrammeId] });
      toast({ title: 'Programme SEO saved', description: 'The public programme page will use this override on its next load.' });
    } catch (error: any) { toast({ title: 'Could not save programme SEO', description: error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  if (pagesQuery.isLoading || programmesQuery.isLoading) return <div className="p-8 text-slate-500">Loading SEO settings…</div>;
  if (pagesQuery.error || programmesQuery.error) return <div className="p-8 text-rose-600">SEO settings could not be loaded. Please refresh and try again.</div>;

  return <div className="mx-auto max-w-7xl space-y-6 pb-10">
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0] px-6 py-7 text-white shadow-lg sm:px-8">
      <div className="absolute -right-14 -top-20 h-56 w-56 rounded-full border border-white/15" />
      <div className="relative"><div className="flex flex-wrap items-center gap-3"><div className="rounded-xl bg-white/15 p-2.5"><Globe2 className="h-6 w-6" /></div><div><h1 className="text-2xl font-bold">SEO & Public Pages</h1><p className="mt-1 max-w-2xl text-sm text-blue-100">Manage searchable titles, descriptions, sharing previews, and indexing for public BDA portal pages.</p></div><Badge className="ml-auto border border-white/25 bg-white/15 text-white">Super Admin only</Badge></div></div>
    </section>

    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-[#0d1f4e] flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0f91e0]" /><p><strong>Scope:</strong> These settings affect public metadata only. They do not change accounts, access rights, vouchers, examination content, or learning content.</p></div>

    <Tabs defaultValue="pages" className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-2 bg-blue-50"><TabsTrigger value="pages">Public pages</TabsTrigger><TabsTrigger value="programmes">Programme overrides</TabsTrigger></TabsList>
      <TabsContent value="pages" className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="border-blue-100 shadow-sm"><CardHeader><CardTitle className="text-lg text-[#0d1f4e]">Public page records</CardTitle><CardDescription>Select a page to edit its published metadata.</CardDescription></CardHeader><CardContent className="space-y-2">{pagesQuery.data?.map((page) => <button key={page.page_key} onClick={() => setSelectedPageKey(page.page_key)} className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedPageKey === page.page_key ? 'border-[#0f91e0] bg-blue-50 text-[#0d1f4e]' : 'border-slate-200 hover:border-blue-200 hover:bg-blue-50/50'}`}><p className="font-semibold text-sm">{page.page_label}</p><p className="mt-1 truncate text-xs text-slate-500">{page.route_pattern}</p></button>)}</CardContent></Card>
          {pageDraft && <div className="space-y-6"><Card className="border-blue-100 shadow-sm"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-xl text-[#0d1f4e]"><FileText className="h-5 w-5 text-[#0f91e0]" />{pageDraft.page_label}</CardTitle><CardDescription className="mt-1 font-mono">{pageDraft.route_pattern}</CardDescription></div><a href={pageDraft.route_pattern === '/verify' ? '/verify' : pageDraft.route_pattern} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-[#1c4a8b] hover:underline">Open public page <ExternalLink className="h-3.5 w-3.5" /></a></div></CardHeader><CardContent><SeoTextFields draft={pageDraft} onChange={(patch) => setPageDraft((current) => current ? { ...current, ...patch } : current)} /></CardContent></Card><PublicationControls draft={pageDraft} onChange={(patch) => setPageDraft((current) => current ? { ...current, ...patch } : current)} /><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"><SearchPreview draft={pageDraft} pathLabel={pageDraft.route_pattern} /><Card className="border-blue-100 shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg text-[#0d1f4e]"><Sparkles className="h-5 w-5 text-[#0f91e0]" />Publication checks</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-600"><p>{pageDraft.title_en?.length || 0} title characters</p><p>{pageDraft.description_en?.length || 0} description characters</p><p className={pageDraft.robots_directive === 'index, follow' ? 'text-[#1c4a8b]' : 'text-[#0d1f4e]'}>{pageDraft.robots_directive === 'index, follow' ? 'Search indexing enabled' : 'Search indexing disabled'}</p></CardContent></Card></div><div className="flex justify-end"><Button onClick={savePage} disabled={saving} className="gap-2 bg-[#0f91e0] hover:bg-[#1c4a8b]"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save public page SEO'}</Button></div></div>}
        </div>
      </TabsContent>
      <TabsContent value="programmes" className="space-y-6">
        <Card className="border-blue-100 shadow-sm"><CardHeader><CardTitle className="text-xl text-[#0d1f4e]">Programme-level SEO overrides</CardTitle><CardDescription>Leave fields blank to retain the programme’s automatic SEO generated from its approved public record.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="max-w-2xl space-y-1.5"><Label>Approved programme</Label><Select value={selectedProgrammeId} onValueChange={setSelectedProgrammeId}><SelectTrigger><SelectValue placeholder="Select a programme" /></SelectTrigger><SelectContent>{programmesQuery.data?.filter((programme) => programme.status === 'approved' && programme.is_active).map((programme) => <SelectItem key={programme.id} value={programme.id}>{programme.program_name}</SelectItem>)}</SelectContent></Select></div>{selectedProgramme && programmeDraft && <div className="space-y-6 border-t border-slate-200 pt-6"><div className="rounded-lg bg-blue-50 p-4"><p className="font-semibold text-[#0d1f4e]">{selectedProgramme.program_name}</p><p className="mt-1 text-sm text-slate-600">Public URL: /public/programs/{selectedProgramme.slug || 'programme-slug'}</p></div><SeoTextFields draft={programmeDraft} onChange={(patch) => setProgrammeDraft((current) => current ? { ...current, ...patch } : current)} /><PublicationControls draft={programmeDraft} onChange={(patch) => setProgrammeDraft((current) => current ? { ...current, ...patch } : current)} showSchema={false} /><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"><SearchPreview draft={programmeDraft} pathLabel={`/public/programs/${selectedProgramme.slug || ''}`} /><Card className="border-blue-100 shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg text-[#0d1f4e]"><ImageIcon className="h-5 w-5 text-[#0f91e0]" />Automatic fallback</CardTitle></CardHeader><CardContent className="text-sm text-slate-600">Any blank field continues to use the approved programme name, description, provider, and BDA Course schema already used on the public programme page.</CardContent></Card></div><div className="flex justify-end"><Button onClick={saveProgramme} disabled={saving} className="gap-2 bg-[#0f91e0] hover:bg-[#1c4a8b]"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save programme SEO'}</Button></div></div>}</CardContent></Card>
      </TabsContent>
    </Tabs>
  </div>;
}
