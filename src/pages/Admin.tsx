import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Navigate, Link } from "react-router-dom";
import { RefreshCw, ShieldAlert, Users, Star, Package, MessageSquare, Flag, UserPlus, Trash2, Search, Ban, Check, X as XIcon, Send, AlertTriangle, FileWarning, LayoutDashboard, Radio, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isAdminUsername } from "@/lib/admin";
import { normalizeSocialHandle } from "@/lib/socialHandles";
import { tierForReviewCount, TIER_LABEL } from "@/lib/tiers";
import { KeywordsInput } from "@/components/KeywordsInput";
import { AvatarCropperDialog } from "@/components/AvatarCropper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { BASE_COACH_CATEGORIES, useProfileCategories } from "@/lib/useProfileCategories";

const COACH_CATEGORIES: readonly string[] = [...BASE_COACH_CATEGORIES, "Other"];

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export type CoachPrefill = { fullName?: string; websiteUrl?: string };

function CreateCoachProfileForm({
  onCreated,
  initial,
}: {
  onCreated?: (info: { username: string }) => void;
  initial?: CoachPrefill;
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [slug, setSlug] = useState(initial?.fullName ? slugifyName(initial.fullName) : "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const effectiveCategory = category === "Other" ? customCategory.trim() : category;
  const dynamicCategories = useProfileCategories();
  const [websiteUrl, setWebsiteUrl] = useState(initial?.websiteUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [bio, setBio] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ slug: string } | null>(null);

  const handleNameChange = (v: string) => {
    setFullName(v);
    if (!slugTouched) setSlug(slugifyName(v));
  };

  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (f) setPendingFile(f);
  };

  const handleCropped = (blob: Blob) => {
    const cropped = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(cropped);
    setAvatarPreview(URL.createObjectURL(cropped));
    setPendingFile(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!fullName.trim() || !slug.trim() || !effectiveCategory) {
      setError("Full name, slug, and category are required.");
      return;
    }
    setSubmitting(true);

    let uploadedAvatarUrl = "";
    if (avatarFile) {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setSubmitting(false);
        setError("Not authenticated.");
        return;
      }
      const ext = (avatarFile.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${uid}/unclaimed/${Date.now()}-${slug}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type || "image/jpeg" });
      if (upErr) {
        setSubmitting(false);
        setError(`Image upload failed: ${upErr.message}`);
        return;
      }
      uploadedAvatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }

    const { data, error: rpcErr } = await supabase.rpc(
      "admin_create_unclaimed_profile" as never,
      {
        p_username: slug,
        p_display_name: fullName.trim(),
        p_service_category: effectiveCategory,
        p_bio: bio.trim(),
        p_website_url: websiteUrl.trim(),
        p_instagram_url: instagramUrl.trim() ? normalizeSocialHandle("instagram", instagramUrl) : "",
        p_twitter_url: twitterUrl.trim() ? normalizeSocialHandle("twitter", twitterUrl) : "",
        p_youtube_url: youtubeUrl.trim() ? normalizeSocialHandle("youtube", youtubeUrl) : "",
        p_linkedin_url: linkedinUrl.trim() ? normalizeSocialHandle("linkedin", linkedinUrl) : "",
        p_tiktok_url: tiktokUrl.trim() ? normalizeSocialHandle("tiktok", tiktokUrl) : "",
        p_avatar_url: uploadedAvatarUrl,
        p_keywords: keywords,
      } as never,
    );
    setSubmitting(false);
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    const created = (data as Array<{ id: string; username: string }> | null)?.[0];
    if (created) {
      setSuccess({ slug: created.username });
      setFullName(""); setSlug(""); setSlugTouched(false); setCategory(""); setCustomCategory("");
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarFile(null); setAvatarPreview(null);
      setWebsiteUrl(""); setInstagramUrl(""); setTwitterUrl(""); setYoutubeUrl("");
      setLinkedinUrl(""); setTiktokUrl(""); setBio(""); setKeywords([]);
      onCreated?.({ username: created.username });
    }
  };

  return (
    <Card className="border-border/60 bg-card/60 p-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cc-name">Full name *</Label>
            <Input id="cc-name" value={fullName} onChange={(e) => handleNameChange(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="cc-slug">Profile slug *</Label>
            <Input
              id="cc-slug"
              value={slug}
              onChange={(e) => { setSlugTouched(true); setSlug(slugifyName(e.target.value)); }}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">URL: /@{slug || "your-slug"}</p>
          </div>
        </div>

        <div>
          <Label htmlFor="cc-avatar">Profile photo (optional)</Label>
          {avatarPreview && (
            <div className="mt-2 mb-2">
              <img
                src={avatarPreview}
                alt="Profile preview"
                className="h-20 w-20 rounded-full object-cover border border-border"
              />
            </div>
          )}
          <Input
            id="cc-avatar"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
          />
          <AvatarCropperDialog
            file={pendingFile}
            onCancel={() => setPendingFile(null)}
            onCropped={handleCropped}
          />
        </div>


        <div>
          <Label>Category *</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
            <SelectContent>
              {dynamicCategories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {category === "Other" && (
            <Input
              className="mt-2"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Enter a custom category"
              maxLength={60}
            />
          )}
        </div>


        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><Label htmlFor="cc-web">Website URL</Label><Input id="cc-web" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} /></div>
          <div><Label htmlFor="cc-ig">Instagram</Label><Input id="cc-ig" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="@yourhandle" /></div>
          <div><Label htmlFor="cc-tw">Twitter/X</Label><Input id="cc-tw" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="@yourhandle" /></div>
          <div><Label htmlFor="cc-yt">YouTube URL</Label><Input id="cc-yt" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="@yourchannel" /></div>
          <div><Label htmlFor="cc-li">LinkedIn URL</Label><Input id="cc-li" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="yourname or full URL" /></div>
          <div><Label htmlFor="cc-tt">TikTok</Label><Input id="cc-tt" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="@yourhandle" /></div>
        </div>

        <div>
          <Label htmlFor="cc-bio">Short bio</Label>
          <Textarea id="cc-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        </div>

        <div>
          <Label>Keywords</Label>
          <p className="mb-2 text-xs text-muted-foreground">Add terms that describe your niche, specialty, or offers. Helps people find you.</p>
          <KeywordsInput value={keywords} onChange={setKeywords} />
        </div>


        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
        {success && (
          <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm">
            Profile created.{" "}
            <Link to={`/@${success.slug}`} className="font-medium text-primary underline">
              View /@{success.slug}
            </Link>
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {submitting ? "Creating…" : "Create Profile"}
        </Button>
      </form>
    </Card>
  );
}

type AdminUserRow = {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  review_count: number;
  created_at: string;
};

const STAT_PLACEHOLDER = "—" as const;
type StatValue = number | typeof STAT_PLACEHOLDER;

type Stats = {
  users: { total: StatValue; last_24h: StatValue; last_7d: StatValue };
  reviews: {
    verified_total: StatValue;
    proof_total: StatValue;
    last_24h: StatValue;
    last_7d: StatValue;
    top_provider: { username: string | null; display_name: string | null; count: StatValue } | null;
  };
  offers: { total: StatValue; paid: StatValue; free_for_testimonial: StatValue; last_7d: StatValue };
  activity: {
    messages_total: StatValue;
    messages_24h: StatValue;
    active_threads_7d: StatValue;
    follows_total: StatValue;
  };
  moderation: {
    open_disputes_count: number;
    open_disputes: Array<{
      id: string;
      reason: string;
      created_at: string;
      review_type: string;
      status: string;
      provider_username: string | null;
      provider_display_name: string | null;
    }>;
    pending_proof_requests_count: number;
    pending_proof_requests: Array<{
      id: string;
      requester_email: string | null;
      requester_message: string | null;
      created_at: string;
      proof_review_id: string;
    }>;
    disputed_reviews_count: number;
    disputed_reviews: Array<{
      id: string;
      reviewer_name: string;
      rating: number;
      disputed_at: string | null;
      provider_username: string | null;
      provider_display_name: string | null;
    }>;
  };
};

const EMPTY_STATS: Stats = {
  users: { total: STAT_PLACEHOLDER, last_24h: STAT_PLACEHOLDER, last_7d: STAT_PLACEHOLDER },
  reviews: {
    verified_total: STAT_PLACEHOLDER,
    proof_total: STAT_PLACEHOLDER,
    last_24h: STAT_PLACEHOLDER,
    last_7d: STAT_PLACEHOLDER,
    top_provider: null,
  },
  offers: { total: STAT_PLACEHOLDER, paid: STAT_PLACEHOLDER, free_for_testimonial: STAT_PLACEHOLDER, last_7d: STAT_PLACEHOLDER },
  activity: { messages_total: STAT_PLACEHOLDER, messages_24h: STAT_PLACEHOLDER, active_threads_7d: STAT_PLACEHOLDER, follows_total: STAT_PLACEHOLDER },
  moderation: { open_disputes_count: 0, open_disputes: [], pending_proof_requests_count: 0, pending_proof_requests: [], disputed_reviews_count: 0, disputed_reviews: [] },
};

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="border-border/60 bg-card/60 p-5">
      <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-serif text-3xl text-foreground">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </Card>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Users; children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
      <Icon className="h-4 w-4 text-primary" />
      <h2 className="font-serif text-xl text-foreground">{children}</h2>
    </div>
  );
}

function Section({ icon, title, children }: { icon: typeof Users; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-lg border border-border bg-card/40 p-5 sm:p-6">
      <SectionTitle icon={icon}>{title}</SectionTitle>
      {children}
    </section>
  );
}

function fmt(d: string) {
  return new Date(d).toLocaleString();
}

function getLoadErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  return "Unable to load admin dashboard.";
}

