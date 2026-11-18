-- Re-score public proof cards twice a day (3:17am / 3:17pm ET). Uses the same public
-- refresh a visitor triggers, so no secrets live in the schedule. proof-sync itself
-- skips any card refreshed in the last 24 hours.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'proof-cards-daily-rescore',
  '17 8,20 * * *',
  $$
  select net.http_post(
    url := 'https://xmxzjdgkckibedfhozyn.supabase.co/functions/v1/proof-sync',
    body := jsonb_build_object('slug', slug),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 60000
  )
  from public.proof_cards
  where visibility = 'public'
    and (synced_at is null or synced_at < now() - interval '23 hours');
  $$
);
