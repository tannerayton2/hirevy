GRANT SELECT (
  is_banned,
  plan,
  paid_offer_limit,
  notified_tier,
  notified_points_tier,
  notified_first_review_received,
  awarded_claim_bonus,
  awarded_profile_complete_bonus,
  awarded_first_review_submitted_bonus,
  incomplete_banner_dismissed,
  onboarding_completed
) ON public.profiles TO authenticated;
