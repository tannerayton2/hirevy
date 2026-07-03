export type Tier = "unranked" | "bronze" | "silver" | "gold" | "platinum" | "diamond";

/** Points awarded for a received review, by star rating. */
export function pointsForRating(rating: number): number {
  if (rating >= 5) return 10;
  if (rating >= 4) return 8;
  if (rating >= 3) return 4;
  if (rating >= 2) return 1;
  return 0;
}

/** Cumulative-points -> tier. */
export function tierForPoints(points: number): Tier {
  if (points >= 1000) return "diamond";
  if (points >= 500) return "platinum";
  if (points >= 200) return "gold";
  if (points >= 50) return "silver";
  if (points >= 10) return "bronze";
  return "unranked";
}

/**
 * Legacy signature — kept so older callers don't break.
 * The first argument is now treated as cumulative points.
 */
export function tierFor(pointsOrCount: number, _avgScore: number = 0): Tier {
  return tierForPoints(pointsOrCount);
}

export function tierForReviewCount(points: number): Tier {
  return tierForPoints(points);
}

/** Inclusive lower bound of each tier, in points. */
export const TIER_MIN_POINTS: Record<Tier, number> = {
  unranked: 0,
  bronze: 10,
  silver: 50,
  gold: 200,
  platinum: 500,
  diamond: 1000,
};

const TIER_ORDER: Tier[] = ["unranked", "bronze", "silver", "gold", "platinum", "diamond"];

/** Next tier above the current one, or null if already at max. */
export function nextTier(t: Tier): Tier | null {
  const i = TIER_ORDER.indexOf(t);
  return i < 0 || i >= TIER_ORDER.length - 1 ? null : TIER_ORDER[i + 1];
}

/** Points still needed to reach the next tier (0 if at max). */
export function pointsToNextTier(points: number): number {
  const t = tierForPoints(points);
  const next = nextTier(t);
  if (!next) return 0;
  return Math.max(0, TIER_MIN_POINTS[next] - points);
}

/** Progress 0..1 within the current tier band toward the next tier. */
export function tierProgress(points: number): number {
  const t = tierForPoints(points);
  const next = nextTier(t);
  if (!next) return 1;
  const lo = TIER_MIN_POINTS[t];
  const hi = TIER_MIN_POINTS[next];
  if (hi <= lo) return 1;
  return Math.min(1, Math.max(0, (points - lo) / (hi - lo)));
}

export const TIER_LABEL: Record<Tier, string> = {
  unranked: "Unranked",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
};

export const TIER_COLOR: Record<Tier, string> = {
  unranked: "#888888",
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2",
  diamond: "#00CED1",
};

export const TIER_RANK: Record<Tier, number> = {
  unranked: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
  diamond: 5,
};

export const TIER_REQUIREMENT: Record<Tier, string> = {
  unranked: "0–9 points.",
  bronze: "10–49 points.",
  silver: "50–199 points.",
  gold: "200–499 points.",
  platinum: "500–999 points.",
  diamond: "1000+ points.",
};

export const TIER_TAGLINE: Record<Tier, string> = {
  unranked: "Just getting started.",
  bronze: "Verified track record begins here.",
  silver: "Trusted by a growing community.",
  gold: "Consistently strong reviews from real clients.",
  platinum: "Proven excellence at scale.",
  diamond: "Elite — top of the Aytopus leaderboard.",
};

export const TIER_THRESHOLDS: Record<Tier, string> = TIER_REQUIREMENT;
