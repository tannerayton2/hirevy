import { Shield, Star, Gem, Diamond } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIER_LABEL, type Tier } from "@/lib/tiers";

interface TierBadgeProps {
  tier: Tier;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

type TierStyle = {
  light: string;  // top-left highlight
  mid: string;    // middle true color
  dark: string;   // bottom-right depth
  facet: string;  // inner facet border
};

const TIER_STYLES: Record<Exclude<Tier, "unranked">, TierStyle> = {
  bronze:   { light: "#F0C080", mid: "#CD7F32", dark: "#6B3A10", facet: "#E8A855" },
  silver:   { light: "#FFFFFF", mid: "#C0C0C0", dark: "#606060", facet: "#E8E8E8" },
  gold:     { light: "#FFF4A0", mid: "#FFD700", dark: "#8B6500", facet: "#FFE94D" },
  platinum: { light: "#FFFFFF", mid: "#D8D8D4", dark: "#909090", facet: "#F0F0EE" },
  diamond:  { light: "#AFFFFF", mid: "#00CED1", dark: "#004D4F", facet: "#7FFFFF" },
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

// Scale base 110x36 across sizes
const sizeMap = {
  xs: { h: 24, w: 78,  px: 8,  font: 9,  icon: 10, gap: 4 },
  sm: { h: 30, w: 94,  px: 10, font: 10, icon: 12, gap: 5 },
  md: { h: 36, w: 110, px: 12, font: 11, icon: 13, gap: 6 },
  lg: { h: 44, w: 134, px: 14, font: 13, icon: 16, gap: 7 },
};

export function TierBadge({ tier, size = "md", showLabel = true, className }: TierBadgeProps) {
  if (tier === "unranked") return null;
  const s = sizeMap[size];
  const t = TIER_STYLES[tier];

  const background = `linear-gradient(135deg, ${t.light} 0%, ${t.mid} 50%, ${t.dark} 100%)`;

  // Inner facet border ~3px inside via inset box-shadow + drop shadow
  const boxShadow = [
    `inset 0 0 0 3px transparent`,
    `inset 0 0 0 4px ${t.facet}`, // creates the inner rectangle outline ~3px from edge
    `2px 2px 6px ${hexA(t.dark, 0.4)}`,
  ].join(", ");

  return (
    <span
      title={`${TIER_LABEL[tier]} tier`}
      className={cn(
        "gem-plate relative inline-flex select-none items-center justify-center overflow-hidden font-bold uppercase tracking-[0.12em]",
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
        borderRadius: 6,
        border: `1px solid ${t.light}`,
        boxShadow,
        textShadow: `0 1px 2px rgba(0,0,0,0.55)`,
      }}
    >
      <IconFor tier={tier} size={s.icon} />
      {showLabel && <span className="relative z-10">{TIER_LABEL[tier]}</span>}
    </span>
  );
}

function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
