
-- Fix 1: list_provider_reviews must only return verified reviews
CREATE OR REPLACE FUNCTION public.list_provider_reviews(p_provider uuid)
 RETURNS TABLE(id uuid, provider_id uuid, reviewer_name text, rating smallint, body text, created_at timestamp with time zone, completeness_score smallint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, provider_id, reviewer_name, rating, body, created_at, completeness_score
  FROM public.reviews
  WHERE provider_id = p_provider
    AND status = 'verified'
  ORDER BY created_at DESC;
$function$;

-- Fix 2: Revoke broad column SELECT grants on internal profile flags
REVOKE SELECT (is_banned, plan, paid_offer_limit, notified_tier, notified_points_tier, notified_first_review_received, awarded_claim_bonus, awarded_profile_complete_bonus, awarded_first_review_submitted_bonus, incomplete_banner_dismissed, onboarding_completed)
  ON public.profiles FROM authenticated, anon;

-- Owner-only RPC to read own internal flags
CREATE OR REPLACE FUNCTION public.get_my_profile_flags()
 RETURNS TABLE(
   notified_first_review_received boolean,
   notified_points_tier text,
   awarded_claim_bonus boolean,
   awarded_profile_complete_bonus boolean,
   incomplete_banner_dismissed boolean
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT notified_first_review_received, notified_points_tier, awarded_claim_bonus,
         awarded_profile_complete_bonus, incomplete_banner_dismissed
  FROM public.profiles
  WHERE id = auth.uid();
$function$;

REVOKE ALL ON FUNCTION public.get_my_profile_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_profile_flags() TO authenticated;
