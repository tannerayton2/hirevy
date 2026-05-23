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
 * Raised 3D metallic plate badge.
 * Renders nothing for "unranked".
 */
type TierStyle = {
  top: string;
  mid: string;
  bot: string;
  shadow: string;
  border: string;
};

const TIER_STYLES: Record<Exclude<Tier, "unranked">, TierStyle> = {
  bronze:   { top: "#E8A96A", mid: "#CD7F32", bot: "#8B5A1E", shadow: "#4A2F0A", border: "#F2BC85" },
  silver:   { top: "#F0F0F0", mid: "#C0C0C0", bot: "#808080", shadow: "#404040", border: "#FFFFFF" },
  gold:     { top: "#FFE87C", mid: "#FFD700", bot: "#B8860B", shadow: "#5A4000", border: "#FFF2A8" },
  platinum: { top: "#FFFFFF", mid: "#E5E4E2", bot: "#A8A8A8", shadow: "#505050", border: "#FFFFFF" },
  diamond:  { top: "#7FFFFF", mid: "#00CED1", bot: "#006B6E", shadow: "#003333", border: "#B8FFFF" },
};

function IconFor({ tier, size }: { tier: Tier; size: number }) {
  const props = { width: size, height: size, strokeWidth: 2.4 } as const;
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
  xs: { h: 22, w: 80,  px: 8,  font: 9,  icon: 10, gap: 4, radius: 6 },
  sm: { h: 26, w: 90,  px: 10, font: 10, icon: 12, gap: 5, radius: 7 },
  md: { h: 32, w: 100, px: 12, font: 11, icon: 13, gap: 6, radius: 8 },
  lg: { h: 40, w: 124, px: 14, font: 13, icon: 16, gap: 7, radius: 10 },
};

export function TierBadge({ tier, size = "md", showLabel = true, className }: TierBadgeProps) {
  if (tier === "unranked") return null;
  const s = sizeMap[size];
  const t = TIER_STYLES[tier];

  const background = `linear-gradient(to bottom, ${t.top} 0%, ${t.top} 15%, ${t.mid} 50%, ${t.mid} 70%, ${t.bot} 95%, ${t.bot} 100%)`;

  // Layered shadows: outer elevation + inner top highlight + inner bottom shade
  const boxShadow = [
    `0 2px 3px ${t.shadow}`,                     // ambient/below
    `0 3px 6px -1px ${t.shadow}`,                // soft elevation
    `inset 0 1px 0 ${t.top}`,                    // top highlight rim
    `inset 0 -1px 0 ${t.shadow}`,                // bottom shade rim
    `inset 0 2px 3px rgba(255,255,255,0.35)`,    // specular top glow
    `inset 0 -2px 3px rgba(0,0,0,0.25)`,         // inner bottom depth
  ].join(", ");

  return (
    <span
      title={`${TIER_LABEL[tier]} tier`}
      className={cn(
        "tier-plate relative inline-flex select-none items-center justify-center overflow-hidden font-bold uppercase tracking-[0.12em]",
        className,
      )}
      style={{
        height: s.h,
        minWidth: showLabel ? s.w : s.h,
        paddingLeft: s.px,
        paddingRight: s.px,
        gap: s.gap,
        background,
        color: "#fff",
        fontSize: s.font,
        borderRadius: s.radius,
        border: `1px solid ${t.border}`,
        boxShadow,
        textShadow: `0 1px 1px ${t.shadow}, 0 1px 2px rgba(0,0,0,0.45)`,
      }}
    >
      <IconFor tier={tier} size={s.icon} />
      {showLabel && <span className="relative z-10">{TIER_LABEL[tier]}</span>}
    </span>
  );
}
