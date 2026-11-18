-- Aytopus Proof Score — the public proof card, private metrics, and score history.
-- Additive only: creates new tables, touches nothing that exists.
-- Uses the existing stripe_connections table (encrypted restricted keys) as the data source.

-- 1. The public card. Holds only what may be shown: score, tier, factor ratings,
--    and the headline numbers the coach chose to display.
create table if not exists public.proof_cards (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  record_no text not null unique,              -- e.g. AYT-0042
  slug text not null unique,                    -- e.g. K7Q2-9X → aytopus.com/v/K7Q2-9X
  score int,
  tier text check (tier in ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond')),
  status text not null default 'building' check (status in ('rated', 'building', 'paused')),
  factors jsonb not null default '[]'::jsonb,   -- [{key,label,question,band}] — ratings only, no raw numbers
  public_stats jsonb not null default '{}'::jsonb,
  show_stats text[] not null default array['clients', 'retention', 'refunds'],
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  paused_at timestamptz,
  score_version text not null default 'v1',
  first_rated_at timestamptz,
  synced_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 2. Raw metrics. PRIVATE: the coach and admins only.
create table if not exists public.proof_metrics_private (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  metrics jsonb not null,
  pillars jsonb not null,
  flags jsonb not null default '[]'::jsonb,
  computed_at timestamptz not null default now()
);

-- 3. Score history. Kept when a coach hides their card or disconnects,
--    so a bad stretch can't be erased by reconnecting.
create table if not exists public.proof_score_history (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  score int not null,
  tier text,
  status text not null,
  flags jsonb not null default '[]'::jsonb,
  computed_at timestamptz not null default now()
);
create index if not exists proof_score_history_owner_idx on public.proof_score_history (owner_id, computed_at desc);

-- Record numbers: AYT-0001, AYT-0002, …
create sequence if not exists public.proof_record_seq;
create or replace function public.proof_next_record_no() returns bigint
language sql security definer set search_path = public as $$ select nextval('public.proof_record_seq') $$;
revoke all on function public.proof_next_record_no() from public, anon, authenticated;

-- ---------- Row level security ----------
alter table public.proof_cards enable row level security;
alter table public.proof_metrics_private enable row level security;
alter table public.proof_score_history enable row level security;

-- Cards: anyone can read public cards; the owner and admins can always read.
create policy "proof cards public read" on public.proof_cards
  for select using (visibility = 'public' or owner_id = auth.uid() or public.is_admin(auth.uid()));

-- The owner may change ONLY visibility and which stats show. Scores are server-written.
create policy "proof cards owner update" on public.proof_cards
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
revoke insert, update, delete on public.proof_cards from anon, authenticated;
grant update (visibility, show_stats) on public.proof_cards to authenticated;

-- Private metrics and history: owner + admins only, read-only from the app.
create policy "proof metrics owner read" on public.proof_metrics_private
  for select using (owner_id = auth.uid() or public.is_admin(auth.uid()));
create policy "proof history owner read" on public.proof_score_history
  for select using (owner_id = auth.uid() or public.is_admin(auth.uid()));
revoke insert, update, delete on public.proof_metrics_private, public.proof_score_history from anon, authenticated;

-- Hiding a card is allowed, but it's recorded: going private stamps paused_at.
create or replace function public.proof_cards_stamp_pause() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.visibility = 'private' and old.visibility = 'public' then
    new.paused_at := now();
  elsif new.visibility = 'public' then
    new.paused_at := null;
  end if;
  return new;
end $$;
drop trigger if exists proof_cards_stamp_pause on public.proof_cards;
create trigger proof_cards_stamp_pause before update on public.proof_cards
  for each row execute function public.proof_cards_stamp_pause();
