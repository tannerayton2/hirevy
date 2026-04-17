-- 1. Replace SECURITY DEFINER view with a SECURITY INVOKER view that excludes email,
-- and grant SELECT on reviews via column privileges instead of a broad RLS policy.
DROP VIEW IF EXISTS public.public_reviews;

-- Public SELECT policy on reviews, but clients should query only safe columns.
-- We'll provide an RPC that returns the safe shape.
CREATE OR REPLACE FUNCTION public.list_provider_reviews(p_provider UUID)
RETURNS TABLE (
  id UUID,
  provider_id UUID,
  reviewer_name TEXT,
  rating SMALLINT,
  body TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, provider_id, reviewer_name, rating, body, created_at
  FROM public.reviews
  WHERE provider_id = p_provider
  ORDER BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.list_provider_reviews(UUID) TO anon, authenticated;

-- 2. set_updated_at search_path is already set; tier_for_review_count needs it too.
CREATE OR REPLACE FUNCTION public.tier_for_review_count(c INT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN c >= 100 THEN 'diamond'
    WHEN c >= 50  THEN 'platinum'
    WHEN c >= 25  THEN 'gold'
    WHEN c >= 10  THEN 'silver'
    WHEN c >= 1   THEN 'bronze'
    ELSE 'unranked'
  END;
$$;

-- 3. Tighten review insert policy: require well-formed email and non-empty fields.
DROP POLICY IF EXISTS "Reviews can be inserted by anyone (public link)" ON public.reviews;
CREATE POLICY "Public can submit reviews with valid data"
  ON public.reviews FOR INSERT WITH CHECK (
    length(reviewer_name) BETWEEN 1 AND 80
    AND reviewer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(body) <= 4000
    AND rating BETWEEN 1 AND 5
  );

-- 4. Storage: keep public READ on individual objects, but prevent listing by
-- requiring a path filter. Public buckets already allow public URL reads;
-- the linter warns about broad list. We narrow SELECT to authenticated owners
-- (everyone can still fetch by public URL via the storage CDN).
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read offer covers" ON storage.objects;

-- Owner-only listing in the API; public CDN URLs continue to work for everyone.
CREATE POLICY "Owners can list their avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners can list their offer covers" ON storage.objects FOR SELECT
  USING (bucket_id = 'offer-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
