import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/TierBadge";
import { tierForPoints } from "@/lib/tiers";
import { usePageMeta } from "@/lib/usePageMeta";
import { cn } from "@/lib/utils";

const BROWSE_CATEGORIES = [
  "Business Coaching", "Sales", "Copywriting", "Fitness",
  "Mindset", "Marketing", "Finance", "Life Coaching",
];

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

export default function Explore() {
  usePageMeta(
    "Browse Verified Coaches & Service Providers | HireVy",
    "Search coaches and service providers by name. Read verified client reviews and hire with confidence.",
  );
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const initialCat = params.get("cat") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [submitted, setSubmitted] = useState(initialQ);
  const [activeCategory, setActiveCategory] = useState<string>(initialCat);
  const [recent, setRecent] = useState<CoachRow[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [results, setResults] = useState<CoachRow[] | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Load recently reviewed providers, optionally filtered by category
  useEffect(() => {
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
        .select("id, username, display_name, avatar_url, service_category, review_count, rating_sum, score_sum, points")
        .in("id", orderedIds)
        .gt("review_count", 0);
      if (activeCategory) q = q.eq("service_category", activeCategory);
      const { data: profs } = await q;
      const byId = new Map((profs ?? []).map((p) => [p.id, p as CoachRow]));
      const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as CoachRow[];
      if (!cancel) { setRecent(ordered.slice(0, 12)); setLoadingRecent(false); }
    })();
    return () => { cancel = true; };
  }, [activeCategory]);

  // Run search when submitted query or active category changes
  useEffect(() => {
    let cancel = false;
    const q = submitted.trim();
    if (!q && !activeCategory) { setResults(null); return; }
    setLoadingResults(true);
    void (async () => {
      let req = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, service_category, review_count, rating_sum, score_sum, points")
        .limit(50);
      if (q) {
        const term = `%${q}%`;
        req = req.or(`username.ilike.${term},display_name.ilike.${term}`);
      }
      if (activeCategory) req = req.eq("service_category", activeCategory);
      const { data } = await req;
      if (!cancel) {
        setResults((data as CoachRow[] | null) ?? []);
        setLoadingResults(false);
      }
    })();
    return () => { cancel = true; };
  }, [submitted, activeCategory]);

  const writeUrl = (q: string, cat: string) => {
    const next = new URLSearchParams(params);
    if (q) next.set("q", q); else next.delete("q");
    if (cat) next.set("cat", cat); else next.delete("cat");
    setParams(next, { replace: true });
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setSubmitted(q);
    writeUrl(q, activeCategory);
  };

  const toggleCategory = (cat: string) => {
    const next = activeCategory === cat ? "" : cat;
    setActiveCategory(next);
    writeUrl(submitted.trim(), next);
  };

  const showingResults = submitted.trim().length > 0 || !!activeCategory;
  const reviewLink = activeCategory ? `/submit-review?cat=${encodeURIComponent(activeCategory)}` : "/submit-review";

  return (
    <div className="relative px-4 py-6 md:px-8 md:py-8">
      {/* Search */}
      <form onSubmit={onSearch} className="relative mx-auto max-w-2xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a coach or provider..."
          className="h-12 pl-9 text-sm"
          aria-label="Search a coach or provider"
        />
      </form>
      <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-muted-foreground">
        Search any coach — whether they're on HireVy or not.
      </p>

      {/* Category pills — always visible */}
      <div className="mt-6">
        <BrowseByCategory active={activeCategory} onPick={toggleCategory} />
      </div>

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
              {/* Recently Reviewed (filtered) also shows when only a category is active */}
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
              onBrowse={() => { setQuery(""); setSubmitted(""); writeUrl("", activeCategory); }}
            />
          )
        )}
      </div>

      {/* Floating "Review a Coach" FAB */}
      <Link
        to={reviewLink}
        className="fixed bottom-24 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.55)] transition-transform hover:scale-[1.03] md:bottom-8"
        aria-label="Review a Coach"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Review a Coach</span>
      </Link>
    </div>
  );
}

function RecentlyReviewed({
  coaches,
  loading,
  onLeaveReview,
}: { coaches: CoachRow[]; loading: boolean; onLeaveReview: () => void }) {
  if (loading) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-lg font-semibold">Recently Reviewed</h2>
      {coaches.length === 0 ? (
        <div className="flex w-full justify-center">
          <div className="flex w-[260px] flex-col items-center gap-3 rounded-md border border-dashed border-border bg-card/40 p-6 text-center">
            <p className="text-sm text-muted-foreground">No reviews yet — be the first.</p>
            <Button onClick={onLeaveReview} size="sm">Leave a Review</Button>
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
        {tier !== "unranked" && (
          <div className="mt-1"><TierBadge tier={tier} size="xs" /></div>
        )}
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
      <p className="font-display text-lg font-semibold">No coaches in this category yet.</p>
      <p className="mt-2 text-sm text-muted-foreground">Check back soon or be the first to leave a review.</p>
    </div>
  );
}

function EmptySearchState({ name, onWriteReview, onBrowse }: { name: string; onWriteReview: () => void; onBrowse: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-md border border-dashed border-border bg-card/40 p-8 text-center md:p-10">
      <p className="font-display text-2xl font-bold text-primary">{name}</p>
      <p className="mt-2 text-sm text-muted-foreground">No reviews yet for {name}.</p>
      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={onWriteReview} className="w-full">Write the first review →</Button>
        <Button variant="outline" onClick={onBrowse} className="w-full">Browse other coaches</Button>
      </div>
    </div>
  );
}

// Backward-compatible export used by some pages
export type { CoachRow };
