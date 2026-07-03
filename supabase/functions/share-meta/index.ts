// Crawler-aware OG/share endpoint.
// URL form (path-based):  /functions/v1/share-meta/<the-rest>
//   e.g. /functions/v1/share-meta/@tannerayton
//        /functions/v1/share-meta/@tannerayton/my-coaching-package
//        /functions/v1/share-meta/r/tannerayton
//
// Behaviour:
//  - Crawler User-Agent  -> 200 HTML with full per-page OG tags
//  - Anyone else         -> 302 redirect to the canonical aytopus.lovable.app URL

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_ORIGIN = "https://aytopus.lovable.app";
const DEFAULT_IMAGE = `${SITE_ORIGIN}/og-default.png`;
const DEFAULT_TITLE = "Aytopus — Hire by proof, not promises";
const DEFAULT_DESCRIPTION =
  "Verified reviews for coaches, consultants, and service providers. Browse providers ranked by what their clients actually said.";

const CRAWLER_PATTERNS = [
  "twitterbot",
  "facebookexternalhit",
  "facebot",
  "slackbot",
  "linkedinbot",
  "whatsapp",
  "discordbot",
  "telegrambot",
  "skypeuripreview",
  "googlebot",
  "bingbot",
  "embedly",
  "pinterest",
  "redditbot",
  "applebot",
  "iframely",
  "vkshare",
  "w3c_validator",
];

function isCrawler(ua: string | null): boolean {
  if (!ua) return false;
  const u = ua.toLowerCase();
  return CRAWLER_PATTERNS.some((p) => u.includes(p));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function tierForReviewCount(c: number): string {
  if (c >= 100) return "Diamond";
  if (c >= 50) return "Platinum";
  if (c >= 25) return "Gold";
  if (c >= 10) return "Silver";
  if (c >= 1) return "Bronze";
  return "Unranked";
}

function truncate(s: string, n: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= n) return clean;
  return clean.slice(0, n - 1).trimEnd() + "…";
}

interface MetaPayload {
  url: string;
  title: string;
  description: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  type: "website" | "profile";
}

