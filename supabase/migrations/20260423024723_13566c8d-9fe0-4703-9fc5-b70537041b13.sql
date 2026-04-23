-- Make imported-testimonial-sources bucket public so anyone can view imported testimonial photos
UPDATE storage.buckets SET public = true WHERE id = 'imported-testimonial-sources';

-- Add explicit public read policy on storage.objects for this bucket (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read for imported-testimonial-sources'
  ) THEN
    CREATE POLICY "Public read for imported-testimonial-sources"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'imported-testimonial-sources');
  END IF;
END $$;