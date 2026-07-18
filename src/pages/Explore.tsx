import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Plus, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/TierBadge";
import { tierForPoints } from "@/lib/tiers";
import { usePageMeta } from "@/lib/usePageMeta";
import { cn } from "@/lib/utils";
import { OfferCard, type OfferCardData } from "@/components/OfferCard";


const BROWSE_CATEGORIES = [
  "Business Coaching", "Sales", "Copywriting", "Fitness",
  "Mindset", "Marketing", "Finance", "Life Coaching",
];

type ProviderType = "coach" | "service_provider";

interface CoachRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  service_category: string | null;
  review_count: number;
  rating_sum: number;
  score_sum: number;
  points: number;
  provider_type: ProviderType | null;
}

function initialsOf(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function CoachAvatar({ name, url, size = 56 }: { name: string; url: string | null; size?: number }) {
  if (url) return <img src={url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />;
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-semibold text-primary ring-1 ring-primary/30"
    >
      {initialsOf(name)}
    </div>
  );
}

const PROFILE_COLS = "id, username, display_name, avatar_url, service_category, review_count, rating_sum, score_sum, points, provider_type";

export default function Explore() {
  usePageMeta(
    "Browse Verified Coaches, Service Providers & Offers | Aytopus",
    "Search coaches, service providers, and offers. Read verified reviews and hire with confidence.",
  );
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const tabParam = params.get("tab");
  const subTab: "people" | "offers" = tabParam === "offers" ? "offers" : "people";

  const initialQ = params.get("q") ?? "";
  const initialCat = params.get("cat") ?? "";
  const freeOnly = params.get("free") === "1";

  const [query, setQuery] = useState(initialQ);
  const [submitted, setSubmitted] = useState(initialQ);
  const [activeCategory, setActiveCategory] = useState<string>(initialCat);

  // People state
  const [recent, setRecent] = useState<CoachRow[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [results, setResults] = useState<CoachRow[] | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Offers state
  const [offers, setOffers] = useState<OfferCardData[] | null>(null);
  const [loadingOffers, setLoadingOffers] = useState(false);

  // ===== Live-search dropdown state =====
  type LivePerson = Pick<CoachRow, "id" | "username" | "display_name" | "avatar_url" | "provider_type">;
  type LiveOffer = {
    id: string;
    slug: string;
    title: string;
    provider: { username: string; display_name: string | null; avatar_url: string | null; provider_type: ProviderType | null } | null;
  };
  const [liveOpen, setLiveOpen] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [livePeople, setLivePeople] = useState<LivePerson[]>([]);
  const [liveOffers, setLiveOffers] = useState<LiveOffer[]>([]);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  const writeUrl = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k); else next.set(k, v);
    }
    setParams(next, { replace: true });
  };

  // ===== People: recently reviewed =====
  useEffect(() => {
    if (subTab !== "people") return;
    let cancel = false;
    setLoadingRecent(true);
    void (async () => {
      const { data: rev } = await supabase
        .from("reviews")
        .select("provider_id, created_at")
        .order("created_at", { ascending: false })
        .limit(120);
      const seen = new Set<string>();
      const orderedIds: string[] = [];
      for (const r of (rev ?? []) as { provider_id: string }[]) {
        if (!seen.has(r.provider_id)) { seen.add(r.provider_id); orderedIds.push(r.provider_id); }
      }
      if (orderedIds.length === 0) { if (!cancel) { setRecent([]); setLoadingRecent(false); } return; }
      let q = supabase
        .from("profiles")
        .select(PROFILE_COLS)
        .in("id", orderedIds)
        .eq("is_claimed", true)
        .gt("review_count", 0);
      if (activeCategory) q = q.eq("service_category", activeCategory);
      const { data: profs } = await q;
      const byId = new Map((profs ?? []).map((p) => [p.id, p as CoachRow]));
      const ordered = orderedIds
        .map((id) => byId.get(id))
        .filter(Boolean) as CoachRow[];
      if (!cancel) { setRecent(ordered.slice(0, 12)); setLoadingRecent(false); }
    })();
    return () => { cancel = true; };
  }, [activeCategory, subTab]);

  // ===== People: search results =====
  useEffect(() => {
    if (subTab !== "people") return;
    let cancel = false;
    const q = submitted.trim();
    if (!q && !activeCategory) { setResults(null); return; }
    setLoadingResults(true);
    void (async () => {
      let req = supabase.from("profiles").select(PROFILE_COLS).eq("is_claimed", true).limit(80);
      if (q) {
        const term = `%${q}%`;
        const safe = q.replace(/[\\{}"]/g, "");
        req = req.or(`username.ilike.${term},display_name.ilike.${term},keywords.cs.{"${safe}"}`);
      }
      if (activeCategory) req = req.eq("service_category", activeCategory);
      const { data } = await req;
      const rows = (data as CoachRow[] | null) ?? [];
      if (!cancel) {
        setResults(rows.slice(0, 50));
        setLoadingResults(false);
      }
    })();
    return () => { cancel = true; };
  }, [submitted, activeCategory, subTab]);

  // ===== Offers tab =====
  useEffect(() => {
    if (subTab !== "offers") return;
    let cancel = false;
    setLoadingOffers(true);
    void (async () => {
      let req = supabase
        .from("offers")
        .select(`id, slug, title, description, cover_url, category, is_active, cta_link, cta_label, hosted_on_hirevy, offer_tier,
                 provider:profiles!offers_provider_id_fkey ( id, username, display_name, review_count, rating_sum, provider_type )`)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(120);
      if (freeOnly) req = req.eq("free_for_testimonial", true);
      if (activeCategory) req = req.eq("category", activeCategory);
      const { data } = await req;
      const q = submitted.trim().toLowerCase();
      const rows = ((data as unknown as OfferCardData[]) ?? [])
        .filter((o) => {
          if (!q) return true;
          return (
            o.title.toLowerCase().includes(q) ||
            (o.description ?? "").toLowerCase().includes(q) ||
            (o.provider?.username ?? "").toLowerCase().includes(q) ||
            (o.provider?.display_name ?? "").toLowerCase().includes(q)
          );
        });
      if (!cancel) {
        setOffers(rows);
        setLoadingOffers(false);
      }
    })();
    return () => { cancel = true; };
  }, [subTab, submitted, activeCategory, freeOnly]);

  // ===== Live dropdown: debounced fetch on each keystroke =====
  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      setLivePeople([]);
      setLiveOffers([]);
      setLiveLoading(false);
      return;
    }
    let cancel = false;
    setLiveLoading(true);
    const t = setTimeout(() => {
      void (async () => {
        if (subTab === "people") {
          const term = `%${q}%`;
          const safe = q.replace(/[\\{}"]/g, "");
          let req = supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, provider_type")
            .eq("is_claimed", true)
            .or(`username.ilike.${term},display_name.ilike.${term},keywords.cs.{"${safe}"}`)
            .limit(20);
          if (activeCategory) req = req.eq("service_category", activeCategory);
          const { data } = await req;
          const rows = (data as LivePerson[] | null) ?? [];
          if (!cancel) {
            setLivePeople(rows.slice(0, 6));
            setLiveOffers([]);
            setLiveLoading(false);
          }
        } else {
          let req = supabase
            .from("offers")
            .select(`id, slug, title,
                     provider:profiles!offers_provider_id_fkey ( username, display_name, provider_type )`)
            .eq("is_active", true)
            .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
            .limit(20);
          if (freeOnly) req = req.eq("free_for_testimonial", true);
          if (activeCategory) req = req.eq("category", activeCategory);
          const { data } = await req;
          const rows = (data as unknown as LiveOffer[] | null) ?? [];
          if (!cancel) {
            setLiveOffers(rows.slice(0, 6));
            setLivePeople([]);
            setLiveLoading(false);
          }
        }
      })();
    }, 220);
    return () => { cancel = true; clearTimeout(t); };
  }, [query, subTab, activeCategory, freeOnly]);

  // Close dropdown when clicking outside the search box
  useEffect(() => {
    if (!liveOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(e.target as Node)) setLiveOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [liveOpen]);

  const runFullSearch = (raw?: string) => {
    const q = (raw ?? query).trim();
    setQuery(q);
    setSubmitted(q);
    writeUrl({ q: q || null });
    setLiveOpen(false);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runFullSearch();
  };

  const toggleCategory = (cat: string) => {
    const next = activeCategory === cat ? "" : cat;
    setActiveCategory(next);
    writeUrl({ cat: next || null });
  };

  const setSubTab = (t: "people" | "offers") => writeUrl({ tab: t === "people" ? null : "offers" });

  const showingResults = submitted.trim().length > 0 || !!activeCategory;
  const reviewLink = activeCategory ? `/submit-review?cat=${encodeURIComponent(activeCategory)}` : "/submit-review";

  const providerTypeLabel = (pt: ProviderType | null | undefined) =>
    pt === "service_provider" ? "Service Provider" : "Coach";

  const showDropdown = liveOpen && query.trim().length > 0;

  return (
    <div className="relative px-4 py-6 md:px-8 md:py-8">
      {/* Search */}
      <div ref={searchBoxRef} className="relative mx-auto max-w-2xl">
        <form onSubmit={onSearch} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setLiveOpen(true); }}
            onFocus={() => { if (query.trim().length > 0) setLiveOpen(true); }}
            placeholder="Search coaches, providers, and offers..."
            className="h-12 pl-9"
            aria-label="Search coaches, providers, and offers"
            autoComplete="off"
          />
        </form>

        {showDropdown && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-md border border-border bg-popover shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)]"
          >
            {liveLoading && livePeople.length === 0 && liveOffers.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">Searching…</div>
            ) : (
              <>
                {subTab === "people" && livePeople.length === 0 && !liveLoading && (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">No people match yet.</div>
                )}
                {subTab === "offers" && liveOffers.length === 0 && !liveLoading && (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">No offers match yet.</div>
                )}

                {subTab === "people" && livePeople.map((p) => {
                  const name = p.display_name || p.username;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setLiveOpen(false); navigate(`/@${p.username}`); }}
                      className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent/10"
                    >
                      <CoachAvatar name={name} url={p.avatar_url} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          @{p.username} · {providerTypeLabel(p.provider_type)}
                        </p>
                      </div>
                    </button>
                  );
                })}

                {subTab === "offers" && liveOffers.map((o) => {
                  const providerName = o.provider?.display_name || o.provider?.username || "";
                  const href = o.provider?.username ? `/@${o.provider.username}/${o.slug}` : "#";
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setLiveOpen(false); navigate(href); }}
                      className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent/10"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{o.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{providerName}</p>
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runFullSearch()}
                  className="flex w-full items-center justify-between gap-2 border-t border-border bg-card/60 px-3 py-2.5 text-left text-sm font-semibold text-primary transition-colors hover:bg-accent/10"
                >
                  <span>See all results for "{query.trim()}"</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sub-tabs: People / Offers */}
      <div className="mx-auto mt-4 flex max-w-2xl items-center justify-center gap-1 border-b border-border">
        <TopTab active={subTab === "people"} onClick={() => setSubTab("people")} label="People" />
        <TopTab active={subTab === "offers"} onClick={() => setSubTab("offers")} label="Offers" />
      </div>

      {/* Category pills */}
      <div className="mt-6">
        <BrowseByCategory active={activeCategory} onPick={toggleCategory} />
      </div>

      {/* ===== People tab ===== */}
      {subTab === "people" && (
        <div className="mt-8">
          {!showingResults && (
            <RecentlyReviewed
              coaches={recent}
              loading={loadingRecent}
              onLeaveReview={() => navigate("/submit-review")}
            />
          )}

          {showingResults && (
            loadingResults ? (
              <div className="mx-auto max-w-3xl space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[88px] animate-pulse rounded-md bg-card" />
                ))}
              </div>
            ) : (results && results.length > 0) ? (
              <>
                {!submitted.trim() && activeCategory && (
                  <RecentlyReviewed
                    coaches={recent}
                    loading={loadingRecent}
                    onLeaveReview={() => navigate(reviewLink)}
                  />
                )}
                <div className="mx-auto max-w-3xl">
                  <p className="mb-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {results.length} {results.length === 1 ? "match" : "matches"}
                    {submitted.trim() && <> for "{submitted}"</>}
                    {activeCategory && <> in {activeCategory}</>}
                  </p>
                  <div className="space-y-3">
                    {results.map((c) => <CoachResultCard key={c.id} coach={c} />)}
                  </div>
                </div>
              </>
            ) : activeCategory && !submitted.trim() ? (
              <EmptyCategoryState />
            ) : (
              <EmptySearchState
                name={submitted}
                onWriteReview={() => navigate(`/submit-review?coach=${encodeURIComponent(submitted)}${activeCategory ? `&cat=${encodeURIComponent(activeCategory)}` : ""}`)}
                onBrowse={() => { setQuery(""); setSubmitted(""); writeUrl({ q: null }); }}
              />
            )
          )}
        </div>
      )}

      {/* ===== Offers tab ===== */}
      {subTab === "offers" && (
        <div className="mt-8">
          <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => writeUrl({ free: freeOnly ? null : "1" })}
              aria-pressed={freeOnly}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors",
                freeOnly
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary",
              )}
            >
              <span className="rounded-[3px] bg-background/20 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.2em]">FREE</span>
              {freeOnly ? "Showing free offers" : "Free offers"}
            </button>
            {offers && (
              <span className="text-xs text-muted-foreground">
                {offers.length} {offers.length === 1 ? "offer" : "offers"}
              </span>
            )}
          </div>

          {loadingOffers ? (
            <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-md bg-card" />
              ))}
            </div>
          ) : (offers && offers.length > 0) ? (
            <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {offers.map((o) => <OfferCard key={o.id} offer={o} referrer="explore" />)}
            </div>
          ) : (
            <div className="mx-auto max-w-md rounded-md border border-dashed border-border bg-card/40 p-8 text-center md:p-10">
              <p className="font-display text-lg font-semibold">No offers match your filters.</p>
              <p className="mt-2 text-sm text-muted-foreground">Try clearing filters or switching provider type.</p>
            </div>
          )}
        </div>
      )}

      {/* Floating "Review a Coach" FAB — hidden on mobile */}
      <Link
        to={reviewLink}
        className="hidden sm:inline-flex fixed bottom-24 right-5 z-30 items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.55)] transition-transform hover:scale-[1.03] md:bottom-8"
        aria-label="Review a Coach"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Review a Coach</span>
      </Link>
    </div>
  );
}

function TopTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative -mb-px px-5 py-2.5 text-sm font-semibold transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span className="font-display tracking-wide">{label}</span>
      {active && <span aria-hidden className="absolute inset-x-2 -bottom-px h-[2px] bg-primary" />}
    </button>
  );
}

function RoleBadge({ provider_type }: { provider_type: ProviderType | null | undefined }) {
  if (provider_type !== "coach" && provider_type !== "service_provider") return null;
  return (
    <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
      {provider_type === "coach" ? "Coach" : "Service Provider"}
    </span>
  );
}

function RecentlyReviewed({
  coaches,
  loading,
}: { coaches: CoachRow[]; loading: boolean; onLeaveReview?: () => void }) {
  if (loading) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-lg font-semibold">Recently Active</h2>
      {coaches.length === 0 ? (
        <div className="flex w-full justify-center">
          <div className="flex w-[320px] flex-col items-center gap-2 rounded-md border border-dashed border-border bg-card/40 p-6 text-center">
            <p className="text-sm font-semibold text-foreground">No active people here yet.</p>
            <p className="text-xs text-muted-foreground">Browse a category below to discover who's available to hire.</p>
          </div>
        </div>
      ) : (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
          {coaches.map((c) => <RecentCoachCard key={c.id} coach={c} />)}
        </div>
      )}
    </section>
  );
}

