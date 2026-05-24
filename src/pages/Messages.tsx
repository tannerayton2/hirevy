import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Navigate, useSearchParams, NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImagePlus, Reply, Send, X, PenSquare, MessageSquare, Search, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { VoiceRecorder } from "@/components/messages/VoiceRecorder";
import { VoiceNotePlayer } from "@/components/messages/VoiceNotePlayer";
import { ReactionPicker } from "@/components/messages/ReactionPicker";
import { TeamChatPane } from "@/components/messages/TeamChatPane";

interface ThreadRow { id: string; user_a: string; user_b: string; last_message_at: string }
interface OtherProfile { id: string; username: string; display_name: string | null; avatar_url: string | null }
interface Msg {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  reply_to_id: string | null;
  voice_duration_ms: number | null;
  created_at: string;
}
interface ReadMarker { thread_id: string; user_id: string; last_read_message_id: string | null; last_read_at: string }
interface Reaction { id: string; message_id: string; user_id: string; emoji: string }

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const TYPING_TTL_MS = 2500;

function formatRelative(iso: string): string {
  const d = new Date(iso); const now = new Date();
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
  if (diffMs < 7 * 24 * 60 * 60 * 1000) return `${d.toLocaleDateString(undefined, { weekday: "short" })} ${time}`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + time;
}

