-- Pinned review on profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pinned_review_id uuid;

-- Pinned offer flag
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

-- Only one pinned offer per provider (DB-level enforcement)
CREATE UNIQUE INDEX IF NOT EXISTS offers_one_pinned_per_provider
  ON public.offers (provider_id)
  WHERE is_pinned = true;

-- Helpful index for fetching pinned offer
CREATE INDEX IF NOT EXISTS offers_provider_pinned_idx
  ON public.offers (provider_id, is_pinned);
