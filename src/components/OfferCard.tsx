import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatOfferPrice, isContactPricing, type PricingModel } from "@/lib/pricing";
import { ArrowUpRight, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { OfferCoverPlaceholder } from "@/components/OfferCoverPlaceholder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface OfferCardData {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_url: string | null;
  price_cents: number | null;
  price_max_cents?: number | null;
  pricing_model?: PricingModel | string | null;
  free_for_testimonial: boolean;
  category: string;
  is_active?: boolean;
  cta_link?: string | null;
  cta_label?: string | null;
  hosted_on_hirevy?: boolean;
  offer_tier?: string | null;
  provider: {
    username: string;
    display_name: string | null;
    review_count: number;
    rating_sum: number;
  };
}

/**
 * Compact horizontal offer card.
 * Image thumbnail (left, ~120px square) + stacked text column on the right.
 * 2-per-row on desktop grids, 1-per-row on mobile (still horizontal layout).
 */
export function OfferCard({
  offer,
  owner,
  onChanged,
  referrer = "card",
}: {
  offer: OfferCardData;
  owner?: boolean;
  onChanged?: () => void;
  referrer?: string;
}) {
  const nav = useNavigate();
  const inactive = offer.is_active === false;
  const detailHref = `/@${offer.provider.username}/${offer.slug}`;

  const isLinkOut = !offer.hosted_on_hirevy && !!offer.cta_link;
  const ctaLabel = (offer.cta_label || "Book Now").slice(0, 20);
  const outHref = `/out/${offer.id}?ref=${encodeURIComponent(referrer)}`;
  const ownerNeedsLink = owner && !offer.hosted_on_hirevy && !offer.cta_link;

  const snippet = (offer.description || "").trim().replace(/\s+/g, " ").slice(0, 90);

  const handleDelete = async () => {
    const { error } = await supabase.from("offers").delete().eq("id", offer.id);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Offer deleted" });
    onChanged?.();
  };

  const goToOffer = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-nav]")) return;
    nav(detailHref);
  };

  const handleCta = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLinkOut) {
      window.open(outHref, "_blank", "noopener,noreferrer");
    } else {
      nav(detailHref);
    }
  };

  return (
    <div
      onClick={goToOffer}
      className={cn(
        "group relative flex cursor-pointer overflow-hidden rounded-md border border-border bg-card transition-all",
        "hover:-translate-y-0.5 hover:border-primary/50 hover:elev",
        inactive && "opacity-60",
      )}
    >
      {/* Thumbnail (left) */}
      <div className="relative h-[140px] w-[120px] shrink-0 overflow-hidden rounded-l-md bg-muted sm:h-[150px] sm:w-[140px]">
        {offer.cover_url ? (
          <img
            src={offer.cover_url}
            alt={offer.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <OfferCoverPlaceholder title={offer.title} aspect="" className="h-full" />
        )}
        {inactive ? (
          <span className="absolute left-1.5 top-1.5 rounded-[3px] bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Inactive
          </span>
        ) : offer.free_for_testimonial && (
          <span className="absolute left-1.5 top-1.5 rounded-[3px] bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
            Free
          </span>
        )}
      </div>

      {/* Text column (right) */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:p-3.5">
        {offer.offer_tier && (
          <span className="inline-flex w-fit items-center rounded-[3px] border border-primary/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
            {offer.offer_tier}
          </span>
        )}
        <h3 className="line-clamp-2 font-display text-[15px] font-bold leading-tight text-foreground">
          {offer.title}
        </h3>
        {snippet && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {snippet}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <span
            className={cn(
              "font-display text-[15px] font-bold text-foreground",
              isContactPricing(offer) && "text-[13px] italic text-foreground/80",
            )}
          >
            {formatOfferPrice(offer)}
          </span>

          <div data-no-nav className="shrink-0">
            {ownerNeedsLink ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); nav(`/settings/offers/${offer.id}`); }}
                className="inline-flex items-center justify-center gap-1 rounded-[3px] border border-dashed border-border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:border-primary hover:text-primary"
              >
                + Add link
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCta}
                className="inline-flex items-center justify-center gap-1 rounded-[3px] bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {ctaLabel}
                {isLinkOut && <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />}
              </button>
            )}
          </div>
        </div>

        {owner && (
          <div data-no-nav className="-mx-3 -mb-3 mt-2 flex border-t border-border sm:-mx-3.5 sm:-mb-3.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); nav(`/settings/offers/${offer.id}`); }}
              className="flex flex-1 items-center justify-center gap-1.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-1 items-center justify-center gap-1.5 border-l border-border py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this offer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{offer.title}" will be removed permanently. This can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Hidden marker so unused icon import doesn't get tree-shaken-warned */}
      <ExternalLink className="hidden" aria-hidden />
    </div>
  );
}
