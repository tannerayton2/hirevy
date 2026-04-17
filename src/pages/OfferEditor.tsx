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
import { Upload, X } from "lucide-react";

const MAX_COVER_BYTES = 2 * 1024 * 1024;
const MAX_TAGS = 10;

type OfferType = "paid" | "free";

export default function OfferEditor() {
  const { offerId } = useParams();
  const [params] = useSearchParams();
  const isEdit = !!offerId;
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const initialType = (params.get("type") === "free" ? "free" : "paid") as OfferType;
  const [offerType, setOfferType] = useState<OfferType>(initialType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [category, setCategory] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydrating, setHydrating] = useState(isEdit);

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
      if (data.provider_id !== user.id) {
        toast({ title: "Not your offer", variant: "destructive" });
        nav(-1);
        return;
      }
      setTitle(data.title);
      setDescription(data.description ?? "");
      setOfferType(data.free_for_testimonial ? "free" : "paid");
      setPriceUsd(data.price_cents != null ? String(data.price_cents / 100) : "");
      setCategory(data.category);
      setVideoUrl(data.video_url ?? "");
      setTags(data.tags ?? []);
      setCoverUrl(data.cover_url);
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
    if (!description.trim() || description.length > 5000) return toast({ title: "Description required (max 5000 chars)", variant: "destructive" });
    if (!category) return toast({ title: "Pick a category", variant: "destructive" });
    if (!coverFile && !coverUrl) return toast({ title: "Cover image required", variant: "destructive" });
    if (videoUrl && !isValidVideoUrl(videoUrl)) return toast({ title: "Invalid video URL", description: "Use YouTube, Vimeo, or Loom.", variant: "destructive" });

    let priceCents: number | null = null;
    if (offerType === "paid") {
      const n = Number(priceUsd);
      if (!Number.isFinite(n) || n < 0) return toast({ title: "Enter a valid price", variant: "destructive" });
      priceCents = Math.round(n * 100);
    }

    // Free-tier paid limit (only enforce on create OR when switching free→paid)
    if (offerType === "paid") {
      const { data: existing } = await supabase
        .from("offers")
        .select("id")
        .eq("provider_id", profile.id)
        .eq("free_for_testimonial", false)
        .eq("is_active", true);
      const count = existing?.length ?? 0;
      const isCountingThis = isEdit && existing?.some((o) => o.id === offerId);
      const limit = 1;
      if (count - (isCountingThis ? 1 : 0) >= limit) {
        toast({
          title: "Paid offer limit reached",
          description: "Free plan allows 1 active paid offer. Deactivate or delete an existing one to create another.",
          variant: "destructive",
        });
        return;
      }
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

      let finalSlug: string;
      if (isEdit) {
        const { error } = await supabase
          .from("offers")
          .update({
            title: title.trim(),
            description: description.trim(),
            free_for_testimonial: offerType === "free",
            price_cents: priceCents,
            category,
            video_url: videoUrl.trim() || null,
            tags,
            cover_url: nextCover,
          })
          .eq("id", offerId!);
        if (error) throw error;
        const { data: o } = await supabase.from("offers").select("slug").eq("id", offerId!).maybeSingle();
        finalSlug = (o?.slug as string) || slugify(title);
      } else {
        // generate unique slug
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
          provider_id: profile.id,
          slug,
          title: title.trim(),
          description: description.trim(),
          category,
          price_cents: priceCents,
          free_for_testimonial: offerType === "free",
          cover_url: nextCover,
          video_url: videoUrl.trim() || null,
          tags,
        });
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">{isEdit ? "Edit offer" : "Create offer"}</p>
      <h1 className="font-display text-3xl font-bold">{isEdit ? "Update your offer" : "Launch a new offer"}</h1>

      <form onSubmit={submit} className="mt-8 space-y-6">
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

        <Field label="Description" hint={`${description.length}/5000`}>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 5000))} rows={8} maxLength={5000} required />
        </Field>

        {offerType === "paid" && (
          <Field label="Price (USD)">
            <Input type="number" min="0" step="1" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} placeholder="500" />
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

        <Field label="Video URL (optional)" hint="YouTube, Vimeo, or Loom">
          <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
        </Field>

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
