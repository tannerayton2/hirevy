// Snapshot of the deployed create-proof function (was only in Supabase, not in git). Unchanged.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function decrypt(b64: string): Promise<string> {
  const raw = Deno.env.get("PROOF_ENCRYPTION_KEY");
  if (!raw) throw new Error("PROOF_ENCRYPTION_KEY not set");
  const keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const data = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: data.slice(0, 12) }, key, data.slice(12));
  return new TextDecoder().decode(plain);
}

function shortId(len = 8) {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Sign in first." }, 401);

    const body = await req.json().catch(() => ({}));
    const days = [7, 30, 90, 365].includes(body.days) ? body.days : 30;
    const displayMode = ["exact", "range", "customers_only"].includes(body.display_mode)
      ? body.display_mode
      : "exact";

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await admin
      .from("proof_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("verified_at", since);
    if ((count ?? 0) >= 10) return json({ error: "Limit is 10 proof cards a day." }, 429);

    const { data: conn } = await admin
      .from("stripe_connections")
      .select("encrypted_key")
      .eq("user_id", user.id)
      .single();
    if (!conn) return json({ error: "Connect Stripe first." }, 400);
    const key = await decrypt(conn.encrypted_key);
    const isTestKey = key.startsWith("rk_test_");
    if (isTestKey && Deno.env.get("ALLOW_TEST_KEYS") !== "true") {
      return json({ error: "This Stripe connection uses a test key. Disconnect and connect a live key." }, 400);
    }

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - days * 86_400_000);
    const gte = Math.floor(periodStart.getTime() / 1000);

    let gross = 0, refunded = 0, paymentCount = 0;
    let currency = "usd";
    const customers = new Set<string>();
    let startingAfter: string | null = null;

    for (let page = 0; page < 50; page++) {
      const params = new URLSearchParams({ limit: "100", "created[gte]": String(gte) });
      if (startingAfter) params.set("starting_after", startingAfter);
      const res = await fetch(`https://api.stripe.com/v1/charges?${params}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) return json({ error: "Stripe rejected the key. Reconnect Stripe." }, 400);
      const data = await res.json();

      for (const c of data.data) {
        if (c.status !== "succeeded" || !c.paid) continue;
        if (!isTestKey && !c.livemode) continue;
        currency = c.currency;
        gross += c.amount;
        refunded += c.amount_refunded ?? 0;
        paymentCount++;
        const who = c.customer ?? c.billing_details?.email ?? c.receipt_email;
        if (who) customers.add(String(who).toLowerCase());
      }
      if (!data.has_more || data.data.length === 0) break;
      startingAfter = data.data[data.data.length - 1].id;
    }

    const net = gross - refunded;
    const refundRate = gross > 0 ? Math.round((refunded / gross) * 10000) / 100 : 0;

    const snapshot = {
      id: shortId(),
      user_id: user.id,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      currency,
      net_revenue_cents: net,
      gross_revenue_cents: gross,
      refunded_cents: refunded,
      payment_count: paymentCount,
      customer_count: customers.size,
      refund_rate: refundRate,
      display_mode: displayMode,
      source: isTestKey ? "stripe_test" : "stripe",
    };

    const { error } = await admin.from("proof_snapshots").insert(snapshot);
    if (error) return json({ error: error.message }, 500);

    return json({ id: snapshot.id, url: `https://aytopus.com/p/${snapshot.id}`, ...snapshot });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
