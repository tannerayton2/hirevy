import { CATEGORIES, type Category } from "@/lib/categories";
import { tierForReviewCount, type Tier } from "@/lib/tiers";
import { matchesPriceFilter, priceSortKey, type PricingModel } from "@/lib/pricing";

export const TIERS: Tier[] = ["unranked", "bronze", "silver", "gold", "platinum", "diamond"];
export const REVIEW_STEPS = [0, 5, 10, 25, 50, 100] as const;
export type OfferType = "paid" | "free" | "both";
export type SortKey = "newest" | "rating" | "reviews" | "price_asc" | "price_desc";

export const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest",
  rating: "Highest Rated",
  reviews: "Most Reviewed",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
};

export interface ExploreFilters {
  q: string;
  type: OfferType;
  categories: Category[];
  priceMin: number | null;
  priceMax: number | null;
  freeOnly: boolean;
  includeContactPricing: boolean;
  tiers: Tier[];
  minReviews: number;
  minRating: number; // 0 = any
  sort: SortKey;
}

export const DEFAULT_FILTERS: ExploreFilters = {
  q: "",
  type: "paid",
  categories: [],
  priceMin: null,
  priceMax: null,
  freeOnly: false,
  includeContactPricing: true,
  tiers: [],
  minReviews: 0,
  minRating: 0,
  sort: "newest",
};

export function parseFilters(params: URLSearchParams): ExploreFilters {
  const typeRaw = params.get("type") ?? params.get("tab"); // backwards compat with tab
  const type: OfferType = typeRaw === "free" ? "free" : typeRaw === "both" ? "both" : "paid";

  const cats = (params.get("cats") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((c): c is Category => (CATEGORIES as readonly string[]).includes(c));

  const tiers = (params.get("tiers") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((t): t is Tier => (TIERS as string[]).includes(t));

  const sortRaw = params.get("sort") as SortKey | null;
  const sort: SortKey = sortRaw && SORT_LABELS[sortRaw] ? sortRaw : "newest";

  const numOrNull = (v: string | null) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    q: params.get("q") ?? "",
    type,
    categories: cats,
    priceMin: numOrNull(params.get("pmin")),
    priceMax: numOrNull(params.get("pmax")),
    freeOnly: params.get("free") === "1",
    includeContactPricing: params.get("nocontact") !== "1",
    tiers,
    minReviews: Number(params.get("rcmin") ?? 0) || 0,
    minRating: Number(params.get("rmin") ?? 0) || 0,
    sort,
  };
}

export function filtersToParams(f: ExploreFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.type !== "paid") p.set("type", f.type);
  if (f.categories.length) p.set("cats", f.categories.join(","));
  if (f.priceMin != null) p.set("pmin", String(f.priceMin));
  if (f.priceMax != null) p.set("pmax", String(f.priceMax));
  if (f.freeOnly) p.set("free", "1");
  if (!f.includeContactPricing) p.set("nocontact", "1");
  if (f.tiers.length) p.set("tiers", f.tiers.join(","));
  if (f.minReviews > 0) p.set("rcmin", String(f.minReviews));
  if (f.minRating > 0) p.set("rmin", String(f.minRating));
  if (f.sort !== "newest") p.set("sort", f.sort);
  return p;
}

export function activeFilterCount(f: ExploreFilters): number {
  let n = 0;
  if (f.categories.length) n++;
  if (f.priceMin != null) n++;
  if (f.priceMax != null) n++;
  if (f.freeOnly) n++;
  if (!f.includeContactPricing) n++;
  if (f.tiers.length) n++;
  if (f.minReviews > 0) n++;
  if (f.minRating > 0) n++;
  // type only counts when changed away from default tab semantics
  if (f.type === "both") n++;
  return n;
}

export interface ProviderLite {
  username: string;
  display_name: string | null;
  review_count: number;
  rating_sum: number;
}

export function applyClientFilters<T extends {
  price_cents: number | null;
  price_max_cents?: number | null;
  pricing_model?: PricingModel | string | null;
  free_for_testimonial: boolean;
  provider: ProviderLite;
  created_at?: string;
}>(rows: T[], f: ExploreFilters): T[] {
  const filtered = rows.filter((o) => {
    // tier
    if (f.tiers.length) {
      const t = tierForReviewCount(o.provider.review_count);
      if (!f.tiers.includes(t)) return false;
    }
    // min reviews
    if (f.minReviews > 0 && o.provider.review_count < f.minReviews) return false;
    // min rating
    if (f.minRating > 0) {
      const avg = o.provider.review_count > 0 ? o.provider.rating_sum / o.provider.review_count : 0;
      if (avg < f.minRating) return false;
    }
    // contact-pricing exclusion
    const model = (o.pricing_model as PricingModel) || "fixed";
    if (!f.includeContactPricing && model === "contact") return false;
    // price range — only meaningful for paid offers
    if (!o.free_for_testimonial) {
      const minCents = f.priceMin != null ? f.priceMin * 100 : null;
      const maxCents = f.priceMax != null ? f.priceMax * 100 : null;
      if (!matchesPriceFilter(o, minCents, maxCents)) return false;
    }
    return true;
  });

  const sorted = [...filtered];
  switch (f.sort) {
    case "rating":
      sorted.sort((a, b) => {
        const ra = a.provider.review_count > 0 ? a.provider.rating_sum / a.provider.review_count : 0;
        const rb = b.provider.review_count > 0 ? b.provider.rating_sum / b.provider.review_count : 0;
        return rb - ra;
      });
      break;
    case "reviews":
      sorted.sort((a, b) => b.provider.review_count - a.provider.review_count);
      break;
    case "price_asc":
      sorted.sort((a, b) => {
        const ka = priceSortKey(a);
        const kb = priceSortKey(b);
        if (ka == null && kb == null) return 0;
        if (ka == null) return 1; // contact → bottom
        if (kb == null) return -1;
        return ka - kb;
      });
      break;
    case "price_desc":
      sorted.sort((a, b) => {
        const ka = priceSortKey(a);
        const kb = priceSortKey(b);
        if (ka == null && kb == null) return 0;
        if (ka == null) return 1; // contact → bottom (also for high-to-low; they have no number)
        if (kb == null) return -1;
        return kb - ka;
      });
      break;
    // newest: rely on server order
  }
  return sorted;
}

export { CATEGORIES };
