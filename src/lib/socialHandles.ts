export type SocialPlatform = "instagram" | "twitter" | "tiktok";

export function ensureHttps(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/**
 * Convert handle-or-URL input to a full URL for handle-friendly platforms.
 * Accepts: "@handle", "handle", "instagram.com/handle", "https://instagram.com/handle".
 */
export function normalizeSocialHandle(platform: SocialPlatform, raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  // looks like a domain (contains a dot and a slash, or starts with known host)
  if (/^(www\.)?(instagram\.com|x\.com|twitter\.com|tiktok\.com)\b/i.test(t)) {
    return `https://${t.replace(/^www\./i, "")}`;
  }
  const handle = t.replace(/^@+/, "").trim();
  if (!handle) return t;
  switch (platform) {
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "twitter":
      return `https://x.com/${handle}`;
    case "tiktok":
      return `https://tiktok.com/@${handle}`;
  }
}
