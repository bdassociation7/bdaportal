/**
 * BDA Instructor Registry — Public Page
 * Route: /public/instructors
 *
 * Publicly accessible page listing all active BDA Certified Instructors.
 * Allows organisations to find and engage certified instructors.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  Search,
  Globe,
  CheckCircle,
  Calendar,
  Building2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/shared/config/supabase.config';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PublicInstructor {
  instructor_id: string;
  level: string;
  certified_at: string;
  expires_at: string;
  country_code: string | null;
  partner_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

// ─── Country name helper ──────────────────────────────────────────────────────
const COUNTRY_NAMES: Record<string, string> = {
  SA: 'Saudi Arabia', AE: 'United Arab Emirates', EG: 'Egypt', KW: 'Kuwait',
  QA: 'Qatar', BH: 'Bahrain', OM: 'Oman', JO: 'Jordan', LB: 'Lebanon',
  IQ: 'Iraq', SY: 'Syria', YE: 'Yemen', MA: 'Morocco', TN: 'Tunisia',
  DZ: 'Algeria', LY: 'Libya', SD: 'Sudan', US: 'United States',
  GB: 'United Kingdom', DE: 'Germany', FR: 'France', CA: 'Canada',
  AU: 'Australia', IN: 'India', PK: 'Pakistan', NG: 'Nigeria', ZA: 'South Africa',
};

function countryName(code: string | null) {
  if (!code) return null;
  return COUNTRY_NAMES[code.toUpperCase()] || code.toUpperCase();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function InstructorRegistry() {
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');

  // Fetch active instructors (public RLS policy allows this)
  const { data: instructors = [], isLoading } = useQuery({
    queryKey: ['public-instructor-registry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructor_certifications')
        .select(`
          instructor_id,
          level,
          certified_at,
          expires_at,
          partners (company_name),
          users!instructor_certifications_user_id_fkey (first_name, last_name, country_code)
        `)
        .eq('status', 'active')
        .order('certified_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        instructor_id: row.instructor_id,
        level: row.level,
        certified_at: row.certified_at,
        expires_at: row.expires_at,
        country_code: row.users?.country_code || null,
        partner_name: row.partners?.company_name || null,
        first_name: row.users?.first_name || null,
        last_name: row.users?.last_name || null,
      })) as PublicInstructor[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Unique countries for filter
  const countries = Array.from(
    new Set(instructors.map(i => i.country_code).filter(Boolean) as string[])
  ).sort();

  // Filter
  const filtered = instructors.filter(i => {
    const fullName = `${i.first_name || ''} ${i.last_name || ''}`.toLowerCase();
    const matchSearch =
      !search ||
      fullName.includes(search.toLowerCase()) ||
      i.instructor_id.toLowerCase().includes(search.toLowerCase()) ||
      (i.partner_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (countryName(i.country_code) || '').toLowerCase().includes(search.toLowerCase());
    const matchCountry = !countryFilter || i.country_code === countryFilter;
    return matchSearch && matchCountry;
  });

  return (
    <div className="min-h-screen bg-[#f8faff]">
      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />

        <div className="relative container mx-auto px-6 py-16 max-w-5xl text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold mb-6 tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            BDA Official Registry
          </div>
          <h1 className="text-4xl font-extrabold mb-3 tracking-tight">
            BDA Certified Instructors
          </h1>
          <p className="text-white/70 text-base max-w-xl mx-auto leading-relaxed">
            A global network of professionals authorised to deliver BDA-aligned learning
            programmes. All listed instructors hold an active BDA certification and are
            authorised by the Business Development Association.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-8">
            <div>
              <p className="text-3xl font-extrabold">{instructors.length}</p>
              <p className="text-white/50 text-xs mt-0.5">Certified Instructors</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <p className="text-3xl font-extrabold">{countries.length}</p>
              <p className="text-white/50 text-xs mt-0.5">Countries</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <p className="text-3xl font-extrabold">3</p>
              <p className="text-white/50 text-xs mt-0.5">Year Validity</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter ── */}
      <div className="container mx-auto px-6 py-6 max-w-5xl">
        <div className="bg-white rounded-2xl border border-[#dbeafe] shadow-sm p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, Instructor ID, or organisation..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#dbeafe] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f91e0]/30 focus:border-[#0f91e0]"
            />
          </div>
          <select
            value={countryFilter}
            onChange={e => setCountryFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2.5 text-sm border border-[#dbeafe] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f91e0]/30 focus:border-[#0f91e0] bg-white"
          >
            <option value="">All Countries</option>
            {countries.map(c => (
              <option key={c} value={c}>{countryName(c)}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <p className="text-xs text-slate-400 mt-3 ml-1">
          Showing <strong className="text-[#0d1f4e]">{filtered.length}</strong> certified instructor{filtered.length !== 1 ? 's' : ''}
          {countryFilter ? ` in ${countryName(countryFilter)}` : ''}
        </p>
      </div>

      {/* ── Instructor Grid ── */}
      <div className="container mx-auto px-6 pb-16 max-w-5xl">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#dbeafe] p-6 animate-pulse">
                <div className="w-12 h-12 bg-slate-100 rounded-xl mb-4" />
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Award className="w-14 h-14 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No certified instructors found</p>
            <p className="text-slate-300 text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(instructor => {
              const fullName = [instructor.first_name, instructor.last_name].filter(Boolean).join(' ') || 'BDA Instructor';
              const initials = [instructor.first_name?.[0], instructor.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'BI';
              const country = countryName(instructor.country_code);

              return (
                <div
                  key={instructor.instructor_id}
                  className="bg-white rounded-2xl border border-[#dbeafe] p-6 hover:border-[#0f91e0] hover:shadow-md transition-all"
                >
                  {/* Avatar + Name */}
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#0d1f4e] text-sm leading-tight">{fullName}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        <span className="text-xs text-emerald-600 font-semibold">Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Certification badge */}
                  <div className="bg-[#f0f6ff] border border-[#dbeafe] rounded-xl px-3 py-2 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#0f91e0] flex-shrink-0" />
                      <span className="text-xs font-semibold text-[#1C4A8B] truncate">{instructor.level}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{instructor.instructor_id}</p>
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    {country && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Globe className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                        <span>{country}</span>
                      </div>
                    )}
                    {instructor.partner_name && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Building2 className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                        <span className="truncate">{instructor.partner_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                      <span>Certified {formatDate(instructor.certified_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer note ── */}
      <div className="border-t border-[#dbeafe] bg-white">
        <div className="container mx-auto px-6 py-6 max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400 text-center md:text-left">
            This registry is maintained by the Business Development Association (BDA).
            All certifications are verified and subject to BDA's instructor standards.
          </p>
          <a
            href="https://portal.bda-global.org/public/verify"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#0f91e0] hover:underline flex-shrink-0"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Verify a BDA Credential
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
