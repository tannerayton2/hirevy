
DROP POLICY IF EXISTS "Public can submit reviews with valid data" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can submit an unclaimed review" ON public.unclaimed_reviews;

ALTER TABLE public.profiles ALTER COLUMN rating_sum TYPE numeric(12,1) USING rating_sum::numeric;
ALTER TABLE public.profiles ALTER COLUMN rating_sum SET DEFAULT 0;

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;
ALTER TABLE public.reviews ALTER COLUMN rating TYPE numeric(2,1) USING rating::numeric;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_check
  CHECK (rating >= 0.5 AND rating <= 5 AND (rating * 2) = floor(rating * 2));

ALTER TABLE public.proof_backed_reviews DROP CONSTRAINT IF EXISTS proof_backed_reviews_rating_check;
ALTER TABLE public.proof_backed_reviews ALTER COLUMN rating TYPE numeric(2,1) USING rating::numeric;
ALTER TABLE public.proof_backed_reviews ADD CONSTRAINT proof_backed_reviews_rating_check
  CHECK (rating >= 0.5 AND rating <= 5 AND (rating * 2) = floor(rating * 2));

ALTER TABLE public.unclaimed_reviews DROP CONSTRAINT IF EXISTS unclaimed_reviews_rating_check;
ALTER TABLE public.unclaimed_reviews ALTER COLUMN rating TYPE numeric(2,1) USING rating::numeric;
ALTER TABLE public.unclaimed_reviews ADD CONSTRAINT unclaimed_reviews_rating_check
  CHECK (rating >= 0.5 AND rating <= 5 AND (rating * 2) = floor(rating * 2));

CREATE POLICY "Public can submit reviews with valid data" ON public.reviews
FOR INSERT WITH CHECK (
  length(reviewer_name) >= 1 AND length(reviewer_name) <= 80
  AND reviewer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(body) <= 4000
  AND rating >= 0.5 AND rating <= 5
);

CREATE POLICY "Anyone can submit an unclaimed review" ON public.unclaimed_reviews
FOR INSERT WITH CHECK (
  length(coach_name) >= 1 AND length(coach_name) <= 120
  AND length(body) >= 50 AND length(body) <= 4000
  AND reviewer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND rating >= 0.5 AND rating <= 5
  AND COALESCE(array_length(evidence_paths, 1), 0) <= 3
);
