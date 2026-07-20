import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { TierGem } from "@/components/TierGem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tierForPoints } from "@/lib/tiers";
import { toast } from "@/hooks/use-toast";

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  review_count: number;
  points: number;
}

export default function Following() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [following, setFollowing] = useState<ProfileRow[]>([]);
  const [followers, setFollowers] = useState<ProfileRow[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    void (async () => {
      setLoading(true);
      const [followingRes, followersRes] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", user.id),
        supabase.from("follows").select("follower_id").eq("following_id", user.id),
      ]);
      const followingIdsArr = (followingRes.data ?? []).map((r: any) => r.following_id as string);
      const followerIdsArr = (followersRes.data ?? []).map((r: any) => r.follower_id as string);
      setFollowingIds(new Set(followingIdsArr));
      const ids = Array.from(new Set([...followingIdsArr, ...followerIdsArr]));
      const profMap = new Map<string, ProfileRow>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, review_count, points")
          .in("id", ids);
        for (const p of (profs as ProfileRow[]) ?? []) profMap.set(p.id, p);
      }
      setFollowing(followingIdsArr.map((id) => profMap.get(id)).filter(Boolean) as ProfileRow[]);
      setFollowers(followerIdsArr.map((id) => profMap.get(id)).filter(Boolean) as ProfileRow[]);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const unfollow = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("follows").delete()
      .eq("follower_id", user.id).eq("following_id", id);
    if (error) { toast({ title: "Could not unfollow", description: error.message, variant: "destructive" }); return; }
    setFollowing((prev) => prev.filter((p) => p.id !== id));
    setFollowingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const followBack = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: id });
    if (error) { toast({ title: "Could not follow", description: error.message, variant: "destructive" }); return; }
    setFollowingIds((prev) => { const next = new Set(prev); next.add(id); return next; });
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-2xl font-bold md:text-3xl">Network</h1>

      <Tabs defaultValue="following" className="mt-6">
        <TabsList>
          <TabsTrigger value="following">Following</TabsTrigger>
          <TabsTrigger value="followers">Followers</TabsTrigger>
        </TabsList>

        <TabsContent value="following" className="mt-4">
          {following.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-card/40 p-10 text-center">
              <p className="text-sm text-muted-foreground">You're not following anyone yet.</p>
              <Button asChild className="mt-5">
                <Link to="/explore">Browse Coaches</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border bg-card">
              {following.map((p) => (
                <PersonRow key={p.id} p={p} action={
                  <Button size="sm" variant="outline" onClick={() => unfollow(p.id)}>Unfollow</Button>
                } />
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="followers" className="mt-4">
          {followers.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-card/40 p-10 text-center">
              <p className="text-sm text-muted-foreground">No followers yet. Share your profile to get discovered.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border bg-card">
              {followers.map((p) => {
                const iFollow = followingIds.has(p.id);
                return (
                  <PersonRow key={p.id} p={p} action={
                    iFollow
                      ? <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Following</span>
                      : <Button size="sm" onClick={() => followBack(p.id)}>Follow Back</Button>
                  } />
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PersonRow({ p, action }: { p: ProfileRow; action: React.ReactNode }) {
  const tier = tierForPoints(p.points ?? 0);
  const name = p.display_name || p.username;
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Link to={`/@${p.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-base text-muted-foreground">
          {p.avatar_url ? (
            <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            name.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="flex min-w-0 items-center truncate font-semibold">
              <span className="truncate">{name}</span>
              <TierGem tier={tier} />
            </p>
          </div>

          <p className="text-xs text-muted-foreground">@{p.username}</p>
        </div>
      </Link>
      {action}
    </li>
  );
}
