import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TierBadge } from "@/components/TierBadge";
import { StarRating } from "@/components/StarRating";
import { tierForReviewCount } from "@/lib/tiers";
import { OfferCard, type OfferCardData } from "@/components/OfferCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Copy, Link as LinkIcon, MessageSquare, Plus, Share2, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { shareProfileUrl, shareReviewUrl } from "@/lib/shareLinks";

interface ProfileFull {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  service_category: string | null;
  about_what: string | null;
  about_who: string | null;
  about_results: string | null;
  review_count: number;
  rating_sum: number;
  follower_count: number;
}

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  body: string;
  created_at: string;
}

export default function Profile() {
  const { username = "" } = useParams();
  const handle = username.startsWith("@") ? username.slice(1) : username;
  const { user, profile: me } = useAuth();
  const [profile, setProfile] = useState<ProfileFull | null>(null);
  const [offers, setOffers] = useState<OfferCardData[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", handle)
      .maybeSingle();
    const prof = p as ProfileFull | null;
    setProfile(prof);
    if (!prof) { setLoading(false); return; }

    const isOwner = user?.id === prof.id;
    let offersQuery = supabase
      .from("offers")
      .select(`id, slug, title, cover_url, price_cents, free_for_testimonial, category, is_active,
               provider:profiles!offers_provider_id_fkey ( username, display_name, review_count, rating_sum )`)
      .eq("provider_id", prof.id)
      .order("created_at", { ascending: false });
    if (!isOwner) offersQuery = offersQuery.eq("is_active", true);

    const [offersRes, reviewsRes, followRes] = await Promise.all([
      offersQuery,
      supabase.rpc("list_provider_reviews", { p_provider: prof.id }),
      user
        ? supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", prof.id).maybeSingle()
        : Promise.resolve({ data: null } as { data: null }),
    ]);

    setOffers((offersRes.data as unknown as OfferCardData[]) ?? []);
    setReviews((reviewsRes.data as unknown as Review[]) ?? []);
    setFollowing(!!followRes.data);
    setLoading(false);
  };

  useEffect(() => {
    let cancel = false;
    void (async () => { if (!cancel) await loadAll(); })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, user]);

  const isMe = me?.id === profile?.id;
  const tier = profile ? tierForReviewCount(profile.review_count) : "unranked";
  const avg = profile && profile.review_count > 0 ? profile.rating_sum / profile.review_count : 0;
  const paidOffers = offers.filter((o) => !o.free_for_testimonial);
  const freeOffers = offers.filter((o) => o.free_for_testimonial);

  const reviewLink = profile ? shareReviewUrl(profile.username) : "";
  const profileShareLink = profile ? shareProfileUrl(profile.username) : "";

  const copyReviewLink = async () => {
    await navigator.clipboard.writeText(reviewLink);
    toast({ title: "Link copied", description: "Share it with past clients to collect a verified review." });
  };
  const copyProfileLink = async () => {
    await navigator.clipboard.writeText(profileShareLink);
    toast({ title: "Profile link copied", description: "Share it anywhere — it unfurls with your tier and reviews." });
  };

  const toggleFollow = async () => {
    if (!user || !profile) { window.location.href = "/auth"; return; }
    if (following) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.id);
      setFollowing(false);
      setProfile({ ...profile, follower_count: Math.max(0, profile.follower_count - 1) });
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.id });
      setFollowing(true);
      setProfile({ ...profile, follower_count: profile.follower_count + 1 });
    }
  };

  const startMessage = async () => {
    if (!user || !profile) { window.location.href = "/auth"; return; }
    const { data, error } = await supabase.rpc("get_or_create_thread", { other_user: profile.id });
    if (error) { toast({ title: "Could not open thread", description: error.message, variant: "destructive" }); return; }
    window.location.href = `/messages?t=${data}`;
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!profile) {
    return (
      <div className="p-8">
        <h1 className="font-display text-2xl font-semibold">No such profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">@{handle} doesn't exist on HireVy.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/">Back to Explore</Link></Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      {/* Header */}
      <div className="flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary font-display text-2xl text-muted-foreground md:h-24 md:w-24">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (profile.display_name || profile.username).slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold leading-none md:text-3xl">{profile.display_name || profile.username}</h1>
              <TierBadge tier={tier} size="md" />
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">@{profile.username}{profile.service_category && ` · ${profile.service_category}`}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              <StarRating value={avg} count={profile.review_count} showValue size={14} />
              <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {profile.follower_count} followers</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isMe ? (
            <>
              <Button variant="outline" onClick={copyReviewLink}><LinkIcon className="mr-1.5 h-4 w-4" /> Copy review link</Button>
              <Button asChild variant="outline"><Link to="/settings/profile">Edit profile</Link></Button>
              <Button asChild><Link to="/settings/offers/new"><Plus className="mr-1.5 h-4 w-4" /> Create offer</Link></Button>
            </>
          ) : (
            <>
              <Button variant={following ? "outline" : "default"} onClick={toggleFollow}>
                {following ? "Following" : "Follow"}
              </Button>
              <Button variant="outline" onClick={startMessage}><MessageSquare className="mr-1.5 h-4 w-4" /> Message</Button>
            </>
          )}
        </div>
      </div>

      {isMe && (
        <div className="mt-6 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">Your review link</p>
              <p className="font-mono text-xs text-muted-foreground">{reviewLink}</p>
            </div>
            <Button size="sm" variant="outline" onClick={copyReviewLink}><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</Button>
          </div>
        </div>
      )}

      {/* About */}
      {(profile.bio || profile.about_what || profile.about_who || profile.about_results) && (
        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <div>
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">What I do</h2>
            <p className="text-sm text-muted-foreground">{profile.about_what || profile.bio || "—"}</p>
          </div>
          <div>
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Who it's for</h2>
            <p className="text-sm text-muted-foreground">{profile.about_who || "—"}</p>
          </div>
          <div>
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Results</h2>
            <p className="text-sm text-muted-foreground">{profile.about_results || "—"}</p>
          </div>
        </section>
      )}

      {/* Offers */}
      <Section title="Paid offers" count={paidOffers.length}>
        {paidOffers.length === 0 ? <Empty msg={isMe ? "No paid offers yet. Create one to get started." : "No paid offers yet."} /> : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {paidOffers.map((o) => <OfferCard key={o.id} offer={o} owner={isMe} onChanged={loadAll} />)}
          </div>
        )}
      </Section>

      <Section title="Free for testimonial" count={freeOffers.length}>
        {freeOffers.length === 0 ? <Empty msg="No free-for-testimonial offers yet." /> : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {freeOffers.map((o) => <OfferCard key={o.id} offer={o} owner={isMe} onChanged={loadAll} />)}
          </div>
        )}
      </Section>

      {/* Reviews */}
      <Section title="Verified reviews" count={profile.review_count}>
        {reviews.length === 0 ? (
          <Empty msg="No reviews yet." />
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <article key={r.id} className="rounded-md border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold">{r.reviewer_name}</p>
                  <StarRating value={r.rating} size={14} />
                </div>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{r.body}</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                  {new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </article>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-baseline justify-between border-b border-border pb-2">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{count}</span>
      </div>
      {children}
    </section>
  );
}
function Empty({ msg }: { msg: string }) {
  return <p className="rounded-md border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">{msg}</p>;
}
