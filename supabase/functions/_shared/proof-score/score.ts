import type { Band, CoachInput, Flag, NormCharge, Tier } from "./types.ts";
import { ANCHORS, PRIOR, PRIOR_STRENGTH, RULES, TIERS, WEIGHTS, interpolate, shrink } from "./benchmarks.ts";

export const SCORE_VERSION = "v1";
const DAY = 86400;

/** Raw numbers. PRIVATE: stored for the coach and admins, never shown publicly in full. */
export interface Metrics {
  clients: number;
  charges: number;
  disputes: number;
  chargebackRate: number;
  refundRate: number;
  retention90: number | null;
  retentionCohort: number;
  earlyChurn: number | null;
  earlyChurnCohort: number;
  planCompletion: number | null;
  planCohort: number;
  repeatRate: number | null;
  repeatCohort: number;
  monthsOnRecord: number;
  launchSpike: number | null;
  reviewAvg: number | null;
  reviewCount: number;
}

export interface Factor {
  key: string;
  label: string;
  question: string;
  band: Band;
  /** 0–100 after small-sample blending. Not shown publicly. */
  subScore: number;
}

export interface ScoreResult {
  version: string;
  score: number;
  /** null while the coach doesn't have enough data yet. */
  tier: Tier | null;
  status: "rated" | "building" | "paused";
  factors: Factor[];
  flags: Flag[];
  metrics: Metrics;
  pillars: { satisfaction: number; retention: number; clientBase: number; trackRecord: number };
}

// ---------- metrics ----------

