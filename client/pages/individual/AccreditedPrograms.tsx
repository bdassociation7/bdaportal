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
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    gray: 'bg-gray-50 text-gray-600 border border-gray-200',
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
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 appearance-none focus:outline-none focus:border-[#1c4a8b] focus:ring-1 focus:ring-[#1c4a8b] rounded pr-8 transition"
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
    <div className="min-h-screen bg-gray-50">
      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-5 mb-4 sm:mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Award className="h-5 w-5 sm:h-6 sm:w-6 text-[#1c4a8b]" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              PDCs from BDA Activities
            </h1>
          </div>
          <p className="text-sm text-gray-500 ml-8 sm:ml-9">
            Browse all BDA-accredited professional development programmes and earn PDC credits.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        {/* Mobile filter toggle button */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#1c4a8b]" />
              <span>Filters</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`} />
          </button>
          {/* Mobile filters panel */}
          {mobileFiltersOpen && (
            <div className="mt-2 bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-800">Filters</span>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-[#1c4a8b] hover:text-[#163d75] font-medium"
                >
                  <RefreshCw className="h-3 w-3" />
                  Clear all
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Search by Keyword</label>
                <div className="flex gap-2">
                  <input type="text" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(keywordInput)} placeholder="Search…" className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1c4a8b]" />
                  <button onClick={() => setSearchQuery(keywordInput)} className="bg-[#1c4a8b] text-white px-3 py-2 rounded"><Search className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Search by Provider</label>
                <div className="flex gap-2">
                  <input type="text" value={providerInput} onChange={(e) => setProviderInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setProviderFilter(providerInput)} placeholder="Provider name…" className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1c4a8b]" />
                  <button onClick={() => setProviderFilter(providerInput)} className="bg-[#1c4a8b] text-white px-3 py-2 rounded"><Search className="h-4 w-4" /></button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Search by Country</label>
                <div className="flex gap-2">
                  <input type="text" value={countryInput} onChange={(e) => setCountryInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setCountryFilter(countryInput)} placeholder="Country name…" className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1c4a8b]" />
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
              <p className="text-sm text-gray-500 mb-4">
                Showing{' '}
                <span className="font-semibold text-gray-700">{programs.length}</span>{' '}
                programme{programs.length !== 1 ? 's' : ''}
              </p>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="h-9 w-9 border-4 border-[#1c4a8b] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Loading programmes…</p>
              </div>
            ) : programs.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                <Award className="h-14 w-14 mx-auto mb-4 text-gray-200" />
                <p className="font-semibold text-gray-700 mb-1">No programmes found</p>
                <p className="text-sm text-gray-400">
                  Try adjusting your filters or search criteria.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {programs.map((program) => (
                  <div
                    key={program.id}
                    className="bg-white rounded-xl border border-gray-200 hover:border-[#1c4a8b]/30 hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    {/* Top accent bar */}
                    <div className="h-1 bg-gradient-to-r from-[#1c4a8b] to-[#2563eb]" />

                    <div className="p-5 flex gap-5">
                      {/* Date badge */}
                      <DateBadge dateString={program.valid_from} />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h2 className="text-base font-bold text-gray-900 leading-snug uppercase tracking-wide">
                            {getName(program)}
                          </h2>
                          <MetaBadge color="blue">
                            <Award className="h-3 w-3" />
                            {program.max_pdc_credits} PDCs
                          </MetaBadge>
                        </div>

                        {/* Date range */}
                        <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          {formatLong(program.valid_from)}
                          {program.valid_until && (
                            <> &mdash; {formatLong(program.valid_until)}</>
                          )}
                        </p>

                        {/* Info grid */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate">
                              <span className="font-medium text-gray-700">Provider:</span>{' '}
                              {program.provider_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span>
                              <span className="font-medium text-gray-700">Type:</span>{' '}
                              {ACTIVITY_LABELS[program.activity_type] || program.activity_type}
                            </span>
                          </div>
                          {program.delivery_format && (
                            <div className="flex items-center gap-1.5">
                              <Globe className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              <span>
                                <span className="font-medium text-gray-700">Format:</span>{' '}
                                {DELIVERY_LABELS[program.delivery_format] || program.delivery_format}
                              </span>
                            </div>
                          )}
                          {program.duration_hours && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              <span>
                                <span className="font-medium text-gray-700">Duration:</span>{' '}
                                {program.duration_hours} hrs
                              </span>
                            </div>
                          )}
                          {program.provider_country && (
                            <div className="flex items-center gap-1.5">
                              <Globe className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              <span>
                                <span className="font-medium text-gray-700">Country:</span>{' '}
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
                          <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">
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
          <div className="hidden md:block w-64 flex-shrink-0 sticky top-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-[#1c4a8b]" />
                  <span className="text-sm font-bold text-gray-800">Filters</span>
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
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Search by Keyword
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(keywordInput)}
                    placeholder="Search…"
                    className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1c4a8b] focus:ring-1 focus:ring-[#1c4a8b] transition"
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
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Search by Provider
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={providerInput}
                    onChange={(e) => setProviderInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setProviderFilter(providerInput)}
                    placeholder="Provider name…"
                    className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1c4a8b] focus:ring-1 focus:ring-[#1c4a8b] transition"
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
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Search by Country
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={countryInput}
                    onChange={(e) => setCountryInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setCountryFilter(countryInput)}
                    placeholder="Country name…"
                    className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1c4a8b] focus:ring-1 focus:ring-[#1c4a8b] transition"
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
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProgram(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal top bar */}
            <div className="h-1.5 bg-gradient-to-r from-[#1c4a8b] to-[#2563eb] rounded-t-2xl" />

            {/* Modal header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start gap-4">
                <DateBadge dateString={selectedProgram.valid_from} />
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide leading-snug mb-1">
                    {getName(selectedProgram)}
                  </h2>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Please feel free to save or share this link to refer back to this offering.
                    For in-depth information or scheduling, please visit the activity site directly.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProgram(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="h-5 w-5 text-gray-500" />
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
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatLong(selectedProgram.valid_from)} — {formatLong(selectedProgram.valid_until)}
                </span>
              </div>

              {/* Info table */}
              <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Provider</p>
                  <p className="font-medium text-gray-800">{selectedProgram.provider_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Programme ID</p>
                  <p className="font-medium text-gray-800 font-mono text-xs">
                    {selectedProgram.program_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Type</p>
                  <p className="font-medium text-gray-800">
                    {ACTIVITY_LABELS[selectedProgram.activity_type] || selectedProgram.activity_type}
                  </p>
                </div>
                {selectedProgram.delivery_format && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Format</p>
                    <p className="font-medium text-gray-800">
                      {DELIVERY_LABELS[selectedProgram.delivery_format] ||
                        selectedProgram.delivery_format}
                    </p>
                  </div>
                )}
                {selectedProgram.duration_hours && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Duration</p>
                    <p className="font-medium text-gray-800">
                      {selectedProgram.duration_hours} hours
                    </p>
                  </div>
                )}
                {selectedProgram.provider_country && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Country</p>
                    <p className="font-medium text-gray-800">{selectedProgram.provider_country}</p>
                  </div>
                )}
                {selectedProgram.provider_website && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
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
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex border-b border-gray-200 bg-gray-50">
                  {(['description', 'competencies'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDetailTab(tab)}
                      className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                        detailTab === tab
                          ? 'bg-white text-[#1c4a8b] border-b-2 border-[#1c4a8b]'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="p-4">
                  {detailTab === 'description' ? (
                    selectedProgram.description ? (
                      <p className="text-sm text-gray-700 leading-relaxed">
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
