import { useEffect, useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/lib/usePageMeta";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { tierForPoints, TIER_LABEL, TIER_COLOR, type Tier } from "@/lib/tiers";

const CATEGORY_PILLS = [
  "Business Coaching",
  "Fitness & Health",
  "Marketing",
  "Sales",
  "Mindset",
  "Consulting",
];

export default function Landing() {
  const { user, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  usePageMeta(
    "Aytopus — Hire by proof, not promises",
    "Coaches and service providers ranked by what verified clients actually said.",
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
  };

  if (loading) return <div style={{ background: "#0a0705", minHeight: "100vh" }} />;
  if (user) return <Navigate to="/explore" replace />;

  return (
    <div className="hv-landing">
      <style>{LANDING_CSS}</style>

      {/* HEADER */}
      <nav className="hv-l-container">
        <div className="hv-l-nav-inner">
          <Link to="/" aria-label="Aytopus home" className="hv-l-brand hv-l-fade hv-l-fade-1">
            <Logo />
            <span className="hv-l-wordmark">Aytopus</span>
          </Link>
          <div className="hv-l-nav-center hv-l-fade hv-l-fade-1">
            <Link to="/explore" className="hv-l-nav-link">Browse</Link>
            <Link to="/how-verification-works" className="hv-l-nav-link">How it works</Link>
            <Link to="/auth" className="hv-l-nav-link">For providers</Link>
          </div>
          <div className="hv-l-nav-actions hv-l-fade hv-l-fade-1">
            <Link to="/auth" className="hv-l-nav-signin">Log in</Link>
            <Link to="/auth" className="hv-l-nav-signup">Join free</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hv-l-hero hv-l-container">
        <h1 className="hv-l-fade hv-l-fade-2">
          Hire by <span className="hv-l-italic">proof</span>, not promises.
        </h1>
        <p className="hv-l-hero-sub hv-l-fade hv-l-fade-3">
          Coaches and providers ranked by what verified clients actually said.
        </p>

        <form className="hv-l-search hv-l-fade hv-l-fade-3" onSubmit={handleSearch}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Try "business coach" or "YouTube growth"'
            className="hv-l-search-input"
            aria-label="Search"
          />
          <button type="submit" className="hv-l-search-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            Search
          </button>
        </form>

        <div className="hv-l-cat-pills hv-l-fade hv-l-fade-4">
          {CATEGORY_PILLS.map((c) => (
            <Link
              key={c}
              to={`/explore?cats=${encodeURIComponent(c)}&type=both`}
              className="hv-l-cat-pill"
            >
              {c}
            </Link>
          ))}
        </div>

        <div className="hv-l-hero-premium hv-l-fade hv-l-fade-4">
          First 100 providers get Premium free — 67 spots remaining.
        </div>
      </section>

      {/* FOUNDING PROVIDERS */}
      <FoundingProviders />

      {/* HOW IT WORKS — compact */}
      <section className="hv-l-how hv-l-container" id="how">
        <div className="hv-l-steps">
          <div className="hv-l-step">
            <div className="hv-l-step-num">01</div>
            <h3 className="hv-l-step-title">Find providers</h3>
            <p className="hv-l-step-desc">Search the network. Filter by category, tier, and offer.</p>
          </div>
          <div className="hv-l-step">
            <div className="hv-l-step-num">02</div>
            <h3 className="hv-l-step-title">Verify with real reviews</h3>
            <p className="hv-l-step-desc">Every review labeled Purchase Verified or Community. Reviews are the trust layer.</p>
          </div>
          <div className="hv-l-step">
            <div className="hv-l-step-num">03</div>
            <h3 className="hv-l-step-title">Message & hire</h3>
            <p className="hv-l-step-desc">Message directly, compare offers, hire with confidence.</p>
          </div>
        </div>
      </section>

      <VerifiedReviewsStrip />

      {/* TRUST VISUAL */}
      <section className="hv-l-features">
        <div className="hv-l-container">
          <div className="hv-l-section-head">
            <div className="hv-l-section-label">What Makes Us Different</div>
            <h2>A network <span className="hv-l-italic">built on proof.</span></h2>
            <p className="hv-l-lead-in">The info industry is drowning in hype, fake screenshots, and "gurus" with unverifiable results. So we labeled every single review.</p>
          </div>

          <div className="hv-l-proof-compare">
            <MockReviewCard
              badge="Purchase Verified"
              badgeVariant="gold"
              rating={5}
              body="Booked her 3-month coaching offer via Aytopus. Uploaded my invoice + contract as proof. Went from 12k to 47k MRR in 90 days — she rebuilt my sales page and offer positioning."
              reviewer="Marcus T."
              handle="@marcust"
              amount="$3k–$5k"
            />
            <MockReviewCard
              badge="Community Review"
              badgeVariant="muted"
              rating={4}
              body="Followed his content for a year and joined a free workshop. Solid frameworks, helpful voice — haven't purchased a paid offer yet so I can't speak to results."
              reviewer="Jamie K."
              handle="@jamiek"
              amount={null}
            />
          </div>

          <div className="hv-l-proof-note">
            Purchase Verified reviews require uploaded evidence of a paid engagement. Community Reviews are labeled as unverified so you always know what you're reading.
          </div>
        </div>
      </section>

      {/* WHO — unchanged */}
      <section className="hv-l-who hv-l-container">
        <div className="hv-l-section-head">
          <div className="hv-l-section-label">Who it's for</div>
          <h2>Two sides, <span className="hv-l-italic">one trust layer.</span></h2>
        </div>

        <div className="hv-l-who-grid">
          <div className="hv-l-who-card hv-l-providers">
            <div className="hv-l-who-tag">For Providers</div>
            <h3>Prove your work. Get hired.</h3>
            <p>Build a verified profile that lets your results speak louder than your marketing.</p>
            <ul className="hv-l-who-list">
              <li>List paid offers with real pricing</li>
              <li>Collect verified reviews from clients</li>
              <li>Earn tier badges: Bronze, Silver, Gold</li>
              <li>Get discovered by buyers actively looking</li>
            </ul>
          </div>

          <div className="hv-l-who-card hv-l-buyers">
            <div className="hv-l-who-tag">For Buyers</div>
            <h3>Hire without guessing.</h3>
            <p>Stop gambling on coaches and consultants based on Instagram reels and sales pages.</p>
            <ul className="hv-l-who-list">
              <li>See real reviews from real clients</li>
              <li>Compare offers side-by-side</li>
              <li>Message providers before you pay</li>
              <li>Rank providers by what clients actually said</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="hv-l-final hv-l-container">
        <div className="hv-l-section-label">Get Started</div>
        <h2>Find your next coach <span className="hv-l-italic">or provider.</span></h2>
        <p className="hv-l-final-sub">Open the network. See live offers. Hire someone whose work is already verified.</p>

        <div className="hv-l-cta-row" style={{ marginBottom: 0 }}>
          <Link to="/explore" className="hv-l-btn hv-l-btn-primary">Open Aytopus →</Link>
        </div>
      </section>

      <footer className="hv-l-footer">
        <div className="hv-l-container">
          <div className="hv-l-tagline">Bringing trust back to the info industry.</div>
          <div>Aytopus © 2026 — aytopus.com</div>
          <div style={{ marginTop: 12, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/terms" style={{ color: "var(--hv-muted)", textDecoration: "none" }}>Terms of Service</Link>
            <span style={{ color: "var(--hv-line)" }}>•</span>
            <Link to="/privacy" style={{ color: "var(--hv-muted)", textDecoration: "none" }}>Privacy Policy</Link>
            <span style={{ color: "var(--hv-line)" }}>•</span>
            <Link to="/how-verification-works" style={{ color: "var(--hv-muted)", textDecoration: "none" }}>How Verification Works</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------ FOUNDING PROVIDERS ------------ */

type FoundingProvider = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  service_category: string | null;
  review_count: number;
  rating_sum: number;
  points: number;
};

function FoundingProviders() {
  const [items, setItems] = useState<FoundingProvider[] | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, service_category, review_count, rating_sum, points")
        .eq("is_banned", false)
        .eq("is_claimed", true)
        .not("username", "is", null)
        .order("points", { ascending: false })
        .order("review_count", { ascending: false })
        .limit(4);
      if (cancel) return;
      if (error || !data) { setItems([]); return; }
      setItems(data as FoundingProvider[]);
    })();
    return () => { cancel = true; };
  }, []);

  if (!items) return null;

  const slots: (FoundingProvider | null)[] = [...items];
  while (slots.length < 3) slots.push(null);

  return (
    <section className="hv-l-founding hv-l-container">
      <div className="hv-l-section-head">
        <div className="hv-l-section-label">Founding Providers</div>
        <h2>Early members <span className="hv-l-italic">shaping the network.</span></h2>
      </div>
      <div className="hv-l-founding-grid">
        {slots.map((p, i) => p ? <FoundingCard key={p.id} p={p} /> : <ReservedCard key={`res-${i}`} />)}
      </div>
    </section>
  );
}

function FoundingCard({ p }: { p: FoundingProvider }) {
  const tier: Tier = tierForPoints(p.points ?? 0);
  const avg = p.review_count > 0 ? (p.rating_sum / p.review_count) : 0;
  return (
    <Link to={`/@${p.username}`} className="hv-l-founding-card">
      <div className="hv-l-founding-top">
        {p.avatar_url ? (
          <img src={p.avatar_url} alt="" className="hv-l-founding-avatar" />
        ) : (
          <span className="hv-l-founding-avatar hv-l-founding-avatar--fallback">
            {(p.display_name || p.username).trim().charAt(0).toUpperCase()}
          </span>
        )}
        <span
          className="hv-l-founding-tier"
          style={{ color: TIER_COLOR[tier], borderColor: TIER_COLOR[tier] }}
        >
          {TIER_LABEL[tier]}
        </span>
      </div>
      <div className="hv-l-founding-name">{p.display_name || p.username}</div>
      <div className="hv-l-founding-cat">{p.service_category || "Provider"}</div>
      <div className="hv-l-founding-stats">
        <span className="hv-l-founding-rating">
          <span className="hv-l-star on">★</span> {avg ? avg.toFixed(1) : "—"}
        </span>
        <span className="hv-l-founding-count">
          {p.review_count} purchase-verified {p.review_count === 1 ? "review" : "reviews"}
        </span>
      </div>
    </Link>
  );
}

function ReservedCard() {
  return (
    <Link to="/auth" className="hv-l-founding-card hv-l-founding-card--reserved">
      <div className="hv-l-founding-reserved-label">This spot is reserved</div>
      <div className="hv-l-founding-reserved-title">Claim founding status</div>
      <div className="hv-l-founding-reserved-desc">First 100 providers get Premium free — forever.</div>
      <span className="hv-l-founding-reserved-cta">Join free →</span>
    </Link>
  );
}

/* ------------ MOCK REVIEW CARD (trust visual) ------------ */

function MockReviewCard({
  badge, badgeVariant, rating, body, reviewer, handle, amount,
}: {
  badge: string;
  badgeVariant: "gold" | "muted";
  rating: number;
  body: string;
  reviewer: string;
  handle: string;
  amount: string | null;
}) {
  return (
    <div className={`hv-l-mock-card hv-l-mock-card--${badgeVariant}`}>
      <div className="hv-l-mock-head">
        <span className={`hv-l-mock-badge hv-l-mock-badge--${badgeVariant}`}>
          {badgeVariant === "gold" && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z"/><path d="M9 12l2 2 4-4"/></svg>
          )}
          {badge}
        </span>
        <span className="hv-l-mock-stars">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < rating ? "hv-l-star on" : "hv-l-star"}>★</span>
          ))}
        </span>
      </div>
      <p className="hv-l-mock-body">"{body}"</p>
      <div className="hv-l-mock-meta">
        <div>
          <div className="hv-l-mock-reviewer">{reviewer}</div>
          <div className="hv-l-mock-handle">{handle}</div>
        </div>
        {amount && (
          <span className="hv-l-mock-amount">Paid {amount}</span>
        )}
      </div>
    </div>
  );
}

