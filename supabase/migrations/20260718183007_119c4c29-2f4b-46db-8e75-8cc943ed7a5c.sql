
DROP FUNCTION IF EXISTS public.list_provider_reviews(uuid);

CREATE OR REPLACE FUNCTION public.list_provider_reviews(p_provider uuid)
 RETURNS TABLE(
   id uuid, provider_id uuid, reviewer_name text, rating numeric, body text,
   created_at timestamp with time zone, completeness_score smallint, is_detailed boolean,
   purchased boolean, amount_paid_bracket text, offer_url text, instagram_handle text,
   strength_tier text, evidence_count integer,
   reviewer_user_id uuid, reviewer_username text, reviewer_display_name text, reviewer_avatar_url text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.provider_id, r.reviewer_name, r.rating, r.body, r.created_at,
         r.completeness_score, r.is_detailed,
         r.purchased, r.amount_paid_bracket, r.offer_url, r.instagram_handle,
         r.strength_tier,
         COALESCE(array_length(r.evidence_paths, 1), 0)::int AS evidence_count,
         p.id AS reviewer_user_id,
         p.username AS reviewer_username,
         p.display_name AS reviewer_display_name,
         p.avatar_url AS reviewer_avatar_url
  FROM public.reviews r
  LEFT JOIN auth.users u
    ON lower(u.email) = lower(r.reviewer_email)
  LEFT JOIN public.profiles p
    ON p.id = u.id
  WHERE r.provider_id = p_provider
    AND r.status = 'verified'
  ORDER BY r.is_detailed DESC, r.created_at DESC;
$function$;

GRANT EXECUTE ON FUNCTION public.list_provider_reviews(uuid) TO anon, authenticated, service_role;
