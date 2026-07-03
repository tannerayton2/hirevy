
-- =========================================================
-- profiles: restrict internal flag columns from public reads
-- =========================================================
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, username, display_name, avatar_url, bio, service_category,
  review_count, rating_sum, follower_count, created_at, updated_at,
  pinned_review_id, website_url, is_claimed,
  instagram_url, twitter_url, youtube_url, linkedin_url, tiktok_url,
  score_sum, points, role, preferred_categories, keywords, provider_type
) ON public.profiles TO anon, authenticated;

-- =========================================================
-- reviews: hide reviewer_email from anon/authenticated
-- =========================================================
REVOKE SELECT ON public.reviews FROM anon, authenticated;

GRANT SELECT (
  id, provider_id, reviewer_name, rating, body, created_at,
  completeness_score, status, verified_at
) ON public.reviews TO anon, authenticated;

-- =========================================================
-- proof_backed_reviews: hide reviewer_email
-- =========================================================
REVOKE SELECT ON public.proof_backed_reviews FROM anon, authenticated;

GRANT SELECT (
  id, provider_id, reviewer_user_id, reviewer_name, rating, body,
  engagement_type, engagement_started_month, engagement_started_year,
  engagement_ended_month, engagement_ended_year, engagement_ongoing,
  amount_paid_bracket, proof_file_paths, proof_file_count,
  is_disputed, disputed_at, created_at, completeness_score
) ON public.proof_backed_reviews TO anon, authenticated;

-- =========================================================
-- unclaimed_reviews: hide reviewer_email
-- =========================================================
REVOKE SELECT ON public.unclaimed_reviews FROM anon, authenticated;

GRANT SELECT (
  id, coach_name, instagram_handle, offer_url, rating, body, purchased,
  amount_paid_bracket, evidence_paths, strength_tier,
  unmatched_link, unmatched_description, needs_profile,
  linked_profile_id, status, verified_at, verify_token,
  created_at, completeness_score
) ON public.unclaimed_reviews TO anon, authenticated;
