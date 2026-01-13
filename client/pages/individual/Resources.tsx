import { useState } from 'react';
import { FolderOpen, Download, FileText, BookOpen, Video, FileCode, Search, Loader2, Mic, Monitor, Layers, GraduationCap, PlayCircle, Briefcase, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { toast } from 'sonner';
import { useAuthContext } from '@/app/providers/AuthProvider';
import {
  useResources,
  useResourceTypes,
  useResourceCategories,
  useResourceDownloadUrl,
  useLogResourceAccess,
  ResourcesService,
} from '@/entities/resources';
import type { ResourceFilters, CertificationType as ResourceCertType } from '@/entities/resources';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Resources Page
 * Learning materials, documents, and study resources
 */

// ============================================================================
// Translations
// ============================================================================

const translations = {
  en: {
    // Header
    title: 'Resources',
    subtitle: 'Access learning materials, study guides, templates, and more',
    // Filters
    searchPlaceholder: 'Search resources...',
    allTypes: 'All Types',
    allCategories: 'All Categories',
    allCertifications: 'All Certifications',
    // Loading/Empty
    noResourcesFound: 'No resources found',
    noResourcesFoundDesc: 'Try adjusting your search or filters',
    // Resource card
    general: 'General',
    featured: 'Featured',
    downloads: 'downloads',
    download: 'Download',
    updated: 'Updated',
    // Toast messages
    downloading: (title: string) => `Downloading "${title}"`,
    downloadFailed: 'Failed to download resource',
  },
  ar: {
    // Header
    title: 'الموارد',
    subtitle: 'الوصول إلى مواد التعلم وأدلة الدراسة والقوالب والمزيد',
    // Filters
    searchPlaceholder: 'البحث في الموارد...',
    allTypes: 'جميع الأنواع',
    allCategories: 'جميع الفئات',
    allCertifications: 'جميع الشهادات',
    // Loading/Empty
    noResourcesFound: 'لم يتم العثور على موارد',
    noResourcesFoundDesc: 'حاول تعديل البحث أو الفلاتر',
    // Resource card
    general: 'عام',
    featured: 'مميز',
    downloads: 'تحميل',
    download: 'تحميل',
    updated: 'تم التحديث',
    // Toast messages
    downloading: (title: string) => `جارٍ تحميل "${title}"`,
    downloadFailed: 'فشل تحميل المورد',
  }
};

const ICON_MAP: Record<string, any> = {
  FileText,
  Video,
  FileCode,
  BookOpen,
  Mic,
  Monitor,
  Layers,
  GraduationCap,
  PlayCircle,
  Briefcase,
  Wrench,
};

export default function Resources() {
  const { user } = useAuthContext();
  const { language } = useLanguage();
  const texts = translations[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [certFilter, setCertFilter] = useState<ResourceCertType | 'all'>('all');

  // Build filters
  const filters: ResourceFilters = {
    search: searchQuery || undefined,
    resource_type_id: typeFilter !== 'all' ? typeFilter : undefined,
    category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
    certification_type: certFilter !== 'all' ? certFilter : undefined,
    status: 'published',
  };

  // Fetch data
  const { data: resources, isLoading } = useResources(filters);
  const { data: resourceTypes } = useResourceTypes();
  const { data: categories } = useResourceCategories();
  const logAccessMutation = useLogResourceAccess();

  const handleDownload = async (resourceId: string, filePath: string, title: string) => {
    try {
      // Log the download
      if (user?.id) {
        await logAccessMutation.mutateAsync({
          resourceId,
          userId: user.id,
          action: 'download',
        });
      }

      // Generate signed download URL (private storage)
      const urlResult = await ResourcesService.getDownloadUrl(filePath);

      if (urlResult.error || !urlResult.data) {
        throw new Error(urlResult.error?.message || 'Failed to generate download URL');
      }

      // Open in new tab or trigger download
      window.open(urlResult.data, '_blank');

      toast.success(texts.downloading(title));
    } catch (error: any) {
      toast.error(error.message || texts.downloadFailed);
      console.error('Download error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      const kb = bytes / 1024;
      return `${kb.toFixed(0)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FolderOpen className="h-8 w-8" />
          {texts.title}
        </h1>
        <p className="mt-2 opacity-90">
          {texts.subtitle}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={texts.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="w-full md:w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{texts.allTypes}</SelectItem>
                  {resourceTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {language === 'ar' && type.label_ar ? type.label_ar : type.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-48">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{texts.allCategories}</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {language === 'ar' && category.label_ar ? category.label_ar : category.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Certification Filter */}
            <div className="w-full md:w-48">
              <Select value={certFilter} onValueChange={(value) => setCertFilter(value as ResourceCertType | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{texts.allCertifications}</SelectItem>
                  <SelectItem value="CP">BDA-CP™</SelectItem>
                  <SelectItem value="SCP">BDA-SCP™</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-royal-600" />
        </div>
      ) : !resources || resources.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">{texts.noResourcesFound}</p>
            <p className="text-sm text-gray-500">{texts.noResourcesFoundDesc}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => {
            const IconComponent = ICON_MAP[resource.resource_type?.icon || 'FileText'] || FileText;
            const color = resource.resource_type?.color || 'blue';

            return (
              <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 space-y-4">
                  {/* Icon */}
                  <div className="flex items-start justify-between">
                    <div className={`h-12 w-12 rounded-lg bg-${color}-100 flex items-center justify-center`}>
                      <IconComponent className={`h-6 w-6 text-${color}-600`} />
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {resource.certification_type ? (
                        <Badge variant="outline">BDA-{resource.certification_type}™</Badge>
                      ) : (
                        <Badge variant="secondary">{texts.general}</Badge>
                      )}
                      {resource.is_featured && (
                        <Badge variant="default">{texts.featured}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">
                      {language === 'ar' && resource.title_ar ? resource.title_ar : resource.title}
                    </h3>
                    {language !== 'ar' && resource.title_ar && (
                      <p className="text-sm text-gray-500 mb-1">{resource.title_ar}</p>
                    )}
                    {language === 'ar' && resource.title_ar && (
                      <p className="text-sm text-gray-500 mb-1">{resource.title}</p>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {language === 'ar' && resource.description_ar ? resource.description_ar : resource.description}
                    </p>
                  </div>

                  {/* Tags */}
                  {resource.tags && resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {resource.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {resource.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{resource.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatFileSize(resource.file_size)}</span>
                    <span>{resource.download_count || 0} {texts.downloads}</span>
                  </div>

                  {/* Action */}
                  <Button
                    className="w-full"
                    onClick={() => handleDownload(resource.id, resource.file_path, resource.title)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {texts.download}
                  </Button>

                  {/* Footer */}
                  <div className="text-xs text-gray-500 text-center pt-2 border-t">
                    {texts.updated} {formatDate(resource.updated_at)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

Resources.displayName = 'Resources';
