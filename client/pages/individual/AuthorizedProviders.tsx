/**
 * Authorised Providers Page — Redesigned
 *
 * Table layout with keyword search and country filter.
 * Country codes (ISO 3166-1 alpha-2) are resolved to full names via COUNTRY_NAMES map.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/config/supabase.config';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Search, X, Eye, Globe, MapPin, ExternalLink,
  Building2, Mail, Phone, Users, BookOpen, Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// Country code → full name map (ISO 3166-1 alpha-2)
// ============================================================================

const COUNTRY_NAMES: Record<string, string> = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AD: 'Andorra', AO: 'Angola',
  AG: 'Antigua and Barbuda', AR: 'Argentina', AM: 'Armenia', AU: 'Australia',
  AT: 'Austria', AZ: 'Azerbaijan', BS: 'Bahamas', BH: 'Bahrain', BD: 'Bangladesh',
  BB: 'Barbados', BY: 'Belarus', BE: 'Belgium', BZ: 'Belize', BJ: 'Benin',
  BT: 'Bhutan', BO: 'Bolivia', BA: 'Bosnia and Herzegovina', BW: 'Botswana',
  BR: 'Brazil', BN: 'Brunei', BG: 'Bulgaria', BF: 'Burkina Faso', BI: 'Burundi',
  CV: 'Cabo Verde', KH: 'Cambodia', CM: 'Cameroon', CA: 'Canada',
  CF: 'Central African Republic', TD: 'Chad', CL: 'Chile', CN: 'China',
  CO: 'Colombia', KM: 'Comoros', CG: 'Congo', CD: 'Congo (DRC)', CR: 'Costa Rica',
  HR: 'Croatia', CU: 'Cuba', CY: 'Cyprus', CZ: 'Czech Republic', DK: 'Denmark',
  DJ: 'Djibouti', DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador',
  EG: 'Egypt', SV: 'El Salvador', GQ: 'Equatorial Guinea', ER: 'Eritrea',
  EE: 'Estonia', SZ: 'Eswatini', ET: 'Ethiopia', FJ: 'Fiji', FI: 'Finland',
  FR: 'France', GA: 'Gabon', GM: 'Gambia', GE: 'Georgia', DE: 'Germany',
  GH: 'Ghana', GR: 'Greece', GD: 'Grenada', GT: 'Guatemala', GN: 'Guinea',
  GW: 'Guinea-Bissau', GY: 'Guyana', HT: 'Haiti', HN: 'Honduras', HU: 'Hungary',
  IS: 'Iceland', IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq',
  IE: 'Ireland', IL: 'Israel', IT: 'Italy', JM: 'Jamaica', JP: 'Japan',
  JO: 'Jordan', KZ: 'Kazakhstan', KE: 'Kenya', KI: 'Kiribati', KW: 'Kuwait',
  KG: 'Kyrgyzstan', LA: 'Laos', LV: 'Latvia', LB: 'Lebanon', LS: 'Lesotho',
  LR: 'Liberia', LY: 'Libya', LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg',
  MG: 'Madagascar', MW: 'Malawi', MY: 'Malaysia', MV: 'Maldives', ML: 'Mali',
  MT: 'Malta', MH: 'Marshall Islands', MR: 'Mauritania', MU: 'Mauritius',
  MX: 'Mexico', FM: 'Micronesia', MD: 'Moldova', MC: 'Monaco', MN: 'Mongolia',
  ME: 'Montenegro', MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar', NA: 'Namibia',
  NR: 'Nauru', NP: 'Nepal', NL: 'Netherlands', NZ: 'New Zealand', NI: 'Nicaragua',
  NE: 'Niger', NG: 'Nigeria', NO: 'Norway', OM: 'Oman', PK: 'Pakistan',
  PW: 'Palau', PA: 'Panama', PG: 'Papua New Guinea', PY: 'Paraguay', PE: 'Peru',
  PH: 'Philippines', PL: 'Poland', PT: 'Portugal', QA: 'Qatar', RO: 'Romania',
  RU: 'Russia', RW: 'Rwanda', KN: 'Saint Kitts and Nevis', LC: 'Saint Lucia',
  VC: 'Saint Vincent and the Grenadines', WS: 'Samoa', SM: 'San Marino',
  ST: 'Sao Tome and Principe', SA: 'Saudi Arabia', SN: 'Senegal', RS: 'Serbia',
  SC: 'Seychelles', SL: 'Sierra Leone', SG: 'Singapore', SK: 'Slovakia',
  SI: 'Slovenia', SB: 'Solomon Islands', SO: 'Somalia', ZA: 'South Africa',
  SS: 'South Sudan', ES: 'Spain', LK: 'Sri Lanka', SD: 'Sudan', SR: 'Suriname',
  SE: 'Sweden', CH: 'Switzerland', SY: 'Syria', TW: 'Taiwan', TJ: 'Tajikistan',
  TZ: 'Tanzania', TH: 'Thailand', TL: 'Timor-Leste', TG: 'Togo', TO: 'Tonga',
  TT: 'Trinidad and Tobago', TN: 'Tunisia', TR: 'Turkey', TM: 'Turkmenistan',
  TV: 'Tuvalu', UG: 'Uganda', UA: 'Ukraine', AE: 'United Arab Emirates',
  GB: 'United Kingdom', US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan',
  VU: 'Vanuatu', VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen', ZM: 'Zambia',
  ZW: 'Zimbabwe', PS: 'Palestine', XK: 'Kosovo', TF: 'French Southern Territories',
};

/** Resolve a raw country value to its full display name. */
function resolveCountry(raw: string | undefined | null): string {
  if (!raw) return '';
  const upper = raw.trim().toUpperCase();
  return COUNTRY_NAMES[upper] ?? raw.trim();
}

