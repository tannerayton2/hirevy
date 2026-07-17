import { useSearchParams } from "react-router-dom";
import { OfferCard, type OfferCardData } from "@/components/OfferCard";
import { OfferCoverPlaceholder } from "@/components/OfferCoverPlaceholder";
import { Link } from "react-router-dom";
import { formatOfferPrice, isContactPricing } from "@/lib/pricing";
import { Sparkles } from "lucide-react";

export type OfferRow = OfferCardData & { is_pinned?: boolean };

interface Props {
  offers: OfferRow[];
  isOwner?: boolean;
  onChanged?: () => void;
  /** Use a separate query param key, e.g. "tab" on /offers page or "offerstab" on profile */
  tabParamKey?: string;
  referrer?: string;
}

export function OffersPanel({
  offers,
  isOwner,
  onChanged,
  tabParamKey = "offerstab",
  referrer = "profile",
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(tabParamKey);
  const activeTab: "paid" | "free" = raw === "free" ? "free" : "paid";
  const setActiveTab = (t: "paid" | "free") => {
    const next = new URLSearchParams(searchParams);
    next.set(tabParamKey, t);
    setSearchParams(next, { replace: true });
  };

  const pinned = offers.find((o) => o.is_pinned) ?? null;
  const paidAll = offers.filter((o) => !o.free_for_testimonial);
  const freeAll = offers.filter((o) => o.free_for_testimonial);
  const paidNonPinned = paidAll.filter((o) => o.id !== pinned?.id);
  const freeNonPinned = freeAll.filter((o) => o.id !== pinned?.id);

  const showFeaturedInPaid = pinned && !pinned.free_for_testimonial;
  const showFeaturedInFree = pinned && pinned.free_for_testimonial;

  return (
    <div>
      {/* Sub-tabs */}
      <div className="-mx-4 mb-4 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0">
        <div className="flex min-w-max items-center gap-1">
          <SubTab active={activeTab === "paid"} onClick={() => setActiveTab("paid")} count={paidAll.length} label="Paid" />
          <SubTab active={activeTab === "free"} onClick={() => setActiveTab("free")} count={freeAll.length} label="Free" />
        </div>
      </div>

      {activeTab === "paid" ? (
        <TabBody
          featured={showFeaturedInPaid ? pinned : null}
          rest={paidNonPinned}
          isOwner={isOwner}
          onChanged={onChanged}
          referrer={referrer}
          emptyMsg={isOwner ? "No paid offers yet. Create one to get started." : "No paid offers yet."}
        />
      ) : (
        <TabBody
          featured={showFeaturedInFree ? pinned : null}
          rest={freeNonPinned}
          isOwner={isOwner}
          onChanged={onChanged}
          referrer={referrer}
          emptyMsg="No free-for-testimonial offers yet."
        />
      )}
    </div>
  );
}

function TabBody({
  featured,
  rest,
  isOwner,
  onChanged,
  referrer,
  emptyMsg,
}: {
  featured: OfferRow | null;
  rest: OfferRow[];
  isOwner?: boolean;
  onChanged?: () => void;
  referrer: string;
  emptyMsg: string;
}) {
  if (!featured && rest.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
        {emptyMsg}
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {featured && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Featured offer</span>
          </div>
          <FeaturedOfferCard offer={featured} />
        </div>
      )}
      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
          {rest.map((o) => (
            <OfferCard key={o.id} offer={o} owner={isOwner} onChanged={onChanged} referrer={referrer} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturedOfferCard({ offer }: { offer: OfferRow }) {
  const href = `/@${offer.provider.username}/${offer.slug}`;
  const price = formatOfferPrice(offer);
  const muted = isContactPricing(offer);
  return (
    <Link
      to={href}
      className="group block overflow-hidden rounded-md border border-primary/40 bg-card transition-all hover:border-primary hover:elev md:flex"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted md:aspect-auto md:w-1/2">
        {offer.cover_url ? (
          <img
            src={offer.cover_url}
            alt={offer.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <OfferCoverPlaceholder title={offer.title} category={offer.category} aspect="" className="h-full" large />
        )}
        <span className="absolute left-3 top-3 rounded-[3px] bg-background/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
          {offer.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3 p-5 md:p-7">
        <h3 className="font-display text-2xl font-bold leading-tight md:text-3xl">{offer.title}</h3>
        <p className={muted ? "font-display text-base italic text-primary/80" : "font-display text-lg font-semibold text-primary"}>
          {price}
        </p>
        <span className="mt-2 inline-flex w-fit items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground group-hover:text-primary">
          View offer →
        </span>
      </div>
    </Link>
  );
}

function SubTab({ active, onClick, count, label }: { active: boolean; onClick: () => void; count: number; label: string }) {
  const dim = count === 0 && !active;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative -mb-px shrink-0 px-4 py-2.5 text-sm font-medium transition-colors",
        active ? "text-primary" : dim ? "text-muted-foreground/50 hover:text-muted-foreground" : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
      aria-pressed={active}
    >
      <span className="font-display tracking-wide">{label}</span>
      <span className={["ml-2 text-[11px] tabular-nums", active ? "text-primary/80" : "text-muted-foreground/60"].join(" ")}>
        · {count}
      </span>
      {active && <span aria-hidden className="absolute inset-x-2 -bottom-px h-[2px] bg-primary" />}
    </button>
  );
}
