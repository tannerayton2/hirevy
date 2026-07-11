import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePageMeta } from "@/lib/usePageMeta";
import { Star, Upload, X, ShieldCheck, BadgeCheck, Check, ChevronDown, Search, Plus, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ReviewValidityBar } from "@/components/reviews/ReviewValidityBar";
import { tierColor, tierLabel } from "@/components/reviews/ReviewCompletenessShield";
import { TooltipProvider } from "@/components/ui/tooltip";

function computeCompletenessScore(opts: {
  body: string;
  purchased: boolean;
  amountFilled: boolean;
  offerFilled: boolean;
  photoCount: number;
}): number {
  let s = 0;
  if (opts.body && opts.body.trim().length > 0) s += 20;
  if (opts.body && opts.body.length > 300) s += 20;
  else if (opts.body && opts.body.length >= 100) s += 10;
  if (opts.purchased) s += 25;
  if (opts.amountFilled) s += 10;
  if (opts.offerFilled) s += 10;
  if (opts.photoCount >= 3) s += 10;
  else if (opts.photoCount === 2) s += 8;
  else if (opts.photoCount === 1) s += 5;
  return Math.min(100, Math.max(0, s));
}

const AMOUNT_BRACKETS = [
  "Under $100",
  "$100–$500",
  "$500–$2,000",
  "$2,000–$5,000",
  "Over $5,000",
];

const CATEGORIES = [
  "Business Coaching",
  "Sales",
  "Copywriting",
  "Fitness & Health",
  "Mindset",
  "Marketing",
  "Finance",
  "Life Coaching",
  "Other",
];

type Tier = "basic" | "verified" | "evidenced";

function computeTier(purchased: boolean, fileCount: number): Tier {
  if (purchased && fileCount > 0) return "evidenced";
  if (purchased) return "verified";
  return "basic";
}

const MIN_BODY = 60;
const DETAILED_THRESHOLD = 150;

