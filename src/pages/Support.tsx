import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MessageCircle } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";

const SUPPORT_EMAIL = "support@aytopus.com";

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "How do I delete my account?",
    a: (
      <>
        Go to <span className="text-foreground">Account Settings → Delete account</span> (in the app, open the
        profile menu in the top right, then "Account Settings"). This permanently deletes your profile, reviews,
        messages, and offers. It can't be undone. If you'd rather we do it for you, email us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
      </>
    ),
  },
  {
    q: "How do I report a fake or abusive review?",
    a: (
      <>
        Open the review and use the report option, or email us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a> with a link
        to the review and a short description of the issue. We review every report.
      </>
    ),
  },
  {
    q: "I'm a coach — how do I claim my profile?",
    a: "Search for your name on Aytopus, open the profile, and look for the claim option. We may ask you to verify your identity before approving the claim.",
  },
  {
    q: "Something looks broken, or I have an idea for the app.",
    a: (
      <>
        We want to hear about it. Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a> or, if
        you're signed in, use "Send us a message" from the profile menu.
      </>
    ),
  },
];

export default function Support() {
  const goBack = useGoBack("/");
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" aria-label="Home"><Logo /></Link>
          <button type="button" onClick={goBack} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>

        <h1 className="font-display text-4xl font-medium tracking-tight text-foreground md:text-5xl">Support</h1>
        <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
          Need help with your account, a review, or anything else on Aytopus? Reach us directly and we'll get back
          to you as soon as we can.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Mail className="h-4 w-4" /> Email {SUPPORT_EMAIL}
          </a>
          {user && (
            <Link
              to="/messages?team=1"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              <MessageCircle className="h-4 w-4" /> Send us a message in-app
            </Link>
          )}
        </div>

        <div className="mt-12 space-y-8">
          <h2 className="font-display text-xl font-semibold text-primary">Frequently asked</h2>
          {faqs.map((f) => (
            <section key={f.q}>
              <h3 className="text-base font-semibold text-foreground">{f.q}</h3>
              <p className="mt-2 text-[15px] leading-7 text-muted-foreground">{f.a}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          See also our{" "}
          <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and{" "}
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </div>
      </div>
    </div>
  );
}
