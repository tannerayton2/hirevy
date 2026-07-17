import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatOfferPrice, isContactPricing, type PricingModel } from "@/lib/pricing";
import { Pencil, Trash2 } from "lucide-react";
import { StarRating } from "@/components/StarRating";
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
 * Compact offer card (Fiverr-style). Renders only:
 *  - cover image (if present — collapsed if not)
 *  - title
 *  - price
 *  - provider star rating
 * The entire card navigates to the full offer detail page.
 */
export function OfferCard({
  offer,
  owner,
  onChanged,
  referrer: _referrer = "card",
}: {
  offer: OfferCardData;
  owner?: boolean;
  onChanged?: () => void;
  referrer?: string;
}) {
  const nav = useNavigate();
  const inactive = offer.is_active === false;
  const detailHref = `/@${offer.provider.username}/${offer.slug}`;

  const avg = offer.provider.review_count > 0
    ? offer.provider.rating_sum / offer.provider.review_count
    : 0;

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

  return (
    <div
      onClick={goToOffer}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-md border border-border bg-card transition-all",
        "hover:-translate-y-0.5 hover:border-primary/50 hover:elev",
        inactive && "opacity-60",
      )}
    >
      {offer.cover_url && (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          <img
            src={offer.cover_url}
            alt={offer.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          {inactive ? (
            <span className="absolute left-2 top-2 rounded-[3px] bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Inactive
            </span>
          ) : offer.free_for_testimonial && (
            <span className="absolute left-2 top-2 rounded-[3px] bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
              Free
            </span>
          )}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        {!offer.cover_url && (inactive || offer.free_for_testimonial) && (
          <span
            className={cn(
              "w-fit rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em]",
              inactive
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground",
            )}
          >
            {inactive ? "Inactive" : "Free"}
          </span>
        )}

        <h3 className="line-clamp-2 font-display text-[15px] font-bold leading-tight text-foreground">
          {offer.title}
        </h3>

        <StarRating value={avg} count={offer.provider.review_count} showValue size={12} />

        <div className="mt-auto pt-1">
          <span
            className={cn(
              "font-display text-[15px] font-bold text-foreground",
              isContactPricing(offer) && "text-[13px] italic text-foreground/80",
            )}
          >
            {formatOfferPrice(offer)}
          </span>
        </div>

        {owner && (
          <div data-no-nav className="-mx-3 -mb-3 mt-2 flex border-t border-border sm:-mx-4 sm:-mb-4">
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
    </div>
  );
}
