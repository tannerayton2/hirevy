import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Search, UserCircle2, Upload } from "lucide-react";

type Role = "buyer" | "provider";

const BUYER_CATEGORIES = [
  "Business Coaching", "Sales", "Copywriting", "Fitness",
  "Mindset", "Marketing", "Finance", "Life Coaching",
];

const GOLD_BTN: React.CSSProperties = {
  background: "linear-gradient(135deg,#FFE98A,#FFD700,#B8860B)",
  color: "#2a1c00",
};

export default function Onboarding() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();

  const stepParam = parseInt(params.get("step") || "1", 10);
  const roleParam = params.get("role") as Role | null;

  const setStep = (s: number, role?: Role | null) => {
    const next = new URLSearchParams(params);
    next.set("step", String(s));
    if (role) next.set("role", role);
    setParams(next, { replace: true });
  };

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (loading || !profile) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  const role: Role | null = roleParam ?? (profile.role as Role | null) ?? null;
  const totalSteps = role === "provider" ? 4 : role === "buyer" ? 2 : 1;
  const step = Math.min(Math.max(stepParam, 1), Math.max(totalSteps, 1));

  const finishOnboarding = async (redirectTo: string) => {
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user!.id);
    await refreshProfile();
    nav(redirectTo, { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-8 md:py-12">
      <div className="mb-8 flex items-center justify-between gap-3">
        <Logo className="text-xl" />
        {step > 1 && role && (
          <button
            type="button"
            onClick={async () => {
              if (role === "buyer") await finishOnboarding("/explore");
              else if (step >= 4) await finishOnboarding(`/@${profile.username}`);
              else setStep(step + 1);
            }}
            className="text-xs font-medium text-muted-foreground hover:text-primary"
          >
            Skip for now →
          </button>
        )}
      </div>

      <ProgressBar current={step} total={totalSteps} />

      <div className="mt-10">
        {step === 1 && (
          <Step1Role
            initial={role}
            onContinue={async (chosen) => {
              await supabase.from("profiles").update({ role: chosen }).eq("id", user!.id);
              await refreshProfile();
              setStep(2, chosen);
            }}
          />
        )}

        {role === "buyer" && step === 2 && (
          <BuyerCategories
            initial={(profile.preferred_categories as string[] | undefined) ?? []}
            onSubmit={async (cats) => {
              await supabase
                .from("profiles")
                .update({ preferred_categories: cats })
                .eq("id", user!.id);
              await finishOnboarding("/explore");
            }}
          />
        )}

        {role === "provider" && step === 2 && (
          <ProviderBasics
            profileId={user!.id}
            initialName={profile.display_name ?? ""}
            initialAvatar={profile.avatar_url}
            onContinue={async (displayName, avatarUrl) => {
              await supabase
                .from("profiles")
                .update({
                  display_name: displayName.trim() || profile.username,
                  avatar_url: avatarUrl,
                })
                .eq("id", user!.id);
              await refreshProfile();
              setStep(3);
            }}
          />
        )}

        {role === "provider" && step === 3 && (
          <ProviderBio
            initial={profile.bio ?? ""}
            onContinue={async (bio) => {
              await supabase
                .from("profiles")
                .update({ bio: bio.trim() || null })
                .eq("id", user!.id);
              await refreshProfile();
              setStep(4);
            }}
          />
        )}

        {role === "provider" && step === 4 && (
          <ProviderLinks
            initial={{
              instagram_url: profile.instagram_url ?? "",
              website_url: profile.website_url ?? "",
              twitter_url: profile.twitter_url ?? "",
              youtube_url: profile.youtube_url ?? "",
              tiktok_url: profile.tiktok_url ?? "",
            }}
            onContinue={async (links) => {
              await supabase
                .from("profiles")
                .update({
                  instagram_url: links.instagram_url || null,
                  website_url: links.website_url || null,
                  twitter_url: links.twitter_url || null,
                  youtube_url: links.youtube_url || null,
                  tiktok_url: links.tiktok_url || null,
                })
                .eq("id", user!.id);
              await finishOnboarding(`/@${profile.username}`);
            }}
          />
        )}
      </div>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / Math.max(1, total)) * 100);
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Step {current} of {total}
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#FFE98A,#FFD700,#B8860B)" }}
        />
      </div>
    </div>
  );
}

function Step1Role({
  initial,
  onContinue,
}: {
  initial: Role | null;
  onContinue: (role: Role) => void | Promise<void>;
}) {
  const [choice, setChoice] = useState<Role | null>(initial);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-7">
      <h1 className="font-display text-3xl font-bold">What brings you to HireVy?</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <RoleCard
          active={choice === "buyer"}
          onClick={() => setChoice("buyer")}
          icon={<Search className="h-6 w-6" strokeWidth={1.5} />}
          title="I want to find trusted coaches"
          desc="Search reviews, compare coaches, hire with confidence."
        />
        <RoleCard
          active={choice === "provider"}
          onClick={() => setChoice("provider")}
          icon={<UserCircle2 className="h-6 w-6" strokeWidth={1.5} />}
          title="I'm a coach or service provider"
          desc="Build your verified reputation and get discovered."
        />
      </div>
      <Button
        disabled={!choice || busy}
        onClick={async () => { if (choice) { setBusy(true); await onContinue(choice); setBusy(false); } }}
        className="h-11 w-full font-semibold"
        style={GOLD_BTN}
      >
        Continue
      </Button>
    </div>
  );
}

