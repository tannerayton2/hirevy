-- Add pricing flexibility to offers
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS price_max_cents integer NULL;

-- Constrain pricing_model to known values
ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_pricing_model_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_pricing_model_check
  CHECK (pricing_model IN ('fixed', 'starting_at', 'range', 'contact'));

-- Backfill: existing offers default to 'fixed' (handled by DEFAULT). Free-for-testimonial offers
-- keep 'fixed' as well; their price is implied to be 0/null and free flag still wins in UI.
UPDATE public.offers SET pricing_model = 'fixed' WHERE pricing_model IS NULL;