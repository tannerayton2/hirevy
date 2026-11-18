import { cn } from "@/lib/utils";

/** The Aytopus octopus, redrawn as a fine-line mark to match the proof card's security pattern. */
export function OctopusMark({ className, strokeWidth = 4.2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M31 53 C31 31 40 19 50 19 C60 19 69 31 69 53" />
        <path d="M31 53 C25 59 18 59 15.5 53.5 C13.5 49 17.5 45.5 21 48.5" />
        <path d="M37.5 55 C34 65 28 71 23.5 73 C19.5 74.5 17.5 70.5 20.5 68.5" />
        <path d="M45 56 C44 67 42 77 38 83 C36 86 32.5 84 34.5 80.5" />
        <path d="M55 56 C56 67 58 77 62 83 C64 86 67.5 84 65.5 80.5" />
        <path d="M62.5 55 C66 65 72 71 76.5 73 C80.5 74.5 82.5 70.5 79.5 68.5" />
        <path d="M69 53 C75 59 82 59 84.5 53.5 C86.5 49 82.5 45.5 79 48.5" />
      </g>
      <circle cx="43.5" cy="44" r="2.8" fill="currentColor" />
      <circle cx="56.5" cy="44" r="2.8" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className, wordmark = true }: { className?: string; wordmark?: boolean }) {
  return (
    <span role="img" aria-label="Aytopus" className={cn("flex w-fit select-none items-center gap-2", className)}>
      <OctopusMark className="h-7 w-7 text-primary md:h-8 md:w-8" />
      {wordmark && (
        <span className="mr-[-0.34em] text-[13px] font-bold tracking-[0.34em] text-foreground md:text-sm">AYTOPUS</span>
      )}
    </span>
  );
}
