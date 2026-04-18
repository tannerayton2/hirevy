import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImagePlus, Send, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

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
  body: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  deleted_at: string | null;
  created_at: string;
}
interface ReadMarker {
  thread_id: string;
  user_id: string;
  last_read_message_id: string | null;
  last_read_at: string;
}

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return hours < 6 ? `${hours}h ago` : time;
  if (isYesterday) return `Yesterday ${time}`;
  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return `${d.toLocaleDateString(undefined, { weekday: "short" })} ${time}`;
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + time;
}

export default function Messages() {
  const { user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const activeId = params.get("t");
  const [threads, setThreads] = useState<(ThreadRow & { other: OtherProfile | null })[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reads, setReads] = useState<ReadMarker[]>([]);
  const [body, setBody] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Inbox load
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

  // Messages + read markers + realtime per active thread
  useEffect(() => {
    if (!activeId || !user) { setMsgs([]); setReads([]); return; }
    const load = async () => {
      const [msgRes, readRes] = await Promise.all([
        supabase
          .from("messages")
          .select("id, thread_id, sender_id, body, attachment_url, attachment_type, deleted_at, created_at")
          .eq("thread_id", activeId)
          .order("created_at", { ascending: true })
          .limit(200),
        supabase
          .from("message_reads")
          .select("thread_id, user_id, last_read_message_id, last_read_at")
          .eq("thread_id", activeId),
      ]);
      setMsgs((msgRes.data as Msg[]) ?? []);
      setReads((readRes.data as ReadMarker[]) ?? []);
    };
    void load();

    const channel = supabase
      .channel(`thread:${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${activeId}` }, (payload) => {
        setMsgs((prev) => prev.some((m) => m.id === (payload.new as Msg).id) ? prev : [...prev, payload.new as Msg]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `thread_id=eq.${activeId}` }, (payload) => {
        setMsgs((prev) => prev.map((m) => m.id === (payload.new as Msg).id ? (payload.new as Msg) : m));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reads", filter: `thread_id=eq.${activeId}` }, (payload) => {
        const row = payload.new as ReadMarker;
        if (!row) return;
        setReads((prev) => {
          const others = prev.filter((r) => r.user_id !== row.user_id);
          return [...others, row];
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activeId, user]);

  // Mark read whenever new messages arrive in the active thread
  useEffect(() => {
    if (!activeId || !user || msgs.length === 0) return;
    const last = msgs[msgs.length - 1];
    if (last.sender_id === user.id) return; // no need to mark our own
    void supabase
      .from("message_reads")
      .upsert(
        { thread_id: activeId, user_id: user.id, last_read_message_id: last.id, last_read_at: new Date().toISOString() },
        { onConflict: "thread_id,user_id" },
      );
  }, [activeId, user, msgs]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs]);

  

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast({ title: "Images only", variant: "destructive" }); return; }
    if (f.size > MAX_ATTACHMENT_BYTES) { toast({ title: "Too large", description: "Max 5MB.", variant: "destructive" }); return; }
    setPendingFile(f);
    setPendingPreview(URL.createObjectURL(f));
  };
  const clearPending = () => { setPendingFile(null); if (pendingPreview) URL.revokeObjectURL(pendingPreview); setPendingPreview(null); };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !user) return;
    const text = body.trim();
    if (!text && !pendingFile) return;
    setSending(true);
    try {
      let attachment_url: string | null = null;
      let attachment_type: string | null = null;
      if (pendingFile) {
        const ext = pendingFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${activeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("message-attachments").upload(path, pendingFile, {
          contentType: pendingFile.type,
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("message-attachments").getPublicUrl(path);
        attachment_url = pub.publicUrl;
        attachment_type = pendingFile.type;
      }
      const { error } = await supabase.from("messages").insert({
        thread_id: activeId,
        sender_id: user.id,
        body: text,
        attachment_url,
        attachment_type,
      });
      if (error) throw error;
      setBody("");
      clearPending();
    } catch (err) {
      toast({ title: "Couldn't send", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const deleteMsg = async (m: Msg) => {
    if (m.sender_id !== user?.id || m.deleted_at) return;
    if (!confirm("Delete this message? This cannot be undone.")) return;
    const { error } = await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString(), body: "", attachment_url: null, attachment_type: null })
      .eq("id", m.id);
    if (error) toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
  };

  const activeThread = threads.find((t) => t.id === activeId);

  // Group messages by sender within 2-min windows; show timestamp on the LAST message of each group
  const grouped = useMemo(() => {
    const out: { msg: Msg; showTimestamp: boolean; groupTail: boolean }[] = [];
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      const next = msgs[i + 1];
      const sameGroup = next
        && next.sender_id === m.sender_id
        && (new Date(next.created_at).getTime() - new Date(m.created_at).getTime()) < 2 * 60 * 1000;
      out.push({ msg: m, showTimestamp: !sameGroup, groupTail: !sameGroup });
    }
    return out;
  }, [msgs]);

  // "Seen" indicator: latest message OF MINE that the other party has read
  const otherUserId = activeThread ? (activeThread.user_a === user?.id ? activeThread.user_b : activeThread.user_a) : null;
  const otherRead = otherUserId ? reads.find((r) => r.user_id === otherUserId) : null;
  const lastSeenMineId = useMemo(() => {
    if (!otherRead?.last_read_message_id || !user) return null;
    // Find the latest of MY messages whose created_at <= that read marker's message timestamp
    const readMsg = msgs.find((m) => m.id === otherRead.last_read_message_id);
    if (!readMsg) return null;
    const readT = new Date(readMsg.created_at).getTime();
    let id: string | null = null;
    for (const m of msgs) {
      if (m.sender_id === user.id && new Date(m.created_at).getTime() <= readT) id = m.id;
    }
    return id;
  }, [otherRead, msgs, user]);

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

            <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
              {grouped.map(({ msg: m, showTimestamp }) => {
                const mine = m.sender_id === user!.id;
                const isDeleted = !!m.deleted_at;
                const showSeen = mine && lastSeenMineId === m.id;
                return (
                  <div key={m.id} className={cn("group flex flex-col", mine ? "items-end" : "items-start")}>
                    <div className={cn("flex items-end gap-1.5", mine ? "flex-row-reverse" : "flex-row")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                          isDeleted
                            ? "border border-dashed border-border bg-transparent italic text-muted-foreground"
                            : mine
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground",
                          m.attachment_url && !isDeleted && "p-1",
                        )}
                      >
                        {isDeleted ? (
                          "Message deleted"
                        ) : (
                          <>
                            {m.attachment_url && (
                              <button
                                type="button"
                                onClick={() => setLightbox(m.attachment_url)}
                                className="block overflow-hidden rounded-xl"
                              >
                                <img
                                  src={m.attachment_url}
                                  alt=""
                                  className="max-h-72 max-w-full object-cover"
                                  loading="lazy"
                                />
                              </button>
                            )}
                            {m.body && <p className={cn("whitespace-pre-wrap break-words", m.attachment_url && "px-2 py-1.5")}>{m.body}</p>}
                          </>
                        )}
                      </div>
                      {mine && !isDeleted && (
                        <button
                          type="button"
                          onClick={() => deleteMsg(m)}
                          className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                          aria-label="Delete message"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>
                    {showTimestamp && (
                      <span className={cn("mt-0.5 px-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground", mine ? "text-right" : "text-left")}>
                        {formatRelative(m.created_at)}
                      </span>
                    )}
                    {showSeen && (
                      <span className="mt-0.5 px-1 text-[10px] uppercase tracking-[0.16em] text-primary">
                        Seen{otherRead?.last_read_at ? ` · ${formatRelative(otherRead.last_read_at)}` : ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {pendingPreview && (
              <div className="flex items-center gap-3 border-t border-border bg-card/40 px-3 py-2">
                <img src={pendingPreview} alt="" className="h-14 w-14 rounded-md object-cover" />
                <span className="flex-1 truncate text-xs text-muted-foreground">{pendingFile?.name}</span>
                <Button type="button" size="icon" variant="ghost" onClick={clearPending}><X className="h-4 w-4" /></Button>
              </div>
            )}

            <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
              <Button type="button" size="icon" variant="ghost" onClick={() => fileRef.current?.click()} aria-label="Attach image">
                <ImagePlus className="h-5 w-5" />
              </Button>
              <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" maxLength={4000} />
              <Button type="submit" size="icon" disabled={sending || (!body.trim() && !pendingFile)}><Send className="h-4 w-4" /></Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
            Pick a conversation to start.
          </div>
        )}
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-md" />
          <button
            className="absolute right-4 top-4 rounded-full bg-background/90 p-2 text-foreground"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
