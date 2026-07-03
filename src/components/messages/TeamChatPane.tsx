import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
// Logo not used; Aytopus mark rendered inline as text avatar
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface TeamMessage {
  id: string;
  user_id: string;
  sender_id: string;
  from_admin: boolean;
  body: string;
  created_at: string;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function TeamChatPane() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<TeamMessage[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("team_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      setMsgs((data as TeamMessage[]) ?? []);
    })();

    const ch = supabase
      .channel(`team:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setMsgs((prev) => {
            const m = payload.new as TeamMessage;
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        },
      )
      .subscribe();
    channelRef.current = ch;
    return () => { void ch.unsubscribe(); };
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !body.trim() || sending) return;
    setSending(true);
    const { error } = await supabase.from("team_messages").insert({
      user_id: user.id,
      sender_id: user.id,
      from_admin: false,
      body: body.trim().slice(0, 4000),
    });
    setSending(false);
    if (error) {
      toast({ title: "Couldn't send", description: error.message, variant: "destructive" });
      return;
    }
    setBody("");
  };

  if (!user) return null;

  return (
    <section className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-sm font-bold text-primary">
          HV
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
        </div>
        <div>
          <p className="text-sm font-semibold">Aytopus Team</p>
          <p className="text-xs text-muted-foreground">We usually reply within a day</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {msgs.length === 0 && (
          <p className="mx-auto max-w-sm rounded-md border border-border bg-card/40 p-4 text-center text-sm text-muted-foreground">
            Hi! Send us a question, feedback, or anything else. The Aytopus team will reply here.
          </p>
        )}
        {msgs.map((m) => {
          const mine = !m.from_admin;
          return (
            <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3 py-2 text-sm",
                  mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
              <span className="mt-0.5 px-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {formatRelative(m.created_at)}
              </span>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message the Aytopus team…"
          maxLength={4000}
        />
        <Button type="submit" size="icon" disabled={sending || !body.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </section>
  );
}
