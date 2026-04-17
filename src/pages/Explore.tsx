import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OfferCard, type OfferCardData } from "@/components/OfferCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Tab = "paid" | "free";

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = (params.get("tab") as Tab) === "free" ? "free" : "paid";
  const q = params.get("q") ?? "";
  const [query, setQuery] = useState(q);
  const [offers, setOffers] = useState<OfferCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setQuery(q); }, [q]);

  useEffect(() => {
    let cancel = false;
    const run = async () => {
      setLoading(true);
      let req = supabase
        .from("offers")
        .select(`
          id, slug, title, cover_url, price_cents, free_for_testimonial, category,
          provider:profiles!offers_provider_id_fkey ( username, display_name, review_count, rating_sum )
        `)
        .eq("is_active", true)
        .eq("free_for_testimonial", tab === "free")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(48);

      if (q.trim()) {
        const term = `%${q.trim()}%`;
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
  }, [tab, q]);

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    next.set("tab", t);
    setParams(next, { replace: true });
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (query.trim()) next.set("q", query.trim()); else next.delete("q");
    setParams(next, { replace: true });
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      {/* Hero / heading */}
      <div className="mb-6 max-w-3xl">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">The Marketplace</p>
        <h1 className="text-balance font-display text-3xl font-bold leading-[1.05] md:text-5xl">
          Hire by proof, not promises.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
          Verified reviews. Real offers. Browse providers ranked by what their clients actually said.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={onSearch} className="relative mb-5 max-w-2xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search offers, providers, tags…"
          className="h-11 pl-9 text-sm"
        />
      </form>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="paid" className="uppercase tracking-[0.18em] text-xs data-[state=active]:bg-background data-[state=active]:text-primary">
            Paid Offers
          </TabsTrigger>
          <TabsTrigger value="free" className="uppercase tracking-[0.18em] text-xs data-[state=active]:bg-background data-[state=active]:text-primary">
            Free for Testimonial
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Grid */}
      {loading ? (
        <div className={gridCls}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-md bg-card" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className={gridCls}>
          {offers.map((o) => <OfferCard key={o.id} offer={o} />)}
        </div>
      )}
    </div>
  );
}

const gridCls = cn(
  "grid gap-4",
  "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
);

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-card/40 p-10 text-center">
      <p className="font-display text-xl font-semibold">Nothing here yet.</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {tab === "free"
          ? "No free-for-testimonial offers are live right now. Check back soon."
          : "No paid offers match. Be among the first providers to list one."}
      </p>
    </div>
  );
}
