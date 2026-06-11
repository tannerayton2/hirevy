import { useEffect, useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/lib/usePageMeta";

/**
 * Public marketing landing page. Logged-in users auto-redirect to /explore.
 * Styles are scoped via a unique class prefix (`hv-l-`) and inline <style>
 * to avoid leaking the warmer #0a0705 / #d4a24c palette into the rest of the app.
 */
export default function Landing() {
  const { user, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  usePageMeta(
    "HireVy — Hire Verified Coaches & Service Providers",
    "The network for hiring coaches and service providers — every member verified, every review tied to real work.",
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

      <nav className="hv-l-container">
        <div className="hv-l-nav-inner">
          <div className="hv-l-logo hv-l-fade hv-l-fade-1">
            <span className="hv-l-h">Hire</span>
            <span className="hv-l-v">Vy</span>
            <span className="hv-l-dot" />
          </div>
          <div className="hv-l-nav-actions hv-l-fade hv-l-fade-1">
            
            <Link to="/auth" className="hv-l-nav-signup">Log In</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hv-l-hero hv-l-container">
        <div className="hv-l-eyebrow hv-l-fade hv-l-fade-2">Now Live — Early Access</div>
        <h1 className="hv-l-fade hv-l-fade-2">
          Hire Verified Coaches <span className="hv-l-italic">&amp; Service Providers</span> You Can Trust.
        </h1>
        <p className="hv-l-hero-sub hv-l-fade hv-l-fade-3">
          The only place where reviews come from real clients, not marketing budgets.
        </p>

        <form className="hv-l-search hv-l-fade hv-l-fade-3" onSubmit={handleSearch}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any coach or provider..."
            className="hv-l-search-input"
            aria-label="Search any coach or provider"
          />
          <button type="submit" className="hv-l-search-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            Search
          </button>
        </form>

        <div className="hv-l-hero-links hv-l-fade hv-l-fade-4">
          <Link to="/submit-review" className="hv-l-hero-link">Worked with someone? Leave a review →</Link>
          <Link to="/explore" className="hv-l-hero-link">Browse all coaches →</Link>
        </div>

        <div className="hv-l-hero-premium hv-l-fade hv-l-fade-4">
          First 100 coaches to claim their profile get Premium free — forever. 67 spots remaining.
        </div>

        <div
          className="hv-l-fade hv-l-fade-4"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "1.25rem",
            flexWrap: "wrap",
            marginTop: "1.75rem",
          }}
        >
          <Link
            to="/auth"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem 2.5rem",
              fontSize: "1.0625rem",
              fontWeight: 600,
              borderRadius: "9999px",
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              textDecoration: "none",
              boxShadow: "var(--shadow-gold)",
            }}
          >
            Get Started
          </Link>
          <button
            type="button"
            onClick={() => {
              document.getElementById("demo-video")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem 2.5rem",
              fontSize: "1.0625rem",
              fontWeight: 600,
              borderRadius: "9999px",
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--border))",
              cursor: "pointer",
            }}
          >
            ▶ Watch Demo
          </button>
        </div>
      </section>


      {/* HOW IT WORKS — steps */}
      <section className="hv-l-how hv-l-container" id="how">
        <div className="hv-l-steps">
          <div className="hv-l-step">
            <div className="hv-l-step-num">01</div>
            <h3 className="hv-l-step-title">Search Any Coach</h3>
            <p className="hv-l-step-desc">
              Whether they have a profile or not. Type any name and see what real clients said about working with them.
            </p>
          </div>
          <div className="hv-l-step">
            <div className="hv-l-step-num">02</div>
            <h3 className="hv-l-step-title">Read Real Reviews</h3>
            <p className="hv-l-step-desc">
              Every review is labeled — Purchase Verified if the reviewer paid for real work, or Community Review if unverified. You always know the source.
            </p>
          </div>
          <div className="hv-l-step">
            <div className="hv-l-step-num">03</div>
            <h3 className="hv-l-step-title">Leave Your Own</h3>
            <p className="hv-l-step-desc">
              Worked with someone? Your honest review helps the next person make a smarter decision. Takes two minutes. No account needed.
            </p>
          </div>
        </div>
      </section>

      {/* VIDEO PLACEHOLDER with How It Works heading */}
      <section className="hv-l-video-wrap hv-l-container" id="demo-video">

        <div className="hv-l-section-head hv-l-video-head">
          <div className="hv-l-section-label">How it works</div>
          <h2>Simple, <span className="hv-l-italic">honest,</span> verified.</h2>
        </div>
        <div className="hv-l-video-card">
          <button type="button" className="hv-l-video-play" aria-label="Play demo video">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <div className="hv-l-video-caption">See how HireVy works — demo coming soon.</div>
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="hv-l-manifesto hv-l-container">
        <div className="hv-l-section-label">The Problem</div>
        <p className="hv-l-manifesto-quote">
          The info industry is drowning in hype, fake screenshots, and{" "}
          <span className="hv-l-accent">"gurus"</span> with unverifiable results.
        </p>
        <div className="hv-l-divider" />
        <div className="hv-l-section-label">Our Answer</div>
        <p className="hv-l-manifesto-quote" style={{ marginTop: 24 }}>
          Bringing <span className="hv-l-accent">trust</span> back to the info industry.
        </p>
      </section>

      <section className="hv-l-features">
        <div className="hv-l-container">
          <div className="hv-l-section-head">
            <div className="hv-l-section-label">What Makes Us Different</div>
            <h2>Every review, <span className="hv-l-italic">verified.</span></h2>
          </div>

          <div className="hv-l-feature-grid">
            <div className="hv-l-feature">
              <div className="hv-l-feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z"/><path d="M9 12l2 2 4-4"/></svg>
              </div>
              <h3 className="hv-l-feature-title">Verified Profiles</h3>
              <p className="hv-l-feature-desc">Every provider is vetted. Bronze, silver, and gold tiers earned through real client activity — not follower count.</p>
            </div>

            <div className="hv-l-feature">
              <div className="hv-l-feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5 12 2"/></svg>
              </div>
              <h3 className="hv-l-feature-title">Ratings &amp; Reviews</h3>
              <p className="hv-l-feature-desc">Ratings tied to purchases. No one can leave a review unless they actually bought. Reputation is proof of work.</p>
            </div>

            <div className="hv-l-feature">
              <div className="hv-l-feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>
              </div>
              <h3 className="hv-l-feature-title">Browse Offers</h3>
              <p className="hv-l-feature-desc">Search offers, providers, and tags. Filter by category, price, and rating. Find exactly what you're looking for.</p>
            </div>

            <div className="hv-l-feature">
              <div className="hv-l-feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
              <h3 className="hv-l-feature-title">Direct Messaging</h3>
              <p className="hv-l-feature-desc">Talk to providers before you buy. Ask questions, get clarity, build trust — all inside the platform.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHO */}
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
        <h2>Browse HireVy <span className="hv-l-italic">now.</span></h2>
        <p className="hv-l-final-sub">Open the app. See verified offers. Find someone worth hiring.</p>

        <div className="hv-l-cta-row" style={{ marginBottom: 0 }}>
          <Link to="/explore" className="hv-l-btn hv-l-btn-primary">Open HireVy →</Link>
        </div>
      </section>

      <footer className="hv-l-footer">
        <div className="hv-l-container">
          <div className="hv-l-tagline">Bringing trust back to the info industry.</div>
          <div>HireVy © 2026 — hirevy.lovable.app</div>
          <div style={{ marginTop: 12, display: "flex", gap: 16, justifyContent: "center" }}>
            <Link to="/terms" style={{ color: "var(--hv-muted)", textDecoration: "none" }}>Terms of Service</Link>
            <span style={{ color: "var(--hv-line)" }}>•</span>
            <Link to="/privacy" style={{ color: "var(--hv-muted)", textDecoration: "none" }}>Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
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
.hv-landing nav.hv-l-container { padding-top: 28px; padding-bottom: 28px; z-index: 10; }
.hv-l-nav-inner { display: flex; justify-content: space-between; align-items: center; }
.hv-l-logo { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 600; letter-spacing: -0.02em; }
.hv-l-logo .hv-l-h { color: var(--hv-ivory); }
.hv-l-logo .hv-l-v { color: var(--hv-gold); font-style: italic; }
.hv-l-logo .hv-l-dot { display: inline-block; width: 6px; height: 6px; background: var(--hv-gold); border-radius: 50%; margin-left: 2px; transform: translateY(-16px); }
.hv-l-nav-actions { display: flex; align-items: center; gap: 20px; }
.hv-l-nav-signin {
  font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase;
  color: rgba(245, 240, 225, 0.55); text-decoration: none; transition: color 0.3s ease;
}
.hv-l-nav-signin:hover { color: var(--hv-gold); }
.hv-l-nav-signup {
  font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 600;
  color: #1a1208; text-decoration: none;
  background: linear-gradient(135deg, #f0c870, var(--hv-gold) 55%, #b8862e);
  padding: 11px 22px; border-radius: 999px;
  box-shadow: 0 6px 18px -6px rgba(212, 162, 76, 0.55);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}
.hv-l-nav-signup:hover { transform: translateY(-1px); filter: brightness(1.05); box-shadow: 0 10px 22px -8px rgba(212, 162, 76, 0.7); }
.hv-l-nav-cta {
  font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--hv-gold); text-decoration: none;
  border: 1px solid var(--hv-line); padding: 10px 20px; border-radius: 999px;
  transition: all 0.3s ease;
}
.hv-l-nav-cta:hover { border-color: var(--hv-gold); background: rgba(212, 162, 76, 0.08); }

