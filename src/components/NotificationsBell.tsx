import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, UserPlus, Star, MessageSquare, Gem, CheckCircle2, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fireLocalNotification } from "@/lib/localNotifications";
import { isNotificationTypeEnabled } from "@/lib/notificationPreferences";

export interface Notification {
  id: string;
  type: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function timeAgo(iso: string): string {
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

export function iconFor(type: string) {
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new as Notification;
        void isNotificationTypeEnabled(n.type).then((enabled) => {
          if (enabled) void fireLocalNotification("Aytopus", n.message);
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, load]);

  const unread = items.some((n) => !n.read);

  if (!user) return null;

  return (
    <button
      type="button"
      aria-label="Notifications"
      onClick={() => navigate("/notifications")}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-secondary"
    >
      <Bell className="h-5 w-5" />
      {unread && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
      )}
    </button>
  );
}
