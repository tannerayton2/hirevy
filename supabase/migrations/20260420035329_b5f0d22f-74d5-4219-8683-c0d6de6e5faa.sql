-- =========================================================
-- Proof-Backed Reviews: tables
-- =========================================================

CREATE TABLE public.proof_backed_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT NOT NULL,
  engagement_type TEXT NOT NULL CHECK (engagement_type IN (
    'paid_offer','free_exchange','consultation','group_or_course','other'
  )),
  engagement_started_month SMALLINT NOT NULL CHECK (engagement_started_month BETWEEN 1 AND 12),
  engagement_started_year SMALLINT NOT NULL CHECK (engagement_started_year BETWEEN 2000 AND 2100),
  engagement_ended_month SMALLINT CHECK (engagement_ended_month IS NULL OR engagement_ended_month BETWEEN 1 AND 12),
  engagement_ended_year SMALLINT CHECK (engagement_ended_year IS NULL OR engagement_ended_year BETWEEN 2000 AND 2100),
  engagement_ongoing BOOLEAN NOT NULL DEFAULT false,
  amount_paid_bracket TEXT CHECK (amount_paid_bracket IS NULL OR amount_paid_bracket IN (
    'free','under_500','500_2500','2500_10000','10000_plus','prefer_not_say'
  )),
  proof_file_paths TEXT[] NOT NULL DEFAULT '{}',
  proof_file_count INTEGER NOT NULL DEFAULT 0,
  is_disputed BOOLEAN NOT NULL DEFAULT false,
  disputed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT proof_backed_reviews_body_min_length CHECK (length(body) >= 100),
  CONSTRAINT proof_backed_reviews_body_max_length CHECK (length(body) <= 4000),
  CONSTRAINT proof_backed_reviews_name_length CHECK (length(reviewer_name) BETWEEN 1 AND 80),
  CONSTRAINT proof_backed_reviews_email_format CHECK (reviewer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT proof_backed_reviews_min_proof CHECK (array_length(proof_file_paths, 1) >= 2),
  CONSTRAINT proof_backed_reviews_max_proof CHECK (array_length(proof_file_paths, 1) <= 5),
  CONSTRAINT proof_backed_reviews_no_self_review CHECK (reviewer_user_id <> provider_id),
  CONSTRAINT proof_backed_reviews_unique_account_per_provider UNIQUE (provider_id, reviewer_user_id),
  CONSTRAINT proof_backed_reviews_unique_email_per_provider UNIQUE (provider_id, reviewer_email)
);

CREATE INDEX idx_proof_backed_reviews_provider_id ON public.proof_backed_reviews(provider_id, created_at DESC);

ALTER TABLE public.proof_backed_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proof-backed reviews are viewable by everyone"
  ON public.proof_backed_reviews FOR SELECT USING (true);

CREATE POLICY "Logged-in users can submit a proof-backed review"
  ON public.proof_backed_reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_user_id AND auth.uid() <> provider_id);

CREATE POLICY "Provider can mark their own review as disputed"
  ON public.proof_backed_reviews FOR UPDATE
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- =========================================================
-- Review replies (works for both review types, polymorphic)
-- =========================================================

CREATE TABLE public.review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('verified','proof_backed')),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT review_replies_unique_per_review UNIQUE (review_id, review_type)
);

CREATE INDEX idx_review_replies_lookup ON public.review_replies(review_type, review_id);

ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Replies are viewable by everyone"
  ON public.review_replies FOR SELECT USING (true);

CREATE POLICY "Provider can post a reply on their own reviews"
  ON public.review_replies FOR INSERT
  WITH CHECK (
    auth.uid() = provider_id
    AND (
      (review_type = 'verified' AND EXISTS (
        SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.provider_id = auth.uid()
      ))
      OR (review_type = 'proof_backed' AND EXISTS (
        SELECT 1 FROM public.proof_backed_reviews pr WHERE pr.id = review_id AND pr.provider_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Provider can update their own reply"
  ON public.review_replies FOR UPDATE
  USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Provider can delete their own reply"
  ON public.review_replies FOR DELETE
  USING (auth.uid() = provider_id);

CREATE TRIGGER review_replies_set_updated_at
  BEFORE UPDATE ON public.review_replies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- Admin disputes (formal removal requests)
-- =========================================================

CREATE TABLE public.admin_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('verified','proof_backed')),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 20 AND 4000),
  counter_evidence TEXT,
  contact_email TEXT NOT NULL CHECK (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved_kept','resolved_removed','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_disputes_status ON public.admin_disputes(status, created_at DESC);

ALTER TABLE public.admin_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider can submit a dispute on their own review"
  ON public.admin_disputes FOR INSERT
  WITH CHECK (
    auth.uid() = provider_id
    AND (
      (review_type = 'verified' AND EXISTS (
        SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.provider_id = auth.uid()
      ))
      OR (review_type = 'proof_backed' AND EXISTS (
        SELECT 1 FROM public.proof_backed_reviews pr WHERE pr.id = review_id AND pr.provider_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Provider can view their own disputes"
  ON public.admin_disputes FOR SELECT USING (auth.uid() = provider_id);

CREATE TRIGGER admin_disputes_set_updated_at
  BEFORE UPDATE ON public.admin_disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- Proof access requests (button + table only for now)
-- =========================================================

CREATE TABLE public.proof_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_review_id UUID NOT NULL REFERENCES public.proof_backed_reviews(id) ON DELETE CASCADE,
  requester_user_id UUID,
  requester_email TEXT,
  requester_message TEXT CHECK (requester_message IS NULL OR length(requester_message) <= 1000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT proof_access_requests_has_identifier CHECK (
    requester_user_id IS NOT NULL OR (requester_email IS NOT NULL AND requester_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  )
);

CREATE INDEX idx_proof_access_requests_review ON public.proof_access_requests(proof_review_id, created_at DESC);

ALTER TABLE public.proof_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a proof access request"
  ON public.proof_access_requests FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND requester_user_id = auth.uid())
    OR (auth.uid() IS NULL AND requester_email IS NOT NULL)
  );

CREATE POLICY "Reviewer can view requests for their reviews"
  ON public.proof_access_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.proof_backed_reviews pr
    WHERE pr.id = proof_review_id AND pr.reviewer_user_id = auth.uid()
  ));

-- =========================================================
-- Storage bucket for proof documents (PRIVATE)
-- =========================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proof-documents',
  'proof-documents',
  false,
  10485760, -- 10MB per file
  ARRAY[
    'image/png','image/jpeg','image/webp','image/gif','image/heic','image/heif',
    'application/pdf'
  ]
);

-- Files are stored under {auth.uid()}/{provider_id}/{filename}
-- Only the uploader (reviewer) can read/insert their own proof files.

CREATE POLICY "Reviewer can upload their own proof files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'proof-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Reviewer can read their own proof files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'proof-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Reviewer can delete their own proof files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'proof-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
