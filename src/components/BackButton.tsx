import { ArrowLeft } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { cn } from "@/lib/utils";

export function BackButton({ fallback, className }: { fallback?: string; className?: string }) {
  const goBack = useGoBack(fallback);
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Go back"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary",
        className,
      )}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
