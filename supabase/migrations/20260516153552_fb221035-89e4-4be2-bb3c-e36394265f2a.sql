
-- Add unclaimed flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_claimed boolean NOT NULL DEFAULT true;

-- Claim requests table
CREATE TABLE IF NOT EXISTS public.claims_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  full_name text NOT NULL,
  phone text,
  email text NOT NULL,
  verification_method text NOT NULL,
  verification_value text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.claims_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a claim request"
ON public.claims_requests
FOR INSERT
WITH CHECK (
  length(full_name) BETWEEN 1 AND 200
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND verification_method IN ('instagram','website','email')
);

CREATE POLICY "Admins can view claim requests"
ON public.claims_requests
FOR SELECT
USING (public.is_admin(auth.uid()));