function shortTimestamp(iso: string): string {
  const d = new Date(iso); const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  if (now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function snippet(m: Msg | undefined): string {
  if (!m) return "Original message";
  if (m.voice_duration_ms != null) return "🎤 Voice note";
  if (m.attachment_url) return "📷 Photo";
  return (m.body || "").slice(0, 80);
}

export default function Messages() {
  const { user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const activeId = params.get("t");
  const teamMode = params.get("team") === "1";
  const [threads, setThreads] = useState<(ThreadRow & { other: OtherProfile | null; lastMsg: Msg | null })[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeQuery, setComposeQuery] = useState("");
  const [composeResults, setComposeResults] = useState<OtherProfile[]>([]);
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reads, setReads] = useState<ReadMarker[]>([]);
  const [body, setBody] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [sending, setSending] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [pickerForMsg, setPickerForMsg] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const lastTypingSentRef = useRef(0);
  const otherTypingTimerRef = useRef<number | null>(null);
  const longPressRef = useRef<number | null>(null);
  const msgRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [unreadThreadIds, setUnreadThreadIds] = useState<Set<string>>(new Set());

  const recomputeUnreadThreads = useCallback(async (threadsList: { id: string; last_message_at: string }[]) => {
    if (!user) return;
    const { data: readsRows } = await supabase
      .from("message_reads")
      .select("thread_id, last_read_at")
      .eq("user_id", user.id);
    const readMap = new Map<string, string>();
    for (const r of (readsRows ?? []) as { thread_id: string; last_read_at: string }[]) {
      readMap.set(r.thread_id, r.last_read_at);
    }
    const ids = new Set<string>();
    await Promise.all(threadsList.map(async (t) => {
      const lastRead = readMap.get(t.id) ?? "1970-01-01T00:00:00Z";
      if (t.last_message_at && new Date(t.last_message_at) <= new Date(lastRead)) return;
      const { data: m } = await supabase
        .from("messages").select("id")
        .eq("thread_id", t.id).neq("sender_id", user.id)
        .gt("created_at", lastRead).limit(1);
      if (m && m.length > 0) ids.add(t.id);
    }));
    setUnreadThreadIds(ids);
  }, [user]);

  // Inbox load
  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data: ts } = await supabase
        .from("message_threads")
        .select("id, user_a, user_b, last_message_at")
        .order("last_message_at", { ascending: false });
      const list = (ts as ThreadRow[]) ?? [];
      const otherIds = list.map((t) => (t.user_a === user.id ? t.user_b : t.user_a));
      const { data: profs } = otherIds.length
        ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", otherIds)
        : { data: [] as OtherProfile[] };
      const profMap = new Map(((profs as OtherProfile[]) ?? []).map((p) => [p.id, p]));

      // Fetch last message per thread
      const lastMsgMap = new Map<string, Msg>();
      if (list.length) {
        const { data: msgsData } = await supabase
          .from("messages")
          .select("id, thread_id, sender_id, body, attachment_url, attachment_type, reply_to_id, voice_duration_ms, created_at")
          .in("thread_id", list.map((t) => t.id))
          .order("created_at", { ascending: false })
          .limit(500);
        for (const m of ((msgsData as unknown as Msg[]) ?? [])) {
          if (!lastMsgMap.has(m.thread_id)) lastMsgMap.set(m.thread_id, m);
        }
      }

      const decorated = list.map((t) => ({
        ...t,
        other: profMap.get(t.user_a === user.id ? t.user_b : t.user_a) ?? null,
        lastMsg: lastMsgMap.get(t.id) ?? null,
      }));
      setThreads(decorated);
      void recomputeUnreadThreads(decorated);
    })();
  }, [user, recomputeUnreadThreads]);

  // Realtime: recompute unread when a new message arrives in any thread
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`messages-inbox-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        void recomputeUnreadThreads(threads);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reads", filter: `user_id=eq.${user.id}` }, () => {
        void recomputeUnreadThreads(threads);
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, threads, recomputeUnreadThreads]);


  // Active thread: load messages, reactions, reads + subscribe
  useEffect(() => {
    if (!activeId || !user) { setMsgs([]); setReads([]); setReactions([]); setOtherTyping(false); return; }

    void (async () => {
      const [msgRes, readRes] = await Promise.all([
        supabase
          .from("messages")
          .select("id, thread_id, sender_id, body, attachment_url, attachment_type, reply_to_id, voice_duration_ms, created_at")
          .eq("thread_id", activeId)
          .order("created_at", { ascending: true })
          .limit(200),
        supabase
          .from("message_reads")
          .select("thread_id, user_id, last_read_message_id, last_read_at")
          .eq("thread_id", activeId),
      ]);
      const ms = (msgRes.data as unknown as Msg[]) ?? [];
      setMsgs(ms);
      setReads((readRes.data as ReadMarker[]) ?? []);
      if (ms.length) {
        const { data: rx } = await supabase
          .from("message_reactions")
          .select("id, message_id, user_id, emoji")
          .in("message_id", ms.map((m) => m.id));
        setReactions((rx as Reaction[]) ?? []);
      } else {
        setReactions([]);
      }
    })();

    const channel = supabase
      .channel(`thread:${activeId}`, { config: { private: true, broadcast: { self: false }, presence: { key: user.id } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${activeId}` }, (payload) => {
        const m = payload.new as unknown as Msg;
        setMsgs((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions" }, (payload) => {
        const r = payload.new as unknown as Reaction;
        setReactions((prev) => prev.some((x) => x.id === r.id) ? prev : [...prev, r]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" }, (payload) => {
        const r = payload.old as unknown as Reaction;
        setReactions((prev) => prev.filter((x) => x.id !== r.id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reads", filter: `thread_id=eq.${activeId}` }, (payload) => {
        const row = payload.new as ReadMarker;
        if (!row) return;
        setReads((prev) => [...prev.filter((r) => r.user_id !== row.user_id), row]);
      })
      .on("broadcast", { event: "typing" }, ({ payload }: { payload: { user_id: string } }) => {
        if (payload.user_id === user.id) return;
        setOtherTyping(true);
        if (otherTypingTimerRef.current) window.clearTimeout(otherTypingTimerRef.current);
        otherTypingTimerRef.current = window.setTimeout(() => setOtherTyping(false), TYPING_TTL_MS);
      })
      .subscribe();
    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
      if (otherTypingTimerRef.current) { window.clearTimeout(otherTypingTimerRef.current); otherTypingTimerRef.current = null; }
    };
  }, [activeId, user]);

  // Mark thread as read whenever it's open and messages change
  useEffect(() => {
    if (!activeId || !user) return;
    const last = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    // Mark as read even if there are no messages yet (clears stale badges) and
    // even if the latest message is our own (covers race where we just sent one).
    void supabase
      .from("message_reads")
      .upsert(
        {
          thread_id: activeId,
          user_id: user.id,
          last_read_message_id: last?.id ?? null,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "thread_id,user_id" },
      )
      .then(({ error }) => {
        if (error) console.error("[message_reads upsert]", error);
      });
  }, [activeId, user, msgs]);

  // Auto-scroll
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [msgs, otherTyping]);

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

  const uploadAttachment = async (file: Blob, ext: string, contentType: string) => {
    if (!user || !activeId) throw new Error("not ready");
    const path = `${user.id}/${activeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("message-attachments").upload(path, file, { contentType, upsert: false });
    if (error) throw error;
    return supabase.storage.from("message-attachments").getPublicUrl(path).data.publicUrl;
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeId || !user) return;
    const text = body.trim();
    if (!text && !pendingFile) return;
    setSending(true);
    try {
      let attachment_url: string | null = null;
      let attachment_type: string | null = null;
      if (pendingFile) {
        const ext = pendingFile.name.split(".").pop()?.toLowerCase() || "jpg";
        attachment_url = await uploadAttachment(pendingFile, ext, pendingFile.type);
        attachment_type = pendingFile.type;
      }
      const { error } = await supabase.from("messages").insert({
        thread_id: activeId,
        sender_id: user.id,
        body: text,
        attachment_url,
        attachment_type,
        reply_to_id: replyTo?.id ?? null,
      });
      if (error) throw error;
      setBody(""); clearPending(); setReplyTo(null);
    } catch (err) {
      toast({ title: "Couldn't send", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally { setSending(false); }
  };

  const sendVoice = async (blob: Blob, durationMs: number, mimeType: string) => {
    if (!activeId || !user) return;
    setSending(true);
    try {
      // Normalize codec-suffixed mime types (e.g. "audio/webm;codecs=opus") to the base type
      // since some storage backends match the exact string against the allow-list.
      const baseMime = mimeType.split(";")[0].trim() || "audio/webm";
      const ext = baseMime.includes("mp4") ? "m4a" : baseMime.includes("ogg") ? "ogg" : baseMime.includes("wav") ? "wav" : "webm";
      const url = await uploadAttachment(blob, ext, baseMime);
      const { error } = await supabase.from("messages").insert({
        thread_id: activeId,
        sender_id: user.id,
        body: "",
        attachment_url: url,
        attachment_type: baseMime,
        voice_duration_ms: Math.round(durationMs),
        reply_to_id: replyTo?.id ?? null,
      });
      if (error) throw error;
      setReplyTo(null);
    } catch (err) {
      toast({ title: "Couldn't send voice note", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" });
    } finally { setSending(false); }
  };

  // Typing broadcast (throttled)
  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || !user) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    void channelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: user.id } });
  }, [user]);

  const onBodyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBody(e.target.value);
    if (e.target.value) broadcastTyping();
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => { lastTypingSentRef.current = 0; }, TYPING_TTL_MS);
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const mine = reactions.find((r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    if (mine) {
      setReactions((prev) => prev.filter((r) => r.id !== mine.id));
      await supabase.from("message_reactions").delete().eq("id", mine.id);
    } else {
      const { data, error } = await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, user_id: user.id, emoji })
        .select()
        .single();
      if (!error && data) {
        setReactions((prev) => prev.some((r) => r.id === data.id) ? prev : [...prev, data as Reaction]);
      }
    }
    setPickerForMsg(null);
  };

  const scrollToMessage = (id: string) => {
    const el = msgRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary");
    window.setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1500);
  };

  const pressMovedRef = useRef(false);
  const pressTriggeredRef = useRef(false);
  const onMsgPressStart = (msgId: string) => {
    pressMovedRef.current = false;
    pressTriggeredRef.current = false;
    if (longPressRef.current) window.clearTimeout(longPressRef.current);
    longPressRef.current = window.setTimeout(() => {
      if (!pressMovedRef.current) {
        pressTriggeredRef.current = true;
        setPickerForMsg(msgId);
      }
    }, 400);
  };
  const onMsgPressEnd = () => {
    if (longPressRef.current) { window.clearTimeout(longPressRef.current); longPressRef.current = null; }
  };
  const onMsgPressMove = () => { pressMovedRef.current = true; onMsgPressEnd(); };

  const activeThread = threads.find((t) => t.id === activeId);
  const msgById = useMemo(() => new Map(msgs.map((m) => [m.id, m])), [msgs]);

  const grouped = useMemo(() => {
    const out: { msg: Msg; showTimestamp: boolean; groupStart: boolean }[] = [];
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      const prev = msgs[i - 1];
      const next = msgs[i + 1];
      const sameAsNext = next && next.sender_id === m.sender_id
        && (new Date(next.created_at).getTime() - new Date(m.created_at).getTime()) < 2 * 60 * 1000;
      const sameAsPrev = prev && prev.sender_id === m.sender_id
        && (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()) < 2 * 60 * 1000;
      out.push({ msg: m, showTimestamp: !sameAsNext, groupStart: !sameAsPrev });
    }
    return out;
  }, [msgs]);

  const reactionsByMsg = useMemo(() => {
    const map = new Map<string, Reaction[]>();
    for (const r of reactions) {
      const arr = map.get(r.message_id) ?? [];
      arr.push(r);
      map.set(r.message_id, arr);
    }
    return map;
  }, [reactions]);

  const otherUserId = activeThread ? (activeThread.user_a === user?.id ? activeThread.user_b : activeThread.user_a) : null;
  const otherRead = otherUserId ? reads.find((r) => r.user_id === otherUserId) : null;
  const lastSeenMineId = useMemo(() => {
    if (!otherRead?.last_read_message_id || !user) return null;
    const readMsg = msgs.find((m) => m.id === otherRead.last_read_message_id);
    if (!readMsg) return null;
    const readT = new Date(readMsg.created_at).getTime();
    let id: string | null = null;
    for (const m of msgs) {
      if (m.sender_id === user.id && new Date(m.created_at).getTime() <= readT) id = m.id;
    }
    return id;
  }, [otherRead, msgs, user]);

  // Compose: debounced profile search
  useEffect(() => {
    if (!composeOpen) return;
    const q = composeQuery.trim();
    if (!q) { setComposeResults([]); return; }
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq("id", user?.id ?? "")
        .limit(20);
      if (!cancelled) setComposeResults(((data as OtherProfile[]) ?? []));
    }, 200);
    return () => { cancelled = true; window.clearTimeout(handle); };
  }, [composeQuery, composeOpen, user]);

  const startThreadWith = async (otherId: string) => {
    const { data, error } = await supabase.rpc("get_or_create_thread", { other_user: otherId });
    if (error) { toast({ title: "Could not open thread", description: error.message, variant: "destructive" }); return; }
    setComposeOpen(false);
    setComposeQuery("");
    setComposeResults([]);
    setParams({ t: data as unknown as string }, { replace: true });
  };

  if (!loading && !user) return <Navigate to="/auth" replace />;

  return (
    <div className="md:grid md:h-[calc(100vh-56px)] md:auto-rows-auto md:grid-cols-[320px_1fr]">
      {/* Inbox */}
      <aside className={cn("border-r border-border md:block", (activeId || teamMode) && "hidden md:block")}>
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <h1 className="font-display text-2xl font-bold tracking-tight">Messages</h1>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setComposeOpen(true)}
            aria-label="New message"
            className="text-primary hover:text-primary"
          >
            <PenSquare className="h-5 w-5" />
          </Button>
        </div>
        {/* Pinned HireVy Team thread */}
        <button
          onClick={() => setParams({ team: "1" }, { replace: true })}
          className={cn(
            "flex w-full items-center gap-3 border-b border-border bg-primary/5 px-4 py-2 text-left transition-colors hover:bg-primary/10",
            teamMode && "bg-primary/15",
          )}
        >
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-sm font-bold text-primary">
            HV
            <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">HireVy Team</p>
            <p className="truncate text-xs text-muted-foreground">Get help from the HireVy team</p>
          </div>
        </button>
        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="font-display text-lg font-semibold text-foreground">No messages yet</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">Message a coach or provider to get started.</p>
            <Button className="mt-5" onClick={() => navigate("/explore")}>Browse Coaches</Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {threads.map((t) => {
              const isUnread = unreadThreadIds.has(t.id) && activeId !== t.id;
              const name = t.other?.display_name || `@${t.other?.username ?? "user"}`;
              const preview = t.lastMsg ? snippet(t.lastMsg) : `@${t.other?.username ?? ""}`;
              const ts = t.lastMsg?.created_at ?? t.last_message_at;
              return (
              <li key={t.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { setUnreadThreadIds((prev) => { const n = new Set(prev); n.delete(t.id); return n; }); setParams({ t: t.id }, { replace: true }); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setUnreadThreadIds((prev) => { const n = new Set(prev); n.delete(t.id); return n; }); setParams({ t: t.id }, { replace: true }); } }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-secondary",
                    activeId === t.id && "bg-secondary",
                  )}
                >
                  {t.other?.username ? (
                    <NavLink
                      to={`/${t.other.username}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Open ${name}'s profile`}
                      className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold hover:opacity-90"
                    >
                      {t.other.avatar_url ? <img src={t.other.avatar_url} alt="" className="h-full w-full object-cover" /> : (t.other.display_name ?? t.other.username).slice(0, 1).toUpperCase()}
                    </NavLink>
                  ) : (
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold">?</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      {t.other?.username ? (
                        <NavLink
                          to={`/${t.other.username}`}
                          onClick={(e) => e.stopPropagation()}
                          className="truncate text-sm font-normal text-foreground hover:underline"
                        >
                          {name}
                        </NavLink>
                      ) : (
                        <p className="truncate text-sm font-normal text-foreground">{name}</p>
                      )}
                      {ts && <span className="shrink-0 text-[11px] text-muted-foreground">{shortTimestamp(ts)}</span>}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className={cn("truncate text-xs", isUnread ? "font-bold text-white" : "font-normal text-muted-foreground")}>{preview}</p>
                      {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.55)]" aria-label="Unread" />}
                    </div>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Compose new message dialog */}
      <Dialog open={composeOpen} onOpenChange={(o) => { setComposeOpen(o); if (!o) { setComposeQuery(""); setComposeResults([]); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New message</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={composeQuery}
              onChange={(e) => setComposeQuery(e.target.value)}
              placeholder="Search by name or @handle"
              className="pl-9"
            />
          </div>
          <div className="max-h-80 overflow-y-auto">
            {composeQuery.trim() && composeResults.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No users found</p>
            )}
            <ul className="divide-y divide-border">
              {composeResults.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => startThreadWith(p.id)}
                    className="flex w-full items-center gap-3 px-1 py-2 text-left transition-colors hover:bg-secondary"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold">
                      {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p.display_name ?? p.username ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.display_name || `@${p.username}`}</p>
                      <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>




      {/* Conversation */}
      <section className={cn("fixed inset-x-0 bottom-14 top-14 z-30 flex flex-col bg-background md:static md:bottom-auto md:top-auto md:z-auto md:h-full md:min-h-0", !activeId && !teamMode && "hidden md:flex")}>
        {teamMode ? (
          <TeamChatPane />
        ) : activeId ? (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setParams({}, { replace: true })}
                  aria-label="Back"
                  className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground md:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {activeThread?.other?.username ? (
                  <NavLink
                    to={`/${activeThread.other.username}`}
                    aria-label={`Open ${activeThread.other.display_name || activeThread.other.username}'s profile`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold hover:opacity-90"
                  >
                    {activeThread.other.avatar_url
                      ? <img src={activeThread.other.avatar_url} alt="" className="h-full w-full object-cover" />
                      : (activeThread.other.display_name ?? activeThread.other.username).slice(0, 1).toUpperCase()}
                  </NavLink>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold">?</div>
                )}
                <div className="min-w-0">
                  {activeThread?.other?.username ? (
                    <NavLink to={`/${activeThread.other.username}`} className="block min-w-0">
                      <p className="truncate text-sm font-semibold hover:underline">{activeThread.other.display_name || `@${activeThread.other.username}`}</p>
                      <p className="truncate text-xs text-muted-foreground">@{activeThread.other.username}</p>
                    </NavLink>
                  ) : (
                    <>
                      <p className="truncate text-sm font-semibold">Conversation</p>
                    </>
                  )}
                </div>
              </div>
            </header>





            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3" onClick={() => setPickerForMsg(null)}>
              {grouped.map(({ msg: m, showTimestamp, groupStart }) => {
                const mine = m.sender_id === user!.id;
                const showSeen = mine && lastSeenMineId === m.id;
                const rx = reactionsByMsg.get(m.id) ?? [];
                const grouping = new Map<string, { count: number; mine: boolean }>();
                for (const r of rx) {
                  const cur = grouping.get(r.emoji) ?? { count: 0, mine: false };
                  cur.count += 1;
                  if (r.user_id === user!.id) cur.mine = true;
                  grouping.set(r.emoji, cur);
                }
                const replied = m.reply_to_id ? msgById.get(m.reply_to_id) : undefined;
                const isVoice = m.voice_duration_ms != null && m.attachment_url;

                return (
                  <div key={m.id} className={cn("group relative flex flex-col", mine ? "items-end" : "items-start", groupStart ? "mt-2.5" : "mt-[2px]")}>
                    <div className={cn("flex w-full items-end gap-1.5", mine ? "flex-row-reverse" : "flex-row")}>
                      {/* Hover-reply button (desktop) */}
                      <button
                        type="button"
                        onClick={() => setReplyTo(m)}
                        className="hidden h-6 w-6 items-center justify-center rounded-full text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100 md:flex"
                        aria-label="Reply"
                        title="Reply"
                      >
                        <Reply className="h-3.5 w-3.5" />
                      </button>
                      {/* Hover-react button removed — long-press the bubble (mobile + desktop) opens the picker */}

                      <div
                        ref={(el) => { if (el) msgRefs.current.set(m.id, el); else msgRefs.current.delete(m.id); }}
                        onMouseDown={(e) => { if (e.button === 0) onMsgPressStart(m.id); }}
                        onMouseUp={onMsgPressEnd}
                        onMouseLeave={onMsgPressEnd}
                        onMouseMove={(e) => { if (e.buttons) pressMovedRef.current = true; }}
                        onTouchStart={() => onMsgPressStart(m.id)}
                        onTouchEnd={onMsgPressEnd}
                        onTouchMove={onMsgPressMove}
                        onContextMenu={(e) => { if (pressTriggeredRef.current) e.preventDefault(); }}
                        onClick={(e) => { if (pressTriggeredRef.current) { e.stopPropagation(); pressTriggeredRef.current = false; } }}
                        className={cn(
                          "relative max-w-[75%] cursor-pointer select-none rounded-2xl text-sm transition-shadow",
                          mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                          (m.attachment_url && !isVoice) ? "p-1" : "px-3 py-2",
                        )}
                      >
                        {pickerForMsg === m.id && (
                          <ReactionPicker
                            align={mine ? "right" : "left"}
                            onPick={(emoji) => toggleReaction(m.id, emoji)}
                          />
                        )}

                        {/* Quoted reply snippet */}
                        {replied && (
                          <button
                            type="button"
                            onClick={() => scrollToMessage(replied.id)}
                            className={cn(
                              "mb-1.5 block w-full rounded-md border-l-2 px-2 py-1 text-left text-xs",
                              mine
                                ? "border-primary-foreground/60 bg-primary-foreground/10 text-primary-foreground/90"
                                : "border-primary/60 bg-foreground/5 text-foreground/80",
                            )}
                          >
                            <div className="line-clamp-2 truncate">{snippet(replied)}</div>
                          </button>
                        )}

                        {isVoice ? (
                          <VoiceNotePlayer url={m.attachment_url!} durationMs={m.voice_duration_ms} mine={mine} />
                        ) : (
                          <>
                            {m.attachment_url && (
                              <button
                                type="button"
                                onClick={() => setLightbox(m.attachment_url)}
                                className="block overflow-hidden rounded-xl"
                              >
                                <img src={m.attachment_url} alt="" className="max-h-72 max-w-full object-cover" loading="lazy" />
                              </button>
                            )}
                            {m.body && <p className={cn("whitespace-pre-wrap break-words", m.attachment_url && "px-2 py-1.5")}>{m.body}</p>}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Reaction chips */}
                    {grouping.size > 0 && (
                      <div className={cn("mt-1 flex flex-wrap gap-1", mine ? "justify-end" : "justify-start")}>
                        {[...grouping.entries()].map(([emoji, { count, mine: isMine }]) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => toggleReaction(m.id, emoji)}
                            className={cn(
                              "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors",
                              isMine ? "border-primary bg-primary/15 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <span>{emoji}</span>
                            {count > 1 && <span className="font-mono text-[10px] tabular-nums">{count}</span>}
                          </button>
                        ))}
                      </div>
                    )}

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

              {otherTyping && (
                <div className="flex items-center gap-1.5 px-2 pt-1 text-xs text-muted-foreground">
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "120ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "240ms" }} />
                  </span>
                  <span>typing…</span>
                </div>
              )}
            </div>

            {replyTo && (
              <div className="flex items-start gap-2 border-t border-border bg-card/40 px-3 py-2">
                <div className="w-1 self-stretch rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-primary">Replying to</p>
                  <p className="truncate text-xs text-muted-foreground">{snippet(replyTo)}</p>
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {pendingPreview && (
              <div className="flex items-center gap-3 border-t border-border bg-card/40 px-3 py-2">
                <img src={pendingPreview} alt="" className="h-14 w-14 rounded-md object-cover" />
                <span className="flex-1 truncate text-xs text-muted-foreground">{pendingFile?.name}</span>
                <Button type="button" size="icon" variant="ghost" onClick={clearPending}><X className="h-4 w-4" /></Button>
              </div>
            )}

            <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
              <Button type="button" size="icon" variant="ghost" onClick={() => fileRef.current?.click()} aria-label="Attach image" className="shrink-0">
                <ImagePlus className="h-5 w-5" />
              </Button>
              <VoiceRecorder onComplete={sendVoice} disabled={sending} />
              <Input value={body} onChange={onBodyChange} placeholder="Write a message…" maxLength={4000} />
              <Button type="submit" size="icon" disabled={sending || (!body.trim() && !pendingFile)}><Send className="h-4 w-4" /></Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
            Pick a conversation to start.
          </div>
        )}
      </section>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
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
