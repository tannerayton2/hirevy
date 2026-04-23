import { useState } from "react";
import type { ImportedTestimonial } from "@/lib/importedTestimonials";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Image as ImageIcon } from "lucide-react";

export function ImportedTestimonialCard({ t }: { t: ImportedTestimonial }) {
  const [open, setOpen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const openLightbox = async () => {
    if (!t.source_screenshot_url) return;
    // The stored value is the storage path (e.g. "<uid>/file.jpg")
    const { data } = await supabase.storage
      .from("imported-testimonial-sources")
      .createSignedUrl(t.source_screenshot_url, 60 * 10);
    setSignedUrl(data?.signedUrl ?? null);
    setOpen(true);
  };

  return (
    <article className="rounded-md border border-border/60 bg-muted/30 px-4 py-3">
      <p className="whitespace-pre-line text-[14px] leading-relaxed text-foreground/85">
        {t.testimonial_text}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground/80">
          <span className="font-medium text-muted-foreground">{t.reviewer_name}</span>
          <span className="mx-1.5 text-muted-foreground/50">—</span>
          <span className="italic">from {t.source_label}, {t.date_label}</span>
        </p>
        {t.source_screenshot_url && (
          <button
            type="button"
            onClick={openLightbox}
            className="inline-flex items-center gap-1 rounded border border-border/60 bg-background/40 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ImageIcon className="h-3 w-3" /> View source
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          {signedUrl ? (
            <img src={signedUrl} alt="Source screenshot" className="mx-auto max-h-[80vh] w-auto rounded" />
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </DialogContent>
      </Dialog>
    </article>
  );
}
