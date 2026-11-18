// The payment-verified proof card: a dark "credential" card that tilts in 3D and opens
// into the full record. Design matches the "Aytopus Proof Cards" canvas, direction A.
import { useState, type MouseEvent } from "react";
import type { Band, ProofCard } from "@/lib/proofScore";
import { TIERS, pointsToNextTier, timeAgo, visibleStats } from "@/lib/proofScore";

const INK = "#F2F1EC";
const MUTED = "#8C948F";
const ACCENT = "#5BE3A4"; // live/verified signal stays mint everywhere
const CARD_BG = "#0C0E0D";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

// Fine-line guilloche rosette, the security-print pattern used on banknotes.
function ring(R: number, a: number, k: number, ph: number, n = 120) {
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (2 * Math.PI * i) / n;
    const r = R + a * Math.sin(k * t + ph);
    pts.push(`${(75 + r * Math.cos(t)).toFixed(1)} ${(75 + r * Math.sin(t)).toFixed(1)}`);
  }
  return `M${pts.join(" L")}Z`;
}
export const SEAL_PATHS = [
  ...Array.from({ length: 6 }, (_, i) => ring(54, 9, 12, (i * Math.PI) / 6)),
  ...Array.from({ length: 3 }, (_, i) => ring(69, 2.2, 36, (i * Math.PI) / 3, 240)),
];