/* HERO */
.hv-l-hero { padding: 80px 0 100px; text-align: center; }
.hv-l-eyebrow {
  display: inline-flex; align-items: center; gap: 10px;
  font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase;
  color: var(--hv-gold); margin-bottom: 32px;
  padding: 8px 18px; border: 1px solid var(--hv-line); border-radius: 999px;
  background: rgba(212, 162, 76, 0.04);
}
.hv-l-eyebrow::before {
  content: ''; width: 5px; height: 5px;
  background: var(--hv-gold); border-radius: 50%;
  box-shadow: 0 0 10px var(--hv-gold);
  animation: hvPulse 2s ease-in-out infinite;
}
@keyframes hvPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.hv-landing h1 {
  font-family: 'Fraunces', serif; font-weight: 500;
  font-size: clamp(42px, 7vw, 84px); line-height: 1.02; letter-spacing: -0.03em;
  color: var(--hv-ivory); margin: 0 0 28px;
}
.hv-landing h1 .hv-l-italic { font-style: normal; color: var(--hv-gold); font-weight: 500; }

.hv-l-hero-sub { font-size: 19px; color: var(--hv-muted); max-width: 620px; margin: 0 auto 48px; line-height: 1.5; }

.hv-l-cta-row { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; margin-bottom: 60px; }
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
.hv-l-btn-secondary { background: transparent; color: var(--hv-ivory); border: 1px solid var(--hv-line); }
.hv-l-btn-secondary:hover { border-color: var(--hv-gold); background: rgba(212, 162, 76, 0.05); }
.hv-l-btn-outline-gold { background: transparent; color: var(--hv-gold); border: 1px solid var(--hv-gold); }
.hv-l-btn-outline-gold:hover { background: rgba(212, 162, 76, 0.08); border-color: var(--hv-gold-bright); color: var(--hv-gold-bright); }

