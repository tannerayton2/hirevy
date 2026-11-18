// Sample coaches, good and bad. Run: node --experimental-strip-types test/coaches.test.ts
import assert from "node:assert/strict";
import { scoreCoach } from "../score.ts";
import type { CoachInput, NormCharge, NormPlan } from "../types.ts";

const DAY = 86400;
const NOW = Date.UTC(2026, 10, 17) / 1000;

// Deterministic random numbers so results never change between runs.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

interface Recipe {
  seed: number;
  clients: number;
  months: number; // how far back the business goes
  kind: "subscription" | "installment" | "one_time";
  price: number; // cents per payment
  payments?: number; // installment count
  refundP: number; // chance a client gets a full refund
  disputeP: number; // chance per charge of a dispute
  disputeReason?: string;
  retention90?: number; // subscriptions: chance a client is still paying at day 90
  completeP?: number; // installments: chance a plan is paid off
  repeatP?: number; // one-time: chance of buying again
  launchMonths?: number[]; // months-ago that most clients arrive in (launches)
  reviews?: { count: number; avg: number };
}

function build(r: Recipe): CoachInput {
  const rand = rng(r.seed);
  const charges: NormCharge[] = [];
  const plans: NormPlan[] = [];
  let id = 0;
  for (let i = 0; i < r.clients; i++) {
    const client = `fp_${r.seed}_${i}`;
    const monthsAgo = r.launchMonths && rand() < 0.8
      ? r.launchMonths[Math.floor(rand() * r.launchMonths.length)] + rand()
      : rand() * r.months;
    const start = NOW - monthsAgo * 30.44 * DAY;
    const refunded = rand() < r.refundP;
    const charge = (t: number, planId?: string): NormCharge => {
      const disputed = rand() < r.disputeP;
      return {
        id: `ch_${id++}`, clientKey: client, amount: r.price, created: Math.floor(t),
        refunded: refunded && t === start ? r.price : 0, disputed,
        disputeReason: disputed ? (r.disputeReason ?? "product_unacceptable") : undefined,
        disputeStatus: disputed ? "lost" : undefined, kind: r.kind, planId,
      };
    };
    if (r.kind === "subscription") {
      const planId = `sub_${i}`;
      const stays = rand() < (r.retention90 ?? 0.5);
      const lifeDays = refunded ? 20 : stays ? 90 + rand() * 300 : 25 + rand() * 60;
      const end = start + lifeDays * DAY;
      plans.push({ id: planId, clientKey: client, kind: "subscription", start, endedAt: end < NOW ? end : undefined, intervalDays: 30 });
      for (let t = start; t < Math.min(end, NOW); t += 30 * DAY) charges.push(charge(t, planId));
    } else if (r.kind === "installment") {
      const planId = `plan_${i}`;
      const n = r.payments ?? 6;
      const paysOff = !refunded && rand() < (r.completeP ?? 0.85);
      const paid = paysOff ? n : 1 + Math.floor(rand() * (n - 1));
      plans.push({ id: planId, clientKey: client, kind: "installment", start, totalPayments: n, intervalDays: 30,
        endedAt: paid < n ? start + paid * 30 * DAY : undefined });
      for (let p = 0; p < paid; p++) { const t = start + p * 30 * DAY; if (t <= NOW) charges.push(charge(t, planId)); }
    } else {
      charges.push(charge(start));
      if (rand() < (r.repeatP ?? 0) && start + 150 * DAY < NOW) charges.push(charge(start + (30 + rand() * 120) * DAY));
    }
  }
  return { now: NOW, charges, plans, ownClientKeys: [], reviews: r.reviews, lastSyncAt: NOW - 3600 };
}

