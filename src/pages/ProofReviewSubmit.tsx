import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import { toast } from "@/hooks/use-toast";
import { Star, Upload, X, FileText, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AMOUNT_BRACKETS, ENGAGEMENT_TYPES, MONTHS, PROOF_ALLOWED_MIME,
  PROOF_BUCKET, PROOF_MAX_BYTES, PROOF_MAX_FILES, PROOF_MIN_FILES,
  type AmountBracket, type EngagementType,
} from "@/lib/proofReviews";
import { CongratsModal } from "@/components/CongratsModal";

interface ProviderLite { id: string; display_name: string | null; username: string }

export default function ProofReviewSubmit() {
  const { username = "" } = useParams();
  const handle = username.startsWith("@") ? username.slice(1) : username;
  const nav = useNavigate();
  const { user, profile: me, loading: authLoading } = useAuth();

  const [provider, setProvider] = useState<ProviderLite | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);

  // Form state
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [engagementType, setEngagementType] = useState<EngagementType | "">("");
  const now = new Date();
  const [startMonth, setStartMonth] = useState<string>(String(now.getMonth() + 1));
  const [startYear, setStartYear] = useState<string>(String(now.getFullYear()));
  const [ongoing, setOngoing] = useState(false);
  const [endMonth, setEndMonth] = useState<string>(String(now.getMonth() + 1));
  const [endYear, setEndYear] = useState<string>(String(now.getFullYear()));
  const [amount, setAmount] = useState<AmountBracket | "">("");
  const [files, setFiles] = useState<File[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string } | null>(null);
  const [showFirstSubmittedPopup, setShowFirstSubmittedPopup] = useState(false);

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = now.getFullYear(); y >= 2010; y--) out.push(y);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill name/email from logged-in user
  useEffect(() => {
    if (me) {
      setReviewerName((prev) => prev || me.display_name || me.username || "");
    }
    if (user?.email) {
      setReviewerEmail((prev) => prev || user.email!);
    }
  }, [me, user]);

  useEffect(() => {
    setLoadingProvider(true);
    void supabase
      .from("profiles")
      .select("id, display_name, username")
      .eq("username", handle)
      .maybeSingle()
      .then(({ data }) => {
        setProvider((data as ProviderLite | null) ?? null);
        setLoadingProvider(false);
      });
  }, [handle]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      nav(`/auth?redirect=/r/${handle}/proof`, { replace: true });
    }
  }, [authLoading, user, handle, nav]);

  const onPickFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files];
    for (const f of Array.from(incoming)) {
      if (next.length >= PROOF_MAX_FILES) break;
      if (!PROOF_ALLOWED_MIME.includes(f.type)) {
        toast({ title: "File type not allowed", description: `${f.name} — use images or PDF.`, variant: "destructive" });
        continue;
      }
      if (f.size > PROOF_MAX_BYTES) {
        toast({ title: "File too large", description: `${f.name} is over 10MB.`, variant: "destructive" });
        continue;
      }
      next.push(f);
    }
    setFiles(next.slice(0, PROOF_MAX_FILES));
  };

  const removeFile = (idx: number) => setFiles(files.filter((_, i) => i !== idx));

  const charCount = body.trim().length;
  const isSelf = user && provider && user.id === provider.id;

  const validate = (): string | null => {
    if (!provider) return "Provider not loaded yet.";
    if (isSelf) return "You can't review your own profile.";
    if (rating < 1) return "Pick a star rating.";
    if (charCount < 100) return "Review must be at least 100 characters.";
    if (!reviewerName.trim()) return "Add your full name.";
    if (!reviewerEmail.trim()) return "Add your email.";
    if (!engagementType) return "Pick an engagement type.";
    if (!ongoing) {
      const startDate = new Date(Number(startYear), Number(startMonth) - 1, 1);
      const endDate = new Date(Number(endYear), Number(endMonth) - 1, 1);
      if (endDate < startDate) return "End date can't be before start date.";
    }
    if (files.length < PROOF_MIN_FILES) return `Upload at least ${PROOF_MIN_FILES} proof files.`;
    if (files.length > PROOF_MAX_FILES) return `Max ${PROOF_MAX_FILES} files.`;
    if (!confirm) return "Confirm your submission is accurate.";
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !provider) return;
    const err = validate();
    if (err) { toast({ title: "Almost there", description: err, variant: "destructive" }); return; }

    setBusy(true);

    // 1. Upload files first
    const uploadedPaths: string[] = [];
    for (const f of files) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${user.id}/${provider.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(PROOF_BUCKET).upload(path, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type,
      });
      if (upErr) {
        // Best-effort cleanup
        if (uploadedPaths.length > 0) {
          await supabase.storage.from(PROOF_BUCKET).remove(uploadedPaths);
        }
        toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
        setBusy(false);
        return;
      }
      uploadedPaths.push(path);
    }

    // 2. Insert review row
    const { data, error } = await supabase
      .from("proof_backed_reviews")
      .insert({
        provider_id: provider.id,
        reviewer_user_id: user.id,
        reviewer_name: reviewerName.trim(),
        reviewer_email: reviewerEmail.trim().toLowerCase(),
        rating,
        body: body.trim(),
        engagement_type: engagementType as EngagementType,
        engagement_started_month: Number(startMonth),
        engagement_started_year: Number(startYear),
        engagement_ended_month: ongoing ? null : Number(endMonth),
        engagement_ended_year: ongoing ? null : Number(endYear),
        engagement_ongoing: ongoing,
        amount_paid_bracket: amount || null,
        proof_file_paths: uploadedPaths,
        proof_file_count: uploadedPaths.length,
      })
      .select("id")
      .single();

    if (error) {
      // Roll back uploads
      await supabase.storage.from(PROOF_BUCKET).remove(uploadedPaths);
      const dup = error.message.toLowerCase().includes("duplicate") || error.code === "23505";
      toast({
        title: "Could not submit",
        description: dup
          ? "You've already submitted a proof-backed review for this provider."
          : error.message,
        variant: "destructive",
      });
      setBusy(false);
      return;
    }

    setDone({ id: (data as { id: string }).id });
    setBusy(false);

    // First review submitted ever → +5 points bonus + popup, shown only once.
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("awarded_first_review_submitted_bonus, points")
        .eq("id", user.id)
        .maybeSingle();
      const row = prof as { awarded_first_review_submitted_bonus: boolean; points: number } | null;
      if (row && !row.awarded_first_review_submitted_bonus) {
        await supabase.from("profiles").update({
          awarded_first_review_submitted_bonus: true,
          points: (row.points ?? 0) + 5,
        }).eq("id", user.id);
      }
      const { data: flag } = await supabase
        .from("user_notification_flags")
        .select("flag_name")
        .eq("user_id", user.id)
        .eq("flag_name", "first_review_submitted")
        .maybeSingle();
      if (!flag) {
        await supabase.from("user_notification_flags").insert({ user_id: user.id, flag_name: "first_review_submitted" });
        setShowFirstSubmittedPopup(true);
      }
    }
  };

  if (loadingProvider || authLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!provider) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <h1 className="font-display text-2xl font-semibold">No such profile</h1>
        <Button asChild variant="outline" className="mt-4"><Link to="/explore">Back to Explore</Link></Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-10">
        <Logo />
        <div className="mt-12 rounded-md border border-border bg-card p-6 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" strokeWidth={1.5} />
          <h1 className="mt-4 font-display text-2xl font-semibold">Your proof-backed review is live</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {provider.display_name || `@${provider.username}`} has been notified.
          </p>
          <div className="mt-6 flex gap-2">
            <Button asChild className="flex-1"><Link to={`/@${provider.username}`}>View profile</Link></Button>
            <Button asChild variant="outline" className="flex-1"><Link to="/explore">Back to Explore</Link></Button>
          </div>
        </div>
        <CongratsModal
          open={showFirstSubmittedPopup}
          variant={{ kind: "first-submitted" }}
          onClose={() => setShowFirstSubmittedPopup(false)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-10">
      <Logo />
      <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Proof-Backed Review</p>
      <h1 className="mt-2 font-display text-3xl font-bold leading-tight">
        Review {provider.display_name || `@${provider.username}`}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Anyone can leave a proof-backed review — but you'll need to share evidence of your engagement.
        Reviews are public; proof files stay private unless you approve a viewer's request to see them.
      </p>

      <form onSubmit={submit} className="mt-10 space-y-10">
        {/* Section: Rating */}
        <Section number="01" title="How was your experience?">
          <div>
            <Label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">Rating</Label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}
                  className="rounded-sm p-1 outline-none transition-transform hover:scale-110"
                  aria-label={`${i} star${i > 1 ? "s" : ""}`}
                >
                  <Star
                    className={cn("h-8 w-8", (hover || rating) >= i ? "fill-primary text-primary" : "text-muted-foreground/40")}
                    strokeWidth={1.25}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Written review <span className="text-muted-foreground/60">(min 100 characters)</span>
            </Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              maxLength={4000}
              placeholder="What did you hire them for? What did they deliver? What were the results? Be specific."
            />
            <p className={cn("text-xs", charCount < 100 ? "text-muted-foreground" : "text-primary")}>
              {charCount} / 100 minimum
            </p>
          </div>
        </Section>

        {/* Section: Identity */}
        <Section number="02" title="Who are you?">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Full name (public)</Label>
              <Input value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} required maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Email (private)</Label>
              <Input type="email" value={reviewerEmail} onChange={(e) => setReviewerEmail(e.target.value)} required />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Your email is never shown publicly. It's used to prevent duplicate submissions and for proof-access requests.
          </p>
        </Section>

        {/* Section: Engagement */}
        <Section number="03" title="How did you work together?">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Engagement type</Label>
            <Select value={engagementType} onValueChange={(v) => setEngagementType(v as EngagementType)}>
              <SelectTrigger><SelectValue placeholder="Select engagement type" /></SelectTrigger>
              <SelectContent>
                {ENGAGEMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Engagement dates</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Started</p>
                <div className="flex gap-2">
                  <Select value={startMonth} onValueChange={setStartMonth}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={startYear} onValueChange={setStartYear}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Ended</p>
                <div className="flex gap-2">
                  <Select value={endMonth} onValueChange={setEndMonth} disabled={ongoing}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={endYear} onValueChange={setEndYear} disabled={ongoing}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground/90">
              <Checkbox checked={ongoing} onCheckedChange={(v) => setOngoing(!!v)} />
              Engagement is ongoing
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Amount paid <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Select value={amount} onValueChange={(v) => setAmount(v as AmountBracket)}>
              <SelectTrigger><SelectValue placeholder="Select bracket (optional)" /></SelectTrigger>
              <SelectContent>
                {AMOUNT_BRACKETS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Section>

        {/* Section: Proof */}
        <Section number="04" title="Upload proof of engagement">
          <p className="text-sm text-muted-foreground">
            Upload <strong className="text-foreground">at least 2 files</strong>, up to 5. Receipts, DM/email screenshots,
            contracts, meeting screenshots, or work product. Max 10MB each. <strong className="text-foreground">Files stay private</strong> —
            visitors only see that proof was submitted.
          </p>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-card/40 p-8 text-center transition-colors hover:border-primary/60 hover:bg-card/70">
            <Upload className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-2 text-sm font-medium">Click to upload, or drag files here</p>
            <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP, GIF, HEIC, or PDF · up to 10MB each</p>
            <input
              type="file"
              multiple
              accept={PROOF_ALLOWED_MIME.join(",")}
              className="hidden"
              onChange={(e) => { onPickFiles(e.target.files); e.target.value = ""; }}
            />
          </label>

          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                  {f.type.startsWith("image/") ? (
                    <ImageIcon className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                  ) : (
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeFile(i)} className="h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            {files.length} of {PROOF_MAX_FILES} uploaded · minimum {PROOF_MIN_FILES}
          </p>
        </Section>

        {/* Section: Confirm */}
        <Section number="05" title="Confirm and submit">
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card p-4 text-sm">
            <Checkbox checked={confirm} onCheckedChange={(v) => setConfirm(!!v)} className="mt-0.5" />
            <span className="text-foreground/90">
              I confirm everything I've submitted is accurate. I understand this review will be public and Aytopus may
              investigate false submissions.
            </span>
          </label>

          <Button type="submit" disabled={busy} className="w-full" size="lg">
            {busy ? "Submitting…" : "Submit proof-backed review"}
          </Button>
        </Section>
      </form>
    </div>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="flex items-baseline gap-3 border-b border-border pb-2">
        <span className="font-display text-xs uppercase tracking-[0.32em] text-primary">{number}</span>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
