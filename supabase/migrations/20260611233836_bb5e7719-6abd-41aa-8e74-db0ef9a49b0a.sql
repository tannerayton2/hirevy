ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider_type text CHECK (provider_type IN ('coach','service_provider'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta_username TEXT := lower(coalesce(NEW.raw_user_meta_data->>'username', ''));
  meta_display  TEXT := coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
  meta_role     TEXT := lower(coalesce(NEW.raw_user_meta_data->>'role', ''));
  meta_ptype    TEXT := lower(coalesce(NEW.raw_user_meta_data->>'provider_type', ''));
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

  INSERT INTO public.profiles (id, username, display_name, avatar_url, role, provider_type)
  VALUES (
    NEW.id,
    candidate,
    nullif(meta_display, ''),
    NEW.raw_user_meta_data->>'avatar_url',
    nullif(meta_role, ''),
    CASE WHEN meta_ptype IN ('coach','service_provider') THEN meta_ptype ELSE NULL END
  );
  RETURN NEW;
END;
$function$;