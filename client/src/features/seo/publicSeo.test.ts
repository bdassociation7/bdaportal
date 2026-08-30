import { describe, expect, it } from 'vitest';
import { resolveSeo } from './seoMetadata';

const fallback = {
  title: 'BDA Approved Programmes',
  description: 'Explore BDA-approved professional development programmes.',
  keywords: 'BDA, programmes',
  canonicalUrl: 'https://portal.bda-global.org/public/programs',
  schemaType: 'CollectionPage' as const,
};

describe('resolveSeo', () => {
  it('uses a public SEO record when values are present', () => {
    const result = resolveSeo({
      title_en: 'Custom BDA Programmes',
      description_en: 'Custom public description.',
      keywords_en: 'custom, BDA',
      social_title_en: 'Share this BDA page',
      social_description_en: 'Custom sharing description.',
      social_image_url: 'https://cdn.example.org/bda-share.jpg',
      canonical_url: 'https://portal.bda-global.org/programmes',
      robots_directive: 'noindex, follow',
      schema_type: 'CollectionPage',
    }, 'en', fallback);

    expect(result).toMatchObject({
      title: 'Custom BDA Programmes',
      description: 'Custom public description.',
      keywords: 'custom, BDA',
      socialTitle: 'Share this BDA page',
      socialDescription: 'Custom sharing description.',
      socialImageUrl: 'https://cdn.example.org/bda-share.jpg',
      canonicalUrl: 'https://portal.bda-global.org/programmes',
      robotsDirective: 'noindex, follow',
      schemaType: 'CollectionPage',
    });
  });

  it('retains safe programme defaults when an override is intentionally blank', () => {
    const result = resolveSeo({
      title_en: '   ',
      description_en: null,
      social_image_url: '',
      canonical_url: '',
    }, 'en', fallback);

    expect(result.title).toBe(fallback.title);
    expect(result.description).toBe(fallback.description);
    expect(result.canonicalUrl).toBe(fallback.canonicalUrl);
    expect(result.schemaType).toBe('CollectionPage');
  });

  it('uses Arabic metadata where it has been supplied', () => {
    const result = resolveSeo({
      title_ar: 'برامج BDA المعتمدة',
      description_ar: 'استكشف برامج التطوير المهني المعتمدة من BDA.',
      keywords_ar: 'BDA، برامج معتمدة',
      social_title_ar: 'برامج BDA',
      social_description_ar: 'تطوير مهني معتمد',
    }, 'ar', fallback);

    expect(result.title).toBe('برامج BDA المعتمدة');
    expect(result.description).toBe('استكشف برامج التطوير المهني المعتمدة من BDA.');
    expect(result.keywords).toBe('BDA، برامج معتمدة');
    expect(result.socialTitle).toBe('برامج BDA');
  });
});
