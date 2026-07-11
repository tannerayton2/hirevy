
-- Reject unsafe URL schemes on offer outbound links at DB level.
-- Allow NULL / empty, otherwise require http(s) scheme.
ALTER TABLE public.offers
  ADD CONSTRAINT offers_cta_link_scheme_check
  CHECK (
    cta_link IS NULL
    OR cta_link = ''
    OR cta_link ~* '^https?://'
  );

ALTER TABLE public.offers
  ADD CONSTRAINT offers_secondary_link_scheme_check
  CHECK (
    secondary_link IS NULL
    OR secondary_link = ''
    OR secondary_link ~* '^https?://'
  );
