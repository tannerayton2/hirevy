// Shows a coach's payment-verified proof card on their profile, if they have a public one.
// Tapping it opens the full record at /v/:slug.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProofScoreCard } from "@/components/ProofScoreCard";
import { proofDb } from "@/lib/proof";
import type { ProofCard } from "@/lib/proofScore";

export function ProfileScoreCard({ ownerId, name, subtitle }: { ownerId: string; name: string; subtitle?: string | null }) {
  const [card, setCard] = useState<ProofCard | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await proofDb.from("proof_cards").select("*").eq("owner_id", ownerId).eq("visibility", "public").maybeSingle();
      if (!cancelled) setCard((data as ProofCard) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  if (!card) return null;
  return (
    <div className="mx-auto mt-5 flex max-w-[360px] justify-center">
      <ProofScoreCard card={card} name={name} subtitle={subtitle} onToggle={() => navigate(`/v/${card.slug}`)} />
    </div>
  );
}
