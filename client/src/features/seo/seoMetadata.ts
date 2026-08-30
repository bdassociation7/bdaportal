export type SeoLanguage = 'en' | 'ar';

export interface SeoRecord {
  page_key?: string;
  title_en?: string | null;
  description_en?: string | null;
  keywords_en?: string | null;
  social_title_en?: string | null;
  social_description_en?: string | null;
  title_ar?: string | null;
  description_ar?: string | null;
  keywords_ar?: string | null;
  social_title_ar?: string | null;
  social_description_ar?: string | null;
  social_image_url?: string | null;
  canonical_url?: string | null;
  robots_directive?: 'index, follow' | 'noindex, follow' | null;
  schema_type?: 'WebPage' | 'CollectionPage' | 'Organization' | 'Course' | null;
}

export interface SeoFallback {
  title: string;
  description: string;
  keywords?: string;
  socialTitle?: string;
  socialDescription?: string;
  socialImageUrl?: string;
  canonicalUrl: string;
  robotsDirective?: 'index, follow' | 'noindex, follow';
  schemaType?: 'WebPage' | 'CollectionPage' | 'Organization' | 'Course';
}

export interface ResolvedSeoMetadata {
  title: string;
  description: string;
  keywords: string;
  socialTitle: string;
  socialDescription: string;
  socialImageUrl: string;
  canonicalUrl: string;
  robotsDirective: 'index, follow' | 'noindex, follow';
  schemaType: 'WebPage' | 'CollectionPage' | 'Organization' | 'Course';
}

export const DEFAULT_SOCIAL_IMAGE = 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/tafPwwNyeykiwJHy.webp';

export function resolveSeo(record: SeoRecord | null | undefined, language: SeoLanguage, fallback: SeoFallback): ResolvedSeoMetadata {
  const suffix = language === 'ar' ? 'ar' : 'en';
  const get = (field: 'title' | 'description' | 'keywords' | 'social_title' | 'social_description') => {
    const value = record?.[`${field}_${suffix}` as keyof SeoRecord];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  };

  const title = get('title') || fallback.title;
  const description = get('description') || fallback.description;
  return {
    title,
    description,
    keywords: get('keywords') || fallback.keywords || '',
    socialTitle: get('social_title') || fallback.socialTitle || title,
    socialDescription: get('social_description') || fallback.socialDescription || description,
    socialImageUrl: record?.social_image_url?.trim() || fallback.socialImageUrl || DEFAULT_SOCIAL_IMAGE,
    canonicalUrl: record?.canonical_url?.trim() || fallback.canonicalUrl,
    robotsDirective: record?.robots_directive || fallback.robotsDirective || 'index, follow',
    schemaType: record?.schema_type || fallback.schemaType || 'WebPage',
  };
}
