DROP FUNCTION IF EXISTS public.get_my_profile_flags();
CREATE FUNCTION public.get_my_profile_flags()
RETURNS TABLE(
  notified_first_review_received boolean,
  notified_points_tier text,
  awarded_claim_bonus boolean,
  awarded_profile_complete_bonus boolean,
  awarded_first_review_submitted_bonus boolean,
  incomplete_banner_dismissed boolean,
  onboarding_completed boolean,
  points integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT notified_first_review_received, notified_points_tier, awarded_claim_bonus,
         awarded_profile_complete_bonus, awarded_first_review_submitted_bonus,
         incomplete_banner_dismissed, onboarding_completed, points
  FROM public.profiles
  WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_profile_flags() TO authenticated;
