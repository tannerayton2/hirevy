import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TierBadge } from "@/components/TierBadge";
import { StarRating } from "@/components/StarRating";
import { tierForReviewCount } from "@/lib/tiers";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Clock, ExternalLink, Globe, Info, Link as LinkIcon, MessageSquare, Pin, PinOff, Plus, Share2, Star, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { shareProfileUrl, shareReviewUrl } from "@/lib/shareLinks";
import { ProofReviewCard, type ProofReview } from "@/components/reviews/ProofReviewCard";
import { ProviderReply } from "@/components/reviews/ProviderReply";
import { ImportedTestimonialCard } from "@/components/reviews/ImportedTestimonialCard";
import { ReviewCompletenessShield } from "@/components/reviews/ReviewCompletenessShield";
import { ExpandableReviewText } from "@/components/reviews/ExpandableReviewText";
import { ImportedTestimonialModal } from "@/components/ImportedTestimonialModal";
import { ClaimProfileModal } from "@/components/ClaimProfileModal";
import { CategoryChip } from "@/components/CategoryChip";
import { fetchAvgFirstResponseMs, formatResponseTime } from "@/lib/responseTime";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ImportedTestimonial } from "@/lib/importedTestimonials";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Check, Filter as FilterIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "reviews" | "imported";

interface ProfileFull {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  service_category: string | null;
  review_count: number;
  rating_sum: number;
  follower_count: number;
  created_at: string;
  pinned_review_id: string | null;
  website_url: string | null;
  is_claimed: boolean;
}

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  body: string;
  created_at: string;
  completeness_score: number;
}

type SortKey = "newest" | "oldest" | "highest" | "lowest" | "complete" | "complete_asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Most Recent" },
  { value: "oldest", label: "Oldest First" },
  { value: "highest", label: "Best Rated" },
  { value: "lowest", label: "Worst Rated" },
  { value: "complete", label: "Strongest Review First" },
  { value: "complete_asc", label: "Weakest Review First" },
];

type UnifiedReview =
  | { kind: "verified"; id: string; created_at: string; rating: number; score: number; data: Review }
  | { kind: "proof"; id: string; created_at: string; rating: number; score: number; data: ProofReview };

function sortUnified(items: UnifiedReview[], key: SortKey): UnifiedReview[] {
  const out = [...items];
  const byDateDesc = (a: UnifiedReview, b: UnifiedReview) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  const byDateAsc = (a: UnifiedReview, b: UnifiedReview) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  if (key === "newest") out.sort(byDateDesc);
  if (key === "oldest") out.sort(byDateAsc);
  if (key === "highest") out.sort((a, b) => b.rating - a.rating || byDateDesc(a, b));
  if (key === "lowest") out.sort((a, b) => a.rating - b.rating || byDateDesc(a, b));
  if (key === "complete") out.sort((a, b) => b.score - a.score || byDateDesc(a, b));
  if (key === "complete_asc") out.sort((a, b) => a.score - b.score || byDateDesc(a, b));
  return out;
}

type OfferRow = { id: string; category: string; is_pinned?: boolean };

