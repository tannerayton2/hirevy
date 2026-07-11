
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS is_detailed boolean
  GENERATED ALWAYS AS (COALESCE(length(body), 0) >= 150) STORED;

ALTER TABLE public.unclaimed_reviews
  ADD COLUMN IF NOT EXISTS is_detailed boolean
  GENERATED ALWAYS AS (COALESCE(length(body), 0) >= 150) STORED;

GRANT SELECT (is_detailed) ON public.reviews TO anon, authenticated;
GRANT SELECT (is_detailed) ON public.unclaimed_reviews TO anon, authenticated;

DROP FUNCTION IF EXISTS public.list_provider_reviews(uuid);

CREATE OR REPLACE FUNCTION public.list_provider_reviews(p_provider uuid)
RETURNS TABLE(
  id uuid,
  provider_id uuid,
  reviewer_name text,
  rating numeric,
  body text,
  created_at timestamp with time zone,
  completeness_score smallint,
  is_detailed boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT id, provider_id, reviewer_name, rating, body, created_at, completeness_score, is_detailed
  FROM public.reviews
  WHERE provider_id = p_provider
    AND status = 'verified'
  ORDER BY is_detailed DESC, created_at DESC;
$function$;
