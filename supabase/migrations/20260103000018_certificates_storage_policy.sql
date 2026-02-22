-- Migration: Add storage RLS policies for certificates bucket
-- Date: 2026-01-03
-- Description: Allow authenticated users to download their own certificates

-- Create policy for authenticated users to select (download) their certificates
-- Users can only download certificates where the filename matches their credential_id
CREATE POLICY "Users can download their own certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificates'
  AND EXISTS (
    SELECT 1 FROM public.user_certifications uc
    WHERE uc.user_id = auth.uid()
    AND uc.certificate_url = storage.objects.name
  )
);

-- Allow service role to insert/update certificates
CREATE POLICY "Service role can manage certificates"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'certificates')
WITH CHECK (bucket_id = 'certificates');

SELECT '✅ Certificates storage policies added' as status;
