import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  className?: string;
}

export function ExpandableReviewText({ text, className }: Props) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      // Compare full scrollHeight vs the clamped clientHeight.
      const prev = el.style.webkitLineClamp;
      const prevDisplay = el.style.display;
      el.style.webkitLineClamp = "3";
      el.style.display = "-webkit-box";
      const isOverflowing = el.scrollHeight - el.clientHeight > 1;
      el.style.webkitLineClamp = prev;
      el.style.display = prevDisplay;
      setOverflows(isOverflowing);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div>
      <p
        ref={ref}
        className={cn(
          "whitespace-pre-line",
          !expanded && "line-clamp-3",
          className,
        )}
      >
        {text}
      </p>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
