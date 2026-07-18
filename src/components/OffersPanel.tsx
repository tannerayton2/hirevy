import { OfferCard, type OfferCardData } from "@/components/OfferCard";

export type OfferRow = OfferCardData & { is_pinned?: boolean };

interface Props {
  offers: OfferRow[];
  isOwner?: boolean;
  onChanged?: () => void;
  /** Retained for backwards compatibility with existing callers. */
  tabParamKey?: string;
  referrer?: string;
}

export function OffersPanel({
  offers,
  isOwner,
  onChanged,
  referrer = "profile",
}: Props) {
  if (offers.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
        {isOwner ? "No offers yet. Create one to get started." : "No offers yet."}
      </p>
    );
  }

  // Show pinned offer first, then the rest.
  const pinned = offers.find((o) => o.is_pinned);
  const rest = pinned ? offers.filter((o) => o.id !== pinned.id) : offers;
  const ordered = pinned ? [pinned, ...rest] : offers;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
      {ordered.map((o) => (
        <OfferCard key={o.id} offer={o} owner={isOwner} onChanged={onChanged} referrer={referrer} />
      ))}
    </div>
  );
}
