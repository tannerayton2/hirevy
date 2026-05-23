import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/TierBadge";
import { tierForPoints } from "@/lib/tiers";
import { toast } from "@/hooks/use-toast";

interface FollowedProfile {
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
  const [items, setItems] = useState<FollowedProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    void (async () => {
      setLoading(true);
      const { data: rows } = await supabase
        .from("follows").select("following_id").eq("follower_id", user.id);
      const ids = (rows ?? []).map((r) => r.following_id as string);
      let result: FollowedProfile[] = [];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, review_count, points")
          .in("id", ids);
        result = (profs as FollowedProfile[]) ?? [];
      }
      setItems(result);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const unfollow = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("follows").delete()
      .eq("follower_id", user.id).eq("following_id", id);
    if (error) { toast({ title: "Could not unfollow", description: error.message, variant: "destructive" }); return; }
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-2xl font-bold md:text-3xl">Following</h1>
      <p className="mt-1 text-sm text-muted-foreground">Coaches you follow.</p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-md border border-dashed border-border bg-card/40 p-10 text-center">
          <p className="text-sm text-muted-foreground">You're not following anyone yet.</p>
          <Button asChild className="mt-5">
            <Link to="/explore">Browse Coaches</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-md border border-border bg-card">
          {items.map((p) => {
            const tier = tierForPoints(p.points ?? 0);
            const name = p.display_name || p.username;
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
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
                      <p className="truncate font-semibold">{name}</p>
                      <TierBadge tier={tier} size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.review_count} {p.review_count === 1 ? "review" : "reviews"}
                    </p>
                  </div>
                </Link>
                <Button size="sm" variant="outline" onClick={() => unfollow(p.id)}>Unfollow</Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