function RoleCard({
  active, onClick, icon, title, desc,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border bg-card p-5 text-left transition-all",
        active ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50",
      )}
    >
      <span className={cn("rounded-md p-2", active ? "bg-primary/15 text-primary" : "bg-muted/60 text-foreground/70")}>
        {icon}
      </span>
      <span className="font-display text-base font-bold">{title}</span>
      <span className="text-xs leading-relaxed text-muted-foreground">{desc}</span>
    </button>
  );
}

function BuyerCategories({
  initial, onSubmit,
}: { initial: string[]; onSubmit: (cats: string[]) => Promise<void> }) {
  const [picked, setPicked] = useState<Set<string>>(new Set(initial));
  const [busy, setBusy] = useState(false);
  const toggle = (c: string) => {
    const next = new Set(picked);
    if (next.has(c)) next.delete(c); else next.add(c);
    setPicked(next);
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">What are you looking for?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Select all that apply — we'll personalize your feed.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {BUYER_CATEGORIES.map((c) => {
          const active = picked.has(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground/90 hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
              )}
            >
              {c}
            </button>
          );
        })}
      </div>
      <Button
        disabled={busy}
        onClick={async () => { setBusy(true); await onSubmit(Array.from(picked)); setBusy(false); }}
        className="h-11 w-full font-semibold"
        style={GOLD_BTN}
      >
        Start exploring →
      </Button>
    </div>
  );
}

function ProviderBasics({
  profileId,
  initialName,
  initialAvatar,
  onContinue,
}: {
  profileId: string;
  initialName: string;
  initialAvatar: string | null;
  onContinue: (name: string, avatarUrl: string | null) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatar);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Choose an image.", variant: "destructive" });
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      toast({ title: "Too large", description: "Max 4MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${profileId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, f, {
        upsert: true,
        contentType: f.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(pub.publicUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Couldn't upload", description: message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Set up your profile.</h1>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Display name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Profile photo (optional)</Label>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-2xl text-muted-foreground">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : (name || "?").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="mr-1.5 h-3.5 w-3.5" /> {uploading ? "Uploading…" : avatarUrl ? "Replace photo" : "Upload photo"}
            </Button>
            <p className="mt-1 text-[11px] text-muted-foreground">Profiles with photos get 3x more views.</p>
          </div>
        </div>
      </div>

      <Button
        disabled={busy}
        onClick={async () => { setBusy(true); await onContinue(name, avatarUrl); setBusy(false); }}
        className="h-11 w-full font-semibold"
        style={GOLD_BTN}
      >
        Continue
      </Button>
    </div>
  );
}

function ProviderBio({
  initial, onContinue,
}: { initial: string; onContinue: (bio: string) => Promise<void> }) {
  const [bio, setBio] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Tell people what you do.</h1>
      <div className="space-y-1.5">
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 120))}
          rows={4}
          maxLength={120}
          placeholder="I help [who] achieve [what] through [how]."
        />
        <p className="text-[11px] text-muted-foreground">{bio.length}/120</p>
      </div>
      <Button
        disabled={busy}
        onClick={async () => { setBusy(true); await onContinue(bio); setBusy(false); }}
        className="h-11 w-full font-semibold"
        style={GOLD_BTN}
      >
        Continue
      </Button>
    </div>
  );
}

type LinkFields = {
  instagram_url: string;
  website_url: string;
  twitter_url: string;
  youtube_url: string;
  tiktok_url: string;
};

function ProviderLinks({
  initial, onContinue,
}: { initial: LinkFields; onContinue: (links: LinkFields) => Promise<void> }) {
  const [links, setLinks] = useState<LinkFields>(initial);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof LinkFields) => (v: string) => setLinks((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Add your links.</h1>
      <div className="space-y-3">
        <LinkField label="Instagram" placeholder="https://instagram.com/yourhandle" value={links.instagram_url} onChange={set("instagram_url")} />
        <LinkField label="Website" placeholder="https://yourwebsite.com" value={links.website_url} onChange={set("website_url")} />
        <LinkField label="Twitter / X" placeholder="https://x.com/yourhandle" value={links.twitter_url} onChange={set("twitter_url")} />
        <LinkField label="YouTube" placeholder="https://youtube.com/@yourchannel" value={links.youtube_url} onChange={set("youtube_url")} />
        <LinkField label="TikTok" placeholder="https://tiktok.com/@yourhandle" value={links.tiktok_url} onChange={set("tiktok_url")} />
      </div>
      <p className="text-xs text-muted-foreground">Links help buyers verify you're the real deal.</p>
      <Button
        disabled={busy}
        onClick={async () => { setBusy(true); await onContinue(links); setBusy(false); }}
        className="h-11 w-full font-semibold"
        style={GOLD_BTN}
      >
        Continue →
      </Button>
    </div>
  );
}

function LinkField({
  label, placeholder, value, onChange,
}: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</Label>
      <Input type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
