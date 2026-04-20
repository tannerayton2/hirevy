import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";

interface Reply {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
  provider_id: string;
}

interface Props {
  reviewId: string;
  reviewType: "verified" | "proof_backed";
  providerId: string;
  providerDisplayName: string;
  isProviderViewer: boolean;
}

export function ProviderReply({ reviewId, reviewType, providerId, providerDisplayName, isProviderViewer }: Props) {
  const [reply, setReply] = useState<Reply | null>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase
      .from("review_replies")
      .select("id, body, created_at, updated_at, provider_id")
      .eq("review_id", reviewId)
      .eq("review_type", reviewType)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setReply(data as Reply);
          setDraft(data.body);
        }
      });
  }, [reviewId, reviewType]);

  const submit = async () => {
    const body = draft.trim();
    if (body.length < 1) return;
    setBusy(true);
    if (reply) {
      const { error } = await supabase
        .from("review_replies")
        .update({ body })
        .eq("id", reply.id);
      if (error) {
        toast({ title: "Could not update reply", description: error.message, variant: "destructive" });
      } else {
        setReply({ ...reply, body, updated_at: new Date().toISOString() });
        setComposing(false);
      }
    } else {
      const { data, error } = await supabase
        .from("review_replies")
        .insert({ review_id: reviewId, review_type: reviewType, provider_id: providerId, body })
        .select("id, body, created_at, updated_at, provider_id")
        .single();
      if (error) {
        toast({ title: "Could not post reply", description: error.message, variant: "destructive" });
      } else {
        setReply(data as Reply);
        setComposing(false);
      }
    }
    setBusy(false);
  };

  const remove = async () => {
    if (!reply) return;
    if (!confirm("Delete your reply?")) return;
    const { error } = await supabase.from("review_replies").delete().eq("id", reply.id);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    setReply(null);
    setDraft("");
  };

  if (reply && !composing) {
    return (
      <div className="mt-3 ml-4 rounded-md border-l-2 border-primary/60 bg-secondary/40 p-3 pl-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
          Reply from {providerDisplayName}
        </p>
        <p className="mt-1.5 whitespace-pre-line text-sm text-foreground/90">{reply.body}</p>
        {isProviderViewer && (
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setComposing(true)}>
              <Pencil className="mr-1 h-3 w-3" /> Edit
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={remove}>
              <Trash2 className="mr-1 h-3 w-3" /> Delete
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (composing) {
    return (
      <div className="mt-3 ml-4 rounded-md border border-border bg-card p-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Write a public reply…"
          autoFocus
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setComposing(false); setDraft(reply?.body ?? ""); }}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={busy || draft.trim().length < 1}>
            {busy ? "Saving…" : reply ? "Save" : "Post reply"}
          </Button>
        </div>
      </div>
    );
  }

  if (isProviderViewer) {
    return (
      <div className="mt-3 ml-4">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setComposing(true)}>
          <MessageSquare className="mr-1 h-3 w-3" /> Reply
        </Button>
      </div>
    );
  }

  return null;
}
