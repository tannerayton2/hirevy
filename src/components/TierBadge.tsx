import { cn } from "@/lib/utils";
import { TIER_LABEL, type Tier } from "@/lib/tiers";

interface TierBadgeProps {
  tier: Tier;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const tierGradient: Record<Tier, string> = {
  unranked: "bg-[linear-gradient(135deg,hsl(240_4%_22%),hsl(240_4%_12%))] text-muted-foreground",
  bronze: "bg-[linear-gradient(135deg,hsl(var(--tier-bronze-from)),hsl(var(--tier-bronze-to)))] text-amber-50",
  silver: "bg-[linear-gradient(135deg,hsl(var(--tier-silver-from)),hsl(var(--tier-silver-to)))] text-zinc-900",
  gold: "bg-[linear-gradient(135deg,hsl(var(--tier-gold-from)),hsl(var(--tier-gold-to)))] text-amber-950",
  platinum: "bg-[linear-gradient(135deg,hsl(var(--tier-platinum-from)),hsl(var(--tier-platinum-to)))] text-slate-900",
  diamond: "bg-[linear-gradient(135deg,hsl(var(--tier-diamond-from)),hsl(var(--tier-diamond-to)))] text-slate-900",
};

const sizeMap = {
  xs: "h-4 px-1.5 text-[9px] tracking-[0.18em]",
  sm: "h-5 px-2 text-[10px] tracking-[0.2em]",
  md: "h-6 px-2.5 text-[11px] tracking-[0.22em]",
  lg: "h-7 px-3 text-xs tracking-[0.24em]",
};

export function TierBadge({ tier, size = "sm", showLabel = true, className }: TierBadgeProps) {
  return (
    <span
      title={`${TIER_LABEL[tier]} tier`}
      className={cn(
        "inline-flex items-center justify-center rounded-[3px] font-semibold uppercase",
        "shadow-[inset_0_1px_0_hsl(0_0%_100%/0.35),inset_0_-1px_0_hsl(0_0%_0%/0.35),0_1px_2px_hsl(0_0%_0%/0.4)]",
        "ring-1 ring-black/30",
        tierGradient[tier],
        sizeMap[size],
        className,
      )}
    >
      {showLabel ? TIER_LABEL[tier] : "•"}
    </span>
  );
}
