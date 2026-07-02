
-- Hide reviewer_email column from non-service roles on all three review tables
REVOKE SELECT (reviewer_email) ON public.reviews FROM anon, authenticated;
REVOKE SELECT (reviewer_email) ON public.proof_backed_reviews FROM anon, authenticated;
REVOKE SELECT (reviewer_email) ON public.unclaimed_reviews FROM anon, authenticated;

-- Ensure INSERT still works for authenticated flows (proof-backed insert)
GRANT INSERT (reviewer_email) ON public.proof_backed_reviews TO authenticated;
GRANT INSERT (reviewer_email) ON public.reviews TO anon, authenticated;
GRANT INSERT (reviewer_email) ON public.unclaimed_reviews TO anon, authenticated;

-- Recreate public_reviews view with security_invoker so it runs as querying user (not definer)
ALTER VIEW public.public_reviews SET (security_invoker = true);
