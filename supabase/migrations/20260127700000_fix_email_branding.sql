-- Fix Email Branding
-- Updates all email templates with correct organization name:
-- FROM: "BDA - Business Data Analytics" / "Business Data Analytics Association"
-- TO: "The Business Development Association (BDA®)"
-- Also increases logo size from 180px to 220px

-- Update all email templates in the database
UPDATE email_templates
SET html_body = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            html_body,
            'Business Data Analytics Association',
            'The Business Development Association (BDA&reg;)'
          ),
          'BDA - Business Data Analytics',
          'The Business Development Association (BDA&reg;)'
        ),
        'The Global Authority for Business Data Analytics Certification',
        ''
      ),
      'width="180"',
      'width="220"'
    ),
    'max-width: 180px',
    'max-width: 220px'
  ),
  '© 2026 BDA Association',
  '© 2026 The Business Development Association (BDA&reg;)'
)
WHERE html_body IS NOT NULL;

-- Verify the updates
DO $$
DECLARE
  old_branding_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_branding_count
  FROM email_templates
  WHERE html_body LIKE '%Business Data Analytics%';

  IF old_branding_count > 0 THEN
    RAISE WARNING 'Still found % templates with old branding', old_branding_count;
  ELSE
    RAISE NOTICE '✅ All email templates updated with correct branding: The Business Development Association (BDA®)';
  END IF;
END $$;
