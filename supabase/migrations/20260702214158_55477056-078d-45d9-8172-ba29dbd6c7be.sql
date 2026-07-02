
-- 1. Allow nested trigger depth in protect_profile_system_columns
CREATE OR REPLACE FUNCTION public.protect_profile_system_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR pg_trigger_depth() > 1 OR public.is_admin(auth.uid()) THEN
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

-- 2. Revert public_reviews view to security definer (invoker = false)
ALTER VIEW public.public_reviews SET (security_invoker = false);

-- 3. Drop the direct-insert policy on reviews
DROP POLICY IF EXISTS "Public can submit reviews with valid data" ON public.reviews;

-- Move validation into submit_public_review
CREATE OR REPLACE FUNCTION public.submit_public_review(
  p_provider_id uuid,
  p_reviewer_name text,
  p_reviewer_email text,
  p_rating numeric,
  p_body text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_id uuid;
  existing_status text;
  new_id uuid;
  clean_name text := trim(coalesce(p_reviewer_name, ''));
  clean_email text := lower(trim(coalesce(p_reviewer_email, '')));
  clean_body text := coalesce(p_body, '');
BEGIN
  IF p_provider_id IS NULL THEN
    RAISE EXCEPTION 'provider required';
  END IF;

  IF length(clean_name) < 1 OR length(clean_name) > 80 THEN
    RAISE EXCEPTION 'name must be between 1 and 80 characters';
  END IF;

  IF length(clean_email) = 0 OR clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'valid email required';
  END IF;

  IF length(clean_body) > 4000 THEN
    RAISE EXCEPTION 'review body must be 4000 characters or fewer';
  END IF;

  IF p_rating IS NULL OR p_rating < 0.5 OR p_rating > 5 THEN
    RAISE EXCEPTION 'invalid rating';
  END IF;

  SELECT id, status INTO existing_id, existing_status
  FROM public.reviews
  WHERE provider_id = p_provider_id AND reviewer_email = clean_email;

  IF existing_id IS NOT NULL AND existing_status = 'verified' THEN
    RAISE EXCEPTION 'This email has already reviewed this provider.'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF existing_id IS NOT NULL AND existing_status = 'pending' THEN
    DELETE FROM public.reviews WHERE id = existing_id;
  END IF;

  INSERT INTO public.reviews (
    provider_id, reviewer_name, reviewer_email, rating, body, status
  ) VALUES (
    p_provider_id, nullif(clean_name, ''),
    clean_email, p_rating, clean_body, 'pending'
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
