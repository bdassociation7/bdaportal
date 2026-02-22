-- Create storage bucket for partner-logos
-- This bucket stores organization logos uploaded by PDP partners

-- Create storage bucket for partner-logos (public access for display)
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-logos', 'partner-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage.objects

-- Public read access (logos are displayed publicly on partner pages)
DROP POLICY IF EXISTS "Public can view partner logos" ON storage.objects;
CREATE POLICY "Public can view partner logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'partner-logos');

-- Partners can upload their own logo
DROP POLICY IF EXISTS "Partners can upload own logo" ON storage.objects;
CREATE POLICY "Partners can upload own logo"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'partner-logos' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Partners can update their own logo
DROP POLICY IF EXISTS "Partners can update own logo" ON storage.objects;
CREATE POLICY "Partners can update own logo"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'partner-logos' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'partner-logos' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Partners can delete their own logo
DROP POLICY IF EXISTS "Partners can delete own logo" ON storage.objects;
CREATE POLICY "Partners can delete own logo"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'partner-logos' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can manage all logos
DROP POLICY IF EXISTS "Admins can manage all partner logos" ON storage.objects;
CREATE POLICY "Admins can manage all partner logos"
ON storage.objects FOR ALL
USING (bucket_id = 'partner-logos' AND public.is_admin())
WITH CHECK (bucket_id = 'partner-logos' AND public.is_admin());
