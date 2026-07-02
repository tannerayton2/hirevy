
-- 1. Columns
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified')),
  ADD COLUMN IF NOT EXISTS verify_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- 6. Backfill existing rows as verified BEFORE we change triggers so counters stay in sync
UPDATE public.reviews
SET status = 'verified',
    verified_at = COALESCE(verified_at, created_at)
WHERE status <> 'verified';

-- 2. public_reviews view (verified only, no reviewer_email / verify_token)
DROP VIEW IF EXISTS public.public_reviews;
CREATE VIEW public.public_reviews AS
SELECT
  id,
  provider_id,
  reviewer_name,
  rating,
  body,
  completeness_score,
  created_at,
  verified_at
FROM public.reviews
WHERE status = 'verified';

ALTER VIEW public.public_reviews SET (security_invoker = true);
GRANT SELECT ON public.public_reviews TO anon, authenticated;

-- 3. Counter maintenance — only tally verified reviews
CREATE OR REPLACE FUNCTION public.reviews_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'verified' THEN
    UPDATE public.profiles
    SET review_count = review_count + 1,
        rating_sum   = rating_sum + NEW.rating,
        score_sum    = score_sum + COALESCE(NEW.completeness_score, 0),
        points       = points + public.points_for_rating(NEW.rating)
    WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reviews_after_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status <> 'verified' AND NEW.status = 'verified' THEN
    UPDATE public.profiles
    SET review_count = review_count + 1,
        rating_sum   = rating_sum + NEW.rating,
        score_sum    = score_sum + COALESCE(NEW.completeness_score, 0),
        points       = points + public.points_for_rating(NEW.rating)
    WHERE id = NEW.provider_id;
  ELSIF OLD.status = 'verified' AND NEW.status <> 'verified' THEN
    UPDATE public.profiles
    SET review_count = GREATEST(review_count - 1, 0),
        rating_sum   = GREATEST(rating_sum - OLD.rating, 0),
        score_sum    = GREATEST(score_sum - COALESCE(OLD.completeness_score, 0), 0),
        points       = GREATEST(points - public.points_for_rating(OLD.rating), 0)
    WHERE id = OLD.provider_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reviews_after_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'verified' THEN
    UPDATE public.profiles
    SET review_count = GREATEST(review_count - 1, 0),
        rating_sum   = GREATEST(rating_sum - OLD.rating, 0),
        score_sum    = GREATEST(score_sum - COALESCE(OLD.completeness_score, 0), 0),
        points       = GREATEST(points - public.points_for_rating(OLD.rating), 0)
    WHERE id = OLD.provider_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS reviews_after_update ON public.reviews;
CREATE TRIGGER reviews_after_update
AFTER UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.reviews_after_update();

DROP TRIGGER IF EXISTS reviews_after_delete ON public.reviews;
CREATE TRIGGER reviews_after_delete
AFTER DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.reviews_after_delete();

-- 4. verify_review(token) — anon-safe
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
  SET status = 'verified',
      verified_at = now()
  WHERE verify_token = p_token
    AND status = 'pending'
  RETURNING id INTO updated_id;
  RETURN updated_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_review(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_review(uuid) TO anon, authenticated;

-- 5. submit_public_review — replace pending on re-submit, reject if already verified
CREATE OR REPLACE FUNCTION public.submit_public_review(
  p_provider_id uuid,
  p_reviewer_name text,
  p_reviewer_email text,
  p_rating numeric,
  p_body text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  existing_status text;
  new_id uuid;
  clean_email text := lower(trim(coalesce(p_reviewer_email, '')));
BEGIN
  IF p_provider_id IS NULL OR length(clean_email) = 0 THEN
    RAISE EXCEPTION 'provider and email required';
  END IF;
  IF p_rating IS NULL OR p_rating < 0.5 OR p_rating > 5 THEN
    RAISE EXCEPTION 'invalid rating';
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
    provider_id, reviewer_name, reviewer_email, rating, body, status
  ) VALUES (
    p_provider_id, nullif(trim(coalesce(p_reviewer_name,'')), ''),
    clean_email, p_rating, coalesce(p_body, ''), 'pending'
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_review(uuid, text, text, numeric, text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_public_review(uuid, text, text, numeric, text) TO anon, authenticated;