/* Hero cards */
.hv-l-hero-cards {
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  max-width: 760px; margin: 0 auto 32px;
}
@media (max-width: 640px) { .hv-l-hero-cards { grid-template-columns: 1fr; } }
.hv-l-hero-card {
  background: linear-gradient(180deg, rgba(212, 162, 76, 0.04) 0%, transparent 100%);
  border: 1px solid var(--hv-line); border-radius: 20px;
  padding: 32px 28px; text-align: left;
  display: flex; flex-direction: column; gap: 10px;
  transition: all 0.3s ease;
}
.hv-l-hero-card:hover { border-color: rgba(212, 162, 76, 0.4); box-shadow: var(--hv-shadow-gold); }
.hv-l-hero-card-label { font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--hv-gold); }
.hv-l-hero-card-title { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 500; color: var(--hv-ivory); margin: 0; letter-spacing: -0.01em; }
.hv-l-hero-card-sub { font-size: 14px; color: var(--hv-muted); margin: 0 0 8px; line-height: 1.5; }
.hv-l-hero-card-btn { align-self: flex-start; margin-top: auto; }

.hv-l-hero-review-cta { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 60px; }
.hv-l-hero-review-note { font-size: 13px; color: var(--hv-muted); }

/* Hero search */
.hv-l-search {
  display: flex; align-items: center; gap: 8px;
  max-width: 640px; margin: 0 auto 20px;
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
  font-family: 'Inter', sans-serif; font-size: 15px; color: var(--hv-ivory);
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

.hv-l-hero-links {
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
  max-width: 640px; margin: 0 auto 18px;
  flex-wrap: wrap;
}
.hv-l-hero-link {
  font-size: 13px; color: var(--hv-muted); text-decoration: none;
  transition: color 0.25s ease;
}
.hv-l-hero-link:hover { color: var(--hv-gold); }

.hv-l-hero-premium {
  font-size: 13px; color: var(--hv-gold);
  text-align: center; margin: 0 auto;
  letter-spacing: 0.02em;
}

/* Video placeholder */
.hv-l-video-wrap { padding: 60px 24px 40px; display: flex; flex-direction: column; align-items: center; }
.hv-l-video-head { margin-bottom: 40px; }
.hv-l-video-card {
  width: 100%; max-width: 560px; aspect-ratio: 560 / 315;
  border: 1px solid var(--hv-line); border-radius: 20px;
  background: linear-gradient(180deg, rgba(212, 162, 76, 0.04) 0%, rgba(10, 7, 5, 0.6) 100%);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 18px; position: relative;
  transition: all 0.3s ease;
}
.hv-l-video-card:hover { border-color: rgba(212, 162, 76, 0.4); box-shadow: var(--hv-shadow-gold); }
.hv-l-video-play {
  width: 72px; height: 72px; border-radius: 50%;
  border: 1px solid var(--hv-gold);
  background: rgba(212, 162, 76, 0.08); color: var(--hv-gold);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.3s ease;
  padding-left: 4px;
}
.hv-l-video-play:hover { background: rgba(212, 162, 76, 0.18); transform: scale(1.05); }
.hv-l-video-caption { font-size: 13px; color: var(--hv-muted); }


.hv-l-trust-strip {
  display: flex; justify-content: center; gap: 48px; flex-wrap: wrap;
  padding-top: 40px; border-top: 1px solid var(--hv-line);
  max-width: 700px; margin: 0 auto;
}
.hv-l-trust-item { text-align: center; }
.hv-l-trust-num { font-family: 'Fraunces', serif; font-size: 36px; color: var(--hv-gold); font-weight: 500; font-style: italic; line-height: 1; }
.hv-l-trust-label { font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--hv-muted); margin-top: 8px; }

