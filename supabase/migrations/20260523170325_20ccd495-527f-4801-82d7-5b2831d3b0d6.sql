-- New columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS preferred_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS incomplete_banner_dismissed boolean NOT NULL DEFAULT false;

-- Honor signup metadata: username / display_name / role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_username TEXT := lower(coalesce(NEW.raw_user_meta_data->>'username', ''));
  meta_display  TEXT := coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
  meta_role     TEXT := lower(coalesce(NEW.raw_user_meta_data->>'role', ''));
  base TEXT;
  candidate TEXT;
  i INT := 0;
BEGIN
  IF length(meta_username) >= 3 AND meta_username ~ '^[a-z0-9_-]{3,30}$' THEN
    candidate := meta_username;
  ELSE
    base := lower(regexp_replace(coalesce(split_part(NEW.email,'@',1),'user'), '[^a-z0-9-]', '', 'g'));
    IF length(base) < 3 THEN base := 'user' || substr(NEW.id::text,1,6); END IF;
    candidate := base;
  END IF;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    i := i + 1;
    candidate := candidate || '-' || i;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name, avatar_url, role)
  VALUES (
    NEW.id,
    candidate,
    nullif(meta_display, ''),
    NEW.raw_user_meta_data->>'avatar_url',
    nullif(meta_role, '')
  );
  RETURN NEW;
END;
$$;

-- Make username immutable once a profile exists
CREATE OR REPLACE FUNCTION public.prevent_username_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    RAISE EXCEPTION 'username cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_username_immutable ON public.profiles;
CREATE TRIGGER profiles_username_immutable
BEFORE UPDATE OF username ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_username_change();