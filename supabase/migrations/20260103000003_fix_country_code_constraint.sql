-- Migration: Fix Country Code Constraint
-- Date: 2026-01-03
-- Description: Updates the country_code constraint to accept phone dialing codes
-- The UI uses phone dialing codes like "+1", "+971", "+44" not ISO country codes

-- Drop the old constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS valid_country_code;

-- Add new constraint that accepts:
-- - Empty/NULL values
-- - ISO 2-letter codes (e.g., "US", "AE")
-- - Phone dialing codes (e.g., "+1", "+971", "971")
ALTER TABLE public.users ADD CONSTRAINT valid_country_code
  CHECK (
    country_code IS NULL
    OR country_code = ''
    OR country_code ~* '^[A-Z]{2}$'
    OR country_code ~* '^\+?[0-9]{1,4}$'
  );

-- Verification
SELECT '✅ Country code constraint updated to accept phone dialing codes' as status;
