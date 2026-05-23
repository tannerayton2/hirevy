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

/** Extract a bare Instagram handle from a stored URL or handle string. */
export function extractInstagramHandle(input: string): string {
  const t = (input || "").trim();
  if (!t) return "";
  const stripped = t
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
  return stripped.replace(/^@+/, "");
}

/**
 * Open a social URL in a new tab with proper rel attributes (fixes Safari COOP error).
 * For Instagram, attempts the native app deep link first and falls back to the web URL.
 */
export function openSocialLink(rawUrl: string, platform?: "instagram"): void {
  const url = ensureHttps(rawUrl);
  if (!url) return;
  if (platform === "instagram") {
    const handle = extractInstagramHandle(rawUrl);
    if (handle) {
      const webUrl = `https://www.instagram.com/${handle}`;
      const deepLink = `instagram://user?username=${handle}`;
      const fallback = window.setTimeout(() => {
        window.open(webUrl, "_blank", "noopener,noreferrer");
      }, 600);
      const onHide = () => {
        window.clearTimeout(fallback);
        document.removeEventListener("visibilitychange", onHide);
      };
      document.addEventListener("visibilitychange", onHide);
      window.location.href = deepLink;
      return;
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
