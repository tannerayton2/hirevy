# Aytopus Proof Score — v1

Turns a coach's real Stripe payment data into a 0–1000 score, a tier (Bronze → Diamond), and the ratings on their public proof card (`/v/:slug`). Built to expose bad coaches, not just reward good ones.

Files:
- `benchmarks.ts` — every good/bad number in one place. Tune here.
- `score.ts` — the engine: metrics → score → tier → red flags.
- `stripe.ts` — turns Stripe charges/disputes/subscriptions into engine input.
- `types.ts` — data shapes.
- `test/` — sample coaches (good and bad) and Stripe translation checks. Run `npm run test:score`.

Used by `supabase/functions/proof-sync` (scores a coach) and `connect-stripe` (stores the coach's encrypted restricted key and runs the first score).

## How the score works (plain English)

**Four parts:**

| Part | Weight | What it asks |
|---|---|---|
| Satisfaction | 40% | Did clients ask for, or fight for, their money back? (chargebacks 45%, refunds 35%, verified reviews 20%) |
| Retention | 30% | Did clients keep paying? Uses whichever fits the business: monthly retention at 90 days, payment-plan completion, or repeat purchases |
| Client base | 15% | How many real, unique people paid. Log scale, so 2,000 clients doesn't bury 200 |
| Track record | 15% | Months of data, and steady month-to-month sales vs. one big launch |

**Good vs. bad numbers** (`benchmarks.ts`):

| Metric | Excellent | Warning | Bad | Why |
|---|---|---|---|---|
| Chargebacks (per payment) | under 0.3% | 1% | 1.5%+ | Visa flags US merchants as "excessive" at 1.5% (since Apr 2026). Info products publicly run 1–4.8% |
| Clients refunded or disputed | under 3% | 12% | 20%+ | Mid-ticket courses usually see 5–10%. 20%+ is guru-funnel territory |
| Still paying at day 90 | 85%+ | 40% | under 25% | Estimate. No solid public benchmark for coaching |
| Payment plans paid off | 97%+ | 70% | under 55% | Estimate. Abandoned plans are the clearest scam signal |

The last two are reasoned estimates. Once 30+ real coaches are connected, recalibrate from real data.

**Tricks it catches:**
- **"No refunds" policies.** A client who files a chargeback counts the same as a refunded client, so a 0% refund rate can't hide anything.
- **Paying yourself.** The coach's own card (matched by account email) is excluded, and payers under $25 don't count as clients.
- **One person, many accounts.** Clients are matched by card fingerprint, so one person with three customer records counts once.
- **Tiny samples.** A coach with 4 clients and zero refunds gets pulled toward average until the data is real. No tier until 10+ clients and 3+ months.
- **Fresh start.** One Stripe account can belong to only one coach, and score history is never deleted.
- **Hiding a bad card.** A coach can make the card private, but that records a "paused" date, and the numbers can never be edited.

**Red flags cap the tier no matter what else looks good:**

| Flag | Max tier |
|---|---|
| Chargebacks 1.5%+ (3+ disputes) | Silver |
| Chargebacks 1%+ (3+ disputes) | Gold |
| 20%+ of clients refunded (20+ clients) | Silver |
| Under 40% of payment plans paid off | Silver |
| Under 55% of payment plans paid off | Gold |
| One month where 25%+ of new clients were refunded | Gold |

Diamond also needs 12+ months and 50+ clients.

**Test results** (`node --experimental-strip-types test/coaches.test.ts`):

| Sample coach | Score | Tier |
|---|---|---|
| Great coach (monthly, steady) | 879 | Platinum |
| Solid course seller | 732 | Gold |
| Guru funnel (launches, 30% refunds) | 440 | Silver, 3 flags |
| No-refund policy (chargebacks instead) | 592 | Silver, flagged |
| Installment dropouts (71% abandon) | 599 | Silver, flagged |
| New honest coach (6 clients) | — | Building |
| Self-payer (own card + $5 "clients") | — | Building, only 8 real clients counted |


## How it runs
1. Coach pastes a Stripe restricted key with Read access to Charges, Disputes, Subscriptions and Invoices (`/settings/proof`).
2. `connect-stripe` checks those permissions, stores the key encrypted, and calls `proof-sync`.
3. `proof-sync` pulls ~15 months of data, scores it, and writes `proof_cards` (public), `proof_metrics_private` (owner + admins), and `proof_score_history`.
4. Cards refresh themselves when viewed if they're over a day old. Coaches can refresh manually every 10 minutes.
5. If the key stops working or the coach disconnects, the card shows **Paused**. History is never deleted.

## Still open
- Daily re-score for every coach needs `pg_cron` + `pg_net` (not enabled yet). Until then, cards refresh when viewed.
- Other processors (PayPal, Whop…) each need an adapter like `stripe.ts`.
- Benchmarks are v1. Recalibrate once 30+ real coaches are connected, then move to per-niche percentiles.
