import { useState } from "react";
import { Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function ClaimProfileModal({
  open, onOpenChange, profileId, providerDisplayName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profileId: string;
  providerDisplayName: string;
}) {
  const { user, profile } = useAuth();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  const openInstagram = () => {
    const webUrl = "https://instagram.com/hirevy.app";
    const deepLink = "instagram://user?username=hirevy.app";
    const fallback = window.setTimeout(() => {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }, 600);
    const onHide = () => {
      window.clearTimeout(fallback);
      document.removeEventListener("visibilitychange", onHide);
    };
    document.addEventListener("visibilitychange", onHide);
    window.location.href = deepLink;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (text.length < 5) {
      toast({ title: "Please add a few more details", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("claims_requests").insert({
      profile_id: profileId,
      full_name: profile?.display_name || profile?.username || "Unspecified",
      email: user?.email || "no-reply@hirevy.app",
      verification_method: "website",
      verification_value: null,
      notes: text.slice(0, 2000),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't send request", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setMessage("");
      setSent(false);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Claim this profile</DialogTitle>
          <DialogDescription>
            Verify your identity to take control of this profile and respond to reviews.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="rounded-md border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
            We'll review your request and get back to you within 48 hours.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Send us a DM from your Instagram account as proof of identity.
              </p>
              <Button
                type="button"
                onClick={openInstagram}
                className="h-11 w-full text-sm font-semibold"
              >
                <Instagram className="h-4 w-4" />
                DM us on Instagram →
              </Button>
            </div>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-border" />
              <span className="mx-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">or</span>
              <div className="flex-grow border-t border-border" />
            </div>

            <form onSubmit={submit} className="space-y-3">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Describe how you'd like to verify your identity — website, email, social profile, etc."
              />
              <Button
                type="submit"
                disabled={saving}
                className="h-11 w-full text-sm font-semibold"
              >
                {saving ? "Sending…" : "Send verification request"}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
