// /settings/proof — connect Stripe and make verified proof cards
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Award, Copy, ExternalLink, Link2, MessageSquareQuote, RefreshCw, ShieldCheck, Trash2, Zap } from "lucide-react";
import { shareReviewUrl } from "@/lib/shareLinks";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ProofScoreCard } from "@/components/ProofScoreCard";
import { cardUrl, loadMyCard, refreshScore, timeAgo, type ProofCard, type ProofFlag } from "@/lib/proofScore";
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
  const { user, profile, loading } = useAuth();
  const [conn, setConn] = useState<Connection | null>(null);
  const [cards, setCards] = useState<ProofSnapshot[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [key, setKey] = useState("");
  const [connecting, setConnecting] = useState(false);

  const [days, setDays] = useState(30);
  const [mode, setMode] = useState<ProofSnapshot["display_mode"]>("exact");
  const [creating, setCreating] = useState(false);

  const [scoreCard, setScoreCard] = useState<ProofCard | null>(null);
  const [flags, setFlags] = useState<ProofFlag[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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
    const mine = await loadMyCard(user.id);
    setScoreCard(mine.card);
    setFlags(mine.flags);
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
      toast({ title: "Stripe connected", description: "Your proof score is ready below." });
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

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshScore();
      await load();
      toast({ title: "Score refreshed" });
    } catch (err) {
      toast({ title: "Couldn't refresh", description: (err as Error).message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const updateCard = async (patch: Partial<Pick<ProofCard, "visibility" | "show_stats">>) => {
    if (!user || !scoreCard) return;
    setScoreCard({ ...scoreCard, ...patch });
    const { error } = await proofDb.from("proof_cards").update(patch).eq("owner_id", user.id);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      await load();
    }
  };

  const copyCardLink = async () => {
    if (!scoreCard) return;
    try {
      await navigator.clipboard.writeText(cardUrl(scoreCard.slug));
      toast({ title: "Card link copied" });
    } catch {
      toast({ title: "Here's your link", description: cardUrl(scoreCard.slug) });
    }
  };

  const copy = async (id: string, title = "Link copied") => {
    try {
      await navigator.clipboard.writeText(proofUrl(id));
      toast({ title });
    } catch {
      toast({ title: "Here's your link", description: proofUrl(id) });
    }
  };

  const username = profile?.username ?? null;

  const copyReviewLink = async () => {
    if (!username) return;
    const link = shareReviewUrl(username);
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Review link copied", description: "Send it to your clients to collect verified reviews." });
    } catch {
      toast({ title: "Here's your review link", description: link });
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Your proof</p>
      <h1 className="font-display text-3xl font-bold">Collect verified reviews</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Send your review link to clients. Reviews with proof of payment get the Purchase Verified badge.
      </p>

      {/* Review link */}
      <Section
        icon={<MessageSquareQuote className="h-4 w-4" />}
        title="Your review link"
        description="Text it, email it, or drop it in your client group chat."
      >
        {username ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="break-all font-mono text-sm">aytopus.com/r/{username}</p>
            <div className="flex gap-2">
              <Button onClick={copyReviewLink}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/@${username}`}>View my profile</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Pick a username first. It becomes your link.</p>
            <Button asChild>
              <Link to="/settings/profile">Set up my profile</Link>
            </Button>
          </div>
        )}
      </Section>

      <h2 className="mt-12 font-display text-xl font-semibold">Your proof card</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect Stripe and Aytopus scores how your clients actually behave: do they stay, and do they ask for their money
        back. Nobody can fake it, including you.
      </p>

      {/* Step 1: Stripe */}
      <Section
        icon={<Link2 className="h-4 w-4" />}
        title={conn ? "Stripe connected" : "1. Connect Stripe"}
        description={
          conn
            ? "Aytopus can read your sales. It can't move money or change anything in your account."
            : "Read-only. Aytopus can see your payment history, but can't move money or change anything."
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
                Set these to <span className="font-medium text-foreground">Read</span>:{" "}
                <span className="font-medium text-foreground">Charges, Disputes, Subscriptions, Invoices</span>. Leave everything
                else as None.
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

      {/* Step 2: Proof score */}
      {scoreCard && (
        <Section
          icon={<Award className="h-4 w-4" />}
          title="2. Your proof score"
          description={`Updated ${timeAgo(scoreCard.synced_at)}. Refreshes on its own when someone views your card.`}
        >
          <div className="flex flex-col items-center gap-5">
            <ProofScoreCard card={scoreCard} name={profile?.display_name || (username ? `@${username}` : "Your name")} subtitle={profile?.service_category} />
            {scoreCard.status === "building" && (
              <p className="text-center text-sm text-muted-foreground">
                Your tier unlocks at 10+ paying clients and 3+ months of payment history.
              </p>
            )}
          </div>

          {flags.length > 0 && (
            <div className="mt-5 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Holding your score back · only you see this</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {flags.map((f) => (
                  <li key={f.code}>{f.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={copyCardLink}>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy card link
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/v/${scoreCard.slug}`}>View my card</Link>
            </Button>
            <Button variant="outline" onClick={refresh} disabled={refreshing || !conn}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Refreshing…" : "Refresh score"}
            </Button>
          </div>

          <div className="mt-6 space-y-4 border-t border-border pt-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="card-public" className="text-sm font-medium">Public card</Label>
                <p className="text-xs text-muted-foreground">
                  Turning this off hides your card. The pause is recorded and your score history is kept.
                </p>
              </div>
              <Switch
                id="card-public"
                checked={scoreCard.visibility === "public"}
                onCheckedChange={(on) => updateCard({ visibility: on ? "public" : "private" })}
              />
            </div>
            <div>
              <p className="text-sm font-medium">Numbers to show on your card</p>
              <p className="text-xs text-muted-foreground">Your score, tier and ratings always show. Revenue is never shown.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  ["clients", "Verified clients"],
                  ["retention", "Renewal rate"],
                  ["refunds", "Refund rate"],
                  ["plansPaid", "Plans paid off"],
                  ["reviews", "Review rating"],
                ].map(([key, label]) => {
                  const on = scoreCard.show_stats.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        updateCard({ show_stats: on ? scoreCard.show_stats.filter((k) => k !== key) : [...scoreCard.show_stats, key] })
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${on ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* Revenue snapshot (optional) */}
      {conn && (
        <Section
          icon={<Zap className="h-4 w-4" />}
          title="Revenue snapshot (optional)"
          description="A separate one-off card showing sales for a period. Aytopus pulls your numbers from Stripe right now and locks them."
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
        title="Your revenue snapshots"
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
    <section className="mt-8 rounded-2xl border border-white/[0.08] bg-card p-5 md:p-6">
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