/* MANIFESTO */
.hv-l-manifesto { padding: 100px 0; text-align: center; }
.hv-l-section-label { font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--hv-gold); margin-bottom: 24px; }
.hv-l-manifesto-quote {
  font-family: 'Fraunces', serif; font-style: normal; font-weight: 500;
  font-size: clamp(28px, 4vw, 44px); line-height: 1.3; color: var(--hv-ivory);
  max-width: 880px; margin: 0 auto; letter-spacing: -0.01em;
}
.hv-l-manifesto-quote .hv-l-accent { color: var(--hv-gold); }
.hv-l-divider { width: 60px; height: 1px; background: var(--hv-gold); margin: 40px auto; position: relative; }
.hv-l-divider::before, .hv-l-divider::after {
  content: ''; position: absolute; top: 50%;
  width: 4px; height: 4px; background: var(--hv-gold); border-radius: 50%;
  transform: translateY(-50%);
}
.hv-l-divider::before { left: -12px; }
.hv-l-divider::after { right: -12px; }

/* HOW */
.hv-l-how { padding: 80px 0 120px; }
.hv-l-section-head { text-align: center; margin-bottom: 80px; }
.hv-landing h2 { font-family: 'Fraunces', serif; font-weight: 500; font-size: clamp(36px, 5vw, 56px); letter-spacing: -0.02em; color: var(--hv-ivory); line-height: 1.1; margin: 0; }
.hv-landing h2 .hv-l-italic { font-style: normal; color: var(--hv-gold); }

