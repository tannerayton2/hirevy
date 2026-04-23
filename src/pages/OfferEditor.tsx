import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES, isValidVideoUrl, slugify } from "@/lib/categories";
import { toast } from "@/hooks/use-toast";
import { Upload, X, Sparkles, Link as LinkIcon, MessageSquare } from "lucide-react";

const MAX_COVER_BYTES = 2 * 1024 * 1024;
const MAX_TAGS = 10;
const SHORT_DESC_MAX = 300;
const LONG_DESC_MAX = 5000;
const LABEL_MAX = 24;

const CTA_PRESETS = ["Book Now", "Apply", "Learn More", "Visit Sales Page", "Start Free Trial", "Buy Now"];
const SECONDARY_PRESETS = ["Learn More", "See Details", "Watch Demo", "Read More"];

type OfferType = "paid" | "free";
type Mode = "linkout" | "hosted";
type TierLabel = "none" | "Entry" | "Mid" | "VIP";

function isValidHttpsUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function OfferEditor() {
  const { offerId } = useParams();
  const [params] = useSearchParams();
  const isEdit = !!offerId;
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const initialType = (params.get("type") === "free" ? "free" : "paid") as OfferType;
  const [mode, setMode] = useState<Mode>("linkout");
  const [offerType, setOfferType] = useState<OfferType>(initialType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(""); // serves both short + long
  const [priceUsd, setPriceUsd] = useState("");
  const [category, setCategory] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hydrating, setHydrating] = useState(isEdit);

  // Link-out fields
  const [ctaLink, setCtaLink] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Book Now");
  const [secondaryLink, setSecondaryLink] = useState("");
  const [secondaryLabel, setSecondaryLabel] = useState("Learn More");
  const [offerTier, setOfferTier] = useState<TierLabel>("none");

  useEffect(() => {
    if (!isEdit || !user) return;
    void (async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("id", offerId!)
        .maybeSingle();
      if (error || !data) {
        toast({ title: "Offer not found", variant: "destructive" });
        nav(-1);
        return;
      }
      const row = data as Record<string, unknown>;
      if (row.provider_id !== user.id) {
        toast({ title: "Not your offer", variant: "destructive" });
        nav(-1);
        return;
      }
      setTitle(row.title as string);
      setDescription((row.description as string) ?? "");
      setOfferType(row.free_for_testimonial ? "free" : "paid");
      setPriceUsd(row.price_cents != null ? String((row.price_cents as number) / 100) : "");
      setCategory(row.category as string);
      setVideoUrl((row.video_url as string) ?? "");
      setTags((row.tags as string[]) ?? []);
      setCoverUrl(row.cover_url as string | null);
      setIsActive(row.is_active as boolean);
      setIsPinned(!!row.is_pinned);
      setMode(row.hosted_on_hirevy ? "hosted" : "linkout");
      setCtaLink((row.cta_link as string) ?? "");
      setCtaLabel((row.cta_label as string) ?? "Book Now");
      setSecondaryLink((row.secondary_link as string) ?? "");
      setSecondaryLabel((row.secondary_link_label as string) ?? "Learn More");
      const tierVal = row.offer_tier as string | null;
      setOfferTier((tierVal === "Entry" || tierVal === "Mid" || tierVal === "VIP") ? tierVal : "none");
      setHydrating(false);
    })();
  }, [isEdit, offerId, user, nav]);

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (loading || hydrating || !profile) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image.", variant: "destructive" });
      return;
    }
    if (f.size > MAX_COVER_BYTES) {
      toast({ title: "Too large", description: "Max 2MB.", variant: "destructive" });
      return;
    }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const addTag = (raw: string) => {
    const cleaned = raw.trim().toLowerCase().replace(/[,]+/g, "").slice(0, 24);
    if (!cleaned) return;
    setTags((prev) => {
      if (prev.includes(cleaned) || prev.length >= MAX_TAGS) return prev;
      return [...prev, cleaned];
    });
  };

  const onTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (tagInput) { addTag(tagInput); setTagInput(""); }
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags((p) => p.slice(0, -1));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length > 80) return toast({ title: "Title required (max 80 chars)", variant: "destructive" });

    const descMax = mode === "hosted" ? LONG_DESC_MAX : SHORT_DESC_MAX;
    if (!description.trim() || description.length > descMax) {
      return toast({ title: `Description required (max ${descMax} chars)`, variant: "destructive" });
    }
    if (!category) return toast({ title: "Pick a category", variant: "destructive" });
    if (!coverFile && !coverUrl) return toast({ title: "Cover image required", variant: "destructive" });

    if (mode === "linkout") {
      if (!ctaLink.trim() || !isValidHttpsUrl(ctaLink.trim())) {
        return toast({ title: "CTA link required", description: "Must start with https://", variant: "destructive" });
      }
      if (!ctaLabel.trim() || ctaLabel.length > LABEL_MAX) {
        return toast({ title: `CTA label required (max ${LABEL_MAX} chars)`, variant: "destructive" });
      }
      if (secondaryLink.trim() && !isValidHttpsUrl(secondaryLink.trim())) {
        return toast({ title: "Secondary link must start with https://", variant: "destructive" });
      }
      if (secondaryLink.trim() && (!secondaryLabel.trim() || secondaryLabel.length > LABEL_MAX)) {
        return toast({ title: `Secondary label required (max ${LABEL_MAX} chars)`, variant: "destructive" });
      }
    }

    if (mode === "hosted" && videoUrl && !isValidVideoUrl(videoUrl)) {
      return toast({ title: "Invalid video URL", description: "Use YouTube, Vimeo, or Loom.", variant: "destructive" });
    }

    let priceCents: number | null = null;
    if (offerType === "paid") {
      const n = Number(priceUsd);
      if (!Number.isFinite(n) || n < 0) return toast({ title: "Enter a valid price", variant: "destructive" });
      priceCents = Math.round(n * 100);
    }

    setBusy(true);
    try {
      // Upload cover if new
      let nextCover = coverUrl;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${profile.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("offer-covers").upload(path, coverFile, {
          upsert: true,
          contentType: coverFile.type,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("offer-covers").getPublicUrl(path);
        nextCover = pub.publicUrl;
      }

      // If pinning, unpin all other offers first (DB has unique partial index)
      if (isPinned) {
        const unpinQuery = supabase
          .from("offers")
          .update({ is_pinned: false })
          .eq("provider_id", profile.id)
          .eq("is_pinned", true);
        if (isEdit) await unpinQuery.neq("id", offerId!);
        else await unpinQuery;
      }

      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        free_for_testimonial: offerType === "free",
        price_cents: priceCents,
        category,
        tags,
        cover_url: nextCover,
        is_active: isActive,
        is_pinned: isPinned,
        hosted_on_hirevy: mode === "hosted",
        cta_link: mode === "linkout" ? ctaLink.trim() : null,
        cta_label: mode === "linkout" ? ctaLabel.trim() : "Book Now",
        secondary_link: mode === "linkout" && secondaryLink.trim() ? secondaryLink.trim() : null,
        secondary_link_label: mode === "linkout" && secondaryLink.trim() ? secondaryLabel.trim() : null,
        offer_tier: offerTier === "none" ? null : offerTier,
        video_url: mode === "hosted" && videoUrl.trim() ? videoUrl.trim() : null,
      };

      let finalSlug: string;
      if (isEdit) {
        const { error } = await supabase.from("offers").update(payload).eq("id", offerId!);
        if (error) throw error;
        const { data: o } = await supabase.from("offers").select("slug").eq("id", offerId!).maybeSingle();
        finalSlug = (o?.slug as string) || slugify(title);
      } else {
        const base = slugify(title);
        let slug = base;
        for (let i = 0; i < 50; i++) {
          const { data: clash } = await supabase
            .from("offers")
            .select("id")
            .eq("provider_id", profile.id)
            .eq("slug", slug)
            .maybeSingle();
          if (!clash) break;
          slug = `${base}-${i + 2}`;
        }
        const { error } = await supabase.from("offers").insert({
          ...payload,
          provider_id: profile.id,
          slug,
        } as never);
        if (error) throw error;
        finalSlug = slug;
      }

      toast({ title: isEdit ? "Offer updated" : "Offer created" });
      nav(`/@${profile.username}/${finalSlug}`);
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

  const previewSrc = coverPreview || coverUrl;
  const descMax = mode === "hosted" ? LONG_DESC_MAX : SHORT_DESC_MAX;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">{isEdit ? "Edit offer" : "Create offer"}</p>
      <h1 className="font-display text-3xl font-bold">{isEdit ? "Update your offer" : "Launch a new offer"}</h1>

      <form onSubmit={submit} className="mt-8 space-y-6">
        {/* Mode selector — link-out vs hosted */}
        <div className="rounded-md border border-border bg-card/40 p-4">
          <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Where do you sell this?</Label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("linkout")}
              className={`flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors ${
                mode === "linkout" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Link out to my sales page</span>
              </div>
              <p className="text-xs text-muted-foreground">Calendly, Stan, Kajabi, your site.</p>
            </button>
            <button
              type="button"
              onClick={() => setMode("hosted")}
              className={`flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors ${
                mode === "hosted" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Host on HireVy</span>
              </div>
              <p className="text-xs text-muted-foreground">Collect inquiries via messaging.</p>
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Most providers link to where they already sell. Only choose <span className="font-semibold text-foreground">Host on HireVy</span> if you don't have a sales page yet and want to collect inquiries through HireVy messaging.
          </p>
        </div>

        {/* Type */}
        <div>
          <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Offer type</Label>
          <Tabs value={offerType} onValueChange={(v) => setOfferType(v as OfferType)} className="mt-2">
            <TabsList>
              <TabsTrigger value="paid" className="uppercase tracking-[0.18em] text-xs">Paid</TabsTrigger>
              <TabsTrigger value="free" className="uppercase tracking-[0.18em] text-xs">Free for Testimonial</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Link-out CTA fields (shown first when in linkout mode) */}
        {mode === "linkout" && (
          <div className="space-y-4 rounded-md border border-primary/30 bg-primary/[0.03] p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Where the button goes</span>
            </div>

            <Field label="CTA Link" hint="Must start with https://">
              <Input
                type="url"
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                placeholder="https://calendly.com/yourname/intro"
                required
              />
            </Field>

            <Field label="CTA Label" hint={`${ctaLabel.length}/${LABEL_MAX}`}>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {CTA_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCtaLabel(p)}
                      className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                        ctaLabel === p ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <Input
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value.slice(0, LABEL_MAX))}
                  placeholder="Or type a custom label"
                  maxLength={LABEL_MAX}
                />
              </div>
            </Field>

            <Field label="Secondary Link (optional)">
              <Input
                type="url"
                value={secondaryLink}
                onChange={(e) => setSecondaryLink(e.target.value)}
                placeholder="https://yoursite.com/details"
              />
            </Field>

            {secondaryLink.trim() && (
              <Field label="Secondary Label" hint={`${secondaryLabel.length}/${LABEL_MAX}`}>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {SECONDARY_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSecondaryLabel(p)}
                        className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                          secondaryLabel === p ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={secondaryLabel}
                    onChange={(e) => setSecondaryLabel(e.target.value.slice(0, LABEL_MAX))}
                    maxLength={LABEL_MAX}
                  />
                </div>
              </Field>
            )}
          </div>
        )}

        {/* Cover */}
        <div>
          <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cover image</Label>
          <div className="mt-2 overflow-hidden rounded-md border border-border bg-card">
            {previewSrc ? (
              <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                <img src={previewSrc} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-[16/9] w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                No image yet
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-border p-3">
              <p className="text-xs text-muted-foreground">JPG/PNG. Max 2MB.</p>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> {previewSrc ? "Replace" : "Upload"}
              </Button>
            </div>
          </div>
        </div>

        <Field label="Title" hint={`${title.length}/80`}>
          <Input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} maxLength={80} required />
        </Field>

        <Field
          label={mode === "hosted" ? "Description" : "Short description"}
          hint={`${description.length}/${descMax}`}
        >
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, descMax))}
            rows={mode === "hosted" ? 8 : 4}
            maxLength={descMax}
            required
            placeholder={mode === "linkout" ? "One or two sentences explaining what this offer is and who it's for." : ""}
          />
        </Field>

        {offerType === "paid" && (
          <Field label={mode === "linkout" ? "Price (USD) — shown as 'Starting at'" : "Price (USD)"}>
            <Input type="number" min="0" step="1" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} placeholder="500" />
          </Field>
        )}

        {mode === "linkout" && (
          <Field label="Offer tier (optional)" hint="Display label only">
            <Select value={offerTier} onValueChange={(v) => setOfferTier(v as TierLabel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Entry">Entry</SelectItem>
                <SelectItem value="Mid">Mid</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field label="Category">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        {mode === "hosted" && (
          <Field label="Video URL (optional)" hint="YouTube, Vimeo, or Loom">
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
          </Field>
        )}

        <Field label="Tags" hint={`${tags.length}/${MAX_TAGS}`}>
          <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-input p-2">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-[3px] bg-secondary px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-foreground">
                {t}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={onTagKey}
              onBlur={() => { if (tagInput) { addTag(tagInput); setTagInput(""); } }}
              placeholder={tags.length >= MAX_TAGS ? "Max reached" : "Type and press Enter"}
              disabled={tags.length >= MAX_TAGS}
              className="min-w-[140px] flex-1 bg-transparent px-1 text-sm outline-none"
            />
          </div>
        </Field>

        {/* Active / Inactive */}
        <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-card/40 p-4">
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-foreground">{isActive ? "Active" : "Inactive"}</Label>
            <p className="text-xs text-muted-foreground">
              {isActive
                ? "Visible on Explore and your public profile."
                : "Hidden from Explore and your public profile."}
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        {/* Pin as featured */}
        <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-card/40 p-4">
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-foreground">
              {isPinned ? "✨ Featured offer" : "Pin as featured"}
            </Label>
            <p className="text-xs text-muted-foreground">
              The pinned offer is shown prominently at the top of your profile. Pinning this offer will unpin any other.
            </p>
          </div>
          <Switch checked={isPinned} onCheckedChange={setIsPinned} />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : isEdit ? "Save changes" : "Create offer"}</Button>
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
