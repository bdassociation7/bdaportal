/**
 * Accredited Programs Directory
 *
 * Browse all BDA-accredited PDP programs
 * Requirements: Individual Portal - Accredited Programs
 *
 * User Stories:
 * - Browse all approved PDP programs across all providers
 * - Search by program name, provider, or program ID
 * - Filter by activity type, competency area, PDC credits
 * - View program details
 * - Navigate to claim PDCs for attended programs
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Filter,
  Award,
  Clock,
  Building2,
  Calendar,
  ExternalLink,
  X,
  ChevronRight,
  GraduationCap,
  Target,
  CheckCircle,
  Users,
  Globe,
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
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';

// ============================================================================
// Translations
// ============================================================================

const translations = {
  en: {
    // Header
    title: 'Accredited Programs',
    subtitle: 'Find BDA-accredited professional development programs to advance your career',
    // Results
    showingPrograms: (count: number) => `Showing ${count} accredited program${count !== 1 ? 's' : ''}`,
    recentlyAccredited: 'Recently Accredited',
    // Filters
    searchPlaceholder: 'Search by program name or provider...',
    allActivityTypes: 'All Activity Types',
    allCompetencies: 'All Competency Areas',
    allProviders: 'All Providers',
    // Activity Types
    activityTypes: {
      course: 'Course',
      workshop: 'Workshop',
      seminar: 'Seminar',
      conference: 'Conference',
      webinar: 'Webinar',
      self_study: 'Self-Study',
      mentoring: 'Mentoring',
      other: 'Other',
    },
    // Loading/Empty
    loading: 'Loading accredited programs...',
    noProgramsFound: 'No programs found',
    noProgramsFoundDesc: 'Try adjusting your filters or search criteria',
    // Program Card
    viewDetails: 'View Details',
    pdcCredits: 'PDC Credits',
    provider: 'Provider',
    validUntil: 'Valid Until',
    // Modal
    programDetails: 'Program Details',
    description: 'Description',
    programInfo: 'Program Information',
    activityType: 'Activity Type',
    deliveryFormat: 'Delivery Format',
    duration: 'Duration',
    hours: 'hours',
    competencies: 'BoCK Competencies',
    providerInfo: 'Provider Information',
    claimPdcs: 'Claim PDCs for This Program',
    claimPdcsDesc: 'Already attended this program? Claim your PDC credits now.',
    goToClaimPdcs: 'Claim PDC Credits',
    // Delivery formats
    deliveryFormats: {
      in_person: 'In-Person',
      online: 'Online',
      hybrid: 'Hybrid',
      self_paced: 'Self-Paced',
    },
    // Help section
    aboutAccreditedPrograms: 'About Accredited Programs',
    helpText1: 'All programs listed here have been reviewed and approved by BDA',
    helpText2: 'PDC credits are earned upon successful completion of a program',
    helpText3: 'Contact the provider directly for enrollment and scheduling',
    helpText4: 'After completing a program, claim your PDCs from the PDCs page',
    // Verified badge
    bdaAccredited: 'BDA Accredited',
    // Website link
    visitWebsite: 'Visit Website',
  },
  ar: {
    // Header
    title: 'البرامج المعتمدة',
    subtitle: 'اكتشف برامج التطوير المهني المعتمدة من BDA لتطوير مسيرتك المهنية',
    // Results
    showingPrograms: (count: number) => `عرض ${count} برنامج معتمد`,
    recentlyAccredited: 'المعتمدة حديثاً',
    // Filters
    searchPlaceholder: 'البحث باسم البرنامج أو المزود...',
    allActivityTypes: 'جميع أنواع الأنشطة',
    allCompetencies: 'جميع مجالات الكفاءة',
    allProviders: 'جميع المزودين',
    // Activity Types
    activityTypes: {
      course: 'دورة',
      workshop: 'ورشة عمل',
      seminar: 'ندوة',
      conference: 'مؤتمر',
      webinar: 'ندوة عبر الإنترنت',
      self_study: 'دراسة ذاتية',
      mentoring: 'إرشاد',
      other: 'أخرى',
    },
    // Loading/Empty
    loading: 'جارٍ تحميل البرامج المعتمدة...',
    noProgramsFound: 'لم يتم العثور على برامج',
    noProgramsFoundDesc: 'حاول تعديل الفلاتر أو معايير البحث',
    // Program Card
    viewDetails: 'عرض التفاصيل',
    pdcCredits: 'نقاط PDC',
    provider: 'المزود',
    validUntil: 'صالح حتى',
    // Modal
    programDetails: 'تفاصيل البرنامج',
    description: 'الوصف',
    programInfo: 'معلومات البرنامج',
    activityType: 'نوع النشاط',
    deliveryFormat: 'طريقة التقديم',
    duration: 'المدة',
    hours: 'ساعات',
    competencies: 'كفاءات BoCK',
    providerInfo: 'معلومات المزود',
    claimPdcs: 'المطالبة بنقاط PDC لهذا البرنامج',
    claimPdcsDesc: 'هل حضرت هذا البرنامج بالفعل؟ طالب بنقاط PDC الخاصة بك الآن.',
    goToClaimPdcs: 'المطالبة بنقاط PDC',
    // Delivery formats
    deliveryFormats: {
      in_person: 'حضوري',
      online: 'عبر الإنترنت',
      hybrid: 'هجين',
      self_paced: 'ذاتي',
    },
    // Help section
    aboutAccreditedPrograms: 'حول البرامج المعتمدة',
    helpText1: 'تمت مراجعة واعتماد جميع البرامج المدرجة هنا من قبل BDA',
    helpText2: 'يتم الحصول على نقاط PDC عند إكمال البرنامج بنجاح',
    helpText3: 'اتصل بالمزود مباشرة للتسجيل والجدولة',
    helpText4: 'بعد إكمال البرنامج، طالب بنقاط PDC من صفحة PDCs',
    // Verified badge
    bdaAccredited: 'معتمد من BDA',
    // Website link
    visitWebsite: 'زيارة الموقع',
  },
};

// ============================================================================
// Types
// ============================================================================

interface AccreditedProgram {
  id: string;
  program_id: string;
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

// ============================================================================
// Hooks
// ============================================================================

function useAccreditedPrograms(filters: {
  search?: string;
  activityType?: string;
  providerId?: string;
}) {
  return useQuery({
    queryKey: ['accredited-programs', filters],
    queryFn: async () => {
      // Fetch programs
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
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.activityType && filters.activityType !== 'all') {
        query = query.eq('activity_type', filters.activityType);
      }
      if (filters.providerId && filters.providerId !== 'all') {
        query = query.eq('provider_id', filters.providerId);
      }
      if (filters.search) {
        query = query.or(
          `program_name.ilike.%${filters.search}%,provider_name.ilike.%${filters.search}%`
        );
      }

      const { data: programs, error } = await query;
      if (error) throw error;

      if (!programs || programs.length === 0) {
        return [] as AccreditedProgram[];
      }

      // Get unique provider IDs
      const providerIds = [...new Set(programs.map(p => p.provider_id))];

      // Fetch partner profiles with websites
      const { data: profiles } = await supabase
        .from('pdp_partner_profiles')
        .select('partner_id, website')
        .in('partner_id', providerIds);

      // Create a map of provider_id to website
      const websiteMap = new Map(
        profiles?.map(p => [p.partner_id, p.website]) || []
      );

      // Merge website into programs
      return programs.map(program => ({
        ...program,
        provider_website: websiteMap.get(program.provider_id) || undefined,
      })) as AccreditedProgram[];
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

      // Get unique providers
      const providerMap = new Map<string, string>();
      data?.forEach((p) => {
        if (!providerMap.has(p.provider_id)) {
          providerMap.set(p.provider_id, p.provider_name);
        }
      });

      return Array.from(providerMap.entries()).map(([id, name]) => ({ id, name }));
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// Component
// ============================================================================

export default function AccreditedPrograms() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const texts = translations[language];

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState<AccreditedProgram | null>(null);

  // Data
  const { data: programs = [], isLoading } = useAccreditedPrograms({
    search: searchQuery,
    activityType: activityFilter,
    providerId: providerFilter,
  });
  const { data: providers = [] } = useProviders();

  // Helpers
  const getActivityTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      course: 'bg-blue-100 text-blue-700',
      workshop: 'bg-green-100 text-green-700',
      seminar: 'bg-purple-100 text-purple-700',
      conference: 'bg-orange-100 text-orange-700',
      webinar: 'bg-cyan-100 text-cyan-700',
      self_study: 'bg-gray-100 text-gray-700',
      mentoring: 'bg-pink-100 text-pink-700',
      other: 'bg-slate-100 text-slate-700',
    };

    return (
      <Badge className={colors[type] || colors.other}>
        {texts.activityTypes[type as keyof typeof texts.activityTypes] || type}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleClaimPdcs = (program: AccreditedProgram) => {
    // Navigate to PDCs page with program ID pre-filled
    navigate('/pdcs', { state: { programId: program.program_id, programName: program.program_name } });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GraduationCap className="h-8 w-8" />
          {texts.title}
        </h1>
        <p className="mt-2 opacity-90">{texts.subtitle}</p>
      </div>

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
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{texts.allActivityTypes}</SelectItem>
                  {Object.entries(texts.activityTypes).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-56">
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{texts.allProviders}</SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      {!isLoading && programs.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            {texts.showingPrograms(programs.length)}
          </p>
          <Badge variant="outline" className="text-purple-600 border-purple-200">
            {texts.recentlyAccredited}
          </Badge>
        </div>
      )}

      {/* Programs List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">{texts.loading}</p>
        </div>
      ) : programs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">{texts.noProgramsFound}</p>
            <p className="text-sm text-gray-500">{texts.noProgramsFoundDesc}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {programs.map((program) => (
            <Card key={program.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-xs text-green-600 font-medium">{texts.bdaAccredited}</span>
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      {language === 'ar' && program.program_name_ar
                        ? program.program_name_ar
                        : program.program_name}
                    </CardTitle>
                  </div>
                  {getActivityTypeBadge(program.activity_type)}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Provider */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="h-4 w-4" />
                  <span>{program.provider_name}</span>
                  {program.provider_website && (
                    <a
                      href={program.provider_website.startsWith('http') ? program.provider_website : `https://${program.provider_website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span className="text-xs underline">Website</span>
                    </a>
                  )}
                </div>

                {/* PDC Credits & Duration */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg">
                    <Award className="h-4 w-4" />
                    <span className="font-semibold">{program.max_pdc_credits}</span>
                    <span className="text-xs">{texts.pdcCredits}</span>
                  </div>
                  {program.duration_hours && (
                    <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>
                        {program.duration_hours} {texts.hours}
                      </span>
                    </div>
                  )}
                </div>

                {/* Validity */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {texts.validUntil}: {formatDate(program.valid_until)}
                  </span>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t flex gap-2">
                  <Button
                    onClick={() => setSelectedProgram(program)}
                    variant="outline"
                    className="flex-1"
                  >
                    {texts.viewDetails}
                  </Button>
                  <Button
                    onClick={() => handleClaimPdcs(program)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Award className="h-4 w-4 mr-1" />
                    {texts.goToClaimPdcs}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Program Detail Modal */}
      {selectedProgram && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">{texts.bdaAccredited}</span>
                </div>
                <h2 className="text-2xl font-bold">
                  {language === 'ar' && selectedProgram.program_name_ar
                    ? selectedProgram.program_name_ar
                    : selectedProgram.program_name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedProgram(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              {selectedProgram.description && (
                <div>
                  <h3 className="font-semibold mb-2">{texts.description}</h3>
                  <p className="text-gray-600">
                    {language === 'ar' && selectedProgram.description_ar
                      ? selectedProgram.description_ar
                      : selectedProgram.description}
                  </p>
                </div>
              )}

              {/* Program Information */}
              <div>
                <h3 className="font-semibold mb-3">{texts.programInfo}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">{texts.activityType}</p>
                    {getActivityTypeBadge(selectedProgram.activity_type)}
                  </div>
                  {selectedProgram.delivery_format && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">{texts.deliveryFormat}</p>
                      <p className="font-medium">
                        {texts.deliveryFormats[
                          selectedProgram.delivery_format as keyof typeof texts.deliveryFormats
                        ] || selectedProgram.delivery_format}
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">{texts.pdcCredits}</p>
                    <p className="font-bold text-green-700 text-xl">
                      {selectedProgram.max_pdc_credits}
                    </p>
                  </div>
                  {selectedProgram.duration_hours && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">{texts.duration}</p>
                      <p className="font-medium">
                        {selectedProgram.duration_hours} {texts.hours}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Competencies */}
              {selectedProgram.competencies && selectedProgram.competencies.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">{texts.competencies}</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProgram.competencies.map((c, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        <Target className="h-3 w-3 mr-1" />
                        {c.competency?.code}: {language === 'ar' && c.competency?.name_ar ? c.competency.name_ar : c.competency?.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Provider Info */}
              <div>
                <h3 className="font-semibold mb-3">{texts.providerInfo}</h3>
                <div className="p-4 bg-gray-50 rounded-lg flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium">{selectedProgram.provider_name}</p>
                    <p className="text-sm text-gray-500">
                      {texts.validUntil}: {formatDate(selectedProgram.valid_until)}
                    </p>
                    {selectedProgram.provider_website && (
                      <a
                        href={selectedProgram.provider_website.startsWith('http') ? selectedProgram.provider_website : `https://${selectedProgram.provider_website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        <Globe className="h-4 w-4" />
                        <span className="text-sm underline">{texts.visitWebsite}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Claim PDCs CTA */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-1">{texts.claimPdcs}</h3>
                <p className="text-sm text-green-700 mb-3">{texts.claimPdcsDesc}</p>
                <Button
                  onClick={() => {
                    setSelectedProgram(null);
                    handleClaimPdcs(selectedProgram);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Award className="h-4 w-4 mr-2" />
                  {texts.goToClaimPdcs}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <GraduationCap className="h-6 w-6 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-900 mb-2">{texts.aboutAccreditedPrograms}</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• {texts.helpText1}</li>
                <li>• {texts.helpText2}</li>
                <li>• {texts.helpText3}</li>
                <li>• {texts.helpText4}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

AccreditedPrograms.displayName = 'AccreditedPrograms';
