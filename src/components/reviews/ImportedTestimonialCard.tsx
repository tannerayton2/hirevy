import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { getVideoEmbedUrl, type ImportedTestimonial } from "@/lib/importedTestimonials";

const BUCKET = "imported-testimonial-sources";
function getPhotoPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

interface Props {
  t: ImportedTestimonial;
  isOwner?: boolean;
  onEdit?: (t: ImportedTestimonial) => void;
  onDelete?: (t: ImportedTestimonial) => void;
}

export function ImportedTestimonialCard({ t, isOwner, onEdit, onDelete }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const photoUrl = t.photo_url ? getPhotoPublicUrl(t.photo_url) : null;

  return (
    <article className="group relative overflow-hidden rounded-md border border-border/60 bg-[hsl(220_8%_14%)]/60">
      {isOwner && (
        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 w-7 p-0 backdrop-blur"
            onClick={() => onEdit?.(t)}
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 w-7 p-0 text-destructive backdrop-blur hover:text-destructive"
            onClick={() => onDelete?.(t)}
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {t.media_type === "photo" && photoUrl && (
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block w-full overflow-hidden bg-muted/30 transition-opacity hover:opacity-95"
          aria-label="Open full size"
        >
          <img src={photoUrl} alt="" loading="lazy" className="block max-h-[420px] w-full object-cover" />
        </button>
      )}
      {t.media_type === "video" && t.video_url && <VideoEmbed url={t.video_url} />}

      <div className="px-4 py-3">
        <p className="text-[14px] leading-relaxed text-foreground/85">{t.caption}</p>
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl">
          {photoUrl && (
            <img src={photoUrl} alt="Imported testimonial" className="mx-auto max-h-[80vh] w-auto rounded" />
          )}
        </DialogContent>
      </Dialog>
    </article>
  );
}

function VideoEmbed({ url }: { url: string }) {
  const embed = getVideoEmbedUrl(url);
  if (!embed) return null;
  return (
    <div className="aspect-video w-full bg-black">
      <iframe
        src={embed}
        title="Imported video testimonial"
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
