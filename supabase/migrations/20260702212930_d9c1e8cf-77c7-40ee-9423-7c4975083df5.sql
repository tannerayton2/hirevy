CREATE OR REPLACE FUNCTION public.protect_profile_system_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.review_count     IS DISTINCT FROM OLD.review_count
  OR NEW.rating_sum       IS DISTINCT FROM OLD.rating_sum
  OR NEW.follower_count   IS DISTINCT FROM OLD.follower_count
  OR NEW.points           IS DISTINCT FROM OLD.points
  OR NEW.plan             IS DISTINCT FROM OLD.plan
  OR NEW.paid_offer_limit IS DISTINCT FROM OLD.paid_offer_limit THEN
    RAISE EXCEPTION 'protected profile columns cannot be modified';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_system_columns ON public.profiles;
CREATE TRIGGER protect_profile_system_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_system_columns();