/**
 * ECP Promotional Toolkit
 *
 * Download logos, templates, and guidelines for marketing
 * Uses database-backed ecp_toolkit_items table
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Download,
  Image,
  FileText,
  Share2,
  AlertTriangle,
  Palette,
  Layout,
  Copy,
  Package,
  Megaphone,
  BookOpen,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useECPToolkit } from "@/entities/ecp/ecp.hooks";
import type { ECPToolkitCategory, ECPToolkitItem } from "@/entities/ecp/ecp.types";
import { useLanguage } from "@/contexts/LanguageContext";

// ============================================================================
// Translations
// ============================================================================

const translations = {
  en: {
    // Page header
    pageTitle: 'Promotional Toolkit',
    pageSubtitle: 'Download official logos, templates, and guidelines for marketing your ECP partnership',
    // Category labels
    catLogos: 'Logos',
    catTemplates: 'Templates',
    catGuidelines: 'Guidelines',
    catMarketing: 'Marketing',
    catSocialMedia: 'Social Media',
    // File types
    fileTypeFile: 'File',
    fileTypePDF: 'PDF',
    fileTypeImage: 'Image',
    fileTypeSVG: 'SVG',
    fileTypePPTX: 'PPTX',
    fileTypeDocument: 'Document',
    fileTypeSpreadsheet: 'Spreadsheet',
    fileTypeArchive: 'Archive',
    fileTypeHTML: 'HTML',
    // Actions
    download: 'Download',
    copyLink: 'Copy Link',
    // Toast messages
    downloadStarted: 'Download Started',
    downloadingFile: (title: string) => `Downloading ${title}...`,
    linkCopied: 'Link Copied',
    linkCopiedDesc: 'Download link copied to clipboard',
    // Loading & Error
    error: 'Error',
    errorLoadingToolkit: 'Failed to load toolkit items. Please try again later.',
    // Usage guidelines
    brandUsageTitle: 'Brand Usage Guidelines',
    brandUsageDesc: 'Please review the brand guidelines before using any materials. Improper use of BDA branding may result in partnership suspension.',
    // Empty states
    noItemsInCategory: 'No items available in this category',
    noResourcesTitle: 'No Resources Available',
    noResourcesDesc: 'Toolkit resources will be available once uploaded by BDA administration. Check back later or contact support for assistance.',
    // Resources card
    resourcesTitle: 'Resources',
    resourcesCount: (count: number) => `${count} resource${count !== 1 ? 's' : ''} available for download`,
    // Brand colors
    brandColorsTitle: 'Brand Colors',
    brandColorsDesc: 'Official BDA brand color palette',
    navyBlue: 'Navy Blue',
    royalBlue: 'Royal Blue',
    skyBlue: 'Sky Blue',
    green: 'Green',
    gray: 'Gray',
  },
  ar: {
    // Page header
    pageTitle: 'مجموعة أدوات الترويج',
    pageSubtitle: 'تحميل الشعارات والقوالب والإرشادات الرسمية لتسويق شراكة ECP الخاصة بك',
    // Category labels
    catLogos: 'الشعارات',
    catTemplates: 'القوالب',
    catGuidelines: 'الإرشادات',
    catMarketing: 'التسويق',
    catSocialMedia: 'وسائل التواصل',
    // File types
    fileTypeFile: 'ملف',
    fileTypePDF: 'PDF',
    fileTypeImage: 'صورة',
    fileTypeSVG: 'SVG',
    fileTypePPTX: 'PPTX',
    fileTypeDocument: 'مستند',
    fileTypeSpreadsheet: 'جدول بيانات',
    fileTypeArchive: 'أرشيف',
    fileTypeHTML: 'HTML',
    // Actions
    download: 'تحميل',
    copyLink: 'نسخ الرابط',
    // Toast messages
    downloadStarted: 'بدأ التحميل',
    downloadingFile: (title: string) => `جارٍ تحميل ${title}...`,
    linkCopied: 'تم نسخ الرابط',
    linkCopiedDesc: 'تم نسخ رابط التحميل إلى الحافظة',
    // Loading & Error
    error: 'خطأ',
    errorLoadingToolkit: 'فشل تحميل عناصر مجموعة الأدوات. يرجى المحاولة مرة أخرى لاحقاً.',
    // Usage guidelines
    brandUsageTitle: 'إرشادات استخدام العلامة التجارية',
    brandUsageDesc: 'يرجى مراجعة إرشادات العلامة التجارية قبل استخدام أي مواد. قد يؤدي الاستخدام غير الصحيح لعلامة BDA التجارية إلى تعليق الشراكة.',
    // Empty states
    noItemsInCategory: 'لا توجد عناصر متاحة في هذه الفئة',
    noResourcesTitle: 'لا توجد موارد متاحة',
    noResourcesDesc: 'ستتوفر موارد مجموعة الأدوات بمجرد رفعها من قبل إدارة BDA. تحقق لاحقاً أو تواصل مع الدعم للمساعدة.',
    // Resources card
    resourcesTitle: 'الموارد',
    resourcesCount: (count: number) => `${count} مورد متاح للتحميل`,
    // Brand colors
    brandColorsTitle: 'ألوان العلامة التجارية',
    brandColorsDesc: 'لوحة ألوان علامة BDA التجارية الرسمية',
    navyBlue: 'أزرق داكن',
    royalBlue: 'أزرق ملكي',
    skyBlue: 'أزرق سماوي',
    green: 'أخضر',
    gray: 'رمادي',
  },
};

const categoryConfig: Record<ECPToolkitCategory, { icon: React.ElementType; color: string; hoverBorder: string }> = {
  logos: { icon: Image, color: "bg-blue-100 text-blue-600", hoverBorder: "hover:border-blue-300" },
  templates: { icon: Layout, color: "bg-purple-100 text-purple-600", hoverBorder: "hover:border-purple-300" },
  guidelines: { icon: BookOpen, color: "bg-green-100 text-green-600", hoverBorder: "hover:border-green-300" },
  marketing: { icon: Megaphone, color: "bg-orange-100 text-orange-600", hoverBorder: "hover:border-orange-300" },
  social_media: { icon: Share2, color: "bg-pink-100 text-pink-600", hoverBorder: "hover:border-pink-300" },
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileTypeLabel = (fileType: string | undefined, texts: typeof translations.en) => {
  if (!fileType) return texts.fileTypeFile;
  const type = fileType.toLowerCase();
  if (type.includes("pdf")) return texts.fileTypePDF;
  if (type.includes("png") || type.includes("jpg") || type.includes("jpeg")) return texts.fileTypeImage;
  if (type.includes("svg")) return texts.fileTypeSVG;
  if (type.includes("ppt") || type.includes("presentation")) return texts.fileTypePPTX;
  if (type.includes("doc")) return texts.fileTypeDocument;
  if (type.includes("xls") || type.includes("spreadsheet")) return texts.fileTypeSpreadsheet;
  if (type.includes("zip") || type.includes("rar")) return texts.fileTypeArchive;
  if (type.includes("html")) return texts.fileTypeHTML;
  return texts.fileTypeFile;
};

// Category label getter
const getCategoryLabel = (category: ECPToolkitCategory, texts: typeof translations.en): string => {
  const labels: Record<ECPToolkitCategory, string> = {
    logos: texts.catLogos,
    templates: texts.catTemplates,
    guidelines: texts.catGuidelines,
    marketing: texts.catMarketing,
    social_media: texts.catSocialMedia,
  };
  return labels[category];
};

function ToolkitItemCard({ item, category, language, texts }: {
  item: ECPToolkitItem;
  category: ECPToolkitCategory;
  language: 'en' | 'ar';
  texts: typeof translations.en;
}) {
  const { toast } = useToast();
  const config = categoryConfig[category];
  const Icon = config.icon;

  const handleDownload = () => {
    window.open(item.file_url, "_blank");
    toast({
      title: texts.downloadStarted,
      description: texts.downloadingFile(item.title),
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(item.file_url);
    toast({
      title: texts.linkCopied,
      description: texts.linkCopiedDesc,
    });
  };

  return (
    <div className={`border rounded-lg p-4 transition-colors ${config.hoverBorder}`}>
      <div className={`flex items-start justify-between mb-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
          <div className={`p-2 rounded-lg ${config.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{item.title}</p>
            {item.description && (
              <p className="text-sm text-gray-500">{item.description}</p>
            )}
          </div>
        </div>
      </div>
      <div className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 text-sm text-gray-500 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <Badge variant="outline" className="text-xs">
            {getFileTypeLabel(item.file_type, texts)}
          </Badge>
          {item.file_size && (
            <span>{formatFileSize(item.file_size)}</span>
          )}
        </div>
        <div className={`flex gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <Button variant="ghost" size="sm" onClick={handleCopyLink} title={texts.copyLink}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleDownload}>
            <Download className={`h-4 w-4 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
            {texts.download}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CategorySection({ category, items, language, texts }: {
  category: ECPToolkitCategory;
  items: ECPToolkitItem[];
  language: 'en' | 'ar';
  texts: typeof translations.en;
}) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Icon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>{texts.noItemsInCategory}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((item) => (
        <ToolkitItemCard key={item.id} item={item} category={category} language={language} texts={texts} />
      ))}
    </div>
  );
}

export default function ECPToolkit() {
  const { language } = useLanguage();
  const texts = translations[language];
  const [activeTab, setActiveTab] = useState<ECPToolkitCategory>("logos");
  const { data: items, isLoading, error } = useECPToolkit();

  // Group items by category
  const itemsByCategory = items?.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<ECPToolkitCategory, ECPToolkitItem[]>) || {};

  // Count items per category
  const categoryCounts = Object.entries(categoryConfig).reduce((acc, [key]) => {
    acc[key as ECPToolkitCategory] = itemsByCategory[key as ECPToolkitCategory]?.length || 0;
    return acc;
  }, {} as Record<ECPToolkitCategory, number>);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className={language === 'ar' ? 'text-right' : ''}>
          <Skeleton className={`h-8 w-48 mb-2 ${language === 'ar' ? 'mr-auto' : ''}`} />
          <Skeleton className={`h-4 w-64 ${language === 'ar' ? 'mr-auto' : ''}`} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className={language === 'ar' ? 'text-right' : ''}>
          <h1 className="text-2xl font-bold text-gray-900">{texts.pageTitle}</h1>
          <p className="text-gray-600 mt-1">
            {texts.pageSubtitle}
          </p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{texts.error}</AlertTitle>
          <AlertDescription>
            {texts.errorLoadingToolkit}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalItems = items?.length || 0;

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={language === 'ar' ? 'text-right' : ''}>
        <h1 className="text-2xl font-bold text-gray-900">{texts.pageTitle}</h1>
        <p className="text-gray-600 mt-1">
          {texts.pageSubtitle}
        </p>
      </div>

      {/* Usage Guidelines Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{texts.brandUsageTitle}</AlertTitle>
        <AlertDescription>
          {texts.brandUsageDesc}
        </AlertDescription>
      </Alert>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(Object.entries(categoryConfig) as [ECPToolkitCategory, typeof categoryConfig[ECPToolkitCategory]][]).map(
          ([category, config]) => {
            const Icon = config.icon;
            const count = categoryCounts[category];
            return (
              <Card
                key={category}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  activeTab === category ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setActiveTab(category)}
              >
                <CardContent className="p-4">
                  <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className={language === 'ar' ? 'text-right' : ''}>
                      <p className="text-sm text-gray-600">{getCategoryLabel(category, texts)}</p>
                      <p className="text-xl font-bold">{count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }
        )}
      </div>

      {totalItems === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{texts.noResourcesTitle}</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {texts.noResourcesDesc}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{texts.resourcesTitle}</CardTitle>
            <CardDescription>
              {texts.resourcesCount(totalItems)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ECPToolkitCategory)}>
              <TabsList className="grid w-full grid-cols-5">
                {(Object.entries(categoryConfig) as [ECPToolkitCategory, typeof categoryConfig[ECPToolkitCategory]][]).map(
                  ([category, config]) => (
                    <TabsTrigger key={category} value={category} className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <config.icon className="h-4 w-4" />
                      <span className="hidden md:inline">{getCategoryLabel(category as ECPToolkitCategory, texts)}</span>
                    </TabsTrigger>
                  )
                )}
              </TabsList>

              {(Object.keys(categoryConfig) as ECPToolkitCategory[]).map((category) => (
                <TabsContent key={category} value={category} className="mt-6">
                  <CategorySection
                    category={category}
                    items={itemsByCategory[category] || []}
                    language={language}
                    texts={texts}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Brand Colors Reference */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <Palette className="h-5 w-5 text-primary" />
            {texts.brandColorsTitle}
          </CardTitle>
          <CardDescription>{texts.brandColorsDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="h-20 rounded-lg bg-[#1E3A5F] mb-2" />
              <p className="text-sm font-medium">{texts.navyBlue}</p>
              <p className="text-xs text-gray-500">#1E3A5F</p>
            </div>
            <div className="text-center">
              <div className="h-20 rounded-lg bg-[#2C5282] mb-2" />
              <p className="text-sm font-medium">{texts.royalBlue}</p>
              <p className="text-xs text-gray-500">#2C5282</p>
            </div>
            <div className="text-center">
              <div className="h-20 rounded-lg bg-[#1E9BF5] mb-2" />
              <p className="text-sm font-medium">{texts.skyBlue}</p>
              <p className="text-xs text-gray-500">#1E9BF5</p>
            </div>
            <div className="text-center">
              <div className="h-20 rounded-lg bg-[#10B981] mb-2" />
              <p className="text-sm font-medium">{texts.green}</p>
              <p className="text-xs text-gray-500">#10B981</p>
            </div>
            <div className="text-center">
              <div className="h-20 rounded-lg bg-[#6B7280] mb-2" />
              <p className="text-sm font-medium">{texts.gray}</p>
              <p className="text-xs text-gray-500">#6B7280</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
