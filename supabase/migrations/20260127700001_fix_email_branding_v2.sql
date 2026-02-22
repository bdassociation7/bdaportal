-- Fix Email Branding v2 - Additional variations
-- Catches remaining patterns

-- Fix variations with different surrounding text
UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  'BDA - Business Data Analytics<br>The Global Authority for Business Data Analytics Certification',
  'The Business Development Association (BDA&reg;)'
)
WHERE html_body LIKE '%BDA - Business Data Analytics%';

-- Fix standalone "BDA - Business Data Analytics" with line break
UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  'BDA - Business Data Analytics<br>',
  'The Business Development Association (BDA&reg;)<br>'
)
WHERE html_body LIKE '%BDA - Business Data Analytics<br>%';

-- Fix any remaining "Business Data Analytics" standalone
UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  '>BDA - Business Data Analytics<',
  '>The Business Development Association (BDA&reg;)<'
)
WHERE html_body LIKE '%>BDA - Business Data Analytics<%';

-- Fix copyright line variations
UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  'BDA Association. All rights reserved',
  'The Business Development Association (BDA&reg;). All rights reserved'
)
WHERE html_body LIKE '%BDA Association. All rights reserved%';

-- Fix footer text between <p> tags
UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  '>BDA - Business Data Analytics</p>',
  '>The Business Development Association (BDA&reg;)</p>'
)
WHERE html_body LIKE '%>BDA - Business Data Analytics</p>%';

-- Fix any remaining with The Global Authority text
UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  '<p style="margin: 0; font-size: 12px; color: #6b7280;">The Global Authority for Business Data Analytics Certification</p>',
  ''
)
WHERE html_body LIKE '%Global Authority for Business Data Analytics%';

-- Also try without specific styling
UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  'The Global Authority for Business Data Analytics Certification',
  ''
)
WHERE html_body LIKE '%Global Authority for Business Data Analytics%';

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
    RAISE NOTICE '✅ All email templates updated with correct branding: The Business Development Association (BDA®)';
  END IF;
END $$;
