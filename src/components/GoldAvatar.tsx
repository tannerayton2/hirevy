// Avatar with the metallic gold ring used across the network.
import { cn } from "@/lib/utils";

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function GoldAvatar({
  name,
  url,
  size = 48,
  className,
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      style={{ width: size, height: size, padding: size >= 72 ? 3 : 2, background: "var(--metal-gold)" }}
      className={cn("inline-flex shrink-0 rounded-full", className)}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full rounded-full bg-card object-cover" />
      ) : (
        <span
          style={{ fontSize: Math.round(size * 0.34) }}
          className="flex h-full w-full items-center justify-center rounded-full bg-[linear-gradient(145deg,#26231C,#121214)] font-semibold text-foreground"
        >
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}
