import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  /** Completeness score 0–100 */
  score: number;
  className?: string;
}

/**
 * Thin 4px vertical bar pinned to the left edge of a review card.
 * Fills bottom-to-top by `score%` with a smooth gray → orange → green gradient
 * mapped across the full 0–100 range (so a low score shows gray, mid shows
 * orange, high shows green, with no hard color jumps).
 */
export function ReviewValidityBar({ score, className }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  // Inner gradient element height scales so the visible window always shows the
  // matching slice of the full gradient (bottom of full gradient = gray).
  const inverse = pct > 0 ? (100 * 100) / pct : 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Review completeness ${pct} of 100`}
          className={[
            "absolute left-0 top-0 z-[1] h-full w-1 cursor-help rounded-l-md bg-muted/25 outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            className ?? "",
          ].join(" ")}
        >
          <span
            aria-hidden
            className="absolute bottom-0 left-0 w-full overflow-hidden rounded-l-md"
            style={{ height: `${pct}%` }}
          >
            <span
              aria-hidden
              className="absolute bottom-0 left-0 w-full"
              style={{
                height: `${inverse}%`,
                background:
                  "linear-gradient(to top, hsl(220 5% 45%), hsl(30 90% 55%) 50%, hsl(142 65% 45%))",
              }}
            />
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        Review completeness
      </TooltipContent>
    </Tooltip>
  );
}
