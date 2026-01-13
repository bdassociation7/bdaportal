/**
 * Authorized Providers Page
 *
 * Displays list of authorized BDA partner organizations (ECP & PDP)
 * Requirements: Individual Portal - Authorized Providers
 *
 * User Stories:
 * - Show all active ECP & PDP partners
 * - Filter by partner type and country
 * - View partner details with programs/trainers
 */

import { useState } from 'react';
import {
  Building2,
  Search,
  Globe,
  MapPin,
  Eye,
  ExternalLink,
  X,
  Mail,
  Phone,
  Award,
  Users,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/config/supabase.config';
import { useLanguage } from '@/contexts/LanguageContext';

// ============================================================================
// Translations
// ============================================================================

const translations = {
  en: {
    // Header
    title: 'Authorized Providers',
    subtitle: 'Browse approved BDA partner organizations for training and certification',
    // Stats
    totalPartners: 'Total Partners',
    ecpPartners: 'ECP Partners',
    pdpPartners: 'PDP Partners',
    // Filters
    searchPlaceholder: 'Search by partner name, location, or description...',
    allPartnerTypes: 'All Partner Types',
    ecpOnly: 'ECP Only',
    pdpOnly: 'PDP Only',
    allCountries: 'All Countries',
    // Loading/Empty
    loading: 'Loading authorized partners...',
    noPartnersFound: 'No partners found',
    noPartnersFoundDesc: 'Try adjusting your filters or search criteria',
    // Partner Card
    visitWebsite: 'Visit Website',
    viewDetails: 'View Details',
    // Modal
    about: 'About',
    contactInfo: 'Contact Information',
    location: 'Location',
    approvedPrograms: (count: number) => `Approved Programs (${count})`,
    approvedTrainers: (count: number) => `Approved Trainers (${count})`,
    noApprovedPrograms: 'No approved programs at this time.',
    noApprovedTrainers: 'No approved trainers at this time.',
    programId: 'Program ID',
    maxPdcCredits: 'Max PDC Credits',
    noCertifications: 'No certifications',
    // Help section
    aboutAuthorizedProviders: 'About Authorized Providers',
    ecpDescription: 'Organizations authorized to deliver BDA certification training programs',
    pdpDescription: 'Organizations offering approved PDC-eligible development programs',
    allPartnersVetted: 'All listed partners have been vetted and approved by BDA',
    contactDirectly: 'Contact partners directly for program enrollment and scheduling',
    // Partner types
    ecpFull: 'Endorsed Certification Partner',
    pdpFull: 'Professional Development Provider',
  },
  ar: {
    // Header
    title: 'مزودو الخدمات المعتمدون',
    subtitle: 'تصفح منظمات شركاء BDA المعتمدة للتدريب والاعتماد',
    // Stats
    totalPartners: 'إجمالي الشركاء',
    ecpPartners: 'شركاء ECP',
    pdpPartners: 'شركاء PDP',
    // Filters
    searchPlaceholder: 'البحث باسم الشريك أو الموقع أو الوصف...',
    allPartnerTypes: 'جميع أنواع الشركاء',
    ecpOnly: 'ECP فقط',
    pdpOnly: 'PDP فقط',
    allCountries: 'جميع الدول',
    // Loading/Empty
    loading: 'جارٍ تحميل الشركاء المعتمدين...',
    noPartnersFound: 'لم يتم العثور على شركاء',
    noPartnersFoundDesc: 'حاول تعديل الفلاتر أو معايير البحث',
    // Partner Card
    visitWebsite: 'زيارة الموقع',
    viewDetails: 'عرض التفاصيل',
    // Modal
    about: 'نبذة',
    contactInfo: 'معلومات الاتصال',
    location: 'الموقع',
    approvedPrograms: (count: number) => `البرامج المعتمدة (${count})`,
    approvedTrainers: (count: number) => `المدربون المعتمدون (${count})`,
    noApprovedPrograms: 'لا توجد برامج معتمدة في الوقت الحالي.',
    noApprovedTrainers: 'لا يوجد مدربون معتمدون في الوقت الحالي.',
    programId: 'معرف البرنامج',
    maxPdcCredits: 'أقصى نقاط PDC',
    noCertifications: 'لا توجد شهادات',
    // Help section
    aboutAuthorizedProviders: 'حول مزودي الخدمات المعتمدين',
    ecpDescription: 'المنظمات المعتمدة لتقديم برامج تدريب شهادات BDA',
    pdpDescription: 'المنظمات التي تقدم برامج تطوير معتمدة مؤهلة لـ PDC',
    allPartnersVetted: 'تم فحص واعتماد جميع الشركاء المدرجين من قبل BDA',
    contactDirectly: 'اتصل بالشركاء مباشرة للتسجيل في البرامج والجدولة',
    // Partner types
    ecpFull: 'شريك الاعتماد المعتمد',
    pdpFull: 'مزود التطوير المهني',
  }
};

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
  license_number?: string;
  license_valid_from?: string;
  license_valid_until?: string;
  is_active: boolean;
  created_at: string;
}

