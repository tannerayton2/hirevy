import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function Marketplace() {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [joined, setJoined] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("marketplace_waitlist").insert({ email: v });
    setSaving(false);
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      toast({ title: "Couldn't join", description: error.message, variant: "destructive" });
      return;
    }
    setJoined(true);
    toast({ title: "You're on the list", description: "We'll email you when the marketplace launches." });
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-10 md:px-8">
      <div className="w-full max-w-md text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Coming Soon</p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">
          The marketplace for coaches and service providers.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          Advertise your services, browse and compare offers, and connect with buyers actively looking to hire. New to coaching? List your offer free and start building real testimonials before you scale.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-3 text-left">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="h-12"
            disabled={joined}
            required
          />
          <Button type="submit" className="h-12 w-full text-sm font-semibold" disabled={saving || joined}>
            {joined ? "You're on the list ✓" : saving ? "Joining…" : "Join the waitlist"}
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">No spam. One email when we launch.</p>
      </div>
    </div>
  );
}
