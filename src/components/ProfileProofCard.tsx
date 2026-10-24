// "Verified sales" section on a profile: shows the person's latest live proof card.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { headline, periodDays, proofDb, type ProofSnapshot } from "@/lib/proof";

export function ProfileProofCard({ userId, isMe }: { userId: string; isMe: boolean }) {
  const [snap, setSnap] = useState<ProofSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await proofDb
        .from("proof_snapshots")
        .select("*")
        .eq("user_id", userId)
        .eq("source", "stripe")
        .order("verified_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancel) return;
      setSnap((data as ProofSnapshot) ?? null);
      setLoaded(true);
    })();
    return () => {
      cancel = true;
    };
  }, [userId]);

  if (!loaded) return null;

  if (!snap) {
    if (!isMe) return null;
    return (
      <div className="mx-auto mt-5 max-w-xl rounded-lg border border-dashed border-primary/40 bg-card/40 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">Show verified sales on your profile</p>
              <p className="text-muted-foreground">Connect Stripe and your real numbers appear here. Only you can see this prompt.</p>
            </div>
          </div>
          <Button size="sm" asChild>
            <Link to="/settings/proof">Make a proof card</Link>
          </Button>
        </div>
      </div>
    );
  }

  const days = periodDays(snap);
  const verifiedDate = new Date(snap.verified_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto mt-5 max-w-xl rounded-lg border border-primary/30 bg-card/60 px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {snap.display_mode === "customers_only" ? "Verified customers" : "Verified sales"} · last {days} days
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/30">
          <ShieldCheck className="h-3 w-3" /> Stripe verified
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <p className="font-display text-3xl font-bold tracking-tight">{headline(snap)}</p>
        {snap.display_mode !== "customers_only" && (
          <p className="text-sm text-muted-foreground">
            {snap.customer_count.toLocaleString()} customers · {Number(snap.refund_rate)}% refunded
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <p className="text-[11px] text-muted-foreground">Pulled from Stripe on {verifiedDate}. Can't be edited.</p>
        <Link
          to={`/p/${snap.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View proof <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
