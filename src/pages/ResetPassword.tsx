import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "@/hooks/use-toast";

const goldStyle = {
  background: "linear-gradient(135deg,#FFE98A,#FFD700,#B8860B)",
  color: "#2a1c00",
};

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const url = new URL(window.location.href);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        // Surface explicit errors from Supabase (expired/invalid links)
        const errDesc = hash.get("error_description") ?? url.searchParams.get("error_description");
        if (errDesc) {
          if (!cancelled) setInitError(errDesc);
          return;
        }

        // Newer PKCE flow: ?code=...
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          // Clean the URL
          window.history.replaceState({}, "", url.pathname);
          if (!cancelled) setReady(true);
          return;
        }

        // Legacy hash flow: #access_token=...&type=recovery
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          window.history.replaceState({}, "", url.pathname);
          if (!cancelled) setReady(true);
          return;
        }

        // Fallback: already-authenticated recovery session
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session) setReady(true);
      } catch (e) {
        if (!cancelled) setInitError(e instanceof Error ? e.message : "Invalid or expired reset link.");
      }
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setBusy(false);
      toast({ title: "Couldn't update password", description: error.message, variant: "destructive" });
      return;
    }
    // Sign out so the user explicitly signs in with their new password
    await supabase.auth.signOut();
    setBusy(false);
    setSuccess(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Logo className="text-2xl" />
          <h1 className="mt-6 font-display text-2xl font-bold">
            {success ? "All set" : "Set a new password"}
          </h1>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Password updated. You can now sign in.
            </p>
            <Button asChild className="h-11 w-full font-semibold" style={goldStyle}>
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        ) : initError ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-destructive">{initError}</p>
            <Button asChild variant="outline" className="h-11 w-full font-semibold">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          </div>
        ) : (
          <>
            {!ready && (
              <p className="text-center text-xs text-muted-foreground">
                Verifying reset link…
              </p>
            )}
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">New password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Confirm password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
              </div>
              <Button
                type="submit"
                disabled={busy || !ready}
                className="h-11 w-full font-semibold"
                style={goldStyle}
              >
                {busy ? "Saving…" : "Submit"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
