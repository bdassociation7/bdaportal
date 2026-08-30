-- Public SEO management for the BDA portal.
-- These records contain publication metadata only; they do not grant access to any portal data.

CREATE TABLE IF NOT EXISTS public.seo_page_settings (
  page_key text PRIMARY KEY,
  page_label text NOT NULL,
  route_pattern text NOT NULL,
  title_en text,
  description_en text,
  keywords_en text,
  social_title_en text,
  social_description_en text,
  title_ar text,
  description_ar text,
  keywords_ar text,
  social_title_ar text,
  social_description_ar text,
  social_image_url text,
  canonical_url text,
  robots_directive text NOT NULL DEFAULT 'index, follow'
    CHECK (robots_directive IN ('index, follow', 'noindex, follow')),
  schema_type text NOT NULL DEFAULT 'WebPage'
    CHECK (schema_type IN ('WebPage', 'CollectionPage', 'Organization', 'Course')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.seo_program_overrides (
  program_id uuid PRIMARY KEY REFERENCES public.pdp_programs(id) ON DELETE CASCADE,
  title_en text,
  description_en text,
  keywords_en text,
  social_title_en text,
  social_description_en text,
  title_ar text,
  description_ar text,
  keywords_ar text,
  social_title_ar text,
  social_description_ar text,
  social_image_url text,
  canonical_url text,
  robots_directive text NOT NULL DEFAULT 'index, follow'
    CHECK (robots_directive IN ('index, follow', 'noindex, follow')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE public.seo_page_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_program_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public may read published SEO page settings" ON public.seo_page_settings;
CREATE POLICY "Public may read published SEO page settings"
ON public.seo_page_settings
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Super admins manage SEO page settings" ON public.seo_page_settings;
CREATE POLICY "Super admins manage SEO page settings"
ON public.seo_page_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
  )
);

DROP POLICY IF EXISTS "Public may read programme SEO overrides" ON public.seo_program_overrides;
CREATE POLICY "Public may read programme SEO overrides"
ON public.seo_program_overrides
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Super admins manage programme SEO overrides" ON public.seo_program_overrides;
CREATE POLICY "Super admins manage programme SEO overrides"
ON public.seo_program_overrides
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
  )
);

CREATE OR REPLACE FUNCTION public.set_seo_record_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF auth.uid() IS NOT NULL THEN
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_seo_page_settings_audit_fields ON public.seo_page_settings;
CREATE TRIGGER set_seo_page_settings_audit_fields
BEFORE UPDATE ON public.seo_page_settings
FOR EACH ROW EXECUTE FUNCTION public.set_seo_record_audit_fields();

DROP TRIGGER IF EXISTS set_seo_program_overrides_audit_fields ON public.seo_program_overrides;
CREATE TRIGGER set_seo_program_overrides_audit_fields
BEFORE INSERT OR UPDATE ON public.seo_program_overrides
FOR EACH ROW EXECUTE FUNCTION public.set_seo_record_audit_fields();

INSERT INTO public.seo_page_settings (
  page_key, page_label, route_pattern, title_en, description_en, keywords_en,
  social_title_en, social_description_en, canonical_url, robots_directive, schema_type
) VALUES
  (
    'portal-home',
    'Portal Home',
    '/',
    'BDA Certification Portal | Business Development Association',
    'Access BDA professional certification, learning, credentials, and professional development services.',
    'BDA, Business Development Association, business development certification, BDA-CP, BDA-SCP',
    'BDA Certification Portal | Business Development Association',
    'Access BDA professional certification, learning, credentials, and professional development services.',
    'https://portal.bda-global.org/',
    'index, follow',
    'Organization'
  ),
  (
    'public-programmes',
    'Accredited Programmes Directory',
    '/public/programs',
    'BDA Approved Programmes | Accredited Professional Development Programmes',
    'Explore BDA-approved professional development programmes and accredited learning activities.',
    'BDA approved programmes, accredited programmes, professional development, PDC credits',
    'BDA Approved Programmes',
    'Explore BDA-approved professional development programmes and accredited learning activities.',
    'https://portal.bda-global.org/public/programs',
    'index, follow',
    'CollectionPage'
  ),
  (
    'public-providers',
    'BDA Partners Directory',
    '/public/providers',
    'BDA Partners Directory | PDP and ECP Partners Worldwide',
    'Find BDA Education and Certification Partners and Professional Development Partners worldwide.',
    'BDA partners, ECP partners, PDP partners, business development training providers',
    'BDA Partners Directory',
    'Find BDA Education and Certification Partners and Professional Development Partners worldwide.',
    'https://portal.bda-global.org/public/providers',
    'index, follow',
    'CollectionPage'
  ),
  (
    'credential-verification',
    'Credential Verification',
    '/verify',
    'Verify BDA Certification | Credential Verification',
    'Verify BDA professional certification credentials through the official Business Development Association directory.',
    'verify BDA certification, BDA credential verification, certified business development professional',
    'Verify BDA Certification',
    'Verify BDA professional certification credentials through the official Business Development Association directory.',
    'https://portal.bda-global.org/verify',
    'index, follow',
    'WebPage'
  ),
  (
    'programme-detail-default',
    'Programme Detail Defaults',
    '/public/programs/:slug',
    'BDA Accredited Programme',
    'Learn about this BDA-accredited professional development programme.',
    'BDA, accredited programme, PDC, professional development, certification',
    'BDA Accredited Programme',
    'Learn about this BDA-accredited professional development programme.',
    NULL,
    'index, follow',
    'Course'
  )
ON CONFLICT (page_key) DO NOTHING;

GRANT SELECT ON public.seo_page_settings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_page_settings TO authenticated;
GRANT SELECT ON public.seo_program_overrides TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_program_overrides TO authenticated;
