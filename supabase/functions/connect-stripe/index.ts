// Connect (POST) or disconnect (DELETE) a coach's Stripe account using a read-only
// restricted key. The key is stored encrypted and never returned.
//
// Changed from the original: also checks Disputes, Subscriptions and Invoices read access
// (the proof score needs them), and runs the first score right after connecting.

import { createClient } from "npm:@supabase/supabase-js@2";
import { encrypt } from "../_shared/proof-crypto.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/** What the key must be able to read, and the name Stripe uses for it in the key settings. */
const REQUIRED = [
  { path: "charges", label: "Charges" },
  { path: "disputes", label: "Disputes" },
  { path: "subscriptions", label: "Subscriptions" },
  { path: "invoices", label: "Invoices" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Sign in first." }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (req.method === "DELETE") {
      // The score card stays (marked paused once data goes stale). History is never deleted.
      await admin.from("stripe_connections").delete().eq("user_id", user.id);
      return json({ ok: true });
    }

    const { restricted_key } = await req.json().catch(() => ({}));
    if (typeof restricted_key !== "string" || !restricted_key.startsWith("rk_")) {
      return json({ error: "Paste a restricted key (starts with rk_). Secret keys aren't accepted." }, 400);
    }

    if (restricted_key.startsWith("rk_test_") && Deno.env.get("ALLOW_TEST_KEYS") !== "true") {
      return json({ error: "Test keys aren't accepted. Use a live key (starts with rk_live_)." }, 400);
    }

    const checks = await Promise.all(
      REQUIRED.map(async (r) => {
        const res = await fetch(`https://api.stripe.com/v1/${r.path}?limit=1`, {
          headers: { Authorization: `Bearer ${restricted_key}` },
        });
        return { ...r, ok: res.ok, status: res.status };
      }),
    );
    if (checks.find((c) => c.path === "charges" && c.status === 401)) {
      return json({ error: "Stripe didn't recognize that key. Copy it again and paste the whole thing." }, 400);
    }
    const missing = checks.filter((c) => !c.ok).map((c) => c.label);
    if (missing.length) {
      return json({ error: `That key can't read ${missing.join(", ")}. Set ${missing.join(", ")} to Read in the key's permissions.` }, 400);
    }

    let accountName: string | null = null;
    const acct = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${restricted_key}` },
    });
    if (acct.ok) {
      const a = await acct.json();
      accountName = a?.settings?.dashboard?.display_name ?? a?.business_profile?.name ?? null;
    }

    const { error } = await admin.from("stripe_connections").upsert({
      user_id: user.id,
      encrypted_key: await encrypt(restricted_key),
      key_last4: restricted_key.slice(-4),
      stripe_account_name: accountName,
      connected_at: new Date().toISOString(),
    });
    if (error) return json({ error: error.message }, 500);

    // First score right away. Don't fail the connect if scoring has a problem.
    let score: unknown = null;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/proof-sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ owner_id: user.id }),
      });
      score = await res.json();
    } catch (_) { /* scored on next refresh */ }

    return json({ ok: true, account_name: accountName, last4: restricted_key.slice(-4), score });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
