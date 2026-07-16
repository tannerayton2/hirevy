// Build crawler-friendly share URLs that route through the share-meta edge function.
// Crawlers receive proper per-page OG/Twitter tags; humans get a 302 redirect to
// the canonical SPA URL.
//
// We point share links at the Supabase Functions hostname directly because
// Lovable hosting can't rewrite arbitrary paths to edge functions at the CDN.
// The function 302s humans to the canonical aytopus.com URL anyway,
// so the address bar still ends up on the real page.

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
const FN_BASE = `https://${PROJECT_ID}.functions.supabase.co/share-meta`;

function enc(s: string) {
  return encodeURIComponent(s);
}

export function shareProfileUrl(username: string): string {
  return `${FN_BASE}/@${enc(username)}`;
}

export function shareOfferUrl(username: string, slug: string): string {
  return `${FN_BASE}/@${enc(username)}/${enc(slug)}`;
}

export function shareReviewUrl(username: string): string {
  return `${FN_BASE}/r/${enc(username)}`;
}
