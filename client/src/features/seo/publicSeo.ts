import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/config/supabase.config';
import {
  DEFAULT_SOCIAL_IMAGE,
  resolveSeo,
  type ResolvedSeoMetadata,
  type SeoFallback,
  type SeoLanguage,
  type SeoRecord,
} from './seoMetadata';

export type { ResolvedSeoMetadata, SeoFallback, SeoLanguage, SeoRecord } from './seoMetadata';
export { resolveSeo } from './seoMetadata';

function ensureMeta(name: string, content: string, isProperty = false) {
  const attribute = isProperty ? 'property' : 'name';
  let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function ensureCanonical(url: string) {
  let element = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.href = url;
}

function ensurePageSchema(metadata: ResolvedSeoMetadata, language: SeoLanguage) {
  const id = 'public-page-seo-schema';
  let element = document.getElementById(id) as HTMLScriptElement | null;
  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': metadata.schemaType || 'WebPage',
    name: metadata.title,
    description: metadata.description,
    url: metadata.canonicalUrl,
    inLanguage: language === 'ar' ? 'ar' : 'en-GB',
  });
}

export function applySeoMetadata(metadata: ResolvedSeoMetadata, language: SeoLanguage, includeSchema = true) {
  document.title = metadata.title;
  ensureMeta('description', metadata.description);
  ensureMeta('keywords', metadata.keywords);
  ensureMeta('robots', metadata.robotsDirective);
  ensureCanonical(metadata.canonicalUrl);
  ensureMeta('og:type', 'website', true);
  ensureMeta('og:url', metadata.canonicalUrl, true);
  ensureMeta('og:title', metadata.socialTitle, true);
  ensureMeta('og:description', metadata.socialDescription, true);
  ensureMeta('og:image', metadata.socialImageUrl || DEFAULT_SOCIAL_IMAGE, true);
  ensureMeta('og:site_name', 'Business Development Association (BDA)', true);
  ensureMeta('twitter:card', 'summary_large_image');
  ensureMeta('twitter:title', metadata.socialTitle);
  ensureMeta('twitter:description', metadata.socialDescription);
  ensureMeta('twitter:image', metadata.socialImageUrl || DEFAULT_SOCIAL_IMAGE);
  if (includeSchema) ensurePageSchema(metadata, language);
}

export function usePublicPageSeo(pageKey: string | undefined, language: SeoLanguage, fallback: SeoFallback) {
  const query = useQuery({
    queryKey: ['public-seo-page', pageKey],
    enabled: Boolean(pageKey),
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('seo_page_settings')
        .select('*')
        .eq('page_key', pageKey)
        .maybeSingle();
      if (error) throw error;
      return data as SeoRecord | null;
    },
  });

  const metadata = resolveSeo(query.data, language, fallback);
  useEffect(() => {
    if (!pageKey) return;
    applySeoMetadata(metadata, language);
    return () => {
      document.getElementById('public-page-seo-schema')?.remove();
    };
  }, [pageKey, language, metadata.title, metadata.description, metadata.keywords, metadata.socialTitle, metadata.socialDescription, metadata.socialImageUrl, metadata.canonicalUrl, metadata.robotsDirective, metadata.schemaType]);

  return { ...query, metadata };
}