interface PartnerStats {
  total_partners: number;
  ecp_partners: number;
  pdp_partners: number;
}

type PartnerType = 'all' | 'ecp' | 'pdp';

// ============================================================================
// Hooks
// ============================================================================

function usePartners(filters: {
  type?: string;
  country?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['authorized-partners', filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from('partners')
        .select('*')
        .eq('is_active', true)
        .order('company_name');

      // Apply filters
      if (filters.type && filters.type !== 'all') {
        query = query.eq('partner_type', filters.type);
      }
      if (filters.country && filters.country !== 'all') {
        query = query.eq('country', filters.country);
      }
      if (filters.search) {
        query = query.or(
          `company_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,city.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Partner[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

function usePartnerStats() {
  return useQuery({
    queryKey: ['partner-stats'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('partners')
        .select('partner_type')
        .eq('is_active', true);

      if (error) throw error;

      const stats: PartnerStats = {
        total_partners: data?.length || 0,
        ecp_partners: data?.filter((p: any) => p.partner_type === 'ecp').length || 0,
        pdp_partners: data?.filter((p: any) => p.partner_type === 'pdp').length || 0,
      };

      return stats;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useCountries() {
  return useQuery({
    queryKey: ['partner-countries'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('partners')
        .select('country')
        .eq('is_active', true)
        .not('country', 'is', null);

      if (error) throw error;

      // Get unique countries
      const countries = [...new Set(data?.map((p: any) => p.country).filter(Boolean))];
      return countries.sort() as string[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

function usePartnerDetails(partnerId: string | null) {
  return useQuery({
    queryKey: ['partner-details', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;

      // Get partner details
      const { data: partner, error: partnerError } = await (supabase as any)
        .from('partners')
        .select('*')
        .eq('id', partnerId)
        .single();

      if (partnerError) throw partnerError;

      // Get related data based on type
      let relatedData = null;

      if (partner.partner_type === 'pdp') {
        // Get PDP programs
        const { data: programs } = await (supabase as any)
          .from('pdp_programs')
          .select('*')
          .eq('provider_id', partnerId)
          .eq('status', 'approved');

        relatedData = { programs: programs || [] };
      } else if (partner.partner_type === 'ecp') {
        // Get ECP trainers
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

export default function AuthorizedProviders() {
  // Language
  const { language } = useLanguage();
  const texts = translations[language];

  // State
  const [typeFilter, setTypeFilter] = useState<PartnerType>('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  // Data
  const { data: partners = [], isLoading } = usePartners({
    type: typeFilter,
    country: countryFilter,
    search: searchQuery,
  });
  const { data: stats } = usePartnerStats();
  const { data: countries = [] } = useCountries();
  const { data: partnerDetails } = usePartnerDetails(selectedPartnerId);

  // Helper functions
  const getPartnerTypeBadge = (type: 'ecp' | 'pdp') => {
    const config = {
      ecp: {
        label: 'ECP',
        fullLabel: texts.ecpFull,
        color: 'bg-blue-100 text-blue-700 border-blue-300',
      },
      pdp: {
        label: 'PDP',
        fullLabel: texts.pdpFull,
        color: 'bg-purple-100 text-purple-700 border-purple-300',
      },
    };

    const { label, color } = config[type];
    return (
      <Badge className={color} title={config[type].fullLabel}>
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          {texts.title}
        </h1>
        <p className="mt-2 opacity-90">
          {texts.subtitle}
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{texts.totalPartners}</p>
                  <p className="text-2xl font-bold">{stats.total_partners}</p>
                </div>
                <Building2 className="h-8 w-8 text-royal-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{texts.ecpPartners}</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.ecp_partners}</p>
                </div>
                <Award className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{texts.pdpPartners}</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.pdp_partners}</p>
                </div>
                <BookOpen className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={texts.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-full md:w-48">
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as PartnerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{texts.allPartnerTypes}</SelectItem>
                  <SelectItem value="ecp">{texts.ecpOnly}</SelectItem>
                  <SelectItem value="pdp">{texts.pdpOnly}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{texts.allCountries}</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partners List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">{texts.loading}</p>
        </div>
      ) : partners.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">{texts.noPartnersFound}</p>
            <p className="text-sm text-gray-500">
              {texts.noPartnersFoundDesc}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {partners.map((partner) => (
            <Card key={partner.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">
                      {language === 'ar' && partner.company_name_ar
                        ? partner.company_name_ar
                        : partner.company_name}
                    </CardTitle>
                    {partner.city && partner.country && (
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {partner.city}, {partner.country}
                      </p>
                    )}
                  </div>
                  {getPartnerTypeBadge(partner.partner_type)}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Description */}
                {(partner.description || partner.description_ar) && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {language === 'ar' && partner.description_ar
                      ? partner.description_ar
                      : partner.description}
                  </p>
                )}

                {/* Details */}
                <div className="space-y-2 text-sm">
                  {partner.industry && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 className="h-4 w-4" />
                      <span>{partner.industry}</span>
                    </div>
                  )}

                  {partner.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <a
                        href={partner.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {texts.visitWebsite}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t">
                  <Button
                    onClick={() => setSelectedPartnerId(partner.id)}
                    className="w-full"
                    variant="outline"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {texts.viewDetails}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Partner Detail Modal */}
      {selectedPartnerId && partnerDetails?.partner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold">
                  {language === 'ar' && partnerDetails.partner.company_name_ar
                    ? partnerDetails.partner.company_name_ar
                    : partnerDetails.partner.company_name}
                </h2>
                <div className="mt-2">
                  {getPartnerTypeBadge(partnerDetails.partner.partner_type)}
                </div>
              </div>
              <button
                onClick={() => setSelectedPartnerId(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              {partnerDetails.partner.description && (
                <div>
                  <h3 className="font-semibold mb-2">{texts.about}</h3>
                  <p className="text-gray-600">
                    {language === 'ar' && partnerDetails.partner.description_ar
                      ? partnerDetails.partner.description_ar
                      : partnerDetails.partner.description}
                  </p>
                </div>
              )}

              {/* Contact Information */}
              <div>
                <h3 className="font-semibold mb-3">{texts.contactInfo}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{partnerDetails.partner.contact_person}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a
                      href={`mailto:${partnerDetails.partner.contact_email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {partnerDetails.partner.contact_email}
                    </a>
                  </div>
                  {partnerDetails.partner.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <a
                        href={`tel:${partnerDetails.partner.contact_phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {partnerDetails.partner.contact_phone}
                      </a>
                    </div>
                  )}
                  {partnerDetails.partner.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <a
                        href={partnerDetails.partner.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {partnerDetails.partner.website}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              {(partnerDetails.partner.address || partnerDetails.partner.city) && (
                <div>
                  <h3 className="font-semibold mb-2">{texts.location}</h3>
                  <div className="text-gray-600 text-sm">
                    {partnerDetails.partner.address && <p>{partnerDetails.partner.address}</p>}
                    {partnerDetails.partner.city && partnerDetails.partner.country && (
                      <p>
                        {partnerDetails.partner.city}, {partnerDetails.partner.country}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Related Programs (PDP) */}
              {partnerDetails.partner.partner_type === 'pdp' && partnerDetails.programs && (
                <div>
                  <h3 className="font-semibold mb-3">
                    {texts.approvedPrograms(partnerDetails.programs.length)}
                  </h3>
                  {partnerDetails.programs.length === 0 ? (
                    <p className="text-sm text-gray-500">{texts.noApprovedPrograms}</p>
                  ) : (
                    <div className="space-y-2">
                      {partnerDetails.programs.map((program: any) => (
                        <div key={program.id} className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-medium">{program.program_name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {texts.programId}: {program.program_id} • {texts.maxPdcCredits}:{' '}
                            {program.max_pdc_credits}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Related Trainers (ECP) */}
              {partnerDetails.partner.partner_type === 'ecp' && partnerDetails.trainers && (
                <div>
                  <h3 className="font-semibold mb-3">
                    {texts.approvedTrainers(partnerDetails.trainers.length)}
                  </h3>
                  {partnerDetails.trainers.length === 0 ? (
                    <p className="text-sm text-gray-500">{texts.noApprovedTrainers}</p>
                  ) : (
                    <div className="space-y-2">
                      {partnerDetails.trainers.map((trainer: any) => (
                        <div key={trainer.id} className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-medium">
                            {trainer.first_name} {trainer.last_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {trainer.email} •{' '}
                            {trainer.certifications?.join(', ') || texts.noCertifications}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Building2 className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">{texts.aboutAuthorizedProviders}</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • <strong>ECP ({texts.ecpFull}):</strong> {texts.ecpDescription}
                </li>
                <li>
                  • <strong>PDP ({texts.pdpFull}):</strong> {texts.pdpDescription}
                </li>
                <li>• {texts.allPartnersVetted}</li>
                <li>• {texts.contactDirectly}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

AuthorizedProviders.displayName = 'AuthorizedProviders';