/* ------------ VERIFIED REVIEWS STRIP (unchanged data logic) ------------ */

type VerifiedReviewItem = {
  id: string;
  rating: number;
  body: string;
  reviewer_name: string | null;
  provider: { username: string; display_name: string | null; avatar_url: string | null };
};

function VerifiedReviewsStrip() {
  const [items, setItems] = useState<VerifiedReviewItem[] | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const { data: rows, error } = await supabase
        .from("public_reviews")
        .select("id, rating, body, reviewer_name, provider_id, created_at")
        .gte("rating", 4)
        .order("rating", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(24);
      if (cancel) return;
      if (error || !rows) { setItems([]); return; }
      const qualifying = rows.filter((r) => (r.body ?? "").trim().length >= 140 && r.provider_id);
      const providerIds = Array.from(new Set(qualifying.map((r) => r.provider_id as string)));
      if (providerIds.length === 0) { setItems([]); return; }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", providerIds);
      if (cancel) return;
      const pmap = new Map((profs ?? []).map((p) => [p.id, p]));
      const chosen: VerifiedReviewItem[] = [];
      const seen = new Set<string>();
      for (const r of qualifying) {
        const p = pmap.get(r.provider_id as string);
        if (!p || !p.username) continue;
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        chosen.push({
          id: r.id as string,
          rating: r.rating as number,
          body: (r.body as string).trim(),
          reviewer_name: (r.reviewer_name as string | null) ?? null,
          provider: { username: p.username, display_name: p.display_name ?? null, avatar_url: p.avatar_url ?? null },
        });
        if (chosen.length >= 3) break;
      }
      setItems(chosen);
    })();
    return () => { cancel = true; };
  }, []);

  if (!items || items.length < 2) return null;

  return (
    <section className="hv-l-trust hv-l-container">
      <div className="hv-l-section-head">
        <div className="hv-l-section-label">Verified reviews</div>
        <h2>Real reviews, <span className="hv-l-italic">real people.</span></h2>
      </div>
      <div className="hv-l-trust-grid">
        {items.map((r) => (
          <Link key={r.id} to={`/@${r.provider.username}`} className="hv-l-trust-card">
            <div className="hv-l-trust-stars" aria-label={`${r.rating} out of 5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < r.rating ? "hv-l-star on" : "hv-l-star"}>★</span>
              ))}
            </div>
            <p className="hv-l-trust-body">"{r.body.length > 260 ? r.body.slice(0, 257).trimEnd() + "…" : r.body}"</p>
            <div className="hv-l-trust-meta">
              {r.provider.avatar_url ? (
                <img src={r.provider.avatar_url} alt="" className="hv-l-trust-avatar" />
              ) : (
                <span className="hv-l-trust-avatar hv-l-trust-avatar--fallback">
                  {(r.provider.display_name || r.provider.username).trim().charAt(0).toUpperCase()}
                </span>
              )}
              <div className="hv-l-trust-meta-text">
                <div className="hv-l-trust-reviewer">{r.reviewer_name || "Verified reviewer"}</div>
                <div className="hv-l-trust-provider">
                  reviewed <span className="hv-l-trust-provider-name">{r.provider.display_name || r.provider.username}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="hv-l-trust-foot">
        <Link to="/how-verification-works" className="hv-l-trust-link">How verification works →</Link>
      </div>
    </section>
  );
}

const LANDING_CSS = `
.hv-landing {
  --hv-bg: #0a0705;
  --hv-bg-soft: #120c08;
  --hv-gold: #d4a24c;
  --hv-gold-bright: #f0c87a;
  --hv-gold-deep: #8a6a2d;
  --hv-ivory: #f5ebd8;
  --hv-muted: #9a8f7d;
  --hv-line: rgba(212, 162, 76, 0.18);
  --hv-shadow-gold: 0 0 60px rgba(212, 162, 76, 0.15);
  background: var(--hv-bg);
  color: var(--hv-ivory);
  font-family: 'Inter', sans-serif;
  font-weight: 300;
  line-height: 1.6;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}
.hv-landing * { box-sizing: border-box; }
.hv-landing::before {
  content: '';
  position: fixed; inset: 0;
  background:
    radial-gradient(ellipse at 20% 10%, rgba(212, 162, 76, 0.12) 0%, transparent 40%),
    radial-gradient(ellipse at 80% 60%, rgba(212, 162, 76, 0.08) 0%, transparent 45%),
    radial-gradient(ellipse at 50% 100%, rgba(212, 162, 76, 0.06) 0%, transparent 50%);
  pointer-events: none; z-index: 0;
}
.hv-landing::after {
  content: '';
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
  opacity: 0.03; pointer-events: none; z-index: 1; mix-blend-mode: overlay;
}
.hv-l-container { max-width: 1100px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 2; }

/* NAV */
.hv-landing nav.hv-l-container { padding-top: 20px; padding-bottom: 20px; z-index: 10; }
.hv-l-nav-inner { display: flex; justify-content: space-between; align-items: center; gap: 24px; }
.hv-l-brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
.hv-l-wordmark {
  font-family: 'Fraunces', serif; font-size: 22px; font-weight: 600;
  letter-spacing: -0.01em; color: var(--hv-ivory);
}
.hv-l-nav-center { display: flex; align-items: center; gap: 28px; }
@media (max-width: 780px) { .hv-l-nav-center { display: none; } }
.hv-l-nav-link {
  font-size: 13px; letter-spacing: 0.04em; text-decoration: none;
  color: rgba(245, 240, 225, 0.7); transition: color 0.25s ease;
}
.hv-l-nav-link:hover { color: var(--hv-gold); }
.hv-l-nav-actions { display: flex; align-items: center; gap: 14px; }
.hv-l-nav-signin {
  font-size: 13px; letter-spacing: 0.04em;
  color: rgba(245, 240, 225, 0.7); text-decoration: none; transition: color 0.25s ease;
}
.hv-l-nav-signin:hover { color: var(--hv-gold); }
.hv-l-nav-signup {
  font-size: 13px; letter-spacing: 0.08em; font-weight: 600;
  color: #1a1208; text-decoration: none;
  background: linear-gradient(135deg, #f0c870, var(--hv-gold) 55%, #b8862e);
  padding: 10px 20px; border-radius: 999px;
  box-shadow: 0 6px 18px -6px rgba(212, 162, 76, 0.55);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}
.hv-l-nav-signup:hover { transform: translateY(-1px); filter: brightness(1.05); box-shadow: 0 10px 22px -8px rgba(212, 162, 76, 0.7); }

/* HERO — compact */
.hv-l-hero {
  padding: 40px 0 48px;
  text-align: center;
  min-height: 0;
  max-height: 60vh;
  display: flex; flex-direction: column; justify-content: center;
}
@media (max-width: 640px) { .hv-l-hero { max-height: none; padding: 32px 0 40px; } }

.hv-landing h1 {
  font-family: 'Fraunces', serif; font-weight: 500;
  font-size: clamp(38px, 6vw, 68px); line-height: 1.05; letter-spacing: -0.03em;
  color: var(--hv-ivory); margin: 0 0 18px;
}
.hv-landing h1 .hv-l-italic { font-style: normal; color: var(--hv-gold); font-weight: 500; }

.hv-l-hero-sub { font-size: 17px; color: var(--hv-muted); max-width: 620px; margin: 0 auto 28px; line-height: 1.5; }

/* Hero search */
.hv-l-search {
  display: flex; align-items: center; gap: 8px;
  max-width: 620px; margin: 0 auto 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--hv-line); border-radius: 999px;
  padding: 6px 6px 6px 8px;
  transition: all 0.3s ease;
}
.hv-l-search:focus-within { border-color: rgba(212, 162, 76, 0.5); box-shadow: var(--hv-shadow-gold); }
.hv-l-search-input {
  flex: 1; min-width: 0;
  background: transparent; border: none; outline: none;
  padding: 12px 16px;
  font-family: 'Inter', sans-serif; font-size: 16px; color: var(--hv-ivory);
}
.hv-l-search-input::placeholder { color: var(--hv-muted); }
.hv-l-search-btn {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, var(--hv-gold-bright) 0%, var(--hv-gold) 50%, var(--hv-gold-deep) 100%);
  color: #0a0705; font-weight: 600; font-size: 14px; letter-spacing: 0.05em;
  border: none; border-radius: 999px;
  padding: 12px 22px; cursor: pointer;
  transition: all 0.3s ease;
}
.hv-l-search-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(212, 162, 76, 0.35); }

/* Category pills */
.hv-l-cat-pills {
  display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;
  max-width: 720px; margin: 0 auto 18px;
}
.hv-l-cat-pill {
  font-size: 13px; color: rgba(245, 240, 225, 0.85);
  padding: 8px 16px; border-radius: 999px;
  border: 1px solid var(--hv-line);
  background: rgba(255,255,255,0.02);
  text-decoration: none; transition: all 0.25s ease;
}
.hv-l-cat-pill:hover { border-color: var(--hv-gold); color: var(--hv-gold); background: rgba(212,162,76,0.06); }

.hv-l-hero-premium {
  font-size: 13px; color: var(--hv-gold);
  text-align: center; margin: 0 auto;
  letter-spacing: 0.02em;
}

/* Buttons (legacy — used in Final CTA) */
.hv-l-cta-row { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; margin-bottom: 40px; }
.hv-l-btn {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 16px 32px; border-radius: 999px;
  font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; letter-spacing: 0.05em;
  text-decoration: none; transition: all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
  cursor: pointer; border: none;
}
.hv-l-btn-primary {
  background: linear-gradient(135deg, var(--hv-gold-bright) 0%, var(--hv-gold) 50%, var(--hv-gold-deep) 100%);
  color: #0a0705; font-weight: 600;
  box-shadow: 0 8px 30px rgba(212, 162, 76, 0.25);
}
.hv-l-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(212, 162, 76, 0.4); }

/* Section head shared */
.hv-l-section-head { text-align: center; margin-bottom: 40px; }
.hv-l-section-label { font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--hv-gold); margin-bottom: 16px; }
.hv-landing h2 { font-family: 'Fraunces', serif; font-weight: 500; font-size: clamp(30px, 4.2vw, 48px); letter-spacing: -0.02em; color: var(--hv-ivory); line-height: 1.1; margin: 0; }
.hv-landing h2 .hv-l-italic { font-style: normal; color: var(--hv-gold); }
.hv-l-lead-in { font-family: 'Fraunces', serif; font-size: 17px; color: var(--hv-muted); max-width: 720px; margin: 18px auto 0; line-height: 1.55; }

/* FOUNDING PROVIDERS */
.hv-l-founding { padding: 40px 0 50px; }
.hv-l-founding-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
}
@media (max-width: 900px) { .hv-l-founding-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .hv-l-founding-grid { grid-template-columns: 1fr; } }
.hv-l-founding-card {
  display: flex; flex-direction: column; gap: 8px;
  background: linear-gradient(180deg, rgba(212,162,76,0.05) 0%, transparent 100%);
  border: 1px solid var(--hv-line); border-radius: 18px;
  padding: 20px; text-decoration: none; color: var(--hv-ivory);
  transition: all 0.25s ease;
}
.hv-l-founding-card:hover { border-color: rgba(212,162,76,0.4); transform: translateY(-3px); box-shadow: var(--hv-shadow-gold); }
.hv-l-founding-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.hv-l-founding-avatar { width: 48px; height: 48px; border-radius: 999px; object-fit: cover; border: 1px solid var(--hv-line); }
.hv-l-founding-avatar--fallback { display: inline-flex; align-items: center; justify-content: center; background: rgba(212,162,76,0.12); color: var(--hv-gold); font-family: 'Fraunces', serif; font-weight: 600; font-size: 20px; }
.hv-l-founding-tier {
  font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 999px; border: 1px solid;
  background: rgba(10,7,5,0.4); font-weight: 600;
}
.hv-l-founding-name { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600; color: var(--hv-ivory); letter-spacing: -0.01em; }
.hv-l-founding-cat { font-size: 12px; color: var(--hv-muted); text-transform: uppercase; letter-spacing: 0.14em; }
.hv-l-founding-stats { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--hv-line); }
.hv-l-founding-rating { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: var(--hv-ivory); font-weight: 500; }
.hv-l-founding-count { font-size: 12px; color: var(--hv-muted); }
.hv-l-founding-card--reserved {
  background: linear-gradient(135deg, rgba(212,162,76,0.08) 0%, transparent 80%);
  border-style: dashed;
}
.hv-l-founding-reserved-label { font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--hv-gold); }
.hv-l-founding-reserved-title { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 600; color: var(--hv-ivory); margin-top: 4px; }
.hv-l-founding-reserved-desc { font-size: 13px; color: var(--hv-muted); line-height: 1.5; margin-top: 4px; }
.hv-l-founding-reserved-cta { margin-top: auto; padding-top: 12px; color: var(--hv-gold); font-size: 13px; font-weight: 600; letter-spacing: 0.04em; }

