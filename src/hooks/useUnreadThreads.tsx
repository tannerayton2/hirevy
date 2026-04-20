import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns the count of distinct threads with unread messages for the current user.
 * A thread is "unread" if it contains at least one message from the other participant
 * with created_at > the user's last_read_at marker for that thread (or no marker exists).
 */
export function useUnreadThreads(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const location = useLocation();
  const onMessages = location.pathname.startsWith("/messages");

  useEffect(() => {
    if (!user) { setCount(0); return; }
    let cancelled = false;

    async function recompute() {
      if (!user) return;
      // Fetch all threads where the user participates
      const { data: threads } = await supabase
        .from("message_threads")
        .select("id, user_a, user_b, last_message_at");
      if (!threads || cancelled) return;

      // Fetch read markers for this user
      const { data: reads } = await supabase
        .from("message_reads")
        .select("thread_id, last_read_at")
        .eq("user_id", user.id);
      const readMap = new Map<string, string>();
      (reads ?? []).forEach((r: any) => readMap.set(r.thread_id, r.last_read_at));

      let unread = 0;
      // For each thread, check if there's a message from someone else after last_read_at
      await Promise.all(
        threads.map(async (t: any) => {
          const lastRead = readMap.get(t.id) ?? "1970-01-01T00:00:00Z";
          // Quick optimization: if thread last_message_at <= lastRead, skip query
          if (t.last_message_at && new Date(t.last_message_at) <= new Date(lastRead)) return;
          const { data: m } = await supabase
            .from("messages")
            .select("id")
            .eq("thread_id", t.id)
            .neq("sender_id", user.id)
            .gt("created_at", lastRead)
            .limit(1);
          if (m && m.length > 0) unread += 1;
        }),
      );
      if (!cancelled) setCount(unread);
    }

    recompute();

    const channel = supabase
      .channel(`unread-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => recompute())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reads", filter: `user_id=eq.${user.id}` }, () => recompute())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "message_reads", filter: `user_id=eq.${user.id}` }, () => recompute())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user]);

  // Suppress badge while user is on the Messages page (they're already there)
  return onMessages ? 0 : count;
}

/** Updates document.title with an unread prefix like "(2) HireVy". */
export function useUnreadDocumentTitle(baseTitle = "HireVy") {
  const count = useUnreadThreads();
  useEffect(() => {
    const original = document.title.replace(/^\(\d+\+?\)\s*/, "");
    const base = original || baseTitle;
    document.title = count > 0 ? `(${count >= 10 ? "9+" : count}) ${base}` : base;
  }, [count, baseTitle]);
  return count;
}
