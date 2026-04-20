-- Admin allowlist + helper RPCs

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND username = ANY (ARRAY['tannerayton'])
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  email text,
  review_count integer,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
    SELECT p.id, p.username, p.display_name, u.email::text,
           p.review_count, p.created_at
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'users', jsonb_build_object(
      'total', (SELECT count(*) FROM public.profiles),
      'last_24h', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '24 hours'),
      'last_7d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days')
    ),
    'reviews', jsonb_build_object(
      'verified_total', (SELECT count(*) FROM public.reviews),
      'proof_total', (SELECT count(*) FROM public.proof_backed_reviews),
      'last_24h', (
        (SELECT count(*) FROM public.reviews WHERE created_at > now() - interval '24 hours') +
        (SELECT count(*) FROM public.proof_backed_reviews WHERE created_at > now() - interval '24 hours')
      ),
      'last_7d', (
        (SELECT count(*) FROM public.reviews WHERE created_at > now() - interval '7 days') +
        (SELECT count(*) FROM public.proof_backed_reviews WHERE created_at > now() - interval '7 days')
      ),
      'top_provider', (
        SELECT jsonb_build_object('username', p.username, 'display_name', p.display_name, 'count', p.review_count)
        FROM public.profiles p
        WHERE p.review_count > 0
        ORDER BY p.review_count DESC
        LIMIT 1
      )
    ),
    'offers', jsonb_build_object(
      'total', (SELECT count(*) FROM public.offers),
      'paid', (SELECT count(*) FROM public.offers WHERE price_cents IS NOT NULL AND price_cents > 0),
      'free_for_testimonial', (SELECT count(*) FROM public.offers WHERE free_for_testimonial = true),
      'last_7d', (SELECT count(*) FROM public.offers WHERE created_at > now() - interval '7 days')
    ),
    'activity', jsonb_build_object(
      'messages_total', (SELECT count(*) FROM public.messages),
      'messages_24h', (SELECT count(*) FROM public.messages WHERE created_at > now() - interval '24 hours'),
      'active_threads_7d', (SELECT count(DISTINCT thread_id) FROM public.messages WHERE created_at > now() - interval '7 days'),
      'follows_total', (SELECT count(*) FROM public.follows)
    ),
    'moderation', jsonb_build_object(
      'open_disputes_count', (SELECT count(*) FROM public.admin_disputes WHERE status = 'pending'),
      'open_disputes', (
        SELECT coalesce(jsonb_agg(row_to_json(d) ORDER BY d.created_at DESC), '[]'::jsonb)
        FROM (
          SELECT ad.id, ad.reason, ad.created_at, ad.review_type, ad.status,
                 p.username AS provider_username, p.display_name AS provider_display_name
          FROM public.admin_disputes ad
          LEFT JOIN public.profiles p ON p.id = ad.provider_id
          WHERE ad.status = 'pending'
          ORDER BY ad.created_at DESC
          LIMIT 25
        ) d
      ),
      'pending_proof_requests_count', (SELECT count(*) FROM public.proof_access_requests WHERE status = 'pending'),
      'pending_proof_requests', (
        SELECT coalesce(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::jsonb)
        FROM (
          SELECT par.id, par.requester_email, par.requester_message, par.created_at,
                 par.proof_review_id
          FROM public.proof_access_requests par
          WHERE par.status = 'pending'
          ORDER BY par.created_at DESC
          LIMIT 25
        ) r
      ),
      'disputed_reviews_count', (SELECT count(*) FROM public.proof_backed_reviews WHERE is_disputed = true),
      'disputed_reviews', (
        SELECT coalesce(jsonb_agg(row_to_json(x) ORDER BY x.disputed_at DESC NULLS LAST), '[]'::jsonb)
        FROM (
          SELECT pr.id, pr.reviewer_name, pr.rating, pr.disputed_at,
                 p.username AS provider_username, p.display_name AS provider_display_name
          FROM public.proof_backed_reviews pr
          LEFT JOIN public.profiles p ON p.id = pr.provider_id
          WHERE pr.is_disputed = true
          ORDER BY pr.disputed_at DESC NULLS LAST
          LIMIT 25
        ) x
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;