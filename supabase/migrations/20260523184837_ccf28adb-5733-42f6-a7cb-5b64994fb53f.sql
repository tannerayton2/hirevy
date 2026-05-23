
-- team_messages table
CREATE TABLE public.team_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  from_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_team_messages_user_created ON public.team_messages(user_id, created_at);

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can read own team messages"
ON public.team_messages FOR SELECT
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "User can send own team messages"
ON public.team_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND (
    (from_admin = false AND user_id = auth.uid())
    OR (from_admin = true AND public.is_admin(auth.uid()))
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
ALTER TABLE public.team_messages REPLICA IDENTITY FULL;

-- profiles.is_banned
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- admin moderation updates
CREATE POLICY "Admins can update profile reports"
ON public.profile_reports FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update claim requests"
ON public.claims_requests FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- admin ban helper
CREATE OR REPLACE FUNCTION public.admin_set_banned(p_user uuid, p_banned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.profiles SET is_banned = p_banned WHERE id = p_user;
END;
$$;
