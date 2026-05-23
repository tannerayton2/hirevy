import { Shield, Star, Gem, Diamond } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIER_LABEL, type Tier } from "@/lib/tiers";

interface TierBadgeProps {
  tier: Tier;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/**
 * Pill-shaped credential badge with metallic gradient per tier.
 * Renders nothing for "unranked".
 */
const tierGradient: Record<Tier, string> = {
  unranked: "linear-gradient(135deg,#888 0%,#666 100%)",
  bronze: "linear-gradient(135deg,#E8A87C 0%,#CD7F32 45%,#8B4F1E 100%)",
  silver: "linear-gradient(135deg,#F5F5F5 0%,#C0C0C0 45%,#7d7d7d 100%)",
  gold: "linear-gradient(135deg,#FFE98A 0%,#FFD700 45%,#B8860B 100%)",
  platinum: "linear-gradient(135deg,#FFFFFF 0%,#E5E4E2 45%,#A8A8A8 100%)",
  diamond: "linear-gradient(135deg,#9FF5F0 0%,#00CED1 45%,#0892A5 100%)",
};

const tierTextColor: Record<Tier, string> = {
  unranked: "#fff",
  bronze: "#fff",
  silver: "#1a1a1a",
  gold: "#3a2a00",
  platinum: "#1a1a1a",
  diamond: "#fff",
};

function IconFor({ tier, size }: { tier: Tier; size: number }) {
  const props = { width: size, height: size, strokeWidth: 2.2 } as const;
  switch (tier) {
    case "bronze":
    case "silver":
      return <Shield {...props} />;
    case "gold":
      return <Star {...props} />;
    case "platinum":
      return <Gem {...props} />;
    case "diamond":
      return <Diamond {...props} />;
    default:
      return <Shield {...props} />;
  }
}

const sizeMap = {
  xs: { h: 20, px: 8, font: 9, icon: 10, gap: 4 },
  sm: { h: 24, px: 10, font: 10, icon: 12, gap: 5 },
  md: { h: 26, px: 12, font: 11, icon: 13, gap: 6 },
  lg: { h: 32, px: 14, font: 12, icon: 15, gap: 7 },
};

export function TierBadge({ tier, size = "md", showLabel = true, className }: TierBadgeProps) {
  if (tier === "unranked") return null;
  const s = sizeMap[size];
  return (
    <span
      title={`${TIER_LABEL[tier]} tier`}
      className={cn(
        "relative inline-flex select-none items-center justify-center overflow-hidden rounded-full font-bold uppercase tracking-[0.12em]",
        "shadow-[0_1px_2px_rgba(0,0,0,0.4),0_2px_6px_-1px_rgba(0,0,0,0.35)] ring-1 ring-black/25",
        tier === "diamond" && "tier-shimmer",
        className,
      )}
      style={{
        height: s.h,
        minWidth: showLabel ? 90 : s.h,
        paddingLeft: s.px,
        paddingRight: s.px,
        gap: s.gap,
        background: tierGradient[tier],
        color: tierTextColor[tier],
        fontSize: s.font,
        textShadow:
          tier === "silver" || tier === "platinum" || tier === "gold"
            ? "0 1px 0 rgba(255,255,255,0.4)"
            : "0 1px 0 rgba(0,0,0,0.35)",
      }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full" style={{
        background: "linear-gradient(to bottom, rgba(255,255,255,0.35), transparent)",
      }} />
      <IconFor tier={tier} size={s.icon} />
      {showLabel && <span className="relative z-10">{TIER_LABEL[tier]}</span>}
    </span>
  );
}
