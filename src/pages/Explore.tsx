import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OfferCard, type OfferCardData } from "@/components/OfferCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ExploreFilterPanel } from "@/components/ExploreFilterPanel";
import {
  parseFilters, filtersToParams, activeFilterCount, applyClientFilters,
  SORT_LABELS, DEFAULT_FILTERS, type ExploreFilters, type SortKey,
} from "@/lib/exploreFilters";
import { cn } from "@/lib/utils";

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);

  const [query, setQuery] = useState(filters.q);
  const [offers, setOffers] = useState<OfferCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => { setQuery(filters.q); }, [filters.q]);

  const writeFilters = (next: ExploreFilters) => {
    const p = filtersToParams(next);
    setParams(p, { replace: true });
  };

  // Fetch (server filters: type, category, search, sort by created/priority); rest applied client-side
  useEffect(() => {
    let cancel = false;
    const run = async () => {
      setLoading(true);
      let req = supabase
        .from("offers")
        .select(`
          id, slug, title, cover_url, price_cents, free_for_testimonial, category, created_at,
          cta_link, cta_label, hosted_on_hirevy, offer_tier,
          provider:profiles!offers_provider_id_fkey ( username, display_name, review_count, rating_sum )
        `)
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);

      if (filters.type === "paid") req = req.eq("free_for_testimonial", false);
      else if (filters.type === "free" || filters.freeOnly) req = req.eq("free_for_testimonial", true);

      if (filters.categories.length) req = req.in("category", filters.categories);

      if (filters.q.trim()) {
        const term = `%${filters.q.trim()}%`;
        req = req.or(`title.ilike.${term},description.ilike.${term}`);
      }

      const { data, error } = await req;
      if (!cancel) {
        if (error) console.error(error);
        setOffers((data as unknown as OfferCardData[]) ?? []);
        setLoading(false);
      }
    };
    void run();
    return () => { cancel = true; };
  }, [filters.type, filters.freeOnly, filters.categories.join(","), filters.q]);

  const visible = useMemo(() => applyClientFilters(offers as unknown as (OfferCardData & { created_at?: string })[], filters), [offers, filters]);
  const count = activeFilterCount(filters);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    writeFilters({ ...filters, q: query });
  };

  const setSort = (s: SortKey) => writeFilters({ ...filters, sort: s });

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      {/* Hero */}
      <div className="mb-6 max-w-3xl">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">The Marketplace</p>
        <h1 className="text-balance font-display text-3xl font-bold leading-[1.05] md:text-5xl">
          Hire by proof, not promises.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
          Verified reviews. Real offers. Browse providers ranked by what their clients actually said.
        </p>
      </div>

      {/* Search + controls */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <form onSubmit={onSearch} className="relative flex-1 md:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search offers, providers, tags…"
            className="h-11 pl-9 text-sm"
          />
        </form>

        <div className="flex items-center gap-2">
          {/* Mobile filter button */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-11 gap-2 lg:hidden">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {count > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-lg p-4">
              <ExploreFilterPanel
                filters={filters}
                onChange={writeFilters}
                onClose={() => setSheetOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <Select value={filters.sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-11 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] rounded-md border border-border bg-card/40 p-4">
            <ExploreFilterPanel filters={filters} onChange={writeFilters} />
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          {/* Active filter summary */}
          {count > 0 && (
            <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {visible.length} {visible.length === 1 ? "result" : "results"} · {count} filter{count === 1 ? "" : "s"} active
              </span>
              <button
                type="button"
                onClick={() => writeFilters({ ...DEFAULT_FILTERS, q: filters.q })}
                className="font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <div className={gridCls}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] animate-pulse rounded-md bg-card" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState hasFilters={count > 0} onClear={() => writeFilters({ ...DEFAULT_FILTERS, q: filters.q })} />
          ) : (
            <div className={gridCls}>
              {visible.map((o) => <OfferCard key={o.id} offer={o} referrer="explore" />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const gridCls = cn(
  "grid gap-4",
  "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4",
);

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-card/40 p-10 text-center">
      <p className="font-display text-xl font-semibold">
        {hasFilters ? "No offers match these filters." : "Nothing here yet."}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {hasFilters
          ? "Try clearing some filters or broadening your search."
          : "Be among the first providers to list one."}
      </p>
      {hasFilters && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