function isRetryableLoadError(err: unknown) {
  const message = err instanceof Error
    ? err.message
    : typeof err === "object" && err && "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : "";
  return /load failed|failed to fetch|networkerror/i.test(message);
}

type AdminRpcResponse<T> = { data: T | null; error: { message: string } | null };

async function retryLoad<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await operation();
      const responseError = (result as AdminRpcResponse<unknown>)?.error;
      if (responseError && isRetryableLoadError(responseError)) throw new Error(responseError.message);
      return result;
    } catch (err) {
      lastError = err;
      if (attempt === attempts || !isRetryableLoadError(err)) break;
      await new Promise((resolve) => window.setTimeout(resolve, attempt * 350));
    }
  }
  throw lastError;
}

function logStatError(label: string, err: unknown) {
  console.warn(`[Admin stats] ${label} failed`, err);
}

async function safeStat(label: string, operation: () => Promise<number>): Promise<StatValue> {
  try {
    return await retryLoad(operation, 2);
  } catch (err) {
    logStatError(label, err);
    return STAT_PLACEHOLDER;
  }
}

type CountResult = { count: number | null; error: { message: string } | null };
type StatQuery = PromiseLike<CountResult> & {
  gt: (column: string, value: string | number) => StatQuery;
  eq: (column: string, value: string | number | boolean) => StatQuery;
};
type StatTable = { select: (columns: string, options: { count: "exact"; head: true }) => StatQuery };

async function countStat(label: string, table: string, apply?: (query: StatQuery) => StatQuery): Promise<StatValue> {
  return safeStat(label, async () => {
    let query = (supabase.from(table as never) as unknown as StatTable).select("id", { count: "exact", head: true });
    if (apply) query = apply(query);
    const { count, error } = await query;
    if (error) throw new Error(error.message);
    return count ?? 0;
  });
}

async function sumStats(label: string, stats: Promise<StatValue>[]): Promise<StatValue> {
  try {
    const values = await Promise.all(stats);
    if (values.some((value) => value === STAT_PLACEHOLDER)) return STAT_PLACEHOLDER;
    return values.reduce<number>((total, value) => total + Number(value), 0);
  } catch (err) {
    logStatError(label, err);
    return STAT_PLACEHOLDER;
  }
}

async function topProviderStat(): Promise<Stats["reviews"]["top_provider"]> {
  try {
    const { data, error } = await retryLoad(async () => (
      await supabase
        .from("profiles")
        .select("username, display_name, review_count")
        .gt("review_count", 0)
        .order("review_count", { ascending: false })
        .limit(1)
        .maybeSingle()
    ), 2);
    if (error) throw new Error(error.message);
    if (!data) return { username: null, display_name: null, count: 0 };
    return {
      username: data.username ?? null,
      display_name: data.display_name ?? null,
      count: data.review_count ?? 0,
    };
  } catch (err) {
    logStatError("Top provider", err);
    return null;
  }
}

