-- ============================================================================
-- FIX: Email Branding - Sender Name and Logo
-- ============================================================================
-- 1. Update sender name to "The Business Development Association (BDA®)"
-- 2. Update logo URL to portal-hosted version
-- ============================================================================

-- Update all email templates with correct logo URL
UPDATE public.email_templates
SET html_body = REPLACE(
    html_body,
    'https://bda-global.org/wp-content/uploads/2023/01/BDA-Logo-White.png',
    'https://portal.bda-global.org/bda-email-logo.png'
)
WHERE html_body LIKE '%bda-global.org/wp-content/uploads%';

-- Update alt text in templates
UPDATE public.email_templates
SET html_body = REPLACE(
    html_body,
    'alt="BDA Association"',
    'alt="The Business Development Association (BDA®)"'
)
WHERE html_body LIKE '%alt="BDA Association"%';

-- Update title tags
UPDATE public.email_templates
SET html_body = REPLACE(
    html_body,
    '<title>BDA Association</title>',
    '<title>The Business Development Association (BDA®)</title>'
)
WHERE html_body LIKE '%<title>BDA Association</title>%';

-- Update any remaining "BDA Association" in email text (except where it should stay)
UPDATE public.email_templates
SET html_body = REPLACE(
    html_body,
    '>BDA Association<',
    '>The Business Development Association (BDA®)<'
)
WHERE html_body LIKE '%>BDA Association<%';

SELECT '✅ Email branding updated: sender name and logo URL fixed' as status;
