import { useEffect, useState, useCallback, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import { RefreshCw, ShieldAlert, Users, Star, Package, MessageSquare, Flag, UserPlus, Trash2, Search, Ban, Check, X as XIcon, Send, AlertTriangle, FileWarning } from "lucide-react";
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
import { tierForReviewCount, TIER_LABEL } from "@/lib/tiers";
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

const COACH_CATEGORIES = [
  "Business Coaching",
  "Sales",
  "Copywriting",
  "Fitness & Health",
  "Mindset",
  "Marketing",
  "Finance",
  "Life Coaching",
  "Other",
] as const;

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function CreateCoachProfileForm({ onCreated }: { onCreated?: () => void }) {
  const [fullName, setFullName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ slug: string } | null>(null);

  const handleNameChange = (v: string) => {
    setFullName(v);
    if (!slugTouched) setSlug(slugifyName(v));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setAvatarFile(f);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(f ? URL.createObjectURL(f) : null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!fullName.trim() || !slug.trim() || !category) {
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
        p_service_category: category,
        p_bio: bio.trim(),
        p_website_url: websiteUrl.trim(),
        p_instagram_url: instagramUrl.trim(),
        p_twitter_url: twitterUrl.trim(),
        p_youtube_url: youtubeUrl.trim(),
        p_linkedin_url: linkedinUrl.trim(),
        p_tiktok_url: tiktokUrl.trim(),
        p_avatar_url: uploadedAvatarUrl,
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
      setFullName(""); setSlug(""); setSlugTouched(false); setCategory("");
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarFile(null); setAvatarPreview(null);
      setWebsiteUrl(""); setInstagramUrl(""); setTwitterUrl(""); setYoutubeUrl("");
      setLinkedinUrl(""); setTiktokUrl(""); setBio("");
      onCreated?.();
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
            <p className="mt-1 text-xs text-muted-foreground">URL: /coach/{slug || "your-slug"}</p>
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
        </div>


        <div>
          <Label>Category *</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
            <SelectContent>
              {COACH_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><Label htmlFor="cc-web">Website URL</Label><Input id="cc-web" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} /></div>
          <div><Label htmlFor="cc-ig">Instagram URL</Label><Input id="cc-ig" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} /></div>
          <div><Label htmlFor="cc-tw">Twitter/X URL</Label><Input id="cc-tw" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} /></div>
          <div><Label htmlFor="cc-yt">YouTube URL</Label><Input id="cc-yt" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} /></div>
          <div><Label htmlFor="cc-li">LinkedIn URL</Label><Input id="cc-li" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} /></div>
          <div><Label htmlFor="cc-tt">TikTok URL</Label><Input id="cc-tt" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} /></div>
        </div>

        <div>
          <Label htmlFor="cc-bio">Short bio</Label>
          <Textarea id="cc-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
        {success && (
          <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm">
            Profile created.{" "}
            <Link to={`/coach/${success.slug}`} className="font-medium text-primary underline">
              View /coach/{success.slug}
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

type Stats = {
  users: { total: number; last_24h: number; last_7d: number };
  reviews: {
    verified_total: number;
    proof_total: number;
    last_24h: number;
    last_7d: number;
    top_provider: { username: string; display_name: string | null; count: number } | null;
  };
  offers: { total: number; paid: number; free_for_testimonial: number; last_7d: number };
  activity: {
    messages_total: number;
    messages_24h: number;
    active_threads_7d: number;
    follows_total: number;
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

export default function Admin() {
  const { user, profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [statsRes, usersRes] = await Promise.all([
      supabase.rpc("admin_stats" as never),
      supabase.rpc("admin_list_users" as never),
    ]);
    if (statsRes.error) setError(statsRes.error.message);
    else setStats(statsRes.data as unknown as Stats);
    if (!usersRes.error) setUsers((usersRes.data as unknown as AdminUserRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && isAdminUsername(profile?.username)) void fetchAll();
  }, [authLoading, profile?.username, fetchAll]);

  if (authLoading) return null;
  if (!user || !isAdminUsername(profile?.username)) {
    return <Navigate to="/explore" replace />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-primary">
            <ShieldAlert className="h-3.5 w-3.5" /> Admin
          </div>
          <h1 className="mt-1 font-serif text-3xl text-foreground">Platform stats</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live numbers from the database. Private to allowlisted accounts.
          </p>
        </div>
        <Button onClick={fetchAll} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!stats ? (
        <div className="mt-10 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          {/* Users */}
          <SectionTitle icon={Users}>Users</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total users" value={stats.users.total} />
            <StatCard label="Signups 24h" value={stats.users.last_24h} />
            <StatCard label="Signups 7d" value={stats.users.last_7d} />
            <StatCard
              label="Top provider"
              value={stats.reviews.top_provider?.count ?? 0}
              hint={stats.reviews.top_provider ? `@${stats.reviews.top_provider.username}` : "—"}
            />
          </div>

          {/* Reviews */}
          <SectionTitle icon={Star}>Reviews</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Verified total" value={stats.reviews.verified_total} />
            <StatCard label="Proof-backed total" value={stats.reviews.proof_total} />
            <StatCard label="Reviews 24h" value={stats.reviews.last_24h} hint="Both types" />
            <StatCard label="Reviews 7d" value={stats.reviews.last_7d} hint="Both types" />
          </div>

          {/* Offers */}
          <SectionTitle icon={Package}>Offers</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total offers" value={stats.offers.total} />
            <StatCard label="Paid offers" value={stats.offers.paid} />
            <StatCard label="Free-for-testimonial" value={stats.offers.free_for_testimonial} />
            <StatCard label="Created 7d" value={stats.offers.last_7d} />
          </div>

          {/* Activity */}
          <SectionTitle icon={MessageSquare}>Activity</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Messages total" value={stats.activity.messages_total} />
            <StatCard label="Messages 24h" value={stats.activity.messages_24h} />
            <StatCard label="Active threads 7d" value={stats.activity.active_threads_7d} />
            <StatCard label="Total follows" value={stats.activity.follows_total} />
          </div>

          {/* Moderation */}
          <SectionTitle icon={Flag}>Moderation queue</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Open disputes" value={stats.moderation.open_disputes_count} />
            <StatCard
              label="Pending proof requests"
              value={stats.moderation.pending_proof_requests_count}
            />
            <StatCard label="Disputed reviews" value={stats.moderation.disputed_reviews_count} />
          </div>

          {stats.moderation.open_disputes.length > 0 && (
            <Card className="mt-4 border-border/60 bg-card/60">
              <div className="border-b border-border/60 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Open disputes
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Filed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.moderation.open_disputes.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        @{d.provider_username ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{d.review_type}</TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">
                        {d.reason}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{fmt(d.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {stats.moderation.pending_proof_requests.length > 0 && (
            <Card className="mt-4 border-border/60 bg-card/60">
              <div className="border-b border-border/60 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Pending proof access requests
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requester</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Filed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.moderation.pending_proof_requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.requester_email ?? "—"}</TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">
                        {r.requester_message ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{fmt(r.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {stats.moderation.disputed_reviews.length > 0 && (
            <Card className="mt-4 border-border/60 bg-card/60">
              <div className="border-b border-border/60 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Disputed proof-backed reviews
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Disputed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.moderation.disputed_reviews.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        @{r.provider_username ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.reviewer_name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.rating}★</TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.disputed_at ? fmt(r.disputed_at) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Users table */}
          <SectionTitle icon={Users}>All users</SectionTitle>
          <Card className="border-border/60 bg-card/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const tier = tierForReviewCount(u.review_count);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <Link to={`/@${u.username}`} className="hover:text-primary">
                          @{u.username}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.display_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {TIER_LABEL[tier]}{" "}
                        <span className="text-xs">({u.review_count})</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{fmt(u.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <SectionTitle icon={UserPlus}>Create Coach Profile</SectionTitle>
          <CreateCoachProfileForm onCreated={() => void fetchAll()} />

          <SectionTitle icon={Trash2}>Manage Profiles</SectionTitle>
          <ManageUnclaimedProfiles />
        </>
      )}
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

function ManageUnclaimedProfiles() {
  const [rows, setRows] = useState<UnclaimedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.display_name ?? "—"}</TableCell>
                <TableCell>
                  <Link to={`/coach/${r.username}`} className="text-muted-foreground hover:text-primary">
                    /coach/{r.username}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.service_category ?? "—"}</TableCell>
                <TableCell className="text-right">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