async function loadDashboardStats(): Promise<Stats> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const verified24h = countStat("Verified reviews 24h", "reviews", (q) => q.gt("created_at", since24h));
  const proof24h = countStat("Proof-backed reviews 24h", "proof_backed_reviews", (q) => q.gt("created_at", since24h));
  const verified7d = countStat("Verified reviews 7d", "reviews", (q) => q.gt("created_at", since7d));
  const proof7d = countStat("Proof-backed reviews 7d", "proof_backed_reviews", (q) => q.gt("created_at", since7d));

  const [
    usersTotal,
    users24h,
    users7d,
    verifiedTotal,
    proofTotal,
    reviews24h,
    reviews7d,
    topProvider,
    offersTotal,
    paidOffers,
    freeForTestimonial,
    offers7d,
    messagesTotal,
    messages24h,
    activeThreads7d,
    followsTotal,
  ] = await Promise.all([
    countStat("Total users", "profiles"),
    countStat("Signups 24h", "profiles", (q) => q.gt("created_at", since24h)),
    countStat("Signups 7d", "profiles", (q) => q.gt("created_at", since7d)),
    countStat("Verified reviews total", "reviews"),
    countStat("Proof-backed reviews total", "proof_backed_reviews"),
    sumStats("Reviews 24h", [verified24h, proof24h]),
    sumStats("Reviews 7d", [verified7d, proof7d]),
    topProviderStat(),
    countStat("Total offers", "offers"),
    countStat("Paid offers", "offers", (q) => q.gt("price_cents", 0)),
    countStat("Free-for-testimonial offers", "offers", (q) => q.eq("free_for_testimonial", true)),
    countStat("Offers created 7d", "offers", (q) => q.gt("created_at", since7d)),
    countStat("Messages total", "messages"),
    countStat("Messages 24h", "messages", (q) => q.gt("created_at", since24h)),
    countStat("Active threads 7d", "message_threads", (q) => q.gt("last_message_at", since7d)),
    countStat("Total follows", "follows"),
  ]);

  return {
    ...EMPTY_STATS,
    users: { total: usersTotal, last_24h: users24h, last_7d: users7d },
    reviews: {
      verified_total: verifiedTotal,
      proof_total: proofTotal,
      last_24h: reviews24h,
      last_7d: reviews7d,
      top_provider: topProvider,
    },
    offers: { total: offersTotal, paid: paidOffers, free_for_testimonial: freeForTestimonial, last_7d: offers7d },
    activity: { messages_total: messagesTotal, messages_24h: messages24h, active_threads_7d: activeThreads7d, follows_total: followsTotal },
  };
}

