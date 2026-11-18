// GET /api/og            → generic "Proof nobody can fake." preview image
// GET /api/og?slug=XXXX  → preview image of that coach's proof card
// Runs on Vercel Edge. Reads only public card data.
import { ImageResponse } from "@vercel/og";
import { cardImage, type CardImageData } from "./_card-image";
import { loadPublicCard } from "./_card-data";

export const config = { runtime: "edge" };

async function font(url: string) {
  try {
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function handler(req: Request) {
  const params = new URL(req.url).searchParams;
  const slug = params.get("slug");
  const download = params.get("dl") === "1";
  let data: CardImageData | null = null;
  if (slug) data = await loadPublicCard(slug);

  const [semibold, bold, mono] = await Promise.all([
    font("https://cdn.jsdelivr.net/fontsource/fonts/inter-tight@latest/latin-600-normal.woff"),
    font("https://cdn.jsdelivr.net/fontsource/fonts/inter-tight@latest/latin-700-normal.woff"),
    font("https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-500-normal.woff"),
  ]);
  const fonts = [
    semibold && { name: "Inter Tight", data: semibold, weight: 600 as const, style: "normal" as const },
    bold && { name: "Inter Tight", data: bold, weight: 700 as const, style: "normal" as const },
    mono && { name: "JetBrains Mono", data: mono, weight: 500 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 600 | 700 | 500; style: "normal" }[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new ImageResponse(cardImage(data) as any, {
    width: 1200,
    height: 630,
    fonts,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      ...(download ? { "Content-Disposition": 'attachment; filename="aytopus-proof-card.png"' } : {}),
    },
  });
}
