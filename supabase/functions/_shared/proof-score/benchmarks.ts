// Benchmarks: the "what's good vs bad" numbers. Every metric is turned into a
// 0–100 sub-score by drawing a line between these anchor points.
//
// Sources and reasoning (v1, Nov 2026 — recalibrate once real coach data exists):
// - Chargebacks: Visa's VAMP program flags US merchants as "excessive" at a 1.5%
//   dispute+fraud ratio (since Apr 1 2026). Physical-goods merchants average ~0.65%;
//   info products publish 1.0%–4.8%. So: under 0.3% is excellent, 1% is a warning,
//   1.5% is over the card-network line.
// - Refunds: mid-ticket online courses typically see 5–10%; creator platforms
//   report ~5% averages; 20%+ is the "guru funnel" zone.
// - Retention / early churn / plan completion / repeat purchase: no solid public
//   benchmark for coaching. These anchors are reasoned estimates. Treat as v1.

/** [metricValue, subScore] pairs, sorted by metricValue ascending. */
export type Anchors = ReadonlyArray<readonly [number, number]>;

export const ANCHORS = {
  // Lower is better
  chargebackRate: [[0, 100], [0.003, 90], [0.0065, 70], [0.01, 40], [0.015, 15], [0.025, 0]],
  // "refundRate" = share of clients who were refunded OR filed a dispute.
  refundRate: [[0, 100], [0.03, 90], [0.06, 75], [0.12, 50], [0.2, 25], [0.35, 0]],
  earlyChurn: [[0, 100], [0.1, 85], [0.2, 65], [0.3, 45], [0.45, 20], [0.6, 0]],
  launchSpike: [[0, 100], [0.2, 100], [0.35, 70], [0.5, 40], [0.7, 10], [1, 0]],
  // Higher is better
  retention90: [[0, 0], [0.25, 20], [0.4, 45], [0.55, 65], [0.7, 85], [0.85, 100]],
  planCompletion: [[0, 0], [0.4, 5], [0.55, 25], [0.7, 55], [0.8, 72], [0.9, 88], [0.97, 100]],
  repeatRate: [[0, 30], [0.1, 55], [0.2, 72], [0.35, 90], [0.5, 100]],
  reviewAvg: [[1, 0], [3, 10], [4, 40], [4.5, 70], [4.8, 90], [5, 100]],
  monthsOnRecord: [[0, 0], [3, 25], [6, 45], [12, 75], [24, 100]],
} satisfies Record<string, Anchors>;

/**
 * Small-sample protection. Each sub-score is blended with PRIOR using
 * (n * score + k * PRIOR) / (n + k), where n is the sample size. With n = k the
 * coach's own number counts half. A coach with 4 clients and zero refunds can't
 * look perfect — they get pulled toward average until the data is real.
 */
export const PRIOR = 60;
export const PRIOR_STRENGTH = {
  chargebackRate: 150, // charges
  refundRate: 25, // clients
  retention90: 20, // subscription cohort
  earlyChurn: 20,
  planCompletion: 15, // finished-or-due installment plans
  repeatRate: 20, // one-time buyers old enough to rebuy
  reviewAvg: 8, // reviews
} as const;

export const RULES = {
  windowDays: 365,
  /** A payer only counts as a client after paying at least this much (cents). */
  minClientCents: 2500,
  /** Refunds of this share of what a client paid count as a full refund. */
  fullRefundShare: 0.5,
  /** Refunds above this share count as half a refund. */
  partialRefundShare: 0.1,
  /** Disputes: weight by reason. Fraud-type reasons might be a stolen card, not the coach. */
  disputeWeight: (reason?: string, status?: string): number => {
    const reasonW = reason === "fraudulent" || reason === "unrecognized" ? 0.5 : 1;
    const statusW = status === "won" ? 0.5 : 1;
    return reasonW * statusW;
  },
  /** Client base sub-score hits 100 at this many verified clients (log scale). */
  clientBaseFullAt: 250,
  /** Minimums before a coach gets a tier at all. */
  minClientsForTier: 10,
  minMonthsForTier: 3,
  /** Diamond needs a real track record, not just a good quarter. */
  diamondMinMonths: 12,
  diamondMinClients: 50,
  /** Card shows as paused if the processor hasn't synced in this long. */
  staleSyncDays: 7,
} as const;

export const WEIGHTS = {
  satisfaction: 0.4,
  retention: 0.3,
  clientBase: 0.15,
  trackRecord: 0.15,
  // inside satisfaction
  chargebacks: 0.45,
  refunds: 0.35,
  reviews: 0.2,
  // inside track record
  months: 0.7,
  consistency: 0.3,
} as const;

export const TIERS: ReadonlyArray<{ tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond"; min: number }> = [
  { tier: "Diamond", min: 900 },
  { tier: "Platinum", min: 750 },
  { tier: "Gold", min: 600 },
  { tier: "Silver", min: 400 },
  { tier: "Bronze", min: 0 },
];

export function interpolate(anchors: Anchors, x: number): number {
  if (x <= anchors[0][0]) return anchors[0][1];
  for (let i = 1; i < anchors.length; i++) {
    const [x1, y1] = anchors[i];
    if (x <= x1) {
      const [x0, y0] = anchors[i - 1];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return anchors[anchors.length - 1][1];
}

export function shrink(score: number, n: number, k: number): number {
  return (n * score + k * PRIOR) / (n + k);
}
