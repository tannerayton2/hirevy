// Pricing model utilities for offers.
// Schema fields (offers table):
//   pricing_model:   'fixed' | 'starting_at' | 'range' | 'contact'
//   price_cents:     base/min price (used by fixed, starting_at, range)
//   price_max_cents: max price (used by range)

export type PricingModel = "fixed" | "starting_at" | "range" | "contact";

export const PRICING_MODELS: PricingModel[] = ["fixed", "starting_at", "range", "contact"];

export const PRICING_MODEL_LABEL: Record<PricingModel, string> = {
  fixed: "Fixed price",
  starting_at: "Starting at",
  range: "Range",
  contact: "Contact for pricing",
};

export const PRICING_MODEL_HINT: Record<PricingModel, string> = {
  fixed: "Single flat price.",
  starting_at: "Show your floor price; ideal for scope-based work.",
  range: "Show a min and max price.",
  contact: "Hide the number — buyers reach out via your CTA.",
};

export const CONTACT_LABEL = "Pricing on request";

function fmtUsd(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export interface PricedOffer {
  pricing_model?: PricingModel | string | null;
  price_cents: number | null;
  price_max_cents?: number | null;
  free_for_testimonial?: boolean;
}

/**
 * Render the price label for an offer based on its pricing model.
 * Free-for-testimonial offers always render as "FREE".
 */
export function formatOfferPrice(offer: PricedOffer): string {
  if (offer.free_for_testimonial) return "FREE";
  const model = (offer.pricing_model as PricingModel) || "fixed";
  const min = offer.price_cents;
  const max = offer.price_max_cents ?? null;

  switch (model) {
    case "contact":
      return CONTACT_LABEL;
    case "range":
      if (min != null && max != null) return `${fmtUsd(min)} – ${fmtUsd(max)}`;
      if (min != null) return `From ${fmtUsd(min)}`;
      return CONTACT_LABEL;
    case "starting_at":
      return min != null ? `Starting at ${fmtUsd(min)}` : CONTACT_LABEL;
    case "fixed":
    default:
      if (min == null) return "";
      if (min === 0) return "Free";
      return fmtUsd(min);
  }
}

/** True when the offer renders italic/muted (no number). */
export function isContactPricing(offer: PricedOffer): boolean {
  return ((offer.pricing_model as PricingModel) || "fixed") === "contact";
}

/**
 * Sort key used by Explore for "Price: low to high" / "high to low".
 * Contact-priced offers return null — caller should push them to the end
 * regardless of sort direction.
 */
export function priceSortKey(offer: PricedOffer): number | null {
  if (offer.free_for_testimonial) return 0;
  const model = (offer.pricing_model as PricingModel) || "fixed";
  if (model === "contact") return null;
  // fixed / starting_at / range all sort by the floor (price_cents)
  return offer.price_cents ?? null;
}

/**
 * Determines whether an offer matches a price range filter (in CENTS).
 * - fixed: price_cents within [min, max]
 * - starting_at: starting price within [min, max] (provider's floor)
 * - range: any overlap between [offer.min, offer.max] and [filter.min, filter.max]
 * - contact: excluded when ANY price filter is set
 */
export function matchesPriceFilter(
  offer: PricedOffer,
  minCents: number | null,
  maxCents: number | null,
): boolean {
  if (minCents == null && maxCents == null) return true; // no filter
  const model = (offer.pricing_model as PricingModel) || "fixed";
  if (model === "contact") return false;

  const lo = minCents ?? -Infinity;
  const hi = maxCents ?? Infinity;

  if (model === "range") {
    const oLo = offer.price_cents ?? 0;
    const oHi = offer.price_max_cents ?? oLo;
    // overlap test
    return oLo <= hi && oHi >= lo;
  }

  // fixed + starting_at: compare price_cents (floor) against filter window
  const p = offer.price_cents ?? 0;
  return p >= lo && p <= hi;
}
