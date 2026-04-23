import { cn } from "@/lib/utils";

interface Props {
  title: string;
  category?: string;
  className?: string;
  /** Tailwind aspect class — defaults to 4/3 to match cards */
  aspect?: string;
  /** Larger title sizing for hero/detail */
  large?: boolean;
}

/**
 * Branded fallback used when an offer has no cover image.
 * Charcoal backdrop with a soft gold radial overlay, thin gold border,
 * and the offer title typeset in Fraunces serif.
 */
export function OfferCoverPlaceholder({
  title,
  category,
  className,
  aspect = "aspect-[4/3]",
  large = false,
}: Props) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-[hsl(var(--background))]",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_30%_20%,hsl(var(--primary)/0.22),transparent_60%)]",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(ellipse_at_80%_90%,hsl(var(--primary)/0.10),transparent_55%)]",
        "ring-1 ring-inset ring-[hsl(var(--primary)/0.25)]",
        aspect,
        className,
      )}
    >
      {category && (
        <span className="absolute left-2 top-2 z-10 rounded-[3px] bg-background/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
          {category}
        </span>
      )}
      <div className="relative z-[1] flex h-full w-full items-center justify-center px-6 py-8">
        <h3
          className={cn(
            "line-clamp-3 text-center font-display font-semibold leading-tight text-foreground/90",
            large ? "text-[clamp(28px,4vw,44px)]" : "text-[clamp(20px,3vw,28px)]",
          )}
        >
          {title}
        </h3>
      </div>
    </div>
  );
}
