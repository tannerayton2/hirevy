import { cn } from "@/lib/utils";

export const REACTION_EMOJIS = ["❤️", "😂", "🔥", "👏", "😮", "😢", "👍"] as const;

interface Props {
  onPick: (emoji: string) => void;
  align: "left" | "right";
}

export function ReactionPicker({ onPick, align }: Props) {
  return (
    <div
      className={cn(
        "absolute -top-10 z-10 flex items-center gap-0.5 rounded-full border border-border bg-popover px-1.5 py-1 shadow-md",
        align === "right" ? "right-0" : "left-0",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {REACTION_EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onPick(e)}
          className="rounded-full px-1 py-0.5 text-base transition-transform hover:scale-125"
          aria-label={`React ${e}`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