function RecentCoachCard({ coach }: { coach: CoachRow }) {
  const name = coach.display_name || coach.username;
  const tier = tierForPoints(coach.points ?? 0);
  return (
    <Link
      to={`/@${coach.username}`}
      className="flex w-[180px] shrink-0 flex-col items-center gap-2 rounded-md border border-border bg-card p-4 text-center transition-colors hover:border-primary/40"
    >
      <CoachAvatar name={name} url={coach.avatar_url} size={72} />
      <p className="line-clamp-1 w-full text-sm font-bold">{name}</p>
      <p className="line-clamp-1 w-full text-xs text-muted-foreground">@{coach.username}</p>
      <RoleBadge provider_type={coach.provider_type} />
      {tier !== "unranked" && <TierBadge tier={tier} size="xs" />}
      <p className="text-[11px] text-muted-foreground">
        {coach.review_count} {coach.review_count === 1 ? "review" : "reviews"}
      </p>
    </Link>
  );
}

function BrowseByCategory({ active, onPick }: { active: string; onPick: (c: string) => void }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Browse by Category</h2>
      <div className="flex flex-wrap gap-2">
        {BROWSE_CATEGORIES.map((c) => {
          const isActive = active === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onPick(c)}
              aria-pressed={isActive}
              className={cn(
                "rounded-full border px-3.5 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border-border bg-card text-foreground/90 hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
              )}
            >
              {c}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CoachResultCard({ coach }: { coach: CoachRow }) {
  const name = coach.display_name || coach.username;
  const tier = tierForPoints(coach.points ?? 0);
  return (
    <Link
      to={`/@${coach.username}`}
      className="flex items-center gap-4 rounded-md border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <CoachAvatar name={name} url={coach.avatar_url} size={64} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{name}</p>
        <p className="truncate text-xs text-muted-foreground">@{coach.username}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <RoleBadge provider_type={coach.provider_type} />
          {tier !== "unranked" && <TierBadge tier={tier} size="xs" />}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {coach.review_count} {coach.review_count === 1 ? "review" : "reviews"}
        </p>
      </div>
    </Link>
  );
}

function EmptyCategoryState() {
  return (
    <div className="mx-auto max-w-md rounded-md border border-dashed border-border bg-card/40 p-8 text-center md:p-10">
      <p className="font-display text-lg font-semibold">No one in this category yet.</p>
      <p className="mt-2 text-sm text-muted-foreground">Try another category, or check the Offers tab to see what's available to hire.</p>
    </div>
  );
}

function EmptySearchState({ name, onBrowse }: { name: string; onWriteReview?: () => void; onBrowse: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-md border border-dashed border-border bg-card/40 p-8 text-center md:p-10">
      <p className="font-display text-2xl font-bold text-primary">{name}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        No coaches or service providers matched that search yet.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={onBrowse} className="w-full">Browse coaches & providers</Button>
      </div>
    </div>
  );
}

export type { CoachRow };
