-- 1. Backfill bio from old fields (labeled, preserve existing bio first)
UPDATE public.profiles
SET bio = TRIM(BOTH E'\n' FROM
  COALESCE(NULLIF(bio, ''), '') ||
  CASE WHEN COALESCE(bio,'') <> '' AND (about_what IS NOT NULL OR about_who IS NOT NULL OR about_results IS NOT NULL) THEN E'\n\n' ELSE '' END ||
  CASE WHEN about_what IS NOT NULL AND about_what <> '' THEN 'What I do:' || E'\n' || about_what ELSE '' END ||
  CASE WHEN about_what IS NOT NULL AND about_what <> '' AND (about_who IS NOT NULL AND about_who <> '' OR about_results IS NOT NULL AND about_results <> '') THEN E'\n\n' ELSE '' END ||
  CASE WHEN about_who IS NOT NULL AND about_who <> '' THEN 'Who it''s for:' || E'\n' || about_who ELSE '' END ||
  CASE WHEN about_who IS NOT NULL AND about_who <> '' AND about_results IS NOT NULL AND about_results <> '' THEN E'\n\n' ELSE '' END ||
  CASE WHEN about_results IS NOT NULL AND about_results <> '' THEN 'Results:' || E'\n' || about_results ELSE '' END
)
WHERE about_what IS NOT NULL OR about_who IS NOT NULL OR about_results IS NOT NULL;

-- 2. Drop old columns
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS about_what,
  DROP COLUMN IF EXISTS about_who,
  DROP COLUMN IF EXISTS about_results;

-- 3. Messages: attachments + soft delete
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Allow empty body when attachment present
ALTER TABLE public.messages ALTER COLUMN body DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN body SET DEFAULT '';

-- Allow sender to soft-delete their own message
DROP POLICY IF EXISTS "Sender can delete (soft) their own messages" ON public.messages;
CREATE POLICY "Sender can delete (soft) their own messages"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- 4. message_reads table for read receipts
CREATE TABLE IF NOT EXISTS public.message_reads (
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL,
  last_read_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read read-markers"
ON public.message_reads FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.message_threads t
  WHERE t.id = message_reads.thread_id
    AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
));

CREATE POLICY "User can upsert their own read marker"
ON public.message_reads FOR INSERT
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.message_threads t
  WHERE t.id = message_reads.thread_id
    AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
));

CREATE POLICY "User can update their own read marker"
ON public.message_reads FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;
ALTER TABLE public.message_reads REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 5. Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('message-attachments', 'message-attachments', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Message attachments are publicly viewable" ON storage.objects;
CREATE POLICY "Message attachments are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Authed users can upload message attachments to own folder" ON storage.objects;
CREATE POLICY "Authed users can upload message attachments to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Owner can delete own message attachments" ON storage.objects;
CREATE POLICY "Owner can delete own message attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);