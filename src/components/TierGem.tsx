import { Gem } from "lucide-react";
import { TIER_LABEL, type Tier } from "@/lib/tiers";
import { cn } from "@/lib/utils";

const TIER_GEM_COLOR: Record<Exclude<Tier, "unranked">, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#d4af37",
  platinum: "#e5e4e2",
  diamond: "#b9f2ff",
};

interface TierGemProps {
  tier: Tier;
  size?: number;
  className?: string;
}

/**
 * Small filled gem indicating a coach's tier. Renders nothing for `unranked`.
 * A native `title` tooltip announces the tier name for accessibility.
 */
export function TierGem({ tier, size = 15, className }: TierGemProps) {
  if (tier === "unranked") return null;
  const color = TIER_GEM_COLOR[tier];
  const label = `${TIER_LABEL[tier]} tier`;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      tabIndex={0}
      className={cn("inline-flex shrink-0 items-center focus:outline-none", className)}
      style={{ marginLeft: 7, lineHeight: 0 }}
    >
      <Gem
        size={size}
        color={color}
        fill={color}
        strokeWidth={1.5}
        style={{ filter: `drop-shadow(0 0 2px ${color}55)` }}
      />
    </span>
  );
}

export default TierGem;
