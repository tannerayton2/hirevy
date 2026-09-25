import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { iconFor, timeAgo, type Notification } from "@/components/NotificationsBell";

export default function Notifications() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, message, link, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data as Notification[]) ?? []);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void load();
    const ch = supabase
      .channel(`notifications-page-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, load]);

  if (!loading && !user) return <Navigate to="/auth" replace />;

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const onClickItem = async (n: Notification) => {
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    if (n.link) navigate(n.link);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="font-display text-2xl font-semibold">Notifications</h1>
        {items.some((n) => !n.read) && (
          <Button size="sm" variant="ghost" onClick={markAllRead}>Mark all as read</Button>
        )}
      </div>
      {loaded && items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((n) => {
            const Icon = iconFor(n.type);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void onClickItem(n)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary",
                    !n.read && "bg-primary/5",
                  )}
                >
                  <span className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    !n.read ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", !n.read ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {n.message}
                    </p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
