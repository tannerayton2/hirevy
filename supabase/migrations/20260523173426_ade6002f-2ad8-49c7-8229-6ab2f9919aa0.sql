
CREATE TABLE public.profile_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reported_profile_id uuid NOT NULL,
  reporter_user_id uuid,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a profile report"
ON public.profile_reports
FOR INSERT
WITH CHECK (
  reason = ANY (ARRAY['fake_or_impersonation','spam','inappropriate_content','other'])
  AND length(coalesce(details,'')) <= 2000
  AND (
    (auth.uid() IS NOT NULL AND reporter_user_id = auth.uid())
    OR (auth.uid() IS NULL AND reporter_user_id IS NULL)
  )
);

CREATE POLICY "Admins can view profile reports"
ON public.profile_reports
FOR SELECT
USING (public.is_admin(auth.uid()));
