import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number; // 0..5
  size?: number;
  className?: string;
  showValue?: boolean;
  count?: number;
}

export function StarRating({ value, size = 14, className, showValue = false, count }: StarRatingProps) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = rounded >= i;
          const half = !filled && rounded >= i - 0.5;
          return (
            <Star
              key={i}
              size={size}
              className={cn(
                "shrink-0",
                filled || half ? "fill-primary text-primary" : "text-muted-foreground/40",
              )}
              strokeWidth={1.5}
              style={half ? { clipPath: "inset(0 50% 0 0)" } : undefined}
            />
          );
        })}
      </span>
      {showValue && (
        <span className="font-medium text-foreground">
          {value > 0 ? value.toFixed(1) : "—"}
          {typeof count === "number" && <span className="text-muted-foreground"> ({count})</span>}
        </span>
      )}
    </span>
  );
}
