import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { StarRating } from "@/components/StarRating";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function ReviewSubmit() {
  const { username = "" } = useParams();
  const nav = useNavigate();
  const [provider, setProvider] = useState<{ id: string; display_name: string | null; username: string } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void supabase
      .from("profiles")
      .select("id, display_name, username")
      .eq("username", username)
      .maybeSingle()
      .then(({ data }) => setProvider(data as typeof provider));
  }, [username]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || rating < 1) {
      toast({ title: "Pick a star rating", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      provider_id: provider.id,
      reviewer_name: name.trim(),
      reviewer_email: email.trim().toLowerCase(),
      rating,
      body: body.trim(),
    });
    setBusy(false);
    if (error) {
      const msg = error.message.includes("duplicate")
        ? "You've already left a review for this provider."
        : error.message;
      toast({ title: "Could not submit", description: msg, variant: "destructive" });
      return;
    }
    setDone(true);
  };

  if (provider === null) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-10">
      <Logo />
      {done ? (
        <div className="mt-12 rounded-md border border-border bg-card p-6 text-center">
          <h1 className="font-display text-2xl font-semibold">Review submitted</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your review is now live on @{provider.username}'s profile. Thank you for the proof.</p>
          <Button className="mt-6" onClick={() => nav(`/@${provider.username}`)}>View profile</Button>
        </div>
      ) : (
        <>
          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Verified Review</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight">
            Review {provider.display_name || `@${provider.username}`}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your honest review helps other clients hire with confidence. Reviews are public; your email stays private.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">Rating</Label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i)}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(0)}
                    className="rounded-sm p-1 outline-none transition-transform hover:scale-110"
                    aria-label={`${i} star${i > 1 ? "s" : ""}`}
                  >
                    <Star className={cn("h-8 w-8", (hover || rating) >= i ? "fill-primary text-primary" : "text-muted-foreground/40")} strokeWidth={1.25} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your name (public)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your email (private)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <p className="text-xs text-muted-foreground">Used to prevent duplicate reviews. Never shown publicly.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Review</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={4000} placeholder="What did they do for you? What were the results?" />
            </div>
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Submitting…" : "Submit review"}</Button>
          </form>
        </>
      )}
    </div>
  );
}
