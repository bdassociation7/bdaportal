-- Migration: Fix remaining "analytics" branding in email templates
-- Date: 2026-02-10
-- Description: Replace "data analytics" with "development" in 3 remaining templates

-- Fix exam_passed
UPDATE public.email_templates
SET html_body = REPLACE(html_body, 'business data analytics', 'business development'),
    updated_at = NOW()
WHERE template_key = 'exam_passed'
  AND html_body ILIKE '%business data analytics%';

-- Fix credential_id_generated
UPDATE public.email_templates
SET html_body = REPLACE(html_body, 'data analytics', 'business development'),
    updated_at = NOW()
WHERE template_key = 'credential_id_generated'
  AND html_body ILIKE '%data analytics%';

-- Fix welcome (2 occurrences)
UPDATE public.email_templates
SET html_body = REPLACE(html_body, 'business data analytics', 'business development'),
    updated_at = NOW()
WHERE template_key = 'welcome'
  AND html_body ILIKE '%business data analytics%';

DO $$
DECLARE
  remaining INT;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM public.email_templates
  WHERE html_body ILIKE '%data analytics%';

  IF remaining = 0 THEN
    RAISE NOTICE 'All "analytics" branding fixed. 0 templates remaining.';
  ELSE
    RAISE WARNING '% template(s) still contain "data analytics"', remaining;
  END IF;
END $$;
