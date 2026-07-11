import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { usePageMeta } from "@/lib/usePageMeta";
import { supabase } from "@/integrations/supabase/client";
import { TierBadge } from "@/components/TierBadge";
import { StarRating } from "@/components/StarRating";
import { tierForPoints, TIER_RANK, TIER_REQUIREMENT, TIER_LABEL as TIER_LABEL_MAP, nextTier, pointsToNextTier, tierProgress } from "@/lib/tiers";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { BadgeCheck, Clock, ExternalLink, Globe, Info, Instagram, Link as LinkIcon, Linkedin, LogOut, Menu, MessageSquare, MoreHorizontal, Pin, PinOff, Plus, Settings as SettingsIcon, Share2, Star, Twitter, Users, UserCheck, Flag, Youtube } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TIER_LABEL, type Tier } from "@/lib/tiers";
import { CongratsModal } from "@/components/CongratsModal";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { shareProfileUrl, shareReviewUrl } from "@/lib/shareLinks";
import { ProofReviewCard, type ProofReview } from "@/components/reviews/ProofReviewCard";
import { ProviderReply } from "@/components/reviews/ProviderReply";
import { ImportedTestimonialCard } from "@/components/reviews/ImportedTestimonialCard";
import { ReviewCompletenessShield } from "@/components/reviews/ReviewCompletenessShield";
import { ExpandableReviewText } from "@/components/reviews/ExpandableReviewText";
import { ImportedTestimonialModal } from "@/components/ImportedTestimonialModal";
import { OfferCard, type OfferCardData } from "@/components/OfferCard";

import { CategoryChip } from "@/components/CategoryChip";
import { fetchAvgFirstResponseMs, formatResponseTime } from "@/lib/responseTime";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ImportedTestimonial } from "@/lib/importedTestimonials";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Check, Filter as FilterIcon } from "lucide-react";
import { ReportProfileModal } from "@/components/ReportProfileModal";
import { ClaimProfileModal } from "@/components/ClaimProfileModal";
import { cn } from "@/lib/utils";
import { ensureHttps, openSocialLink } from "@/lib/socialHandles";
import { isAdminUsername } from "@/lib/admin";
import { ShieldAlert } from "lucide-react";

type TabKey = "reviews" | "offers";
type ReviewSubTab = "verified" | "imported";

function DetailedReviewBadge() {
  return (
    <span
      title="Detailed Review — 150+ characters"
      className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary ring-1 ring-primary/30"
    >
      <BadgeCheck className="h-3 w-3" /> Detailed
    </span>
  );
}

interface ProfileFull {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  service_category: string | null;
  review_count: number;
  rating_sum: number;
  score_sum: number;
  points: number;
  follower_count: number;
  created_at: string;
  pinned_review_id: string | null;
  website_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  tiktok_url: string | null;
  is_claimed: boolean;
  notified_first_review_received: boolean;
  notified_points_tier: string;
  awarded_claim_bonus: boolean;
  awarded_profile_complete_bonus: boolean;
  role: string | null;
  provider_type: string | null;
  incomplete_banner_dismissed: boolean;
}

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  body: string;
  created_at: string;
  completeness_score: number;
  is_detailed?: boolean;
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
  | { kind: "verified"; id: string; created_at: string; rating: number; score: number; is_detailed: boolean; data: Review }
  | { kind: "proof"; id: string; created_at: string; rating: number; score: number; is_detailed: boolean; data: ProofReview };

function sortUnified(items: UnifiedReview[], key: SortKey): UnifiedReview[] {
  const out = [...items];
  const byDateDesc = (a: UnifiedReview, b: UnifiedReview) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  const byDateAsc = (a: UnifiedReview, b: UnifiedReview) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  // Detailed reviews always float above non-detailed within the same rating tier.
  const detailFirst = (a: UnifiedReview, b: UnifiedReview) =>
    Number(b.is_detailed) - Number(a.is_detailed);
  if (key === "newest") out.sort((a, b) => detailFirst(a, b) || byDateDesc(a, b));
  if (key === "oldest") out.sort((a, b) => detailFirst(a, b) || byDateAsc(a, b));
  if (key === "highest") out.sort((a, b) => b.rating - a.rating || detailFirst(a, b) || byDateDesc(a, b));
  if (key === "lowest") out.sort((a, b) => a.rating - b.rating || detailFirst(a, b) || byDateDesc(a, b));
  if (key === "complete") out.sort((a, b) => b.score - a.score || detailFirst(a, b) || byDateDesc(a, b));
  if (key === "complete_asc") out.sort((a, b) => a.score - b.score || detailFirst(a, b) || byDateDesc(a, b));
  return out;
}

