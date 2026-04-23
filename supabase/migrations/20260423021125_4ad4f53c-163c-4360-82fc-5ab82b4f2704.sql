-- Replace the legacy offers_check that required price_cents NOT NULL for all paid offers.
-- Rationale: 'contact' pricing has no numeric price; existing CHECK rejected it.
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_check;

-- Drop and re-add a per-pricing-model CHECK that:
--  - free_for_testimonial: price must be NULL, no max
--  - fixed/starting_at: price > 0, max NULL
--  - range: price > 0, max > price
--  - contact: both NULL
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_pricing_validity_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_pricing_validity_check CHECK (
    (free_for_testimonial = true AND price_cents IS NULL AND price_max_cents IS NULL)
    OR (free_for_testimonial = false AND pricing_model = 'fixed'       AND price_cents IS NOT NULL AND price_cents > 0 AND price_max_cents IS NULL)
    OR (free_for_testimonial = false AND pricing_model = 'starting_at' AND price_cents IS NOT NULL AND price_cents > 0 AND price_max_cents IS NULL)
    OR (free_for_testimonial = false AND pricing_model = 'range'       AND price_cents IS NOT NULL AND price_cents > 0 AND price_max_cents IS NOT NULL AND price_max_cents > price_cents)
    OR (free_for_testimonial = false AND pricing_model = 'contact'     AND price_cents IS NULL AND price_max_cents IS NULL)
  );