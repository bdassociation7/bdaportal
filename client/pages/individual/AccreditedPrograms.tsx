/**
 * PDCs from BDA Activities — Public Directory
 * Refined professional design with BDA blue palette
 * Filters: Keyword | Provider | Country
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Award,
  Clock,
  Building2,
  ExternalLink,
  X,
  Globe,
  Target,
  CheckCircle2,
  Filter,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AccreditedProgram {
  id: string;
  program_id: string;
  slug?: string;
  program_name: string;
  program_name_ar?: string;
  description?: string;
  description_ar?: string;
  activity_type: string;
  delivery_format?: string;
  duration_hours?: number;
  max_pdc_credits: number;
  valid_from: string;
  valid_until: string;
  session_start_date?: string;
  session_end_date?: string;
  agenda_url?: string;
  provider_id: string;
  provider_name: string;
  provider_website?: string;
  provider_country?: string;
  is_active: boolean;
  status: string;
  competencies?: Array<{
    competency: {
      id: string;
      code: string;
      name: string;
      name_ar?: string;
    };
  }>;
}

// ─────────────────────────────────────────────
// Data hooks
// ─────────────────────────────────────────────

function useAccreditedPrograms(filters: {
  search?: string;
  providerName?: string;
  country?: string;
}) {
  return useQuery({
    queryKey: ['accredited-programs', filters],
    queryFn: async () => {
      let query = supabase
        .from('pdp_programs')
        .select(`
          *,
          competencies:pdp_program_competencies(
            competency:bock_competencies(id, code, name, name_ar)
          )
        `)
        .eq('status', 'approved')
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString().split('T')[0])
        .order('valid_from', { ascending: false });

      if (filters.search)
        query = query.or(
          `program_name.ilike.%${filters.search}%,provider_name.ilike.%${filters.search}%`
        );

      if (filters.providerName)
        query = query.ilike('provider_name', `%${filters.providerName}%`);

      const { data: programs, error } = await query;
      if (error) throw error;
      if (!programs || programs.length === 0) return [] as AccreditedProgram[];

      const providerIds = [...new Set(programs.map((p) => p.provider_id))];
      const { data: profiles } = await supabase
        .from('pdp_partner_profiles')
        .select('partner_id, website, country')
        .in('partner_id', providerIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.partner_id, { website: p.website, country: p.country }]) || []
      );

      let result = programs.map((p) => ({
        ...p,
        provider_website: profileMap.get(p.provider_id)?.website || undefined,
        provider_country: profileMap.get(p.provider_id)?.country || undefined,
      })) as AccreditedProgram[];

      // client-side country filter (partial match)
      if (filters.country) {
        const q = filters.country.toLowerCase();
        result = result.filter(
          (p) => p.provider_country?.toLowerCase().includes(q)
        );
      }

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useProviders() {
  return useQuery({
    queryKey: ['pdp-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdp_programs')
        .select('provider_id, provider_name')
        .eq('status', 'approved')
        .eq('is_active', true);
      if (error) throw error;
      const map = new Map<string, string>();
      data?.forEach((p) => { if (!map.has(p.provider_id)) map.set(p.provider_id, p.provider_name); });
      return Array.from(map.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 10 * 60 * 1000,
  });
}

function useCountries() {
  return useQuery({
    queryKey: ['pdp-provider-countries'],
    queryFn: async () => {
      const { data: programs } = await supabase
        .from('pdp_programs')
        .select('provider_id')
        .eq('status', 'approved')
        .eq('is_active', true);

      if (!programs || programs.length === 0) return [] as string[];

      const providerIds = [...new Set(programs.map((p) => p.provider_id))];
      const { data: profiles } = await supabase
        .from('pdp_partner_profiles')
        .select('country')
        .in('partner_id', providerIds)
        .not('country', 'is', null);

      const countries = [...new Set(profiles?.map((p) => p.country).filter(Boolean) || [])];
      return countries.sort() as string[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ─────────────────────────────────────────────
// Label maps
// ─────────────────────────────────────────────

const ACTIVITY_LABELS: Record<string, string> = {
  course: 'Course',
  training_course: 'Training Course',
  workshop: 'Workshop',
  seminar: 'Seminar',
  conference: 'Conference',
  webinar: 'Webinar',
  self_study: 'Self-Study',
  mentoring: 'Mentoring',
  coaching: 'Coaching',
  e_learning: 'E-Learning',
  blended: 'Blended Learning',
  other: 'Other',
};

const DELIVERY_LABELS: Record<string, string> = {
  in_person: 'In-Person',
  online: 'Online',
  hybrid: 'Hybrid',
  self_paced: 'Self-Paced',
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatLong(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatDateBadge(dateString: string) {
  const d = new Date(dateString);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    year: d.getFullYear(),
  };
}

function ensureHttp(url: string) {
  return url.startsWith('http') ? url : `https://${url}`;
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function DateBadge({ dateString }: { dateString: string }) {
  const { day, month, year } = formatDateBadge(dateString);
  return (
    <div className="flex-shrink-0 w-16 flex flex-col items-center justify-start pt-1">
      <span className="text-3xl font-bold text-[#1c4a8b] leading-none">{day}</span>
      <span className="text-xs font-bold text-white bg-[#1c4a8b] px-2 py-0.5 mt-1 rounded-sm tracking-widest">
        {month}
      </span>
      <span className="text-xs text-gray-400 mt-0.5">{year}</span>
    </div>
  );
}

function MetaBadge({
  children,
  color = 'blue',
}: {
  children: React.ReactNode;
  color?: 'blue' | 'green' | 'gray';
}) {
  const styles = {
    blue: 'bg-blue-50 text-[#1c4a8b] border border-blue-200',
    green: 'border border-blue-200 bg-blue-50 text-[#1c4a8b] dark:border-[#1c4a8b] dark:bg-[#163654] dark:text-sky-200',
    gray: 'border border-border bg-muted/60 text-muted-foreground',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${styles[color]}`}
    >
      {children}
    </span>
  );
}

function SidebarSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="mb-5">
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded border border-input bg-background px-3 py-2 pr-8 text-sm text-foreground transition focus:border-[#1c4a8b] focus:outline-none focus:ring-1 focus:ring-[#1c4a8b]"
        >
          <option value="all">All</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function AccreditedPrograms() {
  const { language } = useLanguage();

  const [keywordInput, setKeywordInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [providerInput, setProviderInput] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [countryInput, setCountryInput] = useState('');
  const [countryFilter, setCountryFilter] = useState('');

  const [selectedProgram, setSelectedProgram] = useState<AccreditedProgram | null>(null);
  const [detailTab, setDetailTab] = useState<'description' | 'competencies'>('description');

  const { data: programs = [], isLoading } = useAccreditedPrograms({
    search: searchQuery,
    providerName: providerFilter,
    country: countryFilter,
  });

  const getName = (p: AccreditedProgram) =>
    language === 'ar' && p.program_name_ar ? p.program_name_ar : p.program_name;
  const getDesc = (p: AccreditedProgram) =>
    language === 'ar' && p.description_ar ? p.description_ar : p.description;

  const handleReset = () => {
    setKeywordInput('');
    setSearchQuery('');
    setProviderInput('');
    setProviderFilter('');
    setCountryInput('');
    setCountryFilter('');
  };

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Page Header ── */}
      <div className="mb-4 border-b border-border bg-card px-4 py-5 sm:mb-6 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Award className="h-5 w-5 sm:h-6 sm:w-6 text-[#1c4a8b]" />
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              PDCs from BDA Activities
            </h1>
          </div>
          <p className="ml-8 text-sm text-muted-foreground sm:ml-9">
            Browse all BDA-accredited professional development programmes and earn PDC credits.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        {/* Mobile filter toggle button */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#1c4a8b]" />
              <span>Filters</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`} />
          </button>
          {/* Mobile filters panel */}
          {mobileFiltersOpen && (
            <div className="mt-2 rounded-xl border border-border bg-card p-4">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm font-bold text-foreground">Filters</span>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-[#1c4a8b] hover:text-[#163d75] font-medium"
                >
                  <RefreshCw className="h-3 w-3" />
                  Clear all
                </button>
              </div>
              <div className="mb-4">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Search by Keyword</label>
                <div className="flex gap-2">
                  <input type="text" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(keywordInput)} placeholder="Search…" className="flex-1 rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-[#1c4a8b] focus:outline-none" />
                  <button onClick={() => setSearchQuery(keywordInput)} className="bg-[#1c4a8b] text-white px-3 py-2 rounded"><Search className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mb-4">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Search by Provider</label>
                <div className="flex gap-2">
                  <input type="text" value={providerInput} onChange={(e) => setProviderInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setProviderFilter(providerInput)} placeholder="Provider name…" className="flex-1 rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-[#1c4a8b] focus:outline-none" />
                  <button onClick={() => setProviderFilter(providerInput)} className="bg-[#1c4a8b] text-white px-3 py-2 rounded"><Search className="h-4 w-4" /></button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Search by Country</label>
                <div className="flex gap-2">
                  <input type="text" value={countryInput} onChange={(e) => setCountryInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setCountryFilter(countryInput)} placeholder="Country name…" className="flex-1 rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-[#1c4a8b] focus:outline-none" />
                  <button onClick={() => setCountryFilter(countryInput)} className="bg-[#1c4a8b] text-white px-3 py-2 rounded"><Search className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">

          {/* ── Programme List ── */}
          <div className="flex-1 min-w-0">
            {!isLoading && (
              <p className="mb-4 text-sm text-muted-foreground">
                Showing{' '}
                <span className="font-semibold text-foreground">{programs.length}</span>{' '}
                programme{programs.length !== 1 ? 's' : ''}
              </p>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="h-9 w-9 border-4 border-[#1c4a8b] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading programmes…</p>
              </div>
            ) : programs.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-16 text-center">
                <Award className="mx-auto mb-4 h-14 w-14 text-muted-foreground/50" />
                <p className="mb-1 font-semibold text-foreground">No programmes found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or search criteria.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {programs.map((program) => (
                  <div
                    key={program.id}
                    className="overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-[#1c4a8b]/50 hover:shadow-md"
                  >
                    {/* Top accent bar */}
                    <div className="h-1 bg-gradient-to-r from-[#1c4a8b] to-[#2563eb]" />

                    <div className="p-5 flex gap-5">
                      {/* Date badge — shows session start if set, otherwise falls back to valid_from */}
                      <DateBadge dateString={program.session_start_date || program.valid_from} />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h2 className="text-base font-bold uppercase leading-snug tracking-wide text-foreground">
                            {getName(program)}
                          </h2>
                          <MetaBadge color="blue">
                            <Award className="h-3 w-3" />
                            {program.max_pdc_credits} PDCs
                          </MetaBadge>
                        </div>

                        {/* Date range */}
                        <p className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          {program.session_start_date
                            ? program.session_end_date && program.session_end_date !== program.session_start_date
                              ? `${formatLong(program.session_start_date)} — ${formatLong(program.session_end_date)}`
                              : formatLong(program.session_start_date)
                            : `Added ${formatLong(program.valid_from)}`}
                        </p>

                        {/* Info grid */}
                        <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate">
                              <span className="font-medium text-foreground">Provider:</span>{' '}
                              {program.provider_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                            <span>
                              <span className="font-medium text-foreground">Type:</span>{' '}
                              {ACTIVITY_LABELS[program.activity_type] || program.activity_type}
                            </span>
                          </div>
                          {program.delivery_format && (
                            <div className="flex items-center gap-1.5">
                              <Globe className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                              <span>
                                <span className="font-medium text-foreground">Format:</span>{' '}
                                {DELIVERY_LABELS[program.delivery_format] || program.delivery_format}
                              </span>
                            </div>
                          )}
                          {program.duration_hours && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                              <span>
                                <span className="font-medium text-foreground">Duration:</span>{' '}
                                {program.duration_hours} hrs
                              </span>
                            </div>
                          )}
                          {program.provider_country && (
                            <div className="flex items-center gap-1.5">
                              <Globe className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                              <span>
                                <span className="font-medium text-foreground">Country:</span>{' '}
                                {program.provider_country}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Competency tags */}
                        {program.competencies && program.competencies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {program.competencies.slice(0, 5).map((c, i) => (
                              <MetaBadge key={i} color="gray">
                                <Target className="h-3 w-3" />
                                {c.competency?.code}
                              </MetaBadge>
                            ))}
                            {program.competencies.length > 5 && (
                              <MetaBadge color="gray">
                                +{program.competencies.length - 5} more
                              </MetaBadge>
                            )}
                          </div>
                        )}

                        {/* Description snippet */}
                        {program.description && (
                          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                            {getDesc(program)}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          {program.slug ? (
                            <Link
                              to={`/public/programs/${program.slug}`}
                              className="inline-flex items-center gap-1.5 bg-[#1c4a8b] hover:bg-[#163d75] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                            >
                              View Details
                            </Link>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedProgram(program);
                                setDetailTab('description');
                              }}
                              className="inline-flex items-center gap-1.5 bg-[#1c4a8b] hover:bg-[#163d75] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                            >
                              View Details
                            </button>
                          )}
                          {program.provider_website && (
                            <a
                              href={ensureHttp(program.provider_website)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[#1c4a8b] hover:text-[#163d75] text-sm font-medium border border-[#1c4a8b]/30 hover:border-[#1c4a8b] px-4 py-2 rounded-lg transition-colors"
                            >
                              <Globe className="h-3.5 w-3.5" />
                              Provider Website
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Sidebar (desktop only) ── */}
          <div className="sticky top-6 hidden w-64 flex-shrink-0 md:block">
            <div className="rounded-xl border border-border bg-card p-5">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-[#1c4a8b]" />
                  <span className="text-sm font-bold text-foreground">Filters</span>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-[#1c4a8b] hover:text-[#163d75] font-medium transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Clear all
                </button>
              </div>

              {/* Search by Keyword */}
              <div className="mb-5">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Search by Keyword
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(keywordInput)}
                    placeholder="Search…"
                    className="flex-1 rounded border border-input bg-background px-3 py-2 text-sm text-foreground transition focus:border-[#1c4a8b] focus:outline-none focus:ring-1 focus:ring-[#1c4a8b]"
                  />
                  <button
                    onClick={() => setSearchQuery(keywordInput)}
                    className="bg-[#1c4a8b] hover:bg-[#163d75] text-white px-3 py-2 rounded transition-colors"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Search by Provider */}
              <div className="mb-5">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Search by Provider
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={providerInput}
                    onChange={(e) => setProviderInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setProviderFilter(providerInput)}
                    placeholder="Provider name…"
                    className="flex-1 rounded border border-input bg-background px-3 py-2 text-sm text-foreground transition focus:border-[#1c4a8b] focus:outline-none focus:ring-1 focus:ring-[#1c4a8b]"
                  />
                  <button
                    onClick={() => setProviderFilter(providerInput)}
                    className="bg-[#1c4a8b] hover:bg-[#163d75] text-white px-3 py-2 rounded transition-colors"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Search by Country */}
              <div className="mb-5">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Search by Country
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={countryInput}
                    onChange={(e) => setCountryInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setCountryFilter(countryInput)}
                    placeholder="Country name…"
                    className="flex-1 rounded border border-input bg-background px-3 py-2 text-sm text-foreground transition focus:border-[#1c4a8b] focus:outline-none focus:ring-1 focus:ring-[#1c4a8b]"
                  />
                  <button
                    onClick={() => setCountryFilter(countryInput)}
                    className="bg-[#1c4a8b] hover:bg-[#163d75] text-white px-3 py-2 rounded transition-colors"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {selectedProgram && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedProgram(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-card text-card-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal top bar */}
            <div className="h-1.5 bg-gradient-to-r from-[#1c4a8b] to-[#2563eb] rounded-t-2xl" />

            {/* Modal header */}
            <div className="border-b border-border p-6">
              <div className="flex items-start gap-4">
                <DateBadge dateString={selectedProgram.session_start_date || selectedProgram.valid_from} />
                <div className="flex-1 min-w-0">
                  <h2 className="mb-1 text-xl font-bold uppercase leading-snug tracking-wide text-foreground">
                    {getName(selectedProgram)}
                  </h2>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Please feel free to save or share this link to refer back to this offering.
                    For in-depth information or scheduling, please visit the activity site directly.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProgram(null)}
                  className="flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">
              {/* PDC badge + dates */}
              <div className="flex flex-wrap items-center gap-3">
                <MetaBadge color="blue">
                  <Award className="h-3.5 w-3.5" />
                  {selectedProgram.max_pdc_credits} PDCs
                </MetaBadge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {selectedProgram.session_start_date
                    ? selectedProgram.session_end_date && selectedProgram.session_end_date !== selectedProgram.session_start_date
                      ? `${formatLong(selectedProgram.session_start_date)} — ${formatLong(selectedProgram.session_end_date)}`
                      : formatLong(selectedProgram.session_start_date)
                    : `Added ${formatLong(selectedProgram.valid_from)}`}
                </span>
              </div>

              {/* Info table */}
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
                <div>
                  <p className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground">Provider</p>
                  <p className="font-medium text-foreground">{selectedProgram.provider_name}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground">Programme ID</p>
                  <p className="font-mono text-xs font-medium text-foreground">
                    {selectedProgram.program_id}
                  </p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground">Type</p>
                  <p className="font-medium text-foreground">
                    {ACTIVITY_LABELS[selectedProgram.activity_type] || selectedProgram.activity_type}
                  </p>
                </div>
                {selectedProgram.delivery_format && (
                  <div>
                    <p className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground">Format</p>
                    <p className="font-medium text-foreground">
                      {DELIVERY_LABELS[selectedProgram.delivery_format] ||
                        selectedProgram.delivery_format}
                    </p>
                  </div>
                )}
                {selectedProgram.duration_hours && (
                  <div>
                    <p className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground">Duration</p>
                    <p className="font-medium text-foreground">
                      {selectedProgram.duration_hours} hours
                    </p>
                  </div>
                )}
                {selectedProgram.provider_country && (
                  <div>
                    <p className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground">Country</p>
                    <p className="font-medium text-foreground">{selectedProgram.provider_country}</p>
                  </div>
                )}
                {selectedProgram.provider_website && (
                  <div className="col-span-2">
                    <p className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                      Registration URL
                    </p>
                    <a
                      href={ensureHttp(selectedProgram.provider_website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1c4a8b] hover:underline text-xs truncate block"
                    >
                      {selectedProgram.provider_website}
                    </a>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="flex border-b border-border bg-muted/60">
                  {(['description', 'competencies'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDetailTab(tab)}
                      className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                        detailTab === tab
                          ? 'border-b-2 border-[#1c4a8b] bg-background text-[#1c4a8b] dark:text-sky-200'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="p-4">
                  {detailTab === 'description' ? (
                    selectedProgram.description ? (
                      <p className="leading-relaxed text-muted-foreground">
                        {getDesc(selectedProgram)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No description available.</p>
                    )
                  ) : selectedProgram.competencies &&
                    selectedProgram.competencies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedProgram.competencies.map((c, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 bg-blue-50 text-[#1c4a8b] border border-blue-200 px-3 py-1.5 rounded-full text-xs font-medium"
                        >
                          <Target className="h-3 w-3" />
                          {c.competency?.code}:{' '}
                          {language === 'ar' && c.competency?.name_ar
                            ? c.competency.name_ar
                            : c.competency?.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      No competency information available.
                    </p>
                  )}
                </div>
              </div>

              {/* Provider website CTA */}
              {selectedProgram.provider_website && (
                <a
                  href={ensureHttp(selectedProgram.provider_website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#1c4a8b] hover:bg-[#163d75] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  Visit Provider Website
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

AccreditedPrograms.displayName = 'AccreditedPrograms';
