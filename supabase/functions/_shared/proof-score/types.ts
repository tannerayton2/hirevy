// Processor-agnostic input model. Any payment processor (Stripe, PayPal, Whop…)
// gets translated into these shapes by an adapter (see stripe.ts).

export type OfferKind = "subscription" | "installment" | "one_time";

/** One successful payment from a client to the coach. Amounts in cents. */
export interface NormCharge {
  id: string;
  /** Who paid. Use the card fingerprint when available, so one person with
   *  several customer records (or several cards' worth of accounts) is one client. */
  clientKey: string;
  amount: number;
  /** Total refunded on this charge, in cents (partial refunds included). */
  refunded: number;
  /** Unix seconds. */
  created: number;
  disputed: boolean;
  /** Processor's dispute reason code, e.g. "product_not_received". */
  disputeReason?: string;
  /** "won" | "lost" | "open" — a dispute the coach won still counts, at half weight. */
  disputeStatus?: "won" | "lost" | "open";
  kind: OfferKind;
  /** Subscription or installment plan this payment belongs to. */
  planId?: string;
}

/** A recurring relationship: a membership/retainer or a fixed payment plan. */
export interface NormPlan {
  id: string;
  clientKey: string;
  kind: "subscription" | "installment";
  /** Unix seconds. */
  start: number;
  /** Unix seconds when it was cancelled or ended. Undefined = still active. */
  endedAt?: number;
  /** Installment plans only: how many payments the client agreed to. */
  totalPayments?: number;
  /** Days between payments (30 for monthly). */
  intervalDays: number;
}

export interface ReviewSummary {
  count: number;
  /** Average star rating, 1–5, verified-payer reviews only. */
  avg: number;
}

export interface CoachInput {
  /** Unix seconds, "today". Passed in so results are reproducible. */
  now: number;
  charges: NormCharge[];
  plans: NormPlan[];
  /** Client keys that belong to the coach (their own cards) — excluded. */
  ownClientKeys: string[];
  reviews?: ReviewSummary;
  /** Unix seconds of the last successful sync with the processor. */
  lastSyncAt?: number;
}

export type Band = "Excellent" | "Strong" | "Fair" | "Weak" | "Poor" | "Building";
export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export interface Flag {
  code: string;
  /** Plain-English reason, safe to show the coach. */
  message: string;
  /** Highest score this flag allows. */
  capScore: number;
}
