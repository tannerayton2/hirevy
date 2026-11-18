// Builds the 1200×630 link-preview image for a proof card (or the generic one).
// Shared by api/og.ts (Vercel Edge) and the local preview script. Uses plain
// { type, props } objects instead of JSX so no React/JSX build setup is needed.

type Node = { type: string; props: Record<string, unknown> };
type Child = Node | string | null | false;

export function h(type: string, style: Record<string, unknown>, ...children: Child[]): Node {
  const kids = children.filter((c) => c !== null && c !== false) as (Node | string)[];
  return { type, props: { style: { display: "flex", ...style }, children: kids.length === 1 ? kids[0] : kids } };
}
function img(src: string, width: number, height: number, style: Record<string, unknown> = {}): Node {
  return { type: "img", props: { src, width, height, style } };
}

const BG = "#0A0A0B";
const INK = "#F5F1E6";
const MUTED = "#8F8A7E";
const GOLD = "#EDC967";
const MINT = "#5BE3A4";
const MONO = "JetBrains Mono";
const SANS = "Inter Tight";

function ring(R: number, a: number, k: number, ph: number, n = 120) {
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (2 * Math.PI * i) / n;
    const r = R + a * Math.sin(k * t + ph);
    pts.push(`${(75 + r * Math.cos(t)).toFixed(1)} ${(75 + r * Math.sin(t)).toFixed(1)}`);
  }
  return `M${pts.join(" L")}Z`;
}
const SEAL_PATHS = [
  ...Array.from({ length: 6 }, (_, i) => ring(54, 9, 12, (i * Math.PI) / 6)),
  ...Array.from({ length: 3 }, (_, i) => ring(69, 2.2, 36, (i * Math.PI) / 3, 240)),
];

