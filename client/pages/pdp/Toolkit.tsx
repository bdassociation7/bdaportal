/**
 * PDP Partner Toolkit
 *
 * Downloadable resources: logos, templates, guidelines, marketing materials
 * Uses database-backed pdp_toolkit_items table
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  Image,
  FileText,
  BookOpen,
  Megaphone,
  Share2,
  ExternalLink,
  AlertCircle,
  Package,
} from "lucide-react";
import { usePDPToolkit } from "@/entities/pdp/pdp.hooks";
import type { ToolkitCategory, PDPToolkitItem } from "@/entities/pdp/pdp.types";
import { useLanguage } from "@/contexts/LanguageContext";

// =============================================================================
// Translations
// =============================================================================
const translations = {
  en: {
    pageTitle: "Partner Toolkit",
    pageDescription: "Download resources for your PDP partnership",
    resources: "Resources",
    resourcesAvailable: "{count} resource{plural} available for download",
    noResourcesTitle: "No Resources Available",
    noResourcesDesc: "Toolkit resources will be available once uploaded by BDA administration. Check back later or contact support for assistance.",
    noItemsInCategory: "No items available in this category",
    download: "Download",
    failedToLoad: "Failed to load toolkit items. Please try again later.",
    brandGuidelinesTitle: "Brand Usage Guidelines",
    guideline1: "Always use official logos and badges from this toolkit",
    guideline2: "Do not modify, distort, or alter the logos in any way",
    guideline3: "Maintain proper clear space around logos as specified in brand guidelines",
    guideline4: "Use approved color combinations and fonts for marketing materials",
    guideline5: "Contact BDA before creating derivative marketing materials",
    viewFullGuidelines: "View Full Guidelines",
    // Category labels
    catLogos: "Logos & Badges",
    catTemplates: "Templates",
    catGuidelines: "Guidelines",
    catMarketing: "Marketing Materials",
    catSocialMedia: "Social Media",
    // File type labels
    fileTypePdf: "PDF",
    fileTypeImage: "Image",
    fileTypeDocument: "Document",
    fileTypeSpreadsheet: "Spreadsheet",
    fileTypePresentation: "Presentation",
    fileTypeArchive: "Archive",
    fileTypeFile: "File",
  },
  ar: {
    pageTitle: "حقيبة أدوات الشريك",
    pageDescription: "تحميل الموارد لشراكة PDP الخاصة بك",
    resources: "الموارد",
    resourcesAvailable: "{count} مورد{plural} متاح للتحميل",
    noResourcesTitle: "لا توجد موارد متاحة",
    noResourcesDesc: "ستكون موارد حقيبة الأدوات متاحة بمجرد رفعها من قبل إدارة BDA. تحقق لاحقاً أو اتصل بالدعم للمساعدة.",
    noItemsInCategory: "لا توجد عناصر متاحة في هذه الفئة",
    download: "تحميل",
    failedToLoad: "فشل في تحميل عناصر حقيبة الأدوات. يرجى المحاولة مرة أخرى لاحقاً.",
    brandGuidelinesTitle: "إرشادات استخدام العلامة التجارية",
    guideline1: "استخدم دائماً الشعارات والشارات الرسمية من حقيبة الأدوات هذه",
    guideline2: "لا تقم بتعديل أو تشويه أو تغيير الشعارات بأي شكل من الأشكال",
    guideline3: "حافظ على المساحة الفارغة المناسبة حول الشعارات كما هو محدد في إرشادات العلامة التجارية",
    guideline4: "استخدم مجموعات الألوان والخطوط المعتمدة للمواد التسويقية",
    guideline5: "اتصل بـ BDA قبل إنشاء مواد تسويقية مشتقة",
    viewFullGuidelines: "عرض الإرشادات الكاملة",
    // Category labels
    catLogos: "الشعارات والشارات",
    catTemplates: "القوالب",
    catGuidelines: "الإرشادات",
    catMarketing: "المواد التسويقية",
    catSocialMedia: "وسائل التواصل الاجتماعي",
    // File type labels
    fileTypePdf: "PDF",
    fileTypeImage: "صورة",
    fileTypeDocument: "مستند",
    fileTypeSpreadsheet: "جدول بيانات",
    fileTypePresentation: "عرض تقديمي",
    fileTypeArchive: "أرشيف",
    fileTypeFile: "ملف",
  },
};

// Helper to get category config with translations
const getCategoryConfig = (texts: typeof translations.en): Record<ToolkitCategory, { label: string; icon: React.ElementType; color: string }> => ({
  logos: { label: texts.catLogos, icon: Image, color: "text-blue-600 bg-blue-100" },
  templates: { label: texts.catTemplates, icon: FileText, color: "text-green-600 bg-green-100" },
  guidelines: { label: texts.catGuidelines, icon: BookOpen, color: "text-purple-600 bg-purple-100" },
  marketing: { label: texts.catMarketing, icon: Megaphone, color: "text-orange-600 bg-orange-100" },
  social_media: { label: texts.catSocialMedia, icon: Share2, color: "text-pink-600 bg-pink-100" },
});

// Helper to get file type label with translations
const getFileTypeLabel = (fileType: string | undefined, texts: typeof translations.en) => {
  if (!fileType) return texts.fileTypeFile;
  const type = fileType.toLowerCase();
  if (type.includes("pdf")) return texts.fileTypePdf;
  if (type.includes("png") || type.includes("jpg") || type.includes("jpeg") || type.includes("svg")) return texts.fileTypeImage;
  if (type.includes("doc")) return texts.fileTypeDocument;
  if (type.includes("xls")) return texts.fileTypeSpreadsheet;
  if (type.includes("ppt")) return texts.fileTypePresentation;
  if (type.includes("zip") || type.includes("rar")) return texts.fileTypeArchive;
  return texts.fileTypeFile;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface ToolkitItemCardProps {
  item: PDPToolkitItem;
  texts: typeof translations.en;
  isRTL: boolean;
  categoryConfig: Record<ToolkitCategory, { label: string; icon: React.ElementType; color: string }>;
}

function ToolkitItemCard({ item, texts, isRTL, categoryConfig }: ToolkitItemCardProps) {
  const config = categoryConfig[item.category];
  const Icon = config?.icon || FileText;

  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors ${isRTL ? "flex-row-reverse" : ""}`}>
      <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className={`p-3 rounded-lg ${config?.color || 'bg-gray-100 text-gray-600'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className={isRTL ? "text-right" : ""}>
          <h4 className="font-medium text-gray-900">{item.title}</h4>
          {item.description && (
            <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
          )}
          <div className={`flex items-center gap-2 mt-1 ${isRTL ? "flex-row-reverse justify-end" : ""}`}>
            <Badge variant="outline" className="text-xs">
              {getFileTypeLabel(item.file_type, texts)}
            </Badge>
            {item.file_size && (
              <span className="text-xs text-gray-400">{formatFileSize(item.file_size)}</span>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(item.file_url, "_blank")}
      >
        <Download className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
        {texts.download}
      </Button>
    </div>
  );
}

interface CategorySectionProps {
  category: ToolkitCategory;
  items: PDPToolkitItem[];
  texts: typeof translations.en;
  isRTL: boolean;
  categoryConfig: Record<ToolkitCategory, { label: string; icon: React.ElementType; color: string }>;
}

function CategorySection({ category, items, texts, isRTL, categoryConfig }: CategorySectionProps) {
  const config = categoryConfig[category];
  const Icon = config?.icon || FileText;

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Icon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>{texts.noItemsInCategory}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ToolkitItemCard key={item.id} item={item} texts={texts} isRTL={isRTL} categoryConfig={categoryConfig} />
      ))}
    </div>
  );
}

export default function PDPToolkit() {
  const [activeTab, setActiveTab] = useState<ToolkitCategory>("logos");
  const { data: items, isLoading, error } = usePDPToolkit();
  const { language } = useLanguage();
  const texts = translations[language];
  const isRTL = language === "ar";
  const categoryConfig = getCategoryConfig(texts);

  // Group items by category
  const itemsByCategory = items?.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<ToolkitCategory, PDPToolkitItem[]>) || {};

  // Count items per category
  const categoryCounts = Object.entries(categoryConfig).reduce((acc, [key]) => {
    acc[key as ToolkitCategory] = itemsByCategory[key as ToolkitCategory]?.length || 0;
    return acc;
  }, {} as Record<ToolkitCategory, number>);

  if (isLoading) {
    return (
      <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className={isRTL ? "text-right" : ""}>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-5 gap-4">
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
      <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-2xl font-bold text-gray-900">{texts.pageTitle}</h1>
          <p className="text-gray-600 mt-1">
            {texts.pageDescription}
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {texts.failedToLoad}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalItems = items?.length || 0;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className={isRTL ? "text-right" : ""}>
        <h1 className="text-2xl font-bold text-gray-900">{texts.pageTitle}</h1>
        <p className="text-gray-600 mt-1">
          {texts.pageDescription}
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-5 gap-4">
        {(Object.entries(categoryConfig) as [ToolkitCategory, typeof categoryConfig[ToolkitCategory]][]).map(
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
                <CardContent className="pt-4 text-center">
                  <div className={`p-2 rounded-lg inline-block ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="font-medium mt-2 text-sm">{config.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
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
          <CardHeader className={isRTL ? "text-right" : ""}>
            <CardTitle>{texts.resources}</CardTitle>
            <CardDescription>
              {texts.resourcesAvailable
                .replace("{count}", String(totalItems))
                .replace("{plural}", totalItems !== 1 ? "s" : "")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ToolkitCategory)}>
              <TabsList className="grid w-full grid-cols-5">
                {(Object.entries(categoryConfig) as [ToolkitCategory, typeof categoryConfig[ToolkitCategory]][]).map(
                  ([category, config]) => (
                    <TabsTrigger key={category} value={category} className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <config.icon className="h-4 w-4" />
                      <span className="hidden md:inline">{config.label}</span>
                      {categoryCounts[category] > 0 && (
                        <Badge variant="secondary" className={isRTL ? "mr-1" : "ml-1"}>
                          {categoryCounts[category]}
                        </Badge>
                      )}
                    </TabsTrigger>
                  )
                )}
              </TabsList>

              {(Object.keys(categoryConfig) as ToolkitCategory[]).map((category) => (
                <TabsContent key={category} value={category} className="mt-6">
                  <CategorySection
                    category={category}
                    items={itemsByCategory[category] || []}
                    texts={texts}
                    isRTL={isRTL}
                    categoryConfig={categoryConfig}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Usage Guidelines */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className={isRTL ? "text-right" : ""}>
          <CardTitle className={`flex items-center gap-2 text-blue-900 ${isRTL ? "flex-row-reverse" : ""}`}>
            <BookOpen className="h-5 w-5" />
            {texts.brandGuidelinesTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <ul className={`space-y-2 text-sm ${isRTL ? "text-right" : ""}`}>
            <li className={`flex items-start gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <span className="text-blue-600">•</span>
              {texts.guideline1}
            </li>
            <li className={`flex items-start gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <span className="text-blue-600">•</span>
              {texts.guideline2}
            </li>
            <li className={`flex items-start gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <span className="text-blue-600">•</span>
              {texts.guideline3}
            </li>
            <li className={`flex items-start gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <span className="text-blue-600">•</span>
              {texts.guideline4}
            </li>
            <li className={`flex items-start gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <span className="text-blue-600">•</span>
              {texts.guideline5}
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
