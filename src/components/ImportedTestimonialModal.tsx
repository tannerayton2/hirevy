import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";
import {
  CAPTION_MAX,
  PHOTO_MAX_BYTES,
  getVideoEmbedUrl,
  isValidImportedVideoUrl,
  type ImportedMediaType,
  type ImportedTestimonial,
} from "@/lib/importedTestimonials";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  initial: ImportedTestimonial | null;
  onSaved: () => void | Promise<void>;
}

export function ImportedTestimonialModal({ open, onOpenChange, providerId, initial, onSaved }: Props) {
  const [mediaType, setMediaType] = useState<ImportedMediaType>("photo");
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setMediaType(initial.media_type);
      setCaption(initial.caption);
      setVideoUrl(initial.video_url ?? "");
      setExistingPhotoPath(initial.photo_url);
    } else {
      setMediaType("photo");
      setCaption("");
      setVideoUrl("");
      setExistingPhotoPath(null);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
  }, [open, initial]);

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Image only.", variant: "destructive" });
      return;
    }
    if (f.size > PHOTO_MAX_BYTES) {
      toast({ title: "Too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setExistingPhotoPath(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCaption = caption.trim();
    if (!trimmedCaption) {
      toast({ title: "Caption required", variant: "destructive" });
      return;
    }
    if (trimmedCaption.length > CAPTION_MAX) {
      toast({ title: "Caption too long", variant: "destructive" });
      return;
    }

    if (mediaType === "photo") {
      if (!photoFile && !existingPhotoPath) {
        toast({ title: "Photo required", variant: "destructive" });
        return;
      }
    } else {
      if (!isValidImportedVideoUrl(videoUrl.trim())) {
        toast({
          title: "Invalid video URL",
          description: "Use a YouTube, Vimeo, or Loom link.",
          variant: "destructive",
        });
        return;
      }
    }

    setBusy(true);
    try {
      let photoPath: string | null = mediaType === "photo" ? existingPhotoPath : null;

      if (mediaType === "photo" && photoFile) {
        const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${providerId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("imported-testimonial-sources")
          .upload(path, photoFile, { upsert: false, contentType: photoFile.type });
        if (upErr) throw upErr;
        photoPath = path;
      }

      const payload = {
        provider_user_id: providerId,
        caption: trimmedCaption,
        media_type: mediaType,
        photo_url: mediaType === "photo" ? photoPath : null,
        video_url: mediaType === "video" ? videoUrl.trim() : null,
      };

      if (initial) {
        const { error } = await supabase
          .from("imported_testimonials")
          .update(payload)
          .eq("id", initial.id);
        if (error) throw error;
        toast({ title: "Updated" });
      } else {
        const { error } = await supabase.from("imported_testimonials").insert(payload);
        if (error) throw error;
        toast({ title: "Added" });
      }
      await onSaved();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Couldn't save", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const showExistingPhoto = mediaType === "photo" && existingPhotoPath && !photoPreview;
  const videoEmbed = mediaType === "video" && isValidImportedVideoUrl(videoUrl) ? getVideoEmbedUrl(videoUrl) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {initial ? "Edit imported testimonial" : "Add imported testimonial"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {/* Media type toggle */}
          <div>
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Media type</Label>
            <div className="mt-2 inline-flex rounded-md border border-border bg-background/40 p-0.5">
              <button
                type="button"
                onClick={() => setMediaType("photo")}
                className={[
                  "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                  mediaType === "photo" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                Photo
              </button>
              <button
                type="button"
                onClick={() => setMediaType("video")}
                className={[
                  "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                  mediaType === "video" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                Video link
              </button>
            </div>
          </div>

          {/* Photo input */}
          {mediaType === "photo" && (
            <div>
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Image</Label>
              <div className="mt-2 space-y-2">
                <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                    <Upload className="mr-1 h-3.5 w-3.5" />
                    {photoPreview || existingPhotoPath ? "Replace image" : "Upload image"}
                  </Button>
                  {(photoPreview || existingPhotoPath) && (
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" /> Remove
                    </button>
                  )}
                </div>
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" className="max-h-64 w-full rounded border border-border object-contain" />
                )}
                {showExistingPhoto && (
                  <p className="text-[11px] italic text-muted-foreground">Existing image attached. Upload a new one to replace it.</p>
                )}
                <p className="text-[10px] text-muted-foreground">Max 5MB. JPG, PNG, or WebP.</p>
              </div>
            </div>
          )}

          {/* Video input */}
          {mediaType === "video" && (
            <div>
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Video URL</Label>
              <Input
                className="mt-1"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=… (YouTube, Vimeo, or Loom)"
              />
              {videoEmbed && (
                <div className="mt-2 aspect-video w-full overflow-hidden rounded border border-border bg-black">
                  <iframe
                    src={videoEmbed}
                    title="Preview"
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          )}

          {/* Caption */}
          <div>
            <div className="flex items-baseline justify-between">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Caption</Label>
              <span className="text-[10px] text-muted-foreground">{caption.length}/{CAPTION_MAX}</span>
            </div>
            <Textarea
              className="mt-1"
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))}
              maxLength={CAPTION_MAX}
              rows={3}
              placeholder="Write a short line of context (e.g., '2024 webinar client — $50k launch result')"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : initial ? "Save changes" : "Add testimonial"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
