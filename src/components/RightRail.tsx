import { useEffect, useState, type FormEvent } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Search, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TierBadge } from "@/components/TierBadge";
import { tierForPoints } from "@/lib/tiers";
import { cn } from "@/lib/utils";

type TopCoach = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  review_count: number | null;
  rating_sum: number | null;
  points: number | null;
};

export function RightRail({ className, hideSearch = false }: { className?: string; hideSearch?: boolean }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [coaches, setCoaches] = useState<TopCoach[] | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, review_count, rating_sum, points")
        .eq("is_claimed", true)
        .gt("review_count", 0)
        .order("points", { ascending: false, nullsFirst: false })
        .order("review_count", { ascending: false })
        .limit(6);
      if (!cancel) setCoaches((data as TopCoach[] | null) ?? []);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
  };

  return (
    <aside className={cn("w-80 shrink-0", className)}>
      <div className="sticky top-[72px] m-3 flex flex-col gap-4">
        {/* Search */}
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-white/5 bg-card/60 p-2 shadow-[0_10px_40px_-20px_hsl(0_0%_0%/0.6)] backdrop-blur-xl"
        >
          <label className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 ring-1 ring-transparent focus-within:ring-primary/40">
            <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search coaches"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              aria-label="Search coaches"
            />
          </label>
        </form>

        {/* Top Coaches */}
        <div className="rounded-2xl border border-white/5 bg-card/60 p-4 shadow-[0_10px_40px_-20px_hsl(0_0%_0%/0.6)] backdrop-blur-xl">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-base tracking-tight text-foreground">Top Coaches</h2>
            <NavLink to="/explore" className="text-[11px] font-medium text-primary hover:underline">
              See all
            </NavLink>
          </div>
          <ul className="flex flex-col gap-1">
            {coaches === null &&
              Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <span className="h-9 w-9 animate-pulse rounded-full bg-secondary" />
                  <span className="flex-1">
                    <span className="block h-3 w-24 animate-pulse rounded bg-secondary" />
                    <span className="mt-1.5 block h-2.5 w-16 animate-pulse rounded bg-secondary/70" />
                  </span>
                </li>
              ))}
            {coaches?.length === 0 && (
              <li className="px-2 py-1 text-xs text-muted-foreground">No coaches yet.</li>
            )}
            {coaches?.map((c) => {
              const points = c.points ?? 0;
              const tier = tierForPoints(points);
              const avg =
                c.review_count && c.review_count > 0
                  ? Math.round(((c.rating_sum ?? 0) / c.review_count) * 10) / 10
                  : null;
              return (
                <li key={c.id}>
                  <NavLink
                    to={`/@${c.username}`}
                    className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/60"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[11px] font-semibold uppercase text-muted-foreground ring-1 ring-border">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{(c.display_name ?? c.username).slice(0, 1)}</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                          {c.display_name ?? c.username}
                        </span>
                        {tier !== "unranked" && <TierBadge tier={tier} size="xs" showLabel={false} />}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        {avg !== null ? (
                          <>
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            <span className="font-medium text-foreground/80">{avg.toFixed(1)}</span>
                            <span>· {c.review_count} review{c.review_count === 1 ? "" : "s"}</span>
                          </>
                        ) : (
                          <span>@{c.username}</span>
                        )}
                      </span>
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}

export default RightRail;
