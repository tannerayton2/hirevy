// Stripe → engine adapter. Pure functions: raw Stripe objects in, CoachInput out.
// Fetching lives in the proof-sync function; this file has no network calls so it
// can be tested directly.
//
// Requests are pinned to Stripe API version 2024-06-20, where charge.invoice and
// invoice.subscription still exist. Newer versions moved these; if you upgrade,
// update the field paths below.

import type { CoachInput, NormCharge, NormPlan } from "./types.ts";

export const STRIPE_API_VERSION = "2024-06-20";

// Minimal shapes of the Stripe fields we read.
export interface StripeCharge {
  id: string;
  amount: number;
  amount_refunded: number;
  created: number;
  status: string; // "succeeded" | "pending" | "failed"
  paid: boolean;
  customer: string | null;
  disputed: boolean;
  billing_details?: { email?: string | null };
  receipt_email?: string | null;
  payment_method_details?: { card?: { fingerprint?: string | null } } | null;
  invoice?: string | { id: string; subscription?: string | null } | null;
}

export interface StripeDispute {
  id: string;
  charge: string;
  reason: string;
  status: string; // won | lost | needs_response | under_review | warning_* | charge_refunded
}

export interface StripeSubscription {
  id: string;
  customer: string;
  start_date: number;
  ended_at: number | null;
  canceled_at: number | null;
  cancel_at: number | null;
  cancel_at_period_end: boolean;
  status: string;
  metadata?: Record<string, string>;
  items: { data: Array<{ price: { recurring: { interval: string; interval_count: number } | null; metadata?: Record<string, string> } }> };
}

const INTERVAL_DAYS: Record<string, number> = { day: 1, week: 7, month: 30, year: 365 };

/**
 * Installment plan detection. A payment plan in Stripe is usually a subscription
 * set to end after N payments (cancel_at fixed up front). Coaches can also tag the
 * price or subscription with metadata aytopus_installments = "6".
 */
function planShape(sub: StripeSubscription): { kind: "subscription" | "installment"; totalPayments?: number; intervalDays: number } {
  const price = sub.items.data[0]?.price;
  const rec = price?.recurring;
  const intervalDays = rec ? (INTERVAL_DAYS[rec.interval] ?? 30) * rec.interval_count : 30;
  const tagged = Number(sub.metadata?.aytopus_installments ?? price?.metadata?.aytopus_installments);
  if (tagged > 1) return { kind: "installment", totalPayments: tagged, intervalDays };
  if (sub.cancel_at && !sub.cancel_at_period_end) {
    const n = Math.round((sub.cancel_at - sub.start_date) / (intervalDays * 86400));
    if (n >= 2 && n <= 24) return { kind: "installment", totalPayments: n, intervalDays };
  }
  return { kind: "subscription", intervalDays };
}

function disputeStatus(s: string): "won" | "lost" | "open" {
  if (s === "won" || s === "warning_closed") return "won";
  if (s === "lost") return "lost";
  return "open";
}

export function stripeToCoachInput(args: {
  now: number;
  charges: StripeCharge[];
  disputes: StripeDispute[];
  subscriptions: StripeSubscription[];
  /** The connected account's own email(s): payments from these are the coach paying themself. */
  ownEmails?: string[];
  ownClientKeys?: string[];
  reviews?: { count: number; avg: number };
  lastSyncAt?: number;
}): CoachInput {
  const disputeByCharge = new Map(args.disputes.map((d) => [d.charge, d]));
  const ownEmails = new Set((args.ownEmails ?? []).map((e) => e.toLowerCase()));
  const own = new Set(args.ownClientKeys ?? []);

  // One person = one client. Prefer the card fingerprint; fall back to customer id.
  // Customers who share a fingerprint get merged into the same client.
  // First pass: learn each customer's card fingerprint so every charge and plan
  // from that customer maps to the same client.
  const keyForCustomer = new Map<string, string>();
  for (const c of args.charges) {
    const fp = c.payment_method_details?.card?.fingerprint;
    if (fp && c.customer && !keyForCustomer.has(c.customer)) keyForCustomer.set(c.customer, `fp:${fp}`);
  }
  const clientKey = (c: StripeCharge): string => {
    const fp = c.payment_method_details?.card?.fingerprint;
    if (fp) return `fp:${fp}`;
    if (c.customer) return keyForCustomer.get(c.customer) ?? `cus:${c.customer}`;
    const email = c.billing_details?.email ?? c.receipt_email;
    return email ? `em:${email.toLowerCase()}` : `ch:${c.id}`;
  };

  const plansById = new Map<string, NormPlan>();
  const shapes = new Map(args.subscriptions.map((s) => [s.id, planShape(s)]));

  const charges: NormCharge[] = [];
  for (const c of args.charges) {
    if (c.status !== "succeeded" || !c.paid) continue;
    const key = clientKey(c);
    const email = (c.billing_details?.email ?? c.receipt_email ?? "").toLowerCase();
    if (email && ownEmails.has(email)) own.add(key);
    const inv = c.invoice;
    const subId = inv && typeof inv === "object" ? inv.subscription ?? undefined : undefined;
    const shape = subId ? shapes.get(subId) : undefined;
    const d = disputeByCharge.get(c.id);
    charges.push({
      id: c.id,
      clientKey: key,
      amount: c.amount,
      refunded: c.amount_refunded,
      created: c.created,
      disputed: c.disputed || !!d,
      disputeReason: d?.reason,
      disputeStatus: d ? disputeStatus(d.status) : undefined,
      kind: shape ? shape.kind : "one_time",
      planId: subId ?? undefined,
    });
  }

  // Customers → client keys learned from charges, so plans line up with payments.
  for (const s of args.subscriptions) {
    const shape = shapes.get(s.id)!;
    plansById.set(s.id, {
      id: s.id,
      clientKey: keyForCustomer.get(s.customer) ?? `cus:${s.customer}`,
      kind: shape.kind,
      start: s.start_date,
      endedAt: s.ended_at ?? (s.status === "canceled" && s.canceled_at ? s.canceled_at : undefined),
      totalPayments: shape.totalPayments,
      intervalDays: shape.intervalDays,
    });
  }

  return {
    now: args.now,
    charges,
    plans: [...plansById.values()],
    ownClientKeys: [...own],
    reviews: args.reviews,
    lastSyncAt: args.lastSyncAt,
  };
}
