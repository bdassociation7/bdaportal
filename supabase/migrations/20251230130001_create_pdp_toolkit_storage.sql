-- Create storage bucket for pdp-toolkit
-- This bucket stores downloadable resources for PDP partners: logos, templates, guidelines, marketing materials

-- Create storage bucket for pdp-toolkit (public access for downloads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdp-toolkit', 'pdp-toolkit', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage.objects

-- Public read access (anyone can download toolkit items)
DROP POLICY IF EXISTS "Public can view pdp-toolkit files" ON storage.objects;
CREATE POLICY "Public can view pdp-toolkit files"
ON storage.objects FOR SELECT
USING (bucket_id = 'pdp-toolkit');

-- Admins can upload files to pdp-toolkit bucket
DROP POLICY IF EXISTS "Admins can upload pdp-toolkit files" ON storage.objects;
CREATE POLICY "Admins can upload pdp-toolkit files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'pdp-toolkit' AND
    public.is_admin()
);

-- Admins can update files in pdp-toolkit bucket
DROP POLICY IF EXISTS "Admins can update pdp-toolkit files" ON storage.objects;
CREATE POLICY "Admins can update pdp-toolkit files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pdp-toolkit' AND public.is_admin())
WITH CHECK (bucket_id = 'pdp-toolkit' AND public.is_admin());

-- Admins can delete files from pdp-toolkit bucket
DROP POLICY IF EXISTS "Admins can delete pdp-toolkit files" ON storage.objects;
CREATE POLICY "Admins can delete pdp-toolkit files"
ON storage.objects FOR DELETE
USING (bucket_id = 'pdp-toolkit' AND public.is_admin());
