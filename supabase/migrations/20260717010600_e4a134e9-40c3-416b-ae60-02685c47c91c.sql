
CREATE OR REPLACE FUNCTION public.update_my_username(p_new_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  me uuid := auth.uid();
  clean text;
  current_username text;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  clean := lower(trim(coalesce(p_new_username, '')));
  IF length(clean) < 3 OR length(clean) > 30 OR clean !~ '^[a-z0-9_-]+$' THEN
    RAISE EXCEPTION 'Username must be 3–30 characters, lowercase letters, numbers, underscores, or hyphens.';
  END IF;

  SELECT username INTO current_username FROM public.profiles WHERE id = me;
  IF current_username IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
  IF clean = current_username THEN
    RETURN clean;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = clean) THEN
    RAISE EXCEPTION 'That username is already taken.' USING ERRCODE = 'unique_violation';
  END IF;

  -- Bypass prevent_username_change trigger for this owner-initiated rename
  ALTER TABLE public.profiles DISABLE TRIGGER USER;
  UPDATE public.profiles
     SET username = clean, updated_at = now()
   WHERE id = me;
  ALTER TABLE public.profiles ENABLE TRIGGER USER;

  RETURN clean;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_username(text) TO authenticated;
