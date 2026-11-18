// Proof score: types and helpers for the payment-verified proof card.
import { supabase } from "@/integrations/supabase/client";
import { proofDb } from "@/lib/proof";

export type Band = "Excellent" | "Strong" | "Fair" | "Weak" | "Poor" | "Building";
export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export type ProofFactor = { key: string; label: string; question: string; band: Band };

export type ProofCard = {
  owner_id: string;
  record_no: string;
  slug: string;
  score: number | null;
  tier: Tier | null;
  status: "rated" | "building" | "paused";
  factors: ProofFactor[];
  public_stats: {
    clients?: number;
    retention?: number | null;
    refunds?: number;
    plansPaid?: number | null;
    monthsOnRecord?: number;
    reviews?: number;
    reviewAvg?: number | null;
    testData?: boolean;
  };
  show_stats: string[];
  visibility: "public" | "private";
  paused_at: string | null;
  synced_at: string | null;
  updated_at: string;
};

export type ProofFlag = { code: string; message: string; capScore: number };

export const TIERS: { tier: Tier; min: number }[] = [
  { tier: "Bronze", min: 0 },
  { tier: "Silver", min: 400 },
  { tier: "Gold", min: 600 },
  { tier: "Platinum", min: 750 },
  { tier: "Diamond", min: 900 },
];

export function pointsToNextTier(score: number | null): { next: Tier; points: number } | null {
  if (score == null) return null;
  const next = TIERS.find((t) => t.min > score);
  return next ? { next: next.tier, points: next.min - score } : null;
}

/** The stats a coach can choose to show, in display order. */
export function visibleStats(card: ProofCard): { key: string; value: string; label: string }[] {
  const s = card.public_stats ?? {};
  const all = [
    { key: "clients", value: s.clients != null ? String(s.clients) : null, label: "Verified clients" },
    { key: "retention", value: s.retention != null ? `${s.retention}%` : null, label: "Renew 90 days" },
    { key: "refunds", value: s.refunds != null ? `${s.refunds}%` : null, label: "Refunded / disputed" },
    { key: "plansPaid", value: s.plansPaid != null ? `${s.plansPaid}%` : null, label: "Plans paid off" },
    { key: "reviews", value: s.reviewAvg != null ? `${s.reviewAvg}` : null, label: `${s.reviews ?? 0} verified reviews` },
  ];
  return all.filter((x) => x.value !== null && card.show_stats.includes(x.key)) as { key: string; value: string; label: string }[];
}

export function cardUrl(slug: string) {
  return `${window.location.origin}/v/${slug}`;
}

export function timeAgo(iso: string | null) {
  if (!iso) return "not yet";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export async function loadCardBySlug(slug: string): Promise<ProofCard | null> {
  const { data } = await proofDb.from("proof_cards").select("*").eq("slug", slug).maybeSingle();
  return (data as ProofCard) ?? null;
}

export async function loadMyCard(userId: string) {
  const [{ data: card }, { data: priv }] = await Promise.all([
    proofDb.from("proof_cards").select("*").eq("owner_id", userId).maybeSingle(),
    proofDb.from("proof_metrics_private").select("flags, computed_at").eq("owner_id", userId).maybeSingle(),
  ]);
  return { card: (card as ProofCard) ?? null, flags: ((priv?.flags as ProofFlag[]) ?? []) };
}

/** Re-score. With a slug, refreshes a public card only if it's a day old. */
export async function refreshScore(slug?: string) {
  const { data, error } = await supabase.functions.invoke("proof-sync", { body: slug ? { slug } : {} });
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
  return data;
}

/** /v/demo — a sample card with made-up numbers, so anyone can see what a proof card looks like. */
export const DEMO_CARD: ProofCard = {
  owner_id: "demo",
  record_no: "AYT-0042",
  slug: "demo",
  score: 812,
  tier: "Platinum",
  status: "rated",
  factors: [
    { key: "retention", label: "Client retention", question: "Do clients keep paying?", band: "Excellent" },
    { key: "refunds", label: "Refunds & chargebacks", question: "Do clients ask for, or fight for, their money back?", band: "Excellent" },
    { key: "clients", label: "Verified client base", question: "Real, unique people who paid", band: "Strong" },
    { key: "consistency", label: "Consistency", question: "Steady month to month, no spikes", band: "Strong" },
    { key: "track", label: "Time on record", question: "8 months of connected data", band: "Fair" },
    { key: "reviews", label: "Verified reviews", question: "31 reviews from paying clients", band: "Excellent" },
  ],
  public_stats: { clients: 214, retention: 68, refunds: 1.9, monthsOnRecord: 8, reviews: 31, reviewAvg: 4.9 },
  show_stats: ["clients", "retention", "refunds"],
  visibility: "public",
  paused_at: null,
  synced_at: new Date(Date.now() - 4 * 60_000).toISOString(),
  updated_at: new Date().toISOString(),
};
export const DEMO_OWNER = { username: "demo", display_name: "Marcus Hale", service_category: "Strength & fat-loss coaching" };