// ============================================================================
// Types
// ============================================================================

interface Partner {
  id: string;
  partner_type: 'ecp' | 'pdp';
  company_name: string;
  company_name_ar?: string;
  contact_person: string;
  contact_email: string;
  contact_phone?: string;
  country?: string;
  city?: string;
  address?: string;
  website?: string;
  industry?: string;
  description?: string;
  description_ar?: string;
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// Hooks
// ============================================================================

function useAllPartners() {
  return useQuery({
    queryKey: ['authorised-partners-all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('partners')
        .select('*')
        .eq('is_active', true)
        .order('company_name', { ascending: true });
      if (error) throw error;
      return (data || []) as Partner[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function usePartnerDetails(partnerId: string | null) {
  return useQuery({
    queryKey: ['partner-details', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      const { data: partner, error: partnerError } = await (supabase as any)
        .from('partners')
        .select('*')
        .eq('id', partnerId)
        .single();
      if (partnerError) throw partnerError;
      let relatedData: { programs?: any[]; trainers?: any[] } = {};
      if (partner.partner_type === 'pdp') {
        const { data: programs } = await (supabase as any)
          .from('pdp_programs')
          .select('*')
          .eq('provider_id', partnerId)
          .eq('status', 'approved');
        relatedData = { programs: programs || [] };
      } else if (partner.partner_type === 'ecp') {
        const { data: trainers } = await (supabase as any)
          .from('ecp_trainers')
          .select('*')
          .eq('partner_id', partnerId)
          .eq('status', 'approved');
        relatedData = { trainers: trainers || [] };
      }
      return { partner, ...relatedData };
    },
    enabled: !!partnerId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Component
// ============================================================================

export default function AuthorisedProviders() {
  const { language } = useLanguage();
  const { data: partners = [], isLoading } = useAllPartners();

  const [keyword, setKeyword] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'ecp' | 'pdp'>('all');
  const [detailPartnerId, setDetailPartnerId] = useState<string | null>(null);

  const { data: partnerDetails, isLoading: detailLoading } = usePartnerDetails(detailPartnerId);

  // Unique countries for filter dropdown — resolved to full names, sorted
  const countries = useMemo(() => {
    const seen = new Map<string, string>(); // raw → full name
    partners.forEach((p) => {
      if (p.country) seen.set(p.country, resolveCountry(p.country));
    });
    return Array.from(seen.entries())
      .sort((a, b) => a[1].localeCompare(b[1]));
  }, [partners]);

  // Filtered partners (client-side)
  const filtered = useMemo(() => {
    return partners.filter((p) => {
      const name = p.company_name?.toLowerCase() || '';
      const city = p.city?.toLowerCase() || '';
      const desc = p.description?.toLowerCase() || '';
      const kw = keyword.toLowerCase();
      const matchesKeyword = !keyword || name.includes(kw) || city.includes(kw) || desc.includes(kw);
      const matchesCountry = !selectedCountry || p.country === selectedCountry;
      const matchesType = selectedType === 'all' || p.partner_type === selectedType;
      return matchesKeyword && matchesCountry && matchesType;
    });
  }, [partners, keyword, selectedCountry, selectedType]);

  const handleReset = () => {
    setKeyword('');
    setSelectedCountry('');
    setSelectedType('all');
  };

  const t = {
    en: {
      title: 'Authorised Providers',
      subtitle: 'Browse approved BDA partner organisations for training and certification',
      keyword: 'KEYWORD', country: 'COUNTRY', partnerType: 'PARTNER TYPE',
      allCountries: 'All Countries', allTypes: 'All Types', reset: 'Reset', search: 'Search',
      showing: 'Showing', partners: 'partners', partner: 'partner',
      name: 'Name', website: 'Website', details: 'Details',
      loading: 'Loading partners...', noPartners: 'No partners found',
      noPartnersDesc: 'Try adjusting your search or filters',
      viewDetails: 'View Details', about: 'About',
      contactInfo: 'Contact Information', location: 'Location',
      approvedProgrammes: 'Approved Programmes', approvedTrainers: 'Approved Trainers',
      noProgrammes: 'No approved programmes at this time.',
      noTrainers: 'No approved trainers at this time.',
      aboutProviders: 'About Authorised Providers',
      ecpFull: 'Endorsed Certification Partner', pdpFull: 'Professional Development Provider',
      ecpDesc: 'Organisations authorised to deliver BDA certification training programmes',
      pdpDesc: 'Organisations offering approved PDC-eligible development programmes',
      allVetted: 'All listed partners have been vetted and approved by BDA',
      contactDirectly: 'Contact partners directly for programme enrolment and scheduling',
      searchPlaceholder: 'Search by name or city...',
    },
    ar: {
      title: 'مزودو الخدمات المعتمدون',
      subtitle: 'تصفح منظمات شركاء BDA المعتمدة للتدريب والاعتماد',
      keyword: 'الكلمة المفتاحية', country: 'الدولة', partnerType: 'نوع الشريك',
      allCountries: 'جميع الدول', allTypes: 'جميع الأنواع', reset: 'إعادة تعيين', search: 'بحث',
      showing: 'عرض', partners: 'شركاء', partner: 'شريك',
      name: 'الاسم', website: 'الموقع الإلكتروني', details: 'التفاصيل',
      loading: 'جارٍ تحميل الشركاء...', noPartners: 'لم يتم العثور على شركاء',
      noPartnersDesc: 'حاول تعديل البحث أو الفلاتر',
      viewDetails: 'عرض التفاصيل', about: 'نبذة',
      contactInfo: 'معلومات الاتصال', location: 'الموقع',
      approvedProgrammes: 'البرامج المعتمدة', approvedTrainers: 'المدربون المعتمدون',
      noProgrammes: 'لا توجد برامج معتمدة في الوقت الحالي.',
      noTrainers: 'لا يوجد مدربون معتمدون في الوقت الحالي.',
      aboutProviders: 'حول مزودي الخدمات المعتمدين',
      ecpFull: 'شريك الاعتماد المعتمد', pdpFull: 'مزود التطوير المهني',
      ecpDesc: 'المنظمات المعتمدة لتقديم برامج تدريب شهادات BDA',
      pdpDesc: 'المنظمات التي تقدم برامج تطوير معتمدة مؤهلة لـ PDC',
      allVetted: 'تم فحص واعتماد جميع الشركاء المدرجين من قبل BDA',
      contactDirectly: 'اتصل بالشركاء مباشرة للتسجيل في البرامج والجدولة',
      searchPlaceholder: 'البحث بالاسم أو المدينة...',
    },
  }[language] || {
    title: 'Authorised Providers', subtitle: '', keyword: 'KEYWORD', country: 'COUNTRY',
    partnerType: 'PARTNER TYPE', allCountries: 'All Countries', allTypes: 'All Types',
    reset: 'Reset', search: 'Search', showing: 'Showing', partners: 'partners', partner: 'partner',
    name: 'Name', website: 'Website', details: 'Details', loading: 'Loading...',
    noPartners: 'No partners found', noPartnersDesc: 'Try adjusting your search or filters',
    viewDetails: 'View Details', about: 'About', contactInfo: 'Contact Information',
    location: 'Location', approvedProgrammes: 'Approved Programmes',
    approvedTrainers: 'Approved Trainers', noProgrammes: 'No approved programmes at this time.',
    noTrainers: 'No approved trainers at this time.', aboutProviders: 'About Authorised Providers',
    ecpFull: 'Endorsed Certification Partner', pdpFull: 'Professional Development Provider',
    ecpDesc: '', pdpDesc: '', allVetted: '', contactDirectly: '',
    searchPlaceholder: 'Search by name or city...',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t.title}</h1>
        <p className="text-gray-500 text-sm">{t.subtitle}</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Keyword */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {t.keyword}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="pl-9 pr-8"
              />
              {keyword && (
                <button onClick={() => setKeyword('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {t.country}
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t.allCountries}</option>
              {countries.map(([raw, full]) => (
                <option key={raw} value={raw}>{full}</option>
              ))}
            </select>
          </div>

          {/* Partner Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {t.partnerType}
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'all' | 'ecp' | 'pdp')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t.allTypes}</option>
              <option value="ecp">ECP — Endorsed Certification Partner</option>
              <option value="pdp">PDP — Professional Development Provider</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={handleReset}
            className="bg-[#0d2b5e] text-white hover:bg-[#1c4a8b] border-[#0d2b5e]">
            {t.reset}
          </Button>
        </div>
      </div>

      {/* Results Count */}
      {!isLoading && (
        <p className="text-sm text-gray-500">
          {t.showing}{' '}
          <span className="font-semibold text-gray-700">{filtered.length}</span>{' '}
          {filtered.length !== 1 ? t.partners : t.partner}
        </p>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
            {t.loading}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{t.noPartners}</p>
            <p className="text-sm mt-1">{t.noPartnersDesc}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-blue-700 w-1/2">{t.name}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">{t.website}</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 w-32">{t.details}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((partner) => (
                <tr key={partner.id} className="hover:bg-gray-50 transition-colors">
                  {/* Name column */}
                  <td className="px-4 py-3">
                    <div>
                      <span
                        className="font-medium text-blue-700 hover:underline cursor-pointer"
                        onClick={() => setDetailPartnerId(partner.id)}
                      >
                        {language === 'ar' && partner.company_name_ar
                          ? partner.company_name_ar
                          : partner.company_name}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs px-1.5 py-0 ${
                            partner.partner_type === 'ecp'
                              ? 'border-blue-300 text-blue-700 bg-blue-50'
                              : 'border-indigo-300 text-indigo-700 bg-indigo-50'
                          }`}
                        >
                          {partner.partner_type?.toUpperCase()}
                        </Badge>
                        {(partner.city || partner.country) && (
                          <span className="text-xs text-gray-400 flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {[partner.city, resolveCountry(partner.country)].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Website column */}
                  <td className="px-4 py-3">
                    {partner.website ? (
                      <a
                        href={partner.website.startsWith('http') ? partner.website : `https://${partner.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
                      >
                        <Globe className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{partner.website}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60" />
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Details column */}
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-gray-300 hover:border-blue-400 hover:text-blue-600"
                      onClick={() => setDetailPartnerId(partner.id)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      {t.viewDetails}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* About section */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {t.aboutProviders}
        </h3>
        <ul className="space-y-1 text-xs text-blue-700">
          <li><strong>ECP ({t.ecpFull}):</strong> {t.ecpDesc}</li>
          <li><strong>PDP ({t.pdpFull}):</strong> {t.pdpDesc}</li>
          <li>{t.allVetted}</li>
          <li>{t.contactDirectly}</li>
        </ul>
      </div>

      {/* Partner Detail Modal */}
      {detailPartnerId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDetailPartnerId(null); }}
        >
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-auto shadow-xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {detailLoading ? '...' :
                    language === 'ar' && partnerDetails?.partner?.company_name_ar
                      ? partnerDetails.partner.company_name_ar
                      : partnerDetails?.partner?.company_name}
                </h2>
                {partnerDetails?.partner && (
                  <Badge className={`mt-1 ${
                    partnerDetails.partner.partner_type === 'ecp'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {partnerDetails.partner.partner_type?.toUpperCase()}
                  </Badge>
                )}
              </div>
              <button onClick={() => setDetailPartnerId(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            {detailLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2" />
                Loading details...
              </div>
            ) : partnerDetails?.partner ? (
              <div className="p-5 space-y-5 text-sm">
                {/* Description */}
                {partnerDetails.partner.description && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1">{t.about}</h4>
                    <p className="text-gray-600 leading-relaxed">
                      {language === 'ar' && partnerDetails.partner.description_ar
                        ? partnerDetails.partner.description_ar
                        : partnerDetails.partner.description}
                    </p>
                  </div>
                )}

                {/* Contact */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">{t.contactInfo}</h4>
                  <div className="space-y-1.5">
                    {partnerDetails.partner.contact_person && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="h-4 w-4 text-gray-400" />
                        {partnerDetails.partner.contact_person}
                      </div>
                    )}
                    {partnerDetails.partner.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <a href={`mailto:${partnerDetails.partner.contact_email}`} className="text-blue-600 hover:underline">
                          {partnerDetails.partner.contact_email}
                        </a>
                      </div>
                    )}
                    {partnerDetails.partner.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a href={`tel:${partnerDetails.partner.contact_phone}`} className="text-blue-600 hover:underline">
                          {partnerDetails.partner.contact_phone}
                        </a>
                      </div>
                    )}
                    {partnerDetails.partner.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <a
                          href={partnerDetails.partner.website.startsWith('http') ? partnerDetails.partner.website : `https://${partnerDetails.partner.website}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {partnerDetails.partner.website}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location — show full country name */}
                {(partnerDetails.partner.city || partnerDetails.partner.country) && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1">{t.location}</h4>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      {[
                        partnerDetails.partner.address,
                        partnerDetails.partner.city,
                        resolveCountry(partnerDetails.partner.country),
                      ].filter(Boolean).join(', ')}
                    </div>
                  </div>
                )}

                {/* PDP Programmes */}
                {partnerDetails.partner.partner_type === 'pdp' && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4" />
                      {t.approvedProgrammes} ({partnerDetails.programs?.length || 0})
                    </h4>
                    {!partnerDetails.programs || partnerDetails.programs.length === 0 ? (
                      <p className="text-gray-400 text-xs">{t.noProgrammes}</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {partnerDetails.programs.map((prog: any) => (
                          <li key={prog.id} className="flex items-start gap-2 text-gray-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                            <div>
                              <p className="font-medium">{prog.program_name}</p>
                              {prog.max_pdc_credits && (
                                <p className="text-xs text-gray-400">Max PDC Credits: {prog.max_pdc_credits}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* ECP Trainers */}
                {partnerDetails.partner.partner_type === 'ecp' && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <Award className="h-4 w-4" />
                      {t.approvedTrainers} ({partnerDetails.trainers?.length || 0})
                    </h4>
                    {!partnerDetails.trainers || partnerDetails.trainers.length === 0 ? (
                      <p className="text-gray-400 text-xs">{t.noTrainers}</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {partnerDetails.trainers.map((trainer: any) => (
                          <li key={trainer.id} className="flex items-center gap-2 text-gray-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                            <div>
                              <p className="font-medium">{trainer.first_name} {trainer.last_name}</p>
                              {trainer.email && <p className="text-xs text-gray-400">{trainer.email}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

AuthorisedProviders.displayName = 'AuthorisedProviders';
