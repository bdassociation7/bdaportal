/**
 * ProgramDetail — Public standalone page for a single BDA-accredited programme
 * URL: /public/programs/:slug  (slug generated from program_name, never exposes internal IDs)
 * Full SEO: title, meta description, canonical, Open Graph, JSON-LD (Course schema)
 */

import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { applySeoMetadata, resolveSeo, SeoRecord } from '@/features/seo/publicSeo';
import {
  Award,
  Clock,
  Building2,
  Globe,
  ExternalLink,
  ArrowLeft,
  Target,
  BookOpen,
  CheckCircle2,
  MapPin,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ProgramDetail {
  id: string;
  slug: string;
  program_name: string;
  program_name_ar?: string;
  description?: string;
  description_ar?: string;
  activity_type: string;
  delivery_mode?: string;
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
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function ensureHttp(url: string) {
  return url.startsWith('http') ? url : `https://${url}`;
}

// ─────────────────────────────────────────────
// SEO helpers
// ─────────────────────────────────────────────

function setMeta(name: string, content: string, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

function injectJsonLd(data: object) {
  const id = 'program-jsonld';
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

// ─────────────────────────────────────────────
// Data hook — fetch by slug only
// ─────────────────────────────────────────────

function useProgramDetail(slug: string) {
  return useQuery({
    queryKey: ['program-detail-slug', slug],
    queryFn: async () => {
      const { data: program, error } = await supabase
        .from('pdp_programs')
        .select(`
          id,
          slug,
          program_name,
          program_name_ar,
          description,
          description_ar,
          activity_type,
          delivery_mode,
          duration_hours,
          max_pdc_credits,
          valid_from,
          valid_until,
          provider_id,
          provider_name,
          is_active,
          status,
          competencies:pdp_program_competencies(
            competency:bock_competencies(id, code, name, name_ar)
          )
        `)
        .eq('slug', slug)
        .eq('status', 'approved')
        .eq('is_active', true)
        .single();

      if (error || !program) return null;

      // Fetch provider profile (website + country) — no internal IDs exposed
      const { data: profile } = await supabase
        .from('pdp_partner_profiles')
        .select('website, country')
        .eq('partner_id', program.provider_id)
        .single();

      return {
        ...program,
        provider_website: profile?.website || undefined,
        provider_country: profile?.country || undefined,
      } as ProgramDetail;
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!slug,
  });
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function ProgramDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const { data: program, isLoading } = useProgramDetail(slug || '');
  const { data: seoOverride } = useQuery({
    queryKey: ['public-programme-seo', program?.id],
    enabled: Boolean(program?.id),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('seo_program_overrides')
        .select('*')
        .eq('program_id', program!.id)
        .maybeSingle();
      if (error) throw error;
      return data as SeoRecord | null;
    },
  });

  const getName = (p: ProgramDetail) =>
    language === 'ar' && p.program_name_ar ? p.program_name_ar : p.program_name;
  const getDesc = (p: ProgramDetail) =>
    language === 'ar' && p.description_ar ? p.description_ar : p.description;

  // ── SEO injection ──
  useEffect(() => {
    if (!program) return;

    const programmeName = program.program_name;
    const programmeDescription = program.description;
    const fallbackTitle = `${programmeName} | BDA Accredited Programme`;
    const fallbackDescription = programmeDescription
      ? programmeDescription.slice(0, 160).replace(/\s+/g, ' ').trim() + '…'
      : `${programmeName} — ${program.max_pdc_credits} PDCs | Accredited by the Business Development Association (BDA). Provider: ${program.provider_name}.`;
    const fallbackCanonicalUrl = `https://portal.bda-global.org/public/programs/${program.slug}`;
    const metadata = resolveSeo(seoOverride, 'en', {
      title: fallbackTitle,
      description: fallbackDescription,
      keywords: `BDA, accredited programme, PDC, ${program.program_name}, ${program.provider_name}, professional development, certification`,
      canonicalUrl: fallbackCanonicalUrl,
      schemaType: 'Course',
    });
    applySeoMetadata(metadata, 'en', false);
    const title = metadata.title;
    const description = metadata.description;
    const canonicalUrl = metadata.canonicalUrl;

    // JSON-LD — Course schema (no internal IDs)
    injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: program.program_name,
      description: program.description || '',
      provider: {
        '@type': 'Organization',
        name: program.provider_name,
        url: program.provider_website ? ensureHttp(program.provider_website) : undefined,
      },
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        validFrom: program.valid_from,
        validThrough: program.valid_until,
      },
      educationalCredentialAwarded: `${program.max_pdc_credits} PDC Credits`,
      url: canonicalUrl,
      inLanguage: 'en',
      hasCourseInstance: {
        '@type': 'CourseInstance',
        courseMode: program.delivery_mode || 'online',
        startDate: program.valid_from,
        endDate: program.valid_until,
      },
    });

    return () => {
      document.title = 'BDA Portal';
      const jsonLd = document.getElementById('program-jsonld');
      if (jsonLd) jsonLd.remove();
    };
  }, [program, seoOverride, language]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-[#1c4a8b] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading programme details…</p>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (!program) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-center">
          <Award className="h-16 w-16 mx-auto mb-4 text-gray-200" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Programme Not Found</h1>
          <p className="text-gray-500 mb-6">
            The programme you are looking for does not exist or is no longer active.
          </p>
          <Link
            to="/public/programs"
            className="inline-flex items-center gap-2 bg-[#1c4a8b] hover:bg-[#163d75] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All Programmes
          </Link>
        </div>
      </div>
    );
  }

  const activityLabel = ACTIVITY_LABELS[program.activity_type] || program.activity_type;
  const deliveryLabel = program.delivery_mode
    ? DELIVERY_LABELS[program.delivery_mode] || program.delivery_mode
    : null;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero / Header ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-gray-400 mb-4" aria-label="Breadcrumb">
            <Link to="/public/programs" className="hover:text-[#1c4a8b] transition-colors">
              BDA Activities
            </Link>
            <span>/</span>
            <span className="text-gray-600 truncate max-w-xs">{program.program_name}</span>
          </nav>

          {/* Title */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-[#1c4a8b]/10 rounded-xl flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-[#1c4a8b]" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-snug uppercase tracking-wide mb-1">
                {getName(program)}
              </h1>
              <p className="text-sm text-gray-500">
                Please feel free to save or share this link to refer back to this offering.
                For in-depth information or scheduling, please visit the activity site directly.
              </p>
            </div>
          </div>

          {/* Quick badges — no internal IDs */}
          <div className="flex flex-wrap gap-2 ml-16">
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-[#1c4a8b] border border-blue-200 px-3 py-1.5 rounded-full text-xs font-semibold">
              <Award className="h-3.5 w-3.5" />
              {program.max_pdc_credits} PDCs
            </span>
            <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-full text-xs font-medium">
              <BookOpen className="h-3.5 w-3.5" />
              {activityLabel}
            </span>
            {deliveryLabel && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-medium">
                <Globe className="h-3.5 w-3.5" />
                {deliveryLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Description + Competencies ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Description */}
            {getDesc(program) && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#1c4a8b]" />
                  Programme Description
                </h2>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {getDesc(program)}
                </div>
              </div>
            )}

            {/* Competencies */}
            {program.competencies && program.competencies.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#1c4a8b]" />
                  BDA Competencies Covered
                </h2>
                <div className="flex flex-wrap gap-2">
                  {program.competencies.map((c, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 bg-blue-50 text-[#1c4a8b] border border-blue-200 px-3 py-1.5 rounded-full text-xs font-medium"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {c.competency?.code}:{' '}
                      {language === 'ar' && c.competency?.name_ar
                        ? c.competency.name_ar
                        : c.competency?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Back link */}
            <div>
              <Link
                to="/public/programs"
                className="inline-flex items-center gap-2 text-sm text-[#1c4a8b] hover:text-[#163d75] font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to All Programmes
              </Link>
            </div>
          </div>

          {/* ── Right: Info card ── */}
          <div className="space-y-4">

            {/* Programme info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                Programme Details
              </h2>
              <div className="space-y-3 text-sm">

                {/* Provider */}
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Provider</p>
                    <p className="font-medium text-gray-800">{program.provider_name}</p>
                  </div>
                </div>

                {/* Country */}
                {program.provider_country && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Country</p>
                      <p className="font-medium text-gray-800">{program.provider_country}</p>
                    </div>
                  </div>
                )}

                {/* PDCs */}
                <div className="flex items-start gap-3">
                  <Award className="h-4 w-4 text-[#1c4a8b] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">PDC Credits</p>
                    <p className="font-bold text-[#1c4a8b]">{program.max_pdc_credits} PDCs</p>
                  </div>
                </div>

                {/* Duration */}
                {program.duration_hours && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Duration</p>
                      <p className="font-medium text-gray-800">{program.duration_hours} hours</p>
                    </div>
                  </div>
                )}

                {/* Type */}
                <div className="flex items-start gap-3">
                  <BookOpen className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Activity Type</p>
                    <p className="font-medium text-gray-800">{activityLabel}</p>
                  </div>
                </div>

                {/* Delivery */}
                {deliveryLabel && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Delivery Format</p>
                      <p className="font-medium text-gray-800">{deliveryLabel}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CTA — Visit provider */}
            {program.provider_website && (
              <a
                href={ensureHttp(program.provider_website)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#1c4a8b] hover:bg-[#163d75] text-white text-sm font-medium px-5 py-3 rounded-xl transition-colors w-full"
              >
                <Globe className="h-4 w-4" />
                Visit Provider Website
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            {/* BDA accreditation badge */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <Award className="h-8 w-8 mx-auto mb-2 text-[#1c4a8b]" />
              <p className="text-xs font-bold text-[#1c4a8b] uppercase tracking-wide mb-1">
                BDA Accredited
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                This programme has been reviewed and accredited by the Business Development Association (BDA).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ProgramDetail.displayName = 'ProgramDetail';
