import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ArrowUpRight, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { TierGem } from "@/components/TierGem";
import { tierForPoints } from "@/lib/tiers";
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
    points?: number | null;
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
        "group relative flex cursor-pointer flex-col",
        inactive && "opacity-60",
      )}
      style={{
        backgroundColor: "#141414",
        border: "0.5px solid #2a2a2a",
        borderRadius: "12px",
        padding: "18px",
      }}
    >
      {inactive && !offer.cover_url && (
        <span
          className="absolute left-3 top-3 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em]"
          style={{ backgroundColor: "#1a1a1a", color: "#8a8a82" }}
        >
          Inactive
        </span>
      )}

      {/* Row 1: title + category */}
      <div className="mb-[10px] flex items-start justify-between" style={{ gap: "10px" }}>
        <h3
          className="min-w-0 flex-1 font-display text-[20px] font-medium line-clamp-2"
          style={{ color: "#f0ede6", lineHeight: 1.2 }}
        >
          {offer.title}
        </h3>
        {offer.category && (
          <span
            className="shrink-0 whitespace-nowrap rounded-[6px] font-medium normal-case"
            style={{
              backgroundColor: "#1e1a10",
              color: "#c9a24a",
              fontSize: "11px",
              padding: "3px 10px",
              marginLeft: "10px",
            }}
          >
            {offer.category}
          </span>
        )}
      </div>

      {/* Row 2: coach identity + rating */}
      <div className="mb-[16px] flex items-center justify-between">
        <Link
          to={`/@${offer.provider.username}`}
          data-no-nav
          onClick={(e) => e.stopPropagation()}
          className="flex items-center"
          style={{ gap: "8px" }}
        >
          {offer.provider.avatar_url ? (
            <img
              src={offer.provider.avatar_url}
              alt={offer.provider.display_name || offer.provider.username}
              className="h-[26px] w-[26px] shrink-0 rounded-full object-cover"
              style={{ backgroundColor: "#1a1a1a" }}
            />
          ) : (
            <div
              className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "#1a1a1a", color: "#8a8a82" }}
            >
              <span className="text-[10px] font-bold uppercase">
                {(offer.provider.display_name || offer.provider.username).slice(0, 1)}
              </span>
            </div>
          )}
          <div className="flex flex-col">
            <span
              className="truncate text-[13px] font-medium"
              style={{ color: "#d8d4cc" }}
            >
              {offer.provider.display_name || offer.provider.username}
            </span>
            <span
              className="truncate text-[12px]"
              style={{ color: "#8a8a82" }}
            >
              @{offer.provider.username}
            </span>
          </div>
        </Link>

        <div data-no-nav className="shrink-0">
          <StarRating
            value={avg}
            count={offer.provider.review_count}
            showValue
            size={12}
            valueClassName="text-[#8a8a82]"
            countClassName="text-[#8a8a82]"
          />
        </div>
      </div>

      {/* Row 3: CTA button */}
      <div data-no-nav>
        <button
          type="button"
          onClick={handleCta}
          className="inline-flex w-full items-center justify-center gap-1.5 transition-colors hover:brightness-110"
          style={{
            backgroundColor: "#c9a24a",
            color: "#1a1508",
            padding: "11px",
            borderRadius: "8px",
            fontSize: "12px",
            letterSpacing: "0.06em",
            fontWeight: 500,
          }}
        >
          {hasSalesUrl ? (
            <>VISIT SALES PAGE <ArrowUpRight className="h-3 w-3" /></>
          ) : (
            <>CONTACT FOR DETAILS <MessageSquare className="h-3 w-3" /></>
          )}
        </button>
      </div>

      {/* Owner actions */}
      {owner && (
        <div data-no-nav className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); nav(`/settings/offers/${offer.id}`); }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[6px] py-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors hover:brightness-110"
            style={{ backgroundColor: "#1e1a10", color: "#c9a24a" }}
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[6px] py-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors hover:brightness-110"
                style={{ backgroundColor: "#2a0f0f", color: "#e08e8e" }}
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
  );
}
