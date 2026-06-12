
-- Remove broad listing on review-evidence (bucket is being made private)
DROP POLICY IF EXISTS "Public read review evidence" ON storage.objects;

-- Allow message-thread participants to read attachments (needed to create signed URLs)
DROP POLICY IF EXISTS "Thread participants can read message attachments" ON storage.objects;
CREATE POLICY "Thread participants can read message attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id::text = (storage.foldername(name))[2]
        AND (mt.user_a = auth.uid() OR mt.user_b = auth.uid())
    )
  );
