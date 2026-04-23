import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import {
  IMPORTED_SOURCE_PRESETS,
  type ImportedTestimonial,
} from "@/lib/importedTestimonials";

const TEXT_MAX = 2000;
const NAME_MAX = 80;
const DATE_MAX = 40;
const SOURCE_MAX = 60;
const MAX_BYTES = 5 * 1024 * 1024;

export function ImportedTestimonialsEditor({ providerId }: { providerId: string }) {
  const [items, setItems] = useState<ImportedTestimonial[]>([]);
  const [editing, setEditing] = useState<ImportedTestimonial | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("imported_testimonials")
      .select("*")
      .eq("provider_user_id", providerId)
      .order("created_at", { ascending: false });
    setItems((data as ImportedTestimonial[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [providerId]);

  const remove = async (id: string) => {
    if (!confirm("Delete this imported testimonial? This can't be undone.")) return;
    const { error } = await supabase.from("imported_testimonials").delete().eq("id", id);
    if (error) return toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    await load();
  };

  return (
    <section className="rounded-md border border-border bg-card p-4 md:p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Imported testimonials</h2>
          <p className="mt-1 max-w-prose text-xs text-muted-foreground">
            Bring your existing testimonials from Instagram DMs, emails, past clients' websites, or
            wherever else. These appear on your profile clearly labeled as imported — they don't
            affect your tier badge or rating, but they help populate your history.
          </p>
        </div>
        {!showForm && (
          <Button size="sm" type="button" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        )}
      </div>

      {showForm && (
        <ImportedForm
          providerId={providerId}
          initial={editing}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSaved={async () => { setShowForm(false); setEditing(null); await load(); }}
        />
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="rounded border border-dashed border-border bg-background/40 p-4 text-center text-xs text-muted-foreground">
            You haven't added any yet.
          </p>
        ) : (
          items.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-3 rounded border border-border bg-background/40 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm">{t.testimonial_text}</p>
                <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                  {t.reviewer_name} — {t.source_label}, {t.date_label}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" type="button" onClick={() => { setEditing(t); setShowForm(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" type="button" onClick={() => remove(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ImportedForm({
  providerId, initial, onCancel, onSaved,
}: {
  providerId: string;
  initial: ImportedTestimonial | null;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const isOtherInitial = initial ? !IMPORTED_SOURCE_PRESETS.slice(0, -1).includes(initial.source_label as never) : false;
  const [text, setText] = useState(initial?.testimonial_text ?? "");
  const [name, setName] = useState(initial?.reviewer_name ?? "");
  const [date, setDate] = useState(initial?.date_label ?? "");
  const [sourcePreset, setSourcePreset] = useState<string>(
    initial ? (isOtherInitial ? "Other" : initial.source_label) : "Instagram DM"
  );
  const [otherSource, setOtherSource] = useState<string>(isOtherInitial ? (initial?.source_label ?? "") : "");
  const [existingPath, setExistingPath] = useState<string | null>(initial?.source_screenshot_url ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast({ title: "Invalid file", description: "Image only.", variant: "destructive" });
    if (f.size > MAX_BYTES) return toast({ title: "Too large", description: "Max 5MB.", variant: "destructive" });
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSource = sourcePreset === "Other" ? otherSource.trim() : sourcePreset;
    if (!text.trim()) return toast({ title: "Testimonial required", variant: "destructive" });
    if (!name.trim()) return toast({ title: "Reviewer name required", variant: "destructive" });
    if (!date.trim()) return toast({ title: "Date label required", variant: "destructive" });
    if (!finalSource) return toast({ title: "Source required", variant: "destructive" });

    setBusy(true);
    try {
      let screenshotPath: string | null = existingPath;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${providerId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("imported-testimonial-sources")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        screenshotPath = path;
      }

      const payload = {
        provider_user_id: providerId,
        reviewer_name: name.trim().slice(0, NAME_MAX),
        testimonial_text: text.trim().slice(0, TEXT_MAX),
        date_label: date.trim().slice(0, DATE_MAX),
        source_label: finalSource.slice(0, SOURCE_MAX),
        source_screenshot_url: screenshotPath,
      };

      if (initial) {
        const { error } = await supabase.from("imported_testimonials").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast({ title: "Updated" });
      } else {
        const { error } = await supabase.from("imported_testimonials").insert(payload);
        if (error) throw error;
        toast({ title: "Added" });
      }
      await onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Couldn't save", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded border border-border bg-background/30 p-3">
      <div>
        <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Testimonial</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, TEXT_MAX))}
          rows={4}
          maxLength={TEXT_MAX}
          placeholder="Paste the testimonial exactly as it was written."
          className="mt-1"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">{text.length}/{TEXT_MAX}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reviewer name</Label>
          <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))} maxLength={NAME_MAX} />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Date label</Label>
          <Input
            className="mt-1"
            value={date}
            onChange={(e) => setDate(e.target.value.slice(0, DATE_MAX))}
            maxLength={DATE_MAX}
            placeholder="e.g., 2022 / March 2023 / Late 2021"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Source</Label>
          <Select value={sourcePreset} onValueChange={setSourcePreset}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {IMPORTED_SOURCE_PRESETS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {sourcePreset === "Other" && (
          <div>
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Specify source</Label>
            <Input
              className="mt-1"
              value={otherSource}
              onChange={(e) => setOtherSource(e.target.value.slice(0, SOURCE_MAX))}
              maxLength={SOURCE_MAX}
              placeholder="e.g., Voice memo"
            />
          </div>
        )}
      </div>

      <div>
        <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Source screenshot (optional)</Label>
        <div className="mt-1 flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-3.5 w-3.5" /> {file ? "Replace image" : (existingPath ? "Replace existing" : "Upload image")}
          </Button>
          {(file || existingPath) && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              {file?.name ?? "Existing screenshot attached"}
              <button type="button" onClick={() => { setFile(null); setExistingPath(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : (initial ? "Save changes" : "Add testimonial")}</Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
