import { useNavigate } from "react-router-dom";
import { TierBadge } from "@/components/TierBadge";
import { StarRating } from "@/components/StarRating";
import { tierForReviewCount } from "@/lib/tiers";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ExternalLink, Pencil, Trash2 } from "lucide-react";
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
  cover_url: string | null;
  price_cents: number | null;
  free_for_testimonial: boolean;
  category: string;
  is_active?: boolean;
  // New link-out fields (optional for back-compat with older queries)
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

function formatPrice(cents: number | null) {
  if (cents == null) return "";
  if (cents === 0) return "Free";
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

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
  const tier = tierForReviewCount(offer.provider.review_count);
  const avgRating = offer.provider.review_count > 0 ? offer.provider.rating_sum / offer.provider.review_count : 0;
  const providerName = offer.provider.display_name || `@${offer.provider.username}`;
  const nav = useNavigate();
  const inactive = offer.is_active === false;
  const detailHref = `/@${offer.provider.username}/${offer.slug}`;

  const isLinkOut = !offer.hosted_on_hirevy && !!offer.cta_link;
  const ctaLabel = (offer.cta_label || "Book Now").slice(0, 24);
  const outHref = `/out/${offer.id}?ref=${encodeURIComponent(referrer)}`;
  const ownerNeedsLink = owner && !offer.hosted_on_hirevy && !offer.cta_link;

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
    // Card-body click always goes to the in-app detail page (works for both modes).
    nav(detailHref);
  };

  const handleCta = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLinkOut) {
      // Open the redirector in a new tab so the original profile/explore stays open.
      window.open(outHref, "_blank", "noopener,noreferrer");
    } else {
      nav(detailHref);
    }
  };

  return (
    <div
      onClick={goToOffer}
      className={cn(
        "group flex cursor-pointer flex-col overflow-hidden rounded-md border border-border bg-card transition-all",
        "hover:border-primary/40 hover:elev",
        inactive && "opacity-60",
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
        {inactive ? (
          <span className="absolute right-2 top-2 rounded-[3px] bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Inactive
          </span>
        ) : offer.free_for_testimonial && (
          <span className="absolute right-2 top-2 rounded-[3px] bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
            Free · Testimonial
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-tight text-foreground">
          {offer.title}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{providerName}</div>
          <TierBadge tier={tier} size="xs" />
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-base font-bold text-foreground">
              {offer.free_for_testimonial ? "FREE" : formatPrice(offer.price_cents)}
            </span>
            {offer.offer_tier && (
              <span className="rounded-[3px] border border-primary/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
                {offer.offer_tier}
              </span>
            )}
          </div>
          <StarRating value={avgRating} count={offer.provider.review_count} showValue size={12} />
        </div>

        {/* CTA row */}
        <div data-no-nav className="mt-auto pt-2">
          {ownerNeedsLink ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); nav(`/settings/offers/${offer.id}`); }}
              className="flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-dashed border-border px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:border-primary hover:text-primary"
            >
              + Add a link to activate
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCta}
              className="flex w-full items-center justify-center gap-1.5 rounded-[3px] bg-primary px-2 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {ctaLabel}
              {isLinkOut && <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />}
            </button>
          )}
        </div>
      </div>
      {owner && (
        <div data-no-nav className="flex border-t border-border">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); nav(`/settings/offers/${offer.id}`); }}
            className="flex flex-1 items-center justify-center gap-1.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="flex flex-1 items-center justify-center gap-1.5 border-l border-border py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
      {/* Hidden marker so unused icon import doesn't get tree-shaken-warned by lint */}
      <ExternalLink className="hidden" aria-hidden />
    </div>
  );
}
