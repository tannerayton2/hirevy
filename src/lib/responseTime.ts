import { supabase } from "@/integrations/supabase/client";

const MIN_THREADS = 5;

interface MessageRow {
  thread_id: string;
  sender_id: string;
  created_at: string;
}

/**
 * Compute average "first reply" response time for a user across their threads.
 * - For each thread the user participates in, find the first inbound message (sent by other),
 *   then the first outbound message (sent by user) AFTER that. Gap is the response time.
 * - Average over threads. Return null if fewer than MIN_THREADS replied threads.
 */
export async function fetchAvgFirstResponseMs(userId: string): Promise<number | null> {
  // Pull threads the user is in (RLS lets them read these)
  const { data: threads } = await supabase
    .from("message_threads")
    .select("id")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .limit(500);
  const ids = (threads ?? []).map((t) => t.id as string);
  if (ids.length === 0) return null;

  const { data: msgs } = await supabase
    .from("messages")
    .select("thread_id, sender_id, created_at")
    .in("thread_id", ids)
    .order("created_at", { ascending: true })
    .limit(5000);
  const rows = (msgs ?? []) as MessageRow[];

  // Group by thread
  const byThread = new Map<string, MessageRow[]>();
  for (const r of rows) {
    const arr = byThread.get(r.thread_id) ?? [];
    arr.push(r);
    byThread.set(r.thread_id, arr);
  }

  const gaps: number[] = [];
  for (const arr of byThread.values()) {
    // First inbound (not from user)
    const firstInbound = arr.find((m) => m.sender_id !== userId);
    if (!firstInbound) continue;
    const inboundTime = new Date(firstInbound.created_at).getTime();
    // First outbound after that
    const reply = arr.find((m) => m.sender_id === userId && new Date(m.created_at).getTime() > inboundTime);
    if (!reply) continue;
    gaps.push(new Date(reply.created_at).getTime() - inboundTime);
  }

  if (gaps.length < MIN_THREADS) return null;
  return gaps.reduce((a, b) => a + b, 0) / gaps.length;
}

export function formatResponseTime(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `~${Math.max(1, mins)}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `~${hrs}h`;
  const days = Math.round(hrs / 24);
  return `~${days}d`;
}
