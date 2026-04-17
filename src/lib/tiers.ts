export type Tier = "unranked" | "bronze" | "silver" | "gold" | "platinum" | "diamond";

export function tierForReviewCount(count: number): Tier {
  if (count >= 100) return "diamond";
  if (count >= 50) return "platinum";
  if (count >= 25) return "gold";
  if (count >= 10) return "silver";
  if (count >= 1) return "bronze";
  return "unranked";
}

export const TIER_LABEL: Record<Tier, string> = {
  unranked: "Unranked",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
};

export const TIER_THRESHOLDS: Record<Tier, string> = {
  unranked: "0 reviews",
  bronze: "1–9 reviews",
  silver: "10–24 reviews",
  gold: "25–49 reviews",
  platinum: "50–99 reviews",
  diamond: "100+ reviews",
};
