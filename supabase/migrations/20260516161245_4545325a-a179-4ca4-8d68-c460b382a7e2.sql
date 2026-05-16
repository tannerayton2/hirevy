-- Drop the existing function first so we can change its return type
DROP FUNCTION IF EXISTS public.list_provider_reviews(uuid);

-- 1. Scoring function
CREATE OR REPLACE FUNCTION public.compute_review_score(
  p_body text,
  p_purchased boolean,
  p_amount_filled boolean,
  p_offer_filled boolean,
  p_photo_count int
) RETURNS smallint
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT LEAST(100, GREATEST(0,
    CASE WHEN p_body IS NOT NULL AND length(trim(p_body)) > 0 THEN 20 ELSE 0 END
    + CASE
        WHEN p_body IS NULL THEN 0
        WHEN length(p_body) > 300 THEN 20
        WHEN length(p_body) >= 100 THEN 10
        ELSE 0
      END
    + CASE WHEN p_purchased THEN 25 ELSE 0 END
    + CASE WHEN p_amount_filled THEN 10 ELSE 0 END
    + CASE WHEN p_offer_filled THEN 10 ELSE 0 END
    + CASE
        WHEN p_photo_count >= 3 THEN 10
        WHEN p_photo_count = 2 THEN 8
        WHEN p_photo_count = 1 THEN 5
        ELSE 0
      END
  ))::smallint;
$$;

-- 2. Add columns
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS completeness_score smallint NOT NULL DEFAULT 0;
ALTER TABLE public.proof_backed_reviews ADD COLUMN IF NOT EXISTS completeness_score smallint NOT NULL DEFAULT 0;
ALTER TABLE public.unclaimed_reviews ADD COLUMN IF NOT EXISTS completeness_score smallint NOT NULL DEFAULT 0;

-- 3. Triggers
CREATE OR REPLACE FUNCTION public.set_reviews_score() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.completeness_score := public.compute_review_score(NEW.body, false, false, false, 0);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reviews_score_biu ON public.reviews;
CREATE TRIGGER reviews_score_biu BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.set_reviews_score();

CREATE OR REPLACE FUNCTION public.set_proof_review_score() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.completeness_score := public.compute_review_score(
    NEW.body, true,
    NEW.amount_paid_bracket IS NOT NULL,
    false,
    COALESCE(NEW.proof_file_count, 0)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS proof_reviews_score_biu ON public.proof_backed_reviews;
CREATE TRIGGER proof_reviews_score_biu BEFORE INSERT OR UPDATE ON public.proof_backed_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_proof_review_score();

CREATE OR REPLACE FUNCTION public.set_unclaimed_review_score() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.completeness_score := public.compute_review_score(
    NEW.body,
    NEW.purchased,
    NEW.amount_paid_bracket IS NOT NULL,
    NEW.offer_url IS NOT NULL AND length(trim(NEW.offer_url)) > 0,
    COALESCE(array_length(NEW.evidence_paths, 1), 0)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS unclaimed_reviews_score_biu ON public.unclaimed_reviews;
CREATE TRIGGER unclaimed_reviews_score_biu BEFORE INSERT OR UPDATE ON public.unclaimed_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_unclaimed_review_score();

-- 4. Backfill existing rows
UPDATE public.reviews SET completeness_score = public.compute_review_score(body, false, false, false, 0);
UPDATE public.proof_backed_reviews SET completeness_score = public.compute_review_score(
  body, true, amount_paid_bracket IS NOT NULL, false, COALESCE(proof_file_count, 0)
);
UPDATE public.unclaimed_reviews SET completeness_score = public.compute_review_score(
  body, purchased, amount_paid_bracket IS NOT NULL,
  offer_url IS NOT NULL AND length(trim(offer_url)) > 0,
  COALESCE(array_length(evidence_paths, 1), 0)
);

-- 5. Recreate list_provider_reviews including the score
CREATE FUNCTION public.list_provider_reviews(p_provider uuid)
 RETURNS TABLE(id uuid, provider_id uuid, reviewer_name text, rating smallint, body text, created_at timestamp with time zone, completeness_score smallint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, provider_id, reviewer_name, rating, body, created_at, completeness_score
  FROM public.reviews
  WHERE provider_id = p_provider
  ORDER BY created_at DESC;
$function$;