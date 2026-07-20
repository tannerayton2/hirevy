
-- Helper: check ban status, bypassing the tightened profiles SELECT policy.
CREATE OR REPLACE FUNCTION public.profile_is_banned(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_banned FROM public.profiles WHERE id = uid), false);
$$;

REVOKE ALL ON FUNCTION public.profile_is_banned(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_is_banned(uuid) TO anon, authenticated, service_role;

-- Helper: resolve a reviewer email to its profile id (used to filter reviews by banned authors).
CREATE OR REPLACE FUNCTION public.profile_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id FROM auth.users u WHERE lower(u.email) = lower(p_email) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.profile_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_id_by_email(text) TO anon, authenticated, service_role;

-- =================== profiles ===================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable when not banned"
  ON public.profiles FOR SELECT
  USING (is_banned = false OR auth.uid() = id OR public.is_admin(auth.uid()));

-- =================== offers ===================
DROP POLICY IF EXISTS "Active offers are viewable by everyone" ON public.offers;
CREATE POLICY "Active offers are viewable when provider not banned"
  ON public.offers FOR SELECT
  USING (
    (is_active = true AND NOT public.profile_is_banned(provider_id))
    OR auth.uid() = provider_id
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Providers can insert their own offers" ON public.offers;
CREATE POLICY "Providers can insert their own offers"
  ON public.offers FOR INSERT
  WITH CHECK (auth.uid() = provider_id AND NOT public.profile_is_banned(auth.uid()));

-- =================== imported_testimonials ===================
DROP POLICY IF EXISTS "Imported testimonials are viewable by everyone" ON public.imported_testimonials;
CREATE POLICY "Imported testimonials viewable when provider not banned"
  ON public.imported_testimonials FOR SELECT
  USING (
    NOT public.profile_is_banned(provider_user_id)
    OR auth.uid() = provider_user_id
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Provider can insert their own imported testimonials" ON public.imported_testimonials;
CREATE POLICY "Provider can insert their own imported testimonials"
  ON public.imported_testimonials FOR INSERT
  WITH CHECK (auth.uid() = provider_user_id AND NOT public.profile_is_banned(auth.uid()));

-- =================== reviews ===================
DROP POLICY IF EXISTS "Verified reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Verified reviews viewable when provider not banned"
  ON public.reviews FOR SELECT
  USING (
    status = 'verified'
    AND NOT public.profile_is_banned(provider_id)
    AND NOT public.profile_is_banned(public.profile_id_by_email(reviewer_email))
  );

-- =================== proof_backed_reviews ===================
DROP POLICY IF EXISTS "Proof-backed reviews are viewable by everyone" ON public.proof_backed_reviews;
CREATE POLICY "Proof-backed reviews viewable when parties not banned"
  ON public.proof_backed_reviews FOR SELECT
  USING (
    (NOT public.profile_is_banned(provider_id)
     AND NOT public.profile_is_banned(reviewer_user_id))
    OR auth.uid() = provider_id
    OR auth.uid() = reviewer_user_id
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Logged-in users can submit a proof-backed review" ON public.proof_backed_reviews;
CREATE POLICY "Logged-in non-banned users can submit a proof-backed review"
  ON public.proof_backed_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_user_id
    AND auth.uid() <> provider_id
    AND NOT public.profile_is_banned(auth.uid())
    AND NOT public.profile_is_banned(provider_id)
  );

-- =================== review_replies ===================
DROP POLICY IF EXISTS "Provider can post a reply on their own reviews" ON public.review_replies;
CREATE POLICY "Provider can post a reply on their own reviews"
  ON public.review_replies FOR INSERT
  WITH CHECK (
    auth.uid() = provider_id
    AND NOT public.profile_is_banned(auth.uid())
    AND (
      (review_type = 'verified' AND EXISTS (
        SELECT 1 FROM public.reviews r WHERE r.id = review_replies.review_id AND r.provider_id = auth.uid()
      ))
      OR (review_type = 'proof_backed' AND EXISTS (
        SELECT 1 FROM public.proof_backed_reviews pr WHERE pr.id = review_replies.review_id AND pr.provider_id = auth.uid()
      ))
    )
  );

-- =================== follows ===================
DROP POLICY IF EXISTS "Users can follow" ON public.follows;
CREATE POLICY "Users can follow"
  ON public.follows FOR INSERT
  WITH CHECK (
    auth.uid() = follower_id
    AND NOT public.profile_is_banned(auth.uid())
    AND NOT public.profile_is_banned(following_id)
  );

-- =================== messages ===================
DROP POLICY IF EXISTS "Sender can insert messages in their threads" ON public.messages;
CREATE POLICY "Sender can insert messages in their threads"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND NOT public.profile_is_banned(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.message_threads t
      WHERE t.id = messages.thread_id
        AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
        AND NOT public.profile_is_banned(CASE WHEN t.user_a = auth.uid() THEN t.user_b ELSE t.user_a END)
    )
  );

-- =================== team_messages ===================
DROP POLICY IF EXISTS "User can send own team messages" ON public.team_messages;
CREATE POLICY "User can send own team messages"
  ON public.team_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      (from_admin = false AND user_id = auth.uid() AND NOT public.profile_is_banned(auth.uid()))
      OR (from_admin = true AND public.is_admin(auth.uid()))
    )
  );