type OfferRow = OfferCardData & { is_pinned?: boolean; created_at?: string };

export default function Profile() {
  const { username = "" } = useParams();
  const handle = username.startsWith("@") ? username.slice(1) : username;
  const { user, profile: me, signOut } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileFull | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [unclaimedReviews, setUnclaimedReviews] = useState<Review[]>([]);
  const [proofReviews, setProofReviews] = useState<ProofReview[]>([]);
  const [imported, setImported] = useState<ImportedTestimonial[]>([]);
  const [reviewsSort, setReviewsSort] = useState<SortKey>("newest");
  const [verifiedPurchasesOnly, setVerifiedPurchasesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [responseMs, setResponseMs] = useState<number | null>(null);
  const [importedModalOpen, setImportedModalOpen] = useState(false);
  const [importedEditing, setImportedEditing] = useState<ImportedTestimonial | null>(null);
  
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [congrats, setCongrats] = useState<
    | null
    | { kind: "first-received" }
    | { kind: "tier-up"; tier: Tier; points: number; pointsToNext: number }
  >(null);
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const subParam = searchParams.get("sub");
  const activeTab: TabKey = tabParam === "offers" ? "offers" : "reviews";
  const reviewSub: ReviewSubTab =
    subParam === "imported" || tabParam === "imported" ? "imported" : "verified";
  const setActiveTab = (t: TabKey) => {
    const next = new URLSearchParams(searchParams);
    if (t === "reviews") next.delete("tab");
    else next.set("tab", t);
    next.delete("sub");
    setSearchParams(next, { replace: true });
  };
  const setReviewSub = (s: ReviewSubTab) => {
    const next = new URLSearchParams(searchParams);
    next.delete("tab");
    if (s === "verified") next.delete("sub");
    else next.set("sub", s);
    setSearchParams(next, { replace: true });
  };

  const loadAll = async () => {
    setLoading(true);
    const baseCols = "id, username, display_name, avatar_url, bio, service_category, review_count, rating_sum, score_sum, points, follower_count, created_at, pinned_review_id, website_url, instagram_url, twitter_url, youtube_url, linkedin_url, tiktok_url, is_claimed, role, provider_type";
    const { data: p } = await supabase
      .from("profiles")
      .select(baseCols)
      .eq("username", handle)
      .maybeSingle();
    let prof = p as unknown as ProfileFull | null;
    if (prof && user && user.id === prof.id) {
      const { data: priv } = await supabase.rpc("get_my_profile_flags");
      const row = Array.isArray(priv) ? priv[0] : priv;
      if (row) prof = { ...prof, ...(row as unknown as Partial<ProfileFull>) };
    }
    setProfile(prof);
    if (!prof) { setLoading(false); return; }

    const offersQuery = supabase
      .from("offers")
      .select("id, slug, title, description, cover_url, price_cents, price_max_cents, pricing_model, free_for_testimonial, category, is_active, cta_link, cta_label, hosted_on_hirevy, offer_tier, is_pinned, created_at")
      .eq("provider_id", prof.id)
      .eq("is_active", true)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    const [offersRes, reviewsRes, unclaimedRes, proofRes, importedRes, followRes] = await Promise.all([
      offersQuery,
      supabase.rpc("list_provider_reviews", { p_provider: prof.id }),
      supabase
        .from("unclaimed_reviews")
        .select("id, coach_name, rating, body, created_at, completeness_score, is_detailed")
        .eq("linked_profile_id", prof.id)
        .order("created_at", { ascending: false }),
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
    const verifiedReviews = (reviewsRes.data as unknown as Review[]) ?? [];
    const unclaimedRows = ((unclaimedRes.data as unknown as Array<{
      id: string; coach_name: string; rating: number; body: string; created_at: string; completeness_score: number; is_detailed: boolean;
    }>) ?? []).map((r) => ({
      id: r.id,
      reviewer_name: r.coach_name,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      completeness_score: r.completeness_score,
      is_detailed: r.is_detailed,
    } as Review));
    setReviews(verifiedReviews);
    setUnclaimedReviews(unclaimedRows);
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
  const points = profile?.points ?? 0;
  const tier: Tier = tierForPoints(points);
  const avg = profile && profile.review_count > 0 ? Number(profile.rating_sum) / profile.review_count : 0;
  const tierNext = nextTier(tier);
  const pointsToNext = pointsToNextTier(points);
  const progressPct = Math.round(tierProgress(points) * 100);

  // Bronze tier is earned only via verified reviews — no automatic
  // claim or profile-complete bonus points are awarded on signup/claim.

  // Congratulatory popup logic — only for first-review-received now.
  // Tier-up is delivered exclusively via the notifications panel.
  const congratsFiredRef = useRef(false);
  useEffect(() => {
    if (!profile || !isMe) return;
    if (congratsFiredRef.current) return;
    if (profile.review_count < 1) return;
    congratsFiredRef.current = true;
    (async () => {
      const { data: existing } = await supabase
        .from("user_notification_flags")
        .select("flag_name")
        .eq("user_id", profile.id)
        .eq("flag_name", "first_review_received");
      if (existing && existing.length > 0) return;
      await supabase.from("user_notification_flags").insert({ user_id: profile.id, flag_name: "first_review_received" });
      setCongrats({ kind: "first-received" });
    })();
  }, [profile, isMe]);


  

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
        is_detailed: !!r.is_detailed,
        data: r,
      }));
    const p: UnifiedReview[] = proofReviews.map((r) => ({
      kind: "proof" as const,
      id: r.id,
      created_at: r.created_at,
      rating: r.rating,
      score: r.completeness_score ?? 0,
      is_detailed: (r.body?.length ?? 0) >= 150,
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

  const handleShareReviewLink = async () => {
    if (!reviewLink) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `Leave a review for ${providerDisplayName}`, url: reviewLink });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(reviewLink);
    toast({ title: "Review link copied", description: "Share it with past clients to collect a verified review." });
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
    // Open compose view in draft mode — thread is only created on first send.
    window.location.href = `/messages?to=${profile.id}`;
  };

  const togglePinReview = async (reviewId: string) => {
    if (!profile || !isMe) return;
    const next = profile.pinned_review_id === reviewId ? null : reviewId;
    const { error } = await supabase.from("profiles").update({ pinned_review_id: next }).eq("id", profile.id);
    if (error) { toast({ title: "Could not update", description: error.message, variant: "destructive" }); return; }
    setProfile({ ...profile, pinned_review_id: next });
    toast({ title: next ? "Review pinned" : "Review unpinned" });
  };

  const metaName = profile?.display_name || profile?.username || handle;
  usePageMeta(
    `${metaName} Reviews — Verified Client Ratings | Aytopus.`,
    (profile?.review_count ?? 0) > 0
      ? `See verified reviews for ${metaName} on Aytopus. Real ratings from real clients who actually worked with them. Read reviews before you hire.`
      : `See reviews for ${metaName} on Aytopus. Be the first to leave a verified review.`,
  );

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!profile) {
    return (
      <div className="p-8">
        <h1 className="font-display text-2xl font-semibold">No such profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">@{handle} doesn't exist on Aytopus.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/">Back to Explore</Link></Button>
      </div>
    );
  }

  const providerDisplayName = profile.display_name || profile.username;
  const memberSince = new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  const hasAnyContent = offers.length > 0 || reviews.length > 0 || proofReviews.length > 0 || unclaimedReviews.length > 0;

  return (
    <TooltipProvider delayDuration={150}>
    <div className="px-4 py-6 md:px-8 md:py-8">
      {isMe && profile.role === "provider" && !profile.incomplete_banner_dismissed && (() => {
        const missing = !profile.avatar_url || !profile.bio || !(profile.website_url || profile.instagram_url || profile.twitter_url || profile.youtube_url || profile.tiktok_url || profile.linkedin_url);
        if (!missing) return null;
        return (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/[0.06] px-4 py-3 text-sm">
            <span className="text-foreground/90">
              Your profile is incomplete — finish setting up to get discovered.
            </span>
            <div className="flex items-center gap-3">
              <Link to="/settings/profile" className="font-semibold text-primary hover:underline">
                Complete profile →
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await supabase.from("profiles").update({ incomplete_banner_dismissed: true }).eq("id", profile.id);
                  setProfile({ ...profile, incomplete_banner_dismissed: true });
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })()}
      {/* Header */}
      <div className="mx-auto max-w-xl border-b border-border pb-6">
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-2xl text-muted-foreground ring-2 ring-primary ring-offset-2 ring-offset-background">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (profile.display_name || profile.username).slice(0, 1).toUpperCase()
            )}
          </div>
        </div>

        {/* Name */}
        <h1 className="mt-4 text-center font-display text-2xl font-bold leading-tight md:text-3xl">{providerDisplayName}</h1>

        {/* Handle */}
        <p className="mt-1 text-center text-sm text-muted-foreground">
          @{profile.username}
          {(profile.provider_type === "coach" || profile.provider_type === "service_provider") && (
            <span className="ml-2 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              {profile.provider_type === "coach" ? "Coach" : "Service Provider"}
            </span>
          )}
        </p>

        {/* Tier badge */}
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setTierModalOpen(true)}
            className="rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="View verification tiers"
          >
            <TierBadge tier={tier} size="md" />
          </button>
        </div>


        {/* Owner-only points progress */}
        {isMe && (
          <div className="mx-auto mt-4 max-w-[280px]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-sm font-bold text-foreground">
                {points.toLocaleString()} {points === 1 ? "point" : "points"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {tierNext ? `${pointsToNext} to ${TIER_LABEL_MAP[tierNext]}` : "Max tier"}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg,#FFE98A,#FFD700,#B8860B)",
                }}
              />
            </div>
          </div>
        )}

        {/* Admin-only entry point (own profile, admin allowlist) */}
        {isMe && isAdminUsername(profile.username) && (
          <div className="mx-auto mt-4 max-w-[280px]">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="w-full border-primary/40 text-primary hover:bg-primary/10"
            >
              <Link to="/admin">
                <ShieldAlert className="mr-1.5 h-4 w-4" /> Open Admin
              </Link>
            </Button>
          </div>
        )}

        {isMe && (
          <div className="mx-auto mt-3 max-w-[280px] space-y-3">
            <Button asChild size="sm" className="w-full">
              <Link to="/settings/offers/new">
                <Plus className="mr-1.5 h-4 w-4" /> Add Offer
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-primary/40 text-primary hover:bg-primary/10"
              onClick={() => { void handleShareReviewLink(); }}
            >
              <LinkIcon className="mr-1.5 h-4 w-4" /> Share review link
            </Button>
          </div>
        )}


        {/* Trust card — 3 stats */}
        <div className="mt-5 grid grid-cols-3 items-center gap-2 rounded-lg border border-primary/30 bg-card/60 px-2 py-4 sm:px-4">
          <TrustStat
            value={avg > 0 ? avg.toFixed(1) : "—"}
            label="Avg rating"
            valueClassName="text-primary"
          />
          <TrustStat
            value={totalReviewsCount.toLocaleString()}
            label="Reviews"
            divider
          />
          <TrustStat
            value={points.toLocaleString()}
            label="Trust pts"
          />
        </div>

        {/* Points progress line */}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {tierNext
            ? `${points.toLocaleString()} ${points === 1 ? "point" : "points"} · ${pointsToNext} to ${TIER_LABEL_MAP[tierNext]}.`
            : "Maximum tier reached."}
        </p>

        {/* Member since + response time meta */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
          <StatItem>Member since {memberSince}</StatItem>
          {responseMs != null && (
            <>
              <Dot />
              <StatItem>
                <Clock className="h-3 w-3" /> Responds within {formatResponseTime(responseMs)}
              </StatItem>
            </>
          )}
        </div>

        {/* Social links row — centered */}
        <div className="mt-4 flex justify-center">
          <SocialLinksRow profile={profile} />
        </div>

        {/* Bio — rendered above action row */}
        {profile.bio && (
          <p className="mt-5 whitespace-pre-line text-left text-[15px] leading-relaxed text-foreground/90">
            {profile.bio}
          </p>
        )}

        {/* Action buttons row — hidden on own profile (actions live in nav sidebar) */}
        {!isMe && (
          <>
            <div className="mt-5 flex items-center gap-2">
              <Button
                variant="outline"
                onClick={toggleFollow}
                className={cn(
                  "flex-1 border-primary text-primary hover:bg-primary/10",
                  following && "bg-primary/10",
                )}
              >
                {following ? "Following" : "Follow"}
              </Button>
              <Button
                variant="outline"
                onClick={startMessage}
                className="flex-1 border-primary text-primary hover:bg-primary/10"
              >
                <MessageSquare className="mr-1.5 h-4 w-4" /> Message
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="More options"
                    className="shrink-0 border-primary text-primary hover:bg-primary/10"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onSelect={copyProfileLink}>
                    <Share2 className="mr-2 h-4 w-4" /> Share Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setReportOpen(true)}
                  >
                    <Flag className="mr-2 h-4 w-4" /> Report Profile
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Leave a Review CTA */}
            <Button
              asChild
              className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link to={`/submit-review?coach=${encodeURIComponent(profile.username)}`}>
                ✎ Leave a Review
              </Link>
            </Button>
          </>
        )}
      </div>

      {/* Unclaimed profile banner */}
      {profile && !profile.is_claimed && (
        <div className="mx-auto mt-5 max-w-xl rounded-md border border-amber-500/40 bg-amber-500/[0.08] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="text-sm">
                <p className="font-semibold text-foreground">This profile is unclaimed.</p>
                <p className="text-muted-foreground">
                  Reviews below were submitted by clients before {providerDisplayName} joined Aytopus.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setClaimOpen(true)}
                className="bg-amber-500 text-black hover:bg-amber-400"
              >
                Is this you? Claim this profile
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReportOpen(true)} className="text-xs">
                <Flag className="mr-1 h-3.5 w-3.5" /> Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {profile && !isMe && (
        <ReportProfileModal open={reportOpen} onOpenChange={setReportOpen} profileId={profile.id} />
      )}
      {profile && !profile.is_claimed && (
        <ClaimProfileModal
          open={claimOpen}
          onOpenChange={setClaimOpen}
          profileId={profile.id}
          providerDisplayName={providerDisplayName}
        />
      )}



      {/* Empty state for visitors on a brand-new profile */}
      {!hasAnyContent && !isMe && (
        <div className="mt-8 rounded-md border border-dashed border-border bg-card/40 p-10 text-center">
          <p className="font-display text-xl font-semibold">{providerDisplayName} is just getting started on Aytopus.</p>
          <p className="mt-2 text-sm text-muted-foreground">Check back soon — offers and reviews will appear here.</p>
        </div>
      )}



      {/* Reviews / Offers — two-section layout */}
      <section className="mt-8">
        {/* Tab strip — full-width, evenly split */}
        <div className="-mx-4 mb-6 border-b border-border md:mx-0">
          <div className="flex w-full items-stretch">
            <TabButton active={activeTab === "reviews"} onClick={() => setActiveTab("reviews")} count={totalReviewsCount + imported.length} label="Reviews" />
            {(offers.length > 0 || isMe) && (
              <TabButton active={activeTab === "offers"} onClick={() => setActiveTab("offers")} count={offers.length} label="Offers" />
            )}
          </div>
        </div>

        {/* Reviews (verified + proof-backed merged) */}
        {activeTab === "reviews" && (
          <div>
            {(!isMe && user && user.id !== profile.id) || !user ? (
              <div className="mb-4 flex justify-end">
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
            ) : null}

            {/* Sub-pill toggle: Verified | Imported — centered */}
            <div className="mb-6 mt-2 flex justify-center">
              <div className="inline-flex items-center gap-1 rounded-full bg-secondary/60 p-1">
                <button
                  type="button"
                  onClick={() => setReviewSub("verified")}
                  aria-pressed={reviewSub === "verified"}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full px-4 text-xs font-medium transition-colors",
                    reviewSub === "verified"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Verified <span className="ml-1 text-muted-foreground">{totalReviewsCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewSub("imported")}
                  aria-pressed={reviewSub === "imported"}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full px-4 text-xs font-medium transition-colors",
                    reviewSub === "imported"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Imported <span className="ml-1 text-muted-foreground">{imported.length}</span>
                </button>
              </div>
            </div>
            <div className="mb-4 -mt-3 flex justify-center">
              <Link to="/how-verification-works" className="text-[11px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline">
                How verification works →
              </Link>
            </div>


            {reviewSub === "verified" && (<>
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
              <Empty msg="No reviews yet — message this provider to learn more or hire them directly." />

            ) : visibleReviews.length === 0 ? (
              <Empty msg="No reviews match the current filter." />
            ) : (() => {
              const showWall = !user && visibleReviews.length > 3;
              const shown = showWall ? visibleReviews.slice(0, 3) : visibleReviews;
              const hidden = showWall ? visibleReviews.slice(3) : [];
              const renderReview = (u: typeof visibleReviews[number]) => u.kind === "verified" ? (
                <article key={u.id} className="relative rounded-md border border-border bg-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold">{u.data.reviewer_name}</p>
                    <div className="flex items-center gap-2">
                      <StarRating value={u.data.rating} size={14} />
                      {u.is_detailed && <DetailedReviewBadge />}
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
              );
              return (
                <div className="space-y-3">
                  {shown.map(renderReview)}
                  {showWall && (
                    <div className="relative">
                      <div aria-hidden className="pointer-events-none select-none space-y-3 blur-md">
                        {hidden.map(renderReview)}
                      </div>
                      <div className="absolute inset-0 flex items-start justify-center px-4 pt-8">
                        <div className="w-full max-w-sm rounded-lg border border-primary/40 bg-card/95 p-6 text-center shadow-[0_8px_30px_-12px_hsl(40_55%_52%/0.4)] backdrop-blur">
                          <h3 className="font-display text-xl font-semibold text-foreground">See all reviews</h3>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Create a free account to read every review on Aytopus — no credit card required.
                          </p>
                          <Button asChild className="mt-5 h-11 w-full font-semibold" style={{ background: "linear-gradient(135deg,#FFE98A,#FFD700,#B8860B)", color: "#2a1c00" }}>
                            <Link to="/signup">Sign up free</Link>
                          </Button>
                          <p className="mt-3 text-xs text-muted-foreground">
                            Already have an account?{" "}
                            <Link to="/auth" className="text-primary hover:underline">Sign in</Link>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Pre-claim / unclaimed reviews — visually distinct */}
            {unclaimedReviews.length > 0 && (
              <div className="mt-8">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Reviews submitted before this profile was claimed
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground/80">
                      Left by clients when {providerDisplayName} wasn't yet on Aytopus. Not counted toward verified stats.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    <Flag className="mr-1 inline h-3 w-3" /> Report
                  </button>
                </div>
                <div className="space-y-3">
                  {unclaimedReviews.map((r) => (
                    <article
                      key={r.id}
                      className="relative rounded-md border border-dashed border-amber-500/40 bg-amber-500/[0.04] p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-semibold">{r.reviewer_name}</p>
                        <div className="flex items-center gap-2">
                          {r.is_detailed && <DetailedReviewBadge />}
                          <StarRating value={r.rating} size={14} />
                        </div>
                      </div>
                      <ExpandableReviewText text={r.body} className="text-sm text-muted-foreground" />
                      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                        <span>
                          {new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                        <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-[9px] tracking-[0.16em] text-amber-600">
                          Pre-claim
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
            </>)}


            {reviewSub === "imported" && (
              <div>
                <p className="mb-4 text-xs text-muted-foreground/80">
                  These reviews were submitted by the provider from external sources and have not been independently verified by Aytopus.
                </p>
                {isMe && imported.length > 0 && (
                  <div className="mb-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                      onClick={() => { setImportedEditing(null); setImportedModalOpen(true); }}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                )}
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
                  They are not independently verified by Aytopus and do not affect the tier badge or rating.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Offers */}
        {activeTab === "offers" && (
          <div>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">Offers</h2>
              {isMe && (
                <Button asChild size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary">
                  <Link to="/settings/offers/new">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Offer
                  </Link>
                </Button>
              )}
            </div>
            {offers.length === 0 && isMe ? (
              <div className="rounded-md border border-dashed border-border bg-card/40 p-8 text-center md:p-10">
                <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                  Publish your first offer so clients can hire you directly from your profile.
                </p>
                <Button asChild size="lg" className="mt-5">
                  <Link to="/settings/offers/new">
                    <Plus className="mr-1.5 h-4 w-4" /> Add your first offer
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {offers.map((o) => (
                  <OfferCard
                    key={o.id}
                    offer={{
                      ...o,
                      provider: {
                        username: profile.username,
                        display_name: profile.display_name,
                        review_count: profile.review_count,
                        rating_sum: profile.rating_sum,
                      },
                    }}
                    owner={isMe}
                    onChanged={loadAll}
                    referrer="profile"
                  />
                ))}
              </div>
            )}
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


      <TierInfoModal open={tierModalOpen} onOpenChange={setTierModalOpen} currentTier={tier} />

      <CongratsModal
        open={!!congrats}
        variant={congrats}
        onClose={() => setCongrats(null)}
        onPrimary={() => {
          if (congrats?.kind === "first-received" && profile) {
            navigate(`/@${profile.username}`);
          }
        }}
      />
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

function TrustStat({
  value,
  label,
  divider,
  valueClassName,
}: {
  value: string;
  label: string;
  divider?: boolean;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-2 text-center",
        divider && "border-x border-border/60",
      )}
    >
      <span className={cn("font-display text-2xl font-bold leading-none text-foreground", valueClassName)}>
        {value}
      </span>
      <span className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
function Dot() {
  return <span aria-hidden className="inline-block h-1 w-1 rounded-full bg-muted-foreground/40" />;
}

type SocialKey = "website_url" | "instagram_url" | "twitter_url" | "youtube_url" | "linkedin_url" | "tiktok_url";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.7 20.1a6.34 6.34 0 0 0 10.86-4.43V9.34a8.16 8.16 0 0 0 4.77 1.52V7.42a4.85 4.85 0 0 1-1.74-.73z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.55 7.49L22 22h-6.81l-4.78-6.26L4.8 22H2.04l7.02-8.03L2 2h6.91l4.33 5.74L18.244 2zm-2.39 18h1.86L7.25 4H5.29l10.564 16z" />
    </svg>
  );
}

const SOCIAL_DEFS: { key: SocialKey; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "website_url", label: "Website", Icon: ({ className }) => <Globe className={className} /> },
  { key: "instagram_url", label: "Instagram", Icon: ({ className }) => <Instagram className={className} /> },
  { key: "twitter_url", label: "X (Twitter)", Icon: XIcon },
  { key: "youtube_url", label: "YouTube", Icon: ({ className }) => <Youtube className={className} /> },
  { key: "linkedin_url", label: "LinkedIn", Icon: ({ className }) => <Linkedin className={className} /> },
  { key: "tiktok_url", label: "TikTok", Icon: TikTokIcon },
];

function SocialLinksRow({ profile }: { profile: ProfileFull }) {
  const items = SOCIAL_DEFS.filter((s) => {
    const v = profile[s.key];
    return typeof v === "string" && v.trim().length > 0;
  });
  if (items.length === 0) return null;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {items.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => openSocialLink(profile[key] as string, key === "instagram_url" ? "instagram" : undefined)}
          aria-label={label}
          title={label}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 text-primary/80 transition-colors hover:border-primary hover:text-primary"
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

const TIER_ORDER: Tier[] = ["unranked", "bronze", "silver", "gold", "platinum", "diamond"];

function TierInfoModal({
  open,
  onOpenChange,
  currentTier,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentTier: Tier;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Verification Tiers</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-2">
          {TIER_ORDER.map((t) => {
            const isCurrent = currentTier === t;
            return (
              <div
                key={t}
                className={cn(
                  "flex items-start gap-3 rounded-md border border-border/60 p-3 transition-colors",
                  isCurrent && "border-[hsl(46_90%_55%)] bg-primary/5 ring-1 ring-[hsl(46_90%_55%)]/50",
                )}
              >
                <div className="mt-0.5 flex h-7 min-w-[90px] items-center justify-center">
                  {t === "unranked" ? (
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Unranked</span>
                  ) : (
                    <TierBadge tier={t} size="md" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-semibold">{TIER_LABEL[t]}</p>
                    {isCurrent && (
                      <span className="rounded-full bg-[hsl(46_90%_55%)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#2a1c00]">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{TIER_REQUIREMENT[t]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TabButton({ active, onClick, count, label }: { active: boolean; onClick: () => void; count: number; label: string }) {
  const dim = count === 0 && !active;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative -mb-px flex flex-1 items-center justify-center gap-2 px-4 py-4 text-base font-semibold transition-colors",
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
        "text-[12px] tabular-nums",
        active ? "text-primary/80" : "text-muted-foreground/60",
      ].join(" ")}>· {count}</span>
      {active && (
        <span aria-hidden className="absolute inset-x-0 -bottom-px h-[2.5px] bg-primary" />
      )}
    </button>
  );
}
