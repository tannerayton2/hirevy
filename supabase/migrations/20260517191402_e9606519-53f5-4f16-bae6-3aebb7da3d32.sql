CREATE OR REPLACE FUNCTION public.admin_create_unclaimed_profile(p_username text, p_display_name text, p_service_category text, p_bio text, p_website_url text, p_instagram_url text, p_twitter_url text, p_youtube_url text, p_linkedin_url text, p_tiktok_url text)
 RETURNS TABLE(id uuid, username text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid := gen_random_uuid();
  clean_username text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  clean_username := lower(regexp_replace(coalesce(p_username,''), '[^a-z0-9-]', '', 'g'));
  IF length(clean_username) < 1 THEN
    RAISE EXCEPTION 'invalid username';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.username = clean_username) THEN
    RAISE EXCEPTION 'username taken';
  END IF;

  INSERT INTO public.profiles (
    id, username, display_name, service_category, bio,
    website_url, instagram_url, twitter_url, youtube_url, linkedin_url, tiktok_url,
    is_claimed
  ) VALUES (
    new_id, clean_username, nullif(p_display_name,''), nullif(p_service_category,''), nullif(p_bio,''),
    nullif(p_website_url,''), nullif(p_instagram_url,''), nullif(p_twitter_url,''),
    nullif(p_youtube_url,''), nullif(p_linkedin_url,''), nullif(p_tiktok_url,''),
    false
  );

  RETURN QUERY SELECT new_id, clean_username;
END;
$function$;