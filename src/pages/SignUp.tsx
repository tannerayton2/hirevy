import { useEffect, useMemo, useRef, useState } from "react";
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
import { Check, X, Loader2 } from "lucide-react";

const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;

type UsernameStatus = "idle" | "invalid" | "checking" | "available" | "taken" | "error";

export default function SignUp() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirectParam = params.get("redirect");
  const safeRedirect =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : null;

  const [providerType, setProviderType] = useState<"coach" | "service_provider" | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [busy, setBusy] = useState(false);
  const checkSeq = useRef(0);

  // Debounced username availability check
  useEffect(() => {
    const u = username.trim().toLowerCase();
    if (!u) { setUsernameStatus("idle"); return; }
    if (!USERNAME_RE.test(u)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    const seq = ++checkSeq.current;
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", u)
        .maybeSingle();
      if (seq !== checkSeq.current) return;
      if (error) { setUsernameStatus("error"); return; }
      setUsernameStatus(data ? "taken" : "available");
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  if (!loading && user) return <Navigate to={safeRedirect ?? "/explore"} replace />;

  const usernameMsg = useMemo(() => {
    switch (usernameStatus) {
      case "invalid": return "3–30 chars: lowercase letters, numbers, _ or -.";
      case "checking": return "Checking availability…";
      case "available": return "Username available.";
      case "taken": return "That username is taken.";
      case "error": return "Couldn't check availability — try again.";
      default: return "Lowercase, no spaces. This becomes your /@handle and can't be changed later.";
    }
  }, [usernameStatus]);

  const canSubmit =
    !busy &&
    providerType !== null &&
    fullName.trim().length > 0 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) &&
    password.length >= 8 &&
    usernameStatus === "available";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      const cleanUsername = username.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/explore`,
          data: {
            username: cleanUsername,
            display_name: fullName.trim(),
            full_name: fullName.trim(),
            provider_type: providerType,
          },
        },
      });
      if (error) throw error;
      // If email confirmation is required, there will be no session yet.
      if (!data.session) {
        toast({
          title: "Check your inbox",
          description: "We sent a confirmation link to verify your email.",
        });
        nav("/auth", { replace: true });
        return;
      }
      nav("/explore", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't create account";
      toast({ title: "Sign-up failed", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (!providerType) {
      toast({ title: "Pick how you work with clients first", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      // Persist provider type so we can apply it after OAuth returns
      try { sessionStorage.setItem("pending_provider_type", providerType); } catch { /* noop */ }
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/explore`,
      });
      if (result.error) {
        toast({
          title: "Google sign-up failed",
          description: result.error instanceof Error ? result.error.message : "Try again.",
          variant: "destructive",
        });
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      nav("/explore", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-up failed";
      toast({ title: "Sign-up failed", description: message, variant: "destructive" });
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-7">
        <div className="text-center">
          <Logo className="text-2xl" />
          <h1 className="mt-6 font-display text-3xl font-bold">Create your account.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Join the network where coaches and service providers get hired on proof — not promises.
          </p>
        </div>

        {/* Provider type selector */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            How do you work with clients?
          </Label>
          <div className="grid grid-cols-1 gap-2.5">
            {([
              { value: "coach", title: "Coach", desc: "1:1 coaching — you work directly with clients" },
              { value: "service_provider", title: "Service Provider", desc: "Done-for-you — you deliver the work for clients" },
            ] as const).map((opt) => {
              const active = providerType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProviderType(opt.value)}
                  className={
                    "rounded-2xl border p-4 text-left transition " +
                    (active
                      ? "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary))]"
                      : "border-border/60 bg-secondary/40 hover:border-primary/40 hover:bg-secondary/70")
                  }
                  aria-pressed={active}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base font-semibold">{opt.title}</span>
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <Button
          type="button"
          onClick={handleGoogle}
          disabled={busy || !providerType}
          variant="outline"
          className="h-11 w-full"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 16.3 4.5 9.7 8.7 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5.2 0 9.8-1.7 13.2-4.7l-6.1-5c-2 1.4-4.4 2.2-7.1 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.6 5.1C9.6 39.4 16.2 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6.1 5c-.4.4 6.6-4.8 6.6-14.4 0-1.2-.1-2.3-.4-3.5z"/></svg>
          Continue with Google
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Full name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={80} autoComplete="name" />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            <p className="text-[11px] text-muted-foreground">Minimum 8 characters.</p>
          </Field>
          <Field label="Username">
            <div className="relative">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30))}
                required
                placeholder="your-handle"
                maxLength={30}
                autoComplete="off"
                className="pr-9"
              />
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {usernameStatus === "available" && <Check className="h-4 w-4 text-emerald-500" />}
                {(usernameStatus === "taken" || usernameStatus === "invalid") && <X className="h-4 w-4 text-destructive" />}
              </div>
            </div>
            <p
              className={
                usernameStatus === "available"
                  ? "text-[11px] text-emerald-500"
                  : usernameStatus === "taken" || usernameStatus === "invalid" || usernameStatus === "error"
                  ? "text-[11px] text-destructive"
                  : "text-[11px] text-muted-foreground"
              }
            >
              {usernameMsg}
            </p>
          </Field>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-11 w-full font-semibold"
            style={{ background: "linear-gradient(135deg,#FFE98A,#FFD700,#B8860B)", color: "#2a1c00" }}
          >
            {busy ? "Creating…" : "Create Account"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By creating an account you agree to our{" "}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/auth" className="font-semibold text-primary hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
