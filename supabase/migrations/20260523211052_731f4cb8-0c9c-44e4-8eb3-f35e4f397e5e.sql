
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update their notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all notifications" ON public.notifications
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Admin broadcasts history
CREATE TABLE public.admin_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL,
  sender_id uuid NOT NULL,
  sent_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view broadcasts" ON public.admin_broadcasts
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: new follower
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  follower_username text;
BEGIN
  SELECT username INTO follower_username FROM public.profiles WHERE id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (NEW.following_id, 'follow',
    '@' || COALESCE(follower_username, 'someone') || ' started following you',
    '/@' || COALESCE(follower_username, ''));
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_on_follow AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Trigger: verified review
CREATE OR REPLACE FUNCTION public.notify_on_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  provider_username text;
BEGIN
  SELECT username INTO provider_username FROM public.profiles WHERE id = NEW.provider_id;
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (NEW.provider_id, 'review_received',
    '@' || COALESCE(NEW.reviewer_name, 'Someone') || ' left you a ' || round(NEW.rating)::text || '-star review. See what they said.',
    '/@' || COALESCE(provider_username, ''));
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_on_review AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_review();

-- Trigger: proof-backed review
CREATE OR REPLACE FUNCTION public.notify_on_proof_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  provider_username text;
BEGIN
  SELECT username INTO provider_username FROM public.profiles WHERE id = NEW.provider_id;
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (NEW.provider_id, 'review_received',
    '@' || COALESCE(NEW.reviewer_name, 'Someone') || ' left you a ' || round(NEW.rating)::text || '-star review. See what they said.',
    '/@' || COALESCE(provider_username, ''));
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_on_proof_review AFTER INSERT ON public.proof_backed_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_proof_review();

-- Trigger: new message
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t_user_a uuid; t_user_b uuid; recipient_id uuid; sender_username text;
BEGIN
  SELECT user_a, user_b INTO t_user_a, t_user_b FROM public.message_threads WHERE id = NEW.thread_id;
  IF t_user_a IS NULL THEN RETURN NEW; END IF;
  recipient_id := CASE WHEN NEW.sender_id = t_user_a THEN t_user_b ELSE t_user_a END;
  SELECT username INTO sender_username FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (recipient_id, 'message',
    '@' || COALESCE(sender_username, 'someone') || ' sent you a message',
    '/messages?t=' || NEW.thread_id::text);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_on_message AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

-- Trigger: tier reached (on points update)
CREATE OR REPLACE FUNCTION public.notify_on_tier_reached()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_tier text; tier_label text; flag_name text;
BEGIN
  IF NEW.points IS NULL OR NEW.points = OLD.points THEN RETURN NEW; END IF;
  new_tier := CASE
    WHEN NEW.points >= 500 THEN 'diamond'
    WHEN NEW.points >= 250 THEN 'platinum'
    WHEN NEW.points >= 100 THEN 'gold'
    WHEN NEW.points >= 40  THEN 'silver'
    WHEN NEW.points >= 10  THEN 'bronze'
    ELSE 'unranked'
  END;
  IF new_tier = 'unranked' THEN RETURN NEW; END IF;
  flag_name := 'tier_up_' || new_tier;
  IF EXISTS (SELECT 1 FROM public.user_notification_flags WHERE user_id = NEW.id AND user_notification_flags.flag_name = flag_name) THEN
    RETURN NEW;
  END IF;
  tier_label := initcap(new_tier);
  INSERT INTO public.user_notification_flags (user_id, flag_name) VALUES (NEW.id, flag_name);
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (NEW.id, 'tier_reached',
    'You reached ' || tier_label || '! Keep collecting reviews to level up.',
    '/@' || NEW.username);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_on_tier_reached AFTER UPDATE OF points ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_tier_reached();

-- Trigger: claim approved
CREATE OR REPLACE FUNCTION public.notify_on_claim_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (NEW.profile_id, 'claim_approved',
      'Your profile claim was approved. Welcome to HireVy.',
      '/me');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_on_claim_approved AFTER UPDATE ON public.claims_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_claim_approved();

-- Admin broadcast RPC
CREATE OR REPLACE FUNCTION public.admin_broadcast_notification(p_title text, p_body text, p_type text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  count_inserted integer := 0;
  full_message text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(coalesce(p_title,'')) = 0 OR length(coalesce(p_body,'')) = 0 THEN
    RAISE EXCEPTION 'title and body required';
  END IF;
  full_message := p_title || E'\n' || p_body;

  WITH ins AS (
    INSERT INTO public.notifications (user_id, type, message, link)
    SELECT p.id, p_type, full_message, NULL FROM public.profiles p
    RETURNING 1
  )
  SELECT count(*) INTO count_inserted FROM ins;

  INSERT INTO public.admin_broadcasts (title, body, type, sender_id, sent_count)
  VALUES (p_title, p_body, p_type, auth.uid(), count_inserted);

  RETURN count_inserted;
END; $$;
