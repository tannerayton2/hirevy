
-- 0. Fix ambiguous variable name in notify_on_tier_reached (blocked counter updates)
CREATE OR REPLACE FUNCTION public.notify_on_tier_reached()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  new_tier text; tier_label text; v_flag_name text;
BEGIN
  IF NEW.points IS NULL OR NEW.points = OLD.points THEN RETURN NEW; END IF;
  new_tier := CASE
    WHEN NEW.points >= 500 THEN 'diamond'
    WHEN NEW.points >= 250 THEN 'platinum'
    WHEN NEW.points >= 100 THEN 'gold'
    WHEN NEW.points >= 40  THEN 'silver'
    WHEN NEW.points >= 10  THEN 'bronze'
    ELSE 'unranked'
  END;
  IF new_tier = 'unranked' THEN RETURN NEW; END IF;
  v_flag_name := 'tier_up_' || new_tier;
  IF EXISTS (
    SELECT 1 FROM public.user_notification_flags f
    WHERE f.user_id = NEW.id AND f.flag_name = v_flag_name
  ) THEN
    RETURN NEW;
  END IF;
  tier_label := initcap(new_tier);
  INSERT INTO public.user_notification_flags (user_id, flag_name) VALUES (NEW.id, v_flag_name);
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (NEW.id, 'tier_reached',
    'You reached ' || tier_label || '! Keep collecting reviews to level up.',
    '/@' || NEW.username);
  RETURN NEW;
END; $$;

-- 1. Add richer columns to reviews so it can absorb the unclaimed row shape
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS purchased boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS amount_paid_bracket text,
  ADD COLUMN IF NOT EXISTS evidence_paths text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS strength_tier text NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS offer_url text,
  ADD COLUMN IF NOT EXISTS instagram_handle text;

-- 2. Update the completeness score trigger to use the richer inputs
CREATE OR REPLACE FUNCTION public.set_reviews_score()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.completeness_score := public.compute_review_score(
    NEW.body,
    COALESCE(NEW.purchased, false),
    NEW.amount_paid_bracket IS NOT NULL,
    NEW.offer_url IS NOT NULL AND length(trim(COALESCE(NEW.offer_url, ''))) > 0,
    COALESCE(array_length(NEW.evidence_paths, 1), 0)
  );
  RETURN NEW;
END; $$;

-- 3. Migrate linked unclaimed reviews into reviews
INSERT INTO public.reviews (
  id, provider_id, reviewer_name, reviewer_email, rating, body,
  created_at, status, verify_token, verified_at,
  purchased, amount_paid_bracket, evidence_paths, strength_tier, offer_url, instagram_handle
)
SELECT
  u.id, u.linked_profile_id,
  COALESCE(NULLIF(trim(split_part(u.reviewer_email, '@', 1)), ''), 'Reviewer'),
  u.reviewer_email, u.rating, u.body,
  u.created_at, u.status, u.verify_token, u.verified_at,
  COALESCE(u.purchased, false), u.amount_paid_bracket,
  COALESCE(u.evidence_paths, '{}'::text[]), COALESCE(u.strength_tier, 'basic'),
  u.offer_url, u.instagram_handle
FROM public.unclaimed_reviews u
WHERE u.linked_profile_id IS NOT NULL
ON CONFLICT (provider_id, reviewer_email) DO NOTHING;

-- 4. Drop the old table + submit_unclaimed_review + its score trigger fn
DROP TABLE IF EXISTS public.unclaimed_reviews CASCADE;
DROP FUNCTION IF EXISTS public.submit_unclaimed_review(
  text, text, text, numeric, text, boolean, text, text[], text, text, text, text, boolean, uuid
);
DROP FUNCTION IF EXISTS public.set_unclaimed_review_score();

-- 5. Simplify admin + verification RPCs so they only touch the reviews table
CREATE OR REPLACE FUNCTION public.admin_list_review_queue(p_limit integer DEFAULT 100)
RETURNS TABLE(
  id uuid, review_type text, status text, rating numeric, body text,
  reviewer_name text, reviewer_email text,
  target_name text, target_username text, target_profile_id uuid,
  created_at timestamp with time zone, verified_at timestamp with time zone
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT
    r.id, 'public'::text AS review_type, r.status, r.rating, r.body,
    r.reviewer_name, r.reviewer_email,
    COALESCE(p.display_name, p.username) AS target_name,
    p.username AS target_username,
    r.provider_id AS target_profile_id,
    r.created_at, r.verified_at
  FROM public.reviews r
  LEFT JOIN public.profiles p ON p.id = r.provider_id
  WHERE public.is_admin(auth.uid())
  ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
$$;

CREATE OR REPLACE FUNCTION public.admin_verify_review(p_review_id uuid, p_review_type text DEFAULT 'public')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.reviews
     SET status = 'verified', verified_at = COALESCE(verified_at, now())
   WHERE id = p_review_id AND status <> 'verified';
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_review(p_review_id uuid, p_review_type text DEFAULT 'public')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.reviews WHERE id = p_review_id;
END; $$;

CREATE OR REPLACE FUNCTION public.verify_review(p_token uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE updated_id uuid;
BEGIN
  IF p_token IS NULL THEN RETURN false; END IF;
  UPDATE public.reviews
     SET status = 'verified', verified_at = now()
   WHERE verify_token = p_token
     AND status = 'pending'
     AND created_at > now() - interval '7 days'
  RETURNING id INTO updated_id;
  RETURN updated_id IS NOT NULL;
END; $$;

-- 6. Extend submit_public_review to accept the richer submission payload
DROP FUNCTION IF EXISTS public.submit_public_review(uuid, text, text, numeric, text);

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
  p_strength_tier text DEFAULT 'basic'
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  existing_id uuid;
  existing_status text;
  new_id uuid;
  clean_name text := trim(COALESCE(p_reviewer_name, ''));
  clean_email text := lower(trim(COALESCE(p_reviewer_email, '')));
  clean_body text := COALESCE(p_body, '');
  evidence text[] := COALESCE(p_evidence_paths, '{}'::text[]);
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
    evidence_paths, strength_tier
  ) VALUES (
    p_provider_id, clean_name, clean_email, p_rating, clean_body, 'pending',
    COALESCE(p_purchased, false),
    NULLIF(trim(COALESCE(p_amount_paid_bracket, '')), ''),
    NULLIF(trim(COALESCE(p_offer_url, '')), ''),
    NULLIF(trim(COALESCE(p_instagram_handle, '')), ''),
    evidence,
    COALESCE(NULLIF(trim(COALESCE(p_strength_tier, '')), ''), 'basic')
  ) RETURNING id INTO new_id;

  RETURN new_id;
END; $$;
