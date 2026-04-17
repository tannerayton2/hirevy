import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-0.5 font-display text-xl font-bold tracking-tight", className)}>
      <span className="text-foreground">Hire</span>
      <span className="text-primary">Vy</span>
      <span className="ml-0.5 h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-primary" />
    </span>
  );
}
