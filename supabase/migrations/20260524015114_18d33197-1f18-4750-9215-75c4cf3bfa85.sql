ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_profiles_keywords ON public.profiles USING GIN (keywords);

-- Update admin RPCs to accept keywords
CREATE OR REPLACE FUNCTION public.admin_create_unclaimed_profile(
  p_username text, p_display_name text, p_service_category text, p_bio text,
  p_website_url text, p_instagram_url text, p_twitter_url text, p_youtube_url text,
  p_linkedin_url text, p_tiktok_url text, p_avatar_url text DEFAULT NULL::text,
  p_keywords text[] DEFAULT '{}'::text[]
)
 RETURNS TABLE(id uuid, username text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid := gen_random_uuid();
  clean_username text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  clean_username := lower(regexp_replace(coalesce(p_username,''), '[^a-z0-9-]', '', 'g'));
  IF length(clean_username) < 1 THEN RAISE EXCEPTION 'invalid username'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.username = clean_username) THEN
    RAISE EXCEPTION 'username taken';
  END IF;
  INSERT INTO public.profiles (
    id, username, display_name, service_category, bio, avatar_url,
    website_url, instagram_url, twitter_url, youtube_url, linkedin_url, tiktok_url,
    keywords, is_claimed
  ) VALUES (
    new_id, clean_username, nullif(p_display_name,''), nullif(p_service_category,''), nullif(p_bio,''),
    nullif(p_avatar_url,''),
    nullif(p_website_url,''), nullif(p_instagram_url,''), nullif(p_twitter_url,''),
    nullif(p_youtube_url,''), nullif(p_linkedin_url,''), nullif(p_tiktok_url,''),
    COALESCE(p_keywords, '{}'::text[]),
    false
  );
  RETURN QUERY SELECT new_id, clean_username;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_unclaimed_profile(
  p_profile_id uuid, p_username text, p_display_name text, p_service_category text,
  p_bio text, p_avatar_url text, p_website_url text, p_instagram_url text,
  p_twitter_url text, p_youtube_url text, p_linkedin_url text, p_tiktok_url text,
  p_keywords text[] DEFAULT NULL
)
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
    ALTER TABLE public.profiles DISABLE TRIGGER USER;
    UPDATE public.profiles SET username = clean_username WHERE id = p_profile_id;
    ALTER TABLE public.profiles ENABLE TRIGGER USER;
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