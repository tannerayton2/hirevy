// Pull a coach's Stripe data, score it, and update their proof card.
//
//  POST { owner_id }  + service role key  → re-score one coach (used right after connect-stripe)
//  POST { all: true } + service role key  → re-score everyone (for a daily schedule)
//  POST {}            + coach's login     → re-score yourself (at most every 10 minutes)
//  POST { slug }      (no login needed)   → refresh a public card if it's more than 24h old
//
// Needs: PROOF_ENCRYPTION_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
// Deploy with verify_jwt = false (the public slug refresh has no login); auth is checked below.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { decrypt } from "../_shared/proof-crypto.ts";
import { scoreCoach } from "../_shared/proof-score/score.ts";
import {
  STRIPE_API_VERSION,
  stripeToCoachInput,
  type StripeCharge,
  type StripeDispute,
  type StripeSubscription,
} from "../_shared/proof-score/stripe.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DAY = 86400;
/** 12-month window plus 90 days, so retention for clients who joined a year ago can be judged. */
const LOOKBACK_DAYS = 365 + 90;
const SLUG_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomString(len: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => SLUG_CHARS[b % SLUG_CHARS.length]).join("");
}

async function stripeList<T>(path: string, key: string, params: Record<string, string>): Promise<T[]> {
  const out: T[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < 200; page++) {
    const q = new URLSearchParams({ limit: "100", ...params });
    if (startingAfter) q.set("starting_after", startingAfter);
    const res = await fetch(`https://api.stripe.com/v1/${path}?${q}`, {
      headers: { Authorization: `Bearer ${key}`, "Stripe-Version": STRIPE_API_VERSION },
    });
    if (!res.ok) throw new Error(`stripe:${res.status}:${path}`);
    const body = await res.json();
    out.push(...body.data);
    if (!body.has_more || body.data.length === 0) break;
    startingAfter = body.data[body.data.length - 1].id;
  }
  return out;
}

async function ensureCard(db: SupabaseClient, ownerId: string) {
  const { data } = await db.from("proof_cards").select("owner_id").eq("owner_id", ownerId).maybeSingle();
  if (data) return;
  const { data: seq } = await db.rpc("proof_next_record_no");
  for (let i = 0; i < 5; i++) {
    const { error } = await db.from("proof_cards").insert({
      owner_id: ownerId,
      record_no: `AYT-${String(seq ?? 0).padStart(4, "0")}`,
      slug: `${randomString(4)}-${randomString(2)}`,
    });
    if (!error) return;
    if (!String(error.message).includes("slug")) throw error; // retry only on a slug collision
  }
}

/** Verified reviews: the existing proof-backed reviews, minus any under dispute. */
async function loadReviews(db: SupabaseClient, ownerId: string) {
  const { data } = await db.from("proof_backed_reviews").select("rating, is_disputed").eq("provider_id", ownerId);
  const ok = (data ?? []).filter((r) => !r.is_disputed && r.rating != null);
  if (!ok.length) return undefined;
  return { count: ok.length, avg: ok.reduce((s, r) => s + Number(r.rating), 0) / ok.length };
}