function renderHtml(m: MetaPayload): string {
  const t = escapeHtml(m.title);
  const d = escapeHtml(m.description);
  const u = escapeHtml(m.url);
  const i = escapeHtml(m.image);
  const isSquare = m.imageWidth === m.imageHeight;
  const twitterCard = isSquare ? "summary" : "summary_large_image";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${t}</title>
<meta name="description" content="${d}" />
<link rel="canonical" href="${u}" />

<meta property="og:type" content="${m.type}" />
<meta property="og:site_name" content="Aytopus" />
<meta property="og:url" content="${u}" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:image" content="${i}" />
<meta property="og:image:secure_url" content="${i}" />
<meta property="og:image:width" content="${m.imageWidth}" />
<meta property="og:image:height" content="${m.imageHeight}" />
<meta property="og:image:alt" content="${t}" />

<meta name="twitter:card" content="${twitterCard}" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${i}" />

<meta http-equiv="refresh" content="0; url=${u}" />
</head>
<body>
<p><a href="${u}">${t}</a></p>
</body>
</html>`;
}

// og:image dimensions. Avatars are served through Supabase's image-transform
// render endpoint at a fixed 600x600 JPEG so crawlers get a small, predictable,
// definitely-decodable image. The branded default is 1200x630.
const AVATAR_DIM = 600;
const DEFAULT_IMG_W = 1200;
const DEFAULT_IMG_H = 630;

// Rewrites a public Supabase storage URL to the on-the-fly image-render URL,
// which returns a freshly transcoded JPEG. Returns null if the URL isn't a
// Supabase public storage URL we recognize.
function toRenderedAvatar(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    // Expected path: /storage/v1/object/public/<bucket>/<rest>
    const marker = "/storage/v1/object/public/";
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    const rest = u.pathname.slice(idx + marker.length);
    const rendered = `${u.origin}/storage/v1/render/image/public/${rest}` +
      `?width=${AVATAR_DIM}&height=${AVATAR_DIM}&resize=cover&quality=80`;
    return rendered;
  } catch {
    return null;
  }
}

function imageFor(avatarUrl: string | null | undefined): { image: string; imageWidth: number; imageHeight: number } {
  if (avatarUrl && /^https?:\/\//i.test(avatarUrl)) {
    const rendered = toRenderedAvatar(avatarUrl);
    if (rendered) {
      return { image: rendered, imageWidth: AVATAR_DIM, imageHeight: AVATAR_DIM };
    }
    // Not a Supabase storage URL — pass through as-is; we still know it's absolute.
    return { image: avatarUrl, imageWidth: AVATAR_DIM, imageHeight: AVATAR_DIM };
  }
  return { image: DEFAULT_IMAGE, imageWidth: DEFAULT_IMG_W, imageHeight: DEFAULT_IMG_H };
}

function metaResponse(m: MetaPayload): Response {
  const headers = new Headers();
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=0, s-maxage=300");
  headers.set("X-Robots-Tag", "noindex");
  return new Response(renderHtml(m), { status: 200, headers });
}

function redirectResponse(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "no-store",
    },
  });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  review_count: number;
  rating_sum: number;
}
interface OfferRow {
  title: string;
  description: string | null;
  cover_url: string | null;
}

async function buildProfileMeta(usernameRaw: string, canonical: string): Promise<MetaPayload> {
  const username = usernameRaw.replace(/^@/, "");
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, review_count, rating_sum")
    .eq("username", username)
    .maybeSingle<ProfileRow>();

  if (!data) {
    return {
      url: canonical,
      title: `@${username} on Aytopus`,
      description: DEFAULT_DESCRIPTION,
      ...imageFor(null),
      type: "profile",
    };
  }
  const name = data.display_name?.trim() || `@${data.username}`;
  const tier = tierForReviewCount(data.review_count);
  const avg = data.review_count > 0 ? data.rating_sum / data.review_count : 0;
  const description = data.review_count > 0
    ? `${tier} tier · ${data.review_count} verified review${data.review_count === 1 ? "" : "s"} · ${avg.toFixed(1)} stars`
    : "Verified reviews on Aytopus";

  return {
    url: canonical,
    title: `${name} on Aytopus`,
    description,
    ...imageFor(data.avatar_url),
    type: "profile",
  };
}

async function buildOfferMeta(usernameRaw: string, slug: string, canonical: string): Promise<MetaPayload> {
  const username = usernameRaw.replace(/^@/, "");
  const { data: prof } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .maybeSingle<{ id: string; username: string; display_name: string | null }>();
  if (!prof) {
    return {
      url: canonical,
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      ...imageFor(null),
      type: "website",
    };
  }
  const { data: offer } = await supabase
    .from("offers")
    .select("title, description, cover_url")
    .eq("provider_id", prof.id)
    .eq("slug", slug)
    .maybeSingle<OfferRow>();
  if (!offer) {
    return {
      url: canonical,
      title: `Offer on Aytopus`,
      description: DEFAULT_DESCRIPTION,
      ...imageFor(null),
      type: "website",
    };
  }
  const name = prof.display_name?.trim() || `@${prof.username}`;
  // offer covers are landscape; if present use default dims, else fall back to branded image
  const cover = offer.cover_url && /^https?:\/\//i.test(offer.cover_url)
    ? { image: offer.cover_url, imageWidth: DEFAULT_IMG_W, imageHeight: DEFAULT_IMG_H }
    : imageFor(null);
  return {
    url: canonical,
    title: `${offer.title} — by ${name} on Aytopus`,
    description: truncate(offer.description ?? "", 160) || DEFAULT_DESCRIPTION,
    ...cover,
    type: "website",
  };
}

async function buildReviewMeta(usernameRaw: string, canonical: string): Promise<MetaPayload> {
  const username = usernameRaw.replace(/^@/, "");
  const { data } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url")
    .eq("username", username)
    .maybeSingle<{ display_name: string | null; username: string; avatar_url: string | null }>();
  const name = data?.display_name?.trim() || (data ? `@${data.username}` : `@${username}`);
  return {
    url: canonical,
    title: `Review ${name} on Aytopus`,
    description: `Leave an honest, verified review for ${name}. Reviews are public; emails stay private.`,
    ...imageFor(data?.avatar_url),
    type: "website",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  const url = new URL(req.url);
  // Strip the function-name prefix to get the "rest" path.
  // Supports both "/share-meta/..." and "/functions/v1/share-meta/..."
  let rest = url.pathname;
  rest = rest.replace(/^\/+/, "");
  rest = rest.replace(/^functions\/v1\//, "");
  rest = rest.replace(/^share-meta\/?/, "");
  // Allow ?p= override (handy for clients that can't easily build path-based URLs)
  const pOverride = url.searchParams.get("p");
  if (pOverride) rest = pOverride.replace(/^\/+/, "");

  // Default site-wide payload
  let canonical = `${SITE_ORIGIN}/`;
  let payload: MetaPayload = {
    url: canonical,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    ...imageFor(null),
    type: "website",
  };

  try {
    if (rest) {
      const segments = rest.split("/").filter(Boolean).map(decodeURIComponent);

      // /r/:username
      if (segments[0] === "r" && segments[1]) {
        canonical = `${SITE_ORIGIN}/r/${encodeURIComponent(segments[1])}`;
        payload = await buildReviewMeta(segments[1], canonical);
      }
      // /@:username  or /@:username/:slug
      else if (segments[0]?.startsWith("@")) {
        const username = segments[0];
        if (segments[1]) {
          canonical = `${SITE_ORIGIN}/${encodeURIComponent(username)}/${encodeURIComponent(segments[1])}`;
          payload = await buildOfferMeta(username, segments[1], canonical);
        } else {
          canonical = `${SITE_ORIGIN}/${encodeURIComponent(username)}`;
          payload = await buildProfileMeta(username, canonical);
        }
      }
      // bare username fallback (no @): /:username, /:username/:slug
      else if (segments[0]) {
        const username = segments[0];
        if (segments[1]) {
          canonical = `${SITE_ORIGIN}/@${encodeURIComponent(username)}/${encodeURIComponent(segments[1])}`;
          payload = await buildOfferMeta(username, segments[1], canonical);
        } else {
          canonical = `${SITE_ORIGIN}/@${encodeURIComponent(username)}`;
          payload = await buildProfileMeta(username, canonical);
        }
      }
    }
  } catch (e) {
    console.error("share-meta error:", e);
    // fall through with defaults
  }

  const ua = req.headers.get("user-agent");
  if (isCrawler(ua)) {
    return metaResponse(payload);
  }
  return redirectResponse(canonical);
});
