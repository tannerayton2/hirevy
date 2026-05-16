import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number; // 0..5, supports 0.5 increments
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
            <span
              key={i}
              className="relative inline-block shrink-0"
              style={{ width: size, height: size }}
            >
              <Star
                size={size}
                className="absolute inset-0 text-muted-foreground/40"
                strokeWidth={1.5}
              />
              {(filled || half) && (
                <Star
                  size={size}
                  className="absolute inset-0 fill-primary text-primary"
                  strokeWidth={1.5}
                  style={half ? { clipPath: "inset(0 50% 0 0)" } : undefined}
                />
              )}
            </span>
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