/* HOW — compact */
.hv-l-how { padding: 40px 0 40px; }
.hv-l-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 768px) { .hv-l-steps { grid-template-columns: 1fr; } }
.hv-l-step {
  position: relative; padding: 22px 22px;
  border: 1px solid var(--hv-line); border-radius: 16px;
  background: linear-gradient(180deg, rgba(212, 162, 76, 0.03) 0%, transparent 100%);
  transition: all 0.4s ease;
}
.hv-l-step:hover { border-color: rgba(212, 162, 76, 0.4); transform: translateY(-4px); box-shadow: var(--hv-shadow-gold); }
.hv-l-step-num { font-family: 'Fraunces', serif; font-style: italic; font-size: 36px; font-weight: 400; color: var(--hv-gold); line-height: 1; margin-bottom: 8px; opacity: 0.9; }
.hv-l-step-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600; color: var(--hv-ivory); margin: 0 0 6px; letter-spacing: -0.01em; }
.hv-l-step-desc { font-size: 14px; color: var(--hv-muted); line-height: 1.55; margin: 0; }

/* FEATURES / TRUST VISUAL */
.hv-l-features { padding: 50px 0 60px; background: linear-gradient(180deg, transparent 0%, rgba(212, 162, 76, 0.02) 50%, transparent 100%); position: relative; z-index: 2; }
.hv-l-proof-compare {
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  max-width: 960px; margin: 8px auto 0;
}
@media (max-width: 780px) { .hv-l-proof-compare { grid-template-columns: 1fr; } }
.hv-l-mock-card {
  display: flex; flex-direction: column; gap: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%);
  border: 1px solid var(--hv-line); border-radius: 18px;
  padding: 22px;
}
.hv-l-mock-card--gold { border-color: rgba(212,162,76,0.45); box-shadow: 0 0 40px rgba(212,162,76,0.08); }
.hv-l-mock-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.hv-l-mock-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
  padding: 5px 10px; border-radius: 999px;
}
.hv-l-mock-badge--gold {
  color: #1a1208;
  background: linear-gradient(135deg, #f0c870, var(--hv-gold) 55%, #b8862e);
}
.hv-l-mock-badge--muted {
  color: var(--hv-muted);
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
}
.hv-l-mock-stars { display: inline-flex; gap: 2px; font-size: 14px; }
.hv-l-mock-body { font-family: 'Fraunces', serif; font-size: 16px; line-height: 1.55; color: var(--hv-ivory); font-weight: 400; margin: 0; }
.hv-l-mock-meta { display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; padding-top: 12px; border-top: 1px solid var(--hv-line); }
.hv-l-mock-reviewer { font-size: 13px; font-weight: 600; color: var(--hv-ivory); }
.hv-l-mock-handle { font-size: 12px; color: var(--hv-muted); margin-top: 2px; }
.hv-l-mock-amount {
  font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--hv-gold); padding: 4px 10px; border: 1px solid var(--hv-line); border-radius: 999px;
}
.hv-l-proof-note {
  text-align: center; font-size: 13px; color: var(--hv-muted);
  max-width: 680px; margin: 24px auto 0; line-height: 1.6;
}

