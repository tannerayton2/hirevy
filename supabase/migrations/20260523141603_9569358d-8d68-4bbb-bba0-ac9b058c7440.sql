
-- ============================================================
-- 1) Role-based admin (remove hardcoded username check)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed admin role for current admin (by username) — one-time backfill
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role
FROM public.profiles p
WHERE p.username = 'tannerayton'
ON CONFLICT DO NOTHING;

-- Replace is_admin to check roles table (keeps signature for existing callers)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(uid, 'admin');
$$;

-- ============================================================
-- 2) Hide reviewer_email from public reads (column-level revoke)
-- ============================================================
REVOKE SELECT (reviewer_email) ON public.proof_backed_reviews FROM anon, authenticated;
REVOKE SELECT (reviewer_email) ON public.unclaimed_reviews FROM anon, authenticated;

-- ============================================================
-- 3) Realtime channel authorization for thread:* topics
-- ============================================================
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "thread participants can read realtime" ON realtime.messages;
CREATE POLICY "thread participants can read realtime"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN realtime.topic() LIKE 'thread:%' THEN EXISTS (
        SELECT 1 FROM public.message_threads t
        WHERE t.id::text = substring(realtime.topic() from 8)
          AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
      )
      ELSE true
    END
  );

DROP POLICY IF EXISTS "thread participants can broadcast realtime" ON realtime.messages;
CREATE POLICY "thread participants can broadcast realtime"
  ON realtime.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    CASE
      WHEN realtime.topic() LIKE 'thread:%' THEN EXISTS (
        SELECT 1 FROM public.message_threads t
        WHERE t.id::text = substring(realtime.topic() from 8)
          AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
      )
      ELSE true
    END
  );
