import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

export const MAX_KEYWORDS = 10;
export const KEYWORD_MAX_LEN = 40;

export function KeywordsInput({
  value,
  onChange,
  placeholder = "e.g. high ticket sales, email marketing, mindset coaching",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^,+|,+$/g, "").trim().slice(0, KEYWORD_MAX_LEN);
    if (!t) return;
    if (value.length >= MAX_KEYWORDS) return;
    const exists = value.some((v) => v.toLowerCase() === t.toLowerCase());
    if (exists) return;
    onChange([...value, t]);
  };

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (draft.trim()) {
        addTag(draft);
        setDraft("");
      }
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      removeAt(value.length - 1);
    }
  };

  const onBlur = () => {
    if (draft.trim()) {
      addTag(draft);
      setDraft("");
    }
  };

  const onChangeInput = (raw: string) => {
    if (raw.includes(",")) {
      const parts = raw.split(",");
      const last = parts.pop() ?? "";
      parts.forEach((p) => addTag(p));
      setDraft(last);
    } else {
      setDraft(raw);
    }
  };

  const full = value.length >= MAX_KEYWORDS;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background p-2 min-h-10">
        {value.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary border border-primary/30"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => removeAt(i)}
              className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-primary/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Input
          value={draft}
          onChange={(e) => onChangeInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={full ? `Max ${MAX_KEYWORDS} keywords` : placeholder}
          disabled={full}
          className="h-7 flex-1 min-w-[140px] border-0 bg-transparent p-0 px-1 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {value.length}/{MAX_KEYWORDS} — press Enter or comma to add
      </p>
    </div>
  );
}
