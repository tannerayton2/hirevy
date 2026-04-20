import { useEffect, useState, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { RefreshCw, ShieldAlert, Users, Star, Package, MessageSquare, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isAdminUsername } from "@/lib/admin";
import { tierForReviewCount, TIER_LABEL } from "@/lib/tiers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="mb-3 mt-10 flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h2 className="font-serif text-xl text-foreground">{children}</h2>
    </div>
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
        </>
      )}
    </div>
  );
}
