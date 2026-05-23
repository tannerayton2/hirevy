import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't send reset link", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6 text-center">
        <Logo className="text-2xl" />
        <h1 className="font-display text-2xl font-bold">Reset your password</h1>
        {sent ? (
          <p className="text-sm text-muted-foreground">
            If an account exists for {email}, we sent a reset link. Check your inbox.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full font-semibold"
              style={{ background: "linear-gradient(135deg,#FFE98A,#FFD700,#B8860B)", color: "#2a1c00" }}
            >
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
        <Link to="/auth" className="block text-sm text-muted-foreground hover:text-primary">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
