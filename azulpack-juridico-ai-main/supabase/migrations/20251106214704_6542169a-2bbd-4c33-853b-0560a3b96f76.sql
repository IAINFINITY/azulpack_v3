-- Storage policies for bucket 'arquivos' to allow authenticated uploads and public reads
-- Public read (since bucket is public)
CREATE POLICY "Arquivos public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'arquivos');

-- Users can upload to their own folder (first path segment equals auth.uid())
CREATE POLICY "Arquivos users can upload to own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'arquivos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own files
CREATE POLICY "Arquivos users can update own files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'arquivos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files
CREATE POLICY "Arquivos users can delete own files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'arquivos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);