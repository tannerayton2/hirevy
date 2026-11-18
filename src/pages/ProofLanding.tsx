// aytopus.com — the public home page while the network is private. Sells one thing: the proof card.
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Ban, Eye, History, Lock, Repeat, ShieldCheck, Users } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ProofCardDetails, ProofScoreCard, SEAL_PATHS } from "@/components/ProofScoreCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/lib/usePageMeta";
import { DEMO_CARD, DEMO_OWNER, TIERS } from "@/lib/proofScore";

const STEPS = [
  {
    n: "01",
    title: "Connect Stripe, read-only",
    body: "Paste a restricted key that can only read. Aytopus can't move money, issue refunds or change anything.",
  },
  {
    n: "02",
    title: "We score how clients behave",
    body: "Do they keep paying? Do they ask for their money back? How many real people paid? It's all in the payment records.",
  },
  {
    n: "03",
    title: "Share your card anywhere",
    body: "Bio link, sales page, DMs, email signature. It's a live link that re-checks itself, so a screenshot is never the proof.",
  },
];

const HARD_TO_FAKE = [
  { icon: Repeat, title: "Refunds and chargebacks both count", body: "A strict no-refund policy can't hide unhappy clients. A chargeback counts the same as a refund." },
  { icon: Ban, title: "Paying yourself doesn't count", body: "Your own card and tiny test payments are excluded. Only real, unique clients count." },
  { icon: Users, title: "Small samples stay average", body: "Five perfect clients won't get you to Diamond. Top tiers need a real track record." },
  { icon: History, title: "History can't be erased", body: "Hide your card or reconnect, and the record keeps its history. Nobody can edit the numbers, including you." },
];

const TIER_STYLE: Record<string, string> = {
  Bronze: "linear-gradient(135deg,#3A2618,#160E09)",
  Silver: "linear-gradient(135deg,#3A3D42,#15171A)",
  Gold: "linear-gradient(135deg,#43341A,#15110A)",
  Platinum: "linear-gradient(135deg,#1F2322,#0A0B0B)",
  Diamond: "linear-gradient(135deg,#FFFFFF,#DCE3EA)",
};

export default function ProofLanding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  usePageMeta(
    "Aytopus | Proof cards nobody can fake",
    "Connect Stripe and get a verified proof card scored from how your clients actually behave: retention, refunds and chargebacks.",
  );

  if (!loading && user) return <Navigate to="/settings/proof" replace />;

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" aria-label="Aytopus home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Get your card</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <svg aria-hidden="true" viewBox="0 0 150 150" className="pointer-events-none absolute -right-40 -top-24 h-[640px] w-[640px] text-primary opacity-[0.05]">
          <g fill="none" stroke="currentColor" strokeWidth={0.5}>
            {SEAL_PATHS.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        </svg>
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-14 md:grid-cols-[1.05fr_1fr] md:pb-24 md:pt-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">Payment-verified proof cards</p>
            <h1 className="mt-4 text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] md:text-[64px]">
              Proof nobody
              <br />
              can fake.
            </h1>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-muted-foreground md:text-[17px]">
              Testimonials can be faked. Screenshots can be faked. Payment records can't. Connect Stripe and get a card
              scored from how your clients actually behave.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/signup">
                  Get your proof card <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/v/demo">See an example</Link>
              </Button>
            </div>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Free · Read-only · Revenue stays private
            </p>
          </div>

          <div className="flex flex-col items-center">
            <ProofScoreCard
              card={DEMO_CARD}
              name={DEMO_OWNER.display_name}
              subtitle={DEMO_OWNER.service_category}
              open={open}
              onToggle={() => setOpen((o) => !o)}
            />
            <p className="mt-5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
              {open ? "Sample card · made-up numbers" : "Tap the card to open the record"}
            </p>
            {open && (
              <div className="mt-6 w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ProofCardDetails card={DEMO_CARD} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* The problem */}
      <section className="border-y border-white/[0.06] bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3 md:py-16">
          {[
            ["Testimonials", "Hand-picked, easy to write, impossible to check."],
            ["Revenue screenshots", "Prove you can sell, not that clients got results. Also easy to edit."],
            ["Payment behavior", "Who stayed, who asked for a refund, who disputed the charge. That's the truth."],
          ].map(([t, b], i) => (
            <div key={t} className="flex gap-4">
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${i === 2 ? "bg-primary/15 text-primary" : "bg-white/[0.05] text-muted-foreground"}`}>
                {i === 2 ? <ShieldCheck className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </span>
              <div>
                <p className={`text-[15px] font-semibold ${i === 2 ? "text-primary" : ""}`}>{t}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">How it works</p>
        <h2 className="mt-3 max-w-xl text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[42px]">
          Three steps. Five minutes. Then it updates itself.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-3xl border border-white/[0.08] bg-card p-6 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.8)]">
              <span className="font-mono text-[11px] tracking-[0.2em] text-primary">{s.n}</span>
              <p className="mt-4 text-lg font-semibold tracking-[-0.01em]">{s.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Hard to fake */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Built to catch bad actors</p>
          <h2 className="mt-3 max-w-2xl text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[42px]">
            A good score is earned. A bad one can't hide.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {HARD_TO_FAKE.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4 rounded-3xl border border-white/[0.08] bg-card p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/[0.12] text-primary">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="text-[15px] font-semibold">{title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="border-t border-white/[0.06] bg-card/40">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Tiers</p>
          <h2 className="mt-3 text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[42px]">Bronze to Diamond.</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Your tier comes from your score, out of 1,000. You can't buy it, and it moves with your real results.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {TIERS.map((t, i) => {
              const next = TIERS[i + 1];
              const light = t.tier === "Diamond";
              return (
                <div
                  key={t.tier}
                  style={{ background: TIER_STYLE[t.tier] }}
                  className={`flex aspect-[1.6/1] flex-col justify-between rounded-2xl border border-white/10 p-4 shadow-[0_14px_30px_-12px_rgba(0,0,0,0.7)] ${light ? "text-[#121413]" : ""}`}
                >
                  <span className="text-[9px] font-bold tracking-[0.3em]">AYTOPUS</span>
                  <div>
                    <p className="text-base font-semibold">{t.tier}</p>
                    <p className={`font-mono text-[10px] ${light ? "text-[#4E5868]" : "text-muted-foreground"}`}>
                      {next ? `${t.min}–${next.min - 1}` : `${t.min}+`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-white/[0.06]">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center md:py-28">
          <Lock className="mx-auto h-5 w-5 text-primary" />
          <h2 className="mt-5 text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[48px]">
            Your clients already proved it.
            <br />
            Now show it.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Free to create. Read-only. Your revenue is never shown.
          </p>
          <Button size="lg" className="mt-8" onClick={() => navigate("/signup")}>
            Get your proof card <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-muted-foreground md:flex-row">
          <Logo />
          <nav className="flex gap-5">
            <Link to="/how-verification-works" className="hover:text-foreground">How verification works</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/support" className="hover:text-foreground">Support</Link>
          </nav>
          <p>© {new Date().getFullYear()} Aytopus</p>
        </div>
      </footer>
    </div>
  );
}
