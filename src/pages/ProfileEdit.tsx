import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfileCategories } from "@/lib/useProfileCategories";
import { toast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { AvatarCropper } from "@/components/AvatarCropper";

import { normalizeSocialHandle } from "@/lib/socialHandles";
import { KeywordsInput } from "@/components/KeywordsInput";

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const BIO_MAX = 500;
const WEBSITE_MAX = 200;

function normalizeWebsite(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    // Force https
    u.protocol = "https:";
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export default function ProfileEdit() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [category, setCategory] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [youtube, setYoutube] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dynamicCategories = useProfileCategories();

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    setCategory(profile.service_category ?? "");
    setAvatarUrl(profile.avatar_url);
    setWebsite(profile.website_url ?? "");
    const p = profile as typeof profile & {
      instagram_url?: string | null; twitter_url?: string | null; youtube_url?: string | null;
      linkedin_url?: string | null; tiktok_url?: string | null; keywords?: string[] | null;
    };
    setInstagram(p.instagram_url ?? "");
    setTwitter(p.twitter_url ?? "");
    setYoutube(p.youtube_url ?? "");
    setLinkedin(p.linkedin_url ?? "");
    setTiktok(p.tiktok_url ?? "");
    setKeywords(Array.isArray(p.keywords) ? p.keywords : []);
  }, [profile]);

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (loading || !profile) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image.", variant: "destructive" });
      return;
    }
    if (f.size > MAX_AVATAR_BYTES) {
      toast({ title: "Too large", description: "Max 4MB.", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(f);
    setRawSrc(url);
  };

  const onCropped = (blob: Blob) => {
    setCroppedBlob(blob);
    setCroppedPreview(URL.createObjectURL(blob));
    setRawSrc(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.length > 60) return toast({ title: "Display name too long", variant: "destructive" });
    if (bio.length > BIO_MAX) return toast({ title: "Bio too long", variant: "destructive" });

    let normalizedWebsite: string | null = null;
    if (website.trim()) {
      if (website.length > WEBSITE_MAX) return toast({ title: "Website URL too long", variant: "destructive" });
      normalizedWebsite = normalizeWebsite(website);
      if (!normalizedWebsite) return toast({ title: "Invalid website URL", description: "Please enter a valid URL like https://yourwebsite.com", variant: "destructive" });
    }

    const socialInputs: { label: string; raw: string; handlePlatform?: "instagram" | "twitter" | "tiktok" | "youtube" | "linkedin" }[] = [
      { label: "Instagram", raw: instagram, handlePlatform: "instagram" },
      { label: "X (Twitter)", raw: twitter, handlePlatform: "twitter" },
      { label: "YouTube", raw: youtube, handlePlatform: "youtube" },
      { label: "LinkedIn", raw: linkedin, handlePlatform: "linkedin" },
      { label: "TikTok", raw: tiktok, handlePlatform: "tiktok" },
    ];
    const normalizedSocials: (string | null)[] = [];
    for (const s of socialInputs) {
      if (!s.raw.trim()) { normalizedSocials.push(null); continue; }
      if (s.raw.length > WEBSITE_MAX) { toast({ title: `${s.label} URL too long`, variant: "destructive" }); return; }
      const candidate = s.handlePlatform ? normalizeSocialHandle(s.handlePlatform, s.raw) : s.raw;
      const n = normalizeWebsite(candidate);
      if (!n) { toast({ title: `Invalid ${s.label} URL`, description: "Please enter a valid URL or handle", variant: "destructive" }); return; }
      normalizedSocials.push(n);
    }
    const [instagramN, twitterN, youtubeN, linkedinN, tiktokN] = normalizedSocials;

    setBusy(true);
    try {
      let nextAvatar = avatarUrl;
      if (croppedBlob) {
        const path = `${profile.id}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, croppedBlob, {
          upsert: true,
          contentType: "image/jpeg",
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
        nextAvatar = pub.publicUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || profile.username,
          bio: bio.trim() || null,
          service_category: category || null,
          avatar_url: nextAvatar,
          website_url: normalizedWebsite,
          instagram_url: instagramN,
          twitter_url: twitterN,
          youtube_url: youtubeN,
          linkedin_url: linkedinN,
          tiktok_url: tiktokN,
          keywords,
        })
        .eq("id", profile.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "Profile saved" });
      nav(`/@${profile.username}`);
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const previewSrc = croppedPreview || avatarUrl;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Settings</p>
      <h1 className="font-display text-3xl font-bold">Edit profile</h1>

      <form onSubmit={submit} className="mt-8 space-y-6">
        {/* Avatar */}
        <div>
          <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Avatar</Label>
          {rawSrc ? (
            <div className="mt-2 rounded-md border border-border bg-card p-3">
              <AvatarCropper
                src={rawSrc}
                onCancel={() => { setRawSrc(null); if (fileRef.current) fileRef.current.value = ""; }}
                onCropped={onCropped}
              />
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-2xl text-muted-foreground">
                {previewSrc ? (
                  <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  (displayName || profile.username).slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="space-y-1">
                <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> {croppedPreview ? "Replace image" : "Upload image"}
                </Button>
                <p className="text-xs text-muted-foreground">Drag to pan, slide to zoom. Max 4MB.</p>
              </div>
            </div>
          )}
        </div>

        {/* Display name */}
        <Field label="Display name" hint={`${displayName.length}/60`}>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value.slice(0, 60))} maxLength={60} />
        </Field>

        {/* Service category */}
        <Field label="Service category">
          {(() => {
            const matched = dynamicCategories.find((c) => c.toLowerCase() === category.toLowerCase());
            const isPreset = !!matched && matched !== "Other";
            const selectValue = category === "" ? "" : isPreset ? matched : "Other";
            return (
              <>
                <Select
                  value={selectValue}
                  onValueChange={(v) => setCategory(v === "Other" ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
                  <SelectContent>
                    {dynamicCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectValue === "Other" && (
                  <Input
                    className="mt-2"
                    value={category}
                    onChange={(e) => setCategory(e.target.value.slice(0, 60))}
                    placeholder="Enter a custom category"
                    maxLength={60}
                  />
                )}
              </>
            );
          })()}
        </Field>

        {/* Bio */}
        <Field label="Bio" hint={`${bio.length}/${BIO_MAX}`}>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
            rows={6}
            maxLength={BIO_MAX}
            placeholder="Tell people what you do, who you help, and what results they can expect. Line breaks are preserved."
          />
        </Field>

        {/* Website */}
        <Field label="Website (optional)">
          <Input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value.slice(0, WEBSITE_MAX))}
            maxLength={WEBSITE_MAX}
            placeholder="https://yourwebsite.com"
          />
          <p className="text-[11px] text-muted-foreground">
            Your main site or professional link. Shown publicly on your profile.
          </p>
        </Field>

        {/* Social links */}
        <Field label="Instagram (optional)">
          <Input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value.slice(0, WEBSITE_MAX))} maxLength={WEBSITE_MAX} placeholder="@yourhandle" />
        </Field>
        <Field label="X / Twitter (optional)">
          <Input type="text" value={twitter} onChange={(e) => setTwitter(e.target.value.slice(0, WEBSITE_MAX))} maxLength={WEBSITE_MAX} placeholder="@yourhandle" />
        </Field>
        <Field label="YouTube (optional)">
          <Input type="text" value={youtube} onChange={(e) => setYoutube(e.target.value.slice(0, WEBSITE_MAX))} maxLength={WEBSITE_MAX} placeholder="@yourchannel" />
        </Field>
        <Field label="LinkedIn (optional)">
          <Input type="text" value={linkedin} onChange={(e) => setLinkedin(e.target.value.slice(0, WEBSITE_MAX))} maxLength={WEBSITE_MAX} placeholder="yourname or full URL" />
        </Field>
        <Field label="TikTok (optional)">
          <Input type="text" value={tiktok} onChange={(e) => setTiktok(e.target.value.slice(0, WEBSITE_MAX))} maxLength={WEBSITE_MAX} placeholder="@yourhandle" />
        </Field>

        <Field label="Keywords">
          <p className="-mt-1 mb-1 text-[11px] text-muted-foreground">Add terms that describe your niche, specialty, or offers. Helps people find you.</p>
          <KeywordsInput value={keywords} onChange={setKeywords} />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
          <Button type="button" variant="outline" onClick={() => nav(`/@${profile.username}`)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</Label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
