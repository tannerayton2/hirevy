CREATE OR REPLACE FUNCTION public.prevent_username_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.allow_username_change', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    RAISE EXCEPTION 'username cannot be changed';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_my_username(p_new_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  me uuid := auth.uid();
  clean text;
  current_username text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  clean := lower(trim(coalesce(p_new_username, '')));
  IF length(clean) < 3 OR length(clean) > 30 OR clean !~ '^[a-z0-9_-]+$' THEN
    RAISE EXCEPTION 'Username must be 3–30 characters, lowercase letters, numbers, underscores, or hyphens.';
  END IF;
  SELECT username INTO current_username FROM public.profiles WHERE id = me;
  IF current_username IS NULL THEN RAISE EXCEPTION 'profile not found'; END IF;
  IF clean = current_username THEN RETURN clean; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = clean) THEN
    RAISE EXCEPTION 'That username is already taken.' USING ERRCODE = 'unique_violation';
  END IF;
  PERFORM set_config('app.allow_username_change', 'on', true);
  UPDATE public.profiles SET username = clean, updated_at = now() WHERE id = me;
  PERFORM set_config('app.allow_username_change', 'off', true);
  RETURN clean;
END;
$function$;

DROP FUNCTION IF EXISTS public.admin_update_unclaimed_profile(uuid,text,text,text,text,text,text,text,text,text,text,text);
DROP FUNCTION IF EXISTS public.admin_update_unclaimed_profile(uuid,text,text,text,text,text,text,text,text,text,text,text,text[]);

CREATE OR REPLACE FUNCTION public.admin_update_unclaimed_profile(
  p_profile_id uuid, p_username text, p_display_name text, p_service_category text, p_bio text,
  p_avatar_url text, p_website_url text, p_instagram_url text, p_twitter_url text, p_youtube_url text,
  p_linkedin_url text, p_tiktok_url text, p_keywords text[] DEFAULT NULL::text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  clean_username text;
  current_username text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id AND is_claimed = false) THEN
    RAISE EXCEPTION 'profile not found or already claimed';
  END IF;
  SELECT username INTO current_username FROM public.profiles WHERE id = p_profile_id;
  clean_username := lower(regexp_replace(coalesce(p_username,''), '[^a-z0-9-]', '', 'g'));
  IF length(clean_username) < 1 THEN RAISE EXCEPTION 'invalid username'; END IF;
  IF clean_username <> current_username AND EXISTS (SELECT 1 FROM public.profiles WHERE username = clean_username) THEN
    RAISE EXCEPTION 'username taken';
  END IF;
  IF clean_username <> current_username THEN
    PERFORM set_config('app.allow_username_change', 'on', true);
    UPDATE public.profiles SET username = clean_username WHERE id = p_profile_id;
    PERFORM set_config('app.allow_username_change', 'off', true);
  END IF;
  UPDATE public.profiles SET
    display_name     = nullif(p_display_name, ''),
    service_category = nullif(p_service_category, ''),
    bio              = nullif(p_bio, ''),
    avatar_url       = nullif(p_avatar_url, ''),
    website_url      = nullif(p_website_url, ''),
    instagram_url    = nullif(p_instagram_url, ''),
    twitter_url      = nullif(p_twitter_url, ''),
    youtube_url      = nullif(p_youtube_url, ''),
    linkedin_url     = nullif(p_linkedin_url, ''),
    tiktok_url       = nullif(p_tiktok_url, ''),
    keywords         = COALESCE(p_keywords, keywords),
    updated_at       = now()
  WHERE id = p_profile_id;
END;
$function$;