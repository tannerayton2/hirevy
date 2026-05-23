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
  gradient: string;
  facet: string;
  text: string;
  shadow: string;
};

const TIER_STYLES: Record<Exclude<Tier, "unranked">, TierStyle> = {
  bronze: {
    gradient: "linear-gradient(135deg, #F0C080, #CD7F32, #8B5A1E)",
    facet: "#F5D090",
    text: "#3A1800",
    shadow: "2px 3px 10px rgba(100,50,0,0.45), inset 0 1px 0 rgba(255,220,150,0.6)",
  },
  silver: {
    gradient: "linear-gradient(135deg, #FFFFFF, #C0C0C0, #686868)",
    facet: "#F0F0F0",
    text: "#282828",
    shadow: "2px 3px 10px rgba(80,80,80,0.4), inset 0 1px 0 rgba(255,255,255,0.8)",
  },
  gold: {
    gradient: "linear-gradient(135deg, #FFF4A0, #FFD700, #957000)",
    facet: "#FFF4A0",
    text: "#3A2800",
    shadow: "2px 3px 10px rgba(120,80,0,0.45), inset 0 1px 0 rgba(255,248,180,0.7)",
  },
  platinum: {
    gradient: "linear-gradient(135deg, #FFFFFF, #D8D8D4, #909090)",
    facet: "#F4F4F2",
    text: "#282828",
    shadow: "2px 3px 10px rgba(100,100,100,0.35), inset 0 1px 0 rgba(255,255,255,0.9)",
  },
  diamond: {
    gradient: "linear-gradient(135deg, #AFFFFF, #00CED1, #004C50)",
    facet: "#7FFFFF",
    text: "#002828",
    shadow: "2px 3px 10px rgba(0,100,110,0.5), inset 0 1px 0 rgba(180,255,255,0.7)",
  },
};

const OUTER_CLIP =
  "polygon(7px 0%, calc(100% - 7px) 0%, 100% 7px, 100% calc(100% - 7px), calc(100% - 7px) 100%, 7px 100%, 0% calc(100% - 7px), 0% 7px)";
const INNER_CLIP =
  "polygon(5px 0%, calc(100% - 5px) 0%, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0% calc(100% - 5px), 0% 5px)";

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

// Base 114x40; scale proportionally
const sizeMap = {
  xs: { h: 28, w: 80, font: 8,  icon: 10, gap: 4 },
  sm: { h: 34, w: 96, font: 10, icon: 12, gap: 5 },
  md: { h: 40, w: 114, font: 11, icon: 13, gap: 5 },
  lg: { h: 50, w: 142, font: 13, icon: 16, gap: 6 },
};

export function TierBadge({ tier, size = "md", showLabel = true, className }: TierBadgeProps) {
  if (tier === "unranked") return null;
  const s = sizeMap[size];
  const t = TIER_STYLES[tier];

  return (
    <span
      title={`${TIER_LABEL[tier]} tier`}
      className={cn("tier-gem relative inline-flex select-none items-center justify-center", className)}
      style={{
        height: s.h,
        width: showLabel ? s.w : s.h,
        background: t.gradient,
        clipPath: OUTER_CLIP,
        WebkitClipPath: OUTER_CLIP,
        boxShadow: t.shadow,
        color: t.text,
        animation: "tier-shimmer 3s ease-in-out infinite",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 10,
          background: t.facet,
          opacity: 0.55,
          clipPath: INNER_CLIP,
          WebkitClipPath: INNER_CLIP,
          zIndex: 1,
        }}
      />
      <span
        className="relative inline-flex items-center justify-center font-bold uppercase"
        style={{
          zIndex: 2,
          gap: s.gap,
          fontSize: s.font,
          letterSpacing: "0.05em",
        }}
      >
        <IconFor tier={tier} size={s.icon} />
        {showLabel && <span>{TIER_LABEL[tier]}</span>}
      </span>
    </span>
  );
}
