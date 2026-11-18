import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TierGem } from "@/components/TierGem";
import { StarRating } from "@/components/StarRating";
import { tierForReviewCount } from "@/lib/tiers";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ArrowUpRight, MessageSquare, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { shareOfferUrl } from "@/lib/shareLinks";
import { GoldAvatar } from "@/components/GoldAvatar";
import { SEAL_PATHS } from "@/components/ProofScoreCard";

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
        .select(`*, provider:profiles!offers_provider_id_fkey ( id, username, display_name, avatar_url, review_count, rating_sum, points )`)
        .eq("provider_id", (prof as { id: string }).id)
        .eq("slug", slug)
        .maybeSingle();
      if (!cancel && data) {
        setOffer(data as unknown as OfferDetail);
        const providerId = (data as { provider_id: string }).provider_id;
        const offerId = (data as { id: string }).id;
        const { data: revs } = await supabase.rpc("list_provider_reviews", { p_provider: providerId });
        if (!cancel) {
          const filtered = ((revs ?? []) as Array<Record<string, unknown>>)
            .filter((r) => r.offer_id === offerId)
            .map((r) => ({
              id: r.id as string,
              rating: Number(r.rating),
              body: (r.body as string) ?? "",
              created_at: r.created_at as string,
              reviewer_name: (r.reviewer_name as string) ?? "Reviewer",
              reviewer_username: (r.reviewer_username as string) ?? null,
              reviewer_display_name: (r.reviewer_display_name as string) ?? null,
            }));
          setOfferReviews(filtered);
        }
      }
      if (!cancel) setLoading(false);
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
    <div className="mx-auto max-w-4xl px-4 pb-36 pt-4 md:px-8 md:pb-10 md:pt-8">
      {/* Cover: photo if the coach added one, otherwise the gold security pattern */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[linear-gradient(160deg,#221D12,#0C0C0E_70%)] shadow-[0_18px_40px_-16px_rgba(0,0,0,0.75)]">
        {offer.cover_url ? (
          <img src={offer.cover_url} alt="" className="aspect-[16/10] w-full object-cover md:aspect-[16/7]" />
        ) : (
          <div className="relative aspect-[16/10] w-full md:aspect-[16/7]">
            <svg aria-hidden="true" viewBox="0 0 150 150" className="absolute -right-16 -top-10 h-[130%] text-primary opacity-[0.14]">
              <g fill="none" stroke="currentColor" strokeWidth={0.6}>
                {SEAL_PATHS.map((d, i) => <path key={i} d={d} />)}
              </g>
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,11,0.2)_0%,rgba(10,10,11,0)_35%,rgba(10,10,11,0.88)_100%)]" />
        <div className="absolute inset-x-3 top-3 flex justify-between">
          <Link
            to={`/@${offer.provider.username}`}
            className="rounded-full border border-white/10 bg-black/40 px-3.5 py-2 text-xs font-medium backdrop-blur-md hover:bg-black/60"
          >
            ← @{offer.provider.username}
          </Link>
          <button
            type="button"
            onClick={copyShareLink}
            aria-label="Copy share link"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-md hover:bg-black/60"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
        <div className="absolute inset-x-5 bottom-5">
          {offer.offer_tier && (
            <span className="inline-block rounded-full border border-primary/40 bg-black/30 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-primary backdrop-blur">
              {offer.offer_tier}
            </span>
          )}
          <h1 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-4xl">{offer.title}</h1>
        </div>
      </div>

      {/* Coach strip */}
      <Link
        to={`/@${offer.provider.username}`}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-card px-4 py-3 shadow-[0_12px_30px_-14px_rgba(0,0,0,0.7)] transition-colors hover:border-primary/40"
      >
        <GoldAvatar name={offer.provider.display_name || offer.provider.username} url={offer.provider.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold">
            {offer.provider.display_name || `@${offer.provider.username}`} <TierGem tier={tier} />
          </p>
          <StarRating value={avg} count={offer.provider.review_count} showValue size={12} />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">View profile</span>
      </Link>

      <div className="prose prose-invert mt-6 max-w-none text-[15px] leading-relaxed text-muted-foreground">
        {offer.description.split("\n").map((p, i) => <p key={i}>{p}</p>)}
      </div>

      {/* Floating call to action: pinned above the bottom bar on phones, inline on desktop */}
      <div
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.75rem)" }}
        className="fixed inset-x-4 z-30 md:static md:mt-8 md:flex md:justify-end"
      >
        {hasSalesUrl ? (
          <Button asChild size="lg" className="h-14 w-full text-[15.5px] md:w-auto md:px-10">
            <a href={outHref} target="_blank" rel="noopener noreferrer">
              Visit sales page <ArrowUpRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
        ) : (
          <Button size="lg" onClick={startMessage} className="h-14 w-full text-[15.5px] md:w-auto md:px-10">
            <MessageSquare className="mr-1 h-4 w-4" /> Contact for details
          </Button>
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">
          Reviews for this offer <span className="text-muted-foreground">({offerReviews.length})</span>
        </h2>
        {offerReviews.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No reviews tagged to this offer yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {offerReviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-white/[0.08] bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    to={r.reviewer_username ? `/@${r.reviewer_username}` : "#"}
                    className="text-sm font-semibold hover:text-primary"
                  >
                    {r.reviewer_display_name || r.reviewer_name}
                    {r.reviewer_username && <span className="ml-1 text-muted-foreground font-normal">@{r.reviewer_username}</span>}
                  </Link>
                  <StarRating value={r.rating} size={14} />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{r.body}</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                  {new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