const coaches: Record<string, CoachInput> = {
  "Great coach (monthly, steady)": build({ seed: 1, clients: 180, months: 18, kind: "subscription", price: 30000, refundP: 0.02, disputeP: 0.002, retention90: 0.78, reviews: { count: 31, avg: 4.9 } }),
  "Solid course seller (one-time)": build({ seed: 2, clients: 140, months: 14, kind: "one_time", price: 50000, refundP: 0.05, disputeP: 0.004, repeatP: 0.25, reviews: { count: 12, avg: 4.6 } }),
  "Guru funnel (launches, high refunds)": build({ seed: 3, clients: 400, months: 12, kind: "one_time", price: 200000, refundP: 0.24, disputeP: 0.025, disputeReason: "product_not_received", launchMonths: [2, 7], reviews: { count: 4, avg: 3.2 } }),
  "No-refund policy (chargebacks instead)": build({ seed: 4, clients: 120, months: 12, kind: "installment", price: 50000, payments: 6, refundP: 0, disputeP: 0.02, completeP: 0.55 }),
  "Installment dropouts": build({ seed: 5, clients: 90, months: 15, kind: "installment", price: 80000, payments: 4, refundP: 0.04, disputeP: 0.005, completeP: 0.4 }),
  "New honest coach (6 clients)": build({ seed: 6, clients: 6, months: 2, kind: "subscription", price: 25000, refundP: 0, disputeP: 0, retention90: 1 }),
};

// Self-payer: 8 real clients, plus his own card and a pile of $5 "client" payments.
const selfPayer = build({ seed: 7, clients: 8, months: 6, kind: "one_time", price: 40000, refundP: 0, disputeP: 0 });
for (let i = 0; i < 60; i++) selfPayer.charges.push({ id: `fake_${i}`, clientKey: `friend_${i}`, amount: 500, refunded: 0, created: NOW - i * DAY, disputed: false, kind: "one_time" });
for (let i = 0; i < 20; i++) selfPayer.charges.push({ id: `own_${i}`, clientKey: "coach_own_card", amount: 100000, refunded: 0, created: NOW - i * 5 * DAY, disputed: false, kind: "one_time" });
selfPayer.ownClientKeys = ["coach_own_card"];
coaches["Self-payer (fake clients)"] = selfPayer;

const rows: Array<Record<string, string | number>> = [];
const results: Record<string, ReturnType<typeof scoreCoach>> = {};
for (const [name, input] of Object.entries(coaches)) {
  const r = scoreCoach(input);
  results[name] = r;
  const m = r.metrics;
  rows.push({
    coach: name,
    score: r.score,
    tier: r.tier ?? `— (${r.status})`,
    clients: m.clients,
    refunds: pct(m.refundRate),
    chargebacks: pct(m.chargebackRate, 2),
    retain90: m.retention90 === null ? "—" : pct(m.retention90),
    plansPaid: m.planCompletion === null ? "—" : pct(m.planCompletion),
    flags: r.flags.map((f) => f.code).join(", ") || "—",
  });
}
console.table(rows);
for (const [name, r] of Object.entries(results)) {
  console.log(`\n${name}: ` + r.factors.map((f) => `${f.label} = ${f.band}`).join(" · "));
}

function pct(x: number, d = 1) {
  return (x * 100).toFixed(d) + "%";
}

// ---- The checks that matter: bad coaches must be exposed. ----
const s = (n: string) => results[n];
assert.ok(["Platinum", "Diamond"].includes(s("Great coach (monthly, steady)").tier!), "great coach should be Platinum+");
assert.ok(s("Solid course seller (one-time)").score >= 600, "solid seller should be Gold+");
assert.ok(s("Guru funnel (launches, high refunds)").score < 600, "guru funnel must stay below Gold");
assert.ok(s("Guru funnel (launches, high refunds)").flags.some((f) => f.code === "chargebacks_over_network_limit"));
assert.ok(s("No-refund policy (chargebacks instead)").score < 600, "no-refund policy can't hide behind 0% refunds");
assert.ok(s("Installment dropouts").flags.some((f) => f.code.startsWith("payment_plans")));
assert.ok(s("Installment dropouts").score < 600, "71% of plans abandoned must stay below Gold");
assert.equal(s("New honest coach (6 clients)").tier, null, "too little data for a tier");
assert.equal(s("Self-payer (fake clients)").metrics.clients, 8, "own card and $5 payments must not count");
assert.ok(s("Great coach (monthly, steady)").score > s("Solid course seller (one-time)").score);
console.log("\nAll checks passed.");
