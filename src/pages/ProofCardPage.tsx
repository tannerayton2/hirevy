// Public proof card: /v/:slug — the card first, tap it to open the full record.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/lib/usePageMeta";
import { ProofCardDetails, ProofScoreCard } from "@/components/ProofScoreCard";
import { Logo } from "@/components/Logo";
import { DEMO_CARD, DEMO_OWNER, loadCardBySlug, refreshScore, shareCard, timeAgo, type ProofCard } from "@/lib/proofScore";
import { Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNetworkAccess } from "@/lib/network";

type Owner = { username: string; display_name: string | null; service_category: string | null };



export default function ProofCardPage() {
  const { slug = "" } = useParams();
  const [card, setCard] = useState<ProofCard | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [missing, setMissing] = useState(false);
  const [open, setOpen] = useState(false);
  const { canSeeNetwork } = useNetworkAccess();

  usePageMeta("Verified proof card | Aytopus", "A coach's track record, scored from real payment data. It can't be edited.");

  useEffect(() => {
    let cancelled = false;
    if (slug === "demo") {
      setCard(DEMO_CARD);
      setOwner(DEMO_OWNER);
      return;
    }
    (async () => {
      const c = await loadCardBySlug(slug);
      if (cancelled) return;
      if (!c) {
        setMissing(true);
        return;
      }
      setCard(c);
      const { data: p } = await supabase
        .from("profiles")
        .select("username, display_name, service_category")
        .eq("id", c.owner_id)
        .maybeSingle();
      if (!cancelled && p) setOwner(p as Owner);

      // Cards refresh themselves when viewed if they're more than a day old.
      try {
        const res = await refreshScore(slug);
        if (res?.refreshed && !cancelled) setCard(await loadCardBySlug(slug));
      } catch {
        /* showing the last verified state is fine */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (missing) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Card not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This proof card doesn't exist or is private.</p>
      </div>
    );
  }
  if (!card) return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted-foreground">Checking the record…</div>;

  const name = owner?.display_name || (owner ? `@${owner.username}` : "Aytopus coach");

  return (
    <div className="min-h-screen">
    <header className="mx-auto flex h-16 max-w-md items-center justify-center px-5">
      <Link to="/proofcard" aria-label="Aytopus">
        <Logo />
      </Link>
    </header>
    <div className="mx-auto max-w-md px-4 pb-14 pt-4 md:pt-8">
      <div className="flex flex-col items-center">
        <ProofScoreCard card={card} name={name} subtitle={owner?.service_category} open={open} onToggle={() => setOpen((o) => !o)} />
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {open ? `No. ${card.record_no} · checked ${timeAgo(card.synced_at)}` : "Tap the card to open the record"}
        </p>
        <button
          type="button"
          onClick={async () => {
            const r = await shareCard(card, name, false).catch(() => "cancelled" as const);
            if (r === "copied") toast({ title: "Link copied" });
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.03] px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <Share2 className="h-3.5 w-3.5" /> Share this card
        </button>
      </div>

      <div
        className="transition-all duration-500"
        style={{ opacity: open ? 1 : 0, transform: `translateY(${open ? 0 : 24}px)`, pointerEvents: open ? "auto" : "none", height: open ? "auto" : 0, overflow: "hidden" }}
      >
        <div className="mt-8">
          <ProofCardDetails card={card} />
          {slug === "demo" && (
            <p className="mt-6 rounded-md bg-secondary/60 p-3 text-xs text-muted-foreground">
              Sample card. Marcus Hale is made up and every number is an example.
            </p>
          )}
          {owner && slug !== "demo" && canSeeNetwork && (
            <Link
              to={`/@${owner.username}`}
              className="mt-8 flex h-12 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background"
            >
              View {owner.display_name || `@${owner.username}`}'s profile
            </Link>
          )}
        </div>
      </div>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Want proof nobody can fake?{" "}
        <Link to="/proofcard" className="font-medium text-foreground underline underline-offset-4">
          Get your proof card
        </Link>
      </p>
    </div>
    </div>
  );
}
