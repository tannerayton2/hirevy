import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { AtSign, KeyRound, User as UserIcon, ExternalLink } from "lucide-react";

const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;

export default function AccountSettings() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const nav = useNavigate();

  // Username
  const [username, setUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  // Display name (quick edit)
  const [displayName, setDisplayName] = useState("");
  const [savingDisplay, setSavingDisplay] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username);
    setDisplayName(profile.display_name ?? "");
  }, [profile]);

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (loading || !profile || !user) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  const hasPasswordIdentity = !!user.identities?.some((i) => i.provider === "email");
  const email = user.email ?? "";

  const submitUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim().toLowerCase();
    if (clean === profile.username) {
      toast({ title: "That's already your handle." });
      return;
    }
    if (!USERNAME_RE.test(clean)) {
      toast({
        title: "Invalid handle",
        description: "3–30 chars. Lowercase letters, numbers, underscores, or hyphens.",
        variant: "destructive",
      });
      return;
    }
    setSavingUsername(true);
    const { error } = await supabase.rpc("update_my_username", { p_new_username: clean });
    setSavingUsername(false);
    if (error) {
      toast({ title: "Couldn't change handle", description: error.message, variant: "destructive" });
      return;
    }
    await refreshProfile();
    toast({ title: "Handle updated", description: `You're now @${clean}.` });
    nav(`/@${clean}`);
  };

  const submitDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = displayName.trim();
    if (clean.length > 60) {
      toast({ title: "Display name too long (max 60).", variant: "destructive" });
      return;
    }
    setSavingDisplay(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: clean || null })
      .eq("id", profile.id);
    setSavingDisplay(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    await refreshProfile();
    toast({ title: "Display name saved" });
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPasswordIdentity) {
      toast({
        title: "No password set",
        description: "This account signs in with a social provider only.",
        variant: "destructive",
      });
      return;
    }
    if (newPw.length < 8) {
      toast({ title: "New password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPw === currentPw) {
      toast({ title: "New password must differ from current password.", variant: "destructive" });
      return;
    }

    setSavingPw(true);
    // Re-authenticate to verify the current password
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email,
      password: currentPw,
    });
    if (reauthErr) {
      setSavingPw(false);
      toast({ title: "Current password is incorrect", variant: "destructive" });
      return;
    }
    const { error: updErr } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (updErr) {
      toast({ title: "Couldn't update password", description: updErr.message, variant: "destructive" });
      return;
    }
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    toast({ title: "Password updated", description: "Use your new password next time you sign in." });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Settings</p>
      <h1 className="font-display text-3xl font-bold">Account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Signed in as <span className="text-foreground">{email}</span>
      </p>

      {/* Handle */}
      <Section icon={<AtSign className="h-4 w-4" />} title="Handle" description="Your public URL: /@handle. Changing it will break links pointing at your old handle.">
        <form onSubmit={submitUsername} className="space-y-3">
          <div className="flex items-center rounded-md border border-border bg-background focus-within:ring-1 focus-within:ring-primary">
            <span className="select-none px-3 text-sm text-muted-foreground">@</span>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30))}
              className="border-0 focus-visible:ring-0"
              placeholder="yourhandle"
              maxLength={30}
              autoComplete="off"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">3–30 chars. Lowercase letters, numbers, underscores, or hyphens.</p>
          <Button type="submit" disabled={savingUsername || username === profile.username}>
            {savingUsername ? "Saving…" : "Save handle"}
          </Button>
        </form>
      </Section>

      {/* Display name */}
      <Section icon={<UserIcon className="h-4 w-4" />} title="Display name" description="Shown on your profile and reviews.">
        <form onSubmit={submitDisplayName} className="space-y-3">
          <Label htmlFor="displayName" className="sr-only">Display name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 60))}
            maxLength={60}
            placeholder="Your name"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={savingDisplay || (displayName.trim() === (profile.display_name ?? ""))}>
              {savingDisplay ? "Saving…" : "Save name"}
            </Button>
            <Button asChild type="button" variant="outline">
              <Link to="/settings/profile">
                Edit full profile <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </form>
      </Section>

      {/* Password */}
      <Section icon={<KeyRound className="h-4 w-4" />} title="Password" description={
        hasPasswordIdentity
          ? "Change your account password. You'll need your current one."
          : "This account signs in with a social provider. No password change available here."
      }>
        {hasPasswordIdentity && (
          <form onSubmit={submitPassword} className="space-y-3">
            {/* Hidden username for accessibility/password managers */}
            <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
            <div className="space-y-1.5">
              <Label htmlFor="currentPw" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Current password
              </Label>
              <Input
                id="currentPw"
                type="password"
                autoComplete="current-password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPw" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                New password
              </Label>
              <Input
                id="newPw"
                type="password"
                autoComplete="new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                minLength={8}
                required
              />
              <p className="text-[11px] text-muted-foreground">At least 8 characters.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPw" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Confirm new password
              </Label>
              <Input
                id="confirmPw"
                type="password"
                autoComplete="new-password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" disabled={savingPw}>
              {savingPw ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 rounded-md border border-border bg-card p-5 md:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
          {icon}
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
