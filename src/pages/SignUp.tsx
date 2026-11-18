// Sign up: email + password (or Google). Nothing else — the name for the card is asked
// at the Stripe step, and the database makes the internal username automatically.
import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { friendlyErrorMessage } from "@/lib/errors";
import { isNativeApp, webOrigin } from "@/lib/platform";

export default function SignUp() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirectParam = params.get("redirect");
  const safeRedirect =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//") ? redirectParam : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={safeRedirect ?? "/card"} replace />;

  const canSubmit = !busy && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) && password.length >= 8;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${webOrigin}/card` },
      });
      if (error) throw error;
      // If email confirmation is required, there's no session yet.
      if (!data.session) {
        toast({ title: "Check your inbox", description: "Tap the link we sent to confirm your email, then you're in." });
        nav("/auth", { replace: true });
        return;
      }
      nav(safeRedirect ?? "/card", { replace: true });
    } catch (err) {
      toast({ title: "Sign-up failed", description: friendlyErrorMessage(err, "Couldn't create account"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/card` });
      if (result.error) {
        toast({ title: "Google sign-up failed", description: friendlyErrorMessage(result.error, "Try again."), variant: "destructive" });
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      nav(safeRedirect ?? "/card", { replace: true });
    } catch (err) {
      toast({ title: "Sign-up failed", description: friendlyErrorMessage(err, "Google sign-up failed"), variant: "destructive" });
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-7">
        <div className="text-center">
          <Link to="/proofcard" aria-label="Aytopus" className="inline-block">
            <Logo className="mx-auto" />
          </Link>
          <p className="mt-8 font-mono text-[10.5px] uppercase tracking-[0.22em] text-primary">Step 1 of 2</p>
          <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.03em]">Get your proof card.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Make an account, then connect Stripe. That's it.</p>
        </div>

        {/* Google OAuth goes through a web-only broker that can't return into the native app. */}
        {!isNativeApp && (
          <>
            <Button type="button" onClick={handleGoogle} disabled={busy} variant="outline" size="lg" className="w-full">
              <svg className="mr-1 h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 16.3 4.5 9.7 8.7 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 43.5c5.2 0 9.8-1.7 13.2-4.7l-6.1-5c-2 1.4-4.4 2.2-7.1 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.6 5.1C9.6 39.4 16.2 43.5 24 43.5z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6.1 5c-.4.4 6.6-4.8 6.6-14.4 0-1.2-.1-2.3-.4-3.5z" />
              </svg>
              Continue with Google
            </Button>
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>
          </>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="h-12 rounded-full px-5" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="h-12 rounded-full px-5" />
            <p className="pl-5 text-[11px] text-muted-foreground">At least 8 characters.</p>
          </div>
          <Button type="submit" size="lg" disabled={!canSubmit} className="w-full">
            {busy ? "Creating…" : "Continue"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to our <Link to="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have a card?{" "}
          <Link to="/auth" className="font-semibold text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