export function computeMetrics(input: CoachInput): Metrics {
  const { now } = input;
  const windowStart = now - RULES.windowDays * DAY;
  const own = new Set(input.ownClientKeys);

  const charges = input.charges.filter((c) => c.created >= windowStart && c.created <= now && !own.has(c.clientKey));

  // Clients = distinct payers who paid at least the minimum.
  const byClient = new Map<string, NormCharge[]>();
  for (const c of charges) {
    const list = byClient.get(c.clientKey) ?? [];
    list.push(c);
    byClient.set(c.clientKey, list);
  }
  const clientKeys = [...byClient.keys()].filter(
    (k) => byClient.get(k)!.reduce((s, c) => s + c.amount, 0) >= RULES.minClientCents,
  );
  const clientSet = new Set(clientKeys);
  const counted = charges.filter((c) => clientSet.has(c.clientKey));

  // Chargebacks: weighted disputes / charges (card networks measure per transaction).
  const disputeWeight = counted.filter((c) => c.disputed).reduce((s, c) => s + RULES.disputeWeight(c.disputeReason, c.disputeStatus), 0);
  const chargebackRate = counted.length ? disputeWeight / counted.length : 0;

  // Refunds: share of clients who got money back (half credit for small partial refunds).
  let refundScore = 0;
  for (const k of clientKeys) {
    const list = byClient.get(k)!;
    const paid = list.reduce((s, c) => s + c.amount, 0);
    const back = list.reduce((s, c) => s + c.refunded, 0);
    const share = paid ? back / paid : 0;
    if (share >= RULES.fullRefundShare) refundScore += 1;
    // A client who disputed instead of getting a refund is still a client who wanted
    // their money back. This is what stops "no refunds" policies from looking perfect.
    else if (list.some((c) => c.disputed)) refundScore += 1;
    else if (share >= RULES.partialRefundShare) refundScore += 0.5;
  }
  const refundRate = clientKeys.length ? refundScore / clientKeys.length : 0;

  // Successful (not mostly-refunded) payments per plan.
  const goodPaymentsByPlan = new Map<string, number>();
  for (const c of input.charges) {
    if (!c.planId || own.has(c.clientKey)) continue;
    if (c.refunded >= c.amount * RULES.fullRefundShare) continue;
    goodPaymentsByPlan.set(c.planId, (goodPaymentsByPlan.get(c.planId) ?? 0) + 1);
  }

  const plans = input.plans.filter((p) => !own.has(p.clientKey) && p.start >= windowStart - 90 * DAY);

  // Retention: subscriptions old enough to judge — still paying at day 90?
  const subs90 = firstPerClient(plans.filter((p) => p.kind === "subscription" && p.start <= now - 90 * DAY));
  const retained = subs90.filter((p) => p.endedAt === undefined || p.endedAt >= p.start + 90 * DAY).length;

  // Early churn: subscriptions 60+ days old that ended with one payment or fewer.
  const subs60 = firstPerClient(plans.filter((p) => p.kind === "subscription" && p.start <= now - 60 * DAY));
  const churnedEarly = subs60.filter((p) => p.endedAt !== undefined && (goodPaymentsByPlan.get(p.id) ?? 0) <= 1).length;

  // Plan completion: installment plans whose last payment is due (10-day grace) — fully paid?
  const duePlans = plans.filter(
    (p) => p.kind === "installment" && p.totalPayments && p.start + p.totalPayments * p.intervalDays * DAY <= now - 10 * DAY,
  );
  const completed = duePlans.filter((p) => (goodPaymentsByPlan.get(p.id) ?? 0) >= (p.totalPayments ?? 0)).length;

  // Repeat purchase: one-time buyers 120+ days in — did they buy again?
  const oneTimeFirst = new Map<string, number>();
  for (const c of counted) {
    if (c.kind !== "one_time") continue;
    const prev = oneTimeFirst.get(c.clientKey);
    if (prev === undefined || c.created < prev) oneTimeFirst.set(c.clientKey, c.created);
  }
  const repeatEligible = [...oneTimeFirst.entries()].filter(([, t]) => t <= now - 120 * DAY);
  const repeated = repeatEligible.filter(([k, t]) => byClient.get(k)!.some((c) => c.created >= t + 7 * DAY)).length;

  // Track record: months between first and last counted payment (all-time, not just the window).
  const allTimes = input.charges.filter((c) => !own.has(c.clientKey)).map((c) => c.created);
  const monthsOnRecord = allTimes.length ? (Math.min(now, Math.max(...allTimes)) - Math.min(...allTimes)) / (30.44 * DAY) : 0;

  // Launch spike: the busiest 30-day stretch's share of all new clients in the window.
  // Use each client's true first-ever payment, so long-time subscribers don't all look "new" at the window start.
  const firstEver = new Map<string, number>();
  for (const c of input.charges) firstEver.set(c.clientKey, Math.min(firstEver.get(c.clientKey) ?? Infinity, c.created));
  const firsts = clientKeys.map((k) => firstEver.get(k)!).filter((t) => t >= windowStart).sort((a, b) => a - b);
  let busiest = 0;
  for (let i = 0, j = 0; i < firsts.length; i++) {
    while (firsts[i] - firsts[j] > 30 * DAY) j++;
    busiest = Math.max(busiest, i - j + 1);
  }
  const launchSpike = firsts.length >= 20 ? busiest / firsts.length : null;

  return {
    clients: clientKeys.length,
    charges: counted.length,
    disputes: counted.filter((c) => c.disputed).length,
    chargebackRate,
    refundRate,
    retention90: subs90.length ? retained / subs90.length : null,
    retentionCohort: subs90.length,
    earlyChurn: subs60.length ? churnedEarly / subs60.length : null,
    earlyChurnCohort: subs60.length,
    planCompletion: duePlans.length ? completed / duePlans.length : null,
    planCohort: duePlans.length,
    repeatRate: repeatEligible.length ? repeated / repeatEligible.length : null,
    repeatCohort: repeatEligible.length,
    monthsOnRecord,
    launchSpike,
    reviewAvg: input.reviews && input.reviews.count > 0 ? input.reviews.avg : null,
    reviewCount: input.reviews?.count ?? 0,
  };
}

function firstPerClient<T extends { clientKey: string; start: number }>(list: T[]): T[] {
  const m = new Map<string, T>();
  for (const p of list) {
    const prev = m.get(p.clientKey);
    if (!prev || p.start < prev.start) m.set(p.clientKey, p);
  }
  return [...m.values()];
}

// ---------- scoring ----------

function band(sub: number, n: number, k: number): Band {
  if (n < k / 2) return "Building";
  if (sub >= 85) return "Excellent";
  if (sub >= 70) return "Strong";
  if (sub >= 50) return "Fair";
  if (sub >= 30) return "Weak";
  return "Poor";
}

