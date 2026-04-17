import { cn } from "@/lib/utils";
import { TIER_LABEL, type Tier } from "@/lib/tiers";

interface TierBadgeProps {
  tier: Tier;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/**
 * Premium metallic tier badges — Hard Rock Cafe membership card aesthetic.
 * Each tier uses a richly layered gradient (base metal + diagonal sheen + edge shading),
 * an inner top highlight, a soft drop shadow, and embossed/inset typography.
 */

// Metallic background — multi-stop gradient + diagonal sheen overlay (via background-image stack).
const tierBackground: Record<Tier, string> = {
  unranked:
    "bg-[linear-gradient(160deg,hsl(240_4%_28%)_0%,hsl(240_4%_18%)_45%,hsl(240_4%_10%)_100%)]",
  bronze:
    "bg-[linear-gradient(160deg,hsl(28_70%_55%)_0%,hsl(24_72%_42%)_38%,hsl(20_78%_26%)_72%,hsl(18_60%_18%)_100%),linear-gradient(110deg,transparent_30%,hsl(40_80%_85%/0.35)_46%,transparent_60%)] bg-blend-overlay",
  silver:
    "bg-[linear-gradient(160deg,hsl(220_12%_92%)_0%,hsl(220_8%_72%)_40%,hsl(220_6%_44%)_75%,hsl(220_8%_30%)_100%),linear-gradient(110deg,transparent_30%,hsl(0_0%_100%/0.55)_46%,transparent_60%)] bg-blend-overlay",
  gold:
    "bg-[linear-gradient(160deg,hsl(46_80%_72%)_0%,hsl(40_75%_55%)_35%,hsl(36_72%_38%)_72%,hsl(32_65%_22%)_100%),linear-gradient(110deg,transparent_30%,hsl(48_100%_88%/0.55)_46%,transparent_60%)] bg-blend-overlay",
  platinum:
    "bg-[linear-gradient(160deg,hsl(200_18%_96%)_0%,hsl(205_14%_82%)_38%,hsl(210_10%_60%)_72%,hsl(215_12%_40%)_100%),linear-gradient(110deg,transparent_28%,hsl(0_0%_100%/0.7)_46%,transparent_62%)] bg-blend-overlay",
  diamond:
    "bg-[linear-gradient(135deg,hsl(190_85%_82%)_0%,hsl(220_75%_72%)_28%,hsl(265_65%_68%)_55%,hsl(310_60%_70%)_78%,hsl(180_70%_78%)_100%),linear-gradient(110deg,transparent_28%,hsl(0_0%_100%/0.6)_46%,transparent_62%)] bg-blend-overlay",
};

// Embossed text color per tier — deep enough to look "stamped" into the metal.
const tierTextColor: Record<Tier, string> = {
  unranked: "text-muted-foreground",
  bronze: "text-[hsl(20_60%_14%)]",
  silver: "text-[hsl(220_15%_18%)]",
  gold: "text-[hsl(32_70%_15%)]",
  platinum: "text-[hsl(215_20%_18%)]",
  diamond: "text-[hsl(245_45%_22%)]",
};

const sizeMap = {
  xs: "h-4 px-1.5 text-[9px] tracking-[0.22em]",
  sm: "h-5 px-2 text-[10px] tracking-[0.24em]",
  md: "h-6 px-2.5 text-[11px] tracking-[0.26em]",
  lg: "h-7 px-3 text-xs tracking-[0.28em]",
};

export function TierBadge({ tier, size = "sm", showLabel = true, className }: TierBadgeProps) {
  // Embossed/stamped text effect: bright top highlight + dark inner shadow on the glyphs.
  // Use a slightly different recipe per tier so it reads correctly on each metal tone.
  const embossStyle: React.CSSProperties = {
    // text-shadow stack: 1px white-ish top highlight + 1px dark bottom shadow inside the metal
    textShadow:
      tier === "unranked"
        ? "0 1px 0 hsl(0 0% 100% / 0.05)"
        : "0 1px 0 hsl(0 0% 100% / 0.55), 0 -1px 0 hsl(0 0% 0% / 0.45)",
  };

  return (
    <span
      title={`${TIER_LABEL[tier]} tier`}
      style={embossStyle}
      className={cn(
        "relative inline-flex select-none items-center justify-center overflow-hidden rounded-[3px] font-semibold uppercase",
        // Outer drop shadow + 1px dark ring to seat the badge above the surface
        "shadow-[0_1px_2px_hsl(0_0%_0%/0.5),0_2px_6px_-1px_hsl(0_0%_0%/0.45)]",
        "ring-1 ring-black/40",
        tierBackground[tier],
        tierTextColor[tier],
        sizeMap[size],
        className,
      )}
    >
      {/* Top inner highlight — suggests light hitting raised metal */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[3px] bg-[linear-gradient(to_bottom,hsl(0_0%_100%/0.35),transparent)] mix-blend-overlay"
      />
      {/* Bottom inner shading — deepens the lower edge */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 rounded-b-[3px] bg-[linear-gradient(to_top,hsl(0_0%_0%/0.35),transparent)]"
      />
      <span className="relative z-10">{showLabel ? TIER_LABEL[tier] : "•"}</span>
    </span>
  );
}
