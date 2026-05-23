import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, UserPlus, Star, MessageSquare, Gem, CheckCircle2, Megaphone } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function iconFor(type: string) {
  switch (type) {
    case "follow": return UserPlus;
    case "review_received": return Star;
    case "message": return MessageSquare;
    case "tier_reached": return Gem;
    case "claim_approved": return CheckCircle2;
    default: return Megaphone;
  }
}

export function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, message, link, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data as Notification[]) ?? []);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void load();
    const ch = supabase
      .channel(`notifications-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, load]);

  const unread = items.some((n) => !n.read);

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
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-secondary"
        >
          <Bell className="h-5 w-5" />
          {unread && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md border-l border-border bg-background p-0 sm:w-[420px]">
        <div className="flex items-center justify-between border-b border-border px-4 pb-3 pt-12">
          <h2 className="font-display text-lg font-semibold">Notifications</h2>
          {items.some((n) => !n.read) && (
            <Button size="sm" variant="ghost" onClick={markAllRead}>Mark all as read</Button>
          )}
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 80px)" }}>
          {items.length === 0 ? (
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
      </SheetContent>
    </Sheet>
  );
}
