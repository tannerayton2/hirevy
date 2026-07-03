GRANT SELECT (onboarding_completed, incomplete_banner_dismissed) ON public.profiles TO authenticated;

REVOKE SELECT (verify_token) ON public.unclaimed_reviews FROM anon, authenticated;

DROP FUNCTION IF EXISTS public.list_provider_reviews(uuid);
CREATE FUNCTION public.list_provider_reviews(p_provider uuid)
RETURNS TABLE(
  id uuid,
  provider_id uuid,
  reviewer_name text,
  rating numeric,
  body text,
  created_at timestamp with time zone,
  completeness_score smallint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, provider_id, reviewer_name, rating, body, created_at, completeness_score
  FROM public.reviews
  WHERE provider_id = p_provider
    AND status = 'verified'
  ORDER BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.list_provider_reviews(uuid) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_my_profile_flags();
CREATE FUNCTION public.get_my_profile_flags()
RETURNS TABLE(
  notified_first_review_received boolean,
  notified_points_tier text,
  awarded_claim_bonus boolean,
  awarded_profile_complete_bonus boolean,
  awarded_first_review_submitted_bonus boolean,
  incomplete_banner_dismissed boolean,
  points integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT notified_first_review_received, notified_points_tier, awarded_claim_bonus,
         awarded_profile_complete_bonus, awarded_first_review_submitted_bonus,
         incomplete_banner_dismissed, points
  FROM public.profiles
  WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_profile_flags() TO authenticated;