function Seal({ size, fill, children }: { size: number; fill: string; children?: React.ReactNode }) {
  return (
    <div style={{ position: "relative", width: size, height: size, color: ACCENT, flex: "none" }}>
      <svg viewBox="0 0 150 150" width={size} height={size} aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth={0.6}>
          {SEAL_PATHS.map((d, i) => (
            <path key={i} d={d} />
          ))}
          <circle cx="75" cy="75" r="73.5" strokeWidth={1} />
        </g>
        <circle cx="75" cy="75" r="39.5" fill={fill} stroke="currentColor" strokeWidth={0.8} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

function statusChip(card: ProofCard) {
  if (card.public_stats?.testData) return { text: "TEST DATA", color: "#E8C872" };
  if (card.status === "paused") return { text: "PAUSED", color: "#E8C872" };
  if (card.status === "building") return { text: "BUILDING", color: MUTED };
  return { text: "● LIVE", color: ACCENT };
}

export function ProofScoreCard({
  card,
  name,
  subtitle,
  open,
  onToggle,
  className,
  hoverGrow = false,
}: {
  card: ProofCard;
  name: string;
  subtitle?: string | null;
  open?: boolean;
  onToggle?: () => void;
  /** Overrides the card's width, e.g. "max-w-[500px]". */
  className?: string;
  /** Grow when hovered (desktop). */
  hoverGrow?: boolean;
}) {
  const [tilt, setTilt] = useState({ rx: 6, ry: -9, gx: 30, gy: 20 });
  const [hovered, setHovered] = useState(false);
  const rest = () => {
    setTilt({ rx: 6, ry: -9, gx: 30, gy: 20 });
    setHovered(false);
  };
  const move = (e: MouseEvent<HTMLButtonElement>) => {
    if (open) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({ ry: Math.round((px - 0.5) * 24), rx: Math.round((0.5 - py) * 18), gx: Math.round(px * 100), gy: Math.round(py * 100) });
    if (!hovered) setHovered(true);
  };
  const rx = open ? 0 : tilt.rx;
  const ry = open ? 0 : tilt.ry;
  const grow = hoverGrow && hovered && !open ? 1.14 : 1;
  const chip = statusChip(card);
  const stats = visibleStats(card).slice(0, 3);
  const rated = card.status === "rated" && card.tier;

  return (
    <div style={{ perspective: 1000 }} className={className ?? "w-full max-w-[400px]"}>
      <button
        type="button"
        onClick={onToggle}
        onMouseMove={move}
        onMouseLeave={rest}
        aria-label={open ? "Close the full record" : "Open the full record"}
        aria-expanded={open}
        className="relative block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{
          aspectRatio: "1.6 / 1",
          borderRadius: 20,
          transform: `rotateX(${rx}deg) rotateY(${ry}deg) scale(${grow})`,
          transition: "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          position: "relative",
          zIndex: grow > 1 ? 20 : undefined,
          boxShadow:
            "0 1px 0 #1d2120, 0 2px 0 #181b1a, 0 3px 0 #131615, 0 4px 0 #0f1110, 0 22px 44px rgba(0,0,0,0.45)",
          cursor: onToggle ? "pointer" : "default",
        }}
      >
        <div
          style={{ position: "absolute", inset: 0, borderRadius: 20, overflow: "hidden", background: CARD_BG, color: INK, padding: "5% 6%" }}
          className="flex flex-col justify-between"
        >
          <div aria-hidden="true" style={{ position: "absolute", right: "-22%", bottom: "-45%", width: "85%", opacity: 0.06, color: INK }}>
            <svg viewBox="0 0 150 150" width="100%">
              <g fill="none" stroke="currentColor" strokeWidth={0.6}>
                {SEAL_PATHS.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>
            </svg>
          </div>

          <div className="relative flex items-center justify-between">
            <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.32em" }}>AYTOPUS</span>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: chip.color, padding: "4px 9px", border: `1px solid ${chip.color}55`, borderRadius: 999 }}>
              {chip.text}
            </span>
          </div>

          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: rated ? ACCENT : MUTED }}>
                {rated ? `${card.tier!.toUpperCase()} TIER` : card.status === "paused" ? "NOT CURRENTLY VERIFIED" : "GATHERING DATA"}
              </p>
              <p className="truncate" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 4 }}>
                {name}
              </p>
              {subtitle && <p className="truncate" style={{ fontSize: 13, color: "#C9CCC8", marginTop: 3 }}>{subtitle}</p>}
            </div>
            <Seal size={82} fill={CARD_BG}>
              <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: "0.2em", color: MUTED }}>SCORE</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: INK, lineHeight: 1.1 }}>{rated ? card.score : "—"}</span>
            </Seal>
          </div>

          <div className="relative grid grid-cols-3" style={{ borderTop: "1px solid rgba(242,241,236,0.14)", paddingTop: 10 }}>
            {stats.length ? (
              stats.map((s) => (
                <span key={s.key} className="flex flex-col gap-0.5">
                  <span style={{ fontSize: 17, fontWeight: 600 }}>{s.value}</span>
                  <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.12em", color: MUTED, textTransform: "uppercase" }}>{s.label}</span>
                </span>
              ))
            ) : (
              <span className="col-span-3" style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>
                No. {card.record_no} · updated {timeAgo(card.synced_at)}
              </span>
            )}
          </div>
        </div>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 20,
            pointerEvents: "none",
            background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,${open ? 0.04 : 0.13}), rgba(255,255,255,0) 55%)`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16)",
          }}
        />
      </button>
    </div>
  );
}

const BAND_COLOR: Record<Band, string> = {
  Excellent: "text-emerald-500",
  Strong: "text-foreground",
  Fair: "text-amber-500",
  Weak: "text-orange-500",
  Poor: "text-destructive",
  Building: "text-muted-foreground",
};

/** The full record shown under the card once it's opened. */
export function ProofCardDetails({ card }: { card: ProofCard }) {
  const next = pointsToNextTier(card.status === "rated" ? card.score : null);
  const tierIndex = card.tier ? TIERS.findIndex((t) => t.tier === card.tier) : -1;

  return (
    <div className="space-y-8">
      {card.paid_through && (
        <section className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-card px-4 py-3.5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Payments go to</p>
            <p className="mt-0.5 truncate text-[15px] font-semibold">{card.paid_through}</p>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-500/30 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-emerald-500">
            From Stripe
          </span>
        </section>
      )}
      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tier</p>
        <div className="mt-3 grid grid-cols-5 gap-1">
          {TIERS.map((t, i) => (
            <div key={t.tier} className={`h-2 rounded-full ${i === tierIndex ? "bg-emerald-500" : i < tierIndex ? "bg-foreground/25" : "bg-foreground/10"}`} />
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-5 gap-1 font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
          {TIERS.map((t, i) => (
            <span key={t.tier} className={i === tierIndex ? "text-emerald-500" : ""}>{t.tier}</span>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {card.status === "building"
            ? "Not enough payment history yet. A tier unlocks at 10+ clients and 3+ months of data."
            : card.status === "paused"
              ? "This card isn't currently connected to live payment data."
              : next
                ? `${next.points} points to ${next.next}.`
                : "Top tier."}
        </p>
      </section>

      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">What builds the score</p>
        <p className="mt-1 text-xs text-muted-foreground">Calculated from payment records, not self-reported. Exact figures stay private; you see the rating.</p>
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {card.factors.map((f) => (
            <li key={f.key} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.question}</p>
              </div>
              <span className={`font-mono text-[11px] uppercase tracking-wider ${BAND_COLOR[f.band]}`}>{f.band}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-dashed border-border p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Kept private</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Revenue, client names and payment amounts are never shown. Nobody, including the coach, can edit these numbers.
        </p>
      </section>
    </div>
  );
}
