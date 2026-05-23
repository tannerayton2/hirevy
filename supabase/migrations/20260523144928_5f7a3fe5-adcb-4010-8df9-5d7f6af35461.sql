
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS score_sum numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notified_first_review_submitted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notified_first_review_received boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notified_tier text NOT NULL DEFAULT 'unranked';

-- Update existing trigger function to also accumulate completeness_score
CREATE OR REPLACE FUNCTION public.reviews_after_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET review_count = review_count + 1,
      rating_sum   = rating_sum + NEW.rating,
      score_sum    = score_sum + COALESCE(NEW.completeness_score, 0)
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$function$;

-- Backfill score_sum from existing reviews
UPDATE public.profiles p
SET score_sum = COALESCE((SELECT SUM(completeness_score) FROM public.reviews r WHERE r.provider_id = p.id), 0);
