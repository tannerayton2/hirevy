// Link-preview page for bots (iMessage, Instagram, X, Slack, WhatsApp…).
// vercel.json sends only crawler user-agents here; people get the normal app.
//   /api/meta?path=v/XXXX-XX  → that coach's card title, description and image
//   /api/meta?path=proofcard  → the home page preview
import { loadPublicCard } from "./_card-data";

export const config = { runtime: "edge" };

const SITE = "https://aytopus.com";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function page(m: { url: string; title: string; description: string; image: string }) {
  const [u, t, d, i] = [m.url, m.title, m.description, m.image].map(esc);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${t}</title><meta name="description" content="${d}" /><link rel="canonical" href="${u}" />
<meta property="og:type" content="website" /><meta property="og:site_name" content="Aytopus" />
<meta property="og:url" content="${u}" /><meta property="og:title" content="${t}" /><meta property="og:description" content="${d}" />
<meta property="og:image" content="${i}" /><meta property="og:image:secure_url" content="${i}" />
<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" /><meta property="og:image:alt" content="${t}" />
<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" /><meta name="twitter:image" content="${i}" />
</head><body><p><a href="${u}">${t}</a></p></body></html>`;
}

export default async function handler(req: Request) {
  const path = (new URL(req.url).searchParams.get("path") ?? "").replace(/^\/+/, "");
  const parts = path.split("/").filter(Boolean);

  let meta = {
    url: `${SITE}/proofcard`,
    title: "Aytopus | Proof cards nobody can fake",
    description: "Coaches connect Stripe and get a card scored from how clients actually behave: retention, refunds and chargebacks. Free and read-only.",
    image: `${SITE}/api/og`,
  };

  if (parts[0] === "v" && parts[1]) {
    const slug = parts[1];
    const card = await loadPublicCard(slug);
    if (card) {
      const rated = card.status === "rated" && card.tier;
      const lead = rated ? `${card.tier} · ${card.score}` : card.status === "paused" ? "Paused" : "Building";
      const facts = card.stats.map((s) => `${s.value} ${s.label.toLowerCase()}`).join(" · ");
      meta = {
        url: `${SITE}/v/${encodeURIComponent(slug)}`,
        title: `${card.name} — ${lead} | Verified proof card`,
        description: `Scored from real payment data, not testimonials.${facts ? ` ${facts}.` : ""} Tap to see the live record.`,
        image: `${SITE}/api/og?slug=${encodeURIComponent(slug)}`,
      };
    }
  }

  return new Response(page(meta), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600, s-maxage=600" },
  });
}
