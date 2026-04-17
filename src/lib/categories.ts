export const CATEGORIES = [
  "Coaching",
  "Consulting",
  "Design",
  "Development",
  "Writing",
  "Marketing",
  "Video/Photo",
  "Local Services",
  "Done-For-You",
  "Tutoring",
  "Fitness",
  "Wellness",
  "Legal",
  "Finance",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "offer";
}

export function isValidVideoUrl(url: string): boolean {
  if (!url.trim()) return true;
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    return (
      h.includes("youtube.com") ||
      h === "youtu.be" ||
      h.includes("vimeo.com") ||
      h.includes("loom.com")
    );
  } catch {
    return false;
  }
}
