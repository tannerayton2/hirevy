// Loads a public proof card for link previews, using the public (anon) key —
// the same access any visitor has. Private cards return null.
import type { CardImageData } from "./_card-image";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

type Row = {
  owner_id: string;
  score: number | null;
  tier: string | null;
  status: "rated" | "building" | "paused";
  public_stats: Record<string, number | null | boolean>;
  show_stats: string[];
  visibility: string;
};

async function rest<T>(path: string): Promise<T | null> {
  if (!SUPABASE_URL || !ANON) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as T[];
  return rows[0] ?? null;
}

export async function loadPublicCard(slug: string): Promise<CardImageData | null> {
  const card = await rest<Row>(
    `proof_cards?slug=eq.${encodeURIComponent(slug)}&visibility=eq.public&select=owner_id,score,tier,status,public_stats,show_stats,visibility`,
  );
  if (!card) return null;
  const profile = await rest<{ display_name: string | null; username: string; service_category: string | null }>(
    `profiles?id=eq.${card.owner_id}&select=display_name,username,service_category`,
  );
  const s = card.public_stats ?? {};
  const all = [
    { key: "clients", value: s.clients != null ? String(s.clients) : null, label: "Clients" },
    { key: "retention", value: s.retention != null ? `${s.retention}%` : null, label: "Renew 90d" },
    { key: "refunds", value: s.refunds != null ? `${s.refunds}%` : null, label: "Refunded" },
    { key: "plansPaid", value: s.plansPaid != null ? `${s.plansPaid}%` : null, label: "Plans paid" },
  ];
  return {
    name: profile?.display_name || (profile ? `@${profile.username}` : "Aytopus coach"),
    subtitle: profile?.service_category ?? null,
    tier: card.tier,
    score: card.score,
    status: card.status,
    stats: all.filter((x) => x.value !== null && card.show_stats.includes(x.key)) as { value: string; label: string }[],
  };
}
