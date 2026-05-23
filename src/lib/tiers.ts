export type Tier = "unranked" | "bronze" | "silver" | "gold" | "platinum" | "diamond";

/**
 * 6-tier system. Bronze and Silver are count-based;
 * Gold, Platinum, and Diamond also require a minimum average
 * completeness (review-strength) score.
 */
export function tierFor(reviewCount: number, avgScore: number = 0): Tier {
  if (reviewCount >= 100 && avgScore > 80) return "diamond";
  if (reviewCount >= 50 && avgScore > 70) return "platinum";
  if (reviewCount >= 25 && avgScore > 50) return "gold";
  if (reviewCount >= 10) return "silver";
  if (reviewCount >= 1) return "bronze";
  return "unranked";
}

/** Backward-compatible count-only helper (caps out at silver for high counts). */
export function tierForReviewCount(count: number): Tier {
  return tierFor(count, 0);
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
  unranked: "No verified reviews yet.",
  bronze: "1 or more verified reviews.",
  silver: "10 or more verified reviews.",
  gold: "25+ verified reviews with average strength above 50.",
  platinum: "50+ verified reviews with average strength above 70.",
  diamond: "100+ verified reviews with average strength above 80.",
};

export const TIER_TAGLINE: Record<Tier, string> = {
  unranked: "Just getting started.",
  bronze: "Verified track record begins here.",
  silver: "Trusted by a growing community.",
  gold: "Consistently strong reviews from real clients.",
  platinum: "Proven excellence at scale.",
  diamond: "Elite — top of the HireVy leaderboard.",
};

export const TIER_THRESHOLDS: Record<Tier, string> = TIER_REQUIREMENT;
