
ALTER TABLE public.unclaimed_reviews
  ADD COLUMN IF NOT EXISTS unmatched_link text,
  ADD COLUMN IF NOT EXISTS unmatched_description text,
  ADD COLUMN IF NOT EXISTS needs_profile boolean NOT NULL DEFAULT false;

CREATE POLICY "Admins can update unclaimed reviews"
ON public.unclaimed_reviews
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
