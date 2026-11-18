// /card — the only screen a signed-in coach needs: connect Stripe once, then it's just your live card.
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ProofCardDetails, ProofScoreCard } from "@/components/ProofScoreCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { callProofFunction, proofDb } from "@/lib/proof";
import { supabase } from "@/integrations/supabase/client";
import { cardUrl, loadMyCard, refreshScore, timeAgo, type ProofCard, type ProofFlag } from "@/lib/proofScore";
import { usePageMeta } from "@/lib/usePageMeta";

type Connection = { key_last4: string; stripe_account_name: string | null };

export default function MyCard() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const [conn, setConn] = useState<Connection | null>(null);
  const [card, setCard] = useState<ProofCard | null>(null);
  const [flags, setFlags] = useState<ProofFlag[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [key, setKey] = useState("");
  const [cardName, setCardName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);

  usePageMeta("Your proof card | Aytopus", "Your payment-verified proof card.");

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: c }, mine] = await Promise.all([
      proofDb.from("stripe_connections").select("key_last4, stripe_account_name").eq("user_id", user.id).maybeSingle(),
      loadMyCard(user.id),
    ]);
    setConn(c ?? null);
    setCard(mine.card);
    setFlags(mine.flags);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!loading && !user) return <Navigate to="/auth" replace />;

  const name =
    profile?.display_name || (profile?.username ? `@${profile.username}` : user?.email?.split("@")[0] ?? "Your name");
  // The database fills display_name with the email's first part; don't prefill that as a "name".
  const suggestedName = profile?.display_name && profile.display_name !== profile.username ? profile.display_name : "";
  const nameValue = cardName ?? suggestedName;

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = key.trim();
    if (nameValue.trim().length < 2) {
      toast({ title: "Add the name for your card", variant: "destructive" });
      return;
    }
    if (!clean.startsWith("rk_")) {
      toast({
        title: "That's not a restricted key",
        description: "Restricted keys start with rk_live_. Don't paste your secret key (sk_).",
        variant: "destructive",
      });
      return;
    }
    setConnecting(true);
    try {
      if (user && nameValue.trim() !== (profile?.display_name ?? "")) {
        await supabase.from("profiles").update({ display_name: nameValue.trim() }).eq("id", user.id);
        await refreshProfile();
      }
      await callProofFunction("connect-stripe", { body: { restricted_key: clean } });
      setKey("");
      await load();
      setOpen(false);
    } catch (err) {
      toast({ title: "Couldn't connect Stripe", description: (err as Error).message, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshScore();
      await load();
    } catch (err) {
      toast({ title: "Couldn't refresh", description: (err as Error).message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const copyLink = async () => {
    if (!card) return;
    try {
      await navigator.clipboard.writeText(cardUrl(card.slug));
      toast({ title: "Card link copied" });
    } catch {
      toast({ title: "Here's your link", description: cardUrl(card.slug) });
    }
  };

  const updateCard = async (patch: Partial<Pick<ProofCard, "visibility" | "show_stats">>) => {
    if (!user || !card) return;
    setCard({ ...card, ...patch });
    const { error } = await proofDb.from("proof_cards").update(patch).eq("owner_id", user.id);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      await load();
    }
  };

  const disconnect = async () => {
    if (!confirm("Disconnect Stripe? Your card will show as paused until you reconnect.")) return;
    try {
      await callProofFunction("connect-stripe", { method: "DELETE" });
      await load();
    } catch (err) {
      toast({ title: "Couldn't disconnect", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-xl items-center justify-between px-5">
        <Link to="/proofcard" aria-label="Aytopus">
          <Logo />
        </Link>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          Sign out
        </Button>
      </header>

      <main className="mx-auto max-w-md px-5 pb-20 pt-4">
        {!loaded ? (
          <p className="py-20 text-center text-sm text-muted-foreground">Loading…</p>
        ) : !conn ? (
          /* ---------- Not connected: one step ---------- */
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-primary">Step 2 of 2</p>
            <h1 className="mt-2 text-[30px] font-semibold leading-[1.08] tracking-[-0.03em]">Connect Stripe.</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Read-only. Aytopus can see your payment history, but can't move money, refund anyone or change anything.
            </p>
            <ol className="mt-6 space-y-2.5 rounded-3xl border border-white/[0.08] bg-card p-5 text-sm text-muted-foreground">
              <li>
                1. Open{" "}
                <a
                  href="https://dashboard.stripe.com/apikeys/create"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Stripe → Create restricted key <ExternalLink className="inline h-3 w-3" />
                </a>
              </li>
              <li>2. Name it "Aytopus".</li>
              <li>
                3. Set <span className="font-medium text-foreground">Charges, Disputes, Subscriptions, Invoices</span> to{" "}
                <span className="font-medium text-foreground">Read</span>. Leave everything else as None.
              </li>
              <li>4. Create the key, copy it, and paste it below.</li>
            </ol>
            <form onSubmit={connect} className="mt-6 space-y-3">
              <Label htmlFor="card-name" className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                Name on your card
              </Label>
              <Input
                id="card-name"
                value={nameValue}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Your name or business name"
                maxLength={60}
                autoComplete="name"
                className="h-12 rounded-full px-5"
              />
              <Label htmlFor="rk" className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                Restricted key
              </Label>
              <Input
                id="rk"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="rk_live_..."
                autoComplete="off"
                spellCheck={false}
                className="h-12 rounded-full px-5"
              />
              <Button type="submit" size="lg" className="w-full" disabled={connecting || !key.trim()}>
                {connecting ? "Building your card…" : "Create my proof card"}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">Stored encrypted. Never shown again.</p>
            </form>
          </div>
        ) : !card ? (
          /* ---------- Connected, score not ready ---------- */
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">Your card is being built.</p>
            <Button className="mt-5" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Check again
            </Button>
          </div>
        ) : (
          /* ---------- The card ---------- */
          <div className="flex flex-col items-center">
            <ProofScoreCard card={card} name={name} subtitle={profile?.service_category} open={open} onToggle={() => setOpen((o) => !o)} />
            <p className="mt-5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
              {open ? `No. ${card.record_no} · updated ${timeAgo(card.synced_at)}` : "Tap your card to open the record"}
            </p>

            {open && (
              <div className="mt-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                {flags.length > 0 && (
                  <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-500">Holding your score back · only you see this</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                      {flags.map((f) => (
                        <li key={f.code}>{f.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <ProofCardDetails card={card} />
              </div>
            )}

            <div className="mt-8 flex w-full gap-2">
              <Button size="lg" className="flex-1" onClick={copyLink}>
                <Copy className="h-4 w-4" /> Copy card link
              </Button>
              <Button size="lg" variant="outline" onClick={refresh} disabled={refreshing} aria-label="Refresh score">
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <details className="mt-6 w-full rounded-2xl border border-white/[0.08] bg-card/60 px-5 py-3 text-sm">
              <summary className="cursor-pointer select-none py-1 text-muted-foreground">Card settings</summary>
              <div className="space-y-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="card-public" className="text-sm font-medium">Public card</Label>
                    <p className="text-xs text-muted-foreground">Hiding is recorded, and your history is kept.</p>
                  </div>
                  <Switch
                    id="card-public"
                    checked={card.visibility === "public"}
                    onCheckedChange={(on) => updateCard({ visibility: on ? "public" : "private" })}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Numbers on your card</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      ["clients", "Verified clients"],
                      ["retention", "Renewal rate"],
                      ["refunds", "Refund rate"],
                      ["plansPaid", "Plans paid off"],
                    ].map(([k, label]) => {
                      const on = card.show_stats.includes(k);
                      return (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={on}
                          onClick={() => updateCard({ show_stats: on ? card.show_stats.filter((x) => x !== k) : [...card.show_stats, k] })}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${on ? "border-primary/40 bg-primary/[0.12] text-primary" : "border-white/[0.08] text-muted-foreground"}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
                  <p className="text-xs text-muted-foreground">
                    Stripe {conn.stripe_account_name ? `· ${conn.stripe_account_name}` : ""} · key ending {conn.key_last4}
                  </p>
                  <button type="button" onClick={disconnect} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                    Disconnect
                  </button>
                </div>
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-muted-foreground">
                  <span>{user?.email}</span>
                  <Link to="/settings/account" className="underline underline-offset-4 hover:text-foreground">
                    Account &amp; delete
                  </Link>
                </div>
              </div>
            </details>
          </div>
        )}
      </main>
    </div>
  );
}
