
-- 1) Lock down internal profile flags (defense-in-depth: revoke column SELECTs)
REVOKE SELECT (
  is_banned, plan, paid_offer_limit,
  notified_first_review_submitted, notified_first_review_received,
  notified_tier, notified_points_tier,
  awarded_claim_bonus, awarded_profile_complete_bonus, awarded_first_review_submitted_bonus,
  incomplete_banner_dismissed, onboarding_completed
) ON public.profiles FROM anon, authenticated;

-- 2) Prevent privilege escalation: block self-updates to role/is_banned and other sensitive columns
REVOKE UPDATE (role, is_banned, plan, paid_offer_limit,
               review_count, rating_sum, follower_count, points, score_sum)
  ON public.profiles FROM anon, authenticated;

-- Extend the protection trigger to include role and is_banned
CREATE OR REPLACE FUNCTION public.protect_profile_system_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR pg_trigger_depth() > 1 OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.review_count     IS DISTINCT FROM OLD.review_count
  OR NEW.rating_sum       IS DISTINCT FROM OLD.rating_sum
  OR NEW.follower_count   IS DISTINCT FROM OLD.follower_count
  OR NEW.points           IS DISTINCT FROM OLD.points
  OR NEW.plan             IS DISTINCT FROM OLD.plan
  OR NEW.paid_offer_limit IS DISTINCT FROM OLD.paid_offer_limit
  OR NEW.role             IS DISTINCT FROM OLD.role
  OR NEW.is_banned        IS DISTINCT FROM OLD.is_banned
  OR NEW.score_sum        IS DISTINCT FROM OLD.score_sum THEN
    RAISE EXCEPTION 'protected profile columns cannot be modified';
  END IF;

  RETURN NEW;
END;
$function$;

-- Tighten the UPDATE policy: add WITH CHECK so users can never row-hop
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3) reviews: add public SELECT policy filtered to verified rows
CREATE POLICY "Verified reviews are viewable by everyone"
  ON public.reviews FOR SELECT
  USING (status = 'verified');