/** Weighted average of [score, weight] pairs, ignoring zero weights. */
function blend(parts: Array<[number, number]>, fallback = PRIOR): number {
  const w = parts.reduce((s, [, wt]) => s + wt, 0);
  return w ? parts.reduce((s, [v, wt]) => s + v * wt, 0) / w : fallback;
}

export function scoreCoach(input: CoachInput): ScoreResult {
  const m = computeMetrics(input);
  const K = PRIOR_STRENGTH;

  // Satisfaction
  const cb = shrink(interpolate(ANCHORS.chargebackRate, m.chargebackRate), m.charges, K.chargebackRate);
  const rf = shrink(interpolate(ANCHORS.refundRate, m.refundRate), m.clients, K.refundRate);
  const rv = m.reviewAvg === null ? null : shrink(interpolate(ANCHORS.reviewAvg, m.reviewAvg), m.reviewCount, K.reviewAvg);
  const satisfaction = blend([
    [cb, WEIGHTS.chargebacks],
    [rf, WEIGHTS.refunds],
    [rv ?? 0, rv === null ? 0 : WEIGHTS.reviews],
  ]);

  // Retention — whichever signals this coach's business actually produces,
  // weighted by how many clients each one covers.
  const ret = m.retention90 === null ? null : shrink(interpolate(ANCHORS.retention90, m.retention90), m.retentionCohort, K.retention90);
  const ech = m.earlyChurn === null ? null : shrink(interpolate(ANCHORS.earlyChurn, m.earlyChurn), m.earlyChurnCohort, K.earlyChurn);
  const pln = m.planCompletion === null ? null : shrink(interpolate(ANCHORS.planCompletion, m.planCompletion), m.planCohort, K.planCompletion);
  const rep = m.repeatRate === null ? null : shrink(interpolate(ANCHORS.repeatRate, m.repeatRate), m.repeatCohort, K.repeatRate);
  const retention = blend([
    [ret ?? 0, ret === null ? 0 : m.retentionCohort],
    [ech ?? 0, ech === null ? 0 : m.earlyChurnCohort * 0.6],
    [pln ?? 0, pln === null ? 0 : m.planCohort * 1.2],
    [rep ?? 0, rep === null ? 0 : m.repeatCohort * 0.5],
  ]);
  const retentionN = m.retentionCohort + m.planCohort + m.repeatCohort;

  // Client base (log scale, so 2,000 clients doesn't bury 200)
  const clientBase = Math.min(100, (100 * Math.log(1 + m.clients)) / Math.log(1 + RULES.clientBaseFullAt));

  // Track record
  const months = interpolate(ANCHORS.monthsOnRecord, m.monthsOnRecord);
  const consistency = m.launchSpike === null ? PRIOR : interpolate(ANCHORS.launchSpike, m.launchSpike);
  const trackRecord = months * WEIGHTS.months + consistency * WEIGHTS.consistency;

  let score = Math.round(
    10 *
      (satisfaction * WEIGHTS.satisfaction +
        retention * WEIGHTS.retention +
        clientBase * WEIGHTS.clientBase +
        trackRecord * WEIGHTS.trackRecord),
  );

  // Red flags: hard caps no matter how good the rest looks.
  const flags: Flag[] = [];
  if (m.disputes >= 3 && m.chargebackRate >= 0.015)
    flags.push({ code: "chargebacks_over_network_limit", capScore: 599, message: "Chargebacks are above the 1.5% level where card networks penalize merchants." });
  else if (m.disputes >= 3 && m.chargebackRate >= 0.01)
    flags.push({ code: "chargebacks_high", capScore: 749, message: "Chargebacks are above 1%, a warning level for card networks." });
  if (m.clients >= 20 && m.refundRate >= 0.2)
    flags.push({ code: "refunds_very_high", capScore: 599, message: "One in five clients or more got their money back." });
  if (m.planCohort >= 10 && (m.planCompletion ?? 1) < 0.4)
    flags.push({ code: "payment_plans_mostly_abandoned", capScore: 599, message: "Most clients stopped paying partway through their payment plan." });
  else if (m.planCohort >= 10 && (m.planCompletion ?? 1) < 0.55)
    flags.push({ code: "payment_plans_abandoned", capScore: 749, message: "Fewer than 55% of payment plans were paid off." });
  const spike = refundSpike(input);
  if (spike) flags.push({ code: "refund_spike", capScore: 749, message: `More than 25% of clients from ${spike} were refunded.` });
  for (const f of flags) score = Math.min(score, f.capScore);

  // Diamond needs a long, broad record.
  if (score >= 900 && (m.monthsOnRecord < RULES.diamondMinMonths || m.clients < RULES.diamondMinClients)) score = 899;

  const stale = input.lastSyncAt !== undefined && input.now - input.lastSyncAt > RULES.staleSyncDays * DAY;
  const enough = m.clients >= RULES.minClientsForTier && m.monthsOnRecord >= RULES.minMonthsForTier;
  const status = stale ? "paused" : enough ? "rated" : "building";
  const tier = status === "rated" ? TIERS.find((t) => score >= t.min)!.tier : null;

  const factors: Factor[] = [
    { key: "retention", label: "Client retention", question: "Do clients keep paying?", subScore: retention, band: band(retention, retentionN, 20) },
    { key: "refunds", label: "Refunds & chargebacks", question: "Do clients ask for, or fight for, their money back?", subScore: (cb * WEIGHTS.chargebacks + rf * WEIGHTS.refunds) / (WEIGHTS.chargebacks + WEIGHTS.refunds), band: band((cb * WEIGHTS.chargebacks + rf * WEIGHTS.refunds) / (WEIGHTS.chargebacks + WEIGHTS.refunds), m.clients, K.refundRate) },
    { key: "clients", label: "Verified client base", question: "Real, unique people who paid", subScore: clientBase, band: band(clientBase, m.clients, RULES.minClientsForTier * 2) },
    { key: "consistency", label: "Consistency", question: "Steady month to month, no spikes", subScore: consistency, band: m.launchSpike === null ? "Building" : band(consistency, 99, 1) },
    { key: "track", label: "Time on record", question: `${Math.floor(m.monthsOnRecord)} months of connected data`, subScore: months, band: m.monthsOnRecord < RULES.minMonthsForTier ? "Building" : band(months, 99, 1) },
  ];
  if (rv !== null) factors.push({ key: "reviews", label: "Verified reviews", question: `${m.reviewCount} reviews from paying clients`, subScore: rv, band: band(rv, m.reviewCount, K.reviewAvg) });

  return {
    version: SCORE_VERSION,
    score,
    tier,
    status,
    factors,
    flags,
    metrics: m,
    pillars: { satisfaction: round1(satisfaction), retention: round1(retention), clientBase: round1(clientBase), trackRecord: round1(trackRecord) },
  };
}

