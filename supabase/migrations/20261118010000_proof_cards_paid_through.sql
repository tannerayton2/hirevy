-- The business name payments go to, taken from Stripe (not typed by the coach).
alter table public.proof_cards add column if not exists paid_through text;