export default function Admin() {
  const { user, profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachPrefill, setCoachPrefill] = useState<CoachPrefill | undefined>(undefined);
  const [prefillKey, setPrefillKey] = useState(0);


  const createFormRef = useRef<HTMLDivElement | null>(null);
  type SectionKey =
    | "dashboard"
    | "moderation"
    | "review-queue"
    | "claims"
    
    | "team-messages"
    | "broadcast"
    | "users"
    | "create-profile"
    | "manage-profiles";
  const [active, setActive] = useState<SectionKey>("dashboard");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResult, usersResult] = await Promise.allSettled([
        loadDashboardStats(),
        retryLoad(async () => (await supabase.rpc("admin_list_users" as never)) as AdminRpcResponse<AdminUserRow[]>),
      ]);

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value);
      } else {
        setStats(EMPTY_STATS);
        console.warn("[Admin stats] Dashboard stats failed", statsResult.reason);
      }

      if (usersResult.status === "fulfilled") {
        if (!usersResult.value.error) setUsers((usersResult.value.data as unknown as AdminUserRow[]) ?? []);
        else setError((current) => current ?? usersResult.value.error.message);
      } else {
        setError((current) => current ?? getLoadErrorMessage(usersResult.reason));
      }
    } catch (err) {
      setStats(null);
      setError(getLoadErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdminUsername(profile?.username)) void fetchAll();
  }, [authLoading, profile?.username, fetchAll]);

  if (authLoading) return null;
  if (!user || !isAdminUsername(profile?.username)) {
    return <Navigate to="/explore" replace />;
  }

  const NAV: { key: SectionKey; label: string; icon: typeof Users }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "moderation", label: "Moderation", icon: Flag },
    { key: "review-queue", label: "Review Moderation", icon: Star },
    { key: "claims", label: "Claim Requests", icon: UserPlus },
    
    { key: "team-messages", label: "Team Messages", icon: MessageSquare },
    { key: "broadcast", label: "Broadcast", icon: Radio },
    { key: "users", label: "User Management", icon: Users },
    { key: "create-profile", label: "Create Profile", icon: UserPlus },
    { key: "manage-profiles", label: "Manage Profiles", icon: Trash2 },
  ];

  const sectionTitle = NAV.find((n) => n.key === active)?.label ?? "";

  return (
    <div className="flex min-h-[calc(100vh-56px)] w-full">
      {/* Admin sidebar */}
      <aside className="hidden w-[200px] shrink-0 border-r border-border bg-card/40 md:block">
        <div className="sticky top-14 flex h-[calc(100vh-56px)] flex-col">
          <div className="flex items-center gap-2 border-b border-border px-4 py-4">
            <Logo />
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
            {NAV.map((item) => {
              const isActive = item.key === active;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActive(item.key)}
                  className={cn(
                    "flex items-center gap-2.5 border-l-2 px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "border-primary bg-secondary text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main */}
      <div className="min-w-0 flex-1">
        {/* Mobile section picker */}
        <div className="border-b border-border bg-card/40 px-4 py-3 md:hidden">
          <Select value={active} onValueChange={(v) => setActive(v as SectionKey)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {NAV.map((n) => <SelectItem key={n.key} value={n.key}>{n.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-primary">
                <ShieldAlert className="h-3.5 w-3.5" /> Admin
              </div>
              <h1 className="mt-1 truncate font-serif text-3xl text-foreground">{sectionTitle}</h1>
            </div>
            <Button onClick={fetchAll} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {error ? (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {loading && !stats ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : !stats ? (
            <div className="text-sm text-muted-foreground">Unable to load dashboard stats. Try Refresh.</div>
          ) : (
            <div className="min-w-0">
              {active === "dashboard" && (
                <div className="space-y-6">
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Users</p>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <StatCard label="Total users" value={stats.users.total} />
                      <StatCard label="Signups 24h" value={stats.users.last_24h} />
                      <StatCard label="Signups 7d" value={stats.users.last_7d} />
                      <StatCard
                        label="Top provider"
                        value={stats.reviews.top_provider?.count ?? 0}
                        hint={stats.reviews.top_provider ? `@${stats.reviews.top_provider.username}` : "—"}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Reviews</p>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <StatCard label="Verified total" value={stats.reviews.verified_total} />
                      <StatCard label="Proof-backed total" value={stats.reviews.proof_total} />
                      <StatCard label="Reviews 24h" value={stats.reviews.last_24h} hint="Both types" />
                      <StatCard label="Reviews 7d" value={stats.reviews.last_7d} hint="Both types" />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Offers</p>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <StatCard label="Total offers" value={stats.offers.total} />
                      <StatCard label="Paid offers" value={stats.offers.paid} />
                      <StatCard label="Free-for-testimonial" value={stats.offers.free_for_testimonial} />
                      <StatCard label="Created 7d" value={stats.offers.last_7d} />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Activity</p>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <StatCard label="Messages total" value={stats.activity.messages_total} />
                      <StatCard label="Messages 24h" value={stats.activity.messages_24h} />
                      <StatCard label="Active threads 7d" value={stats.activity.active_threads_7d} />
                      <StatCard label="Total follows" value={stats.activity.follows_total} />
                    </div>
                  </div>
                </div>
              )}

              {active === "moderation" && (
                <Tabs defaultValue="reports">
                  <TabsList>
                    <TabsTrigger value="reports">Reported Profiles</TabsTrigger>
                    <TabsTrigger value="disputes">Disputed Reviews</TabsTrigger>
                    <TabsTrigger value="flagged">Flagged Content</TabsTrigger>
                  </TabsList>
                  <TabsContent value="reports" className="mt-4">
                    <ReportedProfilesPanel />
                  </TabsContent>
                  <TabsContent value="disputes" className="mt-4">
                    <EmptyState icon={AlertTriangle} message="No disputes yet." />
                  </TabsContent>
                  <TabsContent value="flagged" className="mt-4">
                    <EmptyState icon={FileWarning} message="No flagged content yet." />
                  </TabsContent>
                </Tabs>
              )}

              {active === "review-queue" && <ReviewQueuePanel />}

              {active === "claims" && <ClaimRequestsPanel />}

              {active === "profile-requests" && (
                <ProfileRequestsPanel
                  reloadKey={profileRequestsReloadKey}
                  onCreateProfile={(row) => {
                    setCoachPrefill({ fullName: row.coach_name, websiteUrl: row.unmatched_link ?? "" });
                    setPrefillKey((k) => k + 1);
                    setPendingReviewId(row.id);
                    setActive("create-profile");
                    setTimeout(() => createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                  }}
                />
              )}

              {active === "team-messages" && <TeamMessagesPanel />}

              {active === "broadcast" && <BroadcastPanel />}

              {active === "users" && (
                <UserManagementPanel users={users} onReload={() => void fetchAll()} />
              )}

              {active === "create-profile" && (
                <div ref={createFormRef}>
                  <CreateCoachProfileForm
                    key={prefillKey}
                    initial={coachPrefill}
                    onCreated={async () => {
                      if (pendingReviewId) {
                        await supabase.from("unclaimed_reviews").update({ needs_profile: false } as never).eq("id", pendingReviewId);
                        setPendingReviewId(null);
                        setCoachPrefill(undefined);
                        setProfileRequestsReloadKey((k) => k + 1);
                      }
                      void fetchAll();
                    }}
                  />
                </div>
              )}

              {active === "manage-profiles" && <ManageUnclaimedProfiles />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function EmptyState({ icon: Icon, message }: { icon: typeof Users; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-card/30 px-6 py-10 text-center">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ---------------- Reported Profiles ----------------

type ReportRow = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_user_id: string | null;
  reported_profile_id: string;
  reporter_username: string | null;
  reported_username: string | null;
  reported_display_name: string | null;
};

function ReportedProfilesPanel() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("profile_reports")
      .select("id, reason, details, status, created_at, reporter_user_id, reported_profile_id")
      .order("created_at", { ascending: false });
    if (error) { setErr(error.message); setLoading(false); return; }
    const reports = (data ?? []) as Array<Omit<ReportRow, "reporter_username" | "reported_username" | "reported_display_name">>;
    const ids = Array.from(new Set([
      ...reports.map((r) => r.reporter_user_id).filter(Boolean) as string[],
      ...reports.map((r) => r.reported_profile_id),
    ]));
    const profMap = new Map<string, { username: string; display_name: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, username, display_name").in("id", ids);
      for (const p of (profs ?? []) as Array<{ id: string; username: string; display_name: string | null }>) {
        profMap.set(p.id, { username: p.username, display_name: p.display_name });
      }
    }
    setRows(reports.map((r) => ({
      ...r,
      reporter_username: r.reporter_user_id ? profMap.get(r.reporter_user_id)?.username ?? null : null,
      reported_username: profMap.get(r.reported_profile_id)?.username ?? null,
      reported_display_name: profMap.get(r.reported_profile_id)?.display_name ?? null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const dismiss = async (id: string) => {
    const { error } = await supabase.from("profile_reports").update({ status: "dismissed" }).eq("id", id);
    if (error) { toast({ title: "Couldn't dismiss", description: error.message, variant: "destructive" }); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const warn = (r: ReportRow) => {
    toast({ title: "User warned", description: `@${r.reported_username ?? "user"} has been flagged for warning.` });
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (err) return <div className="text-sm text-destructive">{err}</div>;
  const pending = rows.filter((r) => r.status === "pending");
  if (pending.length === 0) return <EmptyState icon={Flag} message="No reported profiles." />;

  return (
    <div className="space-y-2">
      {pending.map((r) => (
        <div key={r.id} className="rounded-md border border-border bg-card/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="text-muted-foreground">Reporter:</span>{" "}
                <span className="font-medium">@{r.reporter_username ?? "anonymous"}</span>
                {" · "}
                <span className="text-muted-foreground">Reported:</span>{" "}
                {r.reported_username ? (
                  <Link to={`/@${r.reported_username}`} className="font-medium hover:text-primary">
                    @{r.reported_username}
                  </Link>
                ) : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Reason: {r.reason}</p>
              {r.details && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.details}</p>}
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">{fmt(r.created_at)}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => dismiss(r.id)}>
                <XIcon className="h-3.5 w-3.5" /> Dismiss
              </Button>
              <Button size="sm" variant="destructive" onClick={() => warn(r)}>
                <AlertTriangle className="h-3.5 w-3.5" /> Warn User
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- Review Moderation Queue ----------------

type ReviewQueueRow = {
  id: string;
  review_type: "public" | "unclaimed";
  status: string;
  rating: number;
  body: string | null;
  reviewer_name: string | null;
  reviewer_email: string | null;
  target_name: string | null;
  target_username: string | null;
  target_profile_id: string | null;
  created_at: string;
  verified_at: string | null;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function ReviewQueuePanel() {
  const [rows, setRows] = useState<ReviewQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase.rpc("admin_list_review_queue" as never, { p_limit: 200 } as never);
    if (error) setErr(error.message);
    else setRows((data ?? []) as ReviewQueueRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const verify = async (r: ReviewQueueRow) => {
    setBusyId(r.id);
    const { error } = await supabase.rpc("admin_verify_review" as never, {
      p_review_id: r.id, p_review_type: r.review_type,
    } as never);
    setBusyId(null);
    if (error) { toast({ title: "Verify failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Review verified" });
    setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "verified", verified_at: new Date().toISOString() } : x));
  };

  const remove = async (r: ReviewQueueRow) => {
    setBusyId(r.id);
    const { error } = await supabase.rpc("admin_delete_review" as never, {
      p_review_id: r.id, p_review_type: r.review_type,
    } as never);
    setBusyId(null);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Review deleted" });
    setRows((prev) => prev.filter((x) => x.id !== r.id));
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (err) return <div className="text-sm text-destructive">{err}</div>;

  const filtered = rows.filter((r) => filter === "all" ? true : r.status === filter);
  const counts = {
    pending: rows.filter((r) => r.status === "pending").length,
    verified: rows.filter((r) => r.status === "verified").length,
    all: rows.length,
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["pending", "verified", "all"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em]",
              filter === k
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {k} <span className="ml-1 text-muted-foreground/70">({counts[k]})</span>
          </button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Star} message="No reviews in this view." />
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={`${r.review_type}-${r.id}`} className="rounded-md border border-border bg-card/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={cn(
                      "rounded-sm border px-1.5 py-0.5 uppercase tracking-[0.14em]",
                      r.review_type === "public"
                        ? "border-primary/40 text-primary"
                        : "border-amber-500/40 text-amber-500",
                    )}>
                      {r.review_type}
                    </span>
                    <span className={cn(
                      "rounded-sm border px-1.5 py-0.5 uppercase tracking-[0.14em]",
                      r.status === "pending"
                        ? "border-yellow-500/40 text-yellow-500"
                        : "border-emerald-500/40 text-emerald-500",
                    )}>
                      {r.status}
                    </span>
                    <span className="text-muted-foreground">
                      {r.rating}★ · {timeAgo(r.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">From:</span>{" "}
                    <span className="font-medium">{r.reviewer_name ?? "—"}</span>
                    {r.reviewer_email && (
                      <span className="text-muted-foreground"> &lt;{r.reviewer_email}&gt;</span>
                    )}
                    {" · "}
                    <span className="text-muted-foreground">Target:</span>{" "}
                    {r.target_username ? (
                      <Link to={`/@${r.target_username}`} className="font-medium hover:text-primary">
                        @{r.target_username}
                      </Link>
                    ) : (
                      <span className="font-medium">{r.target_name ?? "—"}</span>
                    )}
                  </p>
                  {r.body && (
                    <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                      {r.body}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {r.status !== "verified" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === r.id}
                      onClick={() => void verify(r)}
                    >
                      <Check className="h-3.5 w-3.5" /> Verify now
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" disabled={busyId === r.id}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this review?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes the review from the {r.review_type} table.
                          If it was verified, provider stats will be recalculated by the delete trigger.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void remove(r)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Claim Requests ----------------

type ClaimRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  verification_method: string;
  verification_value: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  profile_id: string;
};

function ClaimRequestsPanel() {
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("claims_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else setRows((data ?? []) as ClaimRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("claims_requests").update({ status }).eq("id", id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (err) return <div className="text-sm text-destructive">{err}</div>;

  const pending = rows.filter((r) => r.status === "pending");
  const resolved = rows.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-4">
      {pending.length === 0 ? (
        <EmptyState icon={UserPlus} message="No pending claim requests." />
      ) : (
        <div className="space-y-2">
          {pending.map((r) => (
            <ClaimRow key={r.id} row={r} onApprove={() => setStatus(r.id, "approved")} onReject={() => setStatus(r.id, "rejected")} />
          ))}
        </div>
      )}
      {resolved.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              Resolved ({resolved.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {resolved.map((r) => (
              <ClaimRow key={r.id} row={r} resolved />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function ClaimRow({ row, onApprove, onReject, resolved }: { row: ClaimRow; onApprove?: () => void; onReject?: () => void; resolved?: boolean }) {
  return (
    <div className={`rounded-md border border-border bg-card/60 p-4 ${resolved ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{row.full_name}</p>
          <p className="text-xs text-muted-foreground">{row.email}{row.phone ? ` · ${row.phone}` : ""}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Verification: <span className="text-foreground">{row.verification_method}</span>
            {row.verification_value ? ` — ${row.verification_value}` : ""}
          </p>
          {row.notes && <p className="mt-1 text-xs text-muted-foreground">Notes: {row.notes}</p>}
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">{fmt(row.created_at)} · {row.status}</p>
        </div>
        {!resolved && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onReject}>
              <XIcon className="h-3.5 w-3.5" /> Reject
            </Button>
            <Button size="sm" onClick={onApprove}>
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Team Messages ----------------

type TeamMsg = {
  id: string;
  user_id: string;
  sender_id: string;
  from_admin: boolean;
  body: string;
  created_at: string;
};

type TeamProf = { username: string; display_name: string | null; avatar_url: string | null };

function initialsOf(s: string) {
  return s.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function TeamAvatar({ prof, size = 40 }: { prof: TeamProf | undefined; size?: number }) {
  const name = prof?.display_name || prof?.username || "?";
  if (prof?.avatar_url) {
    return <img src={prof.avatar_url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/30"
    >
      {initialsOf(name)}
    </div>
  );
}

function TeamMessagesPanel() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<TeamMsg[]>([]);
  const [profs, setProfs] = useState<Map<string, TeamProf>>(new Map());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [sendingFor, setSendingFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("team_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) { setErr(error.message); setLoading(false); return; }
    const list = (data ?? []) as TeamMsg[];
    setMsgs(list);
    const ids = Array.from(new Set(list.map((m) => m.user_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ids);
      const map = new Map<string, TeamProf>();
      for (const p of (ps ?? []) as Array<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>) {
        map.set(p.id, { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url });
      }
      setProfs(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Group messages by conversation (user_id). Most recent conversation first.
  const conversations = useMemo(() => {
    const byUser = new Map<string, TeamMsg[]>();
    for (const m of msgs) {
      const arr = byUser.get(m.user_id) ?? [];
      arr.push(m);
      byUser.set(m.user_id, arr);
    }
    const out: { userId: string; messages: TeamMsg[]; lastAt: string }[] = [];
    for (const [userId, messages] of byUser) {
      const lastAt = messages[messages.length - 1]?.created_at ?? "";
      out.push({ userId, messages, lastAt });
    }
    out.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
    return out;
  }, [msgs]);

  const sendReply = async (userId: string) => {
    if (!user) return;
    const body = (replyDraft[userId] || "").trim();
    if (!body) return;
    setSendingFor(userId);
    const { error } = await supabase.from("team_messages").insert({
      user_id: userId,
      sender_id: user.id,
      from_admin: true,
      body: body.slice(0, 4000),
    });
    setSendingFor(null);
    if (error) { toast({ title: "Send failed", description: error.message, variant: "destructive" }); return; }
    setReplyDraft((prev) => ({ ...prev, [userId]: "" }));
    toast({ title: "Reply sent" });
    void load();
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (err) return <div className="text-sm text-destructive">{err}</div>;
  if (conversations.length === 0) return <EmptyState icon={MessageSquare} message="No team messages yet." />;

  return (
    <div className="space-y-4">
      {conversations.map(({ userId, messages }) => {
        const prof = profs.get(userId);
        const name = prof?.display_name || (prof?.username ? `@${prof.username}` : userId.slice(0, 8));
        return (
          <div key={userId} className="overflow-hidden rounded-lg border border-border bg-card/60">
            {/* Conversation header */}
            <div className="flex items-center gap-3 border-b border-border bg-background/40 px-4 py-3">
              <TeamAvatar prof={prof} size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{name}</p>
                {prof?.username && (
                  <p className="truncate text-xs text-muted-foreground">@{prof.username}</p>
                )}
              </div>
            </div>

            {/* Message list */}
            <div className="space-y-3 px-4 py-4">
              {messages.map((m) => {
                const isAdmin = m.from_admin;
                return (
                  <div key={m.id} className={cn("flex items-start gap-3", isAdmin && "flex-row-reverse")}>
                    {isAdmin ? (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-1 ring-primary/40">
                        HV
                      </div>
                    ) : (
                      <TeamAvatar prof={prof} size={36} />
                    )}
                    <div className={cn("min-w-0 flex-1", isAdmin && "flex flex-col items-end")}>
                      <div className="flex items-baseline gap-2">
                        <p className="text-xs font-bold text-foreground">
                          {isAdmin ? "Aytopus Team" : name}
                        </p>
                        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
                          {fmt(m.created_at)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "mt-1 inline-block max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm",
                          isAdmin
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground",
                        )}
                      >
                        {m.body}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rounded reply bar */}
            <div className="border-t border-border bg-background/40 px-3 py-3">
              <form
                onSubmit={(e) => { e.preventDefault(); void sendReply(userId); }}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 focus-within:border-primary/60"
              >
                <input
                  type="text"
                  value={replyDraft[userId] ?? ""}
                  onChange={(e) => setReplyDraft((prev) => ({ ...prev, [userId]: e.target.value }))}
                  placeholder={`Reply to ${prof?.username ? `@${prof.username}` : "user"}…`}
                  maxLength={4000}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full"
                  disabled={sendingFor === userId || !(replyDraft[userId] || "").trim()}
                  aria-label="Send reply"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- User Management ----------------

function UserManagementPanel({ users, onReload }: { users: AdminUserRow[]; onReload: () => void }) {
  const [query, setQuery] = useState("");
  const [banningId, setBanningId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.username.toLowerCase().includes(q)
      || (u.display_name ?? "").toLowerCase().includes(q)
      || (u.email ?? "").toLowerCase().includes(q),
    );
  }, [users, query]);

  const ban = async (id: string) => {
    setBanningId(id);
    const { error } = await supabase.rpc("admin_set_banned" as never, { p_user: id, p_banned: true } as never);
    setBanningId(null);
    if (error) { toast({ title: "Ban failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "User banned" });
    onReload();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username, name, or email…"
          className="pl-9"
        />
      </div>
      <Card className="border-border/60 bg-card/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => {
              const tier = tierForReviewCount(u.review_count);
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <Link to={`/@${u.username}`} className="hover:text-primary">@{u.username}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.display_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {TIER_LABEL[tier]} <span className="text-xs">({u.review_count})</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmt(u.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void ban(u.id)}
                      disabled={banningId === u.id}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {banningId === u.id ? "Banning…" : "Ban"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

type UnclaimedRow = {
  id: string;
  username: string;
  display_name: string | null;
  service_category: string | null;
  created_at: string;
};

type UnclaimedFullProfile = {
  id: string;
  username: string;
  display_name: string | null;
  service_category: string | null;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  tiktok_url: string | null;
  keywords: string[] | null;
};

function EditUnclaimedProfileDialog({
  profileId,
  open,
  onOpenChange,
  onSaved,
}: {
  profileId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: (next: { id: string; username: string; display_name: string | null; service_category: string | null }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<UnclaimedFullProfile | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const dynamicCategories = useProfileCategories();

  useEffect(() => {
    if (!open || !profileId) return;
    setErr(null);
    setAvatarFile(null);
    setAvatarPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setLoading(true);
    (async () => {
      const { data: p, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, service_category, bio, avatar_url, website_url, instagram_url, twitter_url, youtube_url, linkedin_url, tiktok_url, keywords")
        .eq("id", profileId)
        .maybeSingle();
      setLoading(false);
      if (error) { setErr(error.message); return; }
      setData(p as UnclaimedFullProfile);
      const cat = (p as UnclaimedFullProfile)?.service_category ?? "";
      setIsOtherCategory(cat !== "" && !dynamicCategories.some((c) => c.toLowerCase() === cat.toLowerCase()));
    })();
  }, [open, profileId]);

  const update = <K extends keyof UnclaimedFullProfile>(k: K, v: UnclaimedFullProfile[K]) => {
    setData((prev) => (prev ? { ...prev, [k]: v } : prev));
  };

  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (f) setPendingFile(f);
  };

  const handleCropped = (blob: Blob) => {
    const cropped = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(cropped);
    setAvatarPreview(URL.createObjectURL(cropped));
    setPendingFile(null);
  };

  const handleSave = async () => {
    if (!data) return;
    setErr(null);
    setSaving(true);
    let nextAvatarUrl = data.avatar_url ?? "";
    if (avatarFile) {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) { setSaving(false); setErr("Not authenticated."); return; }
      const ext = (avatarFile.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${uid}/unclaimed/${Date.now()}-${data.username}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type || "image/jpeg" });
      if (upErr) { setSaving(false); setErr(`Image upload failed: ${upErr.message}`); return; }
      nextAvatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase.rpc("admin_update_unclaimed_profile" as never, {
      p_profile_id: data.id,
      p_username: data.username,
      p_display_name: (data.display_name ?? "").trim(),
      p_service_category: data.service_category ?? "",
      p_bio: (data.bio ?? "").trim(),
      p_avatar_url: nextAvatarUrl,
      p_website_url: (data.website_url ?? "").trim(),
      p_instagram_url: (data.instagram_url ?? "").trim() ? normalizeSocialHandle("instagram", data.instagram_url ?? "") : "",
      p_twitter_url: (data.twitter_url ?? "").trim() ? normalizeSocialHandle("twitter", data.twitter_url ?? "") : "",
      p_youtube_url: (data.youtube_url ?? "").trim() ? normalizeSocialHandle("youtube", data.youtube_url ?? "") : "",
      p_linkedin_url: (data.linkedin_url ?? "").trim() ? normalizeSocialHandle("linkedin", data.linkedin_url ?? "") : "",
      p_tiktok_url: (data.tiktok_url ?? "").trim() ? normalizeSocialHandle("tiktok", data.tiktok_url ?? "") : "",
      p_keywords: data.keywords ?? [],
    } as never);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    const cleanUsername = data.username.toLowerCase().replace(/[^a-z0-9-]/g, "");
    onSaved({
      id: data.id,
      username: cleanUsername,
      display_name: (data.display_name ?? "").trim() || null,
      service_category: data.service_category || null,
    });
    toast({ title: "Profile updated" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        {loading || !data ? (
          <div className="py-8 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="eu-name">Full name</Label>
                <Input id="eu-name" value={data.display_name ?? ""} onChange={(e) => update("display_name", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="eu-slug">Profile slug</Label>
                <Input
                  id="eu-slug"
                  value={data.username}
                  onChange={(e) => update("username", slugifyName(e.target.value))}
                />
                <p className="mt-1 text-xs text-muted-foreground">URL: /@{data.username || "your-slug"}</p>
              </div>
            </div>

            <div>
              <Label htmlFor="eu-avatar">Profile photo</Label>
              {(avatarPreview || data.avatar_url) && (
                <div className="mt-2 mb-2">
                  <img
                    src={avatarPreview || (data.avatar_url as string)}
                    alt="Profile preview"
                    className="h-16 w-16 rounded-full object-cover border border-border"
                  />
                </div>
              )}
              <Input id="eu-avatar" type="file" accept="image/*" onChange={handleAvatar} />
              <AvatarCropperDialog
                file={pendingFile}
                onCancel={() => setPendingFile(null)}
                onCropped={handleCropped}
              />
            </div>

            <div>
              <Label>Category</Label>
              {(() => {
                const current = data.service_category ?? "";
                const matched = dynamicCategories.find((c) => c.toLowerCase() === current.toLowerCase());
                const selectValue = isOtherCategory ? "Other" : (matched ?? "");
                return (
                  <>
                    <Select
                      value={selectValue}
                      onValueChange={(v) => {
                        if (v === "Other") {
                          setIsOtherCategory(true);
                          if (dynamicCategories.some((c) => c.toLowerCase() === current.toLowerCase())) {
                            update("service_category", "");
                          }
                        } else {
                          setIsOtherCategory(false);
                          update("service_category", v);
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                      <SelectContent>
                        {dynamicCategories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isOtherCategory && (
                      <Input
                        className="mt-2"
                        value={current}
                        onChange={(e) => update("service_category", e.target.value)}
                        placeholder="Enter a custom category"
                        maxLength={60}
                      />
                    )}
                  </>
                );
              })()}
            </div>


            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><Label htmlFor="eu-web">Website URL</Label><Input id="eu-web" value={data.website_url ?? ""} onChange={(e) => update("website_url", e.target.value)} /></div>
              <div><Label htmlFor="eu-ig">Instagram</Label><Input id="eu-ig" value={data.instagram_url ?? ""} onChange={(e) => update("instagram_url", e.target.value)} placeholder="@yourhandle" /></div>
              <div><Label htmlFor="eu-tw">Twitter/X</Label><Input id="eu-tw" value={data.twitter_url ?? ""} onChange={(e) => update("twitter_url", e.target.value)} placeholder="@yourhandle" /></div>
              <div><Label htmlFor="eu-yt">YouTube URL</Label><Input id="eu-yt" value={data.youtube_url ?? ""} onChange={(e) => update("youtube_url", e.target.value)} placeholder="@yourchannel" /></div>
              <div><Label htmlFor="eu-li">LinkedIn URL</Label><Input id="eu-li" value={data.linkedin_url ?? ""} onChange={(e) => update("linkedin_url", e.target.value)} placeholder="yourname or full URL" /></div>
              <div><Label htmlFor="eu-tt">TikTok</Label><Input id="eu-tt" value={data.tiktok_url ?? ""} onChange={(e) => update("tiktok_url", e.target.value)} placeholder="@yourhandle" /></div>
            </div>

            <div>
              <Label htmlFor="eu-bio">Short bio</Label>
              <Textarea id="eu-bio" value={data.bio ?? ""} onChange={(e) => update("bio", e.target.value)} rows={4} />
            </div>

            <div>
              <Label>Keywords</Label>
              <p className="mb-2 text-xs text-muted-foreground">Add terms that describe your niche, specialty, or offers. Helps people find you.</p>
              <KeywordsInput value={data.keywords ?? []} onChange={(next) => update("keywords", next)} />
            </div>


            {err && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{err}</div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ManageUnclaimedProfiles() {
  const [rows, setRows] = useState<UnclaimedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase.rpc("admin_list_unclaimed_profiles" as never);
    if (error) setErr(error.message);
    else setRows((data as unknown as UnclaimedRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.rpc("admin_delete_unclaimed_profile" as never, { p_profile_id: id } as never);
    setDeletingId(null);
    if (error) { setErr(error.message); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <Card className="border-border/60 bg-card/60">
      {err && (
        <div className="border-b border-destructive/40 bg-destructive/10 px-5 py-3 text-sm text-destructive">{err}</div>
      )}
      {loading ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">No unclaimed profiles.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.display_name ?? "—"}</TableCell>
                <TableCell>
                  <Link to={`/@${r.username}`} className="text-muted-foreground hover:text-primary">
                    /@{r.username}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.service_category ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingId(r.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === r.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingId === r.id ? "Deleting…" : "Delete"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete profile?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this profile? This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void handleDelete(r.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <EditUnclaimedProfileDialog
        profileId={editingId}
        open={editingId !== null}
        onOpenChange={(v) => { if (!v) setEditingId(null); }}
        onSaved={(next) => {
          setRows((prev) => prev.map((r) => r.id === next.id
            ? { ...r, username: next.username, display_name: next.display_name, service_category: next.service_category }
            : r));
        }}
      />
    </Card>
  );
}

// ---------------- Profile Requests ----------------

type ProfileRequestRow = {
  id: string;
  coach_name: string;
  unmatched_link: string | null;
  unmatched_description: string | null;
  rating: number;
  body: string;
  created_at: string;
};

function ProfileRequestsPanel({
  reloadKey,
  onCreateProfile,
}: {
  reloadKey: number;
  onCreateProfile: (row: ProfileRequestRow) => void;
}) {
  const [rows, setRows] = useState<ProfileRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("unclaimed_reviews")
      .select("id, coach_name, unmatched_link, unmatched_description, rating, body, created_at")
      .eq("needs_profile" as never, true as never)
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else setRows((data ?? []) as ProfileRequestRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load, reloadKey]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (err) return <div className="text-sm text-destructive">{err}</div>;
  if (rows.length === 0) return <EmptyState icon={UserPlus} message="No profile requests pending." />;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="rounded-md border border-border bg-card/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold">{r.coach_name}</p>
              <p className="text-xs text-primary">★ {Number(r.rating).toFixed(1)}</p>
              {r.unmatched_link && (
                <p className="text-xs text-muted-foreground">
                  Link:{" "}
                  <a href={r.unmatched_link} target="_blank" rel="noreferrer" className="underline hover:text-primary">
                    {r.unmatched_link}
                  </a>
                </p>
              )}
              {r.unmatched_description && (
                <p className="text-xs text-muted-foreground">Note: {r.unmatched_description}</p>
              )}
              <p className="line-clamp-2 text-xs text-muted-foreground/90">{r.body}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">{fmt(r.created_at)}</p>
            </div>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => onCreateProfile(r)}
            >
              <UserPlus className="h-3.5 w-3.5" /> Create Profile
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- Admin Broadcast ----------------

type BroadcastRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  sent_count: number;
  created_at: string;
};

const BROADCAST_TYPES = ["App Update", "New Feature", "Announcement", "Promotion"] as const;

function BroadcastPanel() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<string>("Announcement");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<BroadcastRow[]>([]);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("admin_broadcasts")
      .select("id, title, body, type, sent_count, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data as BroadcastRow[]) ?? []);
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      toast({ title: "Title and message are required", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.rpc(
      "admin_broadcast_notification" as never,
      { p_title: title.trim(), p_body: body.trim(), p_type: type } as never,
    );
    setSending(false);
    if (error) {
      toast({ title: "Send failed", description: error.message, variant: "destructive" });
      return;
    }
    const count = (data as unknown as number) ?? 0;
    toast({ title: `Notification sent to ${count} users.` });
    setTitle(""); setBody("");
    void loadHistory();
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/60 p-5">
        <div className="space-y-4">
          <div>
            <Label htmlFor="b-title">Notification title</Label>
            <Input id="b-title" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Short title (max 60 chars)" />
          </div>
          <div>
            <Label htmlFor="b-body">Message</Label>
            <Textarea id="b-body" value={body} maxLength={200} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Message (max 200 chars)" />
            <p className="mt-1 text-xs text-muted-foreground">{body.length}/200</p>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BROADCAST_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={send}
            disabled={sending}
            className="w-full font-semibold"
            style={{ background: "linear-gradient(135deg,#FFE98A,#FFD700,#B8860B)", color: "#2a1c00" }}
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending…" : "Send to All Users"}
          </Button>
        </div>
      </Card>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Past broadcasts</p>
        {history.length === 0 ? (
          <EmptyState icon={Send} message="No broadcasts yet." />
        ) : (
          <Card className="border-border/60 bg-card/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <p className="font-medium">{b.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{b.body}</p>
                    </TableCell>
                    <TableCell className="text-xs">{b.type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmt(b.created_at)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{b.sent_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}


