
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_thread_after_message() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.follows_after_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.follows_after_delete() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reviews_after_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.proof_reviews_after_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_proof_review_score() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_unclaimed_review_score() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_reviews_score() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.points_for_rating(numeric) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tier_for_review_count(integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_review_score(text, boolean, boolean, boolean, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_username_change() FROM anon, authenticated;