/* WHO */
.hv-l-who { padding: 60px 0; }
.hv-l-who-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
@media (max-width: 768px) { .hv-l-who-grid { grid-template-columns: 1fr; } }
.hv-l-who-card { padding: 36px 30px; border: 1px solid var(--hv-line); border-radius: 20px; position: relative; overflow: hidden; }
.hv-l-who-card.hv-l-providers { background: linear-gradient(135deg, rgba(212, 162, 76, 0.08) 0%, transparent 70%); }
.hv-l-who-card.hv-l-buyers { background: linear-gradient(135deg, rgba(212, 162, 76, 0.04) 0%, transparent 70%); }
.hv-l-who-tag { font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--hv-gold); margin-bottom: 14px; }
.hv-l-who-card h3 { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 500; color: var(--hv-ivory); margin: 0 0 14px; letter-spacing: -0.01em; }
.hv-l-who-card p { color: var(--hv-muted); font-size: 15px; line-height: 1.6; margin: 0 0 18px; }
.hv-l-who-list { list-style: none; padding: 0; margin: 0; }
.hv-l-who-list li { padding: 6px 0; color: var(--hv-ivory); font-size: 14px; display: flex; align-items: center; gap: 12px; }
.hv-l-who-list li::before { content: ''; width: 14px; height: 1px; background: var(--hv-gold); flex-shrink: 0; }

