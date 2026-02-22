-- Storage policies for license-documents bucket
CREATE POLICY "Allow authenticated users to upload license documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'license-documents');

CREATE POLICY "Allow authenticated users to read license documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'license-documents');

CREATE POLICY "Allow authenticated users to delete license documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'license-documents');

CREATE POLICY "Allow authenticated users to update license documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'license-documents');
