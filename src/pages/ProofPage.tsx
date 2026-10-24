// Public proof page: /p/:id
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/lib/usePageMeta";
import { headline, periodDays, proofDb, type ProofSnapshot } from "@/lib/proof";

type Owner = { username: string; display_name: string | null; avatar_url?: string | null };

export default function ProofPage() {
  const { id } = useParams();
  const [snap, setSnap] = useState<ProofSnapshot | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [missing, setMissing] = useState(false);

  usePageMeta(
    "Verified proof | Aytopus",
    "Sales numbers pulled directly from Stripe and locked by Aytopus. They can't be edited.",
  );

  useEffect(() => {
    (async () => {
      const { data } = await proofDb.from("proof_snapshots").select("*").eq("id", id).maybeSingle();
      if (!data) {
        setMissing(true);
        return;
      }
      setSnap(data as ProofSnapshot);
      const { data: p } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", data.user_id)
        .maybeSingle();
      if (p) setOwner(p as Owner);
    })();
  }, [id]);

  if (missing) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Proof not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This proof card doesn't exist or was removed by its owner.</p>
      </div>
    );
  }

  if (!snap) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted-foreground">Checking proof…</div>;
  }

  const days = periodDays(snap);
  const name = owner?.display_name || (owner ? `@${owner.username}` : "Aytopus seller");
  const verifiedDate = new Date(snap.verified_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-md px-4 py-10 md:py-14">
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            {owner ? (
              <Link to={`/@${owner.username}`} className="font-display text-lg font-semibold hover:underline">
                {name}
              </Link>
            ) : (
              <p className="font-display text-lg font-semibold">{name}</p>
            )}
            {owner && <p className="text-xs text-muted-foreground">@{owner.username}</p>}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/30">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified
          </span>
        </div>

        <p className="mt-8 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {snap.display_mode === "customers_only" ? "Paying customers" : "Net sales"} · last {days} days
        </p>
        <p className="mt-1 font-display text-5xl font-bold tracking-tight">{headline(snap)}</p>

        {snap.display_mode !== "customers_only" && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Stat label="Customers" value={snap.customer_count.toLocaleString()} />
            <Stat label="Refund rate" value={`${Number(snap.refund_rate)}%`} />
          </div>
        )}

        <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
          Pulled directly from Stripe on {verifiedDate} and locked by Aytopus. Refunds are already subtracted. Nobody,
          including the seller, can edit these numbers.
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Want proof nobody can fake?{" "}
        <Link to="/signup" className="font-medium text-foreground underline underline-offset-4">
          Make yours on Aytopus
        </Link>
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}
