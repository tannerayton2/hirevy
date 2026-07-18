-- Reviewers can read their own uploaded evidence files (files live under {auth.uid()}/…)
DROP POLICY IF EXISTS "Reviewers can read own evidence" ON storage.objects;
CREATE POLICY "Reviewers can read own evidence"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'review-evidence'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Reviewers can delete own evidence" ON storage.objects;
CREATE POLICY "Reviewers can delete own evidence"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'review-evidence'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );