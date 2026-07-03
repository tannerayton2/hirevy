CREATE OR REPLACE FUNCTION public.notify_on_claim_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (NEW.profile_id, 'claim_approved',
      'Your profile claim was approved. Welcome to Aytopus.',
      '/me');
  END IF;
  RETURN NEW;
END; $function$;
