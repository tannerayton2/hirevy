// Shared helpers for Aytopus proof cards.
import { supabase } from "@/integrations/supabase/client";

// The generated Supabase types don't know about the proof tables yet,
// so we use an untyped client for them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const proofDb = supabase as any;

export type ProofSnapshot = {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  currency: string;
  net_revenue_cents: number;
  gross_revenue_cents: number;
  refunded_cents: number;
  payment_count: number;
  customer_count: number;
  refund_rate: number;
  display_mode: "exact" | "range" | "customers_only";
  source: string;
  verified_at: string;
};

export function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function rangeLabel(cents: number) {
  const d = cents / 100;
  const steps = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
  const floor = [...steps].reverse().find((s) => d >= s);
  return floor ? `$${floor.toLocaleString()}+` : "Under $1,000";
}

export function periodDays(s: ProofSnapshot) {
  return Math.round((+new Date(s.period_end) - +new Date(s.period_start)) / 86_400_000);
}

export function headline(s: ProofSnapshot) {
  if (s.display_mode === "customers_only") return `${s.customer_count} customers`;
  if (s.display_mode === "range") return rangeLabel(s.net_revenue_cents);
  return formatMoney(s.net_revenue_cents, s.currency);
}

export function proofUrl(id: string) {
  return `${window.location.origin}/p/${id}`;
}

// Calls an edge function and turns error responses into a readable message.
export async function callProofFunction<T>(
  name: "connect-stripe" | "create-proof",
  options: { body?: unknown; method?: "POST" | "DELETE" } = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: options.body ?? {},
    method: options.method ?? "POST",
  });
  if (error) {
    let message = error.message;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (error as any).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      } catch {
        /* keep default message */
      }
    }
    throw new Error(message);
  }
  return data as T;
}
