DROP POLICY IF EXISTS "Anyone can log an offer click" ON public.offer_clicks;

CREATE POLICY "Anyone can log a click on an existing offer"
  ON public.offer_clicks
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_clicks.offer_id)
  );