.hv-l-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
@media (max-width: 768px) { .hv-l-steps { grid-template-columns: 1fr; } }
.hv-l-step {
  position: relative; padding: 40px 32px;
  border: 1px solid var(--hv-line); border-radius: 20px;
  background: linear-gradient(180deg, rgba(212, 162, 76, 0.03) 0%, transparent 100%);
  transition: all 0.4s ease;
}
.hv-l-step:hover { border-color: rgba(212, 162, 76, 0.4); transform: translateY(-4px); box-shadow: var(--hv-shadow-gold); }
.hv-l-step-num { font-family: 'Fraunces', serif; font-style: italic; font-size: 56px; font-weight: 400; color: var(--hv-gold); line-height: 1; margin-bottom: 20px; opacity: 0.9; }
.hv-l-step-title { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 600; color: var(--hv-ivory); margin: 0 0 12px; letter-spacing: -0.01em; }
.hv-l-step-desc { font-size: 15px; color: var(--hv-muted); line-height: 1.6; margin: 0; }

/* FEATURES */
.hv-l-features { padding: 80px 0 120px; background: linear-gradient(180deg, transparent 0%, rgba(212, 162, 76, 0.02) 50%, transparent 100%); position: relative; z-index: 2; }
.hv-l-feature-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 1px; background: var(--hv-line);
  border: 1px solid var(--hv-line); border-radius: 24px; overflow: hidden;
}
@media (max-width: 640px) { .hv-l-feature-grid { grid-template-columns: 1fr; } }
.hv-l-feature { background: var(--hv-bg); padding: 44px 36px; transition: background 0.3s ease; }
.hv-l-feature:hover { background: var(--hv-bg-soft); }
.hv-l-feature-icon {
  width: 48px; height: 48px; border-radius: 50%;
  border: 1px solid var(--hv-gold); display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px; color: var(--hv-gold);
}
.hv-l-feature-title { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 600; color: var(--hv-ivory); margin: 0 0 10px; }
.hv-l-feature-desc { font-size: 14px; color: var(--hv-muted); line-height: 1.6; margin: 0; }

/* WHO */
.hv-l-who { padding: 100px 0; }
.hv-l-who-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
@media (max-width: 768px) { .hv-l-who-grid { grid-template-columns: 1fr; } }
.hv-l-who-card { padding: 44px 36px; border: 1px solid var(--hv-line); border-radius: 20px; position: relative; overflow: hidden; }
.hv-l-who-card.hv-l-providers { background: linear-gradient(135deg, rgba(212, 162, 76, 0.08) 0%, transparent 70%); }
.hv-l-who-card.hv-l-buyers { background: linear-gradient(135deg, rgba(212, 162, 76, 0.04) 0%, transparent 70%); }
.hv-l-who-tag { font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--hv-gold); margin-bottom: 16px; }
.hv-l-who-card h3 { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 500; color: var(--hv-ivory); margin: 0 0 16px; letter-spacing: -0.01em; }
.hv-l-who-card p { color: var(--hv-muted); font-size: 15px; line-height: 1.6; margin: 0 0 20px; }
.hv-l-who-list { list-style: none; padding: 0; margin: 0; }
.hv-l-who-list li { padding: 8px 0; color: var(--hv-ivory); font-size: 14px; display: flex; align-items: center; gap: 12px; }
.hv-l-who-list li::before { content: ''; width: 14px; height: 1px; background: var(--hv-gold); flex-shrink: 0; }

/* FINAL */
.hv-l-final { padding: 120px 0; text-align: center; position: relative; }
.hv-l-final::before {
  content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 80%; max-width: 600px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--hv-gold), transparent);
}
.hv-l-final h2 { margin-bottom: 20px; }
.hv-l-final-sub { color: var(--hv-muted); font-size: 17px; margin: 0 auto 40px; max-width: 500px; }

/* FOOTER */
.hv-l-footer { padding: 40px 0; border-top: 1px solid var(--hv-line); text-align: center; color: var(--hv-muted); font-size: 13px; letter-spacing: 0.05em; position: relative; z-index: 2; }
.hv-l-tagline { font-family: 'Fraunces', serif; font-style: italic; color: var(--hv-gold); margin-bottom: 8px; font-size: 15px; }

/* Fade animations */
@keyframes hvFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.hv-l-fade { animation: hvFadeUp 0.8s ease-out both; }
.hv-l-fade-1 { animation-delay: 0.1s; }
.hv-l-fade-2 { animation-delay: 0.25s; }
.hv-l-fade-3 { animation-delay: 0.4s; }
.hv-l-fade-4 { animation-delay: 0.55s; }
.hv-l-fade-5 { animation-delay: 0.7s; }
`;
