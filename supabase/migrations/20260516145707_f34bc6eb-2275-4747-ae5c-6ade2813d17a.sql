create table if not exists public.unclaimed_reviews (
  id uuid primary key default gen_random_uuid(),
  coach_name text not null,
  instagram_handle text,
  offer_url text,
  rating smallint not null check (rating between 1 and 5),
  body text not null,
  purchased boolean not null default false,
  amount_paid_bracket text,
  evidence_paths text[] not null default '{}',
  strength_tier text not null default 'basic',
  reviewer_email text not null,
  created_at timestamptz not null default now()
);

alter table public.unclaimed_reviews enable row level security;

create policy "Unclaimed reviews are viewable by everyone"
  on public.unclaimed_reviews for select using (true);

create policy "Anyone can submit an unclaimed review"
  on public.unclaimed_reviews for insert
  with check (
    length(coach_name) between 1 and 120
    and length(body) between 50 and 4000
    and reviewer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and rating between 1 and 5
    and coalesce(array_length(evidence_paths, 1), 0) <= 3
  );

create table if not exists public.marketplace_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.marketplace_waitlist enable row level security;

create policy "Anyone can join the waitlist"
  on public.marketplace_waitlist for insert
  with check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

insert into storage.buckets (id, name, public)
values ('review-evidence', 'review-evidence', true)
on conflict (id) do nothing;

create policy "Public read review evidence"
  on storage.objects for select
  using (bucket_id = 'review-evidence');

create policy "Anyone can upload review evidence"
  on storage.objects for insert
  with check (bucket_id = 'review-evidence');