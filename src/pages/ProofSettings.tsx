// /settings/proof — connect Stripe and make verified proof cards
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Copy, ExternalLink, Link2, ShieldCheck, Trash2, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  callProofFunction,
  headline,
  periodDays,
  proofDb,
  proofUrl,
  type ProofSnapshot,
} from "@/lib/proof";

type Connection = { key_last4: string; stripe_account_name: string | null; connected_at: string };

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

export default function ProofSettings() {
  const { user, loading } = useAuth();
  const [conn, setConn] = useState<Connection | null>(null);
  const [cards, setCards] = useState<ProofSnapshot[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [key, setKey] = useState("");
  const [connecting, setConnecting] = useState(false);

  const [days, setDays] = useState(30);
  const [mode, setMode] = useState<ProofSnapshot["display_mode"]>("exact");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: c }, { data: s }] = await Promise.all([
      proofDb
        .from("stripe_connections")
        .select("key_last4, stripe_account_name, connected_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      proofDb
        .from("proof_snapshots")
        .select("*")
        .eq("user_id", user.id)
        .order("verified_at", { ascending: false }),
    ]);
    setConn(c ?? null);
    setCards((s ?? []) as ProofSnapshot[]);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (loading || !loaded) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = key.trim();
    if (!clean.startsWith("rk_")) {
      toast({
        title: "That's not a restricted key",
        description: "Restricted keys start with rk_live_ or rk_test_. Don't paste your secret key (sk_).",
        variant: "destructive",
      });
      return;
    }
    setConnecting(true);
    try {
      await callProofFunction("connect-stripe", { body: { restricted_key: clean } });
      setKey("");
      toast({ title: "Stripe connected" });
      await load();
    } catch (err) {
      toast({ title: "Couldn't connect Stripe", description: (err as Error).message, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("Disconnect Stripe? Your existing proof cards stay live.")) return;
    try {
      await callProofFunction("connect-stripe", { method: "DELETE" });
      toast({ title: "Stripe disconnected" });
      await load();
    } catch (err) {
      toast({ title: "Couldn't disconnect", description: (err as Error).message, variant: "destructive" });
    }
  };

  const create = async () => {
    setCreating(true);
    try {
      const res = await callProofFunction<{ id: string }>("create-proof", { body: { days, display_mode: mode } });
      await load();
      await copy(res.id, "Proof card created. Link copied.");
    } catch (err) {
      toast({ title: "Couldn't create proof card", description: (err as Error).message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this proof card? Its link will stop working.")) return;
    const { error } = await proofDb.from("proof_snapshots").delete().eq("id", id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    setCards((cs) => cs.filter((c) => c.id !== id));
  };

  const copy = async (id: string, title = "Link copied") => {
    try {
      await navigator.clipboard.writeText(proofUrl(id));
      toast({ title });
    } catch {
      toast({ title: "Here's your link", description: proofUrl(id) });
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Settings</p>
      <h1 className="font-display text-3xl font-bold">Proof cards</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Turn your real Stripe sales into a verified link nobody can fake. Post it anywhere.
      </p>

      {/* Step 1: Stripe */}
      <Section
        icon={<Link2 className="h-4 w-4" />}
        title={conn ? "Stripe connected" : "1. Connect Stripe"}
        description={
          conn
            ? "Aytopus can read your sales. It can't move money or change anything in your account."
            : "Read-only. Aytopus can see your sales totals, but can't move money or change anything."
        }
      >
        {conn ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium">{conn.stripe_account_name ?? "Stripe account"}</p>
              <p className="text-xs text-muted-foreground">Key ending in {conn.key_last4}</p>
            </div>
            <Button variant="outline" onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <form onSubmit={connect} className="space-y-4">
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>
                Open{" "}
                <a
                  href="https://dashboard.stripe.com/apikeys/create"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Stripe → Create restricted key <ExternalLink className="inline h-3 w-3" />
                </a>
              </li>
              <li>Name it "Aytopus".</li>
              <li>
                Set <span className="font-medium text-foreground">Charges</span> to <span className="font-medium text-foreground">Read</span>. Leave everything else as None.
              </li>
              <li>Click Create key, copy it (starts with rk_live_), and paste it below.</li>
            </ol>
            <div className="space-y-1.5">
              <Label htmlFor="rk" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Restricted key
              </Label>
              <Input
                id="rk"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="rk_live_..."
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-[11px] text-muted-foreground">Stored encrypted. Never shown again.</p>
            </div>
            <Button type="submit" disabled={connecting || !key.trim()}>
              {connecting ? "Checking key…" : "Connect Stripe"}
            </Button>
          </form>
        )}
      </Section>

      {/* Step 2: Make a card */}
      {conn && (
        <Section
          icon={<Zap className="h-4 w-4" />}
          title="Make a proof card"
          description="Aytopus pulls your numbers from Stripe right now and locks them. Refunds are subtracted."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="days" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Time period
              </Label>
              <select id="days" className={selectClass} value={days} onChange={(e) => setDays(Number(e.target.value))}>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last 12 months</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mode" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                What to show
              </Label>
              <select
                id="mode"
                className={selectClass}
                value={mode}
                onChange={(e) => setMode(e.target.value as ProofSnapshot["display_mode"])}
              >
                <option value="exact">Exact sales (e.g. $42,180)</option>
                <option value="range">Sales range (e.g. $25,000+)</option>
                <option value="customers_only">Customer count only</option>
              </select>
            </div>
          </div>
          <Button className="mt-4" onClick={create} disabled={creating}>
            {creating ? "Pulling from Stripe…" : "Make proof card"}
          </Button>
        </Section>
      )}

      {/* Step 3: Your cards */}
      <Section
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Your proof cards"
        description={cards.length ? "Share the link in your bio, posts, or sales page." : "Cards you make will show up here."}
      >
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cards yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {cards.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">
                    {headline(c)}
                    {c.source !== "stripe" && (
                      <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
                        Test
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last {periodDays(c)} days · verified {new Date(c.verified_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(c.id)}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/p/${c.id}`}>View</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(c.id)} aria-label="Delete proof card">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 rounded-md border border-border bg-card p-5 md:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
          {icon}
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
