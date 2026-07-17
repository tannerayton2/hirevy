import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TierBadge } from "@/components/TierBadge";
import { StarRating } from "@/components/StarRating";
import { tierForReviewCount } from "@/lib/tiers";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ArrowUpRight, MessageSquare, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { shareOfferUrl } from "@/lib/shareLinks";
import { formatOfferPrice, isContactPricing, type PricingModel } from "@/lib/pricing";
import { OfferCoverPlaceholder } from "@/components/OfferCoverPlaceholder";

interface OfferDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_url: string | null;
  video_url: string | null;
  price_cents: number | null;
  price_max_cents: number | null;
  pricing_model: PricingModel | string | null;
  free_for_testimonial: boolean;
  category: string;
  tags: string[];
  provider_id: string;
  cta_link: string | null;
  cta_label: string | null;
  secondary_link: string | null;
  secondary_link_label: string | null;
  hosted_on_hirevy: boolean;
  offer_tier: string | null;
  provider: {
    id: string; username: string; display_name: string | null;
    avatar_url: string | null; review_count: number; rating_sum: number;
  };
}

function videoEmbed(url: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video/${u.pathname.slice(1)}`;
    if (u.hostname.includes("loom.com")) return url.replace("/share/", "/embed/");
  } catch { return null; }
  return null;
}

export default function OfferDetail() {
  const { username = "", slug = "" } = useParams();
  const handle = username.startsWith("@") ? username.slice(1) : username;
  const { user } = useAuth();
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);

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

  const startMessage = async () => {
    if (!user) { window.location.href = "/auth"; return; }
    if (!offer) return;
    // Open compose view in draft mode — thread is only created on first send.
    window.location.href = `/messages?to=${offer.provider.id}`;
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
  const embed = videoEmbed(offer.video_url);
  const isLinkOut = !offer.hosted_on_hirevy && !!offer.cta_link;
  const ctaLabel = (offer.cta_label || "Book Now").slice(0, 24);
  const priceLabel = offer.free_for_testimonial
    ? "FREE — Testimonial Only"
    : formatOfferPrice(offer) || "—";
  const priceMuted = isContactPricing(offer);

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
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">{offer.category}</span>
            {offer.offer_tier && (
              <span className="rounded-[3px] border border-primary/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                {offer.offer_tier}
              </span>
            )}
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{offer.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to={`/@${offer.provider.username}`} className="flex items-center gap-2 text-sm font-semibold hover:text-primary">
              {offer.provider.display_name || `@${offer.provider.username}`}
            </Link>
            <TierBadge tier={tier} size="sm" />
            <StarRating value={avg} count={offer.provider.review_count} showValue size={13} />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-border py-4">
            <div
              className={
                priceMuted
                  ? "font-display text-xl font-semibold italic text-foreground/80"
                  : "font-display text-2xl font-bold"
              }
            >
              {priceLabel}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copyShareLink}><Share2 className="mr-1.5 h-4 w-4" /> Share</Button>
              {isLinkOut ? (
                <>
                  {offer.secondary_link && (
                    <Button variant="outline" asChild>
                      <a
                        href={`/out/${offer.id}?ref=offer_detail_secondary`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          // Use the secondary link directly (not via /out, since /out routes to primary)
                          e.preventDefault();
                          window.open(offer.secondary_link!, "_blank", "noopener,noreferrer");
                        }}
                      >
                        {(offer.secondary_link_label || "Learn More").slice(0, 24)}
                      </a>
                    </Button>
                  )}
                  <Button asChild size="lg" className="font-bold uppercase tracking-[0.14em]">
                    <a href={outHref} target="_blank" rel="noopener noreferrer">
                      {ctaLabel} <ArrowUpRight className="ml-1.5 h-4 w-4" />
                    </a>
                  </Button>
                </>
              ) : (
                <Button onClick={startMessage}><MessageSquare className="mr-1.5 h-4 w-4" /> Message Provider</Button>
              )}
            </div>
          </div>

          {embed && offer.hosted_on_hirevy && (
            <div className="mt-6 aspect-video overflow-hidden rounded-md border border-border bg-black">
              <iframe src={embed} className="h-full w-full" allowFullScreen title={offer.title} />
            </div>
          )}

          <div className="prose prose-invert mt-6 max-w-none text-sm text-muted-foreground">
            {offer.description.split("\n").map((p, i) => <p key={i}>{p}</p>)}
          </div>


          {/* Big CTA at the bottom for link-out offers */}
          {isLinkOut && (
            <div className="mt-8 rounded-md border border-primary/30 bg-primary/[0.04] p-5 text-center">
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Ready to start?</p>
              <Button asChild size="lg" className="font-bold uppercase tracking-[0.14em]">
                <a href={outHref} target="_blank" rel="noopener noreferrer">
                  {ctaLabel} <ArrowUpRight className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
