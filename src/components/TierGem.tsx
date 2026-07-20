import { Shield, Hexagon, Star, Gem, Diamond } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TIER_LABEL, type Tier } from "@/lib/tiers";
import { cn } from "@/lib/utils";

const TIER_GEM_COLOR: Record<Exclude<Tier, "unranked">, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#d4af37",
  platinum: "#e5e4e2",
  diamond: "#b9f2ff",
};

const TIER_GEM_ICON: Record<Exclude<Tier, "unranked">, LucideIcon> = {
  bronze: Shield,
  silver: Hexagon,
  gold: Star,
  platinum: Gem,
  diamond: Diamond,
};

interface TierGemProps {
  tier: Tier;
  size?: number;
  className?: string;
}

/**
 * Small tier symbol shown after a coach's display name. Renders nothing for
 * `unranked`. Each tier has its own icon and color; a native `title` tooltip
 * plus `aria-label` announce the tier name for accessibility.
 */
export function TierGem({ tier, size = 15, className }: TierGemProps) {
  if (tier === "unranked") return null;
  const color = TIER_GEM_COLOR[tier];
  const Icon = TIER_GEM_ICON[tier];
  const label = `${TIER_LABEL[tier]} tier`;
  // Diamond's stacked-diamonds icon reads better without a full fill.
  const filled = tier !== "diamond";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      tabIndex={0}
      className={cn("inline-flex shrink-0 items-center focus:outline-none", className)}
      style={{ marginLeft: 7, lineHeight: 0 }}
    >
      <Icon
        size={size}
        color={color}
        fill={filled ? color : "none"}
        strokeWidth={filled ? 1.5 : 2}
        style={{ filter: `drop-shadow(0 0 2px ${color}55)` }}
      />
    </span>
  );
}

export default TierGem;
