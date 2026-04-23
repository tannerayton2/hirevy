import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { OffersPanel, type OfferRow } from "@/components/OffersPanel";
import { ArrowLeft, Plus } from "lucide-react";

interface ProfileLite {
  id: string;
  username: string;
  display_name: string | null;
}

export default function ProfileOffers() {
  const { username = "" } = useParams();
  const handle = username.startsWith("@") ? username.slice(1) : username;
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: p } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .eq("username", handle)
      .maybeSingle();
    const prof = p as ProfileLite | null;
    setProfile(prof);
    if (!prof) { setLoading(false); return; }
    const isOwner = user?.id === prof.id;
    let q = supabase
      .from("offers")
      .select(`id, slug, title, description, cover_url, price_cents, price_max_cents, pricing_model, free_for_testimonial, category, is_active, is_pinned,
               cta_link, cta_label, hosted_on_hirevy, offer_tier,
               provider:profiles!offers_provider_id_fkey ( username, display_name, review_count, rating_sum )`)
      .eq("provider_id", prof.id)
      .order("created_at", { ascending: false });
    if (!isOwner) q = q.eq("is_active", true);
    const { data } = await q;
    setOffers((data as unknown as OfferRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, user]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!profile) {
    return (
      <div className="p-8">
        <h1 className="font-display text-2xl font-semibold">No such profile</h1>
        <Button asChild variant="outline" className="mt-4"><Link to="/">Back to Explore</Link></Button>
      </div>
    );
  }

  const isMe = user?.id === profile.id;
  const displayName = profile.display_name || profile.username;

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          to={`/@${profile.username}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to profile
        </Link>
        {isMe && (
          <Button asChild size="sm">
            <Link to="/settings/offers/new"><Plus className="mr-1.5 h-4 w-4" /> Create offer</Link>
          </Button>
        )}
      </div>

      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Offers</p>
        <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">{displayName}'s offers</h1>
      </div>

      <OffersPanel offers={offers} isOwner={isMe} onChanged={load} tabParamKey="tab" referrer="offers-page" />
    </div>
  );
}
