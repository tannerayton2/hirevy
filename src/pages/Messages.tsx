import { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThreadRow {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
}
interface OtherProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}
interface Msg {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export default function Messages() {
  const { user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const activeId = params.get("t");
  const [threads, setThreads] = useState<(ThreadRow & { other: OtherProfile | null })[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: ts } = await supabase
        .from("message_threads")
        .select("id, user_a, user_b, last_message_at")
        .order("last_message_at", { ascending: false });
      const list = (ts as ThreadRow[]) ?? [];
      const otherIds = list.map((t) => (t.user_a === user.id ? t.user_b : t.user_a));
      const { data: profs } = otherIds.length
        ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", otherIds)
        : { data: [] as OtherProfile[] };
      const profMap = new Map((profs as OtherProfile[]).map((p) => [p.id, p]));
      setThreads(list.map((t) => ({ ...t, other: profMap.get(t.user_a === user.id ? t.user_b : t.user_a) ?? null })));
    };
    void load();
  }, [user]);

  useEffect(() => {
    if (!activeId) { setMsgs([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, thread_id, sender_id, body, created_at")
        .eq("thread_id", activeId)
        .order("created_at", { ascending: true })
        .limit(200);
      setMsgs((data as Msg[]) ?? []);
    };
    void load();

    const channel = supabase
      .channel(`msgs:${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${activeId}` }, (payload) => {
        setMsgs((prev) => [...prev, payload.new as Msg]);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs]);

  if (!loading && !user) return <Navigate to="/auth" replace />;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !body.trim() || !user) return;
    const text = body.trim();
    setBody("");
    await supabase.from("messages").insert({ thread_id: activeId, sender_id: user.id, body: text });
  };

  const activeThread = threads.find((t) => t.id === activeId);

  return (
    <div className="grid h-[calc(100vh-56px-56px)] grid-cols-1 md:h-[calc(100vh-56px)] md:grid-cols-[280px_1fr]">
      {/* Inbox */}
      <aside className={cn("border-r border-border md:block", activeId && "hidden md:block")}>
        <div className="border-b border-border px-4 py-3">
          <h1 className="font-display text-lg font-semibold">Messages</h1>
        </div>
        {threads.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No conversations yet. Message a provider from their profile.</p>
        ) : (
          <ul>
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setParams({ t: t.id }, { replace: true })}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary",
                    activeId === t.id && "bg-secondary",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-sm font-semibold">
                    {t.other?.avatar_url ? <img src={t.other.avatar_url} alt="" className="h-full w-full object-cover" /> : (t.other?.display_name ?? t.other?.username ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.other?.display_name || `@${t.other?.username}`}</p>
                    <p className="truncate text-xs text-muted-foreground">@{t.other?.username}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Conversation */}
      <section className={cn("flex flex-col", !activeId && "hidden md:flex")}>
        {activeId ? (
          <>
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{activeThread?.other?.display_name || `@${activeThread?.other?.username}`}</p>
                <p className="text-xs text-muted-foreground">@{activeThread?.other?.username}</p>
              </div>
              <button onClick={() => setParams({}, { replace: true })} className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground md:hidden">Back</button>
            </header>
            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {msgs.map((m) => {
                const mine = m.sender_id === user!.id;
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] rounded-md px-3 py-2 text-sm",
                      mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                    )}>{m.body}</div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
              <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" maxLength={4000} />
              <Button type="submit" size="icon" disabled={!body.trim()}><Send className="h-4 w-4" /></Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
            Pick a conversation to start.
          </div>
        )}
      </section>
    </div>
  );
}
