
-- 1. Columns
ALTER TABLE public.unclaimed_reviews
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified')),
  ADD COLUMN IF NOT EXISTS verify_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Backfill existing rows to verified
UPDATE public.unclaimed_reviews SET status = 'verified', verified_at = COALESCE(verified_at, created_at)
WHERE status = 'pending' AND created_at < now();

-- 2. Revoke verify_token from anon/authenticated
REVOKE SELECT (verify_token) ON public.unclaimed_reviews FROM anon, authenticated;

-- 3. Replace SELECT policy
DROP POLICY IF EXISTS "Unclaimed reviews are viewable by everyone" ON public.unclaimed_reviews;
CREATE POLICY "Verified unclaimed reviews are public"
  ON public.unclaimed_reviews FOR SELECT
  USING (status = 'verified' OR public.is_admin(auth.uid()));

-- 4. Drop insert policy
DROP POLICY IF EXISTS "Anyone can submit an unclaimed review" ON public.unclaimed_reviews;

-- Submission RPC
CREATE OR REPLACE FUNCTION public.submit_unclaimed_review(
  p_coach_name text,
  p_instagram_handle text,
  p_offer_url text,
  p_rating numeric,
  p_body text,
  p_purchased boolean,
  p_amount_paid_bracket text,
  p_evidence_paths text[],
  p_strength_tier text,
  p_reviewer_email text,
  p_unmatched_link text,
  p_unmatched_description text,
  p_needs_profile boolean,
  p_linked_profile_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_name text := trim(coalesce(p_coach_name, ''));
  clean_email text := lower(trim(coalesce(p_reviewer_email, '')));
  clean_body text := coalesce(p_body, '');
  evidence text[] := COALESCE(p_evidence_paths, '{}'::text[]);
  existing_id uuid;
  existing_status text;
  new_id uuid;
BEGIN
  IF length(clean_name) < 1 OR length(clean_name) > 120 THEN
    RAISE EXCEPTION 'coach name must be between 1 and 120 characters';
  END IF;
  IF length(clean_body) < 50 OR length(clean_body) > 4000 THEN
    RAISE EXCEPTION 'review body must be between 50 and 4000 characters';
  END IF;
  IF clean_email = '' OR clean_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'valid email required';
  END IF;
  IF p_rating IS NULL OR p_rating < 0.5 OR p_rating > 5 OR (p_rating * 2) <> floor(p_rating * 2) THEN
    RAISE EXCEPTION 'rating must be between 0.5 and 5 in half-star steps';
  END IF;
  IF COALESCE(array_length(evidence, 1), 0) > 3 THEN
    RAISE EXCEPTION 'at most 3 evidence files allowed';
  END IF;

  SELECT id, status INTO existing_id, existing_status
  FROM public.unclaimed_reviews
  WHERE lower(coach_name) = lower(clean_name)
    AND reviewer_email = clean_email
  LIMIT 1;

  IF existing_id IS NOT NULL AND existing_status = 'verified' THEN
    RAISE EXCEPTION 'You have already submitted a verified review for this coach.'
      USING ERRCODE = 'unique_violation';
  END IF;
  IF existing_id IS NOT NULL AND existing_status = 'pending' THEN
    DELETE FROM public.unclaimed_reviews WHERE id = existing_id;
  END IF;

  INSERT INTO public.unclaimed_reviews (
    coach_name, instagram_handle, offer_url, rating, body, purchased,
    amount_paid_bracket, evidence_paths, strength_tier, reviewer_email,
    unmatched_link, unmatched_description, needs_profile, linked_profile_id, status
  ) VALUES (
    clean_name, nullif(trim(coalesce(p_instagram_handle,'')),''),
    nullif(trim(coalesce(p_offer_url,'')),''),
    p_rating, clean_body, COALESCE(p_purchased,false),
    nullif(trim(coalesce(p_amount_paid_bracket,'')),''),
    evidence, COALESCE(nullif(trim(coalesce(p_strength_tier,'')),''), 'basic'),
    clean_email,
    nullif(trim(coalesce(p_unmatched_link,'')),''),
    nullif(trim(coalesce(p_unmatched_description,'')),''),
    COALESCE(p_needs_profile,false), p_linked_profile_id, 'pending'
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_unclaimed_review(text,text,text,numeric,text,boolean,text,text[],text,text,text,text,boolean,uuid) TO anon, authenticated;

-- 5. Extend verify_review to check both tables with 7-day expiry
CREATE OR REPLACE FUNCTION public.verify_review(p_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_id uuid;
BEGIN
  IF p_token IS NULL THEN RETURN false; END IF;

  UPDATE public.reviews
  SET status = 'verified', verified_at = now()
  WHERE verify_token = p_token
    AND status = 'pending'
    AND created_at > now() - interval '7 days'
  RETURNING id INTO updated_id;
  IF updated_id IS NOT NULL THEN RETURN true; END IF;

  UPDATE public.unclaimed_reviews
  SET status = 'verified', verified_at = now()
  WHERE verify_token = p_token
    AND status = 'pending'
    AND created_at > now() - interval '7 days'
  RETURNING id INTO updated_id;

  RETURN updated_id IS NOT NULL;
END;
$$;
