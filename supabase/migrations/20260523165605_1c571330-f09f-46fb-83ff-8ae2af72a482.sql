-- Add point-tracking + tier-up notification + bonus award flags
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notified_points_tier text NOT NULL DEFAULT 'unranked',
  ADD COLUMN IF NOT EXISTS awarded_claim_bonus boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS awarded_profile_complete_bonus boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS awarded_first_review_submitted_bonus boolean NOT NULL DEFAULT false;

-- Points per star rating (5=10, 4=8, 3=4, 2=1, 1=0)
CREATE OR REPLACE FUNCTION public.points_for_rating(r numeric)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN r >= 5 THEN 10
    WHEN r >= 4 THEN 8
    WHEN r >= 3 THEN 4
    WHEN r >= 2 THEN 1
    ELSE 0
  END;
$$;

-- Update the verified-review insert trigger function to also award points
CREATE OR REPLACE FUNCTION public.reviews_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET review_count = review_count + 1,
      rating_sum   = rating_sum + NEW.rating,
      score_sum    = score_sum + COALESCE(NEW.completeness_score, 0),
      points       = points + public.points_for_rating(NEW.rating)
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$;

-- New: award points for proof-backed reviews
CREATE OR REPLACE FUNCTION public.proof_reviews_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET points = points + public.points_for_rating(NEW.rating)
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proof_reviews_after_insert_trg ON public.proof_backed_reviews;
CREATE TRIGGER proof_reviews_after_insert_trg
AFTER INSERT ON public.proof_backed_reviews
FOR EACH ROW EXECUTE FUNCTION public.proof_reviews_after_insert();

-- Backfill points for existing reviews
UPDATE public.profiles p
SET points = COALESCE((
    SELECT SUM(public.points_for_rating(r.rating))::int
    FROM public.reviews r WHERE r.provider_id = p.id
  ), 0)
  + COALESCE((
    SELECT SUM(public.points_for_rating(pr.rating))::int
    FROM public.proof_backed_reviews pr WHERE pr.provider_id = p.id
  ), 0);

-- Safety: never let points go negative
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_points_nonnegative CHECK (points >= 0) NOT VALID;