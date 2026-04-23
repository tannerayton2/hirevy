-- 1. Extend offers table
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS cta_link text,
  ADD COLUMN IF NOT EXISTS cta_label text NOT NULL DEFAULT 'Book Now',
  ADD COLUMN IF NOT EXISTS secondary_link text,
  ADD COLUMN IF NOT EXISTS secondary_link_label text,
  ADD COLUMN IF NOT EXISTS offer_tier text,
  ADD COLUMN IF NOT EXISTS hosted_on_hirevy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS outbound_click_count integer NOT NULL DEFAULT 0;

-- Constrain offer_tier values
ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_offer_tier_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_offer_tier_check
  CHECK (offer_tier IS NULL OR offer_tier IN ('Entry','Mid','VIP'));

-- Constrain label lengths
ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_cta_label_len_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_cta_label_len_check
  CHECK (char_length(cta_label) BETWEEN 1 AND 24);

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_secondary_label_len_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_secondary_label_len_check
  CHECK (secondary_link_label IS NULL OR char_length(secondary_link_label) BETWEEN 1 AND 24);

-- 2. Create offer_clicks table
CREATE TABLE IF NOT EXISTS public.offer_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  clicked_by_user_id uuid,
  clicked_ip text,
  clicker_country text,
  referrer text,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_clicks_offer_time
  ON public.offer_clicks (offer_id, clicked_at DESC);

ALTER TABLE public.offer_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can log a click
DROP POLICY IF EXISTS "Anyone can log an offer click" ON public.offer_clicks;
CREATE POLICY "Anyone can log an offer click"
  ON public.offer_clicks
  FOR INSERT
  WITH CHECK (true);

-- Provider can read their own offer clicks
DROP POLICY IF EXISTS "Providers can read clicks on their offers" ON public.offer_clicks;
CREATE POLICY "Providers can read clicks on their offers"
  ON public.offer_clicks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id = offer_clicks.offer_id AND o.provider_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );

-- 3. Helper RPC: log a click + increment counter atomically
CREATE OR REPLACE FUNCTION public.record_offer_click(
  p_offer_id uuid,
  p_referrer text DEFAULT NULL,
  p_clicked_ip text DEFAULT NULL,
  p_clicker_country text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.offer_clicks (offer_id, clicked_by_user_id, clicked_ip, clicker_country, referrer)
  VALUES (p_offer_id, auth.uid(), p_clicked_ip, p_clicker_country, p_referrer);

  UPDATE public.offers
  SET outbound_click_count = outbound_click_count + 1
  WHERE id = p_offer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_offer_click(uuid, text, text, text) TO anon, authenticated;