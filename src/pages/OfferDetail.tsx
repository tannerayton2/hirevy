import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TierBadge } from "@/components/TierBadge";
import { StarRating } from "@/components/StarRating";
import { tierForReviewCount } from "@/lib/tiers";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ArrowUpRight, MessageSquare, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { shareOfferUrl } from "@/lib/shareLinks";

interface OfferDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_url: string | null;
  category: string;
  tags: string[];
  provider_id: string;
  cta_link: string | null;
  offer_tier: string | null;
  provider: {
    id: string; username: string; display_name: string | null;
    avatar_url: string | null; review_count: number; rating_sum: number;
  };
}

export default function OfferDetail() {
  const { username = "", slug = "" } = useParams();
  const handle = username.startsWith("@") ? username.slice(1) : username;
  const { user } = useAuth();
  const nav = useNavigate();
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [offerReviews, setOfferReviews] = useState<Array<{
    id: string; rating: number; body: string; created_at: string;
    reviewer_name: string;
    reviewer_username: string | null; reviewer_display_name: string | null;
  }>>([]);

  useEffect(() => {
    let cancel = false;
    const run = async () => {
      const { data: prof } = await supabase.from("profiles").select("id").eq("username", handle).maybeSingle();
      if (!prof || cancel) { setLoading(false); return; }
      const { data } = await supabase
        .from("offers")
        .select(`*, provider:profiles!offers_provider_id_fkey ( id, username, display_name, avatar_url, review_count, rating_sum )`)
        .eq("provider_id", (prof as { id: string }).id)
        .eq("slug", slug)
        .maybeSingle();
      if (!cancel) { setOffer(data as unknown as OfferDetail); setLoading(false); }
    };
    void run();
    return () => { cancel = true; };
  }, [handle, slug]);

  const startMessage = () => {
    if (!user) { window.location.href = "/auth"; return; }
    if (!offer) return;
    nav(`/messages?to=${offer.provider.id}`);
  };

  const copyShareLink = async () => {
    if (!offer) return;
    await navigator.clipboard.writeText(shareOfferUrl(offer.provider.username, offer.slug));
    toast({ title: "Share link copied", description: "It unfurls with the offer cover and details." });
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!offer) return <div className="p-8"><h1 className="font-display text-2xl font-semibold">Offer not found</h1></div>;

  const tier = tierForReviewCount(offer.provider.review_count);
  const avg = offer.provider.review_count > 0 ? offer.provider.rating_sum / offer.provider.review_count : 0;
  const hasSalesUrl = !!offer.cta_link && offer.cta_link.trim().length > 0;
  const outHref = `/out/${offer.id}?ref=offer_detail`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
      <Link to={`/@${offer.provider.username}`} className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
        ← @{offer.provider.username}
      </Link>

      <div className="mt-4 overflow-hidden rounded-md border border-border bg-card">
        {offer.cover_url && (
          <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
            <img src={offer.cover_url} alt={offer.title} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="p-5 md:p-7">
          {offer.offer_tier && (
            <span className="rounded-[3px] border border-primary/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              {offer.offer_tier}
            </span>
          )}
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{offer.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to={`/@${offer.provider.username}`} className="flex items-center gap-2 text-sm font-semibold hover:text-primary">
              {offer.provider.display_name || `@${offer.provider.username}`}
            </Link>
            <TierBadge tier={tier} size="sm" />
            <StarRating value={avg} count={offer.provider.review_count} showValue size={13} />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-y border-border py-4">
            <Button variant="outline" onClick={copyShareLink}><Share2 className="mr-1.5 h-4 w-4" /> Share</Button>
            {hasSalesUrl ? (
              <Button asChild size="lg" className="font-bold uppercase tracking-[0.14em]">
                <a href={outHref} target="_blank" rel="noopener noreferrer">
                  Visit Sales Page <ArrowUpRight className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
            ) : (
              <Button size="lg" onClick={startMessage} className="font-bold uppercase tracking-[0.14em]">
                Contact for details <MessageSquare className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="prose prose-invert mt-6 max-w-none text-sm text-muted-foreground">
            {offer.description.split("\n").map((p, i) => <p key={i}>{p}</p>)}
          </div>

          <div className="mt-8 rounded-md border border-primary/30 bg-primary/[0.04] p-5 text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {hasSalesUrl ? "Ready to start?" : "Interested?"}
            </p>
            {hasSalesUrl ? (
              <Button asChild size="lg" className="font-bold uppercase tracking-[0.14em]">
                <a href={outHref} target="_blank" rel="noopener noreferrer">
                  Visit Sales Page <ArrowUpRight className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
            ) : (
              <Button size="lg" onClick={startMessage} className="font-bold uppercase tracking-[0.14em]">
                Contact for details <MessageSquare className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
