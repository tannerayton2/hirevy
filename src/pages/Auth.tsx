import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "@/hooks/use-toast";
import { friendlyErrorMessage } from "@/lib/errors";

export default function Auth() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirectParam = params.get("redirect");
  const safeRedirect =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Two-factor challenge step (only entered when the account has 2FA enabled).
  // pendingMfaCheck guards against the auth listener marking `user` signed-in
  // (as soon as signInWithPassword resolves) before we've had a chance to
  // find out whether a 2FA challenge is still required.
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [pendingMfaCheck, setPendingMfaCheck] = useState(false);

  if (!loading && user && !mfaFactorId && !pendingMfaCheck) {
    return <Navigate to={safeRedirect ?? "/explore"} replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setPendingMfaCheck(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (level && level.nextLevel === "aal2" && level.currentLevel !== "aal2") {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp?.find((f) => f.status === "verified");
        if (totp) {
          setMfaFactorId(totp.id);
          setBusy(false);
          setPendingMfaCheck(false);
          return;
        }
      }
      nav(safeRedirect ?? "/explore", { replace: true });
    } catch (err) {
      const message = friendlyErrorMessage(err, "Sign-in failed");
      toast({ title: "Couldn't sign in", description: message, variant: "destructive" });
      setPendingMfaCheck(false);
    } finally {
      setBusy(false);
    }
  };

  const submitMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId) return;
    setMfaBusy(true);
    try {
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeErr || !challenge) throw challengeErr ?? new Error("Couldn't start verification");
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode.trim(),
      });
      if (verifyErr) {
        toast({ title: "Incorrect code", description: "Check the 6-digit code and try again.", variant: "destructive" });
        return;
      }
      nav(safeRedirect ?? "/explore", { replace: true });
    } catch (err) {
      const message = friendlyErrorMessage(err, "Verification failed");
      toast({ title: "Couldn't verify", description: message, variant: "destructive" });
    } finally {
      setMfaBusy(false);
    }
  };

  if (mfaFactorId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <Logo className="mx-auto" />
            <h1 className="mt-6 font-display text-3xl font-bold">Enter your code</h1>
            <p className="mt-2 text-sm text-muted-foreground">Open your authenticator app and enter the 6-digit code.</p>
          </div>
          <form onSubmit={submitMfa} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mfaCode" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Authentication code</Label>
              <Input
                id="mfaCode"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                autoFocus
                required
              />
            </div>
            <Button
              type="submit"
              disabled={mfaBusy || mfaCode.trim().length < 6}
              className="h-11 w-full font-semibold"
              style={{ background: "linear-gradient(135deg,#FFE98A,#FFD700,#B8860B)", color: "#2a1c00" }}
            >
              {mfaBusy ? "Verifying…" : "Verify"}
            </Button>
          </form>
          <button
            type="button"
            onClick={() => { setMfaFactorId(null); setMfaCode(""); void supabase.auth.signOut(); }}
            className="mx-auto block text-center text-xs text-muted-foreground hover:text-primary"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Logo className="mx-auto" />
          <h1 className="mt-6 font-display text-3xl font-bold">Welcome back.</h1>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Email</Label>
            <Input id="email" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Password</Label>
            <Input id="password" type="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
                Forgot password?
              </Link>
            </div>
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="h-11 w-full font-semibold"
            style={{ background: "linear-gradient(135deg,#FFE98A,#FFD700,#B8860B)", color: "#2a1c00" }}
          >
            {busy ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