export default function SubmitReview() {
  usePageMeta(
    "Leave a Review | Aytopus",
    "Share your honest experience with a coach or service provider. Help others make smarter hiring decisions.",
  );
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const prefilledCoach = params.get("coach") ?? "";
  const hideSection1 = !!prefilledCoach;
  const [submitted, setSubmitted] = useState(false);
  const [reviewedUsername, setReviewedUsername] = useState<string | null>(null);

  const [coachName, setCoachName] = useState(prefilledCoach);
  const [coachQuery, setCoachQuery] = useState(prefilledCoach);
  const [linkedProfileId, setLinkedProfileId] = useState<string | null>(null);
  const [isUnmatched, setIsUnmatched] = useState(false);
  const [nameLocked, setNameLocked] = useState(hideSection1);
  const [unmatchedLink, setUnmatchedLink] = useState("");
  const [unmatchedDescription, setUnmatchedDescription] = useState("");

  type ProfileHit = { id: string; username: string; display_name: string | null; avatar_url: string | null };
  const [searchResults, setSearchResults] = useState<ProfileHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  const [category, setCategory] = useState<string>(params.get("cat") ?? "");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [youtube, setYoutube] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [offerUrl, setOfferUrl] = useState("");
  const [showMoreProfile, setShowMoreProfile] = useState(false);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState("");
  const [purchased, setPurchased] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Debounced profile search
  useEffect(() => {
    if (hideSection1 || nameLocked) return;
    const q = coachQuery.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
        .limit(6);
      if (!cancelled) {
        setSearchResults((data ?? []) as ProfileHit[]);
        setSearching(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [coachQuery, hideSection1, nameLocked]);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!searchBoxRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectExisting = (p: ProfileHit) => {
    setLinkedProfileId(p.id);
    setReviewedUsername(p.username);
    setIsUnmatched(false);
    setCoachName(p.display_name || p.username);
    setCoachQuery(p.display_name || p.username);
    setNameLocked(true);
    setSearchOpen(false);
    setUnmatchedLink("");
    setUnmatchedDescription("");
  };

  const selectUnmatched = () => {
    setLinkedProfileId(null);
    setIsUnmatched(true);
    setCoachName(coachQuery.trim());
    setNameLocked(true);
    setSearchOpen(false);
  };

  const clearName = () => {
    setLinkedProfileId(null);
    setIsUnmatched(false);
    setNameLocked(false);
    setCoachName("");
    setCoachQuery("");
    setUnmatchedLink("");
    setUnmatchedDescription("");
  };



  const completenessScore = useMemo(
    () => computeCompletenessScore({
      body, purchased,
      amountFilled: !!(purchased && amount),
      offerFilled: !!offerUrl.trim(),
      photoCount: files.length,
    }),
    [body, purchased, amount, offerUrl, files.length],
  );

  const tier = useMemo(() => computeTier(purchased, files.length), [purchased, files.length]);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    const next = [...files, ...incoming].slice(0, 3);
    setFiles(next);
    e.target.value = "";
  };
  const removeFile = (i: number) => setFiles(files.filter((_, idx) => idx !== i));

  const validate = () => {
    if (!coachName.trim()) { toast({ title: "Coach name required", variant: "destructive" }); return false; }
    if (rating < 0.5) { toast({ title: "Pick a star rating", variant: "destructive" }); return false; }
    if (body.trim().length < MIN_BODY) { toast({ title: `Review must be at least ${MIN_BODY} characters`, variant: "destructive" }); return false; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { toast({ title: "Enter a valid email", variant: "destructive" }); return false; }
    return true;
  };

  const onClickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setConfirmOpen(true);
  };

  const doSubmit = async () => {
    setSaving(true);
    try {
      const paths: string[] = [];
      if (files.length > 0 && !user) {
        throw new Error("Please sign in to attach evidence files.");
      }
      for (const f of files) {
        const ext = f.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("review-evidence")
          .upload(path, f, { contentType: f.type || "application/octet-stream", upsert: false });
        if (upErr) throw upErr;
        paths.push(path);
      }

      // Embed extra profile info into body as a single trailing block (schema unchanged)
      const extras: string[] = [];
      if (category) extras.push(`Category: ${category}`);
      if (website.trim()) extras.push(`Website: ${website.trim()}`);
      if (twitter.trim()) extras.push(`Twitter/X: ${twitter.trim()}`);
      if (youtube.trim()) extras.push(`YouTube: ${youtube.trim()}`);
      if (linkedin.trim()) extras.push(`LinkedIn: ${linkedin.trim()}`);
      const composedBody = extras.length
        ? `${body.trim()}\n\n---\n${extras.join("\n")}`
        : body.trim();

      const { data: newId, error } = await supabase.rpc("submit_unclaimed_review", {
        p_coach_name: coachName.trim().slice(0, 120),
        p_instagram_handle: instagram.trim() || null,
        p_offer_url: offerUrl.trim() || null,
        p_rating: rating,
        p_body: composedBody,
        p_purchased: purchased,
        p_amount_paid_bracket: purchased && amount ? amount : null,
        p_evidence_paths: paths,
        p_strength_tier: tier,
        p_reviewer_email: email.trim(),
        p_unmatched_link: isUnmatched && unmatchedLink.trim() ? unmatchedLink.trim() : null,
        p_unmatched_description: isUnmatched && unmatchedDescription.trim() ? unmatchedDescription.trim() : null,
        p_needs_profile: isUnmatched && !linkedProfileId,
        p_linked_profile_id: linkedProfileId,
      });
      if (error) throw error;

      try {
        await supabase.functions.invoke("send-review-verification", {
          body: { review_id: newId, review_type: "unclaimed", origin: window.location.origin },
        });
      } catch { /* non-fatal */ }

      toast({ title: "Check your email", description: "Confirm your review via the link we just sent." });
      setConfirmOpen(false);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Couldn't submit", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const counterReached = body.length >= MIN_BODY;

  const barColor = tierColor(completenessScore);
  const barLabel = tierLabel(completenessScore);

  const resetForm = () => {
    setSubmitted(false);
    setReviewedUsername(null);
    setCoachName(""); setCoachQuery(""); setLinkedProfileId(null); setIsUnmatched(false); setNameLocked(false);
    setUnmatchedLink(""); setUnmatchedDescription("");
    setCategory(""); setWebsite(""); setInstagram(""); setTwitter(""); setYoutube(""); setLinkedin(""); setOfferUrl("");
    setShowMoreProfile(false);
    setRating(0); setHoverRating(0); setBody(""); setPurchased(false); setAmount(""); setFiles([]); setEmail("");
    navigate("/submit-review", { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    const profileTarget = reviewedUsername ?? prefilledCoach;
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto h-20 w-20 text-primary" strokeWidth={1.5} />
        <h1 className="mt-6 font-display text-3xl font-bold md:text-4xl">Check your email</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your review is pending email confirmation. Click the link we just sent to {email || "your email"} to publish it.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          {user ? (
            <Button asChild className="h-12 w-full font-semibold" style={{ background: "linear-gradient(135deg,#FFE98A,#FFD700,#B8860B)", color: "#2a1c00" }}>
              <Link to={profileTarget ? `/@${profileTarget}` : "/explore"}>View profile →</Link>
            </Button>
          ) : (
            <Button asChild className="h-12 w-full font-semibold" style={{ background: "linear-gradient(135deg,#FFE98A,#FFD700,#B8860B)", color: "#2a1c00" }}>
              <Link to="/signup">Create an account to track your reviews →</Link>
            </Button>
          )}
          <Button variant="outline" onClick={resetForm} className="h-12 w-full border-primary text-primary hover:bg-primary/10 hover:text-primary">
            Review another coach
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sticky completeness bar — sits directly below the app header */}
      <div className="fixed inset-x-0 top-14 z-30 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur md:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="h-5 w-full overflow-hidden rounded-md bg-muted/60">
            <div
              className="h-full rounded-md transition-all duration-300 ease-out"
              style={{ width: `${completenessScore}%`, backgroundColor: barColor }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: barColor }}>
            <span>{barLabel}</span>
            <span>{completenessScore}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-10 pt-[96px] md:px-8 md:pt-[104px]">
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Public review</p>
          <h1 className="mt-2 font-display text-2xl font-bold md:text-3xl">Review a coach</h1>
        </div>

      <form onSubmit={onClickSubmit} className="space-y-8">
        {/* SECTION 1 — hidden when coach is pre-filled via URL */}
        {!hideSection1 && (
        <section className="space-y-5">
          <header>
            <h2 className="font-display text-lg font-semibold">Who are you reviewing?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Search for an existing Aytopus profile or add a new one.</p>
          </header>

          <Field label="Coach or provider name" required>
            <div ref={searchBoxRef} className="relative">
              {nameLocked ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {linkedProfileId ? (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Plus className="h-4 w-4 shrink-0 text-primary" />
                    )}
                    <span className="truncate text-sm font-medium">{coachName}</span>
                    {linkedProfileId && (
                      <span className="text-[10px] uppercase tracking-[0.16em] text-primary">Linked</span>
                    )}
                  </div>
                  {!hideSection1 && (
                    <button type="button" onClick={clearName} aria-label="Clear" className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={coachQuery}
                      onChange={(e) => { setCoachQuery(e.target.value); setSearchOpen(true); }}
                      onFocus={() => setSearchOpen(true)}
                      placeholder="Start typing a name…"
                      maxLength={120}
                      className="pl-9"
                    />
                  </div>
                  {searchOpen && coachQuery.trim().length >= 2 && (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                      {searching && searchResults.length === 0 ? (
                        <div className="px-3 py-2.5 text-xs text-muted-foreground">Searching…</div>
                      ) : (
                        <>
                          {searchResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => selectExisting(p)}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
                            >
                              <Avatar className="h-8 w-8">
                                {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.display_name ?? p.username} />}
                                <AvatarFallback className="text-xs">
                                  {(p.display_name ?? p.username).slice(0, 1).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{p.display_name ?? p.username}</p>
                                <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                              </div>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={selectUnmatched}
                            className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-accent"
                          >
                            <Plus className="h-4 w-4" />
                            Review "{coachQuery.trim()}"
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </Field>

          {isUnmatched && nameLocked && (
            <>
              <Field label="Their website or social link (optional)">
                <Input
                  type="url"
                  value={unmatchedLink}
                  onChange={(e) => setUnmatchedLink(e.target.value)}
                  placeholder="https://instagram.com/theirhandle"
                />
              </Field>
              <Field label="Anything to help us find them? (optional)">
                <Textarea
                  value={unmatchedDescription}
                  onChange={(e) => setUnmatchedDescription(e.target.value)}
                  placeholder="e.g. Business coach on YouTube, runs a program called X."
                  rows={3}
                  maxLength={500}
                />
              </Field>
            </>
          )}

          {!linkedProfileId && (
            <>
          <Field label="Their primary category">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select a category (optional)" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          {!showMoreProfile ? (
            <button
              type="button"
              onClick={() => setShowMoreProfile(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary hover:text-primary/80"
            >
              <ChevronDown className="h-3.5 w-3.5" /> Add more profile info (optional)
            </button>
          ) : (
            <div className="space-y-5">
              <Field label="Their website URL">
                <Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://theirwebsite.com" />
              </Field>
              <Field label="Their Instagram handle">
                <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@theirhandle" />
              </Field>
              <Field label="Their Twitter/X handle">
                <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="@theirhandle" />
              </Field>
              <Field label="Their YouTube channel URL">
                <Input type="url" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/@theirchannel" />
              </Field>
              <Field label="Their LinkedIn URL">
                <Input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/theirprofile" />
              </Field>
              <Field label="Link to the specific offer or program you purchased">
                <Input type="url" value={offerUrl} onChange={(e) => setOfferUrl(e.target.value)} placeholder="https://theirwebsite.com/offer — the exact program you bought" />
              </Field>
            </div>
          )}
            </>
          )}
        </section>
        )}

        {!hideSection1 && <div className="h-px w-full bg-border" />}

        {/* SECTION 2 */}
        <section className="space-y-5">
          <header>
            <h2 className="font-display text-lg font-semibold">Your experience</h2>
            <p className="mt-1 text-sm text-muted-foreground">Be honest. Be specific. Other buyers are counting on you.</p>
          </header>

          <Field label="Star rating" required>
            <div className="flex flex-col items-start gap-1">
              <div
                className="flex items-center gap-1"
                onMouseLeave={() => setHoverRating(0)}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
                  const half = el?.dataset?.starHalf;
                  if (half) setRating(parseFloat(half));
                }}
              >
                {[1, 2, 3, 4, 5].map((i) => {
                  const display = hoverRating || rating;
                  const fullVal = i;
                  const halfVal = i - 0.5;
                  const filled = display >= fullVal;
                  const half = !filled && display >= halfVal;
                  return (
                    <div key={i} className="relative h-9 w-9">
                      <Star
                        className={cn(
                          "absolute inset-0 h-9 w-9 pointer-events-none",
                          filled || half ? "text-primary" : "text-muted-foreground/40",
                          filled && "fill-primary",
                        )}
                        strokeWidth={1.5}
                      />
                      {half && (
                        <Star
                          className="absolute inset-0 h-9 w-9 fill-primary text-primary pointer-events-none"
                          strokeWidth={1.5}
                          style={{ clipPath: "inset(0 50% 0 0)" }}
                        />
                      )}
                      <button
                        type="button"
                        data-star-half={halfVal}
                        onClick={() => setRating(halfVal)}
                        onMouseEnter={() => setHoverRating(halfVal)}
                        aria-label={`${halfVal} stars`}
                        className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
                      />
                      <button
                        type="button"
                        data-star-half={fullVal}
                        onClick={() => setRating(fullVal)}
                        onMouseEnter={() => setHoverRating(fullVal)}
                        aria-label={`${fullVal} stars`}
                        className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
              {rating > 0 && (
                <span className="text-sm font-semibold text-primary">{rating.toFixed(1)}</span>
              )}
            </div>
          </Field>

          <Field
            label="Written review"
            required
            hint={
              <span className={cn(counterReached ? "text-primary" : "text-muted-foreground/70")}>
                {body.length}/{MIN_BODY} min
              </span>
            }
          >
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What did you sign up for? What did you actually get? What were the results? Would you recommend this coach and why or why not?"
              rows={7}
              required
              minLength={MIN_BODY}
              maxLength={4000}
            />
            {body.length >= DETAILED_THRESHOLD ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                <BadgeCheck className="h-3.5 w-3.5 fill-primary/20 text-primary" />
                ✦ Detailed Review badge earned
              </p>
            ) : body.length >= MIN_BODY ? (
              <p className="mt-2 text-xs text-primary/70">
                ✦ Reach {DETAILED_THRESHOLD} characters to earn a Detailed Review badge
              </p>
            ) : null}
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

          <Field label="Upload evidence (optional)" hint={user ? `${files.length}/3` : "Sign in to attach"}>
            <label className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card/40 p-6 text-center transition-colors",
              user ? "cursor-pointer hover:border-primary/40" : "cursor-not-allowed opacity-60",
            )}>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {user
                  ? "Add receipts, screenshots of results, or proof of purchase"
                  : "Sign in to attach receipts or screenshots as evidence"}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onPickFiles}
                disabled={!user || files.length >= 3}
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
            <p className="mt-1 text-xs text-muted-foreground">Used only to verify your review. Never shown publicly.</p>
          </Field>
        </section>

        <StrengthCard tier={tier} />

        <Button type="submit" className="h-12 w-full text-sm font-semibold">
          Submit Review
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Your review will be posted publicly on the coach's Aytopus profile.
        </p>
      </form>

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        tier={tier}
        score={completenessScore}
        saving={saving}
        onSubmit={doSubmit}
      />
      </div>
    </>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label} {required && <span className="text-primary">*</span>}
        </label>
        {hint && <span className="text-[10px]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const TIER_META: Record<Tier, { label: string; desc: string; icon: React.ReactNode; badge: string; motivation: string }> = {
  basic: {
    label: "Basic",
    desc: "Comment only, no purchase confirmation",
    icon: <Check className="h-3.5 w-3.5" />,
    badge: "bg-muted text-muted-foreground",
    motivation: "Adding purchase confirmation or evidence makes your review more trustworthy to buyers.",
  },
  verified: {
    label: "Verified",
    desc: "Purchase confirmed via checkbox",
    icon: <BadgeCheck className="h-3.5 w-3.5" />,
    badge: "bg-primary/15 text-primary ring-1 ring-primary/30",
    motivation: "Great — purchase confirmed. Adding evidence would make this a top-tier review.",
  },
  evidenced: {
    label: "Evidenced",
    desc: "Purchase confirmed + at least one photo or file uploaded",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    badge: "bg-primary/15 text-primary ring-1 ring-primary/30",
    motivation: "This is a high-trust review. Thank you for the detail.",
  },
};

function StrengthCard({ tier }: { tier: Tier }) {
  const tiers: Tier[] = ["basic", "verified", "evidenced"];
  const active = TIER_META[tier];
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your review strength</p>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]", active.badge)}>
          {active.icon} {active.label}
        </span>
      </div>
      <ul className="space-y-2">
        {tiers.map((id) => {
          const t = TIER_META[id];
          const isActive = id === tier;
          return (
            <li key={id} className={cn("flex items-start gap-2.5 text-xs", isActive ? "text-foreground" : "text-muted-foreground/70")}>
              <span className={cn("mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full", isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                {t.icon}
              </span>
              <span><span className="font-semibold">{t.label}</span> — {t.desc}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ConfirmModal({
  open, onOpenChange, tier, score, saving, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tier: Tier;
  score: number;
  saving: boolean;
  onSubmit: () => void;
}) {
  const meta = TIER_META[tier];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Your review strength</DialogTitle>
          <DialogDescription className="sr-only">Confirm your review submission</DialogDescription>
        </DialogHeader>

        <TooltipProvider delayDuration={150}>
          <div className="relative rounded-md border border-border bg-card/60 p-4 pl-5">
            <ReviewValidityBar score={score} />
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", meta.badge)}>
                {meta.icon} {meta.label}
              </span>
              <p className="text-sm text-muted-foreground">{meta.desc}</p>
              <p className="text-sm text-foreground/90">{meta.motivation}</p>
            </div>
          </div>
        </TooltipProvider>

        <div className="mt-2 flex flex-col gap-2">
          <Button onClick={onSubmit} disabled={saving} className="h-11 w-full text-sm font-semibold">
            {saving ? "Submitting…" : "Submit Review"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-9 w-full text-xs"
          >
            Go back and add more
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
