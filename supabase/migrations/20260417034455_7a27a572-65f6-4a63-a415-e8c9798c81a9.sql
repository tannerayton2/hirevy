-- =========================================
-- HireVy initial schema
-- =========================================

-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  service_category TEXT,
  about_what TEXT,
  about_who TEXT,
  about_results TEXT,
  -- denormalised counters (kept current via triggers)
  review_count INT NOT NULL DEFAULT 0,
  rating_sum INT NOT NULL DEFAULT 0,
  follower_count INT NOT NULL DEFAULT 0,
  -- subscription scaffolding for future paid tiers
  plan TEXT NOT NULL DEFAULT 'free',
  paid_offer_limit INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9-]{3,30}$')
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup (username derived; user picks real one in onboarding)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  i INT := 0;
BEGIN
  base := lower(regexp_replace(coalesce(split_part(NEW.email,'@',1),'user'), '[^a-z0-9-]', '', 'g'));
  IF length(base) < 3 THEN base := 'user' || substr(NEW.id::text,1,6); END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    i := i + 1;
    candidate := base || '-' || i;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    candidate,
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', candidate),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tier helper (read-only)
CREATE OR REPLACE FUNCTION public.tier_for_review_count(c INT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN c >= 100 THEN 'diamond'
    WHEN c >= 50  THEN 'platinum'
    WHEN c >= 25  THEN 'gold'
    WHEN c >= 10  THEN 'silver'
    WHEN c >= 1   THEN 'bronze'
    ELSE 'unranked'
  END;
$$;

-- =========================================
-- OFFERS
-- =========================================
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  price_cents INT,                      -- null when free_for_testimonial
  free_for_testimonial BOOLEAN NOT NULL DEFAULT false,
  cover_url TEXT,
  video_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 0,      -- for future paid placement
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, slug),
  CHECK (
    (free_for_testimonial = true  AND price_cents IS NULL) OR
    (free_for_testimonial = false AND price_cents IS NOT NULL AND price_cents >= 0)
  ),
  CHECK (array_length(tags,1) IS NULL OR array_length(tags,1) <= 10)
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active offers are viewable by everyone"
  ON public.offers FOR SELECT USING (is_active = true OR auth.uid() = provider_id);
CREATE POLICY "Providers can insert their own offers"
  ON public.offers FOR INSERT WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "Providers can update their own offers"
  ON public.offers FOR UPDATE USING (auth.uid() = provider_id);
CREATE POLICY "Providers can delete their own offers"
  ON public.offers FOR DELETE USING (auth.uid() = provider_id);

CREATE INDEX idx_offers_active ON public.offers(is_active, created_at DESC);
CREATE INDEX idx_offers_category ON public.offers(category);
CREATE INDEX idx_offers_provider ON public.offers(provider_id);
CREATE INDEX idx_offers_tags ON public.offers USING GIN(tags);
CREATE INDEX idx_offers_search ON public.offers USING GIN (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
);

CREATE TRIGGER offers_updated_at BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- REVIEWS (public submission, no account required)
-- =========================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, reviewer_email)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can read; reviewer_email is sensitive but kept on row for spam control.
-- We expose a public-safe view below to avoid leaking emails.
CREATE POLICY "Reviews can be inserted by anyone (public link)"
  ON public.reviews FOR INSERT WITH CHECK (true);
-- No public SELECT policy: clients read via the public_reviews view (security_invoker=off).
-- Provider can read their own reviews including emails.
CREATE POLICY "Providers can read their own reviews"
  ON public.reviews FOR SELECT USING (auth.uid() = provider_id);

CREATE INDEX idx_reviews_provider ON public.reviews(provider_id, created_at DESC);

-- Public-safe reviews view (no email exposed)
CREATE VIEW public.public_reviews
WITH (security_invoker = false) AS
SELECT id, provider_id, reviewer_name, rating, body, created_at
FROM public.reviews;
GRANT SELECT ON public.public_reviews TO anon, authenticated;

-- Maintain profile counters
CREATE OR REPLACE FUNCTION public.reviews_after_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
  SET review_count = review_count + 1,
      rating_sum   = rating_sum + NEW.rating
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reviews_after_insert AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.reviews_after_insert();

-- =========================================
-- FOLLOWS
-- =========================================
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows are public" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow"   ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

CREATE OR REPLACE FUNCTION public.follows_after_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
  RETURN NEW;
END;$$;
CREATE OR REPLACE FUNCTION public.follows_after_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.following_id;
  RETURN OLD;
END;$$;
CREATE TRIGGER follows_after_insert AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.follows_after_insert();
CREATE TRIGGER follows_after_delete AFTER DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.follows_after_delete();

-- =========================================
-- MESSAGES (1:1 DMs)
-- =========================================
CREATE TABLE public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read threads"
  ON public.message_threads FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Participants can create threads"
  ON public.message_threads FOR INSERT WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Participants can update threads"
  ON public.message_threads FOR UPDATE USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read messages"
  ON public.messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.message_threads t
      WHERE t.id = messages.thread_id AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
    )
  );
CREATE POLICY "Sender can insert messages in their threads"
  ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.message_threads t
      WHERE t.id = messages.thread_id AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
    )
  );

CREATE INDEX idx_messages_thread ON public.messages(thread_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.bump_thread_after_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.message_threads SET last_message_at = NEW.created_at WHERE id = NEW.thread_id;
  RETURN NEW;
END;$$;
CREATE TRIGGER messages_bump_thread AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_thread_after_message();

-- Helper: get_or_create_thread (canonicalises user_a < user_b)
CREATE OR REPLACE FUNCTION public.get_or_create_thread(other_user UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me UUID := auth.uid();
  ua UUID;
  ub UUID;
  tid UUID;
BEGIN
  IF me IS NULL OR other_user IS NULL OR me = other_user THEN
    RAISE EXCEPTION 'invalid participants';
  END IF;
  IF me < other_user THEN ua := me; ub := other_user; ELSE ua := other_user; ub := me; END IF;
  SELECT id INTO tid FROM public.message_threads WHERE user_a = ua AND user_b = ub;
  IF tid IS NULL THEN
    INSERT INTO public.message_threads (user_a, user_b) VALUES (ua, ub) RETURNING id INTO tid;
  END IF;
  RETURN tid;
END;$$;

-- =========================================
-- STORAGE BUCKETS
-- =========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars',true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('offer-covers','offer-covers',true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read offer covers" ON storage.objects FOR SELECT USING (bucket_id = 'offer-covers');
CREATE POLICY "Users upload own offer covers" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'offer-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own offer covers" ON storage.objects FOR UPDATE
  USING (bucket_id = 'offer-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own offer covers" ON storage.objects FOR DELETE
  USING (bucket_id = 'offer-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
