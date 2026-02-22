-- Fix Email Branding v3 - Target specific templates
-- Handles: bulk_import_welcome, email_verification, password_reset, welcome, pdc_threshold_reached

-- Fix the specific footer pattern used in earlier templates
-- Pattern: BDA - Business Data Analytics followed by Global Authority text

-- Aggressive replace for any remaining "BDA - Business Data Analytics"
UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  'BDA - Business Data Analytics',
  'The Business Development Association (BDA&reg;)'
)
WHERE template_key IN ('bulk_import_welcome', 'email_verification', 'password_reset', 'welcome', 'pdc_threshold_reached')
  AND html_body LIKE '%BDA - Business Data Analytics%';

-- Remove Global Authority line if it still exists
UPDATE email_templates
SET html_body = REGEXP_REPLACE(
  html_body,
  '<p[^>]*>[^<]*Global Authority[^<]*</p>',
  '',
  'gi'
)
WHERE html_body LIKE '%Global Authority%';

-- Fix any "Business Data Analytics" that's not part of a larger phrase
UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  '>Business Data Analytics<',
  '>The Business Development Association (BDA&reg;)<'
)
WHERE html_body LIKE '%>Business Data Analytics<%';

-- Fix copyright in various formats
UPDATE email_templates
SET html_body = REGEXP_REPLACE(
  html_body,
  '© \d{4} BDA( Association)?\.? All rights reserved',
  '© 2026 The Business Development Association (BDA&reg;). All rights reserved',
  'gi'
)
WHERE html_body LIKE '%BDA%All rights reserved%';

-- Final cleanup - any remaining "Business Data Analytics" as standalone text
UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  'Business Data Analytics',
  'Business Development Association'
)
WHERE html_body LIKE '%Business Data Analytics%';

-- Verify the updates
DO $$
DECLARE
  old_branding_count INTEGER;
  template_keys TEXT;
BEGIN
  SELECT COUNT(*), string_agg(template_key, ', ') INTO old_branding_count, template_keys
  FROM email_templates
  WHERE html_body LIKE '%Business Data Analytics%'
     OR html_body LIKE '%Global Authority%';

  IF old_branding_count > 0 THEN
    RAISE WARNING 'Still found % templates with old branding: %', old_branding_count, template_keys;
  ELSE
    RAISE NOTICE '✅ All email templates updated with correct branding';
  END IF;
END $$;
