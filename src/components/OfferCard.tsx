import { Link } from "react-router-dom";
import { TierBadge } from "@/components/TierBadge";
import { StarRating } from "@/components/StarRating";
import { tierForReviewCount } from "@/lib/tiers";
import { cn } from "@/lib/utils";

export interface OfferCardData {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  price_cents: number | null;
  free_for_testimonial: boolean;
  category: string;
  provider: {
    username: string;
    display_name: string | null;
    review_count: number;
    rating_sum: number;
  };
}

function formatPrice(cents: number | null) {
  if (cents == null) return "";
  if (cents === 0) return "Free";
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function OfferCard({ offer }: { offer: OfferCardData }) {
  const tier = tierForReviewCount(offer.provider.review_count);
  const avgRating = offer.provider.review_count > 0 ? offer.provider.rating_sum / offer.provider.review_count : 0;
  const providerName = offer.provider.display_name || `@${offer.provider.username}`;

  return (
    <Link
      to={`/@${offer.provider.username}/${offer.slug}`}
      className={cn(
        "group block overflow-hidden rounded-md border border-border bg-card transition-all",
        "hover:border-primary/40 hover:elev",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {offer.cover_url ? (
          <img
            src={offer.cover_url}
            alt={offer.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(ellipse_at_center,hsl(var(--secondary)),hsl(var(--background)))] font-display text-3xl text-muted-foreground/40">
            HireVy
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-[3px] bg-background/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
          {offer.category}
        </span>
        {offer.free_for_testimonial && (
          <span className="absolute right-2 top-2 rounded-[3px] bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
            Free · Testimonial
          </span>
        )}
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-tight text-foreground">
          {offer.title}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{providerName}</div>
          <TierBadge tier={tier} size="xs" />
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="font-display text-base font-bold text-foreground">
            {offer.free_for_testimonial ? "FREE" : formatPrice(offer.price_cents)}
          </span>
          <StarRating value={avgRating} count={offer.provider.review_count} showValue size={12} />
        </div>
      </div>
    </Link>
  );
}
