-- Drop the body length check (voice/image-only messages have empty body)
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_body_check;

-- Drop soft-delete column (delete feature removed)
ALTER TABLE public.messages DROP COLUMN IF EXISTS deleted_at;

-- Add reply threading + voice duration
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS voice_duration_ms integer;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_id);

-- Reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read reactions"
ON public.message_reactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.messages m
  JOIN public.message_threads t ON t.id = m.thread_id
  WHERE m.id = message_reactions.message_id
    AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
));

CREATE POLICY "Users can add their own reactions"
ON public.message_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.message_threads t ON t.id = m.thread_id
    WHERE m.id = message_reactions.message_id
      AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
  )
);

CREATE POLICY "Users can remove their own reactions"
ON public.message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;