-- Add badge_url field to pdp_partner_profiles for custom partner badges
ALTER TABLE public.pdp_partner_profiles
ADD COLUMN IF NOT EXISTS badge_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.pdp_partner_profiles.badge_url IS 'URL to custom partner badge image';
