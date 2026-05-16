import { Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function tierColor(score: number): string {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s <= 33) return "hsl(220 5% 55%)";
  if (s <= 66) return "hsl(30 90% 55%)";
  return "hsl(142 65% 45%)";
}

export function tierLabel(score: number): "Weak Review" | "Fair Review" | "Strong Review" {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s <= 33) return "Weak Review";
  if (s <= 66) return "Fair Review";
  return "Strong Review";
}

interface Props {
  score: number;
  className?: string;
}

/** Small solid shield icon (16px) colored by completeness tier. */
export function ReviewCompletenessShield({ score, className }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const color = tierColor(pct);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Review completeness: ${pct}`}
          className={["inline-flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm", className ?? ""].join(" ")}
        >
          <Shield
            className="h-4 w-4"
            style={{ color, fill: color }}
            strokeWidth={1.5}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Review completeness: {pct}
      </TooltipContent>
    </Tooltip>
  );
}