/* FINAL */
.hv-l-final { padding: 60px 0 70px; text-align: center; position: relative; }
.hv-l-final::before {
  content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 80%; max-width: 600px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--hv-gold), transparent);
}
.hv-l-final h2 { margin-bottom: 14px; }
.hv-l-final-sub { color: var(--hv-muted); font-size: 16px; margin: 0 auto 28px; max-width: 500px; }

/* FOOTER */
.hv-l-footer { padding: 32px 0; border-top: 1px solid var(--hv-line); text-align: center; color: var(--hv-muted); font-size: 13px; letter-spacing: 0.05em; position: relative; z-index: 2; }
.hv-l-tagline { font-family: 'Fraunces', serif; font-style: italic; color: var(--hv-gold); margin-bottom: 8px; font-size: 15px; }

/* Fade animations */
@keyframes hvFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.hv-l-fade { animation: hvFadeUp 0.8s ease-out both; }
.hv-l-fade-1 { animation-delay: 0.05s; }
.hv-l-fade-2 { animation-delay: 0.15s; }
.hv-l-fade-3 { animation-delay: 0.25s; }
.hv-l-fade-4 { animation-delay: 0.35s; }

/* Verified reviews strip */
.hv-l-trust { padding: 30px 0 20px; position: relative; z-index: 2; }
.hv-l-trust-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px; }
@media (max-width: 900px) { .hv-l-trust-grid { grid-template-columns: 1fr; } }
.hv-l-trust-card {
  display: flex; flex-direction: column; gap: 16px;
  background: linear-gradient(180deg, rgba(212,162,76,0.05) 0%, rgba(212,162,76,0.01) 100%);
  border: 1px solid var(--hv-line); border-radius: 18px;
  padding: 22px; text-decoration: none; color: var(--hv-ivory);
  transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
}
.hv-l-trust-card:hover { border-color: rgba(212,162,76,0.45); transform: translateY(-3px); box-shadow: var(--hv-shadow-gold); }
.hv-l-trust-stars { display: inline-flex; gap: 3px; font-size: 15px; }
.hv-l-star { color: rgba(255,255,255,0.15); }
.hv-l-star.on { color: var(--hv-gold); text-shadow: 0 0 8px rgba(212,162,76,0.35); }
.hv-l-trust-body { font-family: 'Fraunces', serif; font-size: 16px; line-height: 1.55; color: var(--hv-ivory); font-weight: 400; margin: 0; flex: 1; }
.hv-l-trust-meta { display: flex; align-items: center; gap: 12px; padding-top: 12px; border-top: 1px solid var(--hv-line); }
.hv-l-trust-avatar { width: 36px; height: 36px; border-radius: 999px; object-fit: cover; border: 1px solid var(--hv-line); }
.hv-l-trust-avatar--fallback { display: inline-flex; align-items: center; justify-content: center; background: rgba(212,162,76,0.12); color: var(--hv-gold); font-family: 'Fraunces', serif; font-weight: 600; font-size: 14px; }
.hv-l-trust-meta-text { min-width: 0; }
.hv-l-trust-reviewer { font-size: 13px; font-weight: 500; color: var(--hv-ivory); }
.hv-l-trust-provider { font-size: 12px; color: var(--hv-muted); margin-top: 2px; }
.hv-l-trust-provider-name { color: var(--hv-gold); }
.hv-l-trust-foot { display: flex; justify-content: center; margin-top: 22px; }
.hv-l-trust-link { color: var(--hv-gold); font-size: 13px; letter-spacing: 0.05em; text-decoration: none; border-bottom: 1px solid var(--hv-line); padding-bottom: 3px; transition: border-color 0.25s ease; }
.hv-l-trust-link:hover { border-color: var(--hv-gold); }
`;
