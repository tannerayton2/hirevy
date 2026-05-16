import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Star, Upload, X, ShieldCheck, BadgeCheck, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const AMOUNT_BRACKETS = [
  "Under $100",
  "$100–$500",
  "$500–$2,000",
  "$2,000–$5,000",
  "Over $5,000",
];

type Tier = "basic" | "verified" | "evidenced";

function computeTier(purchased: boolean, fileCount: number): Tier {
  if (purchased && fileCount > 0) return "evidenced";
  if (purchased) return "verified";
  return "basic";
}

export default function SubmitReview() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const prefilledCoach = params.get("coach") ?? "";

  const [coachName, setCoachName] = useState(prefilledCoach);
  const [instagram, setInstagram] = useState("");
  const [offerUrl, setOfferUrl] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState("");
  const [purchased, setPurchased] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const tier = useMemo(() => computeTier(purchased, files.length), [purchased, files.length]);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    const next = [...files, ...incoming].slice(0, 3);
    setFiles(next);
    e.target.value = "";
  };
  const removeFile = (i: number) => setFiles(files.filter((_, idx) => idx !== i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachName.trim()) return toast({ title: "Coach name required", variant: "destructive" });
    if (rating < 1) return toast({ title: "Pick a star rating", variant: "destructive" });
    if (body.trim().length < 50) return toast({ title: "Review must be at least 50 characters", variant: "destructive" });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast({ title: "Enter a valid email", variant: "destructive" });

    setSaving(true);
    try {
      // Upload evidence
      const paths: string[] = [];
      for (const f of files) {
        const ext = f.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("review-evidence")
          .upload(path, f, { contentType: f.type || "application/octet-stream", upsert: false });
        if (upErr) throw upErr;
        paths.push(path);
      }

      const { error } = await supabase.from("unclaimed_reviews").insert({
        coach_name: coachName.trim().slice(0, 120),
        instagram_handle: instagram.trim() || null,
        offer_url: offerUrl.trim() || null,
        rating,
        body: body.trim(),
        purchased,
        amount_paid_bracket: purchased && amount ? amount : null,
        evidence_paths: paths,
        strength_tier: tier,
        reviewer_email: email.trim(),
      });
      if (error) throw error;

      toast({ title: "Review submitted", description: "Thanks — your review is live." });
      navigate("/explore");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Couldn't submit", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Public review</p>
        <h1 className="mt-2 font-display text-2xl font-bold md:text-3xl">Review a coach</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your honest experience. Reviews appear publicly on the coach's HireVy profile.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <Field label="Coach or provider name" required>
          <Input value={coachName} onChange={(e) => setCoachName(e.target.value)} required maxLength={120} />
        </Field>

        <Field label="Their Instagram handle">
          <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@theirhandle" />
        </Field>

        <Field label="Link to the specific offer or program you purchased">
          <Input type="url" value={offerUrl} onChange={(e) => setOfferUrl(e.target.value)} placeholder="https://theirwebsite.com/offer" />
        </Field>

        <Field label="Star rating" required>
          <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map((i) => {
              const display = hoverRating || rating;
              const filled = display >= i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHoverRating(i)}
                  aria-label={`${i} star${i === 1 ? "" : "s"}`}
                  className="rounded p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn("h-9 w-9", filled ? "fill-primary text-primary" : "text-muted-foreground/40")}
                    strokeWidth={1.5}
                  />
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Written review" required hint={`${body.length}/50 min`}>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe your experience honestly. What did you get? What were the results? Would you recommend it?"
            rows={6}
            required
            minLength={50}
            maxLength={4000}
          />
        </Field>

        <div className="rounded-md border border-border bg-card/50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox checked={purchased} onCheckedChange={(v) => setPurchased(!!v)} className="mt-0.5" />
            <span className="text-sm">I purchased from this coach or bought their program</span>
          </label>
          {purchased && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs uppercase tracking-[0.16em] text-muted-foreground">Approximate amount paid</p>
              <Select value={amount} onValueChange={setAmount}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select bracket (optional)" /></SelectTrigger>
                <SelectContent>
                  {AMOUNT_BRACKETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Field label="Upload evidence (optional)" hint={`${files.length}/3`}>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card/40 p-6 text-center transition-colors hover:border-primary/40">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Add receipts, screenshots of results, or proof of purchase (optional)
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onPickFiles}
              disabled={files.length >= 3}
            />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded border border-border bg-card/50 px-2.5 py-1.5 text-xs">
                  <span className="truncate">{f.name}</span>
                  <button type="button" onClick={() => removeFile(i)} aria-label="Remove">
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>

        <Field label="Your email address" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
        </Field>

        <StrengthCard tier={tier} />

        <Button type="submit" disabled={saving} className="h-12 w-full text-sm font-semibold">
          {saving ? "Submitting…" : "Submit Review"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Your review will be posted publicly on the coach's HireVy profile.
        </p>
      </form>
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label} {required && <span className="text-primary">*</span>}
        </label>
        {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function StrengthCard({ tier }: { tier: Tier }) {
  const tiers: { id: Tier; label: string; desc: string; icon: React.ReactNode; badge: string }[] = [
    { id: "basic", label: "Basic", desc: "Comment only, no purchase confirmation", icon: <Check className="h-3.5 w-3.5" />, badge: "bg-muted text-muted-foreground" },
    { id: "verified", label: "Verified", desc: "Purchase confirmed via checkbox", icon: <BadgeCheck className="h-3.5 w-3.5" />, badge: "bg-primary/15 text-primary ring-1 ring-primary/30" },
    { id: "evidenced", label: "Evidenced", desc: "Purchase confirmed + at least one photo or file uploaded", icon: <ShieldCheck className="h-3.5 w-3.5" />, badge: "bg-primary/15 text-primary ring-1 ring-primary/30" },
  ];
  const active = tiers.find((t) => t.id === tier)!;
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your review strength</p>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]", active.badge)}>
          {active.icon} {active.label}
        </span>
      </div>
      <ul className="space-y-2">
        {tiers.map((t) => (
          <li key={t.id} className={cn("flex items-start gap-2.5 text-xs", t.id === tier ? "text-foreground" : "text-muted-foreground/70")}>
            <span className={cn("mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full", t.id === tier ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
              {t.icon}
            </span>
            <span><span className="font-semibold">{t.label}</span> — {t.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
