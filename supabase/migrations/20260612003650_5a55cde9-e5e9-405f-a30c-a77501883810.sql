
-- 1) Hide reviewer_email column on unclaimed_reviews from anon/authenticated
REVOKE SELECT (reviewer_email) ON public.unclaimed_reviews FROM anon, authenticated;

-- 2) Admin-only SELECT policy on marketplace_waitlist
DROP POLICY IF EXISTS "Admins can view waitlist" ON public.marketplace_waitlist;
CREATE POLICY "Admins can view waitlist"
  ON public.marketplace_waitlist
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3) Admin-only SELECT on proof_access_requests (reviewer policy already exists)
DROP POLICY IF EXISTS "Admins can view proof access requests" ON public.proof_access_requests;
CREATE POLICY "Admins can view proof access requests"
  ON public.proof_access_requests
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
