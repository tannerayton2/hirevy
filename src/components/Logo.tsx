import { cn } from "@/lib/utils";
import logoUrl from "@/assets/aytopus-logo.png";

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Aytopus"
      className={cn("h-7 w-auto md:h-9 select-none", className)}
      draggable={false}
    />
  );
}