-- =================== RPCs: hide reviews written by banned authors, block banned submissions ===================
CREATE OR REPLACE FUNCTION public.list_provider_reviews(p_provider uuid)
 RETURNS TABLE(id uuid, provider_id uuid, reviewer_name text, rating numeric, body text, created_at timestamp with time zone, completeness_score smallint, is_detailed boolean, purchased boolean, amount_paid_bracket text, offer_url text, instagram_handle text, strength_tier text, evidence_count integer, reviewer_user_id uuid, reviewer_username text, reviewer_display_name text, reviewer_avatar_url text, offer_id uuid, offer_title text, offer_slug text)
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
         p.avatar_url AS reviewer_avatar_url,
         o.id AS offer_id,
         o.title AS offer_title,
         o.slug AS offer_slug
  FROM public.reviews r
  LEFT JOIN auth.users u
    ON lower(u.email) = lower(r.reviewer_email)
  LEFT JOIN public.profiles p
    ON p.id = u.id
  LEFT JOIN public.offers o
    ON o.id = r.offer_id
  WHERE r.provider_id = p_provider
    AND r.status = 'verified'
    AND NOT public.profile_is_banned(r.provider_id)
    AND (u.id IS NULL OR NOT public.profile_is_banned(u.id))
  ORDER BY r.is_detailed DESC, r.created_at DESC;
$function$;

-- Block banned users (and reviews of banned providers) at RPC entry
CREATE OR REPLACE FUNCTION public.submit_public_review(p_provider_id uuid, p_reviewer_name text, p_reviewer_email text, p_rating numeric, p_body text, p_purchased boolean DEFAULT false, p_amount_paid_bracket text DEFAULT NULL::text, p_offer_url text DEFAULT NULL::text, p_instagram_handle text DEFAULT NULL::text, p_evidence_paths text[] DEFAULT '{}'::text[], p_strength_tier text DEFAULT 'basic'::text, p_offer_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing_id uuid;
  existing_status text;
  new_id uuid;
  clean_name text := trim(COALESCE(p_reviewer_name, ''));
  clean_email text := lower(trim(COALESCE(p_reviewer_email, '')));
  clean_body text := COALESCE(p_body, '');
  evidence text[] := COALESCE(p_evidence_paths, '{}'::text[]);
  matched_offer uuid;
  reviewer_uid uuid;
BEGIN
  IF p_provider_id IS NULL THEN RAISE EXCEPTION 'provider required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_provider_id) THEN
    RAISE EXCEPTION 'provider not found';
  END IF;
  IF public.profile_is_banned(p_provider_id) THEN
    RAISE EXCEPTION 'This provider is not accepting reviews at this time.';
  END IF;
  IF length(clean_email) = 0 OR clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'valid email required';
  END IF;
  reviewer_uid := public.profile_id_by_email(clean_email);
  IF reviewer_uid IS NOT NULL AND public.profile_is_banned(reviewer_uid) THEN
    RAISE EXCEPTION 'This account is not permitted to submit reviews.';
  END IF;
  IF length(clean_name) < 1 OR length(clean_name) > 80 THEN
    clean_name := COALESCE(NULLIF(trim(split_part(clean_email, '@', 1)), ''), 'Reviewer');
    clean_name := substring(clean_name for 80);
  END IF;
  IF length(clean_body) < 60 OR length(clean_body) > 4000 THEN
    RAISE EXCEPTION 'review body must be between 60 and 4000 characters';
  END IF;
  IF p_rating IS NULL OR p_rating < 0.5 OR p_rating > 5 OR (p_rating * 2) <> floor(p_rating * 2) THEN
    RAISE EXCEPTION 'rating must be between 0.5 and 5 in half-star steps';
  END IF;
  IF COALESCE(array_length(evidence, 1), 0) > 3 THEN
    RAISE EXCEPTION 'at most 3 evidence files allowed';
  END IF;

  IF p_offer_id IS NOT NULL THEN
    SELECT id INTO matched_offer
      FROM public.offers
     WHERE id = p_offer_id AND provider_id = p_provider_id;
    IF matched_offer IS NULL THEN
      RAISE EXCEPTION 'offer does not belong to this provider';
    END IF;
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
    provider_id, reviewer_name, reviewer_email, rating, body, status,
    purchased, amount_paid_bracket, offer_url, instagram_handle,
    evidence_paths, strength_tier, offer_id
  ) VALUES (
    p_provider_id, clean_name, clean_email, p_rating, clean_body, 'pending',
    COALESCE(p_purchased, false),
    NULLIF(trim(COALESCE(p_amount_paid_bracket, '')), ''),
    NULLIF(trim(COALESCE(p_offer_url, '')), ''),
    NULLIF(trim(COALESCE(p_instagram_handle, '')), ''),
    evidence,
    COALESCE(NULLIF(trim(COALESCE(p_strength_tier, '')), ''), 'basic'),
    matched_offer
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;