/** Any month (10+ new clients) where over a quarter of that month's new clients were refunded. */
function refundSpike(input: CoachInput): string | null {
  const own = new Set(input.ownClientKeys);
  const start = input.now - RULES.windowDays * DAY;
  const firstPay = new Map<string, number>();
  const paid = new Map<string, number>();
  const back = new Map<string, number>();
  for (const c of input.charges) {
    if (own.has(c.clientKey) || c.created < start) continue;
    firstPay.set(c.clientKey, Math.min(firstPay.get(c.clientKey) ?? Infinity, c.created));
    paid.set(c.clientKey, (paid.get(c.clientKey) ?? 0) + c.amount);
    back.set(c.clientKey, (back.get(c.clientKey) ?? 0) + c.refunded);
  }
  const months = new Map<string, { n: number; refunded: number }>();
  for (const [k, t] of firstPay) {
    if ((paid.get(k) ?? 0) < RULES.minClientCents) continue;
    const d = new Date(t * 1000);
    const key = d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    const row = months.get(key) ?? { n: 0, refunded: 0 };
    row.n += 1;
    if ((back.get(k) ?? 0) >= (paid.get(k) ?? 0) * RULES.fullRefundShare) row.refunded += 1;
    months.set(key, row);
  }
  for (const [key, row] of months) if (row.n >= 10 && row.refunded / row.n > 0.25) return key;
  return null;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
