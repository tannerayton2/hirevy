import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "@/hooks/use-toast";

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

  if (!loading && user) return <Navigate to={safeRedirect ?? "/explore"} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      nav(safeRedirect ?? "/explore", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      toast({ title: "Couldn't sign in", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

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
