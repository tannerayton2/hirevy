import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/categories";
import { toast } from "@/hooks/use-toast";

const TITLE_MAX = 80;
const DESC_MAX = 300;

function isValidHttpUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export default function OfferEditor() {
  const { offerId } = useParams();
  const isEdit = !!offerId;
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [salesUrl, setSalesUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [hydrating, setHydrating] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !user) return;
    void (async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("id, provider_id, title, description, cta_link")
        .eq("id", offerId!)
        .maybeSingle();
      if (error || !data) {
        toast({ title: "Offer not found", variant: "destructive" });
        nav(-1);
        return;
      }
      if ((data as { provider_id: string }).provider_id !== user.id) {
        toast({ title: "Not your offer", variant: "destructive" });
        nav(-1);
        return;
      }
      setTitle((data.title as string) ?? "");
      setDescription((data.description as string) ?? "");
      setSalesUrl((data.cta_link as string) ?? "");
      setHydrating(false);
    })();
  }, [isEdit, offerId, user, nav]);

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (loading || hydrating || !profile) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const d = description.trim();
    const url = salesUrl.trim();

    if (!t || t.length > TITLE_MAX) {
      return toast({ title: `Title required (max ${TITLE_MAX} chars)`, variant: "destructive" });
    }
    if (!d || d.length > DESC_MAX) {
      return toast({ title: `Description required (max ${DESC_MAX} chars)`, variant: "destructive" });
    }
    if (url && !isValidHttpUrl(url)) {
      return toast({
        title: "Invalid sales page URL",
        description: "Enter a full URL starting with https:// (or http://).",
        variant: "destructive",
      });
    }

    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        title: t,
        description: d,
        category: "General",
        free_for_testimonial: false,
        pricing_model: "contact",
        price_cents: null,
        price_max_cents: null,
        hosted_on_hirevy: !url,
        cta_link: url || null,
        cta_label: url ? "Visit Sales Page" : "Contact",
        secondary_link: null,
        secondary_link_label: null,
        offer_tier: null,
        video_url: null,
        tags: [],
        is_active: true,
      };

      let finalSlug: string;
      if (isEdit) {
        const { error } = await supabase.from("offers").update(payload as never).eq("id", offerId!);
        if (error) throw error;
        const { data: o } = await supabase.from("offers").select("slug").eq("id", offerId!).maybeSingle();
        finalSlug = (o?.slug as string) || slugify(t);
      } else {
        const base = slugify(t);
        let slug = base;
        for (let i = 0; i < 50; i++) {
          const { data: clash } = await supabase
            .from("offers")
            .select("id")
            .eq("provider_id", profile.id)
            .eq("slug", slug)
            .maybeSingle();
          if (!clash) break;
          slug = `${base}-${i + 2}`;
        }
        const { error } = await supabase.from("offers").insert({
          ...payload,
          provider_id: profile.id,
          slug,
        } as never);
        if (error) throw error;
        finalSlug = slug;
      }

      toast({ title: isEdit ? "Offer updated" : "Offer created" });
      nav(`/@${profile.username}/${finalSlug}`);
    } catch (err) {
      const e = err as { message?: string; details?: string; hint?: string } | null;
      const parts = e ? [e.message, e.details, e.hint].filter(Boolean) as string[] : [];
      toast({
        title: "Couldn't save",
        description: parts.length ? parts.join(" — ") : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-6 md:px-8 md:py-10">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
        {isEdit ? "Edit offer" : "Create offer"}
      </p>
      <h1 className="font-display text-3xl font-bold">
        {isEdit ? "Update your offer" : "Launch a new offer"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Keep it simple. Add a title, a short description, and a link to your sales page — or leave the link blank to receive inquiries in Aytopus messages.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <div>
          <Label htmlFor="offer-title" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Title <span className="text-primary">*</span>
          </Label>
          <Input
            id="offer-title"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            placeholder="e.g. 1:1 Sales Coaching Intensive"
            maxLength={TITLE_MAX}
            required
            className="mt-2"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">{title.length}/{TITLE_MAX}</p>
        </div>

        <div>
          <Label htmlFor="offer-desc" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Short description <span className="text-primary">*</span>
          </Label>
          <Textarea
            id="offer-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
            placeholder="Who it's for and what they'll get, in a sentence or two."
            maxLength={DESC_MAX}
            required
            rows={4}
            className="mt-2"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">{description.length}/{DESC_MAX}</p>
        </div>

        <div>
          <Label htmlFor="offer-url" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Sales page URL <span className="text-muted-foreground/60">(optional)</span>
          </Label>
          <Input
            id="offer-url"
            type="url"
            inputMode="url"
            value={salesUrl}
            onChange={(e) => setSalesUrl(e.target.value)}
            placeholder="https://your-sales-page.com"
            className="mt-2"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Leave blank to let buyers contact you through Aytopus messages instead.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create offer"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => nav(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
