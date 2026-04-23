import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  TIERS,
  REVIEW_STEPS,
  DEFAULT_FILTERS,
  type ExploreFilters,
} from "@/lib/exploreFilters";
import { TIER_LABEL } from "@/lib/tiers";

interface Props {
  filters: ExploreFilters;
  onChange: (next: ExploreFilters) => void;
  onClose?: () => void;
}

export function ExploreFilterPanel({ filters, onChange, onClose }: Props) {
  const set = <K extends keyof ExploreFilters>(k: K, v: ExploreFilters[K]) =>
    onChange({ ...filters, [k]: v });

  const toggleCategory = (c: string) => {
    const has = filters.categories.includes(c as never);
    set(
      "categories",
      (has ? filters.categories.filter((x) => x !== c) : [...filters.categories, c]) as ExploreFilters["categories"],
    );
  };

  const toggleTier = (t: (typeof TIERS)[number]) => {
    const has = filters.tiers.includes(t);
    set("tiers", has ? filters.tiers.filter((x) => x !== t) : [...filters.tiers, t]);
  };

  const clearAll = () => onChange({ ...DEFAULT_FILTERS, q: filters.q, type: filters.type });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="font-display text-lg font-semibold">Filters</h2>
        <button
          type="button"
          onClick={clearAll}
          className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          Clear all
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto py-4 pr-1">
        {/* Offer type */}
        <Section title="Offer type">
          <div className="flex flex-wrap gap-2">
            {(["paid", "free", "both"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("type", t)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition-colors",
                  filters.type === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40",
                )}
              >
                {t === "paid" ? "Paid" : t === "free" ? "Free" : "Both"}
              </button>
            ))}
          </div>
        </Section>

        <Separator />

        {/* Category */}
        <Section title="Category">
          <div className="grid grid-cols-1 gap-2">
            {CATEGORIES.map((c) => {
              const checked = filters.categories.includes(c);
              return (
                <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={checked} onCheckedChange={() => toggleCategory(c)} />
                  <span className={cn(checked && "text-foreground", "text-muted-foreground")}>{c}</span>
                </label>
              );
            })}
          </div>
        </Section>

        <Separator />

        {/* Price */}
        <Section title="Price (USD)">
          <div className="mb-3 flex items-center justify-between">
            <Label htmlFor="freeOnly" className="text-sm text-muted-foreground">
              Free for testimonial only
            </Label>
            <Switch
              id="freeOnly"
              checked={filters.freeOnly}
              onCheckedChange={(v) => {
                onChange({ ...filters, freeOnly: v, type: v ? "free" : filters.type });
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Min"
              disabled={filters.freeOnly}
              value={filters.priceMin ?? ""}
              onChange={(e) => set("priceMin", e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
            />
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Max"
              disabled={filters.freeOnly}
              value={filters.priceMax ?? ""}
              onChange={(e) => set("priceMax", e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Label htmlFor="includeContact" className="text-sm text-muted-foreground">
              Include "Pricing on request" offers
            </Label>
            <Switch
              id="includeContact"
              checked={filters.includeContactPricing}
              onCheckedChange={(v) => set("includeContactPricing", v)}
            />
          </div>
        </Section>

        <Separator />

        {/* Tier */}
        <Section title="Provider tier">
          <div className="grid grid-cols-2 gap-2">
            {TIERS.map((t) => {
              const checked = filters.tiers.includes(t);
              return (
                <label key={t} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={checked} onCheckedChange={() => toggleTier(t)} />
                  <span className={cn(checked ? "text-foreground" : "text-muted-foreground")}>{TIER_LABEL[t]}</span>
                </label>
              );
            })}
          </div>
        </Section>

        <Separator />

        {/* Min reviews */}
        <Section title="Minimum reviews">
          <div className="flex flex-wrap gap-2">
            {REVIEW_STEPS.map((n) => {
              const active = filters.minReviews === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => set("minReviews", n)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {n === 0 ? "Any" : n === 100 ? "100+" : `${n}+`}
                </button>
              );
            })}
          </div>
        </Section>

        <Separator />

        {/* Min rating */}
        <Section title="Minimum rating">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = filters.minRating >= n;
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star minimum`}
                  onClick={() => set("minRating", filters.minRating === n ? 0 : n)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-6 w-6",
                      active ? "fill-primary text-primary" : "text-muted-foreground/40",
                    )}
                  />
                </button>
              );
            })}
            {filters.minRating > 0 && (
              <button
                type="button"
                onClick={() => set("minRating", 0)}
                className="ml-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                Reset
              </button>
            )}
          </div>
        </Section>
      </div>

      {onClose && (
        <div className="border-t border-border pt-3">
          <Button onClick={onClose} className="w-full">
            Show results
          </Button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
