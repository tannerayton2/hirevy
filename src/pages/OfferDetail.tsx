import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TierBadge } from "@/components/TierBadge";
import { StarRating } from "@/components/StarRating";
import { tierForReviewCount } from "@/lib/tiers";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { shareOfferUrl } from "@/lib/shareLinks";

interface OfferDetail {
  id: string; slug: string; title: string; description: string; cover_url: string | null;
  video_url: string | null; price_cents: number | null; free_for_testimonial: boolean;
  category: string; tags: string[]; provider_id: string;
  provider: { id: string; username: string; display_name: string | null; avatar_url: string | null; review_count: number; rating_sum: number; };
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
    const { data, error } = await supabase.rpc("get_or_create_thread", { other_user: offer.provider.id });
    if (error) { toast({ title: "Could not message", description: error.message, variant: "destructive" }); return; }
    window.location.href = `/messages?t=${data}`;
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
  const priceLabel = offer.free_for_testimonial ? "FREE — Testimonial Only" : offer.price_cents != null ? `$${(offer.price_cents/100).toLocaleString()}` : "—";

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
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">{offer.category}</span>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{offer.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to={`/@${offer.provider.username}`} className="flex items-center gap-2 text-sm font-semibold hover:text-primary">
              {offer.provider.display_name || `@${offer.provider.username}`}
            </Link>
            <TierBadge tier={tier} size="sm" />
            <StarRating value={avg} count={offer.provider.review_count} showValue size={13} />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-border py-4">
            <div className="font-display text-2xl font-bold">{priceLabel}</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyShareLink}><Share2 className="mr-1.5 h-4 w-4" /> Share</Button>
              <Button onClick={startMessage}><MessageSquare className="mr-1.5 h-4 w-4" /> Message Provider</Button>
            </div>
          </div>

          {embed && (
            <div className="mt-6 aspect-video overflow-hidden rounded-md border border-border bg-black">
              <iframe src={embed} className="h-full w-full" allowFullScreen title={offer.title} />
            </div>
          )}

          <div className="prose prose-invert mt-6 max-w-none text-sm text-muted-foreground">
            {offer.description.split("\n").map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {offer.tags?.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {offer.tags.map((t) => (
                <span key={t} className="rounded-[3px] bg-secondary px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