function svgUri(svg: string) {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
function sealSvg(color: string, fill: string, width = 0.7) {
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150"><g fill="none" stroke="${color}" stroke-width="${width}">${SEAL_PATHS.map((d) => `<path d="${d}"/>`).join("")}<circle cx="75" cy="75" r="73.5" stroke-width="1.2"/></g><circle cx="75" cy="75" r="40" fill="${fill}" stroke="${color}" stroke-width="1"/></svg>`,
  );
}
function octopusSvg(color: string) {
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="none" stroke="${color}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"><path d="M31 53 C31 31 40 19 50 19 C60 19 69 31 69 53"/><path d="M31 53 C25 59 18 59 15.5 53.5 C13.5 49 17.5 45.5 21 48.5"/><path d="M37.5 55 C34 65 28 71 23.5 73 C19.5 74.5 17.5 70.5 20.5 68.5"/><path d="M45 56 C44 67 42 77 38 83 C36 86 32.5 84 34.5 80.5"/><path d="M55 56 C56 67 58 77 62 83 C64 86 67.5 84 65.5 80.5"/><path d="M62.5 55 C66 65 72 71 76.5 73 C80.5 74.5 82.5 70.5 79.5 68.5"/><path d="M69 53 C75 59 82 59 84.5 53.5 C86.5 49 82.5 45.5 79 48.5"/></g><circle cx="43.5" cy="44" r="2.8" fill="${color}"/><circle cx="56.5" cy="44" r="2.8" fill="${color}"/></svg>`,
  );
}

export type CardImageData = {
  name: string;
  subtitle?: string | null;
  tier: string | null;
  score: number | null;
  status: "rated" | "building" | "paused";
  stats: { value: string; label: string }[];
};

function wordmark(size = 20) {
  return h(
    "div",
    { alignItems: "center", gap: 12 },
    img(octopusSvg(GOLD), size * 1.7, size * 1.7),
    h("div", { fontFamily: SANS, fontWeight: 700, fontSize: size, letterSpacing: size * 0.34, color: INK }, "AYTOPUS"),
  );
}

function card(d: CardImageData) {
  const rated = d.status === "rated" && d.tier;
  const chip = d.status === "paused" ? ["PAUSED", GOLD] : d.status === "building" ? ["BUILDING", MUTED] : ["LIVE", MINT];
  const live = chip[0] === "LIVE";
  return h(
    "div",
    {
      width: 560,
      height: 350,
      borderRadius: 28,
      background: "linear-gradient(140deg, #1A1A1D 0%, #0C0C0E 60%)",
      border: "1px solid rgba(245,241,230,0.14)",
      boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
      padding: "28px 32px",
      flexDirection: "column",
      justifyContent: "space-between",
      position: "relative",
      overflow: "hidden",
    },
    img(sealSvg(GOLD, "transparent", 0.5), 380, 380, { position: "absolute", right: -120, bottom: -150, opacity: 0.08 }),
    h(
      "div",
      { justifyContent: "space-between", alignItems: "center" },
      h("div", { fontFamily: SANS, fontWeight: 700, fontSize: 15, letterSpacing: 5, color: INK }, "AYTOPUS"),
      h(
        "div",
        { alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 13, letterSpacing: 2, color: chip[1], border: `1px solid ${chip[1]}66`, borderRadius: 999, padding: "6px 14px" },
        live ? h("div", { width: 8, height: 8, borderRadius: 999, background: MINT }) : null,
        chip[0],
      ),
    ),
    h(
      "div",
      { justifyContent: "space-between", alignItems: "center" },
      h(
        "div",
        { flexDirection: "column", maxWidth: 340 },
        h("div", { fontFamily: MONO, fontSize: 13, letterSpacing: 3, color: rated ? MINT : MUTED }, rated ? `${d.tier!.toUpperCase()} TIER` : "GATHERING DATA"),
        h("div", { fontFamily: SANS, fontWeight: 600, fontSize: 40, color: INK, letterSpacing: -1, marginTop: 6, lineHeight: 1.05 }, d.name),
        d.subtitle ? h("div", { fontFamily: SANS, fontSize: 18, color: "#C9CCC8", marginTop: 6 }, d.subtitle) : null,
      ),
      h(
        "div",
        { width: 128, height: 128, position: "relative", alignItems: "center", justifyContent: "center" },
        img(sealSvg(MINT, "#0C0C0E"), 128, 128, { position: "absolute", left: 0, top: 0 }),
        h(
          "div",
          { flexDirection: "column", alignItems: "center" },
          h("div", { fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: MUTED }, "SCORE"),
          h("div", { fontFamily: SANS, fontWeight: 700, fontSize: 32, color: INK, lineHeight: 1 }, rated ? String(d.score) : "—"),
        ),
      ),
    ),
    h(
      "div",
      { borderTop: "1px solid rgba(245,241,230,0.14)", paddingTop: 16, gap: 40 },
      ...(d.stats.length
        ? d.stats.slice(0, 3).map((s) =>
            h(
              "div",
              { flexDirection: "column" },
              h("div", { fontFamily: SANS, fontWeight: 600, fontSize: 26, color: INK }, s.value),
              h("div", { fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: MUTED, marginTop: 2 }, s.label.toUpperCase()),
            ),
          )
        : [h("div", { fontFamily: MONO, fontSize: 13, color: MUTED }, "Scored from real payment data")]),
    ),
  );
}

/** The whole 1200×630 image. With no card data, it's the generic "Proof nobody can fake." preview. */
export function cardImage(d: CardImageData | null): Node {
  const left = d
    ? h(
        "div",
        { flexDirection: "column", width: 470 },
        wordmark(18),
        h("div", { fontFamily: MONO, fontSize: 15, letterSpacing: 4, color: GOLD, marginTop: 70 }, "VERIFIED PROOF CARD"),
        h("div", { fontFamily: SANS, fontWeight: 600, fontSize: 52, color: INK, letterSpacing: -2, marginTop: 14, lineHeight: 1.05 }, "Scored from real payment data."),
        h("div", { fontFamily: SANS, fontSize: 22, color: MUTED, marginTop: 18, lineHeight: 1.35 }, "Not testimonials. Not screenshots. Tap to see the live record."),
      )
    : h(
        "div",
        { flexDirection: "column", width: 500 },
        wordmark(18),
        h("div", { fontFamily: MONO, fontSize: 15, letterSpacing: 4, color: GOLD, marginTop: 70 }, "PAYMENT-VERIFIED PROOF CARDS"),
        h("div", { fontFamily: SANS, fontWeight: 600, fontSize: 72, color: INK, letterSpacing: -3, marginTop: 14, lineHeight: 1 }, "Proof nobody can fake."),
        h("div", { fontFamily: SANS, fontSize: 22, color: MUTED, marginTop: 22, lineHeight: 1.35 }, "Coaches connect Stripe. Clients' real behavior becomes a score."),
      );

  const sample: CardImageData = d ?? {
    name: "Marcus Hale",
    subtitle: "Sample card",
    tier: "Platinum",
    score: 812,
    status: "rated",
    stats: [
      { value: "214", label: "Clients" },
      { value: "68%", label: "Renew 90d" },
      { value: "1.9%", label: "Refunded" },
    ],
  };

  return h(
    "div",
    {
      width: 1200,
      height: 630,
      background: `radial-gradient(ellipse 70% 60% at 75% 0%, #2A2212 0%, ${BG} 60%)`,
      padding: "64px 70px",
      alignItems: "center",
      justifyContent: "space-between",
      position: "relative",
    },
    left,
    h("div", { transform: "rotate(-4deg)" }, card(sample)),
  );
}
