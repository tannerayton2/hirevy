
-- Admin RPC: list combined review queue (pending + verified from both tables)
CREATE OR REPLACE FUNCTION public.admin_list_review_queue(p_limit integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  review_type text,
  status text,
  rating numeric,
  body text,
  reviewer_name text,
  reviewer_email text,
  target_name text,
  target_username text,
  target_profile_id uuid,
  created_at timestamptz,
  verified_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM (
    SELECT
      r.id,
      'public'::text AS review_type,
      r.status,
      r.rating,
      r.body,
      r.reviewer_name,
      r.reviewer_email,
      COALESCE(p.display_name, p.username) AS target_name,
      p.username AS target_username,
      r.provider_id AS target_profile_id,
      r.created_at,
      r.verified_at
    FROM public.reviews r
    LEFT JOIN public.profiles p ON p.id = r.provider_id
    WHERE public.is_admin(auth.uid())

    UNION ALL

    SELECT
      u.id,
      'unclaimed'::text AS review_type,
      u.status,
      u.rating,
      u.body,
      NULL::text AS reviewer_name,
      u.reviewer_email,
      u.coach_name AS target_name,
      p.username AS target_username,
      u.linked_profile_id AS target_profile_id,
      u.created_at,
      u.verified_at
    FROM public.unclaimed_reviews u
    LEFT JOIN public.profiles p ON p.id = u.linked_profile_id
    WHERE public.is_admin(auth.uid())
  ) q
  ORDER BY
    CASE WHEN q.status = 'pending' THEN 0 ELSE 1 END,
    q.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
$$;

-- Admin RPC: verify a pending review (either table). Uses UPDATE so
-- pending -> verified counter triggers fire on public.reviews.
CREATE OR REPLACE FUNCTION public.admin_verify_review(p_review_id uuid, p_review_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_review_type = 'public' THEN
    UPDATE public.reviews
    SET status = 'verified', verified_at = COALESCE(verified_at, now())
    WHERE id = p_review_id AND status <> 'verified';
  ELSIF p_review_type = 'unclaimed' THEN
    UPDATE public.unclaimed_reviews
    SET status = 'verified', verified_at = COALESCE(verified_at, now())
    WHERE id = p_review_id AND status <> 'verified';
  ELSE
    RAISE EXCEPTION 'invalid review_type: %', p_review_type;
  END IF;
END;
$$;

-- Admin RPC: delete a review from either table.
CREATE OR REPLACE FUNCTION public.admin_delete_review(p_review_id uuid, p_review_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_review_type = 'public' THEN
    DELETE FROM public.reviews WHERE id = p_review_id;
  ELSIF p_review_type = 'unclaimed' THEN
    DELETE FROM public.unclaimed_reviews WHERE id = p_review_id;
  ELSE
    RAISE EXCEPTION 'invalid review_type: %', p_review_type;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_review_queue(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_verify_review(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_review(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_review_queue(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verify_review(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_review(uuid, text) TO authenticated;