async function syncOne(db: SupabaseClient, ownerId: string) {
  await ensureCard(db, ownerId);
  const { data: conn } = await db.from("stripe_connections").select("encrypted_key, stripe_account_name").eq("user_id", ownerId).maybeSingle();

  if (!conn) {
    // Disconnected: the card can't stay "live". Keep the last score, mark paused.
    await db.from("proof_cards").update({ status: "paused", tier: null, updated_at: new Date().toISOString() }).eq("owner_id", ownerId);
    return { ownerId, status: "paused", reason: "no Stripe connection" };
  }

  const key = await decrypt(conn.encrypted_key);
  const isTestKey = key.startsWith("rk_test_");
  const now = Math.floor(Date.now() / 1000);
  const since = String(now - LOOKBACK_DAYS * DAY);

  let charges: (StripeCharge & { livemode?: boolean })[];
  let disputes: StripeDispute[];
  let subscriptions: StripeSubscription[];
  try {
    [charges, disputes, subscriptions] = await Promise.all([
      stripeList<StripeCharge & { livemode?: boolean }>("charges", key, { "created[gte]": since, "expand[]": "data.invoice" }),
      stripeList<StripeDispute>("disputes", key, { "created[gte]": since }),
      stripeList<StripeSubscription>("subscriptions", key, { status: "all", "created[gte]": since }),
    ]);
  } catch (e) {
    // Key revoked or permissions removed on the Stripe side → paused until reconnected.
    const msg = String(e);
    if (msg.includes("stripe:401") || msg.includes("stripe:403")) {
      await db.from("proof_cards").update({ status: "paused", tier: null, updated_at: new Date().toISOString() }).eq("owner_id", ownerId);
      return { ownerId, status: "paused", reason: "Stripe key no longer works" };
    }
    throw e;
  }
  if (!isTestKey) charges = charges.filter((c) => c.livemode !== false);

  // Who the payments actually go to: Stripe's verified account name, or else the business
  // name Stripe prints on customers' bank statements. Never typed in by the coach.
  const descriptorCounts = new Map<string, number>();
  for (const c of charges as Array<{ calculated_statement_descriptor?: string | null }>) {
    const d = c.calculated_statement_descriptor?.trim();
    if (d) descriptorCounts.set(d, (descriptorCounts.get(d) ?? 0) + 1);
  }
  const topDescriptor = [...descriptorCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const paidThrough = conn.stripe_account_name ?? topDescriptor;

  // The coach's own login email: payments from it are the coach paying themself.
  const { data: authUser } = await db.auth.admin.getUserById(ownerId);
  const ownEmails = authUser?.user?.email ? [authUser.user.email] : [];

  const input = stripeToCoachInput({
    now,
    charges,
    disputes,
    subscriptions,
    ownEmails,
    reviews: await loadReviews(db, ownerId),
    lastSyncAt: now,
  });
  const r = scoreCoach(input);
  const m = r.metrics;
  const iso = new Date().toISOString();

  const { data: prev } = await db.from("proof_cards").select("first_rated_at").eq("owner_id", ownerId).maybeSingle();
  await db.from("proof_cards").update({
    score: r.score,
    tier: r.tier,
    status: r.status,
    factors: r.factors.map(({ key, label, question, band }) => ({ key, label, question, band })),
    public_stats: {
      clients: m.clients,
      retention: m.retention90 === null ? null : Math.round(m.retention90 * 100),
      refunds: Math.round(m.refundRate * 1000) / 10,
      plansPaid: m.planCompletion === null ? null : Math.round(m.planCompletion * 100),
      monthsOnRecord: Math.floor(m.monthsOnRecord),
      reviews: m.reviewCount,
      reviewAvg: m.reviewAvg === null ? null : Math.round(m.reviewAvg * 10) / 10,
      testData: isTestKey,
    },
    paid_through: paidThrough,
    score_version: r.version,
    first_rated_at: prev?.first_rated_at ?? (r.status === "rated" ? iso : null),
    synced_at: iso,
    updated_at: iso,
  }).eq("owner_id", ownerId);

  await db.from("proof_metrics_private").upsert({ owner_id: ownerId, metrics: m, pillars: r.pillars, flags: r.flags, computed_at: iso });
  await db.from("proof_score_history").insert({ owner_id: ownerId, score: r.score, tier: r.tier, status: r.status, flags: r.flags });

  return { ownerId, score: r.score, tier: r.tier, status: r.status, flags: r.flags.map((f) => f.code) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);
  const auth = req.headers.get("Authorization") ?? "";
  const body = await req.json().catch(() => ({}));

  try {
    // Internal calls (connect-stripe, schedules).
    if (auth === `Bearer ${serviceKey}`) {
      if (body.all) {
        const { data } = await db.from("stripe_connections").select("user_id");
        const results = [];
        for (const row of data ?? []) {
          try { results.push(await syncOne(db, row.user_id)); } catch (e) { results.push({ ownerId: row.user_id, error: String(e) }); }
        }
        return json({ results });
      }
      if (body.owner_id) return json(await syncOne(db, body.owner_id));
    }

    // Public: someone viewing a card. Refresh only if it's a day old.
    if (typeof body.slug === "string") {
      const { data: card } = await db.from("proof_cards").select("owner_id, synced_at, visibility").eq("slug", body.slug).maybeSingle();
      if (!card || card.visibility !== "public") return json({ error: "Not found" }, 404);
      const age = card.synced_at ? Date.now() - new Date(card.synced_at).getTime() : Infinity;
      if (age < DAY * 1000) return json({ refreshed: false });
      await syncOne(db, card.owner_id);
      return json({ refreshed: true });
    }

    // A coach refreshing their own card.
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Sign in first." }, 401);
    const { data: card } = await db.from("proof_cards").select("synced_at").eq("owner_id", user.id).maybeSingle();
    if (card?.synced_at && Date.now() - new Date(card.synced_at).getTime() < 10 * 60_000) {
      return json({ error: "Your card refreshed in the last 10 minutes. Try again shortly." }, 429);
    }
    return json(await syncOne(db, user.id));
  } catch (e) {
    console.error(e);
    return json({ error: "Couldn't refresh the score right now." }, 500);
  }
});
