import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { TierBadge } from "@/components/TierBadge";
import { tierFor } from "@/lib/tiers";
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
}

function avgScoreOf(r: { review_count: number; score_sum: number }) {
  return r.review_count > 0 ? Number(r.score_sum) / r.review_count : 0;
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
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [submitted, setSubmitted] = useState(initialQ);
  const [recent, setRecent] = useState<CoachRow[]>([]);
  const [results, setResults] = useState<CoachRow[] | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Load recently reviewed providers
  useEffect(() => {
    let cancel = false;
    void (async () => {
      const { data: rev } = await supabase
        .from("reviews")
        .select("provider_id, created_at")
        .order("created_at", { ascending: false })
        .limit(40);
      const seen = new Set<string>();
      const orderedIds: string[] = [];
      for (const r of (rev ?? []) as { provider_id: string }[]) {
        if (!seen.has(r.provider_id)) { seen.add(r.provider_id); orderedIds.push(r.provider_id); }
        if (orderedIds.length >= 10) break;
      }
      if (orderedIds.length === 0) { if (!cancel) setRecent([]); return; }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, service_category, review_count, rating_sum, score_sum")
        .in("id", orderedIds);
      const byId = new Map((profs ?? []).map((p) => [p.id, p as CoachRow]));
      const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as CoachRow[];
      if (!cancel) setRecent(ordered);
    })();
    return () => { cancel = true; };
  }, []);

  // Run search when submitted query changes
  useEffect(() => {
    let cancel = false;
    const q = submitted.trim();
    if (!q) { setResults(null); return; }
    setLoadingResults(true);
    void (async () => {
      const term = `%${q}%`;
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, service_category, review_count, rating_sum, score_sum")
        .or(`username.ilike.${term},display_name.ilike.${term}`)
        .limit(50);
      if (!cancel) {
        setResults((data as CoachRow[] | null) ?? []);
        setLoadingResults(false);
      }
    })();
    return () => { cancel = true; };
  }, [submitted]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setSubmitted(q);
    const next = new URLSearchParams(params);
    if (q) next.set("q", q); else next.delete("q");
    setParams(next, { replace: true });
  };

  const filterByCategory = (cat: string) => {
    setQuery(cat);
    setSubmitted(cat);
    const next = new URLSearchParams(params);
    next.set("q", cat);
    setParams(next, { replace: true });
  };

  const showingResults = submitted.trim().length > 0;

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

      <div className="mt-8">
        {!showingResults && (
          <>
            <RecentlyReviewed coaches={recent} />
            <BrowseByCategory onPick={filterByCategory} />
          </>
        )}

        {showingResults && (
          loadingResults ? (
            <div className="mx-auto max-w-3xl space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[88px] animate-pulse rounded-md bg-card" />
              ))}
            </div>
          ) : (results && results.length > 0) ? (
            <div className="mx-auto max-w-3xl">
              <p className="mb-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                {results.length} {results.length === 1 ? "match" : "matches"} for "{submitted}"
              </p>
              <div className="space-y-3">
                {results.map((c) => <CoachResultCard key={c.id} coach={c} />)}
              </div>
            </div>
          ) : (
            <EmptySearchState
              name={submitted}
              onWriteReview={() => navigate(`/submit-review?coach=${encodeURIComponent(submitted)}`)}
              onBrowse={() => { setQuery(""); setSubmitted(""); const n = new URLSearchParams(params); n.delete("q"); setParams(n, { replace: true }); }}
            />
          )
        )}
      </div>

      {/* Floating "Review a Coach" FAB */}
      <Link
        to="/submit-review"
        className="fixed bottom-24 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.55)] transition-transform hover:scale-[1.03] md:bottom-8"
        aria-label="Review a Coach"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Review a Coach</span>
      </Link>
    </div>
  );
}

function RecentlyReviewed({ coaches }: { coaches: CoachRow[] }) {
  if (coaches.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-lg font-semibold">Recently Reviewed</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        {coaches.map((c) => <RecentCoachCard key={c.id} coach={c} />)}
      </div>
    </section>
  );
}

function RecentCoachCard({ coach }: { coach: CoachRow }) {
  const name = coach.display_name || coach.username;
  const tier = tierFor(coach.review_count, avgScoreOf(coach));
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

function BrowseByCategory({ onPick }: { onPick: (c: string) => void }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Browse by Category</h2>
      <div className="flex flex-wrap gap-2">
        {BROWSE_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            className={cn(
              "rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground/90",
              "transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
            )}
          >
            {c}
          </button>
        ))}
      </div>
    </section>
  );
}

function CoachResultCard({ coach }: { coach: CoachRow }) {
  const name = coach.display_name || coach.username;
  const tier = tierFor(coach.review_count, avgScoreOf(coach));
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
