import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const USERNAME_RE = /^[a-z0-9-]{3,30}$/;

export default function Onboarding() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.username) setUsername(profile.username);
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile]);

  if (!loading && !user) return <Navigate to="/auth" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!USERNAME_RE.test(username)) {
      toast({ title: "Invalid username", description: "Lowercase letters, numbers, hyphens. 3–30 chars.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username, display_name: displayName || username })
        .eq("id", user!.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "You're all set", description: `Your profile is at /@${username}` });
      nav(`/@${username}`, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save";
      toast({
        title: "Couldn't save",
        description: message.includes("duplicate") ? "That username is taken." : message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Step 1 of 1</p>
        <h1 className="font-display text-3xl font-semibold">Claim your handle</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is your public URL on HireVy. You can share it with past clients to collect reviews.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Username</Label>
            <div className="flex items-center overflow-hidden rounded-md border border-input bg-input">
              <span className="border-r border-border bg-secondary px-3 py-2 text-sm text-muted-foreground">hirevy.com/@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                placeholder="your-handle"
                maxLength={30}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">Lowercase letters, numbers, hyphens. 3–30 characters.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How you want to be shown" />
          </div>
          <Button type="submit" disabled={busy} className="w-full">Continue</Button>
        </form>
      </div>
    </div>
  );
}
