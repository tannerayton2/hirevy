
DROP FUNCTION IF EXISTS public.list_provider_reviews(uuid);

CREATE OR REPLACE FUNCTION public.list_provider_reviews(p_provider uuid)
 RETURNS TABLE(
   id uuid, provider_id uuid, reviewer_name text, rating numeric, body text,
   created_at timestamp with time zone, completeness_score smallint, is_detailed boolean,
   purchased boolean, amount_paid_bracket text, offer_url text, instagram_handle text,
   strength_tier text, evidence_count integer
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.provider_id, r.reviewer_name, r.rating, r.body, r.created_at,
         r.completeness_score, r.is_detailed,
         r.purchased, r.amount_paid_bracket, r.offer_url, r.instagram_handle,
         r.strength_tier,
         COALESCE(array_length(r.evidence_paths, 1), 0)::int AS evidence_count
  FROM public.reviews r
  WHERE r.provider_id = p_provider
    AND r.status = 'verified'
  ORDER BY r.is_detailed DESC, r.created_at DESC;
$function$;

ALTER TABLE public.proof_access_requests
  ALTER COLUMN proof_review_id DROP NOT NULL;

ALTER TABLE public.proof_access_requests
  ADD COLUMN IF NOT EXISTS review_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE;

ALTER TABLE public.proof_access_requests
  DROP CONSTRAINT IF EXISTS proof_access_requests_target_check;
ALTER TABLE public.proof_access_requests
  ADD CONSTRAINT proof_access_requests_target_check CHECK (
    (proof_review_id IS NOT NULL AND review_id IS NULL)
    OR (proof_review_id IS NULL AND review_id IS NOT NULL)
  );
