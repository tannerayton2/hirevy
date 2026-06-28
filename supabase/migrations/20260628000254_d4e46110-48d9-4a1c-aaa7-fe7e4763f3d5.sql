-- Revoke sensitive internal flag columns on profiles from anon and authenticated
REVOKE SELECT (
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
) ON public.profiles FROM anon, authenticated;

-- Revoke reviewer_email column from anon/authenticated on review tables
REVOKE SELECT (reviewer_email) ON public.reviews FROM anon, authenticated;
REVOKE SELECT (reviewer_email) ON public.proof_backed_reviews FROM anon, authenticated;
REVOKE SELECT (reviewer_email) ON public.unclaimed_reviews FROM anon, authenticated;
