import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ArrowUpRight, MessageSquare, Pencil, Trash2 } from "lucide-react";
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
  category: string;
  is_active?: boolean;
  cta_link?: string | null;
  cta_label?: string | null;
  hosted_on_hirevy?: boolean;
  offer_tier?: string | null;
  /** @deprecated retained for query compatibility; not rendered. */
  free_for_testimonial?: boolean;
  provider: {
    id?: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    review_count: number;
    rating_sum: number;
  };
}

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

  const hasSalesUrl = !!offer.cta_link && offer.cta_link.trim().length > 0;

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
    if (hasSalesUrl) {
      window.open(offer.cta_link!, "_blank", "noopener,noreferrer");
    } else if (offer.provider.id) {
      nav(`/messages?to=${offer.provider.id}`);
    } else {
      nav(detailHref);
    }
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
          {inactive && (
            <span className="absolute left-2 top-2 rounded-[3px] bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Inactive
            </span>
          )}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        {!offer.cover_url && inactive && (
          <span className="w-fit rounded-[3px] bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Inactive
          </span>
        )}

        <h3 className="line-clamp-2 font-display text-[15px] font-bold leading-tight text-foreground">
          {offer.title}
        </h3>

        <Link
          to={`/@${offer.provider.username}`}
          data-no-nav
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2"
        >
          {offer.provider.avatar_url ? (
            <img
              src={offer.provider.avatar_url}
              alt={offer.provider.display_name || offer.provider.username}
              className="h-6 w-6 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted ring-1 ring-border">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                {(offer.provider.display_name || offer.provider.username).slice(0, 1)}
              </span>
            </div>
          )}
          <div className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-[11px] font-semibold text-foreground">
              {offer.provider.display_name || offer.provider.username}
            </span>
            <span className="truncate text-[10px] text-muted-foreground">
              @{offer.provider.username}
            </span>
          </div>
        </Link>

        <StarRating value={avg} count={offer.provider.review_count} showValue size={12} />

        <div className="mt-auto pt-2" data-no-nav>
          <button
            type="button"
            onClick={handleCta}
            className={cn(
              "inline-flex w-full items-center justify-center gap-1.5 rounded-[3px] bg-primary px-2.5 py-1.5",
              "text-[11px] font-bold uppercase tracking-[0.14em] text-primary-foreground transition-colors",
              "hover:bg-primary/90",
            )}
          >
            {hasSalesUrl ? (
              <>Visit Sales Page <ArrowUpRight className="h-3 w-3" /></>
            ) : (
              <>Contact for details <MessageSquare className="h-3 w-3" /></>
            )}
          </button>
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
