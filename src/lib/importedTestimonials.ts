export type ImportedMediaType = "photo" | "video";

export interface ImportedTestimonial {
  id: string;
  provider_user_id: string;
  caption: string;
  media_type: ImportedMediaType;
  photo_url: string | null;
  video_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const CAPTION_MAX = 200;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export function getVideoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video/${u.pathname.slice(1)}`;
    if (u.hostname.includes("loom.com")) return url.replace("/share/", "/embed/");
  } catch {
    return null;
  }
  return null;
}

export function isValidImportedVideoUrl(url: string): boolean {
  if (!url.trim()) return false;
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    const ok =
      h.includes("youtube.com") || h === "youtu.be" || h.includes("vimeo.com") || h.includes("loom.com");
    return ok && getVideoEmbedUrl(url) !== null;
  } catch {
    return false;
  }
}
