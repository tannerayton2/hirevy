-- Replace broad SELECT with no listing policy.
-- Public URLs still work because /storage/v1/object/public/... uses the service role internally,
-- it does not require a SELECT policy on storage.objects.
DROP POLICY IF EXISTS "Message attachments are publicly viewable" ON storage.objects;

-- Owners can list/inspect their own folder (useful for cleanup, optional).
CREATE POLICY "Owners can list their own message attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);