export default function Profile() {
  const { username = "" } = useParams();
  const handle = username.startsWith("@") ? username.slice(1) : username;
  const { user, profile: me } = useAuth();
  const [profile, setProfile] = useState<ProfileFull | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [proofReviews, setProofReviews] = useState<ProofReview[]>([]);
  const [imported, setImported] = useState<ImportedTestimonial[]>([]);
  const [reviewsSort, setReviewsSort] = useState<SortKey>("newest");
  const [verifiedPurchasesOnly, setVerifiedPurchasesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [responseMs, setResponseMs] = useState<number | null>(null);
  const [importedModalOpen, setImportedModalOpen] = useState(false);
  const [importedEditing, setImportedEditing] = useState<ImportedTestimonial | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: TabKey = tabParam === "imported" ? "imported" : "reviews";
  const setActiveTab = (t: TabKey) => {
    const next = new URLSearchParams(searchParams);
    if (t === "reviews") next.delete("tab");
    else next.set("tab", t);
    setSearchParams(next, { replace: true });
  };

  const loadAll = async () => {
    setLoading(true);
    const { data: p } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, service_category, review_count, rating_sum, follower_count, created_at, pinned_review_id, website_url, is_claimed")
      .eq("username", handle)
      .maybeSingle();
    const prof = p as ProfileFull | null;
    setProfile(prof);
    if (!prof) { setLoading(false); return; }

    const offersQuery = supabase
      .from("offers")
      .select("id, category, is_pinned")
      .eq("provider_id", prof.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const [offersRes, reviewsRes, proofRes, importedRes, followRes] = await Promise.all([
      offersQuery,
      supabase.rpc("list_provider_reviews", { p_provider: prof.id }),
      supabase
        .from("proof_backed_reviews")
        .select("id, provider_id, reviewer_name, rating, body, engagement_type, engagement_started_month, engagement_started_year, engagement_ended_month, engagement_ended_year, engagement_ongoing, amount_paid_bracket, proof_file_count, is_disputed, created_at")
        .eq("provider_id", prof.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("imported_testimonials")
        .select("*")
        .eq("provider_user_id", prof.id)
        .order("created_at", { ascending: false }),
      user
        ? supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", prof.id).maybeSingle()
        : Promise.resolve({ data: null } as { data: null }),
    ]);

    setOffers((offersRes.data as unknown as OfferRow[]) ?? []);
    setReviews((reviewsRes.data as unknown as Review[]) ?? []);
    setProofReviews((proofRes.data as unknown as ProofReview[]) ?? []);
    setImported((importedRes.data as unknown as ImportedTestimonial[]) ?? []);
    setFollowing(!!followRes.data);
    setLoading(false);

    // Fetch response time async (doesn't block render)
    void fetchAvgFirstResponseMs(prof.id).then(setResponseMs);
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

  

  const pinnedReview = profile?.pinned_review_id
    ? reviews.find((r) => r.id === profile.pinned_review_id) ?? null
    : null;

  // Unified reviews feed = verified + proof-backed (no data deleted)
  const unifiedReviews = useMemo<UnifiedReview[]>(() => {
    const v: UnifiedReview[] = reviews
      .filter((r) => !pinnedReview || r.id !== pinnedReview.id)
      .map((r) => ({
        kind: "verified" as const,
        id: r.id,
        created_at: r.created_at,
        rating: r.rating,
        score: r.completeness_score ?? 0,
        data: r,
      }));
    const p: UnifiedReview[] = proofReviews.map((r) => ({
      kind: "proof" as const,
      id: r.id,
      created_at: r.created_at,
      rating: r.rating,
      score: r.completeness_score ?? 0,
      data: r,
    }));
    return [...v, ...p];
  }, [reviews, proofReviews, pinnedReview]);

  const visibleReviews = useMemo(() => {
    const base = verifiedPurchasesOnly
      ? unifiedReviews.filter((u) => u.kind === "proof" && u.data.engagement_type === "paid_offer")
      : unifiedReviews;
    return sortUnified(base, reviewsSort);
  }, [unifiedReviews, verifiedPurchasesOnly, reviewsSort]);
  const totalReviewsCount = reviews.length + proofReviews.length;

  // Category chips: service_category + up to 3 distinct offer categories
  const categoryChips = useMemo(() => {
    const set = new Set<string>();
    if (profile?.service_category) set.add(profile.service_category);
    for (const o of offers) {
      if (set.size >= 4) break;
      set.add(o.category);
    }
    return Array.from(set).slice(0, 4);
  }, [profile, offers]);

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

  const togglePinReview = async (reviewId: string) => {
    if (!profile || !isMe) return;
    const next = profile.pinned_review_id === reviewId ? null : reviewId;
    const { error } = await supabase.from("profiles").update({ pinned_review_id: next }).eq("id", profile.id);
    if (error) { toast({ title: "Could not update", description: error.message, variant: "destructive" }); return; }
    setProfile({ ...profile, pinned_review_id: next });
    toast({ title: next ? "Review pinned" : "Review unpinned" });
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

  const providerDisplayName = profile.display_name || profile.username;
  const memberSince = new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  const hasAnyContent = offers.length > 0 || reviews.length > 0 || proofReviews.length > 0;

  return (
    <TooltipProvider delayDuration={150}>
    <div className="px-4 py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-2xl text-muted-foreground md:h-24 md:w-24">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (profile.display_name || profile.username).slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold leading-none md:text-3xl">{providerDisplayName}</h1>
              <TierBadge tier={tier} size="md" />
              {!profile.is_claimed && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Unclaimed
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
            {!profile.is_claimed && (
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={() => setClaimOpen(true)}>
                  Claim this profile
                </Button>
              </div>
            )}

            {/* Category chips */}
            {categoryChips.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {categoryChips.map((c) => <CategoryChip key={c} category={c} />)}
              </div>
            )}

            {/* Dense stat strip */}
            <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
              <StatItem>
                <StarRating value={avg} count={profile.review_count} showValue size={13} />
              </StatItem>
              <Dot />
              <StatItem>
                <Users className="h-3 w-3" /> {profile.follower_count} {profile.follower_count === 1 ? "follower" : "followers"}
              </StatItem>
              <Dot />
              <StatItem>Member since {memberSince}</StatItem>
              {responseMs != null && (
                <>
                  <Dot />
                  <StatItem>
                    <Clock className="h-3 w-3" /> Responds within {formatResponseTime(responseMs)}
                  </StatItem>
                </>
              )}
              <Dot />
              <StatItem>
                {profile.review_count} verified · {proofReviews.length} proof-backed
              </StatItem>
            </div>

            {/* Website link */}
            {profile.website_url && (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                <Globe className="h-3 w-3" />
                <span className="underline-offset-4 hover:underline">{prettyDomain(profile.website_url)}</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isMe ? (
            <>
              <Button variant="outline" onClick={copyReviewLink}><LinkIcon className="mr-1.5 h-4 w-4" /> Copy review link</Button>
              <Button asChild variant="outline"><Link to="/settings/profile">Edit profile</Link></Button>
              
            </>
          ) : (
            <>
              <Button variant={following ? "outline" : "default"} onClick={toggleFollow}>
                {following ? "Following" : "Follow"}
              </Button>
              <Button variant="outline" onClick={startMessage}><MessageSquare className="mr-1.5 h-4 w-4" /> Message</Button>
            </>
          )}
          <Button variant="outline" onClick={copyProfileLink}>
            <Share2 className="mr-1.5 h-4 w-4" /> Share
          </Button>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <section className="mt-5 max-w-[600px]">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{profile.bio}</p>
        </section>
      )}

      {/* Empty state for visitors on a brand-new profile */}
      {!hasAnyContent && !isMe && (
        <div className="mt-8 rounded-md border border-dashed border-border bg-card/40 p-10 text-center">
          <p className="font-display text-xl font-semibold">{providerDisplayName} is just getting started on HireVy.</p>
          <p className="mt-2 text-sm text-muted-foreground">Check back soon — offers and reviews will appear here.</p>
        </div>
      )}



      {/* Reviews / Imported — two-section layout */}
      <section className="mt-8">
        {/* Tab strip */}
        <div className="-mx-4 mb-6 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0">
          <div className="flex min-w-max items-center gap-1">
            <TabButton active={activeTab === "reviews"} onClick={() => setActiveTab("reviews")} count={totalReviewsCount} label="Reviews" />
            <TabButton active={activeTab === "imported"} onClick={() => setActiveTab("imported")} count={imported.length} label="Imported" />
          </div>
        </div>

        {/* Reviews (verified + proof-backed merged) */}
        {activeTab === "reviews" && (
          <div>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 font-display text-xl font-semibold">
                Reviews
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="About reviews">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs leading-relaxed">
                    <p>Reviews from clients invited by the provider and from anyone who submitted proof of working with them. Each review's left bar shows its completeness.</p>
                  </TooltipContent>
                </Tooltip>
              </h2>
              {!isMe && user && user.id !== profile.id && (
                <Button asChild size="sm" variant="outline">
                  <Link to={`/r/${profile.username}/proof`}>Leave a review</Link>
                </Button>
              )}
              {!user && (
                <Button asChild size="sm" variant="outline">
                  <Link to={`/auth?redirect=/r/${profile.username}/proof`}>Sign in to leave a review</Link>
                </Button>
              )}
            </div>

            {/* Filter + verified-purchases toggle */}
            {(unifiedReviews.length > 0 || pinnedReview) && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <FilterIcon className="mr-1 h-3.5 w-3.5" />
                      Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52">
                    {SORT_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        onSelect={() => setReviewsSort(opt.value)}
                        className="flex items-center justify-between text-xs"
                      >
                        <span>{opt.label}</span>
                        {reviewsSort === opt.value && (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  type="button"
                  onClick={() => setVerifiedPurchasesOnly((v) => !v)}
                  aria-pressed={verifiedPurchasesOnly}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors",
                    verifiedPurchasesOnly
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-primary/60 text-primary hover:bg-primary/10",
                  )}
                >
                  Verified purchases only
                </button>
              </div>
            )}

            {pinnedReview && (
              <article className="relative mb-4 rounded-md border-2 border-primary/60 bg-primary/[0.04] p-5 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
                      <Star className="h-3 w-3 fill-current" /> Featured
                    </span>
                    <p className="font-semibold">{pinnedReview.reviewer_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRating value={pinnedReview.rating} size={16} />
                    <ReviewCompletenessShield score={pinnedReview.completeness_score ?? 0} />
                  </div>
                </div>
                <ExpandableReviewText text={pinnedReview.body} className="text-[15px] leading-relaxed text-foreground/95" />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                    {new Date(pinnedReview.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                  {isMe && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => togglePinReview(pinnedReview.id)}>
                      <PinOff className="mr-1 h-3 w-3" /> Unpin
                    </Button>
                  )}
                </div>
                <ProviderReply
                  reviewId={pinnedReview.id}
                  reviewType="verified"
                  providerId={profile.id}
                  providerDisplayName={providerDisplayName}
                  isProviderViewer={isMe}
                />
              </article>
            )}

            {visibleReviews.length === 0 && !pinnedReview ? (
              <Empty msg="No reviews yet." />
            ) : visibleReviews.length === 0 ? (
              <Empty msg="No reviews match the current filter." />
            ) : (
              <div className="space-y-3">
                {visibleReviews.map((u) => u.kind === "verified" ? (
                  <article key={u.id} className="relative rounded-md border border-border bg-card p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-semibold">{u.data.reviewer_name}</p>
                      <div className="flex items-center gap-2">
                        <StarRating value={u.data.rating} size={14} />
                        <ReviewCompletenessShield score={u.score} />
                      </div>
                    </div>
                    <ExpandableReviewText text={u.data.body} className="text-sm text-muted-foreground" />
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                        {new Date(u.data.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                      {isMe && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => togglePinReview(u.id)}>
                          <Pin className="mr-1 h-3 w-3" /> Pin this review
                        </Button>
                      )}
                    </div>
                    <ProviderReply
                      reviewId={u.id}
                      reviewType="verified"
                      providerId={profile.id}
                      providerDisplayName={providerDisplayName}
                      isProviderViewer={isMe}
                    />
                  </article>
                ) : (
                  <ProofReviewCard
                    key={u.id}
                    review={u.data}
                    providerDisplayName={providerDisplayName}
                    isProviderViewer={isMe}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Imported */}
        {activeTab === "imported" && (
          <div>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-muted-foreground">Imported</h2>
              {isMe && imported.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={() => { setImportedEditing(null); setImportedModalOpen(true); }}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add
                </Button>
              )}
            </div>
            <p className="mb-4 text-xs text-muted-foreground/80">
              These reviews were submitted by the provider from external sources and have not been independently verified by HireVy.
            </p>

            {imported.length === 0 ? (
              isMe ? (
                <div className="rounded-md border border-dashed border-border bg-card/40 p-8 text-center md:p-10">
                  <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                    Drop your best testimonials here — old DMs, client emails, video testimonials,
                    anywhere you have proof of your work. These appear on your profile clearly
                    labeled as imported.
                  </p>
                  <Button
                    size="lg"
                    className="mt-5"
                    onClick={() => { setImportedEditing(null); setImportedModalOpen(true); }}
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Add your first imported testimonial
                  </Button>
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
                  {providerDisplayName} hasn't imported any testimonials yet.
                </p>
              )
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {imported.map((t) => (
                  <ImportedTestimonialCard
                    key={t.id}
                    t={t}
                    isOwner={isMe}
                    onEdit={(item) => { setImportedEditing(item); setImportedModalOpen(true); }}
                    onDelete={async (item) => {
                      if (!confirm("Delete this imported testimonial?")) return;
                      const { error } = await supabase
                        .from("imported_testimonials")
                        .delete()
                        .eq("id", item.id);
                      if (error) {
                        toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
                        return;
                      }
                      toast({ title: "Deleted" });
                      await loadAll();
                    }}
                  />
                ))}
              </div>
            )}
            <p className="mt-4 text-[11px] italic leading-relaxed text-muted-foreground/80">
              Imported testimonials are historical proof the provider brought from other platforms.
              They are not independently verified by HireVy and do not affect the tier badge or rating.
            </p>
          </div>
        )}
      </section>

      {isMe && profile && (
        <ImportedTestimonialModal
          open={importedModalOpen}
          onOpenChange={setImportedModalOpen}
          providerId={profile.id}
          initial={importedEditing}
          onSaved={loadAll}
        />
      )}

      {profile && !profile.is_claimed && (
        <ClaimProfileModal
          open={claimOpen}
          onOpenChange={setClaimOpen}
          profileId={profile.id}
          providerDisplayName={profile.username}
        />
      )}
    </div>
    </TooltipProvider>
  );
}

function prettyDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + (u.pathname && u.pathname !== "/" ? u.pathname.replace(/\/$/, "") : "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  }
}


function SortMenu({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortKey)}>
      <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">Newest</SelectItem>
        <SelectItem value="highest">Highest rated</SelectItem>
        <SelectItem value="lowest">Lowest rated</SelectItem>
      </SelectContent>
    </Select>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="rounded-md border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">{msg}</p>;
}

function StatItem({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 tracking-wide">{children}</span>;
}
function Dot() {
  return <span aria-hidden className="inline-block h-1 w-1 rounded-full bg-muted-foreground/40" />;
}

function TabButton({ active, onClick, count, label }: { active: boolean; onClick: () => void; count: number; label: string }) {
  const dim = count === 0 && !active;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative -mb-px shrink-0 px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "text-primary"
          : dim
            ? "text-muted-foreground/50 hover:text-muted-foreground"
            : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
      aria-pressed={active}
    >
      <span className="font-display tracking-wide">{label}</span>
      <span className={[
        "ml-2 text-[11px] tabular-nums",
        active ? "text-primary/80" : "text-muted-foreground/60",
      ].join(" ")}>· {count}</span>
      {active && (
        <span aria-hidden className="absolute inset-x-2 -bottom-px h-[2px] bg-primary" />
      )}
    </button>
  );
}
