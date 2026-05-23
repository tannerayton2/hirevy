CREATE TABLE public.user_notification_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flag_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, flag_name)
);

ALTER TABLE public.user_notification_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own flags"
  ON public.user_notification_flags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flags"
  ON public.user_notification_flags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_notification_flags_user ON public.user_notification_flags(user_id);