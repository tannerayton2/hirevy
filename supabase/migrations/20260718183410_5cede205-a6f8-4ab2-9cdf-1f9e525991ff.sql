
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS offer_id uuid
  REFERENCES public.offers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reviews_offer_id_idx ON public.reviews(offer_id);

DROP FUNCTION IF EXISTS public.list_provider_reviews(uuid);

CREATE OR REPLACE FUNCTION public.list_provider_reviews(p_provider uuid)
 RETURNS TABLE(
   id uuid, provider_id uuid, reviewer_name text, rating numeric, body text,
   created_at timestamp with time zone, completeness_score smallint, is_detailed boolean,
   purchased boolean, amount_paid_bracket text, offer_url text, instagram_handle text,
   strength_tier text, evidence_count integer,
   reviewer_user_id uuid, reviewer_username text, reviewer_display_name text, reviewer_avatar_url text,
   offer_id uuid, offer_title text, offer_slug text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.provider_id, r.reviewer_name, r.rating, r.body, r.created_at,
         r.completeness_score, r.is_detailed,
         r.purchased, r.amount_paid_bracket, r.offer_url, r.instagram_handle,
         r.strength_tier,
         COALESCE(array_length(r.evidence_paths, 1), 0)::int AS evidence_count,
         p.id AS reviewer_user_id,
         p.username AS reviewer_username,
         p.display_name AS reviewer_display_name,
         p.avatar_url AS reviewer_avatar_url,
         o.id AS offer_id,
         o.title AS offer_title,
         o.slug AS offer_slug
  FROM public.reviews r
  LEFT JOIN auth.users u
    ON lower(u.email) = lower(r.reviewer_email)
  LEFT JOIN public.profiles p
    ON p.id = u.id
  LEFT JOIN public.offers o
    ON o.id = r.offer_id
  WHERE r.provider_id = p_provider
    AND r.status = 'verified'
  ORDER BY r.is_detailed DESC, r.created_at DESC;
$function$;

GRANT EXECUTE ON FUNCTION public.list_provider_reviews(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_public_review(
  p_provider_id uuid,
  p_reviewer_name text,
  p_reviewer_email text,
  p_rating numeric,
  p_body text,
  p_purchased boolean DEFAULT false,
  p_amount_paid_bracket text DEFAULT NULL,
  p_offer_url text DEFAULT NULL,
  p_instagram_handle text DEFAULT NULL,
  p_evidence_paths text[] DEFAULT '{}'::text[],
  p_strength_tier text DEFAULT 'basic',
  p_offer_id uuid DEFAULT NULL
) RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  existing_id uuid;
  existing_status text;
  new_id uuid;
  clean_name text := trim(COALESCE(p_reviewer_name, ''));
  clean_email text := lower(trim(COALESCE(p_reviewer_email, '')));
  clean_body text := COALESCE(p_body, '');
  evidence text[] := COALESCE(p_evidence_paths, '{}'::text[]);
  matched_offer uuid;
BEGIN
  IF p_provider_id IS NULL THEN RAISE EXCEPTION 'provider required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_provider_id) THEN
    RAISE EXCEPTION 'provider not found';
  END IF;
  IF length(clean_email) = 0 OR clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'valid email required';
  END IF;
  IF length(clean_name) < 1 OR length(clean_name) > 80 THEN
    clean_name := COALESCE(NULLIF(trim(split_part(clean_email, '@', 1)), ''), 'Reviewer');
    clean_name := substring(clean_name for 80);
  END IF;
  IF length(clean_body) < 60 OR length(clean_body) > 4000 THEN
    RAISE EXCEPTION 'review body must be between 60 and 4000 characters';
  END IF;
  IF p_rating IS NULL OR p_rating < 0.5 OR p_rating > 5 OR (p_rating * 2) <> floor(p_rating * 2) THEN
    RAISE EXCEPTION 'rating must be between 0.5 and 5 in half-star steps';
  END IF;
  IF COALESCE(array_length(evidence, 1), 0) > 3 THEN
    RAISE EXCEPTION 'at most 3 evidence files allowed';
  END IF;

  IF p_offer_id IS NOT NULL THEN
    SELECT id INTO matched_offer
      FROM public.offers
     WHERE id = p_offer_id AND provider_id = p_provider_id;
    IF matched_offer IS NULL THEN
      RAISE EXCEPTION 'offer does not belong to this provider';
    END IF;
  END IF;

  SELECT id, status INTO existing_id, existing_status
    FROM public.reviews
   WHERE provider_id = p_provider_id AND reviewer_email = clean_email;

  IF existing_id IS NOT NULL AND existing_status = 'verified' THEN
    RAISE EXCEPTION 'This email has already reviewed this provider.'
      USING ERRCODE = 'unique_violation';
  END IF;
  IF existing_id IS NOT NULL AND existing_status = 'pending' THEN
    DELETE FROM public.reviews WHERE id = existing_id;
  END IF;

  INSERT INTO public.reviews (
    provider_id, reviewer_name, reviewer_email, rating, body, status,
    purchased, amount_paid_bracket, offer_url, instagram_handle,
    evidence_paths, strength_tier, offer_id
  ) VALUES (
    p_provider_id, clean_name, clean_email, p_rating, clean_body, 'pending',
    COALESCE(p_purchased, false),
    NULLIF(trim(COALESCE(p_amount_paid_bracket, '')), ''),
    NULLIF(trim(COALESCE(p_offer_url, '')), ''),
    NULLIF(trim(COALESCE(p_instagram_handle, '')), ''),
    evidence,
    COALESCE(NULLIF(trim(COALESCE(p_strength_tier, '')), ''), 'basic'),
    matched_offer
  ) RETURNING id INTO new_id;

  RETURN new_id;
END; $function$;
