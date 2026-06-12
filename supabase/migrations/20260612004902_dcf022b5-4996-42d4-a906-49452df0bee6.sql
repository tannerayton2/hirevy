
-- 1. Column-level revoke of reviewer_email from anon/authenticated
REVOKE SELECT (reviewer_email) ON public.reviews FROM anon, authenticated;
REVOKE SELECT (reviewer_email) ON public.unclaimed_reviews FROM anon, authenticated;
REVOKE SELECT (reviewer_email) ON public.proof_backed_reviews FROM anon, authenticated;

-- 2. Realtime read policy: deny non-thread topics by default
DROP POLICY IF EXISTS "thread participants can read realtime" ON realtime.messages;
CREATE POLICY "thread participants can read realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN realtime.topic() LIKE 'thread:%' THEN EXISTS (
        SELECT 1 FROM public.message_threads t
        WHERE t.id::text = substring(realtime.topic() FROM 8)
          AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
      )
      ELSE false
    END
  );

-- Also lock down broadcast on non-thread topics
DROP POLICY IF EXISTS "thread participants can broadcast realtime" ON realtime.messages;
CREATE POLICY "thread participants can broadcast realtime"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    CASE
      WHEN realtime.topic() LIKE 'thread:%' THEN EXISTS (
        SELECT 1 FROM public.message_threads t
        WHERE t.id::text = substring(realtime.topic() FROM 8)
          AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
      )
      ELSE false
    END
  );

-- 3. Require authentication for review-evidence uploads, scoped to the uploader's folder
DROP POLICY IF EXISTS "Anyone can upload review evidence" ON storage.objects;
CREATE POLICY "Authenticated users can upload review evidence"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'review-evidence'